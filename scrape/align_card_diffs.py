#!/usr/bin/env python3
"""Render high-res generated cards, downscale to masked screenshots, and diff."""

from __future__ import annotations

import argparse
import json
import math
from io import BytesIO
from functools import lru_cache
from dataclasses import asdict, dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageCms, ImageDraw, ImageFilter, ImageOps, ImageStat

from render_rule_sky_sword_formation import (
    CARD_OUTPUT_BLEED_X_UI,
    CARD_LEVELS,
    DREAM_CARD_LEVELS,
    DREAM_LOCALES,
    LOCALES,
    magic_kernel_sharp_resize,
    magic_kernel_sharp_resample_translate,
    render_card,
    render_card_for_label,
    render_dream_card,
)
from png_io import save_png


VERSION = "001.0006.0014"
ROOT = Path(__file__).resolve().parent
RENDER_ROOT = ROOT / "extracted_assets" / VERSION / "rendered_cards" / "rule_sky_sword_formation"
EXAMPLE_ROOT = ROOT / "rssf_examples"
DEFAULT_OUTPUT_DIR = RENDER_ROOT / "diffs"
ART_REGION = (0.20, 0.10, 0.91, 0.60)
DISPLAY_PROFILE_PATH = ROOT / "color_profiles" / "display_from_screenshot.icc"
CARD_REFERENCE_OFFSET_X = 1


@dataclass(frozen=True)
class Transform:
    scale: float
    dx: float
    dy: float
    score: float


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


@lru_cache(maxsize=1)
def display_profile() -> ImageCms.ImageCmsProfile | None:
    if not DISPLAY_PROFILE_PATH.exists():
        return None
    return ImageCms.ImageCmsProfile(str(DISPLAY_PROFILE_PATH))


@lru_cache(maxsize=1)
def srgb_profile() -> ImageCms.ImageCmsProfile:
    return ImageCms.createProfile("sRGB")


def load_reference_rgba(path: Path) -> Image.Image:
    """Load a screenshot/reference image into sRGB RGBA for comparison.

    Old masked card references were exported without their macOS display ICC
    profile.  When that happens under rssf_examples/orig_*, interpret their
    RGB values using the extracted display profile before converting to sRGB.
    New untouched screenshots with an embedded profile use their own profile.
    """
    image = Image.open(path)
    icc = image.info.get("icc_profile")
    source_profile = ImageCms.ImageCmsProfile(BytesIO(icc)) if icc else None
    if source_profile is None and EXAMPLE_ROOT in path.resolve().parents:
        source_profile = display_profile()
    if source_profile is None:
        return image.convert("RGBA")
    return ImageCms.profileToProfile(
        image.convert("RGBA"),
        source_profile,
        srgb_profile(),
        outputMode="RGBA",
    )


def pad_card_reference_for_output(image: Image.Image) -> Image.Image:
    bleed_x = max(0, round(CARD_OUTPUT_BLEED_X_UI))
    if bleed_x == 0 and CARD_REFERENCE_OFFSET_X == 0:
        return image
    padded = Image.new("RGBA", (image.width + bleed_x * 2, image.height), (0, 0, 0, 0))
    padded.alpha_composite(image, (bleed_x + CARD_REFERENCE_OFFSET_X, 0))
    return padded


def load_card_reference_rgba(path: Path) -> Image.Image:
    return pad_card_reference_for_output(load_reference_rgba(path))


def alpha_mask(image: Image.Image, threshold: int = 16) -> Image.Image:
    return image.getchannel("A").point(lambda v: 255 if v >= threshold else 0)


def transform_source(source: Image.Image, target_size: tuple[int, int], scale: float, dx: float, dy: float) -> Image.Image:
    return magic_kernel_sharp_resample_translate(source, target_size, scale, scale, dx, dy)


def transform_mask(source: Image.Image, target_size: tuple[int, int], scale: float, dx: int, dy: int) -> Image.Image:
    resized_size = (max(1, round(source.width * scale)), max(1, round(source.height * scale)))
    resized = source.resize(resized_size, Image.Resampling.NEAREST)
    canvas = Image.new("L", target_size, 0)
    canvas.paste(resized, (dx, dy))
    return canvas


def mask_bbox_size(image: Image.Image) -> tuple[int, int, int, int]:
    return alpha_mask(image).getbbox() or (0, 0, image.width, image.height)


def mask_score(aligned: Image.Image, target: Image.Image) -> float:
    aligned_mask = alpha_mask(aligned)
    target_mask = alpha_mask(target)
    diff = ImageChops.difference(aligned_mask, target_mask)
    return ImageStat.Stat(diff).mean[0]


def expected_dream_dot_count(label: str | None) -> int | None:
    if not label or not label.startswith("D1113"):
        return None
    try:
        return int(label[5])
    except (IndexError, ValueError):
        return None


def colored_dot_centers(image: Image.Image, expected_count: int | None = None) -> list[tuple[float, float]]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    candidates: set[tuple[int, int]] = set()
    for y in range(round(height * 0.90), height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            is_gold = r >= 160 and g >= 125 and b >= 35 and r >= g >= b
            is_pale_gold = r >= 200 and g >= 175 and b >= 100 and r >= g
            is_bright_colored = max(r, g, b) >= 135 and min(r, g, b) >= 60 and max(r, g, b) - min(r, g, b) >= 25
            if a >= 80 and (is_gold or is_pale_gold or is_bright_colored):
                candidates.add((x, y))

    seen: set[tuple[int, int]] = set()
    centers: list[tuple[float, float]] = []
    for point in list(candidates):
        if point in seen:
            continue
        stack = [point]
        seen.add(point)
        xs: list[int] = []
        ys: list[int] = []
        while stack:
            x, y = stack.pop()
            xs.append(x)
            ys.append(y)
            for nx in (x - 1, x, x + 1):
                for ny in (y - 1, y, y + 1):
                    neighbor = (nx, ny)
                    if neighbor in candidates and neighbor not in seen:
                        seen.add(neighbor)
                        stack.append(neighbor)
        bbox_w = max(xs) - min(xs) + 1
        bbox_h = max(ys) - min(ys) + 1
        center_y = sum(ys) / len(ys)
        if 8 <= len(xs) <= 300 and 3 <= bbox_w <= 40 and 3 <= bbox_h <= 18 and center_y >= height * 0.945:
            centers.append((sum(xs) / len(xs), center_y))

    count = expected_count or 5

    def valid_dot_run(run: list[tuple[float, float]]) -> bool:
        if len(run) != count:
            return False
        if len(run) == 1:
            return True
        gaps = [run[i + 1][0] - run[i][0] for i in range(len(run) - 1)]
        mean_gap = sum(gaps) / len(gaps)
        y_spread = max(point[1] for point in run) - min(point[1] for point in run)
        return (
            width * 0.055 <= mean_gap <= width * 0.105
            and max(gaps) - min(gaps) <= width * 0.035
            and y_spread <= height * 0.015
        )

    centers = sorted(centers, key=lambda p: p[0])
    if len(centers) <= count:
        return centers if valid_dot_run(centers) else []
    # Use the five-dot run whose spacing matches the card level dots.  Gold
    # dream frames have lots of small gold trim near the bottom, so simply
    # taking the tightest run can accidentally align against decoration.
    best = centers[:count]
    best_score = float("inf")
    for index in range(0, len(centers) - count + 1):
        run = centers[index : index + count]
        if len(run) == 1:
            score = abs(run[0][0] - width * 0.5)
            if score < best_score:
                best = run
                best_score = score
            continue
        gaps = [run[i + 1][0] - run[i][0] for i in range(len(run) - 1)]
        mean_gap = sum(gaps) / len(gaps)
        expected_gap = width * 0.081
        y_spread = max(point[1] for point in run) - min(point[1] for point in run)
        score = (max(gaps) - min(gaps)) + abs(mean_gap - expected_gap) * 0.8 + y_spread * 0.5
        if score < best_score:
            best = run
            best_score = score
    return best if valid_dot_run(best) else []


def yellow_dot_centers(image: Image.Image) -> list[tuple[float, float]]:
    return colored_dot_centers(image, expected_count=5)


def dot_seed_transform(source: Image.Image, target: Image.Image, label: str | None = None) -> Transform | None:
    expected_count = expected_dream_dot_count(label)
    source_dots = colored_dot_centers(source, expected_count)
    target_dots = colored_dot_centers(target, expected_count)
    if len(source_dots) < 2 or len(target_dots) < 2:
        return None
    source_spacing = (source_dots[-1][0] - source_dots[0][0]) / 4.0
    target_spacing = (target_dots[-1][0] - target_dots[0][0]) / 4.0
    if source_spacing <= 0:
        return None
    scale = target_spacing / source_spacing
    if not 0.5 <= scale <= 2.0:
        return None
    dx = round(sum(t[0] - s[0] * scale for s, t in zip(source_dots, target_dots)) / 5.0)
    dy = round(sum(t[1] - s[1] * scale for s, t in zip(source_dots, target_dots)) / 5.0)
    return Transform(scale=scale, dx=dx, dy=dy, score=0.0)


def frame_feature_mask(image: Image.Image) -> Image.Image:
    """Stable frame-only features for alignment: rules panel edges and dots.

    Text/art content and the clipped outer screenshot border are deliberately
    ignored.  The five bottom yellow dots provide the strongest anchor; the top
    and side edges of the rules text parchment validate the scale and y offset.
    """

    rgb = premultiplied_rgb_on_bg(image, (0, 0, 0))
    gray = ImageOps.grayscale(rgb)
    edges = gray.filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v >= 42 else 0)
    width, height = image.size
    region = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(region)
    draw.rectangle(
        (
            round(width * 0.05),
            round(height * 0.55),
            round(width * 0.95),
            round(height * 0.99),
        ),
        fill=255,
    )
    edges = ImageChops.multiply(edges, region)

    dot_mask = Image.new("L", image.size, 0)
    dot_draw = ImageDraw.Draw(dot_mask)
    for x, y in yellow_dot_centers(image):
        dot_draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=255)
    return ImageChops.lighter(edges, dot_mask)


def region_edge_mask(
    image: Image.Image,
    region_fracs: tuple[float, float, float, float],
    threshold: int = 42,
) -> Image.Image:
    rgb = premultiplied_rgb_on_bg(image, (0, 0, 0))
    gray = ImageOps.grayscale(rgb)
    edges = gray.filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v >= threshold else 0)
    width, height = image.size
    region = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(region)
    draw.rectangle(
        (
            round(width * region_fracs[0]),
            round(height * region_fracs[1]),
            round(width * region_fracs[2]),
            round(height * region_fracs[3]),
        ),
        fill=255,
    )
    return ImageChops.multiply(edges, region)


def weighted_region_diff_score(
    source_mask: Image.Image,
    target_mask: Image.Image,
    scale: float,
    dx: int,
    dy: int,
) -> float:
    aligned = transform_mask(source_mask, target_mask.size, scale, dx, dy)
    diff = ImageChops.difference(aligned, target_mask)
    # Mean intensity is exactly the "total red in this crop" optimization target
    # normalized by crop area.
    return ImageStat.Stat(diff).mean[0]


def crop_mean_intensity(image: Image.Image, region_fracs: tuple[float, float, float, float]) -> float:
    width, height = image.size
    crop = image.crop(
        (
            round(width * region_fracs[0]),
            round(height * region_fracs[1]),
            round(width * region_fracs[2]),
            round(height * region_fracs[3]),
        )
    )
    return ImageStat.Stat(crop).mean[0]


def dot_residual_score(
    source_dots: list[tuple[float, float]],
    target_dots: list[tuple[float, float]],
    scale: float,
    dx: int,
    dy: int,
) -> float:
    if len(source_dots) < 5 or len(target_dots) < 5:
        return 0.0
    residuals = []
    for source, target in zip(source_dots, target_dots):
        tx = source[0] * scale + dx
        ty = source[1] * scale + dy
        residuals.append(((tx - target[0]) ** 2 + (ty - target[1]) ** 2) ** 0.5)
    return sum(residuals) / len(residuals)


def frame_feature_score(source_mask: Image.Image, target_mask: Image.Image, scale: float, dx: int, dy: int) -> float:
    aligned = transform_mask(source_mask, target_mask.size, scale, dx, dy)
    diff = ImageChops.difference(aligned, target_mask)
    # Mean over full image keeps the score comparable while the mask itself is
    # restricted to stable frame features.
    return ImageStat.Stat(diff).mean[0]


def structural_region_score(
    source: Image.Image,
    target: Image.Image,
    scale: float,
    dx: int,
    dy: int,
    region_fracs: tuple[float, float, float, float],
) -> float:
    aligned = transform_source(source, target.size, scale, dx, dy)
    return crop_mean_intensity(bug_diff(aligned, target).getchannel("R"), region_fracs)


def initial_transform_from_alpha(source: Image.Image, target: Image.Image) -> tuple[float, int, int]:
    source_bbox = mask_bbox_size(source)
    target_bbox = mask_bbox_size(target)
    source_w = source_bbox[2] - source_bbox[0]
    source_h = source_bbox[3] - source_bbox[1]
    target_w = target_bbox[2] - target_bbox[0]
    target_h = target_bbox[3] - target_bbox[1]
    base_scale = ((target_w / source_w) + (target_h / source_h)) / 2
    base_dx = round(target_bbox[0] - source_bbox[0] * base_scale)
    base_dy = round(target_bbox[1] - source_bbox[1] * base_scale)
    return base_scale, base_dx, base_dy


def dlib_art_search_transform_many(
    source_targets: list[tuple[Image.Image, Image.Image]],
    label: str,
    max_calls: int,
) -> Transform:
    import dlib

    if not source_targets:
        raise ValueError(f"No source/target pairs for {label}")

    base_scale, base_dx, base_dy = initial_transform_from_alpha(*source_targets[0])

    call_count = 0

    def objective(scale: float, dx_float: float, dy_float: float) -> float:
        nonlocal call_count
        call_count += 1
        if not math.isfinite(scale):
            return 1e9
        dx = round(dx_float)
        dy = round(dy_float)
        return sum(
            structural_region_score(source, target, scale, dx, dy, ART_REGION)
            for source, target in source_targets
        ) / len(source_targets)

    lower = [base_scale * 0.965, base_dx - 20.0, base_dy - 20.0]
    upper = [base_scale * 1.035, base_dx + 20.0, base_dy + 20.0]
    result, score = dlib.find_min_global(
        objective,
        lower,
        upper,
        [False, False, False],
        max_calls,
    )
    scale, dx_float, dy_float = result
    return Transform(scale=float(scale), dx=round(dx_float), dy=round(dy_float), score=float(score))


def dlib_art_search_transform(source: Image.Image, target: Image.Image, label: str, max_calls: int) -> Transform:
    return dlib_art_search_transform_many([(source, target)], label, max_calls)


def transformed_dot_residuals(source: Image.Image, target: Image.Image, transform: Transform) -> list[float]:
    source_dots = yellow_dot_centers(source)
    target_dots = yellow_dot_centers(target)
    if len(source_dots) < 5 or len(target_dots) < 5:
        return []
    return [
        ((source[0] * transform.scale + transform.dx - target[0]) ** 2 + (source[1] * transform.scale + transform.dy - target[1]) ** 2) ** 0.5
        for source, target in zip(source_dots, target_dots)
    ]


def search_transform(source: Image.Image, target: Image.Image, label: str | None = None, dlib_calls: int = 1000) -> Transform:
    if label and (label.startswith("D") or label.startswith("l")):
        return dlib_art_search_transform(source, target, label, dlib_calls)

    best = Transform(scale=1.0, dx=0, dy=0, score=float("inf"))
    source_features = frame_feature_mask(source)
    target_features = frame_feature_mask(target)
    expected_count = expected_dream_dot_count(label)
    source_dots = colored_dot_centers(source, expected_count)
    target_dots = colored_dot_centers(target, expected_count)
    source_ornament = region_edge_mask(source, (0.02, 0.43, 0.28, 0.66), threshold=34)
    target_ornament = region_edge_mask(target, (0.02, 0.43, 0.28, 0.66), threshold=34)
    source_art = region_edge_mask(source, (0.21, 0.09, 0.91, 0.61), threshold=34)
    target_art = region_edge_mask(target, (0.21, 0.09, 0.91, 0.61), threshold=34)

    def evaluate(scales: list[float], dxs: range, dys: range) -> Transform:
        nonlocal best
        for scale in scales:
            for dx in dxs:
                for dy in dys:
                    dot_score = dot_residual_score(source_dots, target_dots, scale, dx, dy)
                    edge_score = frame_feature_score(source_features, target_features, scale, dx, dy)
                    ornament_score = weighted_region_diff_score(source_ornament, target_ornament, scale, dx, dy)
                    art_score = weighted_region_diff_score(source_art, target_art, scale, dx, dy)
                    score = dot_score * 16.0 + edge_score * 0.06 + ornament_score * 0.32 + art_score * 0.12
                    if score < best.score:
                        best = Transform(scale=scale, dx=dx, dy=dy, score=score)
        return best

    seed = dot_seed_transform(source, target, label)
    if seed is None:
        source_bbox = mask_bbox_size(source)
        target_bbox = mask_bbox_size(target)
        source_w = source_bbox[2] - source_bbox[0]
        source_h = source_bbox[3] - source_bbox[1]
        target_w = target_bbox[2] - target_bbox[0]
        target_h = target_bbox[3] - target_bbox[1]
        base_scale = ((target_w / source_w) + (target_h / source_h)) / 2
        base_dx = round(target_bbox[0] - source_bbox[0] * base_scale)
        base_dy = round(target_bbox[1] - source_bbox[1] * base_scale)
    else:
        base_scale = seed.scale
        base_dx = seed.dx
        base_dy = seed.dy

    # Coarse pass around the dot-derived uniform transform, then a tight pass.
    evaluate(
        [round(base_scale * 0.985 + i * base_scale * 0.003, 6) for i in range(11)],
        range(base_dx - 12, base_dx + 13, 2),
        range(base_dy - 12, base_dy + 13, 2),
    )
    center = best
    evaluate(
        [round(center.scale - base_scale * 0.002 + i * base_scale * 0.0005, 6) for i in range(9)],
        range(center.dx - 3, center.dx + 4),
        range(center.dy - 3, center.dy + 4),
    )
    return best


def premultiplied_rgb_on_bg(image: Image.Image, bg: tuple[int, int, int] = (0, 0, 0)) -> Image.Image:
    background = Image.new("RGBA", image.size, (*bg, 255))
    background.alpha_composite(image)
    return background.convert("RGB")


def structural_image(image: Image.Image) -> Image.Image:
    # Color/saturation differences are intentionally deemphasized here.  The
    # output is mostly text/layout/art geometry: luma edges inside opaque pixels.
    opaque = image.getchannel("A").point(lambda v: 255 if v >= 220 else 0)
    gray = ImageOps.grayscale(premultiplied_rgb_on_bg(image, (235, 235, 235)))
    gray = ImageOps.autocontrast(gray)
    edges = gray.filter(ImageFilter.FIND_EDGES)
    return Image.composite(edges, Image.new("L", image.size, 0), opaque)


def bug_diff(aligned: Image.Image, target: Image.Image) -> Image.Image:
    source_struct = structural_image(aligned)
    target_struct = structural_image(target)
    struct_diff = ImageChops.difference(source_struct, target_struct)
    struct_diff = struct_diff.point(lambda v: 0 if v < 26 else min(255, v * 3))

    alpha_diff = ImageChops.difference(alpha_mask(aligned, 220), alpha_mask(target, 220))
    alpha_diff = alpha_diff.point(lambda v: 0 if v < 128 else 180)

    result = Image.new("RGBA", target.size, (0, 0, 0, 0))
    red = Image.new("RGBA", target.size, (255, 35, 25, 0))
    red.putalpha(struct_diff)
    result.alpha_composite(red)
    blue = Image.new("RGBA", target.size, (50, 120, 255, 0))
    blue.putalpha(alpha_diff)
    result.alpha_composite(blue)
    return result


def side_by_side(generated: Image.Image, target: Image.Image, diff: Image.Image, label: str) -> Image.Image:
    pad = 10
    header = 24
    cell_w, cell_h = target.size
    out = Image.new("RGBA", (cell_w * 3 + pad * 4, cell_h + header + pad * 2), (28, 28, 28, 255))
    draw = ImageDraw.Draw(out)
    items = [("generated downscaled", generated), ("provided mask", target), ("structural diff", diff)]
    x = pad
    for title, image in items:
        draw.text((x, pad), f"{label}: {title}", fill=(245, 245, 245))
        out.alpha_composite(image, (x, header + pad))
        x += cell_w + pad
    return out


@lru_cache(maxsize=None)
def generated_card_for_label(label: str, render_scale: float) -> Image.Image:
    try:
        return render_card_for_label(label, render_scale=render_scale)
    except (KeyError, StopIteration, ValueError):
        pass
    if label.startswith("D"):
        ref_id, locale_suffix = label.split("_", 1)
        level = next(card_level for card_level in DREAM_CARD_LEVELS if card_level.ref_id == ref_id)
        locale = next(locale_text for locale_text in DREAM_LOCALES if locale_text.suffix == locale_suffix)
        return render_dream_card(level, locale, render_scale=render_scale)
    level_text, locale_suffix = label.split("_", 1)
    level_num = int(level_text.removeprefix("l"))
    level = next(card_level for card_level in CARD_LEVELS if card_level.level == level_num)
    locale = next(locale_text for locale_text in LOCALES if locale_text.suffix == locale_suffix)
    return render_card(level, locale, render_scale=render_scale)


def load_saved_transforms(summary_path: Path) -> dict[str, Transform]:
    if not summary_path.exists():
        return {}
    try:
        items = json.loads(summary_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    transforms: dict[str, Transform] = {}
    for item in items:
        try:
            raw = item["transform"]
            transforms[item["label"]] = Transform(
                scale=float(raw["scale"]),
                dx=float(raw["dx"]),
                dy=float(raw["dy"]),
                score=float(raw.get("score", 0.0)),
            )
        except (KeyError, TypeError, ValueError):
            continue
    return transforms


def load_existing_results(summary_path: Path) -> list[dict[str, object]]:
    if not summary_path.exists():
        return []
    try:
        data = json.loads(summary_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return [item for item in data if isinstance(item, dict) and isinstance(item.get("label"), str)]


def search_source_for_pair(generated: Path, label: str) -> Image.Image:
    return load_rgba(generated) if generated.exists() else generated_card_for_label(label, 1.0)


def grouped_normal_level_transforms(
    pairs: list[tuple[Path, Path, str]],
    dlib_calls: int,
) -> dict[str, Transform]:
    transforms: dict[str, Transform] = {}
    for level in [1, 2, 3]:
        level_pairs = [
            (example, generated, label)
            for example, generated, label in pairs
            if label.startswith(f"l{level}_")
        ]
        if not level_pairs:
            continue
        source_targets = [
            (search_source_for_pair(generated, label), load_card_reference_rgba(example))
            for example, generated, label in level_pairs
        ]
        transform = dlib_art_search_transform_many(source_targets, f"l{level}", dlib_calls)
        for _, _, label in level_pairs:
            transforms[label] = transform
    return transforms


def compare_pair(
    example: Path,
    generated: Path,
    output_dir: Path,
    label: str,
    render_scale: float,
    dlib_calls: int,
    saved_transform: Transform | None = None,
) -> dict[str, object]:
    target = load_card_reference_rgba(example)
    # Find placement at normal screenshot size, then apply the same transform to
    # a 2x render and downsample only after placement.  This keeps font
    # rasterization smoother while leaving the provided screenshot untouched.
    search_source = load_rgba(generated) if generated.exists() else generated_card_for_label(label, 1.0)
    if saved_transform is None:
        transform = search_transform(search_source, target, label, dlib_calls)
    else:
        transform = saved_transform
    residuals = transformed_dot_residuals(search_source, target, transform)
    source_hi = generated_card_for_label(label, render_scale)
    target_hi_size = (round(target.width * render_scale), round(target.height * render_scale))
    generated_hi = transform_source(
        source_hi,
        target_hi_size,
        transform.scale,
        transform.dx * render_scale,
        transform.dy * render_scale,
    )
    generated_downscaled = magic_kernel_sharp_resize(generated_hi, target.size)
    diff = bug_diff(generated_downscaled, target)
    panel = side_by_side(generated_downscaled, target, diff, label)

    output_dir.mkdir(parents=True, exist_ok=True)
    aligned_path = output_dir / f"{label}_generated_downscaled.png"
    diff_path = output_dir / f"{label}_structural_diff.png"
    panel_path = output_dir / f"{label}_compare.png"
    save_png(generated_downscaled, aligned_path)
    save_png(diff, diff_path)
    save_png(panel, panel_path)

    return {
        "label": label,
        "example": str(example.relative_to(ROOT)),
        "generated": str(generated.relative_to(ROOT)),
        "render_scale": render_scale,
        "transform": asdict(transform),
        "dot_residual_px": residuals,
        "outputs": {
            "generated_downscaled": str(aligned_path.relative_to(ROOT)),
            "diff": str(diff_path.relative_to(ROOT)),
            "compare": str(panel_path.relative_to(ROOT)),
        },
    }


def default_pairs() -> list[tuple[Path, Path, str]]:
    return [
        (
            EXAMPLE_ROOT / "orig_en" / "115061.png",
            RENDER_ROOT / "rule_sky_sword_formation_l1_en.png",
            "l1_en",
        )
    ]


def pair_for_label(label: str) -> tuple[Path, Path, str]:
    ref_id, locale = label.split("_", 1)
    example = EXAMPLE_ROOT / f"orig_{locale}" / f"{ref_id}.png"
    if ref_id.startswith("D"):
        generated = RENDER_ROOT / f"{ref_id}_{locale}.png"
    elif ref_id.startswith("l"):
        generated = RENDER_ROOT / f"rule_sky_sword_formation_{ref_id}_{locale}.png"
    else:
        generated = RENDER_ROOT / f"{ref_id}_{locale}.png"
    if not example.exists():
        raise FileNotFoundError(f"No reference screenshot for {label}: {example}")
    return (example, generated, label)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--example", type=Path)
    parser.add_argument("--generated", type=Path)
    parser.add_argument("--label", default=None, help="single card label such as 115061_en or D11131_zh")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--render-scale", type=float, default=2.0)
    parser.add_argument("--all", action="store_true", help="compare all available zh/en lv1-lv3 screenshots")
    parser.add_argument("--dream", action="store_true", help="compare all available zh/en dream card screenshots")
    parser.add_argument("--search-transforms", action="store_true", help="ignore saved transforms and run alignment search")
    parser.add_argument("--dlib-calls", type=int, default=1000, help="maximum dlib.find_min_global calls for each dream-card transform")
    args = parser.parse_args()

    if args.all or args.dream:
        pairs: list[tuple[Path, Path, str]] = []
        if args.all:
            for level, capture_id in [(1, "115061"), (2, "115062"), (3, "115063")]:
                for locale in ["zh", "en"]:
                    pairs.append(
                        (
                            EXAMPLE_ROOT / f"orig_{locale}" / f"{capture_id}.png",
                            RENDER_ROOT / f"rule_sky_sword_formation_l{level}_{locale}.png",
                            f"l{level}_{locale}",
                        )
                    )
        if args.dream:
            for ref_id in ["D11131", "D11132", "D11133", "D11134", "D11135"]:
                for locale in ["zh", "en"]:
                    pairs.append(
                        (
                            EXAMPLE_ROOT / f"orig_{locale}" / f"{ref_id}.png",
                            RENDER_ROOT / f"{ref_id}_{locale}.png",
                            f"{ref_id}_{locale}",
                        )
                    )
    elif args.example and args.generated:
        pairs = [(args.example, args.generated, args.label or "custom")]
    elif args.label:
        pairs = [pair_for_label(args.label)]
    else:
        pairs = default_pairs()

    summary_path = args.output_dir / "alignment_summary.json"
    saved_transforms = {} if args.search_transforms else load_saved_transforms(summary_path)
    if args.search_transforms and args.all:
        saved_transforms.update(grouped_normal_level_transforms(pairs, args.dlib_calls))
    results = [
        compare_pair(
            example,
            generated,
            args.output_dir,
            label,
            args.render_scale,
            args.dlib_calls,
            saved_transform=saved_transforms.get(label),
        )
        for example, generated, label in pairs
    ]
    merged_results = {item["label"]: item for item in load_existing_results(summary_path)}
    merged_results.update({item["label"]: item for item in results})
    results_to_write = list(merged_results.values())
    summary_path.write_text(json.dumps(results_to_write, indent=2), encoding="utf-8")
    print(summary_path.relative_to(ROOT))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
