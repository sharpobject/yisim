#!/usr/bin/env python3
"""Tune card art scale/offset against screenshot pixels."""

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
from render_rule_sky_sword_formation import ART_RECT, render_card_for_label, set_art_transform


def parse_box(value: str) -> tuple[int, int, int, int]:
    parts = [int(part.strip()) for part in value.split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("boxes must be x0,y0,x1,y1")
    x0, y0, x1, y1 = parts
    if x1 <= x0 or y1 <= y0:
        raise argparse.ArgumentTypeError("box must have positive width and height")
    return x0, y0, x1, y1


def art_include_box(transform: Transform) -> tuple[int, int, int, int]:
    left = ART_RECT.left * transform.scale + transform.dx
    top = ART_RECT.top * transform.scale + transform.dy
    right = ART_RECT.right * transform.scale + transform.dx
    bottom = ART_RECT.bottom * transform.scale + transform.dy
    width = right - left
    height = bottom - top
    return (
        round(left + width * 0.17),
        round(top + height * 0.12),
        round(left + width * 0.94),
        round(top + height * 0.70),
    )


def score_mask(size: tuple[int, int], include: tuple[int, int, int, int], excludes: list[tuple[int, int, int, int]]) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rectangle(include, fill=255)
    for box in excludes:
        draw.rectangle(box, fill=0)
    return mask


def pixel_loss(generated: Image.Image, target: Image.Image, mask: Image.Image) -> float:
    diff = ImageChops.difference(generated.convert("RGB"), target.convert("RGB"))
    stat = ImageStat.Stat(diff, mask)
    return float(sum(stat.sum[:3]))


def render_aligned_art_candidate(label: str, transform: Transform, render_scale: float) -> Image.Image:
    source_hi = render_card_for_label(label, render_scale=render_scale, skip_description=True)
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
    from render_rule_sky_sword_formation import magic_kernel_sharp_resize

    return magic_kernel_sharp_resize(generated_hi, target.size)


def optimize_art_transform(
    labels: list[str],
    whole_transform: Transform,
    calls: int,
    include: tuple[int, int, int, int],
    excludes: list[tuple[int, int, int, int]],
    center_scale: float,
    center_dx: float,
    center_dy: float,
    scale_radius: float,
    dx_radius: float,
    dy_radius: float,
    render_scale: float,
    output: Path,
) -> dict[str, object]:
    targets = []
    for label in labels:
        example, _, parsed = pair_for_label(label)
        target = load_card_reference_rgba(example)
        mask = score_mask(target.size, include, excludes)
        targets.append((parsed, target, mask))

    output.parent.mkdir(parents=True, exist_ok=True)
    if targets:
        targets[0][2].save(output.with_name(output.stem + "_mask.png"), optimize=True, compress_level=9)

    seen = 0
    best: dict[str, object] | None = None

    def objective(art_scale: float, dx_ui: float, dy_ui: float) -> float:
        nonlocal seen, best
        seen += 1
        set_art_transform(art_scale, dx_ui, dy_ui)
        total = 0.0
        per_label = []
        for parsed, target, mask in targets:
            generated = render_aligned_art_candidate(parsed, whole_transform, render_scale)
            label_score = pixel_loss(generated, target, mask)
            total += label_score
            per_label.append((label_score, parsed))
        score = total / max(1, len(targets))
        per_label.sort(reverse=True)
        record = {
            "iter": seen,
            "labels": labels,
            "score": score,
            "art_transform": {
                "scale": float(art_scale),
                "dx_ui": float(dx_ui),
                "dy_ui": float(dy_ui),
                "score": score,
            },
            "worst": per_label[:5],
        }
        if best is None or score < float(best["score"]):
            best = record
            print(f"NEW_BEST {json.dumps(record, ensure_ascii=False)}", flush=True)
        else:
            print(f"ITER {json.dumps(record, ensure_ascii=False)}", flush=True)
        return score

    lower = [center_scale - scale_radius, center_dx - dx_radius, center_dy - dy_radius]
    upper = [center_scale + scale_radius, center_dx + dx_radius, center_dy + dy_radius]
    values, score = dlib.find_min_global(objective, lower, upper, calls, 0.0)
    set_art_transform(1.0, 0.0, 0.0)
    final = {
        "labels": labels,
        "whole_transform": {
            "scale": whole_transform.scale,
            "dx": whole_transform.dx,
            "dy": whole_transform.dy,
            "score": whole_transform.score,
        },
        "best": {
            "scale": float(values[0]),
            "dx_ui": float(values[1]),
            "dy_ui": float(values[2]),
            "score": float(score),
        },
        "include": include,
        "excludes": excludes,
        "calls": calls,
        "render_scale": render_scale,
        "mask": str(output.with_name(output.stem + "_mask.png")),
    }
    output.write_text(json.dumps(final, indent=2, ensure_ascii=False), encoding="utf-8")
    return final


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("labels", nargs="+", help="labels to optimize, e.g. 112033_en")
    parser.add_argument("--calls", type=int, default=1000)
    parser.add_argument("--base-key", default="l3_en", help="saved whole-card transform key")
    parser.add_argument("--include", type=parse_box, default=None)
    parser.add_argument("--exclude", type=parse_box, action="append", default=[])
    parser.add_argument("--center-scale", type=float, default=1.0)
    parser.add_argument("--center-dx", type=float, default=0.0)
    parser.add_argument("--center-dy", type=float, default=0.0)
    parser.add_argument("--scale-radius", type=float, default=0.04)
    parser.add_argument("--dx-radius", type=float, default=5.0)
    parser.add_argument("--dy-radius", type=float, default=5.0)
    parser.add_argument("--render-scale", type=float, default=2.0)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_DIR / "art_pixel_transform_tuning.json")
    args = parser.parse_args()

    saved = load_saved_transforms(DEFAULT_OUTPUT_DIR / "alignment_summary.json")
    if args.base_key not in saved:
        raise SystemExit(f"missing base transform {args.base_key!r}")
    whole_transform = saved[args.base_key]
    include = args.include if args.include is not None else art_include_box(whole_transform)
    result = optimize_art_transform(
        args.labels,
        whole_transform,
        args.calls,
        include,
        args.exclude,
        args.center_scale,
        args.center_dx,
        args.center_dy,
        args.scale_radius,
        args.dx_radius,
        args.dy_radius,
        args.render_scale,
        args.output,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
