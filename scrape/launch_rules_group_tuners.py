#!/usr/bin/env python3
"""Launch one English rules-text tuner process per line-count group."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from align_card_diffs import DEFAULT_OUTPUT_DIR
from tune_rules_by_line_group import group_key, load_group_labels


DEFAULT_GROUP_FILE = DEFAULT_OUTPUT_DIR.parent / "line_groups_1star_en.json"
DEFAULT_EXCLUDE_FILE = Path(__file__).resolve().parent / "dlib_optimization_exclude_labels.tsv"
DEFAULT_LOG_DIR = DEFAULT_OUTPUT_DIR / "tuning_logs"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--group-file", type=Path, default=DEFAULT_GROUP_FILE)
    parser.add_argument("--exclude-label-file", type=Path, default=DEFAULT_EXCLUDE_FILE)
    parser.add_argument("--calls", type=int, default=2000)
    parser.add_argument("--workers-per-group", type=int, default=2)
    parser.add_argument("--sample-distinct-cards-prefer-level1", type=int, default=15)
    parser.add_argument("--seed", type=int, default=20260507)
    parser.add_argument("--log-dir", type=Path, default=DEFAULT_LOG_DIR)
    args = parser.parse_args()

    groups = sorted(load_group_labels(args.group_file))
    args.log_dir.mkdir(parents=True, exist_ok=True)
    children: list[tuple[str, Path, subprocess.Popen[object]]] = []
    for group in groups:
        name = group_key(*group)
        log_path = args.log_dir / f"rules_tuning_en_{name}.log"
        log_file = log_path.open("w", encoding="utf-8")
        cmd = [
            sys.executable,
            str(Path(__file__).resolve().parent / "tune_rules_by_line_group.py"),
            "--group",
            f"{group[0]},{group[1]}",
            "--calls",
            str(args.calls),
            "--workers",
            str(args.workers_per_group),
            "--exclude-label-file",
            str(args.exclude_label_file),
            "--sample-distinct-cards-prefer-level1",
            str(args.sample_distinct_cards_prefer_level1),
            "--seed",
            str(args.seed),
        ]
        process = subprocess.Popen(
            cmd,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            text=True,
        )
        log_file.close()
        children.append((name, log_path, process))
        print(f"started {name} pid={process.pid} log={log_path}", flush=True)

    failures = 0
    for name, log_path, process in children:
        code = process.wait()
        if code:
            failures += 1
            print(f"FAILED {name} code={code} log={log_path}", flush=True)
        else:
            print(f"done {name} log={log_path}", flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
