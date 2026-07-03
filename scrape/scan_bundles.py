#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import struct
from pathlib import Path

import UnityPy

UnityPy.config.FALLBACK_UNITY_VERSION = "2020.3.49f1"


DEFAULT_PATTERNS = [
    "auth/login",
    "routeIndex",
    "loginType",
    "unityPlatform",
    "session_ticket",
    "fetchRank",
]


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


def bytes_from_asset(data: object, obj: object | None = None) -> bytes:
    if obj is not None:
        try:
            raw = obj.get_raw_data()
            _, offset = _read_aligned_string_bytes(raw, 0)
            script, _ = _read_aligned_string_bytes(raw, offset)
            return script
        except Exception:
            pass
    for attr in ("script", "m_Script"):
        value = getattr(data, attr, None)
        if value is None:
            continue
        if isinstance(value, bytes):
            return value
        if isinstance(value, str):
            return value.encode("utf-8", errors="surrogateescape")
    return repr(data).encode("utf-8", errors="ignore")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle_dir", type=Path)
    parser.add_argument("patterns", nargs="*", default=DEFAULT_PATTERNS)
    args = parser.parse_args()

    pattern = re.compile(b"|".join(re.escape(item).encode() for item in args.patterns), re.I)
    for path in sorted(args.bundle_dir.glob("*.bundle")):
        try:
            env = UnityPy.load(str(path))
        except Exception as exc:
            print(f"{path}: load failed: {exc}")
            continue

        for obj in env.objects:
            if obj.type.name not in {"TextAsset", "MonoScript"}:
                continue
            try:
                data = obj.read()
            except Exception:
                continue
            blob = bytes_from_asset(data, obj)
            if not pattern.search(blob):
                continue
            name = getattr(data, "name", "") or getattr(data, "m_Name", "")
            print(f"{path.name}: {obj.type.name}: {name}")
            for match in pattern.finditer(blob):
                start = max(0, match.start() - 120)
                end = min(len(blob), match.end() + 160)
                snippet = blob[start:end].replace(b"\x00", b" ")
                print(snippet.decode("utf-8", errors="replace"))
                print("---")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
