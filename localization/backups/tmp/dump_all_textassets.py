#!/usr/bin/env python3
"""
Download ALL TextAsset binaries from ALL bundles.
"""

import requests
import urllib.parse
import json
import re
import os

BASE_URL = "http://127.0.0.1:53701"
OUTPUT_DIR = "all_textassets"

def get_asset_binary(path_encoded):
    """Get binary data for an asset."""
    url = f"{BASE_URL}/Assets/Binary?Path={path_encoded}"
    try:
        resp = requests.get(url, timeout=60)
        return resp.content
    except Exception as e:
        return b""

def get_html(url):
    try:
        resp = requests.get(url, timeout=60)
        return resp.text
    except:
        return ""

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Get all bundles
    print("Getting bundle list...")
    root_html = get_html(f"{BASE_URL}/Bundles/View?Path=%7B%22P%22%3A%5B%5D%7D")
    bundle_pattern = r'Path=(%7B%22P%22%3A%5B\d+%5D%7D)"[^>]*>([^<]+)</a>'
    bundles = re.findall(bundle_pattern, root_html)
    print(f"Found {len(bundles)} bundles")

    total_downloaded = 0
    found_configs = {}

    for bundle_path_enc, bundle_name in bundles:
        print(f"\n--- Bundle: {bundle_name} ---")

        # Get bundle page to find collections
        bundle_html = get_html(f"{BASE_URL}/Bundles/View?Path={bundle_path_enc}")

        # Find collection links
        coll_pattern = r'Collections/View\?Path=([^"]+)"'
        collections = re.findall(coll_pattern, bundle_html)

        for coll_path_enc in collections:
            # Get collection page
            coll_html = get_html(f"{BASE_URL}/Collections/View?Path={coll_path_enc}")

            # Only process if has TextAsset
            if 'TextAsset' not in coll_html:
                continue

            # Find all asset paths
            asset_pattern = r'Assets/View\?Path=([^"]+)"[^>]*>([^<]+)</a>'
            assets = re.findall(asset_pattern, coll_html)

            for asset_path_enc, asset_name in assets:
                # Download binary
                binary = get_asset_binary(asset_path_enc)
                if not binary:
                    continue

                # Save with bundle name prefix
                safe_name = re.sub(r'[^\w\-_]', '_', f"{bundle_name[:20]}_{asset_name}")
                filename = f"{OUTPUT_DIR}/{safe_name}.bin"
                with open(filename, 'wb') as f:
                    f.write(binary)
                total_downloaded += 1

                # Check for known configs
                header = binary[:100]
                for term in [b'FateBranch', b'TalentConfig', b'KeYinCard', b'TalentResonance',
                            b'CardConfig', b'SectTalent', b'TA18Talent']:
                    if term in header:
                        # Find end of name
                        start = header.find(term)
                        end = start
                        while end < len(header) and header[end:end+1] not in [b'\x00', b' ']:
                            end += 1
                        name = header[start:end].decode('utf-8', errors='ignore')
                        if name not in found_configs:
                            found_configs[name] = filename
                            print(f"  FOUND CONFIG: {name} -> {filename}")

                print(f"\r  Downloaded {total_downloaded} assets...", end='', flush=True)

    print(f"\n\n=== DONE ===")
    print(f"Total downloaded: {total_downloaded}")
    print(f"\nFound configs:")
    for name, path in sorted(found_configs.items()):
        print(f"  {name}: {path}")

if __name__ == "__main__":
    main()
