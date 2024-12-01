import os
import json
from pathlib import Path

# Load the JSON file
with open('../swogi.json') as f:
    swogi_data = json.load(f)

# Get card IDs from JSON (truncating last digit)
json_ids = {key[:-1] for key in swogi_data.keys()}

# Get PNG files from en_in directory
png_ids = set()
for filename in os.listdir('en_in'):
    if filename.endswith('.png') and len(filename) == 9:  # 5 digits + .png
        card_id = filename[:5]
        png_ids.add(card_id)

not_implemented_ids = []
for k in swogi_data.keys():
    v = swogi_data[k]
    if "does_not_exist" in v:
        continue
    if "actions" not in v:
        not_implemented_ids.append(k)
    elif len(v["actions"]) == 0:
        not_implemented_ids.append(k)

# Find mismatches
png_only = png_ids - json_ids
json_only = json_ids - png_ids

# Print results
print("Cards not implemented:")
for card_id in sorted(not_implemented_ids):
    card_name = swogi_data[card_id[:-1]+"1"]["name"]
    print(f"  {card_id} {card_name}")

print("\nCards with PNG but no JSON entries:")
for card_id in sorted(png_only):
    print(f"  {card_id}")

print("\nCards with JSON but no PNG files:")
json_only = [x for x in json_only if x[0:2] != "80"]
for card_id in sorted(json_only):
    xd = swogi_data[card_id+"1"]["name"]
    print(f"  {card_id} {xd}")

print("\nSummary:")
print(f"Total PNG files: {len(png_ids)}")
print(f"Total JSON entries: {len(json_ids)}")
print(f"Not implemented: {len(not_implemented_ids)}")
print(f"PNG-only entries: {len(png_only)}")
print(f"JSON-only entries: {len(json_only)}")
