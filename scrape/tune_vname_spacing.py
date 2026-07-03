#!/usr/bin/env python3
"""Search vertical-name spacing constants against screenshot glyph anchors."""

from __future__ import annotations

import argparse
import itertools

from PIL import Image

import align_card_diffs as align
import debug_card_crops as crops
import render_rule_sky_sword_formation as renderer


LABELS = ["D11131_zh", "D11132_en", "D11133_en", "D11134_en"]


def boxes_for_image(image: Image.Image, label: str) -> list[tuple[int, int, int, int]]:
    box = crops.CROPS["vname"]
    mask = crops.text_mask(image, box, "vname", label=label)
    boxes = crops.row_boxes(mask, min_pixels=3, merge_gap=4, min_height=5)
    return crops.filter_vname_row_boxes(boxes, (box[2] - box[0], box[3] - box[1]), label)


def reference_boxes(label: str) -> list[tuple[int, int, int, int]]:
    return boxes_for_image(align.load_card_reference_rgba(crops.source_path(label)), label)


def generated_downscaled(label: str, render_scale: float) -> Image.Image:
    target = align.load_card_reference_rgba(crops.source_path(label))
    transform = align.load_saved_transforms(crops.DIFF_ROOT / "alignment_summary.json")[label]
    align.generated_card_for_label.cache_clear()
    source_hi = align.generated_card_for_label(label, render_scale)
    target_hi_size = (round(target.width * render_scale), round(target.height * render_scale))
    generated_hi = align.transform_source(
        source_hi,
        target_hi_size,
        transform.scale,
        transform.dx * render_scale,
        transform.dy * render_scale,
    )
    return align.magic_kernel_sharp_resize(generated_hi, target.size)


def score_constants(slot: float, offset: float, labels: list[str], render_scale: float) -> tuple[float, int]:
    renderer.VERTICAL_NAME_SLOT_HEIGHT_UI = slot
    renderer.VERTICAL_NAME_OFFSET_Y_UI = offset
    total_abs = 0
    max_abs = 0
    count = 0
    for label in labels:
        generated = boxes_for_image(generated_downscaled(label, render_scale), label)
        reference = reference_boxes(label)
        if len(generated) != len(reference):
            return 1_000_000.0, 1_000_000
        for gen, ref in zip(generated, reference):
            dx = gen[0] - ref[0]
            dy = gen[1] - ref[1]
            total_abs += abs(dx) + abs(dy)
            max_abs = max(max_abs, abs(dx), abs(dy))
            count += 2
    return total_abs / max(1, count), max_abs


def frange(start: float, stop: float, step: float) -> list[float]:
    values: list[float] = []
    index = 0
    while True:
        value = round(start + index * step, 4)
        if value > stop + step / 2:
            break
        values.append(value)
        index += 1
    return values


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--labels", nargs="*", default=LABELS)
    parser.add_argument("--slot-min", type=float, default=19.8)
    parser.add_argument("--slot-max", type=float, default=20.8)
    parser.add_argument("--slot-step", type=float, default=0.05)
    parser.add_argument("--offset-min", type=float, default=-4.0)
    parser.add_argument("--offset-max", type=float, default=0.0)
    parser.add_argument("--offset-step", type=float, default=0.1)
    parser.add_argument("--render-scale", type=float, default=2.0)
    parser.add_argument("--top", type=int, default=12)
    args = parser.parse_args()

    results: list[tuple[float, int, float, float]] = []
    for slot, offset in itertools.product(
        frange(args.slot_min, args.slot_max, args.slot_step),
        frange(args.offset_min, args.offset_max, args.offset_step),
    ):
        mean_abs, max_abs = score_constants(slot, offset, args.labels, args.render_scale)
        results.append((mean_abs, max_abs, slot, offset))

    for mean_abs, max_abs, slot, offset in sorted(results)[: args.top]:
        print(f"slot={slot:.4f} offset={offset:.4f} mean_abs={mean_abs:.3f} max_abs={max_abs}")


if __name__ == "__main__":
    main()
