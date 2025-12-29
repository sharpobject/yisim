#!/usr/bin/env python3
"""
Extract mirages and mirage options from Localization.json,
with card and keyword references resolved.

Usage:
    python3 extract_mirages.py <version_folder>

Example:
    python3 extract_mirages.py 1.5.8
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
    cn_to_term = {}  # Map Chinese text to term data for KEYWORD lookups
    for term in data.get('mSource', {}).get('mTerms', []):
        term_name = term.get('Term', '')
        langs = term.get('Languages', [])
        term_data = {
            'cn': langs[0] if len(langs) > 0 else '',
            'en': langs[1] if len(langs) > 1 else '',
            'tw': langs[2] if len(langs) > 2 else ''
        }
        terms[term_name] = term_data
        # Also index by Chinese text for KEYWORD lookups
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


def resolve_references(text, lang, terms, cn_to_term, cards_by_base_id):
    """
    Resolve nested references in text:
    - 【KEYWORD_xxx】 → lookup by Chinese text xxx
    - 【TALENT_N】 → lookup Talent_N term
    - 【N】 (just number) → lookup card by base_id N
    - 【{N}】 → keep as [Card {N}] (runtime card reference)
    """
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

    # Keep 【{N}】 as runtime reference (card ID filled at runtime)
    result = re.sub(r'【\{(\d+)\}】', r'[Card {\1}]', result)

    # Resolve 【N】 (just numbers) - card references
    def replace_card(m):
        card_id = int(m.group(1))
        card_data = cards_by_base_id.get(card_id, {})
        replacement = card_data.get(lang, '')
        return f'[{replacement}]' if replacement else f'[Card {card_id}]'

    result = re.sub(r'【(\d+)】', replace_card, result)

    return result


def extract_mirages(terms, cn_to_term, cards_by_base_id):
    """Extract mirage events with resolved references."""
    mirages = []

    for term_name, term_data in terms.items():
        match = re.match(r'^幻景标题_(\d+)$', term_name)
        if match:
            mirage_id = int(match.group(1))
            desc_term = f'幻景描述_{mirage_id}'
            desc_data = terms.get(desc_term, {})

            # Resolve references in descriptions
            title_cn = term_data.get('cn', '')
            title_en = term_data.get('en', '')
            title_tw = term_data.get('tw', '')
            desc_cn = resolve_references(desc_data.get('cn', ''), 'cn', terms, cn_to_term, cards_by_base_id)
            desc_en = resolve_references(desc_data.get('en', ''), 'en', terms, cn_to_term, cards_by_base_id)
            desc_tw = resolve_references(desc_data.get('tw', ''), 'tw', terms, cn_to_term, cards_by_base_id)

            mirages.append({
                'id': mirage_id,
                'title_cn': title_cn,
                'title_en': title_en,
                'title_tw': title_tw,
                'desc_cn': desc_cn,
                'desc_en': desc_en,
                'desc_tw': desc_tw,
            })

    return sorted(mirages, key=lambda x: x['id'])


def extract_mirage_options(terms, cn_to_term, cards_by_base_id):
    """Extract mirage options with resolved references."""
    options = []

    for term_name, term_data in terms.items():
        match = re.match(r'^幻景选项_(\d+)$', term_name)
        if match:
            option_id = int(match.group(1))

            text_cn = term_data.get('cn', '')
            text_en = term_data.get('en', '')
            text_tw = term_data.get('tw', '')

            # Resolve references
            text_cn_resolved = resolve_references(text_cn, 'cn', terms, cn_to_term, cards_by_base_id)
            text_en_resolved = resolve_references(text_en, 'en', terms, cn_to_term, cards_by_base_id)
            text_tw_resolved = resolve_references(text_tw, 'tw', terms, cn_to_term, cards_by_base_id)

            options.append({
                'id': option_id,
                'text_cn': text_cn,
                'text_en': text_en,
                'text_tw': text_tw,
                'text_cn_resolved': text_cn_resolved,
                'text_en_resolved': text_en_resolved,
                'text_tw_resolved': text_tw_resolved,
            })

    return sorted(options, key=lambda x: x['id'])


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

    # Extract Mirages
    print("\nExtracting Mirages...")
    mirages = extract_mirages(terms, cn_to_term, cards_by_card_id)
    mirages_path = os.path.join(version_dir, 'mirages.json')
    with open(mirages_path, 'w', encoding='utf-8') as f:
        json.dump(mirages, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(mirages)} mirages to {mirages_path}")

    # Extract Mirage Options
    print("\nExtracting Mirage Options...")
    options = extract_mirage_options(terms, cn_to_term, cards_by_card_id)
    options_path = os.path.join(version_dir, 'mirage_options.json')
    with open(options_path, 'w', encoding='utf-8') as f:
        json.dump(options, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(options)} mirage options to {options_path}")

    # Show samples with resolved references
    print("\n--- Sample Mirages ---")
    for m in mirages[:3]:
        print(f"  [{m['id']}] {m['title_en']}")
        if m['desc_en']:
            print(f"       {m['desc_en'][:80]}...")

    print("\n--- Sample Mirage Options with Resolved References ---")
    # Find options with resolved card references
    for opt in options:
        if '【' in opt['text_en'] and '[' in opt['text_en_resolved']:
            print(f"  [{opt['id']}] Before: {opt['text_en'][:60]}...")
            print(f"       After:  {opt['text_en_resolved'][:60]}...")
            print()
        if len([o for o in options if '【' in o['text_en']]) > 5:
            break

    # Count options with unresolved placeholders
    with_runtime = len([o for o in options if '{' in o['text_en_resolved']])
    with_card_ref = len([o for o in options if '[Card' in o['text_en_resolved'] and '{' in o['text_en_resolved']])
    print(f"\nPlaceholder statistics:")
    print(f"  Options with runtime placeholders ({{0}}, {{1}}): {with_runtime}")
    print(f"  Options with runtime card refs ([Card {{N}}]): {with_card_ref}")


if __name__ == "__main__":
    main()
