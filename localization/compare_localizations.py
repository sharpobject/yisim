#!/usr/bin/env python3
"""
Compare two Localization.json files to find differences.

Useful for tracking changes between game versions.

Usage:
    python3 compare_localizations.py old.json new.json
"""

import json
import sys


def load_terms(filepath):
    """Load terms from a Localization.json file into a dict."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return {t['Term']: t for t in data['mSource']['mTerms']}


def compare(old_file, new_file):
    old_terms = load_terms(old_file)
    new_terms = load_terms(new_file)

    old_keys = set(old_terms.keys())
    new_keys = set(new_terms.keys())

    added = new_keys - old_keys
    removed = old_keys - new_keys
    common = old_keys & new_keys

    # Check for modified terms
    modified = []
    for key in common:
        old_langs = old_terms[key]['Languages']
        new_langs = new_terms[key]['Languages']
        if old_langs != new_langs:
            modified.append((key, old_langs, new_langs))

    print(f"Old file: {len(old_keys)} terms")
    print(f"New file: {len(new_keys)} terms")
    print(f"\nAdded: {len(added)}")
    print(f"Removed: {len(removed)}")
    print(f"Modified: {len(modified)}")

    if added and len(added) <= 50:
        print("\n=== Added Terms ===")
        for key in sorted(added):
            t = new_terms[key]
            print(f"  {key}: {t['Languages']}")

    if removed and len(removed) <= 50:
        print("\n=== Removed Terms ===")
        for key in sorted(removed):
            t = old_terms[key]
            print(f"  {key}: {t['Languages']}")

    if modified and len(modified) <= 50:
        print("\n=== Modified Terms ===")
        for key, old_langs, new_langs in sorted(modified):
            print(f"  {key}:")
            for i, (old, new) in enumerate(zip(old_langs, new_langs)):
                if old != new:
                    lang_name = ['CN', 'EN', 'TW'][i] if i < 3 else f'L{i}'
                    print(f"    [{lang_name}] '{old}' -> '{new}'")


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    compare(sys.argv[1], sys.argv[2])


if __name__ == "__main__":
    main()
