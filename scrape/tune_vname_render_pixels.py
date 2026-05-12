#!/usr/bin/env python3
"""Tune vertical card-name rendering against screenshot pixels."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import dlib
from PIL import Image, ImageChops, ImageDraw, ImageStat

from align_card_diffs import (
    DEFAULT_OUTPUT_DIR,
    Transform,
    load_card_reference_rgba,
    load_saved_transforms,
    pair_for_label,
    transform_source,
)
from render_rule_sky_sword_formation import (
    DREAM_VERTICAL_NAME_OFFSET_Y_UI,
    VERTICAL_NAME_DISTANCE_SCALE,
    VERTICAL_NAME_FACE_DILATE,
    VERTICAL_NAME_FACE_DISTANCE_SCALE,
    VERTICAL_NAME_FONT_SIZE_UI,
    VERTICAL_NAME_GLYPH_SCALE,
    VERTICAL_NAME_LINE_GAP_UI,
    VERTICAL_NAME_OFFSET_X_UI,
    VERTICAL_NAME_OFFSET_Y_UI,
    VERTICAL_NAME_OUTLINE_DISTANCE_SCALE,
    VERTICAL_NAME_OUTLINE_WIDTH,
    VERTICAL_NAME_RECT,
    VERTICAL_NAME_SLOT_HEIGHT_UI,
    card_by_id,
    magic_kernel_sharp_resize,
    render_config_card,
    resolve_reference,
    set_vertical_name_render_params,
)


def parse_box(value: str) -> tuple[int, int, int, int]:
    parts = [int(part.strip()) for part in value.split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("boxes must be x0,y0,x1,y1")
    x0, y0, x1, y1 = parts
    if x1 <= x0 or y1 <= y0:
        raise argparse.ArgumentTypeError("box must have positive width and height")
    return x0, y0, x1, y1


def vname_include_box(transform: Transform, size: tuple[int, int]) -> tuple[int, int, int, int]:
    left = VERTICAL_NAME_RECT.left * transform.scale + transform.dx
    top = VERTICAL_NAME_RECT.top * transform.scale + transform.dy
    right = VERTICAL_NAME_RECT.right * transform.scale + transform.dx
    bottom = VERTICAL_NAME_RECT.bottom * transform.scale + transform.dy
    return (
        max(0, round(left - 8)),
        max(0, round(top - 16)),
        min(size[0], round(right + 8)),
        min(size[1], round(bottom + 16)),
    )


def score_mask(size: tuple[int, int], include: tuple[int, int, int, int]) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rectangle(include, fill=255)
    return mask


def text_like_mask(image: Image.Image, include_mask: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    red, green, blue = rgb.split()
    max_channel = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    min_channel = ImageChops.darker(ImageChops.darker(red, green), blue)
    bright = max_channel.point(lambda value: 255 if value >= 180 else 0)
    dark = min_channel.point(lambda value: 255 if value <= 105 else 0)
    mask = ImageChops.lighter(bright, dark)
    mask = ImageChops.multiply(mask, include_mask)
    bbox = mask.getbbox()
    filled = Image.new("L", mask.size, 0)
    if bbox is not None:
        ImageDraw.Draw(filled).rectangle(bbox, fill=255)
    return filled


def pixel_loss(generated: Image.Image, target: Image.Image, mask: Image.Image) -> float:
    diff = ImageChops.difference(generated.convert("RGB"), target.convert("RGB"))
    return float(sum(ImageStat.Stat(diff, mask).sum[:3]))


def text_pixel_loss(
    generated: Image.Image,
    target: Image.Image,
    include_mask: Image.Image,
    target_text_mask: Image.Image,
) -> float:
    generated_text_mask = text_like_mask(generated, include_mask)
    mask = ImageChops.lighter(target_text_mask, generated_text_mask)
    diff = ImageChops.difference(generated.convert("RGB"), target.convert("RGB"))
    return float(sum(ImageStat.Stat(diff, mask).sum[:3]))


def render_vname_candidate(label: str, transform: Transform, render_scale: float) -> Image.Image:
    ref_id, locale = label.split("_", 1)
    resolved = resolve_reference(ref_id)
    if resolved.card_id is None:
        raise ValueError(f"{label} did not resolve to a config card")
    card = card_by_id()[resolved.card_id]
    source_hi = render_config_card(
        ref_id,
        card,
        locale,
        render_scale=render_scale,
        skip_description=True,
        skip_text=False,
    )
    example, _, _ = pair_for_label(label)
    target = load_card_reference_rgba(example)
    target_hi_size = (round(target.width * render_scale), round(target.height * render_scale))
    generated_hi = transform_source(
        source_hi,
        target_hi_size,
        transform.scale,
        transform.dx * render_scale,
        transform.dy * render_scale,
    )
    return magic_kernel_sharp_resize(generated_hi, target.size)


def optimize_vname(
    labels: list[str],
    whole_transform: Transform,
    calls: int,
    include: tuple[int, int, int, int] | None,
    render_scale: float,
    output: Path,
    bounds: dict[str, tuple[float, float]],
) -> dict[str, object]:
    allowed_stale_overrides = {"906011", "906021", "906051", "916011"}
    skipped = [
        label
        for label in labels
        if label.split("_", 1)[0].startswith("9") and label.split("_", 1)[0] not in allowed_stale_overrides
    ]
    skipped_ref_ids = {item.split("_", 1)[0] for item in skipped}
    labels = [label for label in labels if label.split("_", 1)[0] not in skipped_ref_ids]
    if skipped:
        print(f"SKIP_STALE_9X_VNAME {json.dumps(skipped, ensure_ascii=False)}", flush=True)
    if not labels:
        raise ValueError("no labels left after excluding stale 9.x vname references")

    targets = []
    for label in labels:
        example, _, parsed = pair_for_label(label)
        target = load_card_reference_rgba(example)
        include_mask = score_mask(target.size, include or vname_include_box(whole_transform, target.size))
        target_text_mask = text_like_mask(target, include_mask)
        targets.append((parsed, target, include_mask, target_text_mask))

    output.parent.mkdir(parents=True, exist_ok=True)
    if targets:
        targets[0][3].save(output.with_name(output.stem + "_mask.png"), optimize=True, compress_level=9)

    names = list(bounds)
    lower = [bounds[name][0] for name in names]
    upper = [bounds[name][1] for name in names]
    seen = 0
    best: dict[str, object] | None = None

    def objective(*values: float) -> float:
        nonlocal seen, best
        seen += 1
        params = dict(zip(names, map(float, values)))
        set_vertical_name_render_params(**params)
        total = 0.0
        per_label = []
        for parsed, target, include_mask, target_text_mask in targets:
            generated = render_vname_candidate(parsed, whole_transform, render_scale)
            label_score = text_pixel_loss(generated, target, include_mask, target_text_mask)
            total += label_score
            per_label.append((label_score, parsed))
        score = total / max(1, len(targets))
        per_label.sort(reverse=True)
        record = {
            "iter": seen,
            "labels": labels,
            "score": score,
            "vname": {**params, "score": score},
            "worst": per_label[:5],
        }
        if best is None or score < float(best["score"]):
            best = record
            print(f"NEW_BEST {json.dumps(record, ensure_ascii=False)}", flush=True)
        else:
            print(f"ITER {json.dumps(record, ensure_ascii=False)}", flush=True)
        return score

    values, score = dlib.find_min_global(objective, lower, upper, calls, 0.0)
    set_vertical_name_render_params()
    final_params = dict(zip(names, map(float, values)))
    final = {
        "labels": labels,
        "whole_transform": {
            "scale": whole_transform.scale,
            "dx": whole_transform.dx,
            "dy": whole_transform.dy,
            "score": whole_transform.score,
        },
        "best": {**final_params, "score": float(score)},
        "bounds": bounds,
        "include": include,
        "calls": calls,
        "render_scale": render_scale,
        "mask": str(output.with_name(output.stem + "_mask.png")),
    }
    output.write_text(json.dumps(final, indent=2, ensure_ascii=False), encoding="utf-8")
    return final


def radius_bounds(center: float, radius: float) -> tuple[float, float]:
    return (center - radius, center + radius)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("labels", nargs="+")
    parser.add_argument("--calls", type=int, default=1000)
    parser.add_argument("--base-key", default="l3_en")
    parser.add_argument("--include", type=parse_box, default=None)
    parser.add_argument("--render-scale", type=float, default=2.0)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_DIR / "vname_pixel_tuning.json")
    parser.add_argument("--font-radius", type=float, default=1.2)
    parser.add_argument("--slot-radius", type=float, default=2.0)
    parser.add_argument("--line-gap-radius", type=float, default=1.5)
    parser.add_argument("--offset-radius", type=float, default=4.0)
    parser.add_argument("--glyph-scale-radius", type=float, default=0.08)
    parser.add_argument("--face-dilate-radius", type=float, default=0.25)
    parser.add_argument("--outline-width-radius", type=float, default=0.25)
    parser.add_argument("--distance-scale-radius", type=float, default=0.6)
    parser.add_argument("--face-distance-scale-radius", type=float, default=0.35)
    parser.add_argument("--outline-distance-scale-radius", type=float, default=0.35)
    args = parser.parse_args()

    saved = load_saved_transforms(DEFAULT_OUTPUT_DIR / "alignment_summary.json")
    if args.base_key not in saved:
        raise SystemExit(f"missing base transform {args.base_key!r}")
    bounds = {
        "font_size_ui": radius_bounds(VERTICAL_NAME_FONT_SIZE_UI, args.font_radius),
        "slot_height_ui": radius_bounds(VERTICAL_NAME_SLOT_HEIGHT_UI, args.slot_radius),
        "line_gap_ui": radius_bounds(VERTICAL_NAME_LINE_GAP_UI, args.line_gap_radius),
        "offset_x_ui": radius_bounds(VERTICAL_NAME_OFFSET_X_UI, args.offset_radius),
        "offset_y_ui": radius_bounds(VERTICAL_NAME_OFFSET_Y_UI, args.offset_radius),
        "glyph_scale": radius_bounds(VERTICAL_NAME_GLYPH_SCALE, args.glyph_scale_radius),
        "face_dilate": radius_bounds(VERTICAL_NAME_FACE_DILATE, args.face_dilate_radius),
        "outline_width": radius_bounds(VERTICAL_NAME_OUTLINE_WIDTH, args.outline_width_radius),
        "distance_scale": radius_bounds(VERTICAL_NAME_DISTANCE_SCALE, args.distance_scale_radius),
        "face_distance_scale": radius_bounds(VERTICAL_NAME_FACE_DISTANCE_SCALE, args.face_distance_scale_radius),
        "outline_distance_scale": radius_bounds(VERTICAL_NAME_OUTLINE_DISTANCE_SCALE, args.outline_distance_scale_radius),
    }
    if any(label.startswith("D") for label in args.labels):
        bounds["dream_offset_y_ui"] = radius_bounds(DREAM_VERTICAL_NAME_OFFSET_Y_UI, args.offset_radius)
    result = optimize_vname(
        args.labels,
        saved[args.base_key],
        args.calls,
        args.include,
        args.render_scale,
        args.output,
        bounds,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
