#!/usr/bin/env python3
"""
Download ALL assets from bundle 130 (89f98c60).
"""

import requests
import urllib.parse
import json
import re
import os

BASE_URL = "http://127.0.0.1:53701"
OUTPUT_DIR = "bundle130_configs"

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Get collection HTML for bundle 130
    coll_path = {"B": {"P": [130]}, "I": 0}
    path_json = json.dumps(coll_path)
    path_encoded = urllib.parse.quote(path_json)
    url = f"{BASE_URL}/Collections/View?Path={path_encoded}"
    resp = requests.get(url, timeout=60)
    html = resp.text

    # Extract all asset path links
    # Pattern: Assets/View?Path=...
    asset_pattern = r'Assets/View\?Path=([^"]+)"[^>]*>([^<]+)</a>'
    assets = re.findall(asset_pattern, html)
    print(f"Found {len(assets)} assets in bundle 130")

    found_configs = {}

    for i, (asset_path_enc, asset_name) in enumerate(assets):
        # Download binary
        url = f"{BASE_URL}/Assets/Binary?Path={asset_path_enc}"
        resp = requests.get(url, timeout=60)
        binary = resp.content

        if not binary:
            continue

        # Save the file
        safe_name = re.sub(r'[^\w\-_]', '_', asset_name)
        filename = f"{OUTPUT_DIR}/{safe_name}.bin"
        with open(filename, 'wb') as f:
            f.write(binary)

        # Check for config pattern - look for "Config" in header
        header = binary[:100]
        if b'Config' in header or b'2.9.1' in header[:50]:
            # Extract name
            try:
                import struct
                name_len = struct.unpack('<I', binary[0:4])[0]
                if 5 < name_len < 100:
                    name = binary[4:4+name_len].decode('utf-8', errors='ignore')
                    print(f"  CONFIG: {name} -> {filename}")
                    found_configs[name] = filename
            except:
                pass

        print(f"\rDownloaded {i+1}/{len(assets)}...", end='', flush=True)

    print(f"\n\n=== Found {len(found_configs)} config files ===")
    for name, path in sorted(found_configs.items()):
        print(f"  {name}: {path}")

if __name__ == "__main__":
    main()
