#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

import UnityPy

from extract_structured_assets import (
    asset_bytes,
    asset_name,
    load_config,
    resolve_version,
    safe_name,
    unique_path,
)
from png_io import save_png

UnityPy.config.FALLBACK_UNITY_VERSION = "2020.3.49f1"


GAME_ASSEMBLY_NAMES = {
    "Assembly-CSharp.dll",
    "DarkSun.Login.dll",
    "DarkSun.Pay.dll",
    "DarkSun.UI.dll",
    "DarkSun.Utility.dll",
}


def sha256_path(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def extract_textures(bundle_dir: Path, output_root: Path, manifest: list[dict[str, Any]]) -> None:
    texture_dir = output_root / "textures"
    texture_dir.mkdir(parents=True, exist_ok=True)
    for bundle in sorted(bundle_dir.glob("*.bundle")):
        try:
            env = UnityPy.load(str(bundle))
        except Exception as exc:
            manifest.append({"kind": "bundle-error", "source": str(bundle), "error": str(exc)})
            continue
        for obj in env.objects:
            if obj.type.name != "Texture2D":
                continue
            try:
                data = obj.read()
                image = data.image
            except Exception as exc:
                name = getattr(locals().get("data", object()), "name", "") or getattr(
                    locals().get("data", object()), "m_Name", "unnamed"
                )
                manifest.append(
                    {
                        "kind": "texture-error",
                        "source_bundle": bundle.name,
                        "name": str(name),
                        "error": str(exc),
                    }
                )
                continue
            name = asset_name(data)
            out = unique_path(texture_dir, safe_name(name), ".png")
            save_png(image, out)
            manifest.append(
                {
                    "kind": "texture",
                    "source_bundle": bundle.name,
                    "name": name,
                    "output": str(out.relative_to(output_root)),
                    "size": out.stat().st_size,
                    "sha256": sha256_path(out),
                    "width": getattr(data, "m_Width", None),
                    "height": getattr(data, "m_Height", None),
                }
            )


def extract_fonts(bundle_dir: Path, output_root: Path, manifest: list[dict[str, Any]]) -> None:
    font_dir = output_root / "fonts"
    font_dir.mkdir(parents=True, exist_ok=True)
    for bundle in sorted(bundle_dir.glob("*.bundle")):
        try:
            env = UnityPy.load(str(bundle))
        except Exception:
            continue
        for obj in env.objects:
            if obj.type.name != "Font":
                continue
            try:
                data = obj.read()
            except Exception as exc:
                manifest.append({"kind": "font-error", "source_bundle": bundle.name, "error": str(exc)})
                continue
            blob = getattr(data, "m_FontData", b"") or b""
            if isinstance(blob, list):
                blob = bytes(blob)
            name = asset_name(data)
            if not blob:
                manifest.append({"kind": "font-metadata", "source_bundle": bundle.name, "name": name})
                continue
            suffix = ".ttf"
            if blob[:4] == b"OTTO":
                suffix = ".otf"
            elif blob[:4] == b"ttcf":
                suffix = ".ttc"
            out = unique_path(font_dir, safe_name(name), suffix)
            out.write_bytes(blob)
            manifest.append(
                {
                    "kind": "font",
                    "source_bundle": bundle.name,
                    "name": name,
                    "output": str(out.relative_to(output_root)),
                    "size": len(blob),
                    "sha256": hashlib.sha256(blob).hexdigest(),
                }
            )


def looks_like_dotnet_assembly(blob: bytes) -> bool:
    return blob.startswith(b"MZ")


def looks_like_portable_pdb(blob: bytes) -> bool:
    return blob.startswith(b"BSJB")


def extract_bundled_code(bundle_dir: Path, output_root: Path, manifest: list[dict[str, Any]]) -> list[Path]:
    code_dir = output_root / "code" / "assemblies"
    code_dir.mkdir(parents=True, exist_ok=True)
    extracted: list[Path] = []
    for bundle in sorted(bundle_dir.glob("*.bundle")):
        try:
            env = UnityPy.load(str(bundle))
        except Exception:
            continue
        for obj in env.objects:
            if obj.type.name != "TextAsset":
                continue
            try:
                data = obj.read()
            except Exception:
                continue
            blob = asset_bytes(data, obj)
            is_assembly = looks_like_dotnet_assembly(blob)
            is_pdb = looks_like_portable_pdb(blob)
            if not is_assembly and not is_pdb:
                continue
            name = asset_name(data)
            suffix = ""
            lowered = safe_name(name).lower()
            if is_assembly and not lowered.endswith(".dll"):
                suffix = ".dll"
            elif is_pdb and not lowered.endswith(".pdb"):
                suffix = ".pdb"
            out = unique_path(code_dir, safe_name(name), suffix)
            out.write_bytes(blob)
            if is_assembly:
                extracted.append(out)
            manifest.append(
                {
                    "kind": "bundled-assembly" if is_assembly else "bundled-pdb",
                    "source_bundle": bundle.name,
                    "name": name,
                    "output": str(out.relative_to(output_root)),
                    "size": len(blob),
                    "sha256": hashlib.sha256(blob).hexdigest(),
                }
            )
    return extracted


def copy_managed_code(game_root: Path, output_root: Path, manifest: list[dict[str, Any]]) -> list[Path]:
    managed_dir = game_root / "YiXianPai_Data" / "Managed"
    out_dir = output_root / "code" / "assemblies"
    out_dir.mkdir(parents=True, exist_ok=True)
    copied: list[Path] = []
    for src in sorted(managed_dir.glob("*.dll")):
        if src.name not in GAME_ASSEMBLY_NAMES and not src.name.startswith("DarkSun."):
            continue
        out = out_dir / src.name
        shutil.copy2(src, out)
        copied.append(out)
        manifest.append(
            {
                "kind": "managed-assembly",
                "source": str(src.relative_to(game_root)),
                "name": src.name,
                "output": str(out.relative_to(output_root)),
                "size": out.stat().st_size,
                "sha256": sha256_path(out),
            }
        )
    return copied


def inspect_async_kinds(assemblies: list[Path], output_root: Path) -> dict[str, Any]:
    needles = {
        "Cysharp.Threading.Tasks.CompilerServices.AsyncUniTaskMethodBuilder",
        "Cysharp.Threading.Tasks.CompilerServices.AsyncUniTaskMethodBuilder`1",
        "Cysharp.Threading.Tasks.CompilerServices.AsyncUniTaskVoidMethodBuilder",
        "System.Runtime.CompilerServices.AsyncTaskMethodBuilder",
        "System.Runtime.CompilerServices.AsyncVoidMethodBuilder",
    }
    found: dict[str, list[str]] = {needle: [] for needle in needles}
    for assembly in assemblies:
        try:
            blob = assembly.read_bytes()
        except Exception:
            continue
        for needle in needles:
            if needle.encode("utf-8") in blob or needle.split(".")[-1].encode("utf-8") in blob:
                found[needle].append(str(assembly.relative_to(output_root)))
    result = {
        "task_like_async_builders": {key: value for key, value in found.items() if value},
        "note": "Yi Xian uses Cysharp UniTask async builders; ILSpy 9.1 reconstructs async UniTask methods when references include Managed/UniTask.dll.",
    }
    path = output_root / "code" / "async_kinds.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result


def decompile_assemblies(
    ilspycmd: Path,
    game_root: Path,
    output_root: Path,
    assemblies: list[Path],
    manifest: list[dict[str, Any]],
) -> None:
    decompiled_dir = output_root / "code" / "decompiled"
    decompiled_dir.mkdir(parents=True, exist_ok=True)
    reference_path = game_root / "YiXianPai_Data" / "Managed"
    for assembly in assemblies:
        assembly_name = assembly.stem
        out_dir = decompiled_dir / safe_name(assembly_name)
        out_dir.mkdir(parents=True, exist_ok=True)
        cmd = [
            str(ilspycmd),
            "-p",
            "--nested-directories",
            "--disable-updatecheck",
            "-r",
            str(reference_path),
            "-o",
            str(out_dir),
            str(assembly),
        ]
        completed = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        manifest.append(
            {
                "kind": "decompile",
                "assembly": str(assembly.relative_to(output_root)),
                "output": str(out_dir.relative_to(output_root)),
                "returncode": completed.returncode,
                "stdout": completed.stdout.strip(),
                "stderr": completed.stderr.strip(),
            }
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--game-root", type=Path, default=Path("YiXianPai"))
    parser.add_argument("--output", type=Path, default=Path("extracted_assets"))
    parser.add_argument("--config", type=Path, default=Path("config.json"))
    parser.add_argument("--version")
    parser.add_argument("--ilspycmd", type=Path, default=Path("tools/dotnet-tools/ilspycmd"))
    parser.add_argument("--skip-textures", action="store_true")
    parser.add_argument("--skip-decompile", action="store_true")
    parser.add_argument("--clean", action="store_true", help="remove generated media/code output before extracting")
    args = parser.parse_args()

    config = load_config(args.config)
    version = resolve_version(config, args.version)
    output_root = args.output / version
    output_root.mkdir(parents=True, exist_ok=True)
    bundle_dir = args.game_root / "YiXianPai_Data" / "StreamingAssets" / "aa" / "StandaloneLinux64"

    if args.clean:
        for child in ("fonts", "code"):
            shutil.rmtree(output_root / child, ignore_errors=True)
        if not args.skip_textures:
            shutil.rmtree(output_root / "textures", ignore_errors=True)

    manifest: list[dict[str, Any]] = []
    if not args.skip_textures:
        extract_textures(bundle_dir, output_root, manifest)
    extract_fonts(bundle_dir, output_root, manifest)
    assemblies = copy_managed_code(args.game_root, output_root, manifest)
    assemblies.extend(extract_bundled_code(bundle_dir, output_root, manifest))
    async_info = inspect_async_kinds(assemblies, output_root)
    if not args.skip_decompile:
        decompile_assemblies(args.ilspycmd, args.game_root, output_root, assemblies, manifest)

    manifest_path = output_root / "media_code_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts: dict[str, int] = {}
    for item in manifest:
        counts[item["kind"]] = counts.get(item["kind"], 0) + 1
    print(f"wrote {manifest_path}")
    print(json.dumps(counts, sort_keys=True))
    print(json.dumps(async_info, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
