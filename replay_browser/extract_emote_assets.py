#!/usr/bin/env python3
"""Extract matching emote skeletons, atlases and textures from existing bundles."""
import argparse
import json
from pathlib import Path
import UnityPy

UnityPy.config.FALLBACK_UNITY_VERSION = "2020.3.49f1"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("bundle_root", type=Path)
parser.add_argument("media_manifest", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
entries = json.loads(args.media_manifest.read_text())
bundles = {e["source_bundle"] for e in entries if e.get("name", "").startswith("Emoji_")}
for name in sorted(bundles):
    for obj in UnityPy.load(str(args.bundle_root / name)).objects:
        if obj.type.name not in ("Texture2D", "TextAsset"):
            continue
        data = obj.read()
        if not data.m_Name.startswith("Emoji_"):
            continue
        if obj.type.name == "Texture2D":
            data.image.save(args.output / (data.m_Name + ".png"))
        else:
            blob = data.m_Script
            if isinstance(blob, str):
                blob = blob.encode("utf-8", errors="surrogateescape")
            (args.output / data.m_Name).write_bytes(blob)
