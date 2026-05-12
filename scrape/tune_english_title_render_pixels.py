#!/usr/bin/env python3
"""Tune English card-name rendering against screenshot title pixels."""

from __future__ import annotations

import argparse
import json
import random
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
import render_rule_sky_sword_formation as renderer


EXAMPLE_ROOT = Path(__file__).resolve().parent / "rssf_examples"
DEFAULT_EXCLUDE_PATH = Path(__file__).resolve().parent / "dlib_optimization_exclude_labels.tsv"
TITLE_CROP = (85, 0, 410, 135)


def parse_box(value: str) -> tuple[int, int, int, int]:
    parts = [int(part.strip()) for part in value.split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("boxes must be x0,y0,x1,y1")
    x0, y0, x1, y1 = parts
    if x1 <= x0 or y1 <= y0:
        raise argparse.ArgumentTypeError("box must have positive width and height")
    return x0, y0, x1, y1


def load_excluded_labels(path: Path | None) -> set[str]:
    if path is None or not path.exists():
        return set()
    labels: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("label\t"):
            continue
        labels.add(line.split("\t", 1)[0])
    return labels


def padded_crop(box: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    bleed_x = max(0, round(renderer.CARD_OUTPUT_BLEED_X_UI))
    x0, y0, x1, y1 = box
    return (x0 + bleed_x, y0, x1 + bleed_x, y1)


def is_level1_numeric_en_label(label: str) -> bool:
    if not label.endswith("_en"):
        return False
    ref_id, _ = label.split("_", 1)
    return len(ref_id) == 6 and ref_id.isdigit() and ref_id[2] == "1"


def sample_labels(count: int, seed: int, exclude: set[str]) -> list[str]:
    labels = []
    for path in sorted((EXAMPLE_ROOT / "orig_en").glob("*.png")):
        label = f"{path.stem}_en"
        if is_level1_numeric_en_label(label) and label not in exclude:
            try:
                if renderer.resolve_reference(path.stem).card_id is not None:
                    labels.append(label)
            except Exception:
                pass
    if count >= len(labels):
        return labels
    rng = random.Random(seed)
    return sorted(rng.sample(labels, count))


def score_mask(size: tuple[int, int], include: tuple[int, int, int, int]) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rectangle(include, fill=255)
    return mask


def pixel_loss(generated: Image.Image, target: Image.Image, mask: Image.Image) -> float:
    diff = ImageChops.difference(generated.convert("RGB"), target.convert("RGB"))
    return float(sum(ImageStat.Stat(diff, mask).sum[:3]))


def render_title_candidate(label: str, transform: Transform, render_scale: float) -> Image.Image:
    ref_id, locale = label.split("_", 1)
    resolved = renderer.resolve_reference(ref_id)
    if resolved.card_id is None:
        raise ValueError(f"{label} did not resolve to a config card")
    card = renderer.card_by_id()[resolved.card_id]
    source_hi = renderer.render_config_card(
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
    return renderer.magic_kernel_sharp_resize(generated_hi, target.size)


def radius_bounds(center: float, radius: float) -> tuple[float, float]:
    return (center - radius, center + radius)


def optimize_title(
    labels: list[str],
    whole_transform: Transform,
    calls: int,
    include: tuple[int, int, int, int],
    render_scale: float,
    output: Path,
    bounds: dict[str, tuple[float, float]],
) -> dict[str, object]:
    targets = []
    for label in labels:
        example, _, parsed = pair_for_label(label)
        target = load_card_reference_rgba(example)
        targets.append((parsed, target, score_mask(target.size, padded_crop(include))))

    output.parent.mkdir(parents=True, exist_ok=True)
    targets[0][2].save(output.with_name(output.stem + "_mask.png"), optimize=True, compress_level=9)

    names = list(bounds)
    lower = [bounds[name][0] for name in names]
    upper = [bounds[name][1] for name in names]
    seen = 0
    best: dict[str, object] | None = None

    def objective(*values: float) -> float:
        nonlocal seen, best
        seen += 1
        params = dict(zip(names, map(float, values)))
        renderer.set_english_title_render_params(**params)
        total = 0.0
        per_label = []
        for parsed, target, mask in targets:
            generated = render_title_candidate(parsed, whole_transform, render_scale)
            label_score = pixel_loss(generated, target, mask)
            total += label_score
            per_label.append((label_score, parsed))
        score = total / len(targets)
        per_label.sort(reverse=True)
        record = {
            "iter": seen,
            "labels": labels,
            "score": score,
            "title": {**params, "score": score},
            "worst": per_label[:5],
        }
        if best is None or score < float(best["score"]):
            best = record
            print(f"NEW_BEST {json.dumps(record, ensure_ascii=False)}", flush=True)
        else:
            print(f"ITER {json.dumps(record, ensure_ascii=False)}", flush=True)
        return score

    values, score = dlib.find_min_global(objective, lower, upper, calls, 0.0)
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("labels", nargs="*", help="Optional explicit labels. Defaults to sampled level-1 English labels.")
    parser.add_argument("--exclude-label-file", type=Path, default=DEFAULT_EXCLUDE_PATH)
    parser.add_argument("--sample-count", type=int, default=15)
    parser.add_argument("--seed", type=int, default=20260509)
    parser.add_argument("--calls", type=int, default=300)
    parser.add_argument("--base-key", default="l3_en")
    parser.add_argument("--include", type=parse_box, default=TITLE_CROP)
    parser.add_argument("--render-scale", type=float, default=2.0)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_DIR / "english_title_pixel_tuning.json")
    parser.add_argument("--font-radius", type=float, default=1.5)
    parser.add_argument("--two-line-max-scale-radius", type=float, default=0.05)
    parser.add_argument("--single-line-scale-radius", type=float, default=0.04)
    parser.add_argument("--offset-radius", type=float, default=4.0)
    parser.add_argument("--rect-offset-radius", type=float, default=0.0)
    parser.add_argument("--rect-width-scale-radius", type=float, default=0.0)
    parser.add_argument("--glyph-scale-radius", type=float, default=0.08)
    parser.add_argument("--char-spacing-radius", type=float, default=1.0)
    parser.add_argument("--line-spacing-radius", type=float, default=2.0)
    parser.add_argument("--face-dilate-radius", type=float, default=0.25)
    parser.add_argument("--outline-width-radius", type=float, default=0.25)
    parser.add_argument("--face-distance-scale-radius", type=float, default=1.0)
    parser.add_argument("--outline-distance-scale-radius", type=float, default=1.0)
    parser.add_argument(
        "--position-spacing-only",
        action="store_true",
        help="Only tune title offset_x_ui, offset_y_ui, glyph_scale, and char_spacing.",
    )
    args = parser.parse_args()

    labels = args.labels or sample_labels(args.sample_count, args.seed, load_excluded_labels(args.exclude_label_file))
    if not labels:
        raise SystemExit("no labels selected")
    saved = load_saved_transforms(DEFAULT_OUTPUT_DIR / "alignment_summary.json")
    if args.base_key not in saved:
        raise SystemExit(f"missing base transform {args.base_key!r}")
    if args.position_spacing_only:
        bounds = {
            "offset_x_ui": radius_bounds(renderer.TITLE_OFFSET_X_UI, args.offset_radius),
            "offset_y_ui": radius_bounds(renderer.TITLE_OFFSET_Y_UI, args.offset_radius),
            "two_line_max_scale": radius_bounds(renderer.TITLE_TWO_LINE_MAX_SCALE, args.two_line_max_scale_radius),
            "rect_offset_x_ui": radius_bounds(renderer.TITLE_RECT_OFFSET_X_UI, args.rect_offset_radius),
            "rect_width_scale": radius_bounds(renderer.TITLE_RECT_WIDTH_SCALE, args.rect_width_scale_radius),
            "glyph_scale": radius_bounds(renderer.TITLE_GLYPH_SCALE_EN, args.glyph_scale_radius),
            "char_spacing": radius_bounds(renderer.TITLE_CHARACTER_SPACING_EN, args.char_spacing_radius),
        }
    else:
        bounds = {
            "font_size_max_ui": radius_bounds(renderer.TITLE_FONT_SIZE_MAX_UI, args.font_radius),
            "two_line_max_scale": radius_bounds(renderer.TITLE_TWO_LINE_MAX_SCALE, args.two_line_max_scale_radius),
            "single_line_scale": radius_bounds(renderer.TITLE_SINGLE_LINE_SCALE, args.single_line_scale_radius),
            "rect_offset_x_ui": radius_bounds(renderer.TITLE_RECT_OFFSET_X_UI, args.rect_offset_radius),
            "rect_width_scale": radius_bounds(renderer.TITLE_RECT_WIDTH_SCALE, args.rect_width_scale_radius),
            "offset_x_ui": radius_bounds(renderer.TITLE_OFFSET_X_UI, args.offset_radius),
            "offset_y_ui": radius_bounds(renderer.TITLE_OFFSET_Y_UI, args.offset_radius),
            "glyph_scale": radius_bounds(renderer.TITLE_GLYPH_SCALE_EN, args.glyph_scale_radius),
            "char_spacing": radius_bounds(renderer.TITLE_CHARACTER_SPACING_EN, args.char_spacing_radius),
            "line_spacing": radius_bounds(renderer.TITLE_LINE_SPACING, args.line_spacing_radius),
            "face_dilate": radius_bounds(renderer.TITLE_FACE_DILATE, args.face_dilate_radius),
            "outline_width": radius_bounds(renderer.TITLE_OUTLINE_WIDTH, args.outline_width_radius),
            "face_distance_scale": radius_bounds(renderer.TITLE_FACE_DISTANCE_SCALE, args.face_distance_scale_radius),
            "outline_distance_scale": radius_bounds(renderer.TITLE_OUTLINE_DISTANCE_SCALE, args.outline_distance_scale_radius),
        }
    print(f"labels {' '.join(labels)}", flush=True)
    result = optimize_title(labels, saved[args.base_key], args.calls, args.include, args.render_scale, args.output, bounds)
    print(json.dumps(result, indent=2, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
