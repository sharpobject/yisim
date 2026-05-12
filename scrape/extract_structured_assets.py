#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import struct
from pathlib import Path
from typing import Any

import UnityPy

UnityPy.config.FALLBACK_UNITY_VERSION = "2020.3.49f1"


PRINTABLE = set(range(0x20, 0x7f)) | {0x09, 0x0a, 0x0d}


def _read_aligned_string_bytes(raw: bytes, offset: int) -> tuple[bytes, int]:
    if offset + 4 > len(raw):
        raise ValueError("truncated Unity string length")
    length = struct.unpack_from("<i", raw, offset)[0]
    if length < 0:
        raise ValueError("negative Unity string length")
    offset += 4
    end = offset + length
    if end > len(raw):
        raise ValueError("truncated Unity string data")
    value = raw[offset:end]
    return value, (end + 3) & ~3


def text_asset_bytes_from_reader(obj: object) -> bytes:
    raw = obj.get_raw_data()
    _, offset = _read_aligned_string_bytes(raw, 0)
    script, _ = _read_aligned_string_bytes(raw, offset)
    return script


def asset_bytes(data: object, obj: object | None = None) -> bytes:
    for attr in ("script", "m_Script"):
        value = getattr(data, attr, None)
        if isinstance(value, bytes):
            return value
        if isinstance(value, str):
            return value.encode("utf-8", errors="surrogateescape")
    if obj is not None:
        try:
            return text_asset_bytes_from_reader(obj)
        except Exception:
            pass
    return b""


def asset_name(data: object) -> str:
    return str(getattr(data, "name", "") or getattr(data, "m_Name", "") or "unnamed")


def safe_name(name: str) -> str:
    name = name.strip().replace("\\", "_").replace("/", "_")
    name = re.sub(r"[\x00-\x1f]+", "_", name)
    return name or "unnamed"


def safe_version(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("version is empty")
    return re.sub(r"[^A-Za-z0-9._+-]+", "_", value)


def load_config(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_version(config: dict[str, Any], explicit: str | None) -> str:
    if explicit:
        return safe_version(explicit)
    for key in ("game_version", "version", "app_version"):
        value = config.get(key)
        if value:
            return safe_version(str(value))
    raise ValueError("could not resolve version; pass --version or set game_version in config")


def unique_path(directory: Path, stem: str, suffix: str) -> Path:
    path = directory / f"{stem}{suffix}"
    if not path.exists():
        return path
    for index in range(2, 10000):
        path = directory / f"{stem}.{index}{suffix}"
        if not path.exists():
            return path
    raise RuntimeError(f"too many duplicate names for {stem}{suffix}")


def classify_blob(name: str, blob: bytes) -> str:
    stripped = blob.lstrip()
    if stripped[:1] in (b"{", b"["):
        try:
            json.loads(stripped.decode("utf-8"))
            return "json"
        except Exception:
            pass
    lowered = name.lower()
    if b"proto." in blob[:512] or b".xlsx" in blob[:512] or lowered.endswith(".bytes"):
        return "protobuf"
    if lowered.endswith(".json"):
        return "json-text"
    return "other"


def read_varint(blob: bytes, offset: int) -> tuple[int, int]:
    value = 0
    shift = 0
    while offset < len(blob):
        byte = blob[offset]
        offset += 1
        value |= (byte & 0x7f) << shift
        if byte < 0x80:
            return value, offset
        shift += 7
        if shift > 63:
            raise ValueError("varint too long")
    raise ValueError("truncated varint")


def is_printable_text(blob: bytes) -> bool:
    if not blob:
        return False
    try:
        text = blob.decode("utf-8")
    except UnicodeDecodeError:
        return False
    if not text:
        return False
    sample = text[:200]
    return sum(ord(ch) in PRINTABLE or ord(ch) >= 0x80 for ch in sample) / len(sample) > 0.95


def decode_message(blob: bytes, depth: int = 0) -> list[dict[str, Any]]:
    if depth > 8:
        raise ValueError("max depth")
    fields: list[dict[str, Any]] = []
    offset = 0
    while offset < len(blob):
        key, offset = read_varint(blob, offset)
        field_no = key >> 3
        wire_type = key & 7
        if field_no == 0:
            raise ValueError("invalid field number")
        item: dict[str, Any] = {"field": field_no, "wire_type": wire_type}
        if wire_type == 0:
            value, offset = read_varint(blob, offset)
            item["value"] = value
        elif wire_type == 1:
            if offset + 8 > len(blob):
                raise ValueError("truncated fixed64")
            item["value_hex"] = blob[offset : offset + 8].hex()
            offset += 8
        elif wire_type == 2:
            length, offset = read_varint(blob, offset)
            if offset + length > len(blob):
                raise ValueError("truncated length-delimited")
            value = blob[offset : offset + length]
            offset += length
            if is_printable_text(value):
                item["value"] = value.decode("utf-8", errors="replace")
            else:
                try:
                    item["value"] = decode_message(value, depth + 1)
                except Exception:
                    item["value_base64ish_hex"] = value[:128].hex()
                    item["length"] = length
        elif wire_type == 5:
            if offset + 4 > len(blob):
                raise ValueError("truncated fixed32")
            item["value_hex"] = blob[offset : offset + 4].hex()
            offset += 4
        else:
            raise ValueError(f"unsupported wire type {wire_type}")
        fields.append(item)
    return fields


def write_proto_preview(blob: bytes, path: Path) -> None:
    try:
        decoded = decode_message(blob)
    except Exception as exc:
        decoded = [{"error": str(exc)}]
    path.write_text(json.dumps(decoded, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def copy_loose_json(game_root: Path, output_root: Path, manifest: list[dict[str, Any]]) -> None:
    json_dir = output_root / "json"
    json_dir.mkdir(parents=True, exist_ok=True)
    for path in sorted((game_root / "YiXianPai_Data" / "StreamingAssets").rglob("*.json")):
        rel = path.relative_to(game_root)
        out = unique_path(json_dir, safe_name(path.stem), path.suffix)
        shutil.copy2(path, out)
        manifest.append(
            {
                "kind": "json",
                "source": str(rel),
                "name": path.name,
                "output": str(out.relative_to(output_root)),
                "size": path.stat().st_size,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
        )


def extract_bundle_textassets(bundle_dir: Path, output_root: Path, manifest: list[dict[str, Any]]) -> None:
    proto_dir = output_root / "protobuf"
    raw_dir = output_root / "protobuf_raw_json"
    json_dir = output_root / "json"
    proto_dir.mkdir(parents=True, exist_ok=True)
    raw_dir.mkdir(parents=True, exist_ok=True)
    json_dir.mkdir(parents=True, exist_ok=True)

    for bundle in sorted(bundle_dir.glob("*.bundle")):
        try:
            env = UnityPy.load(str(bundle))
        except Exception as exc:
            manifest.append({"kind": "bundle-error", "source": str(bundle), "error": str(exc)})
            continue
        for obj in env.objects:
            if obj.type.name != "TextAsset":
                continue
            try:
                data = obj.read()
            except Exception as exc:
                manifest.append({"kind": "asset-error", "source": str(bundle), "error": str(exc)})
                continue
            name = asset_name(data)
            blob = asset_bytes(data, obj)
            kind = classify_blob(name, blob)
            if kind not in {"json", "json-text", "protobuf"}:
                continue
            stem = safe_name(name)
            if kind == "protobuf":
                out = unique_path(proto_dir, stem, ".pb")
                out.write_bytes(blob)
                preview = unique_path(raw_dir, stem, ".raw.json")
                write_proto_preview(blob, preview)
                output = str(out.relative_to(output_root))
                preview_output = str(preview.relative_to(output_root))
            else:
                out = unique_path(json_dir, stem, ".json")
                out.write_bytes(blob)
                output = str(out.relative_to(output_root))
                preview_output = None
            entry = {
                "kind": "protobuf" if kind == "protobuf" else "json",
                "source_bundle": bundle.name,
                "name": name,
                "output": output,
                "size": len(blob),
                "sha256": hashlib.sha256(blob).hexdigest(),
            }
            if preview_output:
                entry["raw_json_preview"] = preview_output
            manifest.append(entry)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--game-root", type=Path, default=Path("YiXianPai"))
    parser.add_argument("--output", type=Path, default=Path("extracted_assets"))
    parser.add_argument("--config", type=Path, default=Path("config.json"))
    parser.add_argument("--version", help="specific game/content version folder to write under")
    args = parser.parse_args()

    config = load_config(args.config)
    version = resolve_version(config, args.version)
    output_root = args.output / version
    output_root.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, Any]] = []
    copy_loose_json(args.game_root, output_root, manifest)
    extract_bundle_textassets(
        args.game_root / "YiXianPai_Data" / "StreamingAssets" / "aa" / "StandaloneLinux64",
        output_root,
        manifest,
    )
    manifest_path = output_root / "manifest.json"
    metadata = {
        "version": version,
        "game_version": config.get("game_version"),
        "app_version": config.get("app_version"),
        "resource_version": config.get("resource_version"),
        "game_root": str(args.game_root),
    }
    (output_root / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts: dict[str, int] = {}
    for item in manifest:
        counts[item["kind"]] = counts.get(item["kind"], 0) + 1
    print(f"wrote {manifest_path}")
    print(json.dumps(metadata, sort_keys=True))
    print(json.dumps(counts, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
