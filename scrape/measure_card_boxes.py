#!/usr/bin/env python3
"""Print generated-vs-screenshot box deltas for card text debug crops."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

import debug_card_crops as crops


DREAM_LABELS = [
    "D11131_zh",
    "D11131_en",
    "D11132_zh",
    "D11132_en",
    "D11133_zh",
    "D11133_en",
    "D11134_zh",
    "D11134_en",
    "D11135_zh",
    "D11135_en",
]

def boxes_for(label: str, kind: str, screenshot: bool) -> list[tuple[int, int, int, int]]:
    box = crops.CROPS[kind]
    path = crops.source_path(label) if screenshot else crops.DIFF_ROOT / f"{label}_generated_downscaled.png"
    image = Image.open(path).convert("RGBA")
    merge_gap = 4 if kind == "vname" else (1 if label.startswith("D") else 3)
    mask = crops.text_mask(image, box, kind, label=label)
    boxes = crops.row_boxes(
        mask,
        min_pixels=3 if kind == "vname" else 10,
        merge_gap=merge_gap,
        min_height=5 if kind == "vname" else 7,
        trim_edges=kind == "rules",
    )
    crop_size = (box[2] - box[0], box[3] - box[1])
    if kind == "rules":
        return crops.filter_rule_row_boxes(
            boxes,
            crop_size,
            label,
            mask=mask,
            side="screenshot" if screenshot else "generated",
        )
    if kind == "vname":
        return crops.filter_vname_row_boxes(boxes, crop_size, label)
    if kind == "title":
        return crops.filter_title_row_boxes(boxes, crop_size, label)
    raise ValueError(f"unsupported kind: {kind}")


def box_delta(generated: tuple[int, int, int, int], reference: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    return tuple(generated[index] - reference[index] for index in range(4))  # type: ignore[return-value]


def vname_metric_delta(
    _label: str,
    _index: int,
    _count: int,
    generated: tuple[int, int, int, int],
    reference: tuple[int, int, int, int],
) -> dict[str, object]:
    delta = box_delta(generated, reference)
    return {
        "mode": "top_left",
        "delta": delta[:2],
        "generated": generated[:2],
        "reference": reference[:2],
    }


def measure_label(label: str, kinds: tuple[str, ...]) -> dict[str, object]:
    result: dict[str, object] = {"label": label}
    for kind in kinds:
        generated = boxes_for(label, kind, screenshot=False)
        reference = boxes_for(label, kind, screenshot=True)
        kind_result: dict[str, object] = {
            "generated_count": len(generated),
            "reference_count": len(reference),
        }
        if len(generated) == len(reference):
            if kind == "vname":
                rows = [
                    vname_metric_delta(label, index, len(generated), gen, ref)
                    for index, (gen, ref) in enumerate(zip(generated, reference))
                ]
            else:
                rows = [
                    {
                        "mode": "box",
                        "delta": box_delta(gen, ref),
                        "generated": gen,
                        "reference": ref,
                    }
                    for gen, ref in zip(generated, reference)
                ]
            max_abs = 0
            for row in rows:
                delta = row["delta"]
                assert isinstance(delta, tuple)
                max_abs = max(max_abs, *(abs(value) for value in delta))
            kind_result["max_abs_delta"] = max_abs
            kind_result["rows"] = rows
        else:
            kind_result["generated"] = generated
            kind_result["reference"] = reference
        result[kind] = kind_result
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("labels", nargs="*", default=DREAM_LABELS)
    parser.add_argument("--kinds", nargs="+", choices=("title", "vname", "rules"), default=("title", "vname", "rules"))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    kinds = tuple(args.kinds)
    results = [measure_label(label, kinds) for label in args.labels]
    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return

    for result in results:
        print(result["label"])
        for kind in kinds:
            data = result[kind]
            assert isinstance(data, dict)
            print(f"  {kind}: {data['generated_count']} vs {data['reference_count']}", end="")
            if "max_abs_delta" in data:
                print(f", max={data['max_abs_delta']}")
                for index, row in enumerate(data["rows"], start=1):
                    print(f"    {index}: {row['mode']} delta={row['delta']}")
            else:
                print(" count mismatch")


if __name__ == "__main__":
    main()
