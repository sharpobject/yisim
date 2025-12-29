#!/usr/bin/env python3
"""
Download all assets from bundle 130 and search for configs.
"""

import requests
import urllib.parse
import json
import re
import os

BASE_URL = "http://127.0.0.1:53701"
OUTPUT_DIR = "bundle130_assets"

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

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Get collection HTML for bundle 130
    coll_path = {"B": {"P": [130]}, "I": 0}
    path_json = json.dumps(coll_path)
    path_encoded = urllib.parse.quote(path_json)
    url = f"{BASE_URL}/Collections/View?Path={path_encoded}"
    resp = requests.get(url)
    html = resp.text

    # Extract all path IDs
    pattern = r'"D":(-?\d+)'
    path_ids = re.findall(pattern, html)
    print(f"Found {len(path_ids)} assets in bundle 130")

    found_configs = {}

    for i, path_id in enumerate(path_ids):
        asset_path = {
            "C": {"B": {"P": [130]}, "I": 0},
            "D": int(path_id)
        }
        binary = get_asset_binary(asset_path)

        if not binary:
            continue

        # Check first 50 bytes for config name
        header = binary[:200]

        # Look for config patterns
        for term in [b'FateBranch', b'TalentConfig', b'KeYinCard', b'TalentResonance', b'CardConfig', b'SectTalent']:
            if term in header:
                # Extract the full config name
                start = header.find(term)
                if start >= 0:
                    # Find null terminator or end
                    end = start
                    while end < len(header) and header[end:end+1] != b'\x00' and header[end:end+1].isalnum():
                        end += 1
                    config_name = header[start:end].decode('utf-8', errors='ignore')
                    if config_name and len(config_name) > 5:
                        if config_name not in found_configs:
                            found_configs[config_name] = []
                            print(f"\n  FOUND: {config_name}")
                            print(f"    Path ID: {path_id}")
                            print(f"    Header: {header[:80]}")
                        found_configs[config_name].append({
                            'path_id': path_id,
                            'size': len(binary)
                        })

                        # Save the file
                        filename = f"{OUTPUT_DIR}/{config_name}_{path_id}.dat"
                        with open(filename, 'wb') as f:
                            f.write(binary)
                        print(f"    Saved to: {filename}")

        print(f"\rProcessed {i+1}/{len(path_ids)}...", end='', flush=True)

    print("\n\n=== FOUND CONFIGS ===")
    for name, locs in sorted(found_configs.items()):
        print(f"{name}: {len(locs)} occurrences")

if __name__ == "__main__":
    main()
