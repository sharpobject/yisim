# Mismatched Cards

Cards where the Chinese and English text don't match, or where the implementation differs from the CSV data.

---

## CN/EN Text Mismatches

*Cards where the Chinese and English text appear to describe different effects*

---

## Implementation Mismatches

*Cards where the simulator implementation doesn't match the CSV text/numbers*

### Sword Intent Surge (115051-115053)
- **Issue**: qi_cost mismatch
- **CSV**: qi_cost = 0
- **swogi.json**: qi_cost = 1
- **Category**: Sect 1 - Cloud Spirit Sword

### Octgates Lock Formation (354021-354023)
- **Issue**: Potential player index bug
- **CSV**: "Deal 8 DMG to the opponent before the opponent's Chase" (stacks applied to enemy)
- **Implementation**:
  - Card uses `add_enemy_c_of_x(2, "octgates_lock_formation_stacks")` → adds stacks to player 1
  - `do_octgates_lock_formation()` checks `this.players[0].octgates_lock_formation_stacks` → reads from player 0
  - Stacks are added to player 1 but effect checks player 0
- **Category**: Formation Master (prefix 35)
- **Note**: May be intentional for single-player simulation context, needs review

### Devouring Ancient Vine (365043)
- **Issue**: Potential player index bug
- **CSV**: "[Continuous]: Whenever the opponent triggers [Chase], steal 6 HP" (stacks applied to enemy)
- **Implementation**:
  - Card uses `add_enemy_c_of_x(6, "devouring_ancient_vine_stacks")` → adds stacks to player 1
  - `do_devouring_ancient_vine()` checks `this.players[0].devouring_ancient_vine_stacks` → reads from player 0
  - Effect reduces player 0 HP and increases player 1 HP (inverted from intended)
- **Category**: Plant Master (prefix 36)
- **Note**: Similar issue to Octgates Lock Formation

### Heavenly Will - Defy (375041-375043)
- **Issue**: Wrong percentage and rounding
- **CSV**: "deal 50% DMG to opponent (Rounded down)" - 造成50%伤害(向下取整)
- **Implementation**: `Math.ceil(amt * 6 / 10)` = 60% rounded UP
- **Category**: Fortune Teller (prefix 37)
- **Fixes needed**:
  1. Change `6 / 10` to `5 / 10` (or `/ 2`)
  2. Change `Math.ceil` to `Math.floor`

### Nether Void Canine (506021-506023)
- **Issue**: Player index bug
- **CSV**: "[Continuous]: The next card played by the opponent will be changed to Normal Attack until the end of the battle"
- **Implementation**:
  - Card uses `add_enemy_c_of_x(1, "nether_void_canine_stacks")` → adds stacks to player 1
  - `do_nether_void_canine()` checks `this.players[0].nether_void_canine_stacks` → reads from player 0
  - Stacks are added to player 1 but effect checks player 0
- **Category**: Spiritual Pet (prefix 50)
- **Note**: Same pattern as Octgates Lock Formation and Devouring Ancient Vine - may be intentional for single-player context but needs review

### Metal Spirit - Chokehold (232011-232013)
- **Issue**: Duration mechanism mismatch
- **CSV**: "[Metal Spirit]: Make the opponent cannot add HP for 2/3/4 turns" - 持续2/3/4回合 (turn-based)
- **Implementation**:
  - Card uses `add_enemy_c_of_x(2/3/4, "metal_spirit_chokehold_stacks")` → adds stacks to enemy
  - Stacks are reduced in `reduce_idx_hp()` (gamestate.jscpp:4492) when player loses HP
  - Healing blocked while stacks > 0 (gamestate.jscpp:4715-4717)
  - Duration is HP-loss-based, not turn-based
- **Category**: S3 Secret Enchantment (prefix 23)
- **Fix needed**: Change stack reduction from HP-loss trigger to turn-end trigger
