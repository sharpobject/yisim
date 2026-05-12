#!/usr/bin/env python3
"""Tune English rules text rendering separately for line-count groups."""

from __future__ import annotations

import argparse
import json
import os
import random
from pathlib import Path

import dlib

from align_card_diffs import DEFAULT_OUTPUT_DIR, load_card_reference_rgba, load_saved_transforms, pair_for_label
from tune_rules_layout import (
    candidate_from_vector,
    evaluate,
    search_bounds,
)


GROUP_FILE = (
    DEFAULT_OUTPUT_DIR.parent
    / "line_groups_1star_en.json"
)


def group_key(total_lines: int, explicit_newlines: int) -> str:
    return f"{total_lines}_lines__{explicit_newlines}_explicit_newlines"


def parse_group_key(value: str) -> tuple[int, int]:
    normalized = value.strip()
    if "," in normalized:
        total, explicit = normalized.split(",", 1)
        return int(total), int(explicit)
    parts = normalized.split("_")
    if len(parts) >= 4 and parts[1] == "lines" and parts[3] == "explicit":
        return int(parts[0]), int(parts[2])
    if len(parts) >= 4 and parts[1] == "lines" and parts[3].startswith("explicit"):
        return int(parts[0]), int(parts[2])
    raise argparse.ArgumentTypeError(
        "group must be '<total>,<explicit>' or '<total>_lines__<explicit>_explicit_newlines'"
    )


def load_group_labels(path: Path) -> dict[tuple[int, int], list[str]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    groups: dict[tuple[int, int], list[str]] = {}
    for group in data["groups"]:
        key = (int(group["total_lines"]), int(group["explicit_newlines"]))
        groups[key] = list(group["labels"])
    return groups


def load_excluded_labels(path: Path | None) -> set[str]:
    if path is None:
        return set()
    labels: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("label\t"):
            continue
        labels.add(line.split("\t", 1)[0])
    return labels


def base_card_key(label: str) -> str:
    ref_id, _ = label.split("_", 1)
    if ref_id and ref_id[-1].isdigit():
        return ref_id[:-1]
    return ref_id


def sample_distinct_cards(labels: list[str], count: int, seed: int) -> list[str]:
    by_base: dict[str, list[str]] = {}
    for label in labels:
        by_base.setdefault(base_card_key(label), []).append(label)
    if count > len(by_base):
        raise SystemExit(f"cannot sample {count} distinct cards from only {len(by_base)} base cards")
    rng = random.Random(seed)
    bases = rng.sample(sorted(by_base), count)
    sampled = [rng.choice(sorted(by_base[base])) for base in bases]
    rng.shuffle(sampled)
    return sampled


def label_level(label: str) -> int:
    ref_id, _ = label.split("_", 1)
    if len(ref_id) >= 3 and ref_id[2].isdigit():
        return int(ref_id[2])
    return 99


def sample_distinct_cards_prefer_level1(labels: list[str], count: int, seed: int) -> list[str]:
    by_base: dict[str, list[str]] = {}
    for label in labels:
        by_base.setdefault(base_card_key(label), []).append(label)
    rng = random.Random(seed)
    sample_count = min(count, len(by_base))
    bases = rng.sample(sorted(by_base), sample_count)
    sampled = []
    for base in bases:
        choices = sorted(by_base[base], key=lambda label: (label_level(label) != 1, label))
        sampled.append(choices[0])
    rng.shuffle(sampled)
    return sampled


def bounds_from_arg(value: str) -> tuple[list[float], list[float]] | None:
    if not value:
        return None
    values = [float(part.strip()) for part in value.split(",")]
    if len(values) != 8:
        raise SystemExit("--bounds requires 8 comma-separated floats")
    return values[:4], values[4:]


def tune_group(
    key: tuple[int, int],
    labels: list[str],
    calls: int,
    epsilon: float,
    workers: int,
    lower: list[float],
    upper: list[float],
) -> dict[str, object]:
    saved = load_saved_transforms(DEFAULT_OUTPUT_DIR / "alignment_summary.json")
    transform = saved["l3_en"]
    targets = {}
    for label in labels:
        example, _, parsed = pair_for_label(label)
        targets[parsed] = load_card_reference_rgba(example)

    results: list[dict[str, object]] = []
    cache: dict[tuple[float, ...], float] = {}
    group_name = group_key(*key)

    def objective(*values: float) -> float:
        exact_key = tuple(float(value) for value in values)
        if exact_key in cache:
            return cache[exact_key]
        candidate = candidate_from_vector("en", values)
        result = evaluate(candidate, labels, targets, transform, workers=workers)
        results.append(result)
        score = float(result["score"])
        cache[exact_key] = score
        best = min(results, key=lambda item: item["score"])
        print(
            f"{group_name} {len(results)}: score={score:.1f} pixel={result['pixel']:.0f} "
            f"best={best['score']:.1f} {result['candidate']}",
            flush=True,
        )
        return score

    best_values, best_score = dlib.find_min_global(objective, lower, upper, calls, epsilon)
    best_candidate = candidate_from_vector("en", best_values)
    best_result = evaluate(best_candidate, labels, targets, transform, workers=workers)
    best_result["score"] = min(float(best_result["score"]), float(best_score))
    results.append(best_result)
    results.sort(key=lambda item: item["score"])
    output = {
        "group": {
            "total_lines": key[0],
            "explicit_newlines": key[1],
            "name": group_name,
            "label_count": len(labels),
            "labels": labels,
        },
        "calls": calls,
        "epsilon": epsilon,
        "workers": workers,
        "score_mode": "pixel",
        "best_values": list(best_values),
        "best_candidate": best_candidate.__dict__,
        "results": results[:50],
    }
    out_path = DEFAULT_OUTPUT_DIR / f"rules_tuning_en_{group_name}.json"
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(out_path, flush=True)
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--group-file", type=Path, default=GROUP_FILE)
    parser.add_argument("--exclude-label-file", type=Path, default=None)
    parser.add_argument("--group", action="append", type=parse_group_key, default=[])
    parser.add_argument("--all-groups", action="store_true")
    parser.add_argument("--min-labels", type=int, default=1)
    parser.add_argument("--calls", type=int, default=120)
    parser.add_argument("--epsilon", type=float, default=0.0)
    parser.add_argument("--workers", type=int, default=os.cpu_count() or 1)
    parser.add_argument("--bounds", default="", help="Optional 4-value bounds override shared by all groups")
    parser.add_argument(
        "--sample-distinct-cards",
        type=int,
        default=0,
        help="Randomly tune against this many labels, using at most one rarity per base card",
    )
    parser.add_argument(
        "--sample-distinct-cards-prefer-level1",
        type=int,
        default=0,
        help="Randomly tune against this many base cards, choosing level-1 labels when available",
    )
    parser.add_argument("--seed", type=int, default=20260507)
    args = parser.parse_args()

    groups = load_group_labels(args.group_file)
    excluded_labels = load_excluded_labels(args.exclude_label_file)
    if args.all_groups:
        selected = sorted(groups)
    else:
        selected = args.group
    if not selected:
        raise SystemExit("pass --all-groups or one or more --group values")

    bounds = bounds_from_arg(args.bounds)
    if bounds is None:
        lower, upper = search_bounds("en")
    else:
        lower, upper = bounds

    summary = []
    for key in selected:
        labels = groups.get(key)
        if labels is None:
            raise SystemExit(f"group not found: {key}")
        if excluded_labels:
            before = len(labels)
            labels = [label for label in labels if label not in excluded_labels]
            print(f"excluded {before - len(labels)} labels for {group_key(*key)}", flush=True)
        if args.sample_distinct_cards:
            labels = sample_distinct_cards(labels, args.sample_distinct_cards, args.seed)
            print(f"sampled {len(labels)} labels for {group_key(*key)}: {' '.join(labels)}", flush=True)
        if args.sample_distinct_cards_prefer_level1:
            labels = sample_distinct_cards_prefer_level1(labels, args.sample_distinct_cards_prefer_level1, args.seed)
            print(f"sampled {len(labels)} labels for {group_key(*key)} preferring level 1: {' '.join(labels)}", flush=True)
        if len(labels) < args.min_labels:
            print(f"skipping {group_key(*key)}: {len(labels)} labels < --min-labels {args.min_labels}", flush=True)
            continue
        result = tune_group(key, labels, args.calls, args.epsilon, args.workers, lower, upper)
        summary.append(
            {
                "group": result["group"],
                "best_values": result["best_values"],
                "best_candidate": result["best_candidate"],
                "best_score": result["results"][0]["score"],
            }
        )

    summary_path = DEFAULT_OUTPUT_DIR / "rules_tuning_en_by_line_group_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(summary_path)


if __name__ == "__main__":
    main()
