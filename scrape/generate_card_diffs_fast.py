#!/usr/bin/env python3
"""Generate card compare/diff files without running the expensive aligner."""

from __future__ import annotations

import argparse
import json
import os
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
from dataclasses import asdict
from pathlib import Path

from align_card_diffs import (
    DEFAULT_OUTPUT_DIR,
    EXAMPLE_ROOT,
    ROOT,
    Transform,
    bug_diff,
    generated_card_for_label,
    initial_transform_from_alpha,
    load_card_reference_rgba,
    load_rgba,
    load_saved_transforms,
    pair_for_label,
    side_by_side,
    transform_source,
)
from png_io import save_png
from render_rule_sky_sword_formation import (
    TEXT_RENDERER,
    TEXT_RENDERERS,
    draw_config_text_for_label,
    magic_kernel_sharp_resize,
    render_card_for_label,
    set_text_renderer,
)


def generated_card_without_config_text(label: str, render_scale: float):
    try:
        return render_card_for_label(label, render_scale=render_scale, skip_description=True)
    except (KeyError, StopIteration, ValueError):
        return generated_card_for_label(label, render_scale)


def labels_from_examples() -> list[str]:
    labels: list[str] = []
    for locale in ("zh", "en"):
        for path in sorted((EXAMPLE_ROOT / f"orig_{locale}").glob("*.png")):
            labels.append(f"{path.stem}_{locale}")
    return labels


def numeric_upgrade_group(label: str) -> tuple[str, str] | None:
    ref_id, locale = label.split("_", 1)
    if not ref_id.isdigit() or ref_id[-1] not in {"1", "2", "3"}:
        return None
    return (ref_id[-1], locale)


def dream_phase_group(label: str) -> tuple[str, str] | None:
    ref_id, locale = label.split("_", 1)
    if not ref_id.startswith("D") or len(ref_id) < 6:
        return None
    phase = ref_id[-1]
    if phase not in {"1", "2", "3", "4", "5"}:
        return None
    return (phase, locale)


def fallback_transform(label: str, saved: dict[str, Transform]) -> tuple[Transform, str]:
    example, generated, parsed = pair_for_label(label)
    target = load_card_reference_rgba(example)
    search_source = load_rgba(generated) if generated.exists() else generated_card_for_label(parsed, 1.0)
    transform = saved.get(parsed)
    if transform is not None:
        return transform, "saved"
    scale, dx, dy = initial_transform_from_alpha(search_source, target)
    return Transform(scale=scale, dx=dx, dy=dy, score=0.0), "alpha_bbox"


def learned_transform(label: str, saved: dict[str, Transform]) -> tuple[Transform, str] | None:
    numeric_group = numeric_upgrade_group(label)
    if numeric_group is not None:
        transform = saved.get("l3_en")
        if transform is not None:
            return transform, "learned:normal_l3_en"

    dream_group = dream_phase_group(label)
    if dream_group is not None:
        phase, locale = dream_group
        source_label = f"D1113{phase}_{locale}"
        transform = saved.get(source_label)
        if transform is not None:
            return transform, f"learned:{source_label}"

    return None


def compare_fast(
    label: str,
    output_dir: Path,
    saved: dict[str, Transform],
    render_scale: float,
    png_optimize: bool,
    png_compress_level: int,
    compare_only: bool,
) -> dict[str, object]:
    result, outputs = build_compare_outputs(
        label,
        output_dir,
        saved,
        render_scale,
        compare_only,
    )
    for image, path in outputs:
        save_png(image, path, optimize=png_optimize, compress_level=png_compress_level)
    return result


def build_compare_outputs(
    label: str,
    output_dir: Path,
    saved: dict[str, Transform],
    render_scale: float,
    compare_only: bool,
) -> tuple[dict[str, object], list[tuple[object, Path]]]:
    example, generated, parsed = pair_for_label(label)
    target = load_card_reference_rgba(example)
    learned = learned_transform(parsed, saved)
    if learned is None:
        transform, alignment = fallback_transform(parsed, saved)
    else:
        transform, alignment = learned

    source_hi = generated_card_without_config_text(parsed, render_scale)
    target_hi_size = (round(target.width * render_scale), round(target.height * render_scale))
    generated_hi = transform_source(
        source_hi,
        target_hi_size,
        transform.scale,
        transform.dx * render_scale,
        transform.dy * render_scale,
    )
    generated_downscaled = magic_kernel_sharp_resize(generated_hi, target.size)
    draw_config_text_for_label(
        generated_downscaled,
        parsed,
        transform.scale,
        offset=(transform.dx, transform.dy),
        layout_render_scale=render_scale,
    )
    diff = bug_diff(generated_downscaled, target)
    panel = side_by_side(generated_downscaled, target, diff, parsed)

    output_dir.mkdir(parents=True, exist_ok=True)
    aligned_path = output_dir / f"{parsed}_generated_downscaled.png"
    diff_path = output_dir / f"{parsed}_structural_diff.png"
    panel_path = output_dir / f"{parsed}_compare.png"
    pending_outputs = []
    if not compare_only:
        pending_outputs.append((generated_downscaled, aligned_path))
        pending_outputs.append((diff, diff_path))
    pending_outputs.append((panel, panel_path))

    outputs = {
        "compare": str(panel_path.relative_to(ROOT)),
    }
    if not compare_only:
        outputs = {
            "generated_downscaled": str(aligned_path.relative_to(ROOT)),
            "diff": str(diff_path.relative_to(ROOT)),
            **outputs,
        }

    return {
        "label": parsed,
        "example": str(example.relative_to(ROOT)),
        "generated": str(generated.relative_to(ROOT)),
        "render_scale": render_scale,
        "alignment": alignment,
        "transform": asdict(transform),
        "outputs": outputs,
    }, pending_outputs


def prepare_postprocess_job(
    label: str,
    output_dir: Path,
    saved: dict[str, Transform],
    render_scale: float,
    compare_only: bool,
) -> tuple[dict[str, object], object, object, Transform, list[Path]]:
    example, generated, parsed = pair_for_label(label)
    target = load_card_reference_rgba(example)
    learned = learned_transform(parsed, saved)
    if learned is None:
        transform, alignment = fallback_transform(parsed, saved)
    else:
        transform, alignment = learned

    source_hi = generated_card_without_config_text(parsed, render_scale)

    output_dir.mkdir(parents=True, exist_ok=True)
    aligned_path = output_dir / f"{parsed}_generated_downscaled.png"
    diff_path = output_dir / f"{parsed}_structural_diff.png"
    panel_path = output_dir / f"{parsed}_compare.png"

    outputs = {
        "compare": str(panel_path.relative_to(ROOT)),
    }
    output_paths = [panel_path]
    if not compare_only:
        outputs = {
            "generated_downscaled": str(aligned_path.relative_to(ROOT)),
            "diff": str(diff_path.relative_to(ROOT)),
            **outputs,
        }
        output_paths = [aligned_path, diff_path, panel_path]

    return {
        "label": parsed,
        "example": str(example.relative_to(ROOT)),
        "generated": str(generated.relative_to(ROOT)),
        "render_scale": render_scale,
        "alignment": alignment,
        "transform": asdict(transform),
        "outputs": outputs,
    }, source_hi, target, transform, output_paths


def postprocess_and_save(
    result: dict[str, object],
    source_hi: object,
    target: object,
    transform: Transform,
    output_paths: list[Path],
    png_optimize: bool,
    png_compress_level: int,
) -> dict[str, object]:
    target_hi_size = (round(target.width * float(result["render_scale"])), round(target.height * float(result["render_scale"])))
    generated_hi = transform_source(
        source_hi,
        target_hi_size,
        transform.scale,
        transform.dx * float(result["render_scale"]),
        transform.dy * float(result["render_scale"]),
    )
    generated_downscaled = magic_kernel_sharp_resize(generated_hi, target.size)
    draw_config_text_for_label(
        generated_downscaled,
        str(result["label"]),
        transform.scale,
        offset=(transform.dx, transform.dy),
        layout_render_scale=float(result["render_scale"]),
    )
    diff = bug_diff(generated_downscaled, target)
    panel = side_by_side(generated_downscaled, target, diff, str(result["label"]))

    images = [panel]
    if len(output_paths) == 3:
        images = [generated_downscaled, diff, panel]
    for image, path in zip(images, output_paths, strict=True):
        save_png(image, path, optimize=png_optimize, compress_level=png_compress_level)
    return result


def compare_fast_with_png_pool(
    label: str,
    output_dir: Path,
    saved: dict[str, Transform],
    render_scale: float,
    png_optimize: bool,
    png_compress_level: int,
    compare_only: bool,
    png_executor: ThreadPoolExecutor,
    png_futures: list[tuple[str, Path, Future[None]]],
) -> dict[str, object]:
    result, outputs = build_compare_outputs(
        label,
        output_dir,
        saved,
        render_scale,
        compare_only,
    )
    for image, path in outputs:
        png_futures.append(
            (
                str(result["label"]),
                path,
                png_executor.submit(
                    save_png,
                    image,
                    path,
                    optimize=png_optimize,
                    compress_level=png_compress_level,
                ),
            )
        )
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("labels", nargs="*", help="specific labels to diff, e.g. 115011_en")
    parser.add_argument("--contains", help="only diff labels containing this substring")
    parser.add_argument("--locale", choices=("zh", "en"), help="only diff examples for one locale")
    parser.add_argument(
        "--fast-png",
        action="store_true",
        help="write larger PNGs much faster while iterating",
    )
    parser.add_argument(
        "--png-compress-level",
        type=int,
        default=None,
        choices=range(10),
        metavar="0-9",
        help="PNG zlib compression level; default is 9, or 1 with --fast-png",
    )
    parser.add_argument(
        "--write-intermediates",
        action="store_true",
        help="also write *_generated_downscaled.png and *_structural_diff.png",
    )
    parser.add_argument(
        "--png-workers",
        type=int,
        default=os.cpu_count() or 1,
        help="number of post-render image/PNG worker threads",
    )
    parser.add_argument(
        "--card-workers",
        type=int,
        default=1,
        help="experimental: number of whole-card diff worker threads",
    )
    parser.add_argument(
        "--text-renderer",
        choices=TEXT_RENDERERS,
        default=TEXT_RENDERER,
        help="default text rasterizer; sdf uses the game TMP atlas/materials, otf uses extracted DefaultFont.otf",
    )
    args = parser.parse_args()
    set_text_renderer(args.text_renderer)

    output_dir = DEFAULT_OUTPUT_DIR
    summary_path = output_dir / "fast_alignment_summary.json"
    saved = load_saved_transforms(output_dir / "alignment_summary.json")
    labels = args.labels or labels_from_examples()
    if args.locale:
        labels = [label for label in labels if label.endswith(f"_{args.locale}")]
    if args.contains:
        labels = [label for label in labels if args.contains in label]
    results = []
    failed = []
    png_optimize = not args.fast_png
    png_compress_level = args.png_compress_level
    if png_compress_level is None:
        png_compress_level = 1 if args.fast_png else 9
    if args.card_workers > 1:
        ordered_results: dict[str, dict[str, object]] = {}
        with ThreadPoolExecutor(max_workers=args.card_workers) as executor:
            futures = {
                executor.submit(
                    compare_fast,
                    label,
                    output_dir,
                    saved,
                    2.0,
                    png_optimize,
                    png_compress_level,
                    not args.write_intermediates,
                ): label
                for label in labels
            }
            for future in as_completed(futures):
                label = futures[future]
                try:
                    result = future.result()
                    ordered_results[label] = result
                    print(result["label"])
                except Exception as exc:
                    failed.append({"label": label, "error": repr(exc)})
                    print(f"FAILED {label}: {exc!r}")
        results = [ordered_results[label] for label in labels if label in ordered_results]
    else:
        postprocess_futures: list[tuple[str, Future[dict[str, object]]]] = []
        with ThreadPoolExecutor(max_workers=max(1, args.png_workers)) as postprocess_executor:
            for label in labels:
                try:
                    result, source_hi, target, transform, output_paths = prepare_postprocess_job(
                        label,
                        output_dir,
                        saved,
                        2.0,
                        not args.write_intermediates,
                    )
                    postprocess_futures.append(
                        (
                            str(result["label"]),
                            postprocess_executor.submit(
                                postprocess_and_save,
                                result,
                                source_hi,
                                target,
                                transform,
                                output_paths,
                                png_optimize,
                                png_compress_level,
                            ),
                        )
                    )
                    print(result["label"])
                except Exception as exc:
                    failed.append({"label": label, "error": repr(exc)})
                    print(f"FAILED {label}: {exc!r}")

            finished_results: dict[str, dict[str, object]] = {}
            for label, future in postprocess_futures:
                try:
                    result = future.result()
                    finished_results[str(result["label"])] = result
                except Exception as exc:
                    failed.append({"label": label, "error": repr(exc)})
                    print(f"FAILED {label} postprocess/write: {exc!r}")
            results = [finished_results[label] for label in labels if label in finished_results]

    summary = {"results": results, "failed": failed}
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"diffed {len(results)}/{len(results) + len(failed)} images")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
