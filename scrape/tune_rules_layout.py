#!/usr/bin/env python3
"""Search small renderer perturbations for card rules text layout."""

from __future__ import annotations

import argparse
import json
import os
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

import dlib
from PIL import Image, ImageChops, ImageStat

import debug_card_crops as crops
import render_rule_sky_sword_formation as renderer
from align_card_diffs import (
    DEFAULT_OUTPUT_DIR,
    Transform,
    load_rgba,
    load_saved_transforms,
    pair_for_label,
    transform_source,
)


RENDER_SCALE = 2.0
RULE_CROP = crops.CROPS["rules"]
SEARCH_CARD_INDICES = range(1, 9)
SEARCH_RARITIES = range(1, 4)


@dataclass(frozen=True)
class Candidate:
    locale: str
    offset_x: float
    offset_y: float
    glyph_scale: float
    char_spacing: float
    line_spacing: float
    fixed_line_offset: float
    normal_face_dilate: float = 0.0
    bold_face_dilate: float = 0.0


def labels_for_locale(locale: str) -> list[str]:
    labels = [f"1150{index}{rarity}_{locale}" for index in SEARCH_CARD_INDICES for rarity in SEARCH_RARITIES]
    if locale == "en":
        labels = [label for label in labels if not label.startswith("11502")]
    return labels


def rules_crop_pixel_difference(generated: Image.Image, target: Image.Image) -> float:
    """Sum RGB disagreement across the fixed rules text crop."""
    generated_crop = generated.crop(RULE_CROP).convert("RGB")
    target_crop = target.crop(RULE_CROP).convert("RGB")
    difference = ImageChops.difference(generated_crop, target_crop)
    return sum(ImageStat.Stat(difference).sum[:3])


def apply_candidate(candidate: Candidate) -> None:
    base = renderer.DESC_RECT
    if candidate.locale == "en":
        # The production renderer may contain per-line-count tuned overrides.
        # Tuning must bypass those overrides or every candidate in that group
        # renders with the already-baked style instead of the candidate values.
        renderer.DESC_GROUP_STYLES_EN.clear()
        renderer.DESC_TEXT_DRAW_RECT_EN = base.translated(candidate.offset_x, candidate.offset_y)
        renderer.DESC_GLYPH_SCALE_EN = candidate.glyph_scale
        renderer.DESC_CHARACTER_SPACING_EN = candidate.char_spacing
        renderer.DESC_FACE_DILATE_EN_NORMAL = candidate.normal_face_dilate
        renderer.DESC_FACE_DILATE_EN_BOLD = candidate.bold_face_dilate
        renderer.DESC_LINE_SPACING_EN = candidate.line_spacing
        renderer.DESC_FIXED_LINE_OFFSET_Y_EN_UI = candidate.fixed_line_offset
    else:
        renderer.DESC_TEXT_DRAW_RECT_CJK = base.translated(candidate.offset_x, candidate.offset_y)
        renderer.DESC_GLYPH_SCALE_CJK = candidate.glyph_scale
        renderer.DESC_CHARACTER_SPACING_CJK = candidate.char_spacing
        renderer.DESC_FACE_DILATE_CJK_NORMAL = candidate.normal_face_dilate
        renderer.DESC_FACE_DILATE_CJK_BOLD = candidate.bold_face_dilate
        renderer.DESC_LINE_SPACING_CJK = candidate.line_spacing
        renderer.DESC_FIXED_LINE_OFFSET_Y_CJK_UI = candidate.fixed_line_offset


def evaluate(
    candidate: Candidate,
    labels: list[str],
    targets: dict[str, Image.Image],
    transform: Transform,
    workers: int = 1,
) -> dict[str, object]:
    apply_candidate(candidate)

    def score_label(label: str) -> tuple[float, str]:
        target = targets[label]
        source_hi = renderer.render_card_for_label(label, RENDER_SCALE)
        target_hi_size = (round(target.width * RENDER_SCALE), round(target.height * RENDER_SCALE))
        generated_hi = transform_source(
            source_hi,
            target_hi_size,
            transform.scale,
            round(transform.dx * RENDER_SCALE),
            round(transform.dy * RENDER_SCALE),
        )
        generated = renderer.magic_kernel_sharp_resize(generated_hi, target.size)
        p_loss = rules_crop_pixel_difference(generated, target)
        return p_loss, label

    if workers <= 1 or len(labels) <= 1:
        label_scores = [score_label(label) for label in labels]
    else:
        with ThreadPoolExecutor(max_workers=workers) as executor:
            label_scores = list(executor.map(score_label, labels))

    total_pixel = 0.0
    worst: list[tuple[float, str]] = []
    for p_loss, label in label_scores:
        total_pixel += p_loss
        worst.append((p_loss, label))
    worst.sort(reverse=True)
    return {
        "candidate": candidate.__dict__,
        "pixel": total_pixel,
        "score": total_pixel,
        "score_mode": "pixel",
        "worst": worst[:5],
    }


def search_bounds(locale: str) -> tuple[list[float], list[float]]:
    if locale == "en":
        return (
            [-1.0, 0.0, 0.995, -3.2, -7.5, 0.5, -0.25, -0.25],
            [1.0, 2.8, 1.030, -1.0, -4.5, 3.0, 0.35, 0.35],
        )
    return (
        [-1.0, -2.8, 0.985, 0.0, -7.5, 0.5, -0.25, -0.25],
        [1.0, 0.8, 1.010, 1.8, -4.5, 3.0, 0.35, 0.35],
    )


def candidate_from_vector(locale: str, values: list[float] | tuple[float, ...]) -> Candidate:
    normal_face_dilate = float(values[6]) if len(values) > 6 else 0.0
    bold_face_dilate = float(values[7]) if len(values) > 7 else 0.0
    return Candidate(
        locale=locale,
        offset_x=float(values[0]),
        offset_y=float(values[1]),
        glyph_scale=float(values[2]),
        char_spacing=float(values[3]),
        line_spacing=float(values[4]),
        fixed_line_offset=float(values[5]),
        normal_face_dilate=normal_face_dilate,
        bold_face_dilate=bold_face_dilate,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("locale", choices=("zh", "en"))
    parser.add_argument("--calls", type=int, default=120)
    parser.add_argument("--epsilon", type=float, default=0.0)
    parser.add_argument("--workers", type=int, default=os.cpu_count() or 1)
    parser.add_argument(
        "--bounds",
        default="",
        help=(
            "Override search bounds as comma-separated lower values followed by upper values. "
            "Both locales use 8 dimensions including normal_face_dilate and bold_face_dilate."
        ),
    )
    parser.add_argument(
        "--label",
        action="append",
        default=[],
        help="Restrict tuning to one or more labels such as 115021_zh. Defaults to the locale's full set.",
    )
    args = parser.parse_args()

    labels = args.label or labels_for_locale(args.locale)
    bad_labels = [label for label in labels if not label.endswith(f"_{args.locale}")]
    if bad_labels:
        raise SystemExit(f"labels do not match locale {args.locale}: {', '.join(bad_labels)}")
    saved = load_saved_transforms(DEFAULT_OUTPUT_DIR / "alignment_summary.json")
    transform = saved["l3_en"]
    targets: dict[str, Image.Image] = {}
    for label in labels:
        example, _, parsed = pair_for_label(label)
        targets[parsed] = load_rgba(example)

    results: list[dict[str, object]] = []
    cache: dict[tuple[float, ...], float] = {}

    def objective(*values: float) -> float:
        key = tuple(float(value) for value in values)
        if key in cache:
            return cache[key]
        candidate = candidate_from_vector(args.locale, values)
        result = evaluate(
            candidate,
            labels,
            targets,
            transform,
            workers=args.workers,
        )
        results.append(result)
        score = float(result["score"])
        cache[key] = score
        index = len(results)
        best = min(results, key=lambda item: item["score"])
        print(
            f"{index}: score={score:.1f} pixel={result['pixel']:.0f} "
            f"best={best['score']:.1f} {result['candidate']}",
            flush=True,
        )
        return score

    if args.bounds:
        values = [float(part.strip()) for part in args.bounds.split(",")]
        expected = 16
        if len(values) != expected:
            raise SystemExit(f"--bounds requires exactly {expected} comma-separated floats for {args.locale}")
        midpoint = expected // 2
        lower, upper = values[:midpoint], values[midpoint:]
    else:
        lower, upper = search_bounds(args.locale)
    best_values, best_score = dlib.find_min_global(objective, lower, upper, args.calls, args.epsilon)
    best_candidate = candidate_from_vector(args.locale, best_values)
    best_result = evaluate(
        best_candidate,
        labels,
        targets,
        transform,
        workers=args.workers,
    )
    best_result["score"] = min(float(best_result["score"]), float(best_score))
    results.append(best_result)

    results.sort(key=lambda item: item["score"])
    output = DEFAULT_OUTPUT_DIR / f"rules_tuning_{args.locale}.json"
    output.write_text(
        json.dumps({"best_values": list(best_values), "results": results[:50]}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(json.dumps(results[:10], indent=2, ensure_ascii=False))
    print(output)


if __name__ == "__main__":
    main()
