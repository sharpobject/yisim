#!/usr/bin/env python3
"""
Combine card data from multiple sources:
- cards_with_params.json: otherParams values from CardConfig protobuf
- Localization.json: English names and descriptions
- swogi.json: qi_cost, hp_cost, and other metadata

The script matches cards by ID and fills in template placeholders.

Usage:
    python3 combine_card_data.py <version_folder> [output_file]

Example:
    python3 combine_card_data.py 1.5.8 combined_cards.json
"""

import json
import sys
import os
import re


def load_localization(loc_path):
    """Load localization and index by term."""
    with open(loc_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    terms = {}
    for term in data.get('mSource', {}).get('mTerms', []):
        term_name = term.get('Term', '')
        langs = term.get('Languages', [])
        # Languages: [0]=CN, [1]=EN, [2]=TW
        terms[term_name] = {
            'cn': langs[0] if len(langs) > 0 else '',
            'en': langs[1] if len(langs) > 1 else '',
            'tw': langs[2] if len(langs) > 2 else ''
        }
    return terms


def fill_template(template, card_data):
    """Fill in all placeholders with actual values from card data.

    Known placeholders:
    - {otherParams[N]} - variable params from protobuf field 100
    - {attack} - base attack value (field_8)
    - {def} - base defense value (field_11)
    - {jianYi} - sword intent value (field_15)
    - {chargeQi} - qi charge value (field_12)
    - {attackCount} - number of attacks (field_9)
    - {physique} - physique value (field_13)
    - {anima} - anima/spirit value (field_14)
    - {guaXiang} - trigram value (field_16)
    - {randomAttack} - random attack (field_10)
    """
    if not template:
        return template

    result = template

    # Fill otherParams
    params = card_data.get('otherParams', [])
    for i, val in enumerate(params):
        result = re.sub(
            rf'\{{\$?otherParams\[{i}\]}}',
            str(val),
            result
        )

    # Field mappings for stat placeholders
    # Based on analysis of CardConfig protobuf:
    stat_fields = {
        'attack': 'field_8',       # Base attack value
        'attackCount': 'field_10', # Number of attacks (for multi-hit cards)
        'def': 'field_11',         # Base defense value
        'randomDef': 'field_12',   # Max defense in defense range
        'jianYi': 'field_15',      # Sword intent value
        'chargeQi': 'field_23',    # Qi charge value
        'physique': 'field_21',    # Physique value
        'anima': 'field_7',        # Anima/spirit value
        'guaXiang': 'field_16',    # Trigram value
        'randomAttack': 'field_9', # Max attack in attack range (e.g., 1~9)
        # Note: field_6 = phase of the card
    }

    for placeholder, field in stat_fields.items():
        if field in card_data and card_data[field] is not None:
            result = result.replace(f'{{{placeholder}}}', str(card_data[field]))

    return result


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    version = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else f'{version}/combined_cards.json'

    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    version_dir = os.path.join(script_dir, version)

    cards_path = os.path.join(version_dir, 'cards_with_params.json')
    loc_path = os.path.join(version_dir, 'Localization.json')
    swogi_path = os.path.join(script_dir, '..', 'swogi.json')

    # Load data
    print(f"Loading cards_with_params.json from {version}...")
    with open(cards_path, 'r', encoding='utf-8') as f:
        cards = json.load(f)
    print(f"  Loaded {len(cards)} cards")

    print(f"Loading Localization.json...")
    terms = load_localization(loc_path)
    print(f"  Loaded {len(terms)} terms")

    # Load swogi if available
    swogi = {}
    if os.path.exists(swogi_path):
        print(f"Loading swogi.json...")
        with open(swogi_path, 'r', encoding='utf-8') as f:
            swogi = json.load(f)
        print(f"  Loaded {len(swogi)} cards")

    # Process cards
    combined = []
    matched = 0

    for card in cards:
        card_id = card.get('field_1')

        # Skip test/debug cards with invalid IDs
        if card_id is None or card_id > 100000000:
            continue
        params = card.get('otherParams', [])

        # Get localization entries
        name_key = f'CardName_{card_id}'
        desc_key = f'CardDesc_{card_id}'

        name_loc = terms.get(name_key, {})
        desc_loc = terms.get(desc_key, {})

        # Fill in templates
        desc_cn_filled = fill_template(desc_loc.get('cn', card.get('desc', '')), card)
        desc_en_filled = fill_template(desc_loc.get('en', ''), card)
        desc_tw_filled = fill_template(desc_loc.get('tw', ''), card)

        # Calculate level from ID
        # Level is encoded in the 5th digit from right: X0YYYY where X is 0,1,2 for levels 1,2,3
        # e.g., 1000042 (L1), 1010042 (L2), 1020042 (L3) or 2 (L1), 10002 (L2), 20002 (L3)
        level_digit = (card_id // 10000) % 10
        level = level_digit + 1
        base_id = card_id - level_digit * 10000

        entry = {
            'card_id': card_id,
            'base_id': base_id,
            'level': level,
            'name_cn': name_loc.get('cn', card.get('name', '')),
            'name_en': name_loc.get('en', ''),
            'name_tw': name_loc.get('tw', ''),
            'desc_cn': desc_cn_filled,
            'desc_en': desc_en_filled,
            'desc_tw': desc_tw_filled,
            'desc_cn_template': desc_loc.get('cn', card.get('desc', '')),
            'desc_en_template': desc_loc.get('en', ''),
            'otherParams': params,
        }

        # Add fields from CardConfig with descriptive English names
        field_renames = {
            'field_6': 'phase',
            'field_8': 'attack',
            'field_9': 'random_attack_max',
            'field_10': 'attack_count',
            'field_11': 'defense',
            'field_12': 'random_defense_max',
            'field_15': 'sword_intent',
            'field_16': 'hexagram',
            'field_21': 'physique',
            'field_23': 'charge_qi',
            'field_101_float': 'field_101_float',
            'field_102': 'field_102',
            'field_103': 'field_103',
            'field_104': 'field_104',
            'field_105': 'field_105',
        }
        for old_name, new_name in field_renames.items():
            if old_name in card:
                entry[new_name] = card[old_name]

        # Handle qi (field_7): stored as unsigned 64-bit
        # Positive values = qi gained, negative values (stored as large unsigned) = qi cost
        # e.g., field_7 = 2 → gains 2 qi
        # e.g., field_7 = 18446744073709551614 (i.e., -2 as signed) → costs 2 qi
        if 'field_7' in card:
            qi_val = card['field_7']
            # Convert unsigned to signed (64-bit two's complement)
            if qi_val > 0x7FFFFFFFFFFFFFFF:
                signed_qi = qi_val - 0x10000000000000000  # e.g., -2
                entry['qi_cost'] = -signed_qi  # costs 2 qi
            elif qi_val > 0:
                entry['qi_gain'] = qi_val  # gains qi

        # Handle hp_cost (field_20): positive values are HP cost
        if 'field_20' in card and card['field_20'] > 0:
            entry['hp_cost'] = card['field_20']

        if name_loc:
            matched += 1

        combined.append(entry)

    print(f"\nMatched {matched}/{len(cards)} cards to localization")

    # Save output
    output_path = os.path.join(script_dir, output_file)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    print(f"\nSaving to: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(combined, f, ensure_ascii=False, indent=2)

    print(f"Output size: {os.path.getsize(output_path) / 1024:.1f} KB")

    # Print sample entries
    print("\n--- Sample entries ---")
    for card in combined[:3]:
        print(f"\n{card['name_en']} (Level {card['level']})")
        print(f"  CN: {card['name_cn']}")
        print(f"  Params: {card['otherParams']}")
        print(f"  Desc EN: {card['desc_en'][:100]}...")


if __name__ == "__main__":
    main()
