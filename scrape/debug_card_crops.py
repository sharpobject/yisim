#!/usr/bin/env python3
"""Write enlarged side-by-side crops for inspecting card renderer mismatches."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from collections import deque

from PIL import Image, ImageDraw

import render_rule_sky_sword_formation as renderer
from align_card_diffs import load_card_reference_rgba
from png_io import save_png


VERSION = "001.0006.0014"
ROOT = Path(__file__).resolve().parent
DIFF_ROOT = ROOT / "extracted_assets" / VERSION / "rendered_cards" / "rule_sky_sword_formation" / "diffs"
EXAMPLE_ROOT = ROOT / "rssf_examples"
RULE_CENTER_CACHE_PATH = DIFF_ROOT / "rule_text_centers.json"
VNAME_GLYPH_X4_RANGE = (36, 234)
NORMAL_VNAME_GLYPH_X4_RANGE = (36, 280)
DREAM_VNAME_GLYPH_X4_RANGE = (36, 234)
DREAM_RULE_LINE_COUNTS = {
    "D11131_en": 5,
    "D11132_en": 5,
    "D11133_en": 5,
    "D11134_en": 7,
    "D11135_en": 7,
    "D11131_zh": 3,
    "D11132_zh": 3,
    "D11133_zh": 3,
    "D11134_zh": 5,
    "D11135_zh": 5,
}
RULE_CENTER_CACHE: dict[str, int] | None = None
REFRESH_RULE_CENTER_CACHE = False

CROPS = {
    "qi": (0, 0, 105, 105),
    "title": (85, 0, 410, 135),
    "rules": (35, 300, 385, 660),
    "vname": (20, 45, 115, 365),
}


def source_path(label: str) -> Path:
    ref_id, locale = label.split("_", 1)
    if label.startswith("D"):
        return EXAMPLE_ROOT / f"orig_{locale}" / f"{ref_id}.png"
    direct = EXAMPLE_ROOT / f"orig_{locale}" / f"{ref_id}.png"
    if direct.exists():
        return direct
    level = ref_id[1]
    capture_id = {"1": "115061", "2": "115062", "3": "115063"}[level]
    return EXAMPLE_ROOT / f"orig_{locale}" / f"{capture_id}.png"


def source_image(label: str) -> Image.Image:
    return load_card_reference_rgba(source_path(label))


def load_rule_center_cache() -> dict[str, int]:
    if not RULE_CENTER_CACHE_PATH.exists():
        return {}
    try:
        data = json.loads(RULE_CENTER_CACHE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    if not isinstance(data, dict):
        return {}
    return {str(key): int(value) for key, value in data.items() if isinstance(value, int)}


def save_rule_center_cache(cache: dict[str, int]) -> None:
    RULE_CENTER_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    RULE_CENTER_CACHE_PATH.write_text(json.dumps(cache, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def rule_center_cache() -> dict[str, int]:
    global RULE_CENTER_CACHE
    if RULE_CENTER_CACHE is None:
        RULE_CENTER_CACHE = load_rule_center_cache()
    return RULE_CENTER_CACHE


def transformed_layout_rule_center_x(label: str) -> int | None:
    summary_path = DIFF_ROOT / "alignment_summary.json"
    if not summary_path.exists():
        return None
    try:
        items = json.loads(summary_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    if not isinstance(items, list):
        return None
    item = next((item for item in items if isinstance(item, dict) and item.get("label") == label), None)
    if not isinstance(item, dict):
        return None
    transform = item.get("transform")
    if not isinstance(transform, dict):
        return None
    try:
        scale = float(transform["scale"])
        dx = float(transform["dx"])
    except (KeyError, TypeError, ValueError):
        return None

    locale = label.split("_", 1)[1]
    desc_rect = renderer.DESC_TEXT_DRAW_RECT_EN if locale == "en" else renderer.DESC_TEXT_DRAW_RECT_CJK
    if label.startswith("D"):
        desc_rect = desc_rect.translated(0.0, renderer.DREAM_DESC_OFFSET_Y_UI)
    source_center_x = desc_rect.center[0]
    target_center_x = source_center_x * scale + dx
    return round(target_center_x - CROPS["rules"][0])


def write_crop(label: str, name: str, box: tuple[int, int, int, int], scale: int = 4) -> Path:
    generated = Image.open(DIFF_ROOT / f"{label}_generated_downscaled.png").convert("RGBA")
    target = source_image(label)
    width = (box[2] - box[0]) * scale
    height = (box[3] - box[1]) * scale
    output = Image.new("RGBA", (width * 2 + 8, height), (30, 30, 30, 255))

    for index, (image, caption) in enumerate(((generated, "generated"), (target, "screenshot"))):
        crop = image.crop(box).resize((width, height), Image.Resampling.NEAREST)
        ImageDraw.Draw(crop).text((4, 4), caption, fill=(255, 0, 0, 255))
        output.alpha_composite(crop, (index * (width + 8), 0))

    path = DIFF_ROOT / f"debug_{label}_{name}_x{scale}.png"
    save_png(output, path)
    return path


def is_rules_text_pixel(r: int, g: int, b: int, a: int) -> bool:
    if a < 100:
        return False
    spread = max(r, g, b) - min(r, g, b)
    dark = (r < 145 and g < 145 and b < 145 and spread <= 10) or (
        r < 105 and g < 105 and b < 105 and spread < 30
    )
    green = g > 120 and r < 130 and b > 115 and g > r + 20 and abs(g - b) <= 14
    gold = r > 120 and r > g + 12 and 70 < g < 155 and b < 115
    return dark or green or gold


def is_vertical_title_pixel(r: int, g: int, b: int, a: int) -> bool:
    return a >= 100 and r > 180 and g > 180 and b > 180 and max(r, g, b) - min(r, g, b) <= 15


def is_english_title_pixel(r: int, g: int, b: int, a: int) -> bool:
    return a >= 100 and r > 175 and g > 175 and b > 175


def text_mask(image: Image.Image, box: tuple[int, int, int, int], kind: str, label: str = "") -> Image.Image:
    crop = image.crop(box).convert("RGBA")
    mask = Image.new("L", crop.size, 0)
    pixels = crop.load()
    mask_pixels = mask.load()
    if kind == "vname":
        predicate = is_vertical_title_pixel
    elif kind == "title":
        predicate = is_english_title_pixel
    else:
        predicate = is_rules_text_pixel
    for y in range(crop.height):
        for x in range(crop.width):
            if kind == "vname":
                scaled_x = x * 4
                glyph_range = DREAM_VNAME_GLYPH_X4_RANGE if label.startswith("D") else NORMAL_VNAME_GLYPH_X4_RANGE
                if scaled_x < glyph_range[0] or scaled_x > glyph_range[1]:
                    continue
            if predicate(*pixels[x, y]):
                mask_pixels[x, y] = 255
    if kind == "rules":
        mask = clean_rules_mask(mask)
        if label.startswith("D"):
            mask = clean_dream_rules_mask(mask, label)
    elif kind == "title":
        mask = clean_title_mask(mask)
    return mask


def clean_title_mask(mask: Image.Image) -> Image.Image:
    """Remove leftover cost-icon fragments from the left edge of title crops."""
    width, height = mask.size
    pixels = mask.load()
    for y in range(height):
        for x in range(min(18, width)):
            pixels[x, y] = 0
    for y in range(min(78, height), height):
        for x in range(width):
            pixels[x, y] = 0
    seen = bytearray(width * height)
    remove: list[list[tuple[int, int]]] = []

    for start_y in range(height):
        for start_x in range(width):
            index = start_y * width + start_x
            if seen[index] or not pixels[start_x, start_y]:
                continue
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            seen[index] = 1
            component: list[tuple[int, int]] = []
            x0 = x1 = start_x
            y0 = y1 = start_y
            touches_left = False

            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                x0 = min(x0, x)
                x1 = max(x1, x)
                y0 = min(y0, y)
                y1 = max(y1, y)
                touches_left = touches_left or x == 0
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    next_index = ny * width + nx
                    if seen[next_index] or not pixels[nx, ny]:
                        continue
                    seen[next_index] = 1
                    queue.append((nx, ny))

            component_width = x1 - x0 + 1
            component_height = y1 - y0 + 1
            if touches_left and component_width < 45 and component_height > 8:
                remove.append(component)

    for component in remove:
        for x, y in component:
            pixels[x, y] = 0
    return mask


def clean_dream_rules_mask(mask: Image.Image, label: str) -> Image.Image:
    """Drop dream-card frame pixels that sit outside the textable parchment area."""
    width, height = mask.size
    pixels = mask.load()
    for y in range(height):
        for x in range(width):
            if not pixels[x, y]:
                continue
            # The dream frame curves into the rules crop on both sides. Keep this
            # as a pixel mask so nearby glyph rows still get measured normally.
            if x < 5 or x > width - 30:
                pixels[x, y] = 0
            elif y > height - 105 and (x < 28 or x > width - 55):
                pixels[x, y] = 0
            elif y > height - 140 and x > width - 105:
                pixels[x, y] = 0
            elif y > height - 78 and x > width - 85:
                pixels[x, y] = 0
            elif label.startswith(("D11131_", "D11132_", "D11133_")) and y > height - 135 and x < 75:
                pixels[x, y] = 0
            elif label in {"D11131_zh", "D11132_zh", "D11133_zh"} and x > width - 50:
                pixels[x, y] = 0
    return mask


def clean_rules_mask(mask: Image.Image) -> Image.Image:
    """Remove frame/background fragments caught by the dark text threshold."""
    width, height = mask.size
    pixels = mask.load()
    seen = bytearray(width * height)
    remove: list[list[tuple[int, int]]] = []

    for start_y in range(height):
        for start_x in range(width):
            index = start_y * width + start_x
            if seen[index] or not pixels[start_x, start_y]:
                continue
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            seen[index] = 1
            component: list[tuple[int, int]] = []
            x0 = x1 = start_x
            y0 = y1 = start_y
            touches_left = touches_right = touches_top = touches_bottom = False

            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                x0 = min(x0, x)
                x1 = max(x1, x)
                y0 = min(y0, y)
                y1 = max(y1, y)
                touches_left = touches_left or x == 0
                touches_right = touches_right or x == width - 1
                touches_top = touches_top or y == 0
                touches_bottom = touches_bottom or y == height - 1
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    next_index = ny * width + nx
                    if seen[next_index] or not pixels[nx, ny]:
                        continue
                    seen[next_index] = 1
                    queue.append((nx, ny))

            box_width = x1 - x0 + 1
            box_height = y1 - y0 + 1
            area = len(component)
            border_touch = touches_left or touches_right or touches_top or touches_bottom
            long_edge = box_width > width * 0.55 and box_height < 22
            side_sliver = (touches_left or touches_right) and box_width < width * 0.18
            internal_side_sliver = (
                (x0 > width * 0.86 or x1 < width * 0.14)
                and box_width < width * 0.16
                and box_height > 42
            )
            bottom_art = touches_bottom or (y0 > height - 70 and box_width > width * 0.25)
            if (border_touch and (long_edge or side_sliver or bottom_art or area > width * 8)) or internal_side_sliver:
                remove.append(component)

    for component in remove:
        for x, y in component:
            pixels[x, y] = 0
    return mask


def row_boxes(
    mask: Image.Image,
    min_pixels: int,
    merge_gap: int,
    min_height: int,
    trim_edges: bool = False,
) -> list[tuple[int, int, int, int]]:
    pixels = mask.load()
    bands: list[tuple[int, int]] = []
    active_start: int | None = None
    last_active = -1
    for y in range(mask.height):
        count = sum(1 for x in range(mask.width) if pixels[x, y])
        if count >= min_pixels:
            if active_start is None:
                active_start = y
            last_active = y
        elif active_start is not None and y - last_active > merge_gap:
            bands.append((active_start, last_active + 1))
            active_start = None
    if active_start is not None:
        bands.append((active_start, last_active + 1))

    boxes: list[tuple[int, int, int, int]] = []
    for top, bottom in bands:
        xs: list[int] = []
        ys: list[int] = []
        for y in range(top, bottom):
            for x in range(mask.width):
                if pixels[x, y]:
                    xs.append(x)
                    ys.append(y)
        if not xs:
            continue
        x0, y0, x1, y1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
        if trim_edges:
            x0, y0, x1, y1 = trim_detached_edge_islands(pixels, x0, y0, x1, y1)
            x0, y0, x1, y1 = trim_sparse_edge_columns(pixels, x0, y0, x1, y1)
        if y1 - y0 >= min_height and x1 - x0 >= 3:
            boxes.append((x0, y0, x1, y1))
    return boxes


def connected_component_boxes(mask: Image.Image, min_pixels: int = 3) -> list[tuple[int, int, int, int, int]]:
    width, height = mask.size
    pixels = mask.load()
    seen = bytearray(width * height)
    boxes: list[tuple[int, int, int, int, int]] = []
    for start_y in range(height):
        for start_x in range(width):
            index = start_y * width + start_x
            if seen[index] or not pixels[start_x, start_y]:
                continue
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            seen[index] = 1
            x0 = x1 = start_x
            y0 = y1 = start_y
            area = 0
            while queue:
                x, y = queue.popleft()
                area += 1
                x0 = min(x0, x)
                x1 = max(x1, x)
                y0 = min(y0, y)
                y1 = max(y1, y)
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    next_index = ny * width + nx
                    if seen[next_index] or not pixels[nx, ny]:
                        continue
                    seen[next_index] = 1
                    queue.append((nx, ny))
            if area >= min_pixels:
                boxes.append((x0, y0, x1 + 1, y1 + 1, area))
    return boxes


def title_row_boxes(mask: Image.Image) -> list[tuple[int, int, int, int]]:
    """Cluster title glyph components by vertical center so descenders stay with their row."""
    components = [
        box
        for box in connected_component_boxes(mask, min_pixels=4)
        if box[2] - box[0] >= 2 and box[3] - box[1] >= 4
    ]
    if not components:
        return []

    clusters: list[list[tuple[int, int, int, int, int]]] = []
    for component in sorted(components, key=lambda box: ((box[1] + box[3]) / 2.0, box[0])):
        cy = (component[1] + component[3]) / 2.0
        if not clusters:
            clusters.append([component])
            continue
        last_cluster = clusters[-1]
        last_cy = sum((box[1] + box[3]) / 2.0 for box in last_cluster) / len(last_cluster)
        if abs(cy - last_cy) <= 16:
            last_cluster.append(component)
        else:
            clusters.append([component])

    boxes: list[tuple[int, int, int, int]] = []
    for cluster in clusters:
        x0 = min(box[0] for box in cluster)
        y0 = min(box[1] for box in cluster)
        x1 = max(box[2] for box in cluster)
        y1 = max(box[3] for box in cluster)
        if x1 - x0 >= 3 and y1 - y0 >= 7:
            boxes.append((x0, y0, x1, y1))
    return boxes


def trim_sparse_edge_columns(
    pixels,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    window: int = 6,
    min_ink: int = 8,
) -> tuple[int, int, int, int]:
    def window_ink(left: int, right: int) -> int:
        return sum(1 for x in range(left, right) for y in range(y0, y1) if pixels[x, y])

    while x1 - x0 > window and window_ink(x0, min(x1, x0 + window)) < min_ink:
        x0 += 1
    while x1 - x0 > window and window_ink(max(x0, x1 - window), x1) < min_ink:
        x1 -= 1

    rows = [y for y in range(y0, y1) for x in range(x0, x1) if pixels[x, y]]
    if not rows:
        return x0, y0, x1, y1
    return x0, min(rows), x1, max(rows) + 1


def trim_detached_edge_islands(
    pixels,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    max_gap: int = 20,
    max_island_width: int = 8,
) -> tuple[int, int, int, int]:
    columns = [x for x in range(x0, x1) if any(pixels[x, y] for y in range(y0, y1))]
    if not columns:
        return x0, y0, x1, y1

    clusters: list[list[int]] = [[columns[0]]]
    for x in columns[1:]:
        if x - clusters[-1][-1] > max_gap:
            clusters.append([x])
        else:
            clusters[-1].append(x)

    while (
        len(clusters) > 1
        and clusters[0][-1] - clusters[0][0] + 1 <= max_island_width
        and clusters[0][0] - x0 <= max_gap
    ):
        clusters.pop(0)
    while (
        len(clusters) > 1
        and clusters[-1][-1] - clusters[-1][0] + 1 <= max_island_width
        and x1 - clusters[-1][-1] <= max_gap
    ):
        clusters.pop()

    kept_x0 = clusters[0][0]
    kept_x1 = clusters[-1][-1] + 1
    rows = [y for y in range(y0, y1) for x in range(kept_x0, kept_x1) if pixels[x, y]]
    if not rows:
        return x0, y0, x1, y1
    return kept_x0, min(rows), kept_x1, max(rows) + 1


def filter_rule_row_boxes(
    boxes: list[tuple[int, int, int, int]],
    crop_size: tuple[int, int],
    label: str,
    mask: Image.Image | None = None,
    side: str = "",
) -> list[tuple[int, int, int, int]]:
    width, height = crop_size
    filtered: list[tuple[int, int, int, int]] = []
    for x0, y0, x1, y1 in boxes:
        box_width = x1 - x0
        left_label_leak = not label.startswith("D") and x0 < 12 and y0 < 95 and box_width < 90
        near_top_edge = y0 < 45 and (box_width > width * 0.30 or not label.startswith("D"))
        near_bottom_edge = y1 > height - 32 and box_width > width * 0.55
        below_rules_area = label.startswith("D") and y0 > height - 82
        right_edge_artifact = x1 >= width - 2 and box_width < width * 0.20
        if left_label_leak or near_top_edge or near_bottom_edge or below_rules_area or right_edge_artifact:
            continue
        filtered.append((x0, y0, x1, y1))
    if label.startswith("D"):
        expected_count = DREAM_RULE_LINE_COUNTS.get(label)
        if expected_count is not None and len(filtered) > expected_count:
            filtered = filtered[-expected_count:]
    return filtered


def center_rule_row_boxes(
    boxes: list[tuple[int, int, int, int]],
    crop_size: tuple[int, int],
    mask: Image.Image | None = None,
    label: str = "",
    side: str = "",
) -> list[tuple[int, int, int, int]]:
    width, _ = crop_size
    cache_key = f"{label}:{side}" if label and side else ""
    cache = rule_center_cache()
    if cache_key and cache_key in cache and not REFRESH_RULE_CENTER_CACHE:
        center_x = cache[cache_key]
    else:
        center_x = transformed_layout_rule_center_x(label) if label else None
        if center_x is None:
            center_x = inferred_rule_center_x(boxes, width)
        if cache_key:
            cache[cache_key] = center_x
            save_rule_center_cache(cache)
    centered: list[tuple[int, int, int, int]] = []
    for x0, y0, x1, y1 in boxes:
        row_width = centered_text_width(mask, center_x, y0, y1, fallback_width=x1 - x0) if mask else x1 - x0
        row_width = min(row_width, width)
        nx0 = round(center_x - row_width / 2)
        nx1 = nx0 + row_width
        if nx0 < 0:
            nx1 -= nx0
            nx0 = 0
        if nx1 > width:
            nx0 -= nx1 - width
            nx1 = width
        centered.append((nx0, y0, nx1, y1))
    return centered


def inferred_rule_center_x(boxes: list[tuple[int, int, int, int]], crop_width: int) -> int:
    if not boxes:
        return crop_width // 2
    centers = sorted((x0 + x1) / 2 for x0, _, x1, _ in boxes)
    if len(centers) <= 2:
        return round(sum(centers) / len(centers))
    trimmed = centers[1:-1]
    return round(sum(trimmed) / len(trimmed))


def centered_text_width(
    mask: Image.Image,
    center_x: int,
    y0: int,
    y1: int,
    fallback_width: int,
    edge_window: int = 7,
    min_edge_ink: int = 5,
) -> int:
    pixels = mask.load()
    fallback_width = max(3, min(fallback_width, mask.width))
    max_width = 2 * min(center_x, mask.width - center_x)

    def edge_ink(left: int, right: int) -> tuple[int, int]:
        left_ink = sum(
            1
            for x in range(left, min(right, left + edge_window))
            for y in range(y0, y1)
            if pixels[x, y]
        )
        right_ink = sum(
            1
            for x in range(max(left, right - edge_window), right)
            for y in range(y0, y1)
            if pixels[x, y]
        )
        return left_ink, right_ink

    candidate_widths = [fallback_width]
    for delta in range(1, max_width + 1):
        if fallback_width - delta >= 3:
            candidate_widths.append(fallback_width - delta)
        if fallback_width + delta <= max_width:
            candidate_widths.append(fallback_width + delta)
        if fallback_width - delta < 3 and fallback_width + delta > max_width:
            break

    for width in candidate_widths:
        left = round(center_x - width / 2)
        right = left + width
        if left < 0 or right > mask.width:
            continue
        left_ink, right_ink = edge_ink(left, right)
        if left_ink >= min_edge_ink and right_ink >= min_edge_ink:
            return right - left

    return fallback_width


def filter_title_row_boxes(boxes: list[tuple[int, int, int, int]], crop_size: tuple[int, int], label: str) -> list[tuple[int, int, int, int]]:
    if label.endswith(("_zh", "_tw")):
        return []
    width, _ = crop_size
    filtered: list[tuple[int, int, int, int]] = []
    for x0, y0, x1, y1 in boxes:
        box_width = x1 - x0
        right_edge_artifact = x1 >= width - 2 and box_width < width * 0.22
        if right_edge_artifact:
            continue
        filtered.append((x0, y0, x1, y1))
    return filtered


def filter_vname_row_boxes(boxes: list[tuple[int, int, int, int]], crop_size: tuple[int, int], label: str) -> list[tuple[int, int, int, int]]:
    width, height = crop_size
    filtered: list[tuple[int, int, int, int]] = []
    for x0, y0, x1, y1 in boxes:
        box_width = x1 - x0
        right_edge_artifact = x1 >= width - 2 and box_width < width * 0.28
        top_ornament = not label.startswith("D") and y1 < 95
        bottom_cutoff = height - 95 if label.startswith("D") else height - 60
        bottom_ornament = not label.startswith("D") and y0 > bottom_cutoff
        dream_bottom_ornament = label.startswith(("D11133_", "D11134_", "D11135_")) and y0 > 282 and box_width < 25
        if right_edge_artifact or top_ornament or bottom_ornament or dream_bottom_ornament:
            continue
        filtered.append((x0, y0, x1, y1))
    return filtered


def draw_scaled_boxes(draw: ImageDraw.ImageDraw, boxes: list[tuple[int, int, int, int]], scale: int, color: tuple[int, int, int]) -> None:
    for index, (x0, y0, x1, y1) in enumerate(boxes, start=1):
        rect = (x0 * scale, y0 * scale, x1 * scale - 1, y1 * scale - 1)
        draw.rectangle(rect, outline=color, width=max(1, scale // 2))
        draw.text((x0 * scale + 2, y0 * scale + 2), str(index), fill=color)


def write_box_overlay(label: str, name: str, box: tuple[int, int, int, int], scale: int = 4) -> Path:
    generated = Image.open(DIFF_ROOT / f"{label}_generated_downscaled.png").convert("RGBA")
    target = source_image(label)
    width = (box[2] - box[0]) * scale
    height = (box[3] - box[1]) * scale
    output = Image.new("RGBA", (width * 2 + 8, height), (30, 30, 30, 255))
    kind = name
    min_pixels = 3 if kind == "vname" else 10
    if kind == "vname":
        merge_gap = 4
    elif kind == "rules" and label.startswith("D"):
        merge_gap = 1
    else:
        merge_gap = 3
    min_height = 5 if kind == "vname" else 7

    side_boxes: list[tuple[str, list[tuple[int, int, int, int]]]] = []
    for image, caption in ((generated, "generated"), (target, "screenshot")):
        crop = image.crop(box).resize((width, height), Image.Resampling.NEAREST)
        mask = text_mask(image, box, kind, label=label)
        if kind == "title":
            boxes = title_row_boxes(mask)
        else:
            boxes = row_boxes(
                mask,
                min_pixels=min_pixels,
                merge_gap=merge_gap,
                min_height=min_height,
                trim_edges=kind == "rules",
            )
        if kind == "rules":
            boxes = filter_rule_row_boxes(
                boxes,
                (box[2] - box[0], box[3] - box[1]),
                label,
                mask=mask,
                side=caption,
            )
        elif kind == "title":
            boxes = filter_title_row_boxes(boxes, (box[2] - box[0], box[3] - box[1]), label)
        elif kind == "vname":
            boxes = filter_vname_row_boxes(boxes, (box[2] - box[0], box[3] - box[1]), label)
        side_boxes.append((caption, boxes))

    for index, (image, caption) in enumerate(((generated, "generated"), (target, "screenshot"))):
        crop = image.crop(box).resize((width, height), Image.Resampling.NEAREST)
        draw = ImageDraw.Draw(crop)
        draw.text((4, 4), caption, fill=(255, 0, 0, 255))
        if index == 0:
            draw_scaled_boxes(draw, side_boxes[0][1], scale, (0, 255, 255))
        else:
            draw_scaled_boxes(draw, side_boxes[0][1], scale, (0, 255, 255))
            draw_scaled_boxes(draw, side_boxes[1][1], scale, (255, 220, 0))
        output.alpha_composite(crop, (index * (width + 8), 0))

    path = DIFF_ROOT / f"debug_{label}_{name}_boxes_x{scale}.png"
    save_png(output, path)
    return path


def main() -> None:
    global REFRESH_RULE_CENTER_CACHE
    parser = argparse.ArgumentParser()
    parser.add_argument("labels", nargs="*")
    parser.add_argument("--refresh-centers", action="store_true")
    args = parser.parse_args()
    REFRESH_RULE_CENTER_CACHE = args.refresh_centers

    default_labels = (
        "l1_zh",
        "l1_en",
        "l2_zh",
        "l2_en",
        "l3_zh",
        "l3_en",
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
    )
    labels = tuple(args.labels) or default_labels
    for label in labels:
        for name, box in CROPS.items():
            print(write_crop(label, name, box).relative_to(ROOT))
        for name in ("title", "rules", "vname"):
            if name == "title" and label.endswith(("_zh", "_tw")):
                continue
            print(write_box_overlay(label, name, CROPS[name]).relative_to(ROOT))


if __name__ == "__main__":
    main()
