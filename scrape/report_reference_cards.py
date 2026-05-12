#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from card_data import ROOT, card_by_id, card_name, render_description_text, resolve_reference


EXAMPLE_ROOT = ROOT / "rssf_examples"
DEFAULT_OUTPUT = ROOT / "extracted_assets/001.0006.0014/rendered_cards/rule_sky_sword_formation/reference_card_mapping.json"


def reference_ids() -> list[str]:
    refs: set[str] = set()
    for folder in ("orig_zh", "orig_en"):
        for path in (EXAMPLE_ROOT / folder).glob("*.png"):
            refs.add(path.stem)
    return sorted(refs)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    rows = []
    cards = card_by_id()
    for ref_id in reference_ids():
        resolved = resolve_reference(ref_id)
        row = {
            "ref_id": ref_id,
            "card_id": resolved.card_id,
            "source": resolved.source,
            "note": resolved.note,
        }
        if resolved.card_id is not None and resolved.card_id in cards:
            card = cards[resolved.card_id]
            row.update(
                {
                    "base_card_id": resolved.card_id - card["rarity"] * 10000,
                    "name_zh": card_name(resolved.card_id, "zh"),
                    "name_en": card_name(resolved.card_id, "en"),
                    "level": card["level"],
                    "rarity": card["rarity"],
                    "sect": card["sect"],
                    "career": card["career"],
                    "subcategory": card["subcategory"],
                    "anima": card["anima"],
                    "hpCost": card["hpCost"],
                    "chargeQi": card["chargeQi"],
                    "overrideSpriteId": card["overrideSpriteId"],
                    "desc_zh": render_description_text(resolved.card_id, "zh"),
                    "desc_en": render_description_text(resolved.card_id, "en"),
                }
            )
        rows.append(row)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    resolved_count = sum(1 for row in rows if row["card_id"] is not None)
    print(args.output.relative_to(ROOT))
    print(f"{resolved_count}/{len(rows)} references resolved from CardConfig/localization")
    unresolved = [row["ref_id"] for row in rows if row["card_id"] is None]
    if unresolved:
        print("unresolved:", ", ".join(unresolved))


if __name__ == "__main__":
    main()
