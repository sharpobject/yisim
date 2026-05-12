#!/usr/bin/env python3
"""Tune qi-cost icon and digit rendering against screenshot pixels."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import dlib
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat

from align_card_diffs import (
    DEFAULT_OUTPUT_DIR,
    Transform,
    load_card_reference_rgba,
    load_saved_transforms,
    pair_for_label,
    transform_source,
)
from render_rule_sky_sword_formation import (
    QI_DIGIT_FACE_DILATE,
    QI_DIGIT_FACE_DISTANCE_SCALE,
    QI_DIGIT_FONT_SIZE_UI,
    QI_DIGIT_OFFSET_X,
    QI_DIGIT_OFFSET_Y,
    QI_DIGIT_OUTLINE_WIDTH,
    QI_DIGIT_OUTLINE_DISTANCE_SCALE,
    QI_DIGIT_SCALE_X,
    QI_DIGIT_SCALE_Y,
    QI_ICON_DRAW_RECT,
    QI_ICON_OFFSET_X_UI,
    QI_ICON_OFFSET_Y_UI,
    QI_ICON_SCALE,
    QI_LABEL_RECT,
    card_by_id,
    magic_kernel_sharp_resize,
    render_config_card,
    resolve_reference,
    set_qi_cost_render_params,
)


def parse_box(value: str) -> tuple[int, int, int, int]:
    parts = [int(part.strip()) for part in value.split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("boxes must be x0,y0,x1,y1")
    x0, y0, x1, y1 = parts
    if x1 <= x0 or y1 <= y0:
        raise argparse.ArgumentTypeError("box must have positive width and height")
    return x0, y0, x1, y1


def qi_include_box(transform: Transform, size: tuple[int, int]) -> tuple[int, int, int, int]:
    left = min(QI_ICON_DRAW_RECT.left, QI_LABEL_RECT.left) * transform.scale + transform.dx
    top = min(QI_ICON_DRAW_RECT.top, QI_LABEL_RECT.top) * transform.scale + transform.dy
    right = max(QI_ICON_DRAW_RECT.right, QI_LABEL_RECT.right) * transform.scale + transform.dx
    bottom = max(QI_ICON_DRAW_RECT.bottom, QI_LABEL_RECT.bottom) * transform.scale + transform.dy
    pad = 10
    return (
        max(0, round(left - pad)),
        max(0, round(top - pad)),
        min(size[0], round(right + pad)),
        min(size[1], round(bottom + pad)),
    )


def score_mask(target: Image.Image, include: tuple[int, int, int, int], opaque_margin: int = 2) -> Image.Image:
    roi = Image.new("L", target.size, 0)
    ImageDraw.Draw(roi).rectangle(include, fill=255)
    alpha = target.getchannel("A").point(lambda value: 255 if value == 255 else 0)
    if opaque_margin > 0:
        alpha = alpha.filter(ImageFilter.MinFilter(opaque_margin * 2 + 1))
    return ImageChops.multiply(roi, alpha)


def pixel_loss(generated: Image.Image, target: Image.Image, mask: Image.Image) -> float:
    diff = ImageChops.difference(generated.convert("RGB"), target.convert("RGB"))
    return float(sum(ImageStat.Stat(diff, mask).sum[:3]))


def render_cost_candidate(label: str, transform: Transform, render_scale: float) -> Image.Image:
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


def optimize_qi_cost(
    labels: list[str],
    whole_transform: Transform,
    calls: int,
    include: tuple[int, int, int, int] | None,
    render_scale: float,
    output: Path,
    bounds: dict[str, tuple[float, float]],
) -> dict[str, object]:
    targets = []
    for label in labels:
        example, _, parsed = pair_for_label(label)
        target = load_card_reference_rgba(example)
        mask = score_mask(target, include or qi_include_box(whole_transform, target.size))
        targets.append((parsed, target, mask))

    output.parent.mkdir(parents=True, exist_ok=True)
    if targets:
        targets[0][2].save(output.with_name(output.stem + "_mask.png"), optimize=True, compress_level=9)

    names = [
        "icon_scale",
        "icon_dx_ui",
        "icon_dy_ui",
        "digit_font_size_ui",
        "digit_scale_x",
        "digit_scale_y",
        "digit_dx_ui",
        "digit_dy_ui",
        "digit_face_dilate",
        "digit_outline_width",
        "digit_face_distance_scale",
        "digit_outline_distance_scale",
    ]
    lower = [bounds[name][0] for name in names]
    upper = [bounds[name][1] for name in names]
    seen = 0
    best: dict[str, object] | None = None

    def objective(*values: float) -> float:
        nonlocal seen, best
        seen += 1
        params = dict(zip(names, map(float, values)))
        set_qi_cost_render_params(**params)
        total = 0.0
        per_label = []
        for parsed, target, mask in targets:
            generated = render_cost_candidate(parsed, whole_transform, render_scale)
            label_score = pixel_loss(generated, target, mask)
            total += label_score
            per_label.append((label_score, parsed))
        score = total / max(1, len(targets))
        per_label.sort(reverse=True)
        record = {
            "iter": seen,
            "labels": labels,
            "score": score,
            "qi_cost": {**params, "score": score},
            "worst": per_label[:5],
        }
        if best is None or score < float(best["score"]):
            best = record
            print(f"NEW_BEST {json.dumps(record, ensure_ascii=False)}", flush=True)
        else:
            print(f"ITER {json.dumps(record, ensure_ascii=False)}", flush=True)
        return score

    values, score = dlib.find_min_global(objective, lower, upper, calls, 0.0)
    set_qi_cost_render_params()
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
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_DIR / "qi_cost_pixel_tuning.json")
    parser.add_argument("--icon-scale-radius", type=float, default=0.08)
    parser.add_argument("--icon-offset-radius", type=float, default=4.0)
    parser.add_argument("--digit-font-radius", type=float, default=3.0)
    parser.add_argument("--digit-scale-radius", type=float, default=0.12)
    parser.add_argument("--digit-offset-radius", type=float, default=5.0)
    parser.add_argument("--digit-face-dilate-radius", type=float, default=0.35)
    parser.add_argument("--digit-outline-width-radius", type=float, default=0.35)
    parser.add_argument("--digit-face-distance-scale-radius", type=float, default=0.45)
    parser.add_argument("--digit-outline-distance-scale-radius", type=float, default=0.45)
    args = parser.parse_args()

    saved = load_saved_transforms(DEFAULT_OUTPUT_DIR / "alignment_summary.json")
    if args.base_key not in saved:
        raise SystemExit(f"missing base transform {args.base_key!r}")
    bounds = {
        "icon_scale": radius_bounds(QI_ICON_SCALE, args.icon_scale_radius),
        "icon_dx_ui": radius_bounds(QI_ICON_OFFSET_X_UI, args.icon_offset_radius),
        "icon_dy_ui": radius_bounds(QI_ICON_OFFSET_Y_UI, args.icon_offset_radius),
        "digit_font_size_ui": radius_bounds(QI_DIGIT_FONT_SIZE_UI, args.digit_font_radius),
        "digit_scale_x": radius_bounds(QI_DIGIT_SCALE_X, args.digit_scale_radius),
        "digit_scale_y": radius_bounds(QI_DIGIT_SCALE_Y, args.digit_scale_radius),
        "digit_dx_ui": radius_bounds(QI_DIGIT_OFFSET_X, args.digit_offset_radius),
        "digit_dy_ui": radius_bounds(QI_DIGIT_OFFSET_Y, args.digit_offset_radius),
        "digit_face_dilate": radius_bounds(QI_DIGIT_FACE_DILATE, args.digit_face_dilate_radius),
        "digit_outline_width": radius_bounds(QI_DIGIT_OUTLINE_WIDTH, args.digit_outline_width_radius),
        "digit_face_distance_scale": radius_bounds(QI_DIGIT_FACE_DISTANCE_SCALE, args.digit_face_distance_scale_radius),
        "digit_outline_distance_scale": radius_bounds(QI_DIGIT_OUTLINE_DISTANCE_SCALE, args.digit_outline_distance_scale_radius),
    }
    result = optimize_qi_cost(
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
