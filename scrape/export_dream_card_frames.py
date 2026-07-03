#!/usr/bin/env python3
"""Export the standalone dream card frame textures used by dream cards."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


VERSION = "001.0006.0014"
ROOT = Path(__file__).resolve().parent
TEXTURE_DIR = ROOT / "renderer_assets" / "textures"
OUTPUT_DIR = ROOT / "extracted_assets" / VERSION / "rendered_cards" / "rule_sky_sword_formation" / "dream_frames"

LEVELS = ("LianQi", "ZhuJi", "JinDan", "YuanYing", "HuaShen", "FanXu")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    frames = []
    for level in LEVELS:
        source = TEXTURE_DIR / f"DreamCardUI_{level}.png"
        image = Image.open(source).convert("RGBA")
        output = OUTPUT_DIR / f"dream_card_frame_{level}.png"
        image.save(output)
        print(output.relative_to(ROOT))
        thumb = image.resize((150, 254))
        ImageDraw.Draw(thumb).text((4, 4), level, fill=(255, 0, 0, 255))
        frames.append(thumb)

    sheet = Image.new("RGBA", (150 * len(frames), 254), (30, 30, 30, 255))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * 150, 0))
    sheet_path = OUTPUT_DIR / "dream_card_frames_contact.png"
    sheet.save(sheet_path)
    print(sheet_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
