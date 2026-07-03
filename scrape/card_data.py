from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


VERSION = "001.0006.0014"
ROOT = Path(__file__).resolve().parent
ASSET_ROOT = ROOT / "extracted_assets" / VERSION
CARD_CONFIG_PATH = ASSET_ROOT / "protobuf" / "CardConfig.json"
CARD_CONFIG_PB_PATH = ASSET_ROOT / "protobuf" / "CardConfig.pb"
LOCALIZATION_PATH = ASSET_ROOT / "localization.json"


LANG_BY_SUFFIX = {
    "zh": "zh-CN",
    "en": "en",
    "tw": "zh-TW",
}


@dataclass(frozen=True)
class ResolvedReference:
    ref_id: str
    card_id: int | None
    source: str
    note: str = ""


_CARDS: list[dict[str, Any]] | None = None
_CARD_BY_ID: dict[int, dict[str, Any]] | None = None
_PB_CARD_VALUES: dict[int, dict[str, int]] | None = None
_LOCALIZATION: dict[str, dict[str, str]] | None = None


def _read_varint(data: bytes, index: int, end: int) -> tuple[int, int]:
    shift = 0
    value = 0
    while index < end:
        byte = data[index]
        index += 1
        value |= (byte & 0x7F) << shift
        if byte < 0x80:
            return value, index
        shift += 7
    raise ValueError("truncated varint")


def _skip_protobuf_value(data: bytes, index: int, end: int, wire_type: int) -> int:
    if wire_type == 0:
        _, index = _read_varint(data, index, end)
        return index
    if wire_type == 1:
        return min(end, index + 8)
    if wire_type == 2:
        length, index = _read_varint(data, index, end)
        return min(end, index + length)
    if wire_type == 5:
        return min(end, index + 4)
    raise ValueError(f"unsupported protobuf wire type {wire_type}")


def _parse_card_config_message(data: bytes) -> dict[str, int] | None:
    index = 0
    end = len(data)
    values: dict[str, int] = {}
    try:
        while index < end:
            tag, index = _read_varint(data, index, end)
            field_number = tag >> 3
            wire_type = tag & 0x07
            if wire_type == 0 and field_number in {1, 9, 12, 15, 16}:
                value, index = _read_varint(data, index, end)
                if field_number == 1:
                    values["id"] = value
                elif field_number == 9:
                    values["randomAttack"] = value
                elif field_number == 12:
                    values["randomDef"] = value
                elif field_number == 15:
                    values["jianYi"] = value
                elif field_number == 16:
                    values["guaXiang"] = value
            else:
                index = _skip_protobuf_value(data, index, end, wire_type)
    except ValueError:
        return None
    if "id" not in values:
        return None
    return values


def protobuf_card_values() -> dict[int, dict[str, int]]:
    global _PB_CARD_VALUES
    if _PB_CARD_VALUES is not None:
        return _PB_CARD_VALUES
    data = CARD_CONFIG_PB_PATH.read_bytes()
    values_by_id: dict[int, dict[str, int]] = {}
    index = 0
    end = len(data)
    while index < end:
        try:
            tag, index = _read_varint(data, index, end)
            wire_type = tag & 0x07
            if wire_type != 2:
                index = _skip_protobuf_value(data, index, end, wire_type)
                continue
            length, index = _read_varint(data, index, end)
            payload = data[index : index + length]
            index += length
            parsed = _parse_card_config_message(payload)
            if parsed is not None:
                card_id = parsed.pop("id")
                values_by_id[card_id] = parsed
        except ValueError:
            break
    _PB_CARD_VALUES = values_by_id
    return values_by_id


def cards() -> list[dict[str, Any]]:
    global _CARDS
    if _CARDS is None:
        loaded_cards = json.loads(CARD_CONFIG_PATH.read_text(encoding="utf-8"))
        pb_values = protobuf_card_values()
        for card in loaded_cards:
            for key, value in pb_values.get(int(card["id"]), {}).items():
                card.setdefault(key, value)
        _CARDS = loaded_cards
    return _CARDS


def card_by_id() -> dict[int, dict[str, Any]]:
    global _CARD_BY_ID
    if _CARD_BY_ID is None:
        _CARD_BY_ID = {int(card["id"]): card for card in cards()}
    return _CARD_BY_ID


def localization() -> dict[str, dict[str, str]]:
    global _LOCALIZATION
    if _LOCALIZATION is None:
        _LOCALIZATION = json.loads(LOCALIZATION_PATH.read_text(encoding="utf-8"))["terms"]
    return _LOCALIZATION


def card_base_id(card_id: int) -> int:
    return card_id - (card_id // 10000 % 100) * 10000


def rarity_card_id(base_card_id: int, rarity: int) -> int:
    return base_card_id + rarity * 10000


def localized_term(term: str, locale_suffix: str, fallback: str = "") -> str:
    lang = LANG_BY_SUFFIX[locale_suffix]
    return localization().get(term, {}).get(lang, fallback).replace("\\n", "\n")


def card_name(card_id: int, locale_suffix: str) -> str:
    card = card_by_id()[card_id]
    if locale_suffix == "zh":
        return str(card["name"])
    return localized_term(f"CardName_{card_base_id(card_id)}", locale_suffix, str(card["name"]))


def card_description_template(card_id: int, locale_suffix: str) -> str:
    card = card_by_id()[card_id]
    if locale_suffix == "zh":
        return str(card["desc"]).replace("\\n", "\n")
    return localized_term(
        f"CardDesc_{card_id}",
        locale_suffix,
        localized_term(f"CardDesc_{card_base_id(card_id)}", locale_suffix, str(card["desc"])),
    )


def render_description_text(card_id: int, locale_suffix: str) -> str:
    card = card_by_id()[card_id]
    text = card_description_template(card_id, locale_suffix)
    values = {
        "anima": card["anima"],
        "attack": card["attack"],
        "attackCount": card["attackCount"],
        "chargeQi": card["chargeQi"],
        "damage": card["damage"],
        "def": card["def"],
        "guaXiang": card.get("guaXiang", 0),
        "hpCost": card["hpCost"],
        "jianYi": card.get("jianYi", 0),
        "physique": card["physique"],
        "randomAttack": card.get("randomAttack", 0),
        "randomDef": card.get("randomDef", 0),
    }
    value_colors = {
        "attack": "#9D1022",
        "randomAttack": "#9D1022",
        "def": "#9A6212",
        "randomDef": "#9A6212",
        "anima": "#2C81BF",
        "jianYi": "#CF3521",
    }

    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        other_index = re.fullmatch(r"otherParams\[(\d+)\]", key)
        if other_index:
            index = int(other_index.group(1))
            other = card.get("otherParams", [])
            return str(other[index]) if index < len(other) else match.group(0)
        value = str(values.get(key, match.group(0)))
        if key in value_colors:
            return f"[color:{value_colors[key]}|{value}]"
        return value

    return re.sub(r"\{([^{}]+)\}", replace, text)


def visible_level_cards(sect: int, level: int) -> list[dict[str, Any]]:
    return [
        card
        for card in cards()
        if card["sect"] == sect
        and card["level"] == level
        and card["rarity"] == 0
        and not card["hidden"]
        and not card["obsolete"]
    ]


def visible_career_cards(career: int, level: int) -> list[dict[str, Any]]:
    return [
        card
        for card in cards()
        if card["career"] == career
        and card["level"] == level
        and card["rarity"] == 0
        and not card["hidden"]
        and not card["obsolete"]
    ]


def xuanming_cards(level: int) -> list[dict[str, Any]]:
    return [
        card
        for card in cards()
        if card["level"] == level
        and card["rarity"] == 0
        and card["hidden"]
        and card["subcategory"] == 10
        and card["name"].startswith("玄冥")
        and not card["obsolete"]
    ]


def artifact_cards() -> list[dict[str, Any]]:
    return [
        card
        for card in cards()
        if card["level"] == 6 and card["rarity"] == 0 and card["hidden"] and card["subcategory"] == 10
    ]


def resolve_reference(ref_id: str) -> ResolvedReference:
    if ref_id.startswith("D"):
        stem = ref_id[1:5]
        phase = int(ref_id[5])
        # Existing dream screenshot names are one-based phase variants.  The
        # stable stem is the game's display-list code, while CardConfig stores
        # the actual phase variants as base + 10000 * (phase - 1).
        dream_stem_to_base = {
            "1108": 1000075,   # Dream - Dharma Spirit Sword
            "1109": 1000076,   # Dream - Unrestrained Sword Zero
            "1113": 1000080,   # Dream - Rule Sky Sword Formation
            "1409": 10000077,  # Dream - Styx Agility
        }
        base_id = dream_stem_to_base.get(stem)
        if base_id is None:
            return ResolvedReference(ref_id, None, "unresolved", "unknown dream reference stem")
        card_id = base_id + (phase - 1) * 10000
        if card_id in card_by_id():
            return ResolvedReference(ref_id, card_id, "dream-card-config")
        return ResolvedReference(ref_id, None, "unresolved", "dream id formula did not hit CardConfig")

    if not re.fullmatch(r"\d{6}", ref_id):
        return ResolvedReference(ref_id, None, "unresolved", "unknown reference format")

    prefix = int(ref_id[0])
    group = int(ref_id[1])
    level = int(ref_id[2])
    index = int(ref_id[3:5])
    rarity = int(ref_id[5]) - 1

    hidden_reference_cards = {
        "21401": 1000050,
        "91301": 151,
        "91302": 185,
        "91401": 125,
    }
    hidden_base_id = hidden_reference_cards.get(ref_id[:5])
    if hidden_base_id is not None:
        card_id = hidden_base_id + rarity * 10000
        if card_id in card_by_id():
            return ResolvedReference(ref_id, card_id, "hidden-reference-card")

    if prefix == 1 and 1 <= group <= 4:
        rows = visible_level_cards(group, level)
        source = f"sect-{group}-visible-level-{level}"
    elif prefix == 9 and 1 <= group <= 7 and level <= 5:
        rows = visible_career_cards(group, level)
        source = f"career-{group}-visible-level-{level}"
    elif prefix == 9 and group == 0 and level <= 5:
        rows = xuanming_cards(level)
        source = f"xuanming-hidden-level-{level}"
    elif prefix == 9 and group == 0 and level == 6:
        if index == 0:
            return ResolvedReference(ref_id, 182, "crimson-star-relic-card", "title comes from Relic4OptionTitle_6")
        artifact_id = 174 + index
        if artifact_id in card_by_id():
            return ResolvedReference(ref_id, artifact_id, "xuan-yuan-artifact-card")
        return ResolvedReference(ref_id, None, "xuan-yuan-artifact-card", f"artifact id {artifact_id} missing")
    elif prefix == 9 and 1 <= group <= 4 and level == 6 and index == 1:
        artifact_id = 170 + group
        if artifact_id in card_by_id():
            return ResolvedReference(ref_id, artifact_id, "xuan-yuan-artifact-card")
        return ResolvedReference(ref_id, None, "xuan-yuan-artifact-card", f"artifact id {artifact_id} missing")
    else:
        return ResolvedReference(ref_id, None, "unresolved", "no config rule for reference")

    if index < 1 or index > len(rows):
        return ResolvedReference(ref_id, None, source, f"index {index} outside 1..{len(rows)}")

    base_id = int(rows[index - 1]["id"])
    card_id = rarity_card_id(base_id, rarity)
    if card_id not in card_by_id():
        return ResolvedReference(ref_id, None, source, f"rarity id {card_id} missing")
    return ResolvedReference(ref_id, card_id, source)
