#!/usr/bin/env python3
"""
Search all bundles for FateBranchConfig, TalentConfig, KeYinCardConfig.
"""

import requests
import urllib.parse
import json
import re
import os

BASE_URL = "http://127.0.0.1:53701"
SEARCH_TERMS = [b'FateBranchConfig', b'TalentConfig', b'KeYinCardConfig', b'TalentResonanceConfig']

def get_asset_binary(path_obj):
    """Get binary data for an asset."""
    path_json = json.dumps(path_obj)
    path_encoded = urllib.parse.quote(path_json)
    url = f"{BASE_URL}/Assets/Binary?Path={path_encoded}"
    try:
        resp = requests.get(url, timeout=30)
        return resp.content
    except Exception as e:
        return b""

def get_collection_html(path_obj):
    """Get HTML for a collection."""
    path_json = json.dumps(path_obj)
    path_encoded = urllib.parse.quote(path_json)
    url = f"{BASE_URL}/Collections/View?Path={path_encoded}"
    try:
        resp = requests.get(url, timeout=30)
        return resp.text
    except Exception as e:
        return ""

def extract_asset_paths(html, bundle_idx, collection_idx):
    """Extract asset path IDs from collection HTML."""
    # Pattern: Path={"C":{"B":{"P":[N]},"I":M},"D":PATHID}
    pattern = r'"D":(-?\d+)'
    matches = re.findall(pattern, html)
    paths = []
    for path_id in matches:
        paths.append({
            "C": {"B": {"P": [bundle_idx]}, "I": collection_idx},
            "D": int(path_id)
        })
    return paths

def search_bundle(bundle_idx, bundle_name, found):
    """Search a bundle for config files."""
    # Get collections in bundle
    bundle_path = {"P": [bundle_idx]}
    path_json = json.dumps(bundle_path)
    path_encoded = urllib.parse.quote(path_json)
    url = f"{BASE_URL}/Bundles/View?Path={path_encoded}"

    try:
        resp = requests.get(url, timeout=30)
        bundle_html = resp.text
    except:
        return

    # Find collection indices (I values)
    coll_pattern = r'"I":(\d+)'
    collections = list(set(re.findall(coll_pattern, bundle_html)))

    for coll_idx in collections[:5]:  # Limit collections to check
        coll_idx = int(coll_idx)
        coll_path = {"B": {"P": [bundle_idx]}, "I": coll_idx}
        coll_html = get_collection_html(coll_path)

        if 'TextAsset' not in coll_html:
            continue

        # Extract asset paths
        asset_paths = extract_asset_paths(coll_html, bundle_idx, coll_idx)

        for asset_path in asset_paths[:200]:  # Limit assets to check
            try:
                binary = get_asset_binary(asset_path)
                if not binary:
                    continue

                for term in SEARCH_TERMS:
                    if term in binary:
                        # Found! Extract the config name
                        config_name = term.decode('utf-8')
                        if config_name not in found:
                            found[config_name] = []
                        found[config_name].append({
                            'bundle': bundle_name,
                            'bundle_idx': bundle_idx,
                            'path': asset_path,
                            'binary_preview': binary[:100].hex()
                        })
                        print(f"\n  FOUND {config_name} in {bundle_name}!")
                        print(f"    Path: {asset_path}")
                        print(f"    Preview: {binary[:60]}")
            except Exception as e:
                pass

def main():
    print("Fetching bundle list...")
    resp = requests.get(f"{BASE_URL}/Bundles/View?Path=%7B%22P%22%3A%5B%5D%7D")
    root_html = resp.text

    # Extract bundle names
    bundle_pattern = r'Path=%7B%22P%22%3A%5B(\d+)%5D%7D"[^>]*>([^<]+)</a>'
    bundles = re.findall(bundle_pattern, root_html)
    print(f"Found {len(bundles)} bundles\n")

    found = {}

    # First check bundle 130 (89f98c60) which we know has configs
    print("Checking bundle 130 (89f98c60) first...")
    for idx, name in bundles:
        if '89f98c60' in name:
            search_bundle(int(idx), name, found)
            break

    if not found:
        print("\nSearching all bundles...")
        for idx_str, name in bundles:
            idx = int(idx_str)
            print(f"\rSearching bundle {idx}: {name[:40]}...", end='', flush=True)
            search_bundle(idx, name, found)
            if found and all(term.decode() in found for term in SEARCH_TERMS):
                break

    print("\n\n=== RESULTS ===")
    for config_name, locations in sorted(found.items()):
        print(f"\n{config_name}:")
        for loc in locations:
            print(f"  Bundle: {loc['bundle']}")
            print(f"  Path: {loc['path']}")

    # Save results
    with open('config_search_results.json', 'w') as f:
        json.dump(found, f, indent=2, default=str)
    print(f"\nSaved to config_search_results.json")

if __name__ == "__main__":
    main()
