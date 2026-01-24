#!/usr/bin/env python3
"""
Extract fate branches from Localization.json,
merged with parameter data from FateBranchConfig.

Usage:
    python3 extract_fate_branches.py <version_folder>

Example:
    python3 extract_fate_branches.py 1.5.8
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
    cn_to_term = {}
    for term in data.get('mSource', {}).get('mTerms', []):
        term_name = term.get('Term', '')
        langs = term.get('Languages', [])
        term_data = {
            'cn': langs[0] if len(langs) > 0 else '',
            'en': langs[1] if len(langs) > 1 else '',
            'tw': langs[2] if len(langs) > 2 else ''
        }
        terms[term_name] = term_data
        if langs and langs[0]:
            cn_to_term[langs[0]] = term_data
    return terms, cn_to_term


def load_cards_from_localization(terms):
    """Extract card names from localization terms for 【N】 lookups.

    Card IDs in templates are raw card IDs that map to CardName_N.
    We index by the raw card_id from the term name.
    """
    by_card_id = {}

    for term_name, term_data in terms.items():
        # Match CardName_XXX patterns
        match = re.match(r'^CardName_(\d+)$', term_name)
        if match:
            card_id = int(match.group(1))
            if card_id not in by_card_id:
                by_card_id[card_id] = {
                    'cn': term_data.get('cn', ''),
                    'en': term_data.get('en', ''),
                    'tw': term_data.get('tw', '')
                }

    return by_card_id


def load_params(params_path):
    """Load parameter data and index by ID."""
    if not os.path.exists(params_path):
        return {}

    with open(params_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    indexed = {}
    for entry in data:
        # Support both 'id' (FateBranchConfig) and 'field_1' (other configs)
        item_id = entry.get('id') or entry.get('field_1')
        if item_id:
            indexed[item_id] = entry
    return indexed


def fill_template(template, params, count_param=None):
    """Fill in {otherParams[N]} and {countParam} placeholders."""
    if not template:
        return template

    result = template

    # Fill otherParams
    if params:
        for i, val in enumerate(params):
            result = re.sub(
                rf'\{{otherParams\[{i}\]}}',
                str(val),
                result
            )

    # Fill countParam
    if count_param is not None:
        result = re.sub(r'\{countParam\}', str(count_param), result)

    return result


def resolve_references(text, lang, terms, cn_to_term, cards_by_base_id):
    """Resolve nested references in text."""
    if not text:
        return text

    result = text

    # Resolve 【KEYWORD_xxx】
    def replace_keyword(m):
        keyword = m.group(1)
        term_data = cn_to_term.get(keyword, {})
        replacement = term_data.get(lang, keyword)
        return f'[{replacement}]' if replacement else f'[{keyword}]'

    result = re.sub(r'【KEYWORD_([^】]+)】', replace_keyword, result)

    # Resolve 【TALENT_N】
    def replace_talent(m):
        talent_id = m.group(1)
        term_data = terms.get(f'Talent_{talent_id}', {})
        replacement = term_data.get(lang, '')
        return f'[{replacement}]' if replacement else f'[Talent {talent_id}]'

    result = re.sub(r'【TALENT_(\d+)】', replace_talent, result)

    # Resolve 【N】 (card references)
    def replace_card(m):
        card_id = int(m.group(1))
        card_data = cards_by_base_id.get(card_id, {})
        replacement = card_data.get(lang, '')
        return f'[{replacement}]' if replacement else f'[Card {card_id}]'

    result = re.sub(r'【(\d+)】', replace_card, result)

    return result


def extract_fate_branches(terms, params_by_id, cn_to_term=None, cards_by_base_id=None):
    """Extract fate branches with filled templates."""
    fate_branches = []

    # Find all fate branch names
    branch_ids = set()
    for term_name in terms:
        match = re.match(r'^FateBranchName_(\d+)$', term_name)
        if match:
            branch_ids.add(int(match.group(1)))

    for branch_id in sorted(branch_ids):
        name_loc = terms.get(f'FateBranchName_{branch_id}', {})
        desc_loc = terms.get(f'FateBranchDesc_{branch_id}', {})

        entry = params_by_id.get(branch_id, {})
        params = entry.get('otherParams', [])
        # FateBranchConfig uses field_4 or field_6 for countParam
        # field_4 can be negative (stored as unsigned), field_6 is typically positive
        count_param = entry.get('field_6') or entry.get('field_4') or entry.get('field_3')

        # Fill templates
        desc_cn = fill_template(desc_loc.get('cn', ''), params, count_param)
        desc_en = fill_template(desc_loc.get('en', ''), params, count_param)
        desc_tw = fill_template(desc_loc.get('tw', ''), params, count_param)

        # Resolve references
        if cn_to_term and cards_by_base_id:
            desc_cn = resolve_references(desc_cn, 'cn', terms, cn_to_term, cards_by_base_id)
            desc_en = resolve_references(desc_en, 'en', terms, cn_to_term, cards_by_base_id)
            desc_tw = resolve_references(desc_tw, 'tw', terms, cn_to_term, cards_by_base_id)

        fate_branch = {
            'id': branch_id,
            'name_cn': name_loc.get('cn', ''),
            'name_en': name_loc.get('en', ''),
            'name_tw': name_loc.get('tw', ''),
            'desc_cn_template': desc_loc.get('cn', ''),
            'desc_en_template': desc_loc.get('en', ''),
            'desc_tw_template': desc_loc.get('tw', ''),
            'params': params,
            'count_param': count_param,
            'desc_cn': desc_cn,
            'desc_en': desc_en,
            'desc_tw': desc_tw,
        }

        fate_branches.append(fate_branch)

    return fate_branches


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    version = sys.argv[1]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    version_dir = os.path.join(script_dir, version)
    loc_path = os.path.join(version_dir, 'Localization.json')

    print(f"Loading Localization.json from {version}...")
    terms, cn_to_term = load_localization(loc_path)
    print(f"  Loaded {len(terms)} terms")

    # Extract card names from localization for reference resolution
    print(f"\nExtracting card names from localization...")
    cards_by_card_id = load_cards_from_localization(terms)
    print(f"  Found {len(cards_by_card_id)} unique card IDs")

    # Load fate branch params if available
    params_path = os.path.join(version_dir, 'fate_branch_params.json')
    print(f"\nLoading fate branch params...")
    params_by_id = load_params(params_path)
    if params_by_id:
        print(f"  Loaded {len(params_by_id)} param entries")
    else:
        print("  No params found (templates will not be filled)")

    # Extract fate branches
    print("\nExtracting Fate Branches...")
    fate_branches = extract_fate_branches(terms, params_by_id, cn_to_term, cards_by_card_id)

    output_path = os.path.join(version_dir, 'fate_branches.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(fate_branches, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(fate_branches)} fate branches to {output_path}")

    # Show samples
    print("\n--- Sample Fate Branches ---")
    for fb in fate_branches[:5]:
        print(f"[{fb['id']}] {fb['name_en']}")
        desc = fb['desc_en'] if fb['desc_en'] != fb['desc_en_template'] else fb['desc_en_template']
        print(f"    {desc[:80]}...")
        print()

    # Count branches with/without params
    with_params = len([fb for fb in fate_branches if fb['params']])
    print(f"\nBranches with params: {with_params}")
    print(f"Branches without params: {len(fate_branches) - with_params}")


if __name__ == "__main__":
    main()
