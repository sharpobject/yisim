import json

def load_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        return json.load(file)

def check_json_files(swogi_path, names_path):
    # Load both JSON files
    swogi_data = load_json(swogi_path)
    names_data = load_json(names_path)

    # Convert names_data to a dictionary for easier lookup
    names_dict = {str(item['id']): item for item in names_data}

    # Lists to store results
    missing_from_names = []
    incomplete_entries = []
    name_mismatches = []
    missing_base_cards = []
    missing_or_empty_actions = []  # New list for cards with missing/empty actions

    # Track base card IDs (ending in "1")
    base_card_ids = set()
    non_base_card_ids = set()

    # First pass: identify all card IDs
    for card_id in swogi_data.keys():
        if card_id.endswith("1"):
            base_card_ids.add(card_id[:-1])  # Store the prefix without the last digit
        else:
            non_base_card_ids.add(card_id[:-1])  # Store the prefix without the last digit

    # Find non-base cards that don't have a corresponding base card
    for prefix in non_base_card_ids:
        if prefix not in base_card_ids:
            missing_base_cards.append(f"{prefix}1")

    # Second pass: check for issues with base cards
    for card_id, card_data in swogi_data.items():
        # Only process cards ending in "1"
        if not card_id.endswith("1"):
            continue

        # Check if card exists in names.json
        if card_id not in names_dict:
            # Report all missing cards, even those without names
            missing_from_names.append({
                'id': card_id,
                'name': card_data.get('name', f"ID: {card_id}")  # Use ID if name not present
            })
        else:
            # Check if name and namecn both exist in names.json
            names_entry = names_dict[card_id]
            if not ('name' in names_entry and 'namecn' in names_entry):
                incomplete_entries.append({
                    'id': card_id,
                    'missing_fields': [field for field in ['name', 'namecn'] if field not in names_entry]
                })

            # Check if the name in swogi.json matches the name in names.json
            if 'name' in card_data and 'name' in names_entry and card_data['name'] != names_entry['name']:
                name_mismatches.append({
                    'id': card_id,
                    'swogi_name': card_data['name'],
                    'names_name': names_entry['name']
                })

        # Check for missing or empty actions (only for cards without "does_not_exist")
        if 'does_not_exist' not in card_data:
            if 'actions' not in card_data or (isinstance(card_data.get('actions'), list) and len(card_data['actions']) == 0):
                missing_or_empty_actions.append({
                    'id': card_id,
                    'name': card_data.get('name', f"ID: {card_id}"),
                    'issue': 'missing' if 'actions' not in card_data else 'empty'
                })

    return {
        'missing_from_names': missing_from_names,
        'incomplete_entries': incomplete_entries,
        'name_mismatches': name_mismatches,
        'missing_base_cards': missing_base_cards,
        'missing_or_empty_actions': missing_or_empty_actions
    }

def print_results(results):
    print("=== Cards missing from names.json ===")
    if results['missing_from_names']:
        for card in results['missing_from_names']:
            print(f"ID: {card['id']}, Name: {card['name']}")
    else:
        print("None")

    print("\n=== Cards in names.json with incomplete information ===")
    if results['incomplete_entries']:
        for card in results['incomplete_entries']:
            print(f"ID: {card['id']}, Missing fields: {', '.join(card['missing_fields'])}")
    else:
        print("None")

    print("\n=== Cards with name mismatches ===")
    if results['name_mismatches']:
        for card in results['name_mismatches']:
            print(f"ID: {card['id']}")
            print(f"  swogi.json: {card['swogi_name']}")
            print(f"  names.json: {card['names_name']}")
    else:
        print("None")

    print("\n=== Missing base cards (cards ending in '1') ===")
    if results['missing_base_cards']:
        for card_id in sorted(results['missing_base_cards']):
            print(f"Missing base card: {card_id}")
    else:
        print("None")

    print("\n=== Cards with missing or empty actions (excluding cards with 'does_not_exist') ===")
    if results['missing_or_empty_actions']:
        for card in results['missing_or_empty_actions']:
            print(f"ID: {card['id']}, Name: {card['name']}, Issue: {card['issue']} actions")
    else:
        print("None")

def main():
    swogi_path = "swogi.json"
    names_path = "names.json"

    try:
        results = check_json_files(swogi_path, names_path)
        print_results(results)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()