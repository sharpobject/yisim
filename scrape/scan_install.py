#!/usr/bin/env python3
import argparse
import os
import re
from pathlib import Path


TEXT_EXTENSIONS = {
    ".json",
    ".txt",
    ".xml",
    ".bytes",
    ".dat",
    ".config",
    ".cfg",
    ".ini",
    ".log",
    ".js",
    ".cs",
}

PATTERNS = {
    "urls": re.compile(rb"https?://[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+"),
    "auth": re.compile(rb"(?i).{0,80}(auth|login|token|jwt|steam).{0,120}"),
    "xxtea": re.compile(rb"(?i).{0,80}(xxtea|encrypt|decrypt).{0,120}"),
    "version": re.compile(rb"(?i).{0,80}(version|bundleVersion|app_version).{0,120}"),
}


def should_scan(path: Path, max_size: int) -> bool:
    if path.stat().st_size > max_size:
        return False
    if path.suffix in TEXT_EXTENSIONS:
        return True
    return path.name.lower() in {"globalgamemanagers", "main", "data.unity3d"}


def printable(value: bytes) -> str:
    return value.decode("utf-8", errors="ignore").replace("\x00", "")


def scan(root: Path, max_size: int) -> None:
    seen = set()
    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            path = Path(dirpath) / filename
            try:
                if not should_scan(path, max_size):
                    continue
                data = path.read_bytes()
            except OSError:
                continue

            rel = path.relative_to(root)
            for label, pattern in PATTERNS.items():
                for match in pattern.finditer(data):
                    text = printable(match.group(0)).strip()
                    key = (label, text)
                    if not text or key in seen:
                        continue
                    seen.add(key)
                    print(f"[{label}] {rel}: {text}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("install_path", type=Path)
    parser.add_argument("--max-size", type=int, default=25 * 1024 * 1024)
    args = parser.parse_args()

    if not args.install_path.exists():
        parser.error(f"install path does not exist: {args.install_path}")

    scan(args.install_path, args.max_size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

