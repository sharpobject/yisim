#!/usr/bin/env python3
"""
Extract card data with otherParams from YiXianPai CardConfig.

This script parses the protobuf-encoded CardConfig binary and extracts
all cards with their parameter values.

Usage:
    python3 extract_card_params.py <cardconfig_binary> [output_json]

Example:
    python3 extract_card_params.py /tmp/CardConfig.dat cards.json
"""

import struct
import json
import sys
import os


def read_varint(data, pos):
    """Read a protobuf varint from data at position."""
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


def decode_card_entry(data):
    """Decode a single card entry from protobuf bytes."""
    card = {}
    pos = 0

    while pos < len(data):
        try:
            tag, pos = read_varint(data, pos)
            if tag == 0:
                break
            field_num = tag >> 3
            wire_type = tag & 0x7

            if wire_type == 0:  # Varint
                val, pos = read_varint(data, pos)
                card[f'field_{field_num}'] = val
            elif wire_type == 2:  # Length-delimited
                length, pos = read_varint(data, pos)
                if length > 10000:
                    break
                val = data[pos:pos+length]
                pos += length

                # Special handling for known fields
                if field_num == 1:  # Card ID (sometimes embedded)
                    try:
                        card['id'] = int.from_bytes(val[:4], 'little') if len(val) >= 4 else val[0]
                    except:
                        pass
                elif field_num == 2:  # Card name
                    try:
                        card['name'] = val.decode('utf-8')
                    except:
                        card['name'] = val.hex()
                elif field_num == 3:  # Description
                    try:
                        card['desc'] = val.decode('utf-8')
                    except:
                        card['desc'] = val.hex()
                elif field_num == 100:  # otherParams array
                    params = []
                    ppos = 0
                    while ppos < len(val):
                        pval, ppos = read_varint(val, ppos)
                        params.append(pval)
                    card['otherParams'] = params
                else:
                    try:
                        card[f'field_{field_num}'] = val.decode('utf-8')
                    except:
                        pass
            elif wire_type == 5:  # 32-bit float
                val = struct.unpack('<f', data[pos:pos+4])[0]
                pos += 4
                card[f'field_{field_num}_float'] = round(val, 4)
            else:
                pos += 1
        except:
            break

    return card


def extract_cards(filepath):
    """Extract all cards from CardConfig binary."""
    with open(filepath, 'rb') as f:
        data = f.read()

    # Skip Unity header (asset name)
    header_len = struct.unpack('<I', data[0:4])[0]
    proto_start = 4 + header_len
    if header_len % 4 != 0:
        proto_start += 4 - (header_len % 4)

    data = data[proto_start:]

    # Find all card entries
    cards = []
    pos = 0

    while pos < len(data) - 10:
        # Look for field 2 (embedded message) containing a card
        if data[pos] == 0x12:
            try:
                msg_len, next_pos = read_varint(data, pos + 1)
                if 30 < msg_len < 2000:  # Reasonable card size
                    card_data = data[next_pos:next_pos + msg_len]

                    # Check if it starts with field 1 (card ID)
                    if card_data[0] == 0x08:
                        card = decode_card_entry(card_data)

                        # Only keep cards with name and desc
                        if 'name' in card and 'desc' in card:
                            cards.append(card)
                            pos = next_pos + msg_len
                            continue
            except:
                pass
        pos += 1

    return cards


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'cards.json'

    print(f"Reading: {input_file}")
    cards = extract_cards(input_file)
    print(f"Extracted {len(cards)} cards")

    # Stats on otherParams
    cards_with_params = [c for c in cards if 'otherParams' in c and c['otherParams']]
    print(f"Cards with otherParams: {len(cards_with_params)}")

    # Group by param count
    by_count = {}
    for c in cards_with_params:
        count = len(c['otherParams'])
        by_count[count] = by_count.get(count, 0) + 1

    print("\nBy param count:")
    for count, num in sorted(by_count.items()):
        print(f"  {count} param(s): {num} cards")

    # Save ALL cards (not just those with params)
    print(f"\nSaving ALL {len(cards)} cards to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)

    print(f"Output size: {os.path.getsize(output_file) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
