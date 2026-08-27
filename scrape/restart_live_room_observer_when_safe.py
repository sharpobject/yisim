#!/usr/bin/env python3
"""Restart the legacy observer after two safe, fresh status snapshots."""

from __future__ import annotations

import argparse
import json
import subprocess
import time
from pathlib import Path
from typing import Any


LIN_XIAOYUE_ID = 1_000_004
HIGH_RATING_THRESHOLD = 6000


def blockers(status: dict[str, Any]) -> list[dict[str, Any]]:
    result = []
    for active in status.get("active") or []:
        for accepted in active.get("observedTargets") or []:
            target = accepted.get("target") or {}
            if (
                int(target.get("charId") or 0) == LIN_XIAOYUE_ID
                and int(target.get("actualModeScore") or 0) >= HIGH_RATING_THRESHOLD
            ):
                result.append(
                    {
                        "roomId": active.get("roomId"),
                        "uid": target.get("uid"),
                        "username": target.get("username"),
                        "rating": target.get("actualModeScore"),
                    }
                )
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--status-file",
        type=Path,
        default=Path("data/live-observer/status.json"),
    )
    parser.add_argument("--unit", default="yisim-live-room-observer.service")
    parser.add_argument("--poll-seconds", type=float, default=2.0)
    parser.add_argument("--maximum-status-age-seconds", type=float, default=15.0)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    previous_safe_update = None
    previous_report = None
    while True:
        try:
            age = time.time() - args.status_file.stat().st_mtime
            status = json.loads(args.status_file.read_text(encoding="utf-8"))
            current_blockers = blockers(status)
            report = json.dumps(current_blockers, ensure_ascii=False, sort_keys=True)
            if report != previous_report:
                print(f"safe-restart blockers={report} statusAge={age:.1f}s", flush=True)
                previous_report = report
            update = status.get("updatedAt")
            if age <= args.maximum_status_age_seconds and not current_blockers:
                if previous_safe_update is not None and update != previous_safe_update:
                    print(f"safe-restart restarting {args.unit}", flush=True)
                    subprocess.run(["systemctl", "--user", "restart", args.unit], check=True)
                    return
                previous_safe_update = update
            else:
                previous_safe_update = None
        except (OSError, TypeError, ValueError, json.JSONDecodeError) as exc:
            report = f"{type(exc).__name__}: {exc}"
            if report != previous_report:
                print(f"safe-restart waiting for status: {report}", flush=True)
                previous_report = report
            previous_safe_update = None
        time.sleep(args.poll_seconds)


if __name__ == "__main__":
    main()
