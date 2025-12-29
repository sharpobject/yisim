# YiXianPai Localization Extraction Guide

This document describes how to extract `Localization.json` from YiXianPai Unity game builds.

## Overview

The game uses the **I2 Localization** Unity plugin to store translations. The localization data is stored in a Unity MonoBehaviour asset inside an addressable asset bundle. AssetRipper cannot directly deserialize this MonoBehaviour (shows as "UnreadableObject"), so we extract the raw binary and parse it ourselves.

## Prerequisites

1. **AssetRipper** - Download from https://github.com/AssetRipper/AssetRipper
   - Use the GUI version for easier navigation
   - Runs a local web server at http://127.0.0.1:53701

2. **Python 3** - For running extraction scripts

## Quick Extraction Steps

### 1. Find the I2 Localization Bundle

```bash
python3 find_i2_bundle.py
```

Or manually search the bundle directory:
```bash
# Beta version
cd "/Users/sharpobject/Library/Application Support/Steam/steamapps/common/YiXianPai_beta/YiXianPai_beta.app/Contents/Resources/Data/StreamingAssets/aa/StandaloneOSX"

# Main version
cd "/Users/sharpobject/Library/Application Support/Steam/steamapps/common/YiXianPai/YiXianPai.app/Contents/Resources/Data/StreamingAssets/aa/StandaloneOSX"
```

Look for a bundle containing "I2Languages":
```bash
for f in *.bundle; do
  if strings -a "$f" | grep -q "I2Languages"; then
    echo "$f contains I2Languages"
    ls -la "$f"
  fi
done
```

The localization bundle is typically 2-6 MB.

### 2. Load Bundle in AssetRipper

1. Open AssetRipper GUI
2. File → Open File → Select the bundle file (e.g., `fe50418569bf56f8bbc51ed9ddaaac83.bundle`)
3. Or load the entire game directory

### 3. Find the Bundle Index

If you loaded multiple bundles, find the index of the I2 bundle:

```bash
# List all loaded bundles
curl -s "http://127.0.0.1:53701/Bundles" | grep -o 'Path=%7B%22P%22%3A%5B[0-9]*%5D%7D' | head -20

# Search for I2Languages bundle by checking each
for i in {0..200}; do
  content=$(curl -s "http://127.0.0.1:53701/Bundles/View?Path=%7B%22P%22%3A%5B$i%5D%7D" 2>/dev/null)
  if echo "$content" | grep -q "I2Languages\|LanguageSource"; then
    echo "Bundle $i contains I2 data"
    break
  fi
done
```

### 4. Find the MonoBehaviour Asset

Navigate to the bundle's collection and find the MonoBehaviour (Class ID 114):

```bash
# Get assets in bundle (replace 140 with your bundle index)
curl -s "http://127.0.0.1:53701/Collections/View?Path=%7B%22B%22%3A%7B%22P%22%3A%5B140%5D%7D%2C%22I%22%3A0%7D" | grep -o 'href="[^"]*Assets[^"]*"'
```

Look for the MonoBehaviour asset (not AssetBundle or MonoScript):

```bash
# Check asset type (replace path as needed)
curl -s "http://127.0.0.1:53701/Assets/View?Path=..." | grep "Class ID Type Name"
```

### 5. Download Binary Data

Download the raw binary of the MonoBehaviour:

```bash
# Replace the Path parameter with your asset path
curl -s "http://127.0.0.1:53701/Assets/Binary?Path=%7B%22C%22%3A%7B%22B%22%3A%7B%22P%22%3A%5B140%5D%7D%2C%22I%22%3A0%7D%2C%22D%22%3A2935903780393107581%7D" -o localization_binary.dat

# Verify it contains localization data
strings localization_binary.dat | head -20
```

### 6. Extract to JSON

```bash
python3 extract_localization.py localization_binary.dat Localization.json
```

## Output Format

The extracted JSON follows the I2 Localization format:

```json
{
  "m_GameObject": {"m_FileID": 0, "m_PathID": 0},
  "m_Enabled": 1,
  "m_Script": {"m_FileID": 0, "m_PathID": -1545792446167958036},
  "m_Name": "Localization_Develop",
  "mSource": {
    "mTerms": [
      {
        "Term": "Buff_223",
        "TermType": 0,
        "Languages": ["暗星蝙蝠", "Dark Star Bat", "暗星蝙蝠"],
        "Flags": [0, 0, 0],
        "Languages_Touch": []
      }
    ]
  }
}
```

Language indices:
- 0: Chinese Simplified (简体中文)
- 1: English
- 2: Chinese Traditional (繁體中文)

## Binary Format Reference

The MonoBehaviour binary structure:

| Offset | Type | Field |
|--------|------|-------|
| 0 | int32 | m_GameObject.m_FileID |
| 4 | int64 | m_GameObject.m_PathID |
| 12 | int32 | m_Enabled |
| 16 | int32 | m_Script.m_FileID |
| 20 | int64 | m_Script.m_PathID |
| 28 | string | m_Name |
| ... | int32 | mSource.mOwner.m_FileID |
| ... | int64 | mSource.mOwner.m_PathID |
| ... | int32 | mTerms.Length |
| ... | TermData[] | mTerms |

String format: 4-byte length prefix (little-endian), UTF-8 data, 4-byte aligned

TermData structure:
- Term (string)
- TermType (int32)
- Languages (string array: count + strings)
- Flags (byte array: count + bytes)
- Languages_Touch (string array: count + strings)

## Troubleshooting

### AssetRipper shows "UnreadableObject"
This is expected - the I2 Localization MonoBehaviour uses a custom script that AssetRipper can't deserialize. Use the binary download method described above.

### Bundle index changed
After game updates, bundle filenames and indices may change. Re-run `find_i2_bundle.py` to locate the new bundle.

### Parsing errors
If the binary format changed, check the file header manually:
```python
with open('localization_binary.dat', 'rb') as f:
    print(f.read(200))
```

Look for "Localization" string near the beginning to verify correct asset.

## Card Parameter Extraction

Card descriptions use placeholders like `{otherParams[0]}` for variable values that change per card level.
These values are stored in the CardConfig protobuf binary.

### Finding CardConfig Bundle

```bash
# Search for bundle containing CardConfig
for f in *.bundle; do
  if strings -a "$f" | grep -q "CardConfig"; then
    echo "$f contains CardConfig"
  fi
done
```

### Extracting Card Params

1. Load the CardConfig bundle in AssetRipper
2. Download the MonoBehaviour binary (same process as localization)
3. Run the extraction:

```bash
python3 extract_card_params.py /tmp/CardConfig.dat cards.json
```

### Card Param Format

In the protobuf structure:
- **Field 100** (tag `0xa2 0x06`): Contains `otherParams` array
- Values are varint-encoded

Example card entry:
```
Name: Cloud Sword - Dragon Roam (云剑•游龙)
Desc: {attack} ATK × {attackCount}\n[Cloud Hit]: [DEF]+{otherParams[0]}
otherParams by level: [3], [5], [7]
```

### Common Param Patterns

| Param Count | Cards | Example |
|-------------|-------|---------|
| 1 param | ~960 | Sword Intent Surge: 80%, 110%, 140% |
| 2 params | ~590 | Water Spirit - Spring Rain: HP+[4,10,16], Water Force+[1,1,1] |
| 3 params | ~160 | Octgates Lock Formation: {0} times, {1} DMG, initial {2} DMG |
| 4 params | 6 | Complex effect cards |

## Sigil Extraction

Sigils (刻印/KeYin) have multiple tiers with different stats.

### Config File
- **KeYinCardConfig** - Contains sigil data with tiers

### Extraction
```bash
python3 extract_sigil_talent_params.py 1.5.8
python3 extract_talents_sigils.py 1.5.8
```

### Sigil Fields
| Field | Meaning |
|-------|---------|
| field_1 | Full ID (tier * 10000 + base_id) |
| field_6 | Tier (1-6) |
| field_7 | Sigil value (used for sigil effects) |
| field_8 | Max HP gained from sigil |
| field_100 | otherParams array |

### Output Format (sigils.json)
```json
{
  "id": 9,
  "name_en": "Sword Practice",
  "desc_en_template": "Next [Sword Slash] or [Sword Guard] adds {otherParams[0]} [Sword Intent]",
  "tiers": [
    {"tier": 1, "sigil_value": 1, "max_hp": 2, "params": [1], "desc_en": "..."},
    {"tier": 2, "sigil_value": 1, "max_hp": 4, "params": [1], "desc_en": "..."},
    ...
  ]
}
```

## Immortal Fate (Talent) Extraction

Immortal fates (仙命/Talent) have multiple versions with different parameters.

### Config File
- **TalentConfig** - Main talent data
- **TalentResonanceConfig** - Resonance talents
- **SectTalentConfig** - Sect-specific talents

### Extraction
```bash
python3 extract_sigil_talent_params.py 1.5.8
python3 extract_talents_sigils.py 1.5.8
```

### Output Format (immortal_fates.json)
```json
{
  "id": 16,
  "name_en": "Sword Rhyme Cultivate",
  "desc_en_template": "At the beginning of the battle add {otherParams[1]} stack(s) of [Sword Intent]",
  "versions": [
    {"version": 0, "params": [0, 1], "desc_en": "...add 1 stack(s)..."},
    {"version": 1, "params": [1, 1], "desc_en": "...add 1 stack(s)..."},
    {"version": 2, "params": [2, 1], "desc_en": "...add 1 stack(s)..."},
    {"version": 3, "params": [2, 2], "desc_en": "...add 2 stack(s)..."}
  ]
}
```

## Combined Card Data

The `combine_card_data.py` script merges card data from multiple sources and fills in placeholders.

### Card Placeholder Field Mappings
| Placeholder | Field | Description |
|-------------|-------|-------------|
| {attack} | field_8 | Base attack value |
| {attackCount} | field_10 | Number of attacks |
| {def} | field_11 | Base defense value |
| {randomDef} | field_12 | Max defense in range |
| {randomAttack} | field_9 | Max attack in range |
| {qi} | field_7 | Qi/anima value |
| {sword_intent} | field_15 | Sword intent value |
| {hexagram} | field_16 | Hexagram value |
| {physique} | field_21 | Physique value |
| {charge_qi} | field_23 | Charge qi value |
| {otherParams[N]} | field_100 | Variable params |

### Card ID Encoding
- Level is encoded in the 5th digit from right: `X0YYYY` where X is 0,1,2 for levels 1,2,3
- Examples: `1000042` (L1), `1010042` (L2), `1020042` (L3)
- Base ID: `card_id - ((card_id // 10000) % 10) * 10000`

### Usage
```bash
python3 combine_card_data.py 1.5.8
```

## Resonance Talent Extraction

Resonance talents (共鸣仙命) are a season-based mechanic with unique placeholders.

### Config File
- **TalentResonanceConfig** - Contains resonance talent data

### Localization Keys
- `ResonanceTalent_N` - Talent names
- `ResonanceTalentDesc_N` - Talent descriptions with templates

### Placeholders
| Placeholder | Field | Description |
|-------------|-------|-------------|
| {effectRound} | field_101 | Round when effect becomes active |
| {relateTalentId} | field_2 | Reference to base talent ID |
| {otherParams[N]} | field_100 | Variable parameters |

### Output Format (resonance_talents.json)
```json
{
  "id": 3,
  "name_en": "Resonance: Sword In Sheathed",
  "desc_en_template": "Effective from round {effectRound}: ...",
  "params": [1],
  "effect_round": 8,
  "relate_talent_id": null,
  "desc_en": "Effective from round 8: If you do not attack during your turn, gain 1 [Sword Intent] at the end of turn."
}
```

## Second-Level Template Resolution

After filling primary placeholders ({otherParams[N]}, {effectRound}, etc.), the extraction scripts resolve nested references:

| Pattern | Lookup Method | Example |
|---------|---------------|---------|
| `【KEYWORD_xxx】` | Lookup Chinese text "xxx" in localization | `【KEYWORD_防】` → `[DEF]` |
| `【TALENT_N】` | Lookup term `Talent_N` | `【TALENT_77】` → `[Inheritance of Earth Spirit]` |
| `【N】` | Lookup card by base_id N | `【19】` → `[Clear Heart Sword Embryo]` |
| `【2】` | Lookup card by base_id 2 | `【2】` → `[Unrestrained Sword - Flame Dance]` |

This produces fully human-readable descriptions with all placeholders resolved.

## Mirage Extraction (Spacetime Mirage Season)

Mirages (幻景) are events that appear during the Spacetime Mirage season.

### Extraction Script
```bash
python3 extract_mirages.py 1.5.8
```

### Localization Keys
| Pattern | Description |
|---------|-------------|
| `幻景标题_N` | Mirage event title |
| `幻景描述_N` | Mirage event description |
| `幻景选项_N` | Mirage choice options |

### Reference Resolution
The extraction script resolves static references in mirage options:
| Pattern | Resolution | Example |
|---------|------------|---------|
| `【KEYWORD_xxx】` | Keyword lookup | `【KEYWORD_虚弱】` → `[Weakened]` |
| `【N】` | Card name lookup | `【46】` → `[Daoist Rhyme Aura]` |
| `【{N}】` | Runtime card ref | `【{1}】` → `[Card {1}]` |
| `{0}`, `{1}` | Runtime params | Kept as-is (filled by game) |
| `【runtimeParam】` | Runtime card | Kept as-is |

### Placeholder Statistics (261 options)
- 49 fully resolved (no placeholders)
- 188 with numeric params (`{0}`, `{1}`) - runtime values
- 17 with runtime card refs (`[Card {N}]`)
- 48 with `runtimeParam` placeholder

### Output Format (mirages.json)
```json
{
  "id": 29,
  "title_en": "Revisiting Xiaoyao",
  "desc_en": "Histories of the Three Continents speak of the Xiaoyao Sect..."
}
```

### Output Format (mirage_options.json)
```json
{
  "id": 1303,
  "text_en": "Wait for Better Chances (Destiny-{0}, add {1} 【46】 to card pool)",
  "text_en_resolved": "Wait for Better Chances (Destiny-{0}, add {1} [Daoist Rhyme Aura] to card pool)"
}
```

## Life Shop Items (玄心命坊 Season)

Life Shop items include Scrolls (instant effects) and Pacts (permanent buffs).

### Localization Keys
| Pattern | Description |
|---------|-------------|
| `XXMFTypeName_N` | Item name (2xx = Scrolls, 3xx = Pacts) |
| `XXMFTypeDesc_N` | Item effect description |

### Output Format (life_shop_items.json)
```json
{
  "scrolls": [
    {"id": 201, "name_en": "Scroll of Cultivation (I)", "desc_en": "Cultivation + {0}"}
  ],
  "pacts": [
    {"id": 305, "name_en": "Pact of Equilibrium", "desc_en": "For each 2 cards you keep in your hand..."}
  ]
}
```

Note: `{0}`, `{1}` etc. are runtime parameter placeholders filled by the game.

## Kunlun Door Locations (昆仑门扉 Season)

The Door of Kunlun allows exploring various locations each round.

### Localization Keys
| Pattern | Description |
|---------|-------------|
| `Relic4OptionTitle_N` | Location name |
| `Relic4OptionContent_N` | Location effect |

### Notable Locations
- **Crimson Star** (ID 6): Grants the Crimson Star card (base_id 182), a phase 6 card that does nothing but can fuse with other cards
- Various locations grant cards, cultivation, destiny, exchange chances, etc.

### Output Format (kunlun_door_locations.json)
```json
{
  "id": 6,
  "title_en": "Crimson Star",
  "desc_en": "Gain 【182】",
  "desc_en_resolved": "Gain [Crimson Star]"
}
```

## Fate Branches

Fate branches (命运分支) are build-defining choices that affect card pools and immortal fate options.

### Localization Keys
| Pattern | Description |
|---------|-------------|
| `FateBranchName_N` | Fate branch name |
| `FateBranchDesc_N` | Fate branch description (with templates) |

### Categories (by ID range)
| Range | Category | Example |
|-------|----------|---------|
| 1-11 | General | My Fate, My Choice; Fate of Fortunes |
| 101-124 | Sword Sect | Esoteric of Sword Formation; Fate of Unrestrained Sword |
| 201-225 | Divination Sect | Fate of Divination; Mastery of Hexagram Formacide |
| 301-324 | Five Elements Sect | Mastery of Wood Spirit; Omen of Fire Spirit |
| 401-425 | Body Cultivation Sect | Fate of Physique; Mastery of Palms |

### Template Placeholders
| Placeholder | Description |
|-------------|-------------|
| `{countParam}` | Count value (copies to add, times to trigger) |
| `{otherParams[0]}` | Usually a talent ID |
| `【TALENT_{otherParams[0]}】` | Reference to talent by ID |

### Output Format (fate_branches.json)
```json
{
  "id": 118,
  "name_en": "Esoteric of Sword Formation",
  "category": "Sword Sect",
  "desc_en_template": "Add {countParam} copies of 【{otherParams[0]}】 and 【{otherParams[1]}】 to your card pool."
}
```

Note: FateBranchConfig binary format differs from other configs; parameter values not yet extracted.

## Discovered Config Types

All config types found in game bundles (see `config_inventory.json` for details):

### Extracted
| Config | Size | Description |
|--------|------|-------------|
| CardConfig | 269 KB | Card parameters and stats |
| KeYinCardConfig | 41 KB | Sigil parameters |
| TalentConfig | 13 KB | Immortal fate parameters |
| TalentResonanceConfig | 6 KB | Resonance talent parameters |
| SectTalentConfig | 1 KB | Sect talent mappings |
| TA18TalentConfig | 1 KB | Special event talents |

### Not Yet Extracted
| Config | Size | Description |
|--------|------|-------------|
| CharacterAnimClipConfig | 68 KB | Character animations |
| CardFXConfig | 15 KB | Card visual effects |
| FateBranchConfig | 4 KB | Fate branch parameters (different format) |
| PurchaseProductConfig | 1 KB | In-app purchases |
| YuanGuEventConfig | 1 KB | Yuan Gu event data |
| MentorLevelConfig | 1 KB | Mentor level rewards |
| SceneSummonConfig | 1 KB | Scene summon events |
| PassportMissionConfig | 1 KB | Battle pass missions |
| DivinationCharacterConfig | 1 KB | Divination characters |
| XianYuConfigR | 360 B | Xian Yu currency config |
| DefeatEffectConfig | 216 B | Defeat visual effects |

## Card Classification

The `classify_cards.py` script categorizes all cards from combined_cards.json into logical groups.

### Extraction
```bash
python3 classify_cards.py 1.5.9
```

### Category Types
| Category | Description | ID Range/Detection |
|----------|-------------|-------------------|
| sect_1_regular | Cloud Spirit Sword regular cards | 1M base_id |
| sect_2_regular | Heptastar regular cards | 4M base_id |
| sect_3_regular | Five Elements regular cards | 7M base_id |
| sect_4_regular | Duan Xuan regular cards | 10M base_id |
| sect_N_secret | Secret enchantment cards | field_104 = 2 |
| sect_N_legendary | Legendary cards | field_104 = 14 |
| sect_N_seasonal | Seasonal cards | field_104 = 3 |
| sidejob_elixirist | Elixirist side job cards | field_104 = 4, base_id range |
| sidejob_fuluist | Fuluist side job cards | field_104 = 4, base_id range |
| sidejob_musician | Musician side job cards | field_104 = 4, base_id range |
| sidejob_painter | Painter side job cards | field_104 = 4, base_id range |
| sidejob_formation | Formation master cards | field_104 = 4, base_id range |
| sidejob_plant_master | Plant master cards | 9M base_id |
| sidejob_fortune_teller | Fortune teller cards | 11M base_id |
| character_specific | Character-specific cards | field_105 is set |
| fusion | Fusion cards | field_104 = 9 |
| pet | Spiritual pet cards | field_104 = 11 |
| talisman | Talisman cards | field_104 = 13 |
| voucher | Voucher cards | field_104 = 7 |
| merpeople_pearl | Merpeople pearl event | base_id 60-69 |
| event_mode | Event mode cards | specific IDs |
| unused | Unused cards | known unused base_ids |

### Output Format (card_classification.json)
```json
{
  "categories": {
    "sect_1_regular": {
      "count": 183,
      "cards": [
        {
          "base_id": 1000001,
          "card_id": 1000001,
          "name_en": "Cloud Sword - Dragon Roam",
          "level": 1,
          "phase": 1,
          "in_swogi": true
        }
      ]
    }
  },
  "summary": { ... }
}
```

The `in_swogi` field indicates whether the card exists in the simulator's swogi.json.

## Card CSV Export

The `generate_card_csv.py` script exports playable cards to CSV format for simulator implementation work.

### Extraction
```bash
python3 generate_card_csv.py 1.5.9
```

### CSV Columns
| Column | Description |
|--------|-------------|
| game_card_id | Original game card ID |
| base_id | Base card ID (without level encoding) |
| swogi_card_id | Simulator card ID (if mapped) |
| name_en | English card name |
| name_zh | Chinese card name |
| hp_cost | HP cost to play |
| qi_cost | Qi cost to play |
| category | Classification category |
| phase | Card phase (1-6) |
| level | Card level (1-3) |
| text_zh | Chinese card description |
| text_en | English card description |

### Excluded Categories
Non-playable cards are excluded from the CSV:
- `unused` / `unused_empty` - Unused cards
- `artillery_minigame` / `bridge_minigame` - Minigame cards
- `shopkeeper` - NPC shopkeeper cards
- `voucher` - Voucher cards (not battle cards)
- `non_playable_special` - Items that go straight to inventory

## Output Files (per version folder)

| File | Description |
|------|-------------|
| Localization.json | Raw I2 localization data |
| CardConfig.dat | Raw card protobuf binary |
| KeYinCardConfig.dat | Raw sigil protobuf binary |
| TalentConfig.dat | Raw talent protobuf binary |
| TalentResonanceConfig.dat | Raw resonance talent protobuf binary |
| cards_with_params.json | All cards extracted from CardConfig |
| combined_cards.json | Cards with localization merged and placeholders filled |
| sigils.json | Sigils with all tiers and filled descriptions |
| immortal_fates.json | Talents with all versions and filled descriptions |
| resonance_talents.json | Resonance talents with filled descriptions |
| mirages.json | Spacetime mirage events |
| mirage_options.json | Mirage event choice options |
| life_shop_items.json | Life Shop scrolls and pacts |
| kunlun_door_locations.json | Kunlun Door exploration locations |
| fate_branches.json | Fate branch data with categories |
| card_classification.json | Card categorization (sect, side job, unused, etc.) |
| card_data.csv | CSV export of playable cards for simulator work |
| config_inventory.json | Inventory of all discovered config types |
| sigil_params.json | Raw sigil param extraction |
| talent_params.json | Raw talent param extraction |
| talent_resonance_params.json | Raw resonance talent param extraction |

## Version History

- 2024-12: Initial extraction from YiXianPai_beta
  - Bundle: `fe50418569bf56f8bbc51ed9ddaaac83.bundle`
  - Asset PathID: 2935903780393107581
  - Terms: 21,680
- 2024-12: Added card param extraction
  - CardConfig bundle: `89f98c60da1a90cce630f5f0999c5909.bundle`
  - Cards with params: 1717
- 2024-12: Added sigil and talent extraction
  - KeYinCardConfig: 159 sigils, 393 tier entries
  - TalentConfig: 306 immortal fates, 412 version entries
- 2024-12: Version 1.5.8 extraction
  - 2087 cards total
  - 159 sigils with tiers
  - 306 immortal fates (63 with 4 versions, 243 with 1 version)
- 2024-12: Added resonance talent extraction
  - TalentResonanceConfig: 137 resonance talents
  - Placeholders: {effectRound}, {relateTalentId}, {otherParams[N]}
- 2024-12: Added second-level template resolution
  - Resolves 【KEYWORD_xxx】, 【TALENT_N】, 【N】 references
- 2024-12: Added mirage and Life Shop extraction
  - 56 mirage events (幻景) with 261 options
  - 38 scrolls + 17 pacts from Life Shop (玄心命坊)
- 2024-12: Added Kunlun Door locations
  - 37 exploration locations (昆仑门扉)
  - Includes Crimson Star (赤贯星) card source
