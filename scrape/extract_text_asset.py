#!/usr/bin/env python3
from __future__ import annotations

import argparse
import struct
from pathlib import Path

import UnityPy

UnityPy.config.FALLBACK_UNITY_VERSION = "2020.3.49f1"


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


def asset_bytes(data: object, obj: object | None = None) -> bytes:
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
        if isinstance(value, bytes):
            return value
        if isinstance(value, str):
            return value.encode("utf-8", errors="surrogateescape")
    raise ValueError("asset does not expose script bytes")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle", type=Path)
    parser.add_argument("asset_name")
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    env = UnityPy.load(str(args.bundle))
    for obj in env.objects:
        if obj.type.name != "TextAsset":
            continue
        data = obj.read()
        name = getattr(data, "name", "") or getattr(data, "m_Name", "")
        if name != args.asset_name:
            continue
        args.output.write_bytes(asset_bytes(data, obj))
        print(f"wrote {args.output}")
        return 0

    raise SystemExit(f"TextAsset not found: {args.asset_name}")


if __name__ == "__main__":
    raise SystemExit(main())
