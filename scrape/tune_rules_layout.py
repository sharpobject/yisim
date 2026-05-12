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
    load_card_reference_rgba,
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
    block_scale: float
    character_spacing: float


def labels_for_locale(locale: str) -> list[str]:
    labels = [f"1150{index}{rarity}_{locale}" for index in SEARCH_CARD_INDICES for rarity in SEARCH_RARITIES]
    if locale == "en":
        labels = [label for label in labels if not label.startswith("11502")]
    return labels


def rules_crop_pixel_difference(generated: Image.Image, target: Image.Image) -> float:
    """Sum RGB disagreement across the fixed rules text crop."""
    bleed_x = max(0, round(renderer.CARD_OUTPUT_BLEED_X_UI))
    x0, y0, x1, y1 = RULE_CROP
    crop = (x0 + bleed_x, y0, x1 + bleed_x, y1)
    generated_crop = generated.crop(crop).convert("RGB")
    target_crop = target.crop(crop).convert("RGB")
    difference = ImageChops.difference(generated_crop, target_crop)
    return sum(ImageStat.Stat(difference).sum[:3])


def apply_candidate(candidate: Candidate) -> None:
    base = renderer.DESC_RECT
    if candidate.locale == "en":
        renderer.DESC_TEXT_DRAW_RECT_EN = base.translated(candidate.offset_x, candidate.offset_y)
        renderer.DESC_BLOCK_SCALE_EN = candidate.block_scale
        renderer.DESC_CHARACTER_SPACING_EN = candidate.character_spacing
    else:
        renderer.DESC_TEXT_DRAW_RECT_CJK = base.translated(candidate.offset_x, candidate.offset_y)
        renderer.DESC_BLOCK_SCALE_CJK = candidate.block_scale
        renderer.DESC_CHARACTER_SPACING_CJK = candidate.character_spacing


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
        source_hi = renderer.render_card_for_label(label, RENDER_SCALE, skip_description=True)
        target_hi_size = (round(target.width * RENDER_SCALE), round(target.height * RENDER_SCALE))
        generated_hi = transform_source(
            source_hi,
            target_hi_size,
            transform.scale,
            transform.dx * RENDER_SCALE,
            transform.dy * RENDER_SCALE,
        )
        generated = renderer.magic_kernel_sharp_resize(generated_hi, target.size)
        renderer.draw_config_text_for_label(
            generated,
            label,
            transform.scale,
            offset=(transform.dx, transform.dy),
            layout_render_scale=RENDER_SCALE,
        )
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
            [
                renderer.DESC_TEXT_DRAW_RECT_EN.left - renderer.DESC_RECT.left - 0.6,
                renderer.DESC_TEXT_DRAW_RECT_EN.top - renderer.DESC_RECT.top - 0.8,
                renderer.DESC_BLOCK_SCALE_EN - 0.04,
                renderer.DESC_CHARACTER_SPACING_EN - 0.8,
            ],
            [
                renderer.DESC_TEXT_DRAW_RECT_EN.left - renderer.DESC_RECT.left + 0.6,
                renderer.DESC_TEXT_DRAW_RECT_EN.top - renderer.DESC_RECT.top + 0.8,
                renderer.DESC_BLOCK_SCALE_EN + 0.04,
                renderer.DESC_CHARACTER_SPACING_EN + 0.4,
            ],
        )
    return (
        [
            renderer.DESC_TEXT_DRAW_RECT_CJK.left - renderer.DESC_RECT.left - 0.6,
            renderer.DESC_TEXT_DRAW_RECT_CJK.top - renderer.DESC_RECT.top - 0.8,
            renderer.DESC_BLOCK_SCALE_CJK - 0.04,
            renderer.DESC_CHARACTER_SPACING_CJK - 0.8,
        ],
        [
            renderer.DESC_TEXT_DRAW_RECT_CJK.left - renderer.DESC_RECT.left + 0.6,
            renderer.DESC_TEXT_DRAW_RECT_CJK.top - renderer.DESC_RECT.top + 0.8,
            renderer.DESC_BLOCK_SCALE_CJK + 0.04,
            renderer.DESC_CHARACTER_SPACING_CJK + 0.4,
        ],
    )


def candidate_from_vector(locale: str, values: list[float] | tuple[float, ...]) -> Candidate:
    return Candidate(
        locale=locale,
        offset_x=float(values[0]),
        offset_y=float(values[1]),
        block_scale=float(values[2]),
        character_spacing=float(values[3]),
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
            "Both locales use 4 dimensions: rect dx, rect dy, uniform text block scale, character spacing."
        ),
    )
    parser.add_argument(
        "--label",
        action="append",
        default=[],
        help="Restrict tuning to one or more labels such as 115021_zh. Defaults to the locale's full set.",
    )
    parser.add_argument(
        "--text-renderer",
        choices=renderer.TEXT_RENDERERS,
        default=renderer.TEXT_RENDERER,
        help="default text rasterizer; sdf uses the game TMP atlas/materials, otf uses extracted DefaultFont.otf",
    )
    args = parser.parse_args()
    renderer.set_text_renderer(args.text_renderer)

    labels = args.label or labels_for_locale(args.locale)
    bad_labels = [label for label in labels if not label.endswith(f"_{args.locale}")]
    if bad_labels:
        raise SystemExit(f"labels do not match locale {args.locale}: {', '.join(bad_labels)}")
    saved = load_saved_transforms(DEFAULT_OUTPUT_DIR / "alignment_summary.json")
    transform = saved["l3_en"]
    targets: dict[str, Image.Image] = {}
    for label in labels:
        example, _, parsed = pair_for_label(label)
        targets[parsed] = load_card_reference_rgba(example)

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
        expected = 8
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
