# Unimplemented Cards

Cards that exist in card_data.csv but are not yet implemented in swogi.json.

*This list excludes:*
- Unused/decoration cards
- Cards with only [Absorb]/[Exchange]/[Growth] abilities
- Cards not playable in deck (merge utilities, etc.)

---

## Not in swogi.json (15 cards)

### Character Specific (4)

| CSV base_id | Name |
|-------------|------|
| 214 | Jade Scroll of Yin Symbol |
| 215 | Solitary Void Golden Scroll |
| 216 | Face Isolation |
| 217 | Strike Vacuity |

### Event Mode (1)

| CSV base_id | Name |
|-------------|------|
| 42 | Waiting for Rabbit |

### Seasonal Mirage Selectable (9)

| CSV base_id | Name |
|-------------|------|
| 289 | M - Flower Sentient |
| 310 | M - Magnanimous Righteousness |
| 315 | M - Fire Spirit Seal |
| 316 | M - Metal Spirit Seal |
| 317 | M - Earth Spirit Formation |
| 318 | M - Endless Entanglement |
| 319 | M - Crash Fist Entangle |
| 320 | M - Yin Yang Formation |
| 324 | M - Vitality Blossom |

### Seasonal Mirage Special (1)

| CSV base_id | Name |
|-------------|------|
| 322 | Xiaoyao - Reproduction |

---

## Known Implementation Issues

### Painter (prefix 34)
| Card ID | Card Name | Issue | Expected Behavior |
|---------|-----------|-------|-------------------|
| 344011-344013 | Divine Brush | `trigger_random_sect_card()` is TODO stub | Should trigger effect of a random sect card 1/2/3 times (per upgrade level) |

**Notes:**
- Divine Brush adds DEF correctly but the random sect card trigger does nothing
- The function exists in gamestate.jscpp:6126 but only sets `used_randomness = true`

### Plant Master (prefix 36) - Absorb Effects
These cards have [Absorb] effects that apply at battle start. Only shadow_owl_reishi is implemented.

| Card ID (CSV) | Card Name | Issue | Expected Behavior |
|---------------|-----------|-------|-------------------|
| 9020008 | Divine Power Grass (Lv3) | Stacks initialized but never used | +1 increase_atk at battle start |
| 9020022 | Lose Power Grass (Lv3) | Stacks initialized but never used | +1 decrease_atk to enemy at battle start |
| 9020004 | Healing Chamomile (Lv3) | Stacks initialized but never used | +2 regen at battle start |
| 9020023 | Clear Chamomile (Lv3) | Stacks initialized but never used | +3 hexproof at battle start |
| 9020010 | Flying Owl Reishi (Lv3) | Stacks initialized but never used | +2 speed at battle start |
| 9020012 | Toxic Purple Fern (Lv3) | Stacks initialized but never used | +2 internal_injury to enemy at battle start |

**Note**: shadow_owl_reishi IS implemented (do_shadow_owl_reishi in gamestate.jscpp:7112) - loses HP, gains flying_brush_stacks
