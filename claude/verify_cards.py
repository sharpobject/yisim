#!/usr/bin/env python3
"""
Card verification script.
Usage: python3 verify_cards.py <card_id1> <card_id2> ...

Card IDs are swogi.json format (e.g., 111011, 111012, 111013 for Cloud Sword - Touch Sky L1-L3)
You can also use base IDs (e.g., 11101) to check all 3 levels.
"""

import json
import csv
import re
import sys

# Load data files
with open('/Users/sharpobject/repos/yisim/swogi.json', 'r') as f:
    swogi = json.load(f)

with open('/Users/sharpobject/repos/yisim/card_actions.js', 'r') as f:
    actions_js = f.read()

csv_by_name = {}
with open('/Users/sharpobject/repos/yisim/localization/1.5.9/card_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row.get('name_en', '').strip()
        level = row.get('level', '')
        if name and level:
            csv_by_name[(name, level)] = row


def get_action_code(card_id):
    """Extract the card action implementation from card_actions.js"""
    pattern = rf'card_actions\["{card_id}"\]\s*=\s*\(game\)\s*=>\s*\{{'
    match = re.search(pattern, actions_js)
    if not match:
        return "NOT FOUND"
    start = match.end()
    brace_count = 1
    i = start
    while i < len(actions_js) and brace_count > 0:
        if actions_js[i] == '{':
            brace_count += 1
        elif actions_js[i] == '}':
            brace_count -= 1
        i += 1
    code = actions_js[start:i-1].strip()
    # Compact the code for display
    code = re.sub(r'\s+', ' ', code)
    return code


def get_swogi_data_with_inheritance(base_id):
    """Get swogi data for all 3 levels with inheritance applied"""
    result = {}
    prev_hp, prev_qi, prev_opening = 0, 0, None

    for level in ['1', '2', '3']:
        card_id = f"{base_id}{level}"
        data = swogi.get(card_id, {})

        # Get values, inheriting from previous level if not present
        hp_cost = data.get('hp_cost') if 'hp_cost' in data else prev_hp
        qi_cost = data.get('qi_cost') if 'qi_cost' in data else prev_qi
        opening = data.get('opening') if 'opening' in data else prev_opening
        name = data.get('name', '')

        result[level] = {
            'name': name,
            'hp_cost': hp_cost or 0,
            'qi_cost': qi_cost or 0,
            'opening': opening
        }

        # Update prev values for next level
        prev_hp = hp_cost or 0
        prev_qi = qi_cost or 0
        prev_opening = opening

    return result


def verify_card(base_id):
    """Verify a single card (all 3 levels)"""
    swogi_data = get_swogi_data_with_inheritance(base_id)

    # Get name from level 1
    name = swogi_data['1']['name']
    if not name:
        print(f"### {base_id} - NAME NOT FOUND IN SWOGI")
        return

    print(f"### {base_id} - {name}")

    for level in ['1', '2', '3']:
        card_id = f"{base_id}{level}"

        # CSV data
        csv_data = csv_by_name.get((name, level), {})
        csv_text = csv_data.get('text_en', 'CSV NOT FOUND').replace('\n', ' | ')
        csv_hp = int(csv_data.get('hp_cost', 0) or 0)
        csv_qi = int(csv_data.get('qi_cost', 0) or 0)

        # Swogi data
        swogi_hp = swogi_data[level]['hp_cost']
        swogi_qi = swogi_data[level]['qi_cost']
        swogi_opening = swogi_data[level]['opening']

        # Card actions code
        code = get_action_code(card_id)

        # Format output
        csv_cost_str = f"hp={csv_hp} qi={csv_qi}" if (csv_hp or csv_qi) else "no cost"
        swogi_cost_str = f"hp={swogi_hp} qi={swogi_qi}" if (swogi_hp or swogi_qi) else "no cost"
        opening_str = f"opening={swogi_opening}" if swogi_opening else ""

        # Check for mismatches
        cost_match = (csv_hp == swogi_hp and csv_qi == swogi_qi)
        cost_indicator = "✓" if cost_match else "✗COST"

        print(f"  L{level} CSV:  [{csv_cost_str}] {csv_text}")
        print(f"  L{level} IMPL: [{swogi_cost_str}] {opening_str} {code} {cost_indicator}")

    print()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nExample: python3 verify_cards.py 11101 11102 11103")
        sys.exit(1)

    for arg in sys.argv[1:]:
        # Handle both full IDs (111011) and base IDs (11101)
        if len(arg) == 6:
            # Full ID - extract base
            base_id = arg[:-1]
        elif len(arg) == 5:
            # Base ID
            base_id = arg
        else:
            print(f"Invalid card ID: {arg}")
            continue

        verify_card(base_id)


if __name__ == '__main__':
    main()
