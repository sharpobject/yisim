"""PNG output helpers shared by card rendering/debug scripts."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


def save_png(
    image: Image.Image,
    path: Path,
    *,
    optimize: bool = True,
    compress_level: int = 9,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=optimize, compress_level=compress_level)
