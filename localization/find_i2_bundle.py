#!/usr/bin/env python3
"""
Find the Unity asset bundle containing I2 Localization data.

This script searches through all .bundle files in a directory for the one
containing I2Languages/LanguageSource data.

Usage:
    python3 find_i2_bundle.py [bundle_directory]

Default directory:
    YiXianPai_beta.app/Contents/Resources/Data/StreamingAssets/aa/StandaloneOSX
"""

import os
import sys
import glob


def find_i2_bundles(bundle_dir):
    """Find all bundles containing I2 Localization markers."""
    results = []

    bundle_files = glob.glob(os.path.join(bundle_dir, '*.bundle'))
    print(f"Scanning {len(bundle_files)} bundle files...")

    for bundle_path in bundle_files:
        try:
            with open(bundle_path, 'rb') as f:
                content = f.read()

            markers = {
                'I2Languages': b'I2Languages' in content,
                'LanguageSource': b'LanguageSource' in content,
                'mTerms': b'mTerms' in content,
            }

            if markers['I2Languages'] or markers['LanguageSource']:
                size_mb = len(content) / 1024 / 1024
                basename = os.path.basename(bundle_path)
                results.append({
                    'path': bundle_path,
                    'basename': basename,
                    'size_mb': size_mb,
                    'markers': markers
                })
                print(f"  Found: {basename} ({size_mb:.2f} MB)")
                print(f"    Markers: {[k for k,v in markers.items() if v]}")

        except Exception as e:
            print(f"  Error reading {os.path.basename(bundle_path)}: {e}")

    return results


def main():
    # Default paths to check
    default_paths = [
        "/Users/sharpobject/Library/Application Support/Steam/steamapps/common/YiXianPai_beta/YiXianPai_beta.app/Contents/Resources/Data/StreamingAssets/aa/StandaloneOSX",
        "/Users/sharpobject/Library/Application Support/Steam/steamapps/common/YiXianPai/YiXianPai.app/Contents/Resources/Data/StreamingAssets/aa/StandaloneOSX",
    ]

    if len(sys.argv) > 1:
        bundle_dir = sys.argv[1]
    else:
        # Try default paths
        bundle_dir = None
        for path in default_paths:
            if os.path.isdir(path):
                bundle_dir = path
                break

        if not bundle_dir:
            print("Usage: python3 find_i2_bundle.py <bundle_directory>")
            print("\nDefault paths not found:")
            for p in default_paths:
                print(f"  {p}")
            sys.exit(1)

    print(f"Searching in: {bundle_dir}\n")

    results = find_i2_bundles(bundle_dir)

    if results:
        print(f"\nFound {len(results)} bundle(s) with I2 Localization data:")
        for r in results:
            print(f"  {r['basename']} ({r['size_mb']:.2f} MB)")

        # The largest one with I2Languages marker is likely the main localization
        main_bundle = max(
            [r for r in results if r['markers']['I2Languages']],
            key=lambda x: x['size_mb'],
            default=None
        )
        if main_bundle:
            print(f"\nMain localization bundle (largest with I2Languages):")
            print(f"  {main_bundle['path']}")
    else:
        print("\nNo I2 Localization bundles found.")


if __name__ == "__main__":
    main()
