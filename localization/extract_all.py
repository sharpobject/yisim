#!/usr/bin/env python3
"""
YiXianPai Game Data Extraction Script

Automates the complete extraction procedure from NOTE_FOR_CLAUDE.txt.
Requires AssetRipper to be running (auto-detects port).

Usage: python3 extract_all.py <version>
Example: python3 extract_all.py 1.5.8
"""

import sys
import os
import json
import subprocess
import re
import struct
import glob
import socket

try:
    import requests
except ImportError:
    print("Error: requests library required. Install with: pip3 install requests")
    sys.exit(1)

ASSETRIPPER_URL = None  # Will be auto-detected
BUNDLES_PATH = "/Users/sharpobject/Library/Application Support/Steam/steamapps/common/YiXianPai/YiXianPai.app/Contents/Resources/Data/StreamingAssets/aa/StandaloneOSX"

# Config files to download from bundle 130
CONFIG_FILES = [
    "CardConfig",
    "KeYinCardConfig",
    "TalentConfig",
    "TalentResonanceConfig",
    "SectTalentConfig",
    "TA18TalentConfig",
    "FateBranchConfig",
]

def find_assetripper_port():
    """Find the port AssetRipper is running on by checking ports 50000-60000"""
    # First check environment variable
    env_url = os.environ.get("ASSETRIPPER_URL")
    if env_url:
        try:
            resp = requests.get(f"{env_url}/", timeout=2)
            if resp.status_code == 200 and 'AssetRipper' in resp.text:
                return env_url
        except:
            pass

    # Use lsof to find listening ports on 127.0.0.1 in range 50000-60000
    try:
        result = subprocess.run(
            ["lsof", "-iTCP:50000-60000", "-sTCP:LISTEN", "-n", "-P"],
            capture_output=True, text=True, timeout=5
        )
        # Parse output to find ports
        ports = set()
        for line in result.stdout.split('\n'):
            # Match lines like: AssetRipp 12345 user   12u  IPv4 ... TCP 127.0.0.1:52854 (LISTEN)
            match = re.search(r'127\.0\.0\.1:(\d+)', line)
            if match:
                ports.add(int(match.group(1)))
    except:
        ports = set()

    # Also try netstat as fallback
    if not ports:
        try:
            result = subprocess.run(
                ["netstat", "-an", "-p", "tcp"],
                capture_output=True, text=True, timeout=5
            )
            for line in result.stdout.split('\n'):
                if 'LISTEN' in line and '127.0.0.1' in line:
                    match = re.search(r'127\.0\.0\.1\.(\d+)', line)
                    if match:
                        port = int(match.group(1))
                        if 50000 <= port <= 60000:
                            ports.add(port)
        except:
            pass

    # Check each port for AssetRipper
    for port in sorted(ports):
        url = f"http://127.0.0.1:{port}"
        try:
            resp = requests.get(f"{url}/", timeout=2)
            if resp.status_code == 200 and 'AssetRipper' in resp.text:
                return url
        except:
            continue

    return None

def check_assetripper():
    """Check if AssetRipper is running"""
    global ASSETRIPPER_URL
    if not ASSETRIPPER_URL:
        return False
    try:
        resp = requests.get(f"{ASSETRIPPER_URL}/", timeout=5)
        return resp.status_code == 200
    except:
        return False

def load_bundles_folder():
    """Load the bundles folder into AssetRipper"""
    print(f"  Loading: {BUNDLES_PATH}")
    try:
        resp = requests.post(
            f"{ASSETRIPPER_URL}/LoadFolder",
            data={"path": BUNDLES_PATH},
            timeout=300,  # Loading can take a while
            allow_redirects=False
        )
        # 302 redirect means success
        return resp.status_code == 302
    except Exception as e:
        print(f"  Error loading folder: {e}")
        return False

def get_bundle_count():
    """Get the number of bundles loaded"""
    try:
        # Get root bundles view with empty path
        root_path = json.dumps({"P": []})
        url = f"{ASSETRIPPER_URL}/Bundles/View?Path={requests.utils.quote(root_path)}"
        resp = requests.get(url, timeout=30)
        html = resp.text
        # Count bundle links
        bundle_count = len(re.findall(r'Bundles/View\?Path=', html))
        return bundle_count
    except Exception as e:
        print(f"Error getting bundle count: {e}")
        return 0

def find_config_bundle():
    """Find the bundle containing config TextAssets (bundle 130)"""
    print("  Searching for config bundle (89f98c60)...")

    # The config bundle is known to be 89f98c60da1a90cce630f5f0999c5909.bundle
    # This is typically bundle index 130, but we verify by checking a few candidates

    # Try known indices first
    for bundle_idx in [130, 129, 131, 128, 132]:
        coll_path = {"B": {"P": [bundle_idx]}, "I": 0}
        path_json = json.dumps(coll_path)
        url = f"{ASSETRIPPER_URL}/Collections/View?Path={requests.utils.quote(path_json)}"

        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code == 200:
                # Check if this bundle has CardConfig
                if 'CardConfig' in resp.text or 'TalentConfig' in resp.text:
                    print(f"    Found config bundle at index {bundle_idx}")
                    return bundle_idx
        except:
            continue

    print("    Warning: Could not find config bundle, using default 130")
    return 130

def download_configs_from_bundle(bundle_idx, version_dir):
    """Download config .dat files from a bundle"""
    print(f"  Downloading configs from bundle {bundle_idx}...")

    # Get collection HTML for the bundle
    # Path format: {"B":{"P":[bundle_idx]},"I":0}
    coll_path = {"B": {"P": [bundle_idx]}, "I": 0}
    path_json = json.dumps(coll_path)
    url = f"{ASSETRIPPER_URL}/Collections/View?Path={requests.utils.quote(path_json)}"

    resp = requests.get(url, timeout=60)
    if resp.status_code != 200:
        print(f"    Error: Could not access bundle {bundle_idx}")
        return False

    html = resp.text

    # Extract all asset path links
    asset_pattern = r'Assets/View\?Path=([^"]+)"[^>]*>([^<]+)</a>'
    assets = re.findall(asset_pattern, html)
    print(f"    Found {len(assets)} assets in bundle")

    downloaded = {}

    for i, (asset_path_enc, asset_name) in enumerate(assets):
        # Download binary
        url = f"{ASSETRIPPER_URL}/Assets/Binary?Path={asset_path_enc}"
        resp = requests.get(url, timeout=60)
        binary = resp.content

        if not binary or len(binary) < 10:
            continue

        # Check if this is a config file
        try:
            name_len = struct.unpack('<I', binary[0:4])[0]
            if 5 < name_len < 100:
                name = binary[4:4+name_len].decode('utf-8', errors='ignore')
                # Check if it's one of our needed configs
                for config_name in CONFIG_FILES:
                    if name == config_name:
                        output_file = os.path.join(version_dir, f"{config_name}.dat")
                        with open(output_file, 'wb') as f:
                            f.write(binary)
                        downloaded[config_name] = len(binary)
                        print(f"    ✓ {config_name}.dat ({len(binary):,} bytes)")
                        break
        except:
            pass

        # Progress indicator
        if (i + 1) % 20 == 0:
            print(f"    Scanned {i+1}/{len(assets)} assets...", end='\r')

    print(f"    Downloaded {len(downloaded)} config files")

    # Check if we got everything
    missing = [c for c in CONFIG_FILES if c not in downloaded]
    if missing:
        print(f"    Warning: Missing configs: {missing}")

    return len(downloaded) > 0

def find_and_download_i2(version_dir):
    """Find and download the I2Languages localization binary"""
    print("  Searching for I2Languages MonoBehaviour...")

    # First, find the bundle on disk that contains LanguageSource
    bundle_files = glob.glob(os.path.join(BUNDLES_PATH, '*.bundle'))
    i2_bundle_hash = None

    for bundle_path in bundle_files:
        try:
            with open(bundle_path, 'rb') as f:
                content = f.read(200000)
            if b'LanguageSource' in content:
                i2_bundle_hash = os.path.basename(bundle_path).replace('.bundle', '')
                print(f"    Found on disk: {i2_bundle_hash}.bundle")
                break
        except:
            continue

    if not i2_bundle_hash:
        print("    Error: Could not find I2Languages bundle on disk")
        return False

    # Get root bundles view to find the index of this bundle
    root_path = json.dumps({"P": []})
    resp = requests.get(f"{ASSETRIPPER_URL}/Bundles/View?Path={requests.utils.quote(root_path)}", timeout=30)
    html = resp.text

    # Find the bundle index by looking for the hash
    bundle_pattern = r'Bundles/View\?Path=%7B%22P%22%3A%5B(\d+)%5D%7D"[^>]*>[^<]*' + i2_bundle_hash[:8]
    match = re.search(bundle_pattern, html)

    if not match:
        # Try a different approach - search table rows
        row_pattern = r'<tr[^>]*>.*?Bundles/View\?Path=%7B%22P%22%3A%5B(\d+)%5D%7D.*?' + i2_bundle_hash[:16]
        match = re.search(row_pattern, html, re.DOTALL)

    if not match:
        # Fallback: try bundle 0 which is often the first
        print("    Warning: Could not find bundle index, trying bundle 0...")
        bundle_idx = 0
    else:
        bundle_idx = int(match.group(1))

    print(f"    Checking bundle {bundle_idx} for MonoBehaviour assets...")

    # Get collection for this bundle
    coll_path = {"B": {"P": [bundle_idx]}, "I": 0}
    path_json = json.dumps(coll_path)
    url = f"{ASSETRIPPER_URL}/Collections/View?Path={requests.utils.quote(path_json)}"

    resp = requests.get(url, timeout=30)
    if resp.status_code != 200:
        print(f"    Error: Could not access bundle {bundle_idx}")
        return False

    bundle_html = resp.text

    # Find all MonoBehaviour assets
    asset_pattern = r'Assets/View\?Path=([^"]+)"[^>]*>([^<]*MonoBehaviour[^<]*)</a>'
    assets = re.findall(asset_pattern, bundle_html)

    if not assets:
        # Try getting all assets
        asset_pattern = r'Assets/View\?Path=([^"]+)"[^>]*>([^<]+)</a>'
        assets = re.findall(asset_pattern, bundle_html)

    print(f"    Found {len(assets)} assets, downloading to find localization...")

    largest_size = 0
    largest_binary = None

    for i, (asset_path_enc, asset_name) in enumerate(assets):
        if (i + 1) % 50 == 0:
            print(f"    Checked {i+1}/{len(assets)} assets...", end='\r')

        # Download binary
        url = f"{ASSETRIPPER_URL}/Assets/Binary?Path={asset_path_enc}"
        try:
            resp = requests.get(url, timeout=60)
            binary = resp.content
        except:
            continue

        if not binary:
            continue

        # Check for I2 localization signature
        if len(binary) > largest_size:
            # Check if this looks like localization data
            if b'SimplifiedChinese' in binary or b'mTerms' in binary or b'English' in binary:
                largest_size = len(binary)
                largest_binary = binary

    print()  # Clear progress line

    if largest_binary and largest_size > 100000:
        output_file = os.path.join(version_dir, "localization_binary.dat")
        with open(output_file, 'wb') as f:
            f.write(largest_binary)
        print(f"    ✓ localization_binary.dat ({largest_size:,} bytes)")
        return True

    print("    Error: Could not find I2Languages binary")
    return False

def run_extraction_scripts(version_dir):
    """Run all extraction scripts in order"""
    script_dir = os.path.dirname(os.path.abspath(__file__))

    scripts = [
        ("extract_localization.py", [f"{version_dir}/localization_binary.dat", f"{version_dir}/Localization.json"]),
        ("extract_card_params.py", [f"{version_dir}/CardConfig.dat", f"{version_dir}/cards_with_params.json"]),
        ("extract_sigil_talent_params.py", [version_dir]),
        ("extract_talents_sigils.py", [version_dir]),
        ("extract_fate_branches.py", [version_dir]),
        ("extract_mirages.py", [version_dir]),
        ("combine_card_data.py", [version_dir]),
        ("classify_cards.py", [version_dir]),
        ("generate_card_csv.py", [version_dir]),
    ]

    for script, args in scripts:
        script_path = os.path.join(script_dir, script)
        if not os.path.exists(script_path):
            print(f"  Warning: {script} not found, skipping")
            continue

        # Check if required input files exist
        if script == "extract_localization.py":
            if os.path.exists(f"{version_dir}/Localization.json"):
                print(f"  Skipping {script} (Localization.json already exists)")
                continue
            if not os.path.exists(f"{version_dir}/localization_binary.dat"):
                print(f"  Skipping {script} (no localization_binary.dat)")
                continue

        print(f"  Running {script}...")
        cmd = ["python3", script_path] + args
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=script_dir)

        if result.returncode != 0:
            print(f"    Error: {result.stderr[:500]}")
            # Continue with other scripts
        else:
            # Print abbreviated output
            stdout_lines = [l for l in result.stdout.strip().split('\n') if l]
            for line in stdout_lines[:5]:
                print(f"    {line}")
            if len(stdout_lines) > 5:
                print(f"    ... ({len(stdout_lines) - 5} more lines)")

    return True

def check_existing_files(version_dir):
    """Check which required files already exist"""
    existing = []
    missing = []

    loc_binary = os.path.join(version_dir, "localization_binary.dat")
    loc_json = os.path.join(version_dir, "Localization.json")
    if os.path.exists(loc_json):
        existing.append("Localization.json")
    elif os.path.exists(loc_binary):
        existing.append("localization_binary.dat")
    else:
        missing.append("localization_binary.dat")

    for config in CONFIG_FILES:
        config_file = os.path.join(version_dir, f"{config}.dat")
        if os.path.exists(config_file):
            existing.append(f"{config}.dat")
        else:
            missing.append(f"{config}.dat")

    return existing, missing

def main():
    global ASSETRIPPER_URL

    if len(sys.argv) < 2:
        print("Usage: python3 extract_all.py <version>")
        print("Example: python3 extract_all.py 1.5.8")
        print("\nThis script will:")
        print("  1. Check if required files exist in the version folder")
        print("  2. If not, auto-detect AssetRipper and download them")
        print("  3. Run all extraction scripts to generate JSON files")
        print("\nSet ASSETRIPPER_URL env var to override auto-detection")
        sys.exit(1)

    version = sys.argv[1]
    script_dir = os.path.dirname(os.path.abspath(__file__)) or "."
    version_dir = os.path.join(script_dir, version)

    print(f"=== YiXianPai Data Extraction v{version} ===\n")

    # Step 1: Create version folder if needed
    print(f"Step 1: Version folder")
    if not os.path.exists(version_dir):
        os.makedirs(version_dir)
        print(f"  Created: {version_dir}")
    else:
        print(f"  Exists: {version_dir}")

    # Step 2: Check for existing files
    print("\nStep 2: Checking for existing files...")
    existing, missing = check_existing_files(version_dir)

    if existing:
        print(f"  Found: {', '.join(existing)}")
    if missing:
        print(f"  Missing: {', '.join(missing)}")

    # Step 3: Download missing files if needed
    if missing:
        print("\nStep 3: Downloading missing files from AssetRipper...")

        # Find AssetRipper
        print("  Looking for AssetRipper...")
        ASSETRIPPER_URL = find_assetripper_port()

        if not ASSETRIPPER_URL:
            print("\n  ERROR: AssetRipper is not running!")
            print("  Please start AssetRipper GUI first, then run this script again.")
            print(f"\n  (AssetRipper will auto-load: {BUNDLES_PATH})")
            sys.exit(1)

        print(f"  Found AssetRipper at: {ASSETRIPPER_URL}")

        # Check if bundles are loaded
        bundle_count = get_bundle_count()
        if bundle_count == 0:
            print("  No bundles loaded, loading now...")
            if not load_bundles_folder():
                print("  ERROR: Failed to load bundles folder!")
                sys.exit(1)
            bundle_count = get_bundle_count()
            if bundle_count == 0:
                print("  ERROR: Still no bundles after loading!")
                sys.exit(1)

        print(f"  {bundle_count} bundles loaded")

        # Download config files if any missing
        config_missing = [m for m in missing if m.endswith('.dat') and m != 'localization_binary.dat']
        if config_missing:
            config_bundle = find_config_bundle()
            download_configs_from_bundle(config_bundle, version_dir)

        # Download I2 localization if missing
        if 'localization_binary.dat' in missing:
            find_and_download_i2(version_dir)
    else:
        print("\nStep 3: All required files exist, skipping download")

    # Step 4: Run extraction scripts
    print("\nStep 4: Running extraction scripts...")

    # Check minimum required files
    loc_json = os.path.join(version_dir, "Localization.json")
    loc_binary = os.path.join(version_dir, "localization_binary.dat")
    if not os.path.exists(loc_json) and not os.path.exists(loc_binary):
        print(f"  ERROR: Need Localization.json or localization_binary.dat")
        sys.exit(1)

    run_extraction_scripts(version_dir)

    # Step 5: Summary
    print("\n=== Extraction complete! ===")
    print(f"\nOutput files in {version_dir}/:")

    try:
        for f in sorted(os.listdir(version_dir)):
            if f.endswith('.json'):
                size = os.path.getsize(os.path.join(version_dir, f))
                print(f"  {f}: {size:,} bytes")
    except Exception as e:
        print(f"  Error listing files: {e}")

if __name__ == "__main__":
    main()
