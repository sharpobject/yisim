#!/usr/bin/env python3
"""
Extract immortal fates (talents) and sigils from Localization.json,
merged with parameter data from game configs.

Usage:
    python3 extract_talents_sigils.py <version_folder>

Example:
    python3 extract_talents_sigils.py 1.5.8
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

    Card IDs in otherParams can be:
    - Direct card IDs like 3, which maps to CardName_3
    - Leveled cards are CardName_10003 (level 2), CardName_20003 (level 3)

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

    # Index by field_1 (ID)
    indexed = {}
    for entry in data:
        item_id = entry.get('field_1')
        if item_id:
            indexed[item_id] = entry
    return indexed


def fill_template(template, params):
    """Fill in {otherParams[N]} placeholders."""
    if not template or not params:
        return template

    result = template
    for i, val in enumerate(params):
        result = re.sub(
            rf'\{{\$?otherParams\[{i}\]}}',
            str(val),
            result
        )
    return result


def fill_resonance_template(template, params, effect_round=None, relate_talent_id=None):
    """Fill in resonance talent placeholders including {effectRound} and {relateTalentId}."""
    if not template:
        return template

    result = template

    # Fill otherParams
    if params:
        for i, val in enumerate(params):
            result = re.sub(
                rf'\{{\$?otherParams\[{i}\]}}',
                str(val),
                result
            )

    # Fill effectRound
    if effect_round is not None:
        result = re.sub(r'\{effectRound\}', str(effect_round), result)

    # Fill relateTalentId
    if relate_talent_id is not None:
        result = re.sub(r'\{relateTalentId\}', str(relate_talent_id), result)

    return result


def resolve_references(text, lang, terms, cn_to_term, cards_by_base_id):
    """
    Resolve nested references in text:
    - 【KEYWORD_xxx】 → lookup by Chinese text xxx
    - 【TALENT_N】 → lookup Talent_N term
    - 【N】 (just number) → lookup card by base_id N
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

    # Resolve 【N】 (just numbers) - card references
    def replace_card(m):
        card_id = int(m.group(1))
        card_data = cards_by_base_id.get(card_id, {})
        replacement = card_data.get(lang, '')
        return f'[{replacement}]' if replacement else f'[Card {card_id}]'

    result = re.sub(r'【(\d+)】', replace_card, result)

    return result


def extract_sigils(terms, params_by_id, cn_to_term=None, cards_by_base_id=None):
    """Extract sigils with all versions."""
    # Group params by base sigil ID (last 4 digits)
    sigils_by_base = {}
    for full_id, entry in params_by_id.items():
        base_id = full_id % 10000  # e.g., 10002 -> 2, 20002 -> 2
        tier = full_id // 10000    # e.g., 10002 -> 1, 20002 -> 2

        if base_id not in sigils_by_base:
            sigils_by_base[base_id] = {}
        sigils_by_base[base_id][tier] = entry

    # Build sigil entries with localization
    sigils = []
    for base_id, tiers in sorted(sigils_by_base.items()):
        name_loc = terms.get(f'KeYinCardName_{base_id}', {})
        desc_loc = terms.get(f'KeYinCardDesc_{base_id}', {})

        sigil = {
            'id': base_id,
            'name_cn': name_loc.get('cn', ''),
            'name_en': name_loc.get('en', ''),
            'name_tw': name_loc.get('tw', ''),
            'desc_cn_template': desc_loc.get('cn', ''),
            'desc_en_template': desc_loc.get('en', ''),
            'desc_tw_template': desc_loc.get('tw', ''),
            'tiers': []
        }

        for tier in sorted(tiers.keys()):
            entry = tiers[tier]
            params = entry.get('otherParams', [])
            desc_cn = fill_template(desc_loc.get('cn', ''), params)
            desc_en = fill_template(desc_loc.get('en', ''), params)
            # Resolve nested references
            if cn_to_term and cards_by_base_id:
                desc_cn = resolve_references(desc_cn, 'cn', terms, cn_to_term, cards_by_base_id)
                desc_en = resolve_references(desc_en, 'en', terms, cn_to_term, cards_by_base_id)
            tier_data = {
                'tier': tier,
                'sigil_value': entry.get('field_7'),
                'max_hp': entry.get('field_8'),
                'params': params,
                'desc_cn': desc_cn,
                'desc_en': desc_en,
            }
            sigil['tiers'].append(tier_data)

        sigils.append(sigil)

    return sigils


def extract_talents(terms, params_by_id, cn_to_term=None, cards_by_base_id=None):
    """Extract immortal fates with parameters, including all versions."""
    # Group params by base talent ID (field_2 or base of field_1)
    talents_by_base = {}
    for full_id, entry in params_by_id.items():
        # field_2 is the base talent ID
        base_id = entry.get('field_2', full_id % 10000)
        version = full_id // 10000 if full_id >= 10000 else 0

        if base_id not in talents_by_base:
            talents_by_base[base_id] = {}
        talents_by_base[base_id][version] = entry

    # Also include talents from localization that might not have params
    for term_name in terms:
        match = re.match(r'^Talent_(\d+)$', term_name)
        if match:
            talent_id = int(match.group(1))
            if talent_id not in talents_by_base:
                talents_by_base[talent_id] = {}

    talents = []
    for base_id in sorted(talents_by_base.keys()):
        versions = talents_by_base[base_id]
        name_loc = terms.get(f'Talent_{base_id}', {})
        desc_loc = terms.get(f'TalentDesc_{base_id}', {})

        talent = {
            'id': base_id,
            'name_cn': name_loc.get('cn', ''),
            'name_en': name_loc.get('en', ''),
            'name_tw': name_loc.get('tw', ''),
            'desc_cn_template': desc_loc.get('cn', ''),
            'desc_en_template': desc_loc.get('en', ''),
            'versions': []
        }

        if versions:
            for version in sorted(versions.keys()):
                entry = versions[version]
                params = entry.get('otherParams', [])
                # Look up version-specific description template
                # full_id is stored in field_1 (e.g., 16, 10016, 20016, 30016)
                full_id = entry.get('field_1', base_id + version * 10000)
                version_desc_loc = terms.get(f'TalentDesc_{full_id}', desc_loc)
                desc_cn = fill_template(version_desc_loc.get('cn', ''), params)
                desc_en = fill_template(version_desc_loc.get('en', ''), params)
                # Resolve nested references
                if cn_to_term and cards_by_base_id:
                    desc_cn = resolve_references(desc_cn, 'cn', terms, cn_to_term, cards_by_base_id)
                    desc_en = resolve_references(desc_en, 'en', terms, cn_to_term, cards_by_base_id)
                version_data = {
                    'version': version,
                    'params': params,
                    'desc_cn': desc_cn,
                    'desc_en': desc_en,
                }
                talent['versions'].append(version_data)
        else:
            # No params, just one version with template
            desc_cn = desc_loc.get('cn', '')
            desc_en = desc_loc.get('en', '')
            if cn_to_term and cards_by_base_id:
                desc_cn = resolve_references(desc_cn, 'cn', terms, cn_to_term, cards_by_base_id)
                desc_en = resolve_references(desc_en, 'en', terms, cn_to_term, cards_by_base_id)
            talent['versions'].append({
                'version': 0,
                'params': [],
                'desc_cn': desc_cn,
                'desc_en': desc_en,
            })

        talents.append(talent)

    return talents


def extract_resonance_talents(terms, params_by_id, cn_to_term=None, cards_by_base_id=None):
    """Extract resonance talents with filled templates."""
    resonance_talents = []

    for talent_id, entry in sorted(params_by_id.items(), key=lambda x: x[0]):
        name_loc = terms.get(f'ResonanceTalent_{talent_id}', {})
        desc_loc = terms.get(f'ResonanceTalentDesc_{talent_id}', {})

        params = entry.get('otherParams', [])
        effect_round = entry.get('field_101')
        relate_talent_id = entry.get('field_2')

        desc_cn = fill_resonance_template(
            desc_loc.get('cn', ''), params, effect_round, relate_talent_id
        )
        desc_en = fill_resonance_template(
            desc_loc.get('en', ''), params, effect_round, relate_talent_id
        )
        # Resolve nested references
        if cn_to_term and cards_by_base_id:
            desc_cn = resolve_references(desc_cn, 'cn', terms, cn_to_term, cards_by_base_id)
            desc_en = resolve_references(desc_en, 'en', terms, cn_to_term, cards_by_base_id)

        resonance = {
            'id': talent_id,
            'name_cn': name_loc.get('cn', ''),
            'name_en': name_loc.get('en', ''),
            'name_tw': name_loc.get('tw', ''),
            'desc_cn_template': desc_loc.get('cn', ''),
            'desc_en_template': desc_loc.get('en', ''),
            'desc_tw_template': desc_loc.get('tw', ''),
            'params': params,
            'effect_round': effect_round,
            'relate_talent_id': relate_talent_id,
            'desc_cn': desc_cn,
            'desc_en': desc_en,
        }

        resonance_talents.append(resonance)

    return resonance_talents


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

    # Load cards from localization for resolving 【N】 references
    print(f"\nExtracting card names from localization...")
    cards_by_base_id = load_cards_from_localization(terms)
    print(f"  Found {len(cards_by_base_id)} unique card base IDs")

    # Load sigil params
    sigil_params_path = os.path.join(version_dir, 'sigil_params.json')
    print(f"\nLoading sigil params...")
    sigil_params = load_params(sigil_params_path)
    print(f"  Loaded {len(sigil_params)} sigil param entries")

    # Load talent params
    talent_params_path = os.path.join(version_dir, 'talent_params.json')
    print(f"\nLoading talent params...")
    talent_params = load_params(talent_params_path)
    print(f"  Loaded {len(talent_params)} talent param entries")

    # Load resonance talent params
    resonance_params_path = os.path.join(version_dir, 'talent_resonance_params.json')
    print(f"\nLoading resonance talent params...")
    resonance_params = load_params(resonance_params_path)
    print(f"  Loaded {len(resonance_params)} resonance talent param entries")

    # Extract Sigils
    print("\nExtracting Sigils...")
    sigils = extract_sigils(terms, sigil_params, cn_to_term, cards_by_base_id)
    sigils_path = os.path.join(version_dir, 'sigils.json')
    with open(sigils_path, 'w', encoding='utf-8') as f:
        json.dump(sigils, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(sigils)} sigils to {sigils_path}")

    # Extract Immortal Fates
    print("\nExtracting Immortal Fates...")
    talents = extract_talents(terms, talent_params, cn_to_term, cards_by_base_id)
    talents_path = os.path.join(version_dir, 'immortal_fates.json')
    with open(talents_path, 'w', encoding='utf-8') as f:
        json.dump(talents, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(talents)} immortal fates to {talents_path}")

    # Extract Resonance Talents
    print("\nExtracting Resonance Talents...")
    resonance_talents = extract_resonance_talents(terms, resonance_params, cn_to_term, cards_by_base_id)
    resonance_path = os.path.join(version_dir, 'resonance_talents.json')
    with open(resonance_path, 'w', encoding='utf-8') as f:
        json.dump(resonance_talents, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(resonance_talents)} resonance talents to {resonance_path}")

    # Show samples
    print("\n--- Sample Sigils ---")
    for s in sigils[:2]:
        print(f"  {s.get('name_en', '?')} ({len(s['tiers'])} tiers):")
        for t in s['tiers'][:2]:
            print(f"    Tier {t['tier']}: {t['desc_en'][:50]}...")

    print("\n--- Sample Immortal Fates ---")
    for t in talents[:3]:
        if t['versions']:
            desc = t['versions'][0].get('desc_en', '')[:60]
        else:
            desc = t.get('desc_en_template', '')[:60]
        print(f"  {t.get('name_en', '?')} ({len(t['versions'])} versions): {desc}...")

    print("\n--- Sample Resonance Talents ---")
    for r in resonance_talents[:5]:
        desc = r.get('desc_en', '')[:80] if r.get('desc_en') else ''
        effect = f", round {r['effect_round']}" if r.get('effect_round') else ""
        print(f"  {r.get('name_en', '?')} (ID {r['id']}{effect}): {desc}...")


if __name__ == "__main__":
    main()
