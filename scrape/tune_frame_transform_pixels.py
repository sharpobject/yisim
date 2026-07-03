#!/usr/bin/env python3
"""Tune generated-card scale/offset against screenshot background pixels."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
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
from render_rule_sky_sword_formation import magic_kernel_sharp_resize, render_card_for_label


def parse_box(value: str) -> tuple[int, int, int, int]:
    parts = [int(part.strip()) for part in value.split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("boxes must be x0,y0,x1,y1")
    x0, y0, x1, y1 = parts
    if x1 <= x0 or y1 <= y0:
        raise argparse.ArgumentTypeError("box must have positive width and height")
    return x0, y0, x1, y1


def textish_mask(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    mask = Image.new("L", image.size, 0)
    pixels = rgb.load()
    out = mask.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            mx = max(r, g, b)
            mn = min(r, g, b)
            if mn < 75 or mx < 115 or (mx - mn > 55 and mx > 120):
                out[x, y] = 255
    return mask


def score_mask(target: Image.Image, include: tuple[int, int, int, int], excludes: list[tuple[int, int, int, int]]) -> Image.Image:
    mask = Image.new("L", target.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rectangle(include, fill=255)
    for box in excludes:
        draw.rectangle(box, fill=0)
    return ImageChops.subtract(mask, textish_mask(target))


def pixel_loss(generated: Image.Image, target: Image.Image, mask: Image.Image) -> float:
    diff = ImageChops.difference(generated.convert("RGB"), target.convert("RGB"))
    stat = ImageStat.Stat(diff, mask)
    return float(sum(stat.sum[:3]))


def transform_source_subpixel(source: Image.Image, target_size: tuple[int, int], scale: float, dx: float, dy: float) -> Image.Image:
    return transform_source(source, target_size, scale, dx, dy)


def optimize_transform(
    labels: list[str],
    base: Transform,
    calls: int,
    include: tuple[int, int, int, int],
    excludes: list[tuple[int, int, int, int]],
    scale_radius: float,
    dx_radius: float,
    dy_radius: float,
    output: Path,
) -> dict[str, object]:
    samples = []
    for label in labels:
        example, _, parsed = pair_for_label(label)
        target = load_card_reference_rgba(example)
        source = render_card_for_label(parsed, render_scale=1.0, skip_description=True)
        mask = score_mask(target, include, excludes)
        samples.append((parsed, source, target, mask))
    output.parent.mkdir(parents=True, exist_ok=True)
    if samples:
        samples[0][3].save(output.with_name(output.stem + "_mask.png"), optimize=True, compress_level=9)

    seen = 0
    best: dict[str, object] | None = None

    def objective(scale: float, dx: float, dy: float) -> float:
        nonlocal seen, best
        seen += 1
        per_label = []
        total = 0.0
        for parsed, source, target, mask in samples:
            aligned = transform_source_subpixel(source, target.size, float(scale), float(dx), float(dy))
            label_score = pixel_loss(aligned, target, mask)
            per_label.append((label_score, parsed))
            total += label_score
        score = total / max(1, len(samples))
        per_label.sort(reverse=True)
        record = {
            "iter": seen,
            "labels": labels,
            "score": score,
            "transform": {
                "scale": float(scale),
                "dx": float(dx),
                "dy": float(dy),
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

    lower = [base.scale - scale_radius, base.dx - dx_radius, base.dy - dy_radius]
    upper = [base.scale + scale_radius, base.dx + dx_radius, base.dy + dy_radius]
    values, score = dlib.find_min_global(objective, lower, upper, calls, 0.0)
    result = {
        "scale": float(values[0]),
        "dx": float(values[1]),
        "dy": float(values[2]),
        "score": float(score),
    }
    final = {
        "labels": labels,
        "base": asdict(base),
        "best": result,
        "include": include,
        "excludes": excludes,
        "calls": calls,
        "mask": str(output.with_name(output.stem + "_mask.png")),
    }
    output.write_text(json.dumps(final, indent=2, ensure_ascii=False), encoding="utf-8")
    return final


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("labels", nargs="+", help="labels to optimize, e.g. 112033_en")
    parser.add_argument("--calls", type=int, default=1000)
    parser.add_argument("--base-key", default="l3_en", help="saved transform key to use as search center")
    parser.add_argument("--center-scale", type=float, default=None)
    parser.add_argument("--center-dx", type=float, default=None)
    parser.add_argument("--center-dy", type=float, default=None)
    parser.add_argument("--include", type=parse_box, default=parse_box("35,300,385,660"))
    parser.add_argument("--exclude", type=parse_box, action="append", default=[])
    parser.add_argument("--scale-radius", type=float, default=0.012)
    parser.add_argument("--dx-radius", type=float, default=7.0)
    parser.add_argument("--dy-radius", type=float, default=7.0)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_DIR / "frame_pixel_transform_tuning.json")
    args = parser.parse_args()

    saved = load_saved_transforms(DEFAULT_OUTPUT_DIR / "alignment_summary.json")
    if args.base_key not in saved:
        raise SystemExit(f"missing base transform {args.base_key!r}")
    base = saved[args.base_key]
    if args.center_scale is not None or args.center_dx is not None or args.center_dy is not None:
        if args.center_scale is None or args.center_dx is None or args.center_dy is None:
            raise SystemExit("--center-scale, --center-dx, and --center-dy must be provided together")
        base = Transform(args.center_scale, args.center_dx, args.center_dy, base.score)

    results = [
        optimize_transform(
            args.labels,
            base,
            args.calls,
            args.include,
            args.exclude,
            args.scale_radius,
            args.dx_radius,
            args.dy_radius,
            args.output,
        )
    ]
    args.output.write_text(json.dumps({"results": results}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"results": results}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
