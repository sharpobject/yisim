# Card Implementation Guide

This document explains how to implement new cards in the YiXianPai simulator.

## File Overview

| File | Purpose |
|------|---------|
| `swogi.json` | Declarative card definitions (name, costs, actions array) |
| `card_actions.js` | JavaScript implementations of each card |
| `card_info.js` | Card metadata processing, attribute detection from actions array |
| `gamestate.jscpp` | Game state variables and buff logic (with preprocessor guards) |
| `preprocess.js` | Dependency mapping for conditional compilation |

## Card ID Format (Simulator)

Simulator card IDs are 5-6 digits. The first 2 digits indicate the card category (see `PREFIX_TO_MARKING` in `card_info.js`):

| Prefix | Category |
|--------|----------|
| 11-14 | Regular sect cards (S1=Cloud Spirit Sword, S2=Heptastar, S3=Five Elements, S4=Duan Xuan) |
| 21-24 | Secret enchantment cards (S1-S4) |
| 31 | Elixirist side job |
| 32 | Fuluist side job |
| 33 | Musician side job |
| 34 | Painter side job |
| 35 | Formation master side job |
| 36 | Plant master side job |
| 37 | Fortune teller side job |
| 40 | Talisman cards |
| 50 | Spiritual pet cards |
| 60 | General cards (normal attack, event cards) |
| 61-64 | Character-specific cards (S1-S4) |
| 70 | Neutral seasonal cards |
| 71-74 | Sect seasonal cards (S1-S4) |
| 80 | Zongzi event cards |
| 90 | Fusion cards - side jobs |
| 91-94 | Fusion cards (S1-S4) |

The middle digits represent the phase and card number within that phase. The last digit is always the level (1-3).

Example: `114031` = prefix 11 (S1 regular), 40 = phase 4, 3 = card 3 within phase 4, level 1

## The `actions` Array in swogi.json

The `actions` array in swogi.json is **mostly vestigial** - actual card execution uses the JavaScript functions in `card_actions.js`. However, the actions array is still used for:

1. **Attribute detection in card_info.js** - The following card properties are detected by scanning the actions array:
   - `is_continuous` - checks for "continuous" in actions
   - `is_consumption` - checks for "consumption" in actions
   - `is_add_physique` - checks for "physique" in actions
   - `is_add_qi` - checks for "qi" in actions

2. **Opening effects** - Some cards (primarily fortune teller side job cards) have an `opening` field IN ADDITION TO regular actions. Opening effects are executed by interpreting the actions array via `do_action()` rather than calling a JavaScript function.

For complex card implementations, you do NOT need to make the `actions` array fully match the JavaScript implementation. Just ensure it contains the keywords needed for attribute detection.

---

## Example 1: Spirit Gather Citta-Dharma (114031-114033)

A continuous card that gains qi and builds stacks for ongoing qi generation.

### Game Text (from combined_cards.json)

**Level 1** (game_id: 1000034):
- CN: `[灵气]+1\n[持续]：每2回合加1[灵气]`
- EN: `[Qi]+1\n[Continuous]: Add 1 [Qi] every 2 turns`

**Level 2** (game_id: 1010034):
- CN: `[灵气]+1\n[持续]：每回合加1[灵气]`
- EN: `[Qi]+1\n[Continuous]: Add 1 [Qi] each your turn`

**Level 3** (game_id: 1020034):
- CN: `[灵气]+3\n[持续]：每回合加1[灵气]`
- EN: `[Qi]+3\n[Continuous]: Add 1 [Qi] each your turn`

### swogi.json

```json
"114031": {
    "name": "Spirit Gather Citta-Dharma",
    "actions": [
        ["qi", 1],
        ["continuous"],
        ["add_c_of_x", 1, "spirit_gather_citta_dharma_stacks"]
    ]
},
"114032": {
    "actions": [
        ["qi", 1],
        ["continuous"],
        ["add_c_of_x", 2, "spirit_gather_citta_dharma_stacks"]
    ]
},
"114033": {
    "actions": [
        ["qi", 3],
        ["continuous"],
        ["add_c_of_x", 2, "spirit_gather_citta_dharma_stacks"]
    ]
}
```

### card_actions.js

```javascript
// Spirit Gather Citta-Dharma
card_actions["114031"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.continuous();
    game.add_c_of_x(1, "spirit_gather_citta_dharma_stacks");
}

// 114032
card_actions["114032"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.continuous();
    game.add_c_of_x(2, "spirit_gather_citta_dharma_stacks");
}

// 114033
card_actions["114033"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.continuous();
    game.add_c_of_x(2, "spirit_gather_citta_dharma_stacks");
}
```

### gamestate.jscpp - Player.reset()

```cpp
#ifdef HAS_SPIRIT_GATHER_CITTA_DHARMA
        this.spirit_gather_citta_dharma_stacks = 0;
        this.spirit_gather_citta_dharma_odd_gives_qi = true;
#endif // HAS_SPIRIT_GATHER_CITTA_DHARMA
```

### gamestate.jscpp - do_spirit_gather_citta_dharma()

```cpp
#ifdef HAS_SPIRIT_GATHER_CITTA_DHARMA
    do_spirit_gather_citta_dharma() {
        if (this.players[0].spirit_gather_citta_dharma_stacks > 0) {
            const me = this.players[0];
            let qi_gain = Math.floor(me.spirit_gather_citta_dharma_stacks / 2);
            if (me.spirit_gather_citta_dharma_stacks % 2 === 1) {
                const odd_gives_qi = me.spirit_gather_citta_dharma_odd_gives_qi;
                if (odd_gives_qi) {
                    qi_gain += 1;
                }
                me.spirit_gather_citta_dharma_odd_gives_qi = !odd_gives_qi;
            }
            this.increase_idx_qi(0, qi_gain);
            this.log("gained " + qi_gain + " qi from spirit_gather_citta_dharma_stacks");
        }
    }
#endif // HAS_SPIRIT_GATHER_CITTA_DHARMA
```

### gamestate.jscpp - sim_turn() call site

```cpp
#ifdef HAS_SPIRIT_GATHER_CITTA_DHARMA
        this.do_spirit_gather_citta_dharma();
#endif // HAS_SPIRIT_GATHER_CITTA_DHARMA
```

### preprocess.js

```javascript
HAS_SPIRIT_GATHER_CITTA_DHARMA: ["spirit_gather_citta_dharma_stacks",
    "11403"],
```

---

## Example 2: Counter Move (642031-642033)

A Li Man character-specific card with stance-dependent defensive effects.

### Game Text (from combined_cards.json)

**Level 1** (game_id: 10000221):
- CN: `[防]+7\n直到自身下1回合开始前：\n[拳]：受到的[攻]和[伤害]减50%\n[棍]：每次受到攻击后向对方造成6[伤害]`
- EN: `[DEF]+7\nUntil the start of your next turn:\n[Fist]: Reduce incoming [ATK] and [DMG] by 50%\n[Stick]: Deal 6 [DMG] to the opponent each time you are attacked`

**Level 2** (game_id: 10010221):
- CN: `[防]+12\n直到自身下1回合开始前：\n[拳]：受到的[攻]和[伤害]减50%\n[棍]：每次受到攻击后向对方造成6[伤害]`
- EN: `[DEF]+12\nUntil the start of your next turn:\n[Fist]: Reduce incoming [ATK] and [DMG] by 50%\n[Stick]: Deal 6 [DMG] to the opponent each time you are attacked`

**Level 3** (game_id: 10020221):
- CN: `[防]+17\n直到自身下1回合开始前：\n[拳]：受到的[攻]和[伤害]减50%\n[棍]：每次受到攻击后向对方造成6[伤害]`
- EN: `[DEF]+17\nUntil the start of your next turn:\n[Fist]: Reduce incoming [ATK] and [DMG] by 50%\n[Stick]: Deal 6 [DMG] to the opponent each time you are attacked`

### swogi.json

```json
"642031": {
    "name": "Counter Move",
    "actions": [
        ["def", 7]
    ],
    "character": "dx5"
},
"642032": {
    "actions": [
        ["def", 12]
    ]
},
"642033": {
    "actions": [
        ["def", 17]
    ]
}
```

### card_actions.js

```javascript
// Counter Move
card_actions["642031"] = (game) => {
    game.increase_idx_def(0, 7);
    game.increase_idx_x_by_c(0, "counter_move_stacks", 1);
}

// 642032
card_actions["642032"] = (game) => {
    game.increase_idx_def(0, 12);
    game.increase_idx_x_by_c(0, "counter_move_stacks", 1);
}

// 642033
card_actions["642033"] = (game) => {
    game.increase_idx_def(0, 17);
    game.increase_idx_x_by_c(0, "counter_move_stacks", 1);
}
```

### gamestate.jscpp - Player.reset()

```cpp
#ifdef HAS_COUNTER_MOVE
        this.counter_move_stacks = 0;
#endif // HAS_COUNTER_MOVE
```

### gamestate.jscpp - damage calculation (Fist stance: 50% damage reduction)

```cpp
#ifdef HAS_COUNTER_MOVE
        if (enemy.counter_move_stacks > 0 &&
            enemy.stance_is_fist) {
            pct_multiplier -= 50;
        }
#endif // HAS_COUNTER_MOVE
```

### gamestate.jscpp - after damage dealt (Stick stance: deal 6 damage back)

```cpp
#ifdef HAS_COUNTER_MOVE
        if (enemy.counter_move_stacks > 0 &&
            !enemy.stance_is_fist) {
            this.deal_damage_inner(6, false, 0);
        }
#endif // HAS_COUNTER_MOVE
```

### preprocess.js

```javascript
HAS_COUNTER_MOVE: [
    "counter_move_stacks",
    "64203"],
```

---

## Example 3: Spirit Cat Chaos Sword (614031-614033)

A Lin Xiaoyue character-specific card with dynamic attack count based on hand size.

### Game Text (from combined_cards.json)

**Level 1** (game_id: 1000009):
- CN: `2攻×2\n每保留1张手牌追加1次攻击（最多追加3次）`
- EN: `2 ATK × 2\nMake an additional attack for every remaining hand card (up to 3)`

**Level 2** (game_id: 1010009):
- CN: `2攻×3\n每保留1张手牌追加1次攻击（最多追加3次）`
- EN: `2 ATK × 3\nMake an additional attack for every remaining hand card (up to 3)`

**Level 3** (game_id: 1020009):
- CN: `2攻×4\n每保留1张手牌追加1次攻击（最多追加3次）`
- EN: `2 ATK × 4\nMake an additional attack for every remaining hand card (up to 3)`

### swogi.json

```json
"614031": {
    "name": "Spirit Cat Chaos Sword",
    "actions": [
        ["for_each_x_up_to_c_add_y", "hand_count", 3, "bonus_rep_amt"],
        ["rep", 2, ["atk", 2]]
    ],
    "character": "sw4"
},
"614032": {
    "actions": [
        ["for_each_x_up_to_c_add_y", "hand_count", 3, "bonus_rep_amt"],
        ["rep", 3, ["atk", 2]]
    ]
},
"614033": {
    "actions": [
        ["for_each_x_up_to_c_add_y", "hand_count", 3, "bonus_rep_amt"],
        ["rep", 4, ["atk", 2]]
    ]
}
```

### card_actions.js

```javascript
// Spirit Cat Chaos Sword
// NOTE: This implementation is suboptimal - it uses bonus_rep_amt property on the
// player object instead of a simple local variable. Should refactor to use a local.
card_actions["614031"] = (game) => {
    game.for_each_x_up_to_c_add_y("hand_count", 3, "bonus_rep_amt");
    for (let i = 0; i < 2 + game.players[0].bonus_rep_amt; i++) {
        game.atk(2);
    }
}

// 614032
card_actions["614032"] = (game) => {
    game.for_each_x_up_to_c_add_y("hand_count", 3, "bonus_rep_amt");
    for (let i = 0; i < 3 + game.players[0].bonus_rep_amt; i++) {
        game.atk(2);
    }
}

// 614033
card_actions["614033"] = (game) => {
    game.for_each_x_up_to_c_add_y("hand_count", 3, "bonus_rep_amt");
    for (let i = 0; i < 4 + game.players[0].bonus_rep_amt; i++) {
        game.atk(2);
    }
}
```

### preprocess.js

```javascript
// bonus_rep_amt is included via HAS_HAND_COUNT dependency
HAS_HAND_COUNT: [
    ...
    "60501", "61403"],
```

No gamestate.jscpp changes needed - `bonus_rep_amt` is a standard card-scoped variable that gets reset each card play.

---

## Property Inheritance in card_info.js

Many card properties are **inherited from the base card (level 1)** if not specified on higher levels. This is done in `card_info.js` using the pattern:
```javascript
const qi_cost = with_default(swogi[card_id].qi_cost, with_default(swogi[base_id].qi_cost, 0));
```

Properties that inherit from level 1:
- `name` - Card name
- `names` - Alternative names array
- `qi_cost` - Qi cost to play (defaults to 0)
- `hp_cost` - HP cost to play
- `character` - Character restriction (e.g., "sw4", "dx5")
- `decrease_qi_cost_by_x` - Dynamic cost reduction
- `water_spirit_cost_0_qi` - Water spirit cost override
- `is_salty` / `is_sweet` - Zongzi flavor tags
- `marking` - Card marking/category
- `gather_qi` - Gather qi amount
- `is_add_qi` - Whether card adds qi

**IMPORTANT**: Properties like `qi_cost` and `hp_cost` inherit from the previous level if not specified. Most cards have the same cost at all levels, so you only need to specify it on level 1. However, a few cards have costs that change between levels - in those cases, you must include the cost on each level where it differs.

---

## Cards with Fewer Than 3 Levels

Some cards don't exist at all levels:
- Most such cards only exist at **level 3** (e.g., Clear Heart Sword Embryo)
- Some only exist at **level 1** (e.g., certain event cards)

For missing levels, you **MUST** add entries with `"does_not_exist": true`:

```json
"611031": {
    "name": "Clear Heart Sword Embryo",
    "does_not_exist": true,
    "actions": [],
    "character": "sw5"
},
"611032": {
    "does_not_exist": true,
    "actions": []
},
"611033": {
    "actions": [
        ["do_clear_heart"]
    ]
}
```

This prevents upgrade/downgrade effects from trying to create non-existent card+level combinations. The game checks `does_not_exist` before allowing level changes:

```javascript
// In gamestate.jscpp upgrade_card_in_hand():
if (swogi[new_card_id].does_not_exist) {
    return;  // Don't upgrade to non-existent level
}
```

---

## Implementation Checklist

1. **Determine card complexity**
   - Simple (no state): only swogi.json + card_actions.js
   - With buffs/triggers: also gamestate.jscpp + preprocess.js

2. **Add to swogi.json**
   - Add entry for each level (xxx1, xxx2, xxx3)
   - Only level 1 needs "name" field (other levels inherit it)
   - **CRITICAL**: Get qi_cost/hp_cost correct - levels inherit from previous level. If cost changes between levels, specify it on each level.
   - For cards that don't exist at all 3 levels, add `"does_not_exist": true` for missing levels
   - Include keywords in actions array needed for attribute detection (continuous, consumption, physique, qi)

3. **Add to card_actions.js**
   - Implement each level's action function
   - Use game.* methods for all effects
   - Add comment with card name for level 1

4. **If card has persistent state:**
   - Add variable in gamestate.jscpp Player.reset() with #ifdef guard
   - Add any turn-start/damage/etc logic with #ifdef guard
   - Call the new do_X function from the appropriate place (sim_turn, atk, etc.)
   - Add dependency entry in preprocess.js

5. **Test**
   - Run `bun preprocess.js` to regenerate gamestate.js
   - Future: MITM game client to download replays and verify implementation matches
