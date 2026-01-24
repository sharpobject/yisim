#!/usr/bin/env python3
"""
Search all bundles for MonoBehaviour assets containing 'proto.' strings.
Uses AssetRipper API to access decrypted assets.
"""

import requests
import urllib.parse
import json
import re
import sys

BASE_URL = "http://127.0.0.1:53701"

def get_collections(path_obj):
    """Get collections at a path."""
    path_json = json.dumps(path_obj)
    path_encoded = urllib.parse.quote(path_json)
    url = f"{BASE_URL}/Collections/View?Path={path_encoded}"
    try:
        resp = requests.get(url, timeout=30)
        return resp.text
    except Exception as e:
        print(f"Error: {e}")
        return ""

def get_asset_binary(path_obj):
    """Get binary data for an asset."""
    path_json = json.dumps(path_obj)
    path_encoded = urllib.parse.quote(path_json)
    url = f"{BASE_URL}/Assets/Binary?Path={path_encoded}"
    try:
        resp = requests.get(url, timeout=30)
        return resp.content
    except Exception as e:
        print(f"Error getting binary: {e}")
        return b""

def extract_paths_from_html(html):
    """Extract asset paths from HTML links."""
    # Look for paths like {"B":{"P":[N]},"I":M}
    pattern = r'Path=([^"&]+)'
    matches = re.findall(pattern, html)
    paths = []
    for match in matches:
        try:
            decoded = urllib.parse.unquote(match)
            path_obj = json.loads(decoded)
            paths.append(path_obj)
        except:
            pass
    return paths

def search_bundle(bundle_idx, bundle_name, results):
    """Search a bundle for proto strings."""
    # Get the bundle's collections
    bundle_path = {"P": [bundle_idx]}
    html = get_collections(bundle_path)

    if not html:
        return

    # Extract collection paths
    coll_paths = extract_paths_from_html(html)

    for coll_path in coll_paths:
        # Check if this is a MonoBehaviour collection
        coll_html = get_collections(coll_path)
        if 'MonoBehaviour' not in coll_html:
            continue

        # Get assets in this collection
        asset_paths = extract_paths_from_html(coll_html)

        for asset_path in asset_paths[:500]:  # Limit to avoid too many requests
            try:
                binary = get_asset_binary(asset_path)
                if b'proto.' in binary:
                    # Find all proto.* strings
                    proto_matches = re.findall(b'proto\\.([A-Za-z0-9_]+)', binary)
                    for match in proto_matches:
                        config_name = f"proto.{match.decode('utf-8', errors='ignore')}"
                        if config_name not in results:
                            results[config_name] = []
                        results[config_name].append({
                            'bundle': bundle_name,
                            'bundle_idx': bundle_idx,
                            'path': asset_path
                        })
                        print(f"  Found: {config_name} in bundle {bundle_name}")
            except Exception as e:
                pass

def main():
    print("Fetching bundle list...")
    root_html = requests.get(f"{BASE_URL}/Bundles/View?Path=%7B%22P%22%3A%5B%5D%7D").text

    # Extract bundle names
    bundle_pattern = r'Path=%7B%22P%22%3A%5B(\d+)%5D%7D"[^>]*>([^<]+)</a>'
    bundles = re.findall(bundle_pattern, root_html)
    print(f"Found {len(bundles)} bundles")

    results = {}

    # Check specific bundles first (the ones we know might have configs)
    priority_bundles = []
    for idx, name in bundles:
        if '89f98c60' in name or '256e0314' in name:
            priority_bundles.append((int(idx), name))

    print(f"\nChecking priority bundles first: {[n for _, n in priority_bundles]}")

    for idx, name in priority_bundles:
        print(f"\nSearching bundle {idx}: {name}")
        search_bundle(idx, name, results)

    # Now check all bundles
    print(f"\nSearching all {len(bundles)} bundles...")
    for idx_str, name in bundles:
        idx = int(idx_str)
        if any(idx == pi for pi, _ in priority_bundles):
            continue  # Already searched
        print(f"\rSearching bundle {idx}: {name[:30]}...", end='', flush=True)
        search_bundle(idx, name, results)

    print("\n\n=== RESULTS ===")
    for config_name, locations in sorted(results.items()):
        print(f"\n{config_name}:")
        for loc in locations[:3]:
            print(f"  - Bundle: {loc['bundle']}")

    # Save results
    with open('proto_search_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nSaved to proto_search_results.json")

if __name__ == "__main__":
    main()
