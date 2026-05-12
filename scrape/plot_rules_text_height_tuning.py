#!/usr/bin/env python3
"""Write the collapsed English rules-text tuning values."""

from __future__ import annotations

import csv

from align_card_diffs import DEFAULT_OUTPUT_DIR
import render_rule_sky_sword_formation as renderer


OUT_CSV = DEFAULT_OUTPUT_DIR / "rules_text_height_tuning.csv"
OUT_SVG = DEFAULT_OUTPUT_DIR / "rules_text_height_tuning.svg"


def tuning_row() -> dict[str, float | str]:
    font = renderer.default_tmp_font()
    line_units = font.line_height + renderer.DESC_TMP_LINE_SPACING * font.point_size * 0.01
    return {
        "scope": "all",
        "line_units": line_units,
        "paragraph_units": renderer.DESC_TMP_PARAGRAPH_SPACING * font.point_size * 0.01,
        "rect_dx": renderer.DESC_TEXT_DRAW_RECT_EN.left - renderer.DESC_RECT.left,
        "rect_dy": renderer.DESC_TEXT_DRAW_RECT_EN.top - renderer.DESC_RECT.top,
        "glyph_scale": renderer.DESC_GLYPH_SCALE_EN,
        "char_spacing": renderer.DESC_CHARACTER_SPACING_EN,
        "line_spacing": renderer.DESC_TMP_LINE_SPACING,
        "normal_face_dilate": renderer.DESC_FACE_DILATE_EN_NORMAL,
        "bold_face_dilate": renderer.DESC_FACE_DILATE_EN_BOLD,
        "sdf_distance_scale_normal": renderer.DESC_SDF_DISTANCE_SCALE_EN_NORMAL,
        "sdf_distance_scale_bold": renderer.DESC_SDF_DISTANCE_SCALE_EN_BOLD,
    }


def main() -> None:
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    row = tuning_row()
    with OUT_CSV.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, list(row))
        writer.writeheader()
        writer.writerow(row)
    OUT_SVG.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="90" viewBox="0 0 720 90">'
        '<rect width="100%" height="100%" fill="white"/>'
        '<text x="16" y="32" font-family="Arial,Helvetica,sans-serif" font-size="14">'
        'English rules text tuning is collapsed to one shared config.'
        '</text>'
        f'<text x="16" y="58" font-family="Arial,Helvetica,sans-serif" font-size="12">'
        f'dx={row["rect_dx"]:.6f}, dy={row["rect_dy"]:.6f}, charSpacing={row["char_spacing"]:.1f}, '
        f'lineSpacing={row["line_spacing"]:.1f}'
        '</text></svg>',
        encoding="utf-8",
    )
    print(OUT_CSV)
    print(OUT_SVG)


if __name__ == "__main__":
    main()
