#!/usr/bin/env python3
"""Encode rendered emote frame directories as animated WebP and PNG previews."""
import argparse
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("frames", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--fps", type=int, default=20)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
for directory in sorted(args.frames.iterdir()):
    if not directory.is_dir() or not directory.name.isdigit():
        continue
    images = [Image.open(p).convert("RGBA") for p in sorted(directory.glob("*.png"))]
    if not images or not any(image.getbbox() for image in images):
        raise ValueError(f"No visible emote frames: {directory}")
    images[0].save(args.output / (directory.name + ".png"))
    images[0].save(args.output / (directory.name + ".webp"), save_all=True,
                   append_images=images[1:], duration=round(1000 / args.fps),
                   loop=0, quality=85, method=4)
