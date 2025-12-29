#!/usr/bin/env python3
"""
Classify game cards into categories for YiXianPai.

Usage:
    python classify_cards.py [version_dir]

Example:
    python classify_cards.py 1.5.9

This script reads combined_cards.json and generates card_classification.json.
"""

import json
import sys
import re
from pathlib import Path
from collections import defaultdict

# Field 104 meanings (from game data analysis)
FIELD_104_MEANINGS = {
    1: "voucher",
    2: "talisman_secret_enchantment",  # 99000100+ battle cards
    3: "spiritual_pet",
    4: "sect_secret_enchantment",
    5: "side_job_plant_master",
    6: "luck_season_legendary",
    7: "side_job_fortune_teller",
    8: "zongzi_sweet",
    9: "zongzi_salty",
    10: "immortal_relics_fusion",
    11: "shopkeeper",
    12: "spacetime_mirage",
    13: "artillery_minigame",
}

# Explicitly unused cards (identified through game analysis)
# These cards exist in game files but are not obtainable/usable
UNUSED_BASE_IDS = {
    4,          # Heptastar Lantern (non-playable)
    14,         # Five Elements Of World
    24,         # Act Underhand
    71,         # Rakshasa Pouncing
    72,         # Sky-Piercing Claw
    293,        # M - Consonance Sword Formation (old version, replaced by 325)
    8000015,    # Reform Formation
    4000007,    # Astral Move - Extend (fusion version exists)
    4000012,    # Scholasticism
    7000005,    # Wood Spirit - Fragrant
    7000008,    # Water Spirit - Cleanse
    7000041,    # Earth Spirit - Rockslide
    7000054,    # Cosmos Guard
    10000049,   # Thousand Souls Strike
}

# Unused vouchers
UNUSED_VOUCHER_IDS = {99000000, 99000004, 99000005}

# Unused empty (cards without English names, likely placeholder/unused)
UNUSED_EMPTY_IDS = {26, 30, 43, 44, 287}

# Bridge minigame card base_ids
BRIDGE_MINIGAME_IDS = {115, 116, 117, 118, 119, 120, 121}

# Loong event cards
LOONG_EVENT_IDS = {79}

# Decoration preview cards
DECORATION_PREVIEW_IDS = {145, 146, 147, 148, 149, 150}

# Merge utility cards
MERGE_UTILITY_IDS = {
    59,   # Pure Merpeople Pearl
    46,   # Daoist Rhyme Aura
}

# Zongzi neutral (not sweet or salty)
ZONGZI_NEUTRAL_IDS = {113}  # Pure Rice Zongzi

# Non-playable special (goes straight to inventory)
NON_PLAYABLE_SPECIAL_IDS = {
    27,   # At Own Pace
    114,  # Zongzi Trial
}

# Seasonal mirage special cards (Xiaoyao cards - only from mirage season)
SEASONAL_MIRAGE_SPECIAL_IDS = {
    321,  # M - Mirroring Merpeople Pearl
    280, 281, 282, 283, 284, 285, 286,  # Xiaoyao cards
    322,  # Xiaoyao - Reproduction
}

# Seasonal immortal relics special
SEASONAL_IMMORTAL_RELICS_SPECIAL_IDS = {
    182,  # Crimson Star
    155,  # Xuanming Waters
}

# Zongzi event special
ZONGZI_EVENT_IDS = {
    299,  # Five Colored Strings
    300,  # Zongzi Leaves
}

# Event mode cards (special battle events)
EVENT_MODE_IDS = {39, 40, 41, 42, 76, 77, 78, 80}

# Immortal relics fusion subcategories
FUSION_CHARACTER_SPECIFIC_IDS = set(range(122, 141))  # 122-140
FUSION_MIRROR_OF_STARS_IDS = {141, 142, 143, 144, 151, 152, 153, 154}
FUSION_XUANMING_IDS = set(range(156, 167))  # 156-166
FUSION_KUNLUN_DOOR_IDS = set(range(167, 182))  # 167-181
FUSION_SHELF_IDS = set(range(183, 211))  # 183-210


def is_non_playable_plant_master(card):
    """
    Plant master cards with only [Growth] and [Absorb] are non-playable.
    They go straight to inventory and can't be put in decks.
    """
    desc = card.get('desc_en', '') or card.get('desc_cn', '')
    # Check if card only has Growth and/or Absorb effects
    has_growth = '[Growth]' in desc or '[成长]' in desc or '成长' in desc
    has_absorb = '[Absorb]' in desc or '[吸收]' in desc or '吸收' in desc

    # Remove growth and absorb text to see if there's anything else
    cleaned = desc
    cleaned = re.sub(r'\[Growth\][^[]*', '', cleaned)
    cleaned = re.sub(r'\[成长\][^【]*', '', cleaned)
    cleaned = re.sub(r'\[Absorb\][^[]*', '', cleaned)
    cleaned = re.sub(r'\[吸收\][^【]*', '', cleaned)
    cleaned = re.sub(r'成长[^【\[]*', '', cleaned)
    cleaned = re.sub(r'吸收[^【\[]*', '', cleaned)
    cleaned = re.sub(r'[\[\]【】\s\n\\n]', '', cleaned)

    # If only growth/absorb and nothing else substantial, it's non-playable
    if (has_growth or has_absorb) and len(cleaned) < 5:
        return True
    return False


def is_non_playable_special(card):
    """Check if card is a non-playable special item (goes to inventory)."""
    desc = card.get('desc_en', '') or card.get('desc_cn', '')

    # Cards that only have Exchange or Absorb are non-playable
    only_exchange = '[Exchange]' in desc or '[兑换]' in desc
    only_absorb = '[Absorb]' in desc or '[吸收]' in desc

    # Check if there's combat text (ATK, DEF, Qi, etc.)
    has_combat = any(x in desc for x in ['ATK', 'DEF', '[Qi]', '攻', '防', '灵气'])

    if (only_exchange or only_absorb) and not has_combat:
        return True

    return False


def get_base_id_category(base_id):
    """Determine category based on base_id range."""
    if base_id == 0:
        return 'normal_attack'
    elif base_id in BRIDGE_MINIGAME_IDS:
        return 'bridge_minigame'
    elif base_id in LOONG_EVENT_IDS:
        return 'loong'
    elif base_id in DECORATION_PREVIEW_IDS:
        return 'decoration_preview'
    elif base_id in MERGE_UTILITY_IDS:
        return 'merge_utility'
    elif base_id in ZONGZI_NEUTRAL_IDS:
        return 'zongzi_neutral'
    elif base_id in NON_PLAYABLE_SPECIAL_IDS:
        return 'non_playable_special'
    elif base_id in SEASONAL_MIRAGE_SPECIAL_IDS:
        return 'seasonal_mirage_special'
    elif base_id in SEASONAL_IMMORTAL_RELICS_SPECIAL_IDS:
        return 'seasonal_immortal_relics_special'
    elif base_id in ZONGZI_EVENT_IDS:
        return 'zongzi_event'
    elif base_id in EVENT_MODE_IDS:
        return 'event_mode'
    elif 60 <= base_id <= 69:
        return 'merpeople_pearl'
    elif 1 <= base_id <= 999:
        return 'character_specific'
    elif 1000000 <= base_id <= 1999999:
        return 'sect_1_cloud_spirit_sword'
    elif 4000000 <= base_id <= 4999999:
        return 'sect_2_heptastar'
    elif 7000000 <= base_id <= 7999999:
        return 'sect_3_five_elements'
    elif 10000000 <= base_id <= 10999999:
        return 'sect_4_forge_body_soul'
    elif 2000000 <= base_id <= 2999999:
        return 'side_job_elixirist'
    elif 3000000 <= base_id <= 3999999:
        return 'side_job_talisman'
    elif 5000000 <= base_id <= 5999999:
        return 'side_job_music'
    elif 6000000 <= base_id <= 6999999:
        return 'side_job_painter'
    elif 8000000 <= base_id <= 8999999:
        return 'side_job_formation'
    elif 9000000 <= base_id <= 9999999:
        return 'side_job_plant_master'
    elif 11000000 <= base_id <= 11999999:
        return 'side_job_fortune_teller'
    elif 99000000 <= base_id <= 99000099:
        return 'voucher'
    elif 99000100 <= base_id <= 99999999:
        return 'talisman'
    else:
        return 'unknown'


def classify_card(card, swogi_names):
    """Classify a single card and return its category and metadata."""
    base_id = card.get('base_id')
    name = card.get('name_en', '') or card.get('name_cn', '')
    field_104 = card.get('field_104')
    field_105 = card.get('field_105')

    # Check if in swogi (match by English name)
    in_swogi = name in swogi_names if name else False

    # Determine category
    category = None
    non_playable = False
    note = None

    # Check for explicitly unused cards
    # Unused cards should have in_swogi=False even if name matches
    if base_id in UNUSED_BASE_IDS:
        category = 'unused'
        non_playable = True
        in_swogi = False  # Override - unused cards are not in swogi
        if base_id == 293:
            note = "unused - DEF +2/10/18 with Sword Intent version, replaced by 325"
        elif base_id == 4000007:
            note = "unused - fusion version exists"
        else:
            note = "unused"

    # Check for unused vouchers
    elif base_id in UNUSED_VOUCHER_IDS:
        category = 'unused'
        non_playable = True
        in_swogi = False  # Override - unused cards are not in swogi
        note = "unused voucher"

    # Check for explicitly unused empty cards (no English translation)
    elif base_id in UNUSED_EMPTY_IDS:
        category = 'unused_empty'
        non_playable = True
        in_swogi = False  # Override - unused cards are not in swogi

    # Check if card has no name (empty/unused)
    elif not name or name.strip() == '':
        category = 'unused_empty'
        non_playable = True
        in_swogi = False  # Override - unused cards are not in swogi

    # Use field_104 for special categories
    elif field_104:
        if field_104 == 1:
            category = 'voucher'
            non_playable = True
        elif field_104 == 2:
            category = 'talisman'  # Battle-usable talisman cards
        elif field_104 == 3:
            category = 'spiritual_pet'
        elif field_104 == 4:
            category = 'sect_secret_enchantment'
        elif field_104 == 5:
            category = 'side_job_plant_master'
            non_playable = is_non_playable_plant_master(card)
        elif field_104 == 6:
            category = 'luck_season_legendary'
        elif field_104 == 7:
            category = 'side_job_fortune_teller'
        elif field_104 == 8:
            category = 'zongzi_sweet'
        elif field_104 == 9:
            category = 'zongzi_salty'
        elif field_104 == 10:
            category = 'immortal_relics_fusion'
        elif field_104 == 11:
            category = 'shopkeeper'
            non_playable = True
        elif field_104 == 12:
            category = 'seasonal_mirage_selectable'
        elif field_104 == 13:
            category = 'artillery_minigame'

    # Check for zongzi neutral (field_104=8 or 9 but base_id in neutral range)
    if category in ('zongzi_sweet', 'zongzi_salty') and base_id in {45, 46, 47}:
        category = 'zongzi_neutral'

    # Fall back to base_id range classification
    if not category:
        category = get_base_id_category(base_id)

    # Check for non-playable special items
    if not non_playable and is_non_playable_special(card):
        non_playable = True

    result = {
        'base_id': base_id,
        'name': name,
        'in_swogi': in_swogi,
        'non_playable': non_playable,
    }
    if note:
        result['note'] = note

    return category, result


def get_fusion_subcategory(base_id):
    """Get subcategory for immortal relics fusion cards."""
    if base_id in FUSION_CHARACTER_SPECIFIC_IDS:
        return 'character_specific'
    elif base_id in FUSION_MIRROR_OF_STARS_IDS:
        return 'mirror_of_stars'
    elif base_id in FUSION_XUANMING_IDS:
        return 'xuanming'
    elif base_id in FUSION_KUNLUN_DOOR_IDS:
        return 'kunlun_door'
    elif base_id in FUSION_SHELF_IDS:
        return 'shelf'
    return None


def load_swogi_names(version_dir):
    """Load swogi.json and return set of card names that are implemented."""
    # swogi.json is in the parent of the localization directory
    # Use absolute path to handle relative version_dir
    version_path = Path(version_dir).absolute()
    swogi_path = version_path.parent.parent / 'swogi.json'
    names = set()
    if swogi_path.exists():
        with open(swogi_path, 'r', encoding='utf-8') as f:
            swogi = json.load(f)
            for card_id, card_data in swogi.items():
                if isinstance(card_data, dict) and 'name' in card_data:
                    names.add(card_data['name'])
    return names


def classify_cards(version_dir):
    """Classify all cards and generate classification JSON."""
    version_path = Path(version_dir)

    # Load combined cards
    combined_cards_path = version_path / 'combined_cards.json'
    if not combined_cards_path.exists():
        print(f"Error: {combined_cards_path} not found")
        sys.exit(1)

    with open(combined_cards_path, 'r', encoding='utf-8') as f:
        combined_cards = json.load(f)

    # Load swogi names for matching
    swogi_names = load_swogi_names(version_dir)

    # Group cards by base_id (only keep level 1 for classification)
    cards_by_base_id = {}
    for card in combined_cards:
        base_id = card.get('base_id')
        level = card.get('level', 1)
        if level == 1 or base_id not in cards_by_base_id:
            cards_by_base_id[base_id] = card

    # Classify each card
    categories = defaultdict(lambda: {'count': 0, 'in_swogi': 0, 'non_playable_count': 0, 'cards': []})
    fusion_subcategories = defaultdict(lambda: {'count': 0, 'cards': []})

    for base_id, card in sorted(cards_by_base_id.items()):
        category, card_info = classify_card(card, swogi_names)

        categories[category]['count'] += 1
        categories[category]['cards'].append(card_info)
        if card_info['in_swogi']:
            categories[category]['in_swogi'] += 1
        if card_info['non_playable']:
            categories[category]['non_playable_count'] += 1

        # Track fusion subcategories
        if category == 'immortal_relics_fusion':
            subcat = get_fusion_subcategory(base_id)
            if subcat:
                fusion_subcategories[subcat]['count'] += 1
                fusion_subcategories[subcat]['cards'].append(card_info)

    # Build output structure
    output = {
        'classification_notes': f"Card classifications for YiXianPai {version_path.name}",
        'field_104_meanings': {str(k): v for k, v in FIELD_104_MEANINGS.items()},
        'categories': dict(categories),
        'immortal_relics_fusion_subcategories': dict(fusion_subcategories),
        'summary': {
            'total_unique_cards': len(cards_by_base_id),
            'total_in_swogi': sum(c['in_swogi'] for c in categories.values()),
            'total_non_playable': sum(c['non_playable_count'] for c in categories.values()),
        },
        'unused': list(UNUSED_BASE_IDS),
    }

    # Add plant_master breakdown
    pm_cards = categories.get('side_job_plant_master', {}).get('cards', [])
    output['plant_master'] = {
        'playable': [c for c in pm_cards if not c['non_playable']],
        'non_playable': [c for c in pm_cards if c['non_playable']],
        'count_playable': len([c for c in pm_cards if not c['non_playable']]),
        'count_non_playable': len([c for c in pm_cards if c['non_playable']]),
    }

    # Write output
    output_path = version_path / 'card_classification.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Generated {output_path}")
    print(f"\nSummary:")
    print(f"  Total unique cards: {output['summary']['total_unique_cards']}")
    print(f"  Total in swogi: {output['summary']['total_in_swogi']}")
    print(f"  Total non-playable: {output['summary']['total_non_playable']}")

    print(f"\nCategories:")
    for cat, data in sorted(categories.items()):
        print(f"  {cat}: {data['count']} cards ({data['in_swogi']} in swogi, {data['non_playable_count']} non-playable)")


def main():
    version_dir = sys.argv[1] if len(sys.argv) > 1 else '1.5.9'
    classify_cards(version_dir)


if __name__ == '__main__':
    main()
