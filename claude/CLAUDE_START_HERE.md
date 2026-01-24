CLAUDE_START_HERE.md# Card Implementation Verification Task

## Current Task
Verifying all card implementations in this YiXianPai simulator match the CSV game data.

## Key Files
- `localization/1.5.9/card_data.csv` - Source of truth for card text/numbers
- `swogi.json` - Card definitions with qi_cost, hp_cost values (vestigial actions array - ignore it)
- `card_actions.js` - **AUTHORITATIVE** JavaScript card implementations (actual game logic)
- `gamestate.jscpp` - Buff/stack implementations and game mechanics
- `CHECKED_CARDS.md` - Progress tracking and verification checklist
- `MISMATCHED_CARDS.md` - Cards with implementation issues
- `UNIMPLEMENTED_CARDS.md` - Cards not yet implemented

---

## STOP! READ THIS BEFORE STARTING ANY CARD CATEGORY

### Mandatory Steps For Each Card Category (e.g., "Musician prefix 33")

**STEP 1: Extract ALL card implementations from card_actions.js**
```
grep -A20 'card_actions\["33[0-9]{4}"\]' card_actions.js
```
Read the FULL output. Do not skim.

**STEP 2: Identify ALL custom functions/buffs/stacks**
For each card implementation found in Step 1, list:
- Any `game.xxx_stacks` variables being set/read
- Any `game.do_xxx()` custom functions being called
- Any `game.xxx()` functions that aren't obviously generic (like atk, def, qi, hp)

**STEP 3: Add checklist to CHECKED_CARDS.md**
Create a table in CHECKED_CARDS.md listing EVERY custom effect found in Step 2.
Format:
```
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `effect_name` | Card Name (ID range) | | Expected behavior from CSV |
```

**STEP 4: Verify EACH effect**
For each effect in your checklist:
1. Search gamestate.jscpp for the effect name
2. Read the implementation code
3. Compare to CSV text (both CN and EN)
4. Mark as ✅ only if behavior matches
5. If not implemented or wrong, add to MISMATCHED_CARDS.md

**STEP 5: Verify you completed all steps**
Before moving to next category, confirm:
- [ ] I ran the grep command and read ALL results
- [ ] I identified ALL custom effects (not just obvious ones)
- [ ] I added ALL effects to CHECKED_CARDS.md checklist
- [ ] I verified EACH effect against gamestate.jscpp
- [ ] I marked each effect ✅ or noted issues

---

## Current Status (Updated 2024-12-28)

### Completed:
- [x] Sects 1-4: All card actions and buffs verified (see CHECKED_CARDS.md)
- [x] Elixirist (prefix 31): 2 custom effects verified ✅
- [x] Fuluist (prefix 32): 3 custom effects verified ✅
- [x] Musician (prefix 33): 11 custom effects verified ✅ (kindness_tune N/A - meta-game only)
- [x] Painter (prefix 34): 4/5 custom effects verified ✅ (trigger_random_sect_card is TODO stub - see UNIMPLEMENTED_CARDS.md)
- [x] Formation Master (prefix 35): 10/11 effects verified ✅ (octgates_lock_formation may have player index bug - see MISMATCHED_CARDS.md)
- [x] Plant Master (prefix 36): 9/10 effects verified ✅ (devouring_ancient_vine may have player index bug, Mystery Seed N/A)
- [x] Fortune Teller (prefix 37): 11/12 effects verified ✅ (god_opportunity_reversal has wrong % and rounding - see MISMATCHED_CARDS.md)
- [x] Spiritual Pet (prefix 50): 12/13 effects verified ✅ (nether_void_canine has player index bug - see MISMATCHED_CARDS.md)
- [x] Talisman (prefix 40): 1 custom effect verified ✅
- [x] S1 Secret Enchantment (prefix 21): 7 custom effects verified ✅
- [x] S2 Secret Enchantment (prefix 22): 8 custom effects verified ✅
- [x] S3 Secret Enchantment (prefix 23): 6 custom effects verified (metal_spirit_chokehold has duration mismatch - see MISMATCHED_CARDS.md)
- [x] S4 Secret Enchantment (prefix 24): 7 custom effects verified ✅
- [x] Character-specific S1 (prefix 61): 3 effects verified ✅
- [x] Character-specific S2 (prefix 62): 2 effects verified ✅
- [x] Character-specific S3 (prefix 63): 1 effect verified ✅
- [x] Character-specific S4 (prefix 64): 3 effects verified ✅
- [x] Fusion Side Jobs (prefix 90): 5 effects verified ✅
- [x] Fusion S1 (prefix 91): 2 effects verified ✅
- [x] Fusion S2-S4: standard mechanics ✅

### Not Started:
- [ ] All other categories (see Work Order below)

---

## Work Order

### Phase 1: Sects 1-4 ✅ COMPLETE

### Phase 2: Side Jobs (IN PROGRESS)
- [x] Elixirist (prefix 31)
- [x] Fuluist (prefix 32)
- [x] Musician (prefix 33)
- [x] Painter (prefix 34)
- [x] Formation Master (prefix 35)
- [x] Plant Master (prefix 36)
- [x] Fortune Teller (prefix 37)

### Phase 3: Spiritual Pet & Talisman ✅ COMPLETE
- [x] Spiritual Pet (prefix 50) - 12/13 effects verified (nether_void_canine has player index bug)
- [x] Talisman (prefix 40) - 1 custom effect verified

### Phase 4: Sect Secret Enchantment ✅ COMPLETE
- [x] S1 Secret Enchantment (prefix 21) - 7 effects verified
- [x] S2 Secret Enchantment (prefix 22) - 8 effects verified
- [x] S3 Secret Enchantment (prefix 23) - 6 effects verified (metal_spirit_chokehold has duration mismatch)
- [x] S4 Secret Enchantment (prefix 24) - 7 effects verified

### Phase 5: Character-Specific Cards ✅ COMPLETE
- [x] Character-specific S1 (prefix 61) - 3 effects verified
- [x] Character-specific S2 (prefix 62) - 2 effects verified
- [x] Character-specific S3 (prefix 63) - 1 effect verified
- [x] Character-specific S4 (prefix 64) - 3 effects verified

### Phase 6: Fusion Cards ✅ COMPLETE
- [x] Fusion Side Jobs (prefix 90) - 5 effects verified
- [x] Fusion S1 (prefix 91) - 2 effects verified
- [x] Fusion S2-S4 (prefix 92-94) - standard mechanics

### Phase 7: Seasonal/Mirage Cards
- [ ] Neutral Seasonal (prefix 70)
- [ ] S1-S4 Seasonal (prefixes 71-74)
- [ ] Mirage cards (in seasonal_mirage_selectable)

---

## FULL CARD-BY-CARD VERIFICATION (Started 2024-12-28)

### New Verification Procedure
Use `verify_cards.py` script to check each card:
```bash
python3 verify_cards.py <base_id1> <base_id2> ...
# Example: python3 verify_cards.py 11101 11102 11103
```

The script shows CSV text + costs alongside implementation code. You must:
1. **Manually verify** the implementation matches the CSV text semantically
2. Check the cost indicator (✓ or ✗COST)
3. Update `VERIFICATION_CHECKLIST.md` with [x] for verified items

### Key Rules
- **swogi.json cost inheritance**: If a level omits hp_cost/qi_cost, it inherits from previous level
- **Prefix = first 2 digits** of card ID (e.g., 111011 has prefix 11 = Sect 1)
- **"greater than N"** in CSV means `>= N+1` in code

### FULL VERIFICATION STATUS

**COMPLETED:**
- [x] Sect 1 (prefix 11): 52 cards - ALL VERIFIED
  - 51 cards fully match
  - 1 issue: 11505 Sword Intent Surge has qi_cost=1 in swogi but qi_cost=0 in CSV

**IN PROGRESS:**
- [ ] Sect 2 (prefix 12): 52 cards - NOT STARTED

**NOT STARTED:**
- [ ] Sect 3 (prefix 13): 51 cards
- [ ] Sect 4 (prefix 14): 52 cards
- [ ] S1-S4 Secret Enchantment (prefixes 21-24): 58 cards
- [ ] Side Jobs (prefixes 31-37): 99 cards
- [ ] Talisman (prefix 40): 15 cards
- [ ] Spiritual Pet (prefix 50): 13 cards
- [ ] Character-specific (prefixes 61-64): 39 cards
- [ ] Fusion (prefixes 90-94): 82 cards

### Progress Tracking
See `VERIFICATION_CHECKLIST.md` for per-card checkboxes.

---

## Found Issues
- Sword Intent Surge (115051-115053): qi_cost=0 in CSV but qi_cost=1 in swogi.json (see MISMATCHED_CARDS.md)
- kindness_tune_stacks: Set but never used in battle simulation (may be intentional - affects Destiny which is meta-game)

## Important Notes
- **card_actions.js is AUTHORITATIVE** - ignore swogi.json actions array
- swogi.json is only authoritative for qi_cost/hp_cost values
- DO NOT write scripts to automate - manually read and verify each card
- Read and understand BOTH Chinese and English text to check for mismatches
- Some effects (like Destiny reduction) may be intentionally unimplemented in battle sim
