#!/usr/bin/env python3
"""
Extract Localization.json from YiXianPai Unity game bundles.

This script parses the binary I2 Localization data from Unity asset bundles
and outputs a JSON file in the standard I2 Localization format.

Usage:
    python3 extract_localization.py <binary_file> [output_file]

Example:
    python3 extract_localization.py /tmp/localization_binary.dat Localization.json
"""

import struct
import json
import sys
import os


class BinaryReader:
    """Helper class for reading Unity serialized binary data."""

    def __init__(self, data):
        self.data = data
        self.pos = 0

    def read_int(self):
        """Read a 4-byte little-endian integer."""
        val = struct.unpack('<I', self.data[self.pos:self.pos+4])[0]
        self.pos += 4
        return val

    def read_long(self):
        """Read an 8-byte little-endian integer."""
        val = struct.unpack('<q', self.data[self.pos:self.pos+8])[0]
        self.pos += 8
        return val

    def read_string(self):
        """Read a Unity serialized string (4-byte length prefix, 4-byte aligned)."""
        length = self.read_int()
        if length == 0:
            return ""
        s = self.data[self.pos:self.pos+length].decode('utf-8', errors='replace')
        self.pos += length
        # Align to 4 bytes
        if length % 4 != 0:
            self.pos += 4 - (length % 4)
        return s

    def read_string_array(self):
        """Read an array of strings."""
        count = self.read_int()
        return [self.read_string() for _ in range(count)]

    def read_byte_array(self):
        """Read an array of bytes."""
        count = self.read_int()
        arr = list(self.data[self.pos:self.pos+count])
        self.pos += count
        if count % 4 != 0:
            self.pos += 4 - (count % 4)
        return arr


def parse_localization_binary(data):
    """
    Parse I2 Localization binary data from Unity MonoBehaviour.

    The structure is:
    - m_GameObject (PPtr: FileID int32, PathID int64)
    - m_Enabled (int32)
    - m_Script (PPtr: FileID int32, PathID int64)
    - m_Name (string)
    - mSource.mOwner (PPtr: FileID int32, PathID int64)
    - mSource.mTerms (array of TermData)

    Each TermData contains:
    - Term (string) - the term key
    - TermType (int32)
    - Languages (string array) - translations [Chinese Simplified, English, Chinese Traditional]
    - Flags (byte array)
    - Languages_Touch (string array)
    """
    reader = BinaryReader(data)

    # Read header
    m_gameobject_fileid = reader.read_int()
    m_gameobject_pathid = reader.read_long()
    m_enabled = reader.read_int()
    m_script_fileid = reader.read_int()
    m_script_pathid = reader.read_long()
    m_name = reader.read_string()

    print(f"Asset name: {m_name}")

    # mSource structure - skip mOwner PPtr
    reader.read_int()   # mOwner.m_FileID
    reader.read_long()  # mOwner.m_PathID

    # Read mTerms array
    term_count = reader.read_int()
    print(f"Term count: {term_count}")

    terms = []
    for i in range(term_count):
        term_name = reader.read_string()
        term_type = reader.read_int()
        languages = reader.read_string_array()
        flags = reader.read_byte_array()
        languages_touch = reader.read_string_array()

        terms.append({
            "Term": term_name,
            "TermType": term_type,
            "Languages": languages,
            "Flags": flags,
            "Languages_Touch": languages_touch
        })

        if i < 3:
            print(f"  Term {i}: '{term_name}' -> {languages[:2]}...")

    # Build output structure
    output = {
        "m_GameObject": {"m_FileID": m_gameobject_fileid, "m_PathID": m_gameobject_pathid},
        "m_Enabled": m_enabled,
        "m_Script": {"m_FileID": m_script_fileid, "m_PathID": m_script_pathid},
        "m_Name": m_name,
        "mSource": {
            "mTerms": terms
        }
    }

    return output


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "Localization.json"

    print(f"Reading: {input_file}")
    with open(input_file, 'rb') as f:
        data = f.read()

    print(f"File size: {len(data) / 1024 / 1024:.2f} MB")

    result = parse_localization_binary(data)

    print(f"\nWriting: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Output size: {os.path.getsize(output_file) / 1024 / 1024:.2f} MB")
    print(f"Total terms: {len(result['mSource']['mTerms'])}")


if __name__ == "__main__":
    main()
