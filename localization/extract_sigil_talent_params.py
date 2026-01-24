#!/usr/bin/env python3
"""
Extract sigil and talent parameter data from game configs.

Usage:
    python3 extract_sigil_talent_params.py <version_folder>

Expects config .dat files in <version_folder>/:
    - KeYinCardConfig.dat (sigils)
    - TalentConfig.dat (immortal fates)
    - TalentResonanceConfig.dat (resonance talents)
    - SectTalentConfig.dat (sect talents)
    - TA18TalentConfig.dat (TA18 talents)
    - FateBranchConfig.dat (fate branches)
"""

import struct
import json
import sys
import os


def read_varint(data, pos):
    """Read a protobuf varint."""
    result = 0
    shift = 0
    while pos < len(data):
        b = data[pos]
        result |= (b & 0x7f) << shift
        pos += 1
        if (b & 0x80) == 0:
            break
        shift += 7
    return result, pos


def decode_entry(data):
    """Decode a single protobuf entry."""
    entry = {}
    pos = 0

    while pos < len(data):
        try:
            tag, pos = read_varint(data, pos)
            if tag == 0:
                break
            field_num = tag >> 3
            wire_type = tag & 0x7

            if wire_type == 0:  # varint
                val, pos = read_varint(data, pos)
                entry[f'field_{field_num}'] = val
            elif wire_type == 2:  # string/bytes
                length, pos = read_varint(data, pos)
                if length > 10000:
                    break
                val = data[pos:pos+length]
                pos += length

                if field_num == 2:  # name
                    try:
                        entry['name'] = val.decode('utf-8')
                    except:
                        pass
                elif field_num == 3:  # description
                    try:
                        entry['desc'] = val.decode('utf-8')
                    except:
                        pass
                elif field_num == 100:  # otherParams (cards, talents)
                    params = []
                    ppos = 0
                    while ppos < len(val):
                        pval, ppos = read_varint(val, ppos)
                        params.append(pval)
                    entry['otherParams'] = params
                elif field_num == 7:  # otherParams for FateBranchConfig
                    # Try to decode as packed varints
                    params = []
                    ppos = 0
                    try:
                        while ppos < len(val):
                            pval, ppos = read_varint(val, ppos)
                            params.append(pval)
                        if params:
                            entry['otherParams'] = params
                    except:
                        pass
                    # Also keep the string if readable
                    try:
                        decoded = val.decode('utf-8')
                        if decoded.isprintable():
                            entry[f'field_{field_num}'] = decoded
                    except:
                        pass
                else:
                    try:
                        decoded = val.decode('utf-8')
                        if decoded.isprintable():
                            entry[f'field_{field_num}'] = decoded
                    except:
                        pass
            elif wire_type == 5:  # 32-bit
                pos += 4
            else:
                pos += 1
        except:
            break

    return entry


def extract_config(filepath):
    """Extract entries from a config protobuf."""
    with open(filepath, 'rb') as f:
        data = f.read()

    # Skip Unity header
    header_len = struct.unpack('<I', data[0:4])[0]
    proto_start = 4 + header_len
    if header_len % 4 != 0:
        proto_start += 4 - (header_len % 4)

    proto = data[proto_start:]

    # Find entries
    entries = []
    pos = 0

    while pos < len(proto) - 10:
        if proto[pos] == 0x12:  # field 2 = embedded message
            try:
                msg_len, next_pos = read_varint(proto, pos + 1)
                if 10 < msg_len < 2000:
                    entry_data = proto[next_pos:next_pos + msg_len]
                    entry = decode_entry(entry_data)

                    if entry.get('field_1') or entry.get('name'):
                        entries.append(entry)
                        pos = next_pos + msg_len
                        continue
            except:
                pass
        pos += 1

    return entries


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    version = sys.argv[1]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    version_dir = os.path.join(script_dir, version)

    configs = {
        'KeYinCardConfig': 'sigil_params.json',
        'TalentConfig': 'talent_params.json',
        'TalentResonanceConfig': 'talent_resonance_params.json',
        'SectTalentConfig': 'sect_talent_params.json',
        'TA18TalentConfig': 'ta18_talent_params.json',
        'FateBranchConfig': 'fate_branch_params.json',
    }

    for config_name, output_name in configs.items():
        config_path = os.path.join(version_dir, f'{config_name}.dat')
        if not os.path.exists(config_path):
            print(f"Skipping {config_name} (not found at {config_path})")
            continue

        print(f"\nExtracting {config_name}...")
        entries = extract_config(config_path)
        print(f"  Found {len(entries)} entries")

        # Show sample
        with_params = [e for e in entries if 'otherParams' in e and e['otherParams']]
        print(f"  Entries with params: {len(with_params)}")

        if entries:
            print(f"  Sample: {entries[0]}")

        output_path = os.path.join(version_dir, output_name)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
        print(f"  Saved to: {output_path}")


if __name__ == "__main__":
    main()
