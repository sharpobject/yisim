# Card Implementation Verification Checklist

This file tracks progress on verifying card implementations against the CSV data.

## Verification Checklist Per Card

For each card, verify:
1. card_actions.js implementation matches CSV text/numbers
2. qi_cost and hp_cost in swogi.json match CSV values
3. CN and EN text describe the same effect
4. **For cards with card-specific effects**: Must verify the effect is correctly implemented

### Card-Specific Effects (MUST VERIFY):
These require searching gamestate.jscpp and card_actions.js for all occurrences:
- Custom stacks (e.g., `cloud_sword_softheart_stacks`, `cosmos_seal_stacks`)
- Card-specific mechanics (e.g., `retrigger_previous_sword_formation`, `do_five_elements_circulation`)
- Formation effects that trigger on specific card plays
- [Continuous] effects that add persistent buffs
- "For the next X turns/attacks" effects

### Generic Effects (ASSUME CORRECT):
These are core mechanics that can be assumed to work:
- `chase()`, `continuous()`
- `if_injured()`, `if_cloud_hit()`, `if_star_point()`, `if_wood_spirit()`, etc.
- `for_each_x_add_y()`, `for_each_x_add_c_pct_y()`
- `atk()`, `increase_idx_def()`, `increase_idx_qi()`, `increase_idx_hp()`
- `add_c_of_x(n, "increase_atk")`, `add_c_of_x(n, "penetrate")` (standard buffs)

### How to Verify Card-Specific Effects:
1. Identify the custom stack/buff name in card_actions.js
2. Search gamestate.jscpp for all occurrences of that name
3. Search card_actions.js for all occurrences of that name (buffs may modify other cards' effects)
4. Read the CSV text to understand what the buff should do
5. Verify the gamestate.jscpp and card_actions.js implementations match the CSV description
6. Check if the buff is consumed/triggered correctly during gameplay

## Categories to Check

### Sect Cards
- [x] Sect 1 - Cloud Spirit Sword (prefix 11) - 52 cards verified (buff verification in progress)
- [x] Sect 2 - Heptastar (prefix 12) - 52 cards verified (buff verification in progress)
- [x] Sect 3 - Five Elements (prefix 13) - 51 cards verified (buff verification complete)
- [x] Sect 4 - Duan Xuan/Forge Body Soul (prefix 14) - 52 cards, buff verification complete

### Secret Enchantment Cards
- [ ] S1 Secret Enchantment (prefix 21)
- [ ] S2 Secret Enchantment (prefix 22)
- [ ] S3 Secret Enchantment (prefix 23)
- [ ] S4 Secret Enchantment (prefix 24)

### Side Job Cards
- [x] Elixirist (prefix 31) - 2 custom effects verified
- [x] Fuluist (prefix 32) - 3 custom effects verified
- [x] Musician (prefix 33) - 11 custom effects verified (kindness_tune N/A - meta-game only)
- [x] Painter (prefix 34) - 4/5 custom effects verified ✅ (trigger_random_sect_card is TODO stub)
- [x] Formation Master (prefix 35) - 10/11 effects verified ✅ (octgates_lock_formation may have player index bug)
- [x] Plant Master (prefix 36) - 9/10 effects verified ✅ (devouring_ancient_vine may have player index bug, Mystery Seed N/A)
- [x] Fortune Teller (prefix 37) - 11/12 effects verified ✅ (god_opportunity_reversal has wrong % and rounding)

### Spiritual Pet & Talisman
- [x] Spiritual Pet (prefix 50) - 12/13 effects verified ✅ (nether_void_canine has player index bug)
- [x] Talisman (prefix 40) - 1 custom effect verified ✅

### Sect Secret Enchantment
- [x] S1 Secret Enchantment (prefix 21) - 7 custom effects verified ✅
- [x] S2 Secret Enchantment (prefix 22) - 8 custom effects verified ✅
- [x] S3 Secret Enchantment (prefix 23) - 6 custom effects verified (metal_spirit_chokehold has duration mismatch)
- [x] S4 Secret Enchantment (prefix 24) - 7 custom effects verified ✅

### Character-Specific Cards
- [x] Character-specific S1 (prefix 61) - 3 custom effects verified ✅
- [x] Character-specific S2 (prefix 62) - 2 custom effects verified ✅
- [x] Character-specific S3 (prefix 63) - 1 custom effect verified ✅
- [x] Character-specific S4 (prefix 64) - 3 custom effects verified ✅

### Fusion Cards
- [x] Fusion Side Jobs (prefix 90) - 5 custom effects verified ✅
- [x] Fusion S1 (prefix 91) - 2 custom effects verified ✅
- [x] Fusion S2 (prefix 92) - verified (uses standard mechanics)
- [x] Fusion S3 (prefix 93) - verified (uses standard mechanics)
- [x] Fusion S4 (prefix 94) - verified (uses standard mechanics)

### Seasonal/Mirage Cards
- [ ] Neutral Seasonal (prefix 70)
- [ ] S1 Seasonal (prefix 71)
- [ ] S2 Seasonal (prefix 72)
- [ ] S3 Seasonal (prefix 73)
- [ ] S4 Seasonal (prefix 74)

### Other
- [ ] General (prefix 60)
- [ ] Zongzi Event (prefix 80)

## Buff/Special Function Verification Checklist

This checklist tracks verification of all unique effects discovered by reading card_actions.js implementations.

### Sect 1 (Cloud Spirit Sword) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `cloud_sword_softheart_stacks` | Cloud Sword - Softheart | ✅ | Heals 2/3/4 per Cloud Sword played |
| `spirit_gather_citta_dharma_stacks` | Spirit Gather Citta-Dharma | ✅ | 1 stack=every 2 turns, 2 stacks=every turn |
| `centibird_spirit_sword_rhythm_stacks` | CentiBird Spirit Sword Rhythm | ✅ | Reduces Spirit Sword qi cost |
| `moon_water_sword_formation_stacks` | Moon Water Sword Formation | ✅ | Prevents def decay for N turns |
| `unrestrained_sword_zero_stacks` | Unrestrained Sword - Zero | ✅ | Heals 30/50/70% of Unrestrained Sword injury |
| `cloud_sword_chain_count` | Core mechanic | ✅ | Counts consecutive Cloud Swords |
| `retrigger_previous_sword_formation()` | Chain Sword Formation | ✅ | Searches backwards for Sword Formation |
| `regain_sword_intent()` | Flying Fang Sword | ✅ | Returns consumed sword_intent, sets sword_intent_flow_mode to prevent re-consumption |
| `exhaust_x_to_add_y("sword_intent", "qi")` | Consonance Sword Formation | ✅ | Converts sword_intent to qi 1:1 |
| `unrestrained_sword_count` | Unrestrained Sword cards | ✅ | Tracks plays, adds N ATK per play |
| `next_turn_def()` | Reflexive Sword | ✅ | Stores value, applies at turn start |
| `for_each_x_add_c_pct_y("sword_intent",N,"sword_intent")` | Sword Intent Surge | ✅ | Adds N% of current sword_intent |

### Sect 2 (Heptastar) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `hexagram_formacide_stacks` | Hexagram Formacide | ✅ | Deals 3/4/5 DMG per Hexagram gained |
| `stillness_citta_dharma_stacks` | Stillness Citta-Dharma | ✅ | +2/3/4 HP per Qi gained |
| `repel_citta_dharma_stacks` | Repel Citta-Dharma | ✅ | Deal 2/3/4 DMG when attacked |
| `strike_twice_stacks` | Strike Twice | ✅ | Next card triggers twice |
| `hunter_hunting_hunter_stacks` | Hunter Hunting Hunter | ✅ | +7/10/13 ATK after Post Action cards |
| `skip_next_card_stacks` | Core mechanic | ✅ | Skips next N cards |
| `reverse_card_play_direction()` | Hunter Hunting Hunter | ✅ | Reverses card play direction |
| `become_star_point(N)` | Shifting Stars, etc. | ✅ | Marks next N slots as star points; gives qi if already star point |
| `if_star_point()` | Astral Move cards | ✅ | Returns true if current card is on a star point |
| `star_power` | Multiple cards | ✅ | Added to ATK when attacking on star point |
| `hexagram` | Hexagram cards | ✅ | Consumed to guarantee max on random rolls |
| `triggered_hexagram_count` | Thunder Hexagram Rhythm | ✅ | Tracks hexagrams triggered in battle |
| `atk_rand_range()` / `def_rand_range()` | Thunder cards | ✅ | Random ATK/DEF within range, hexagram guarantees max |
| `if_c_pct(N)` | Thunder cards | ✅ | N% chance, hexagram guarantees success |
| `if_post_action()` | Post Action cards | ✅ | Checks if card can post action |
| `if_enemy_has_debuff()` | Ruthless Water | ✅ | Returns true if enemy has any debuff |
| `hp_gained` | Revitalized | ✅ | Tracks HP gained this turn |
| `guard_up` | Escape Plan | ✅ | Prevents incoming HP damage |
| `do_star_trail_divination()` | Star Trail Divination | ✅ | Exhausts hexagram for star_power/qi/hp |
| `do_thunder_and_lightning()` | Thunder And Lightning | ✅ | 2x random ATK, qi if hexagram triggered |
| `do_polaris_citta_dharma()` | Polaris Citta-Dharma | ✅ | +1 star power if slot 1, all slots become star point |
| `do_propitious_omen()` | Propitious Omen | ✅ | Adds to largest of qi/hexagram/star_power |
| `do_internal_injury()` | Extremely Suspicious | ✅ | Triggers internal injury damage immediately |

### Sect 3 (Five Elements) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `cosmos_seal_stacks` | Cosmos Seal | ✅ | Auto-activates element on Five Elements card |
| `earth_spirit_cliff_stacks` | Earth Spirit - Cliff | ✅ | DMG when def reduced |
| `water_spirit_spring_stacks` | Water Spirit - Spring | ✅ | Force of water per injury (20% ratio) |
| `water_spirit_dive_stacks` | Water Spirit - Dive | ✅ | 40% less ATK |
| `metal_spirit_iron_bone_stacks` | Metal Spirit - Iron Bone | ✅ | -5 incoming damage |
| `earth_spirit_combine_world_stacks` | Earth Spirit - Combine World | ✅ | Restore def when reduced |
| `metal_spirit_giant_tripod_stacks` | Metal Spirit - Giant Tripod | ✅ | Double HP deduction |
| `five_elements_heavenly_marrow_rhythm_stacks` | Five Elements Heavenly Marrow Rhythm | ✅ | Chase for non-ATK Five Elements |
| `ultimate_world_formation` / `do_ultimate_world_formation()` | Ultimate World Formation | ✅ | Chase on element activation |
| `wood_spirit_formation_stacks` | Wood Spirit Formation | ✅ | +2/3/4 HP per Wood Spirit |
| `fire_spirit_formation_stacks` | Fire Spirit Formation | ✅ | -2/3/4 enemy HP/MaxHP per Fire Spirit |
| `earth_spirit_formation_stacks` | Earth Spirit Formation | ✅ | +2/3/4 DEF per Earth Spirit |
| `metal_spirit_formation_stacks` | Metal Spirit Formation | ✅ | +1/2/3 Penetrate per Metal Spirit |
| `water_spirit_formation_stacks` | Water Spirit Formation | ✅ | +1 Qi per Water Spirit |
| `activate_[element]_spirit()` | Element Seal cards | ✅ | Adds 1 stack of element activation |
| `if_[element]_spirit()` | Element Spirit cards | ✅ | True if element activated or previous card is that element |
| `force_of_water` | Water Spirit cards | ✅ | Deals damage at end of turn |
| `get_n_activated()` | Five Elements Fleche | ✅ | Counts currently activated elements |
| `get_n_different_five_elements()` | World Smash, Heavenly Marrow | ✅ | Counts different element types in deck |
| `smash_def` | Forest Guard, World Smash | ✅ | Attack ignores 50% of enemy def |
| `chase_if_hp_gained` | Wood Spirit - Forest Guard | ✅ | Chase if HP was gained this card |
| `def_lost` | Earth Spirit - Steep/Quicksand | ✅ | Tracks total def lost |
| `damage_dealt_to_hp_by_this_card_atk` | Wood Spirit - Thorn, Fire Spirit - Heart Fire | ✅ | Tracks HP damage by this card's attacks |
| `disable_penetrate_stacks` | Metal Spirit - Shuttle | ✅ | Next attack doesn't trigger penetrate |
| `do_five_elements_circulation()` | Five Elements Circulation | ✅ | If prev/next have generating interaction, trigger next |
| `do_earth_spirit_dust()` | Earth Spirit - Dust | ✅ | 25% of max HP difference as DEF |
| `do_metal_spirit_charge()` | Metal Spirit - Charge | ✅ | Penetrate + def/4 if metal spirit |
| `do_fire_spirit_blazing_praerie()` | Fire Spirit - Blazing Prairie | ✅ | Reduce enemy max HP to HP - amt |

### Sect 4 (Forge Body Soul) Effects - Prefix 14 only
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `later_crash_fist_poke_stacks` / `crash_fist_poke_stacks` | Crash Fist - Poke, Subdue Dragon | ✅ | Adds to bonus_atk_amt for Crash Fist; resets after non-Continue Crash Fist attack |
| `crash_fist_block_stacks` | Crash Fist - Block, Subdue Dragon | ✅ | Adds DEF for Crash Fist via for_each_x_add_y |
| `crash_fist_bounce_stacks` | Crash Fist - Bounce | ✅ | Refunds HP cost of next Crash Fist |
| `crash_fist_shake_stacks` | Crash Fist - Shake | ✅ | Adds force via for_each_x_add_y for Crash Fist |
| `crash_fist_entangle_stacks` | Crash Fist - Entangle | ✅ | Applies wound to enemy for Crash Fist |
| `crash_fist_blitz_stacks` | Crash Fist - Blitz | ✅ | Enables smash_def for Crash Fist attacks |
| `crash_fist_truncate_stacks` | Crash Fist - Truncate | ✅ | Transfers debuff for Crash Fist |
| `crash_fist_inch_force_stacks` | Crash Fist - Inch Force | ✅ | Doubles force damage multiplier for Crash Fist |
| `crash_fist_blink_stacks` | Crash Fist - Blink | ✅ | Adds agility via for_each_x_add_y for Crash Fist |
| `crash_fist_shocked_stacks` | Crash Fist - Shocked | ✅ | Adds ATK = 1 + 20% of hp_lost for Crash Fist |
| `physique` / `physique()` | Exercise Fist, Tendons, Bones, Marrow, Soul | ✅ | Increases physique and max_hp 1:1 |
| `force` / `increase_idx_force()` | Gather Force, Vigorous Force, etc. | ✅ | Capped at max_force (6); excess converts to DEF |
| `agility` | Crash Footwork, Sailing Through Sky, etc. | ✅ | 10 agility = 1 chase |
| `crash_footwork_stacks` | Crash Footwork | ✅ | Makes any card count as Crash Fist (continuous) |
| `elusive_footwork_stacks` | Elusive Footwork | ✅ | On first damage, +1 qi (continuous) |
| `crash_citta_dharma_stacks` | Crash Citta-Dharma | ✅ | HP cost cards add force = stacks (continuous) |
| `exercise_bones_stacks` | Exercise Bones | ✅ | Triggered to add 1 physique |
| `majestic_qi_stacks` | Majestic Qi | ✅ | On attack, -1 stack +1 force |
| `transfer_random_debuff()` | Crash Fist - Truncate | ✅ | Moves 1 stack of random debuff from self to enemy |
| `reduce_random_debuff_by_c_n_times()` | Mountain Falling | ✅ | Reduces random debuffs by c, n times |
| `get_debuff_count()` | Soul Seizing, Bearing The Load | ✅ | Returns total debuff stacks on player |
| `hexproof` | Magnanimous Righteousness | ✅ | Blocks incoming debuffs stack for stack |
| `decrease_atk` | Styx Agility | ✅ | Reduces ATK dealt by stacks |
| `for_each_x_add_c_pct_y_up_to_d()` | Detect-Horse Palms, Crane Footwork | ✅ | Standard formula helper |

## Progress Log

### 2024-12-28: Sect 1 - Cloud Spirit Sword
- Verified all 52 card types (156 cards with 3 levels each)
- All card action implementations match CSV text
- Found 1 qi_cost mismatch: Sword Intent Surge (see MISMATCHED_CARDS.md)

### 2024-12-28: Sect 2 - Heptastar
- Verified all 52 card types (156 cards with 3 levels each)
- All card action implementations match CSV text
- All qi_cost values match
- No mismatches found

### 2024-12-28: Sect 3 - Five Elements
- Verified all 51 card types (153 cards with 3 levels each)
- All card action implementations match CSV text
- All qi_cost values match (checked: Wood Spirit - Bud, Fire Spirit - Rush, Water Spirit - Waves, etc.)
- CN/EN text matches for all verified cards
- No mismatches found

### 2024-12-28: Phase 1 Complete - Buff Verification for Sects 1-3
- All Sect 1 buffs verified (cloud_sword_softheart_stacks, regain_sword_intent, etc.)
- All Sect 2 buffs verified (star_power, hexagram, if_star_point, etc.)
- All Sect 3 buffs verified (activate_element_spirit, force_of_water, etc.)

### Elixirist (prefix 31) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `reduce_random_debuff_by_c_n_times()` | Exorcism Elixir (312021-312023) | ✅ | Reduces 3 stacks from random debuff, 2/3/4 times |
| `for_each_x_add_c_y("qi", 2, "hp")` | Healing Elixir (313011-313013) | ✅ | Add 2 HP per Qi |

### Fuluist (prefix 32) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `deal_damage_rand_range()` | Thunder Fulu (321011-321013) | ✅ | Deal 4-12/7-15/10-18 random damage |
| `reduce_enemy_x_by_c_pct_enemy_y()` | Soul Requiem Fulu (325011-325013) | ✅ | Reduce enemy HP/MaxHP by 15/20/25% |
| `for_each_x_up_to_c_add_y()` | Spiritage Incantation (324011-324013) | ✅ | 1 DEF per Qi, up to 7/13/19 |

### Musician (prefix 33) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `has_played_musician_card` | Cracking Voice, Tremolo | ✅ | Set when musician card played; +1 ATK if >=1 |
| `carefree_tune_stacks` | Carefree Tune (331031-331033) | ✅ | Added to atk_amt in do_normal_attack() |
| `kindness_tune_stacks` | Kindness Tune (332011-332013) | N/A | Affects Destiny (meta-game), not in-battle; intentionally unused in sim |
| `illusion_tune_stacks` | Illusion Tune (332021-332023) | ✅ | do_illusion_tune(): reduce HP, add DEF by stacks |
| `heartbroken_tune_stacks` | Heartbroken Tune (333011-333013) | ✅ | do_heartbroken_tune(): add internal_injury by stacks |
| `craze_dance_tune_stacks` | Craze Dance Tune (333021-333023) | ✅ | Added to dmg in attack calculation (all attacks) |
| `regen_tune_stacks` | Regen Tune (334011-334013) | ✅ | do_regen_tune(): add max_hp and heal by stacks |
| `add_my_x_to_enemy_y()` | Concentric Tune (334031-334033) | ✅ | Adds player's x to enemy's y |
| `predicament_for_immortals_stacks` | Predicament for Immortals (335011-335013) | ✅ | Blocks chase in process_this_card_chases() |
| `apparition_confusion_stacks` | Apparition Confusion (335021-335023) | ✅ | reduce_my_hp(stacks) when attacking |
| `do_chord_in_tune_thing()` | Chord In Tune (335031-335033) | ✅ | Chase if has_played_musician_card>0 or next card marking="mu" |

### Painter (prefix 34) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `def_rand_range()` | Pen Walks Dragon Snake (342011-342013) | ✅ | Random DEF 5-16/10-21/15-26, uses rand_range() |
| `inspiration_stacks` | Inspiration (343021-343023) | ✅ | Next card Qi cost reduced by N, then resets to 0 |
| `trigger_random_sect_card()` | Divine Brush (344011-344013) | ❌ | **TODO STUB** - function sets used_randomness but does nothing |
| `flying_brush_stacks` | Flying Brush (345011-345013) | ✅ | After next card, Chase via do_flying_brush_chase() |
| `finishing_touch_stacks` | Finishing Touch (345021-345023) | ✅ | Upgrade next N cards via try_upgrade_card() (temp) |

### Formation Master (prefix 35) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `thunderphilia_formation_stacks` | Thunderphilia Formation (351011-351013) | ✅ | End of turn: deal 4 DMG, consume 1 stack |
| `fraccide_formation_stacks` | Fraccide Formation (351021-351023) | ✅ | On attack: +3 dmg + smash_def, consume 1 stack |
| `scutturtle_formation_stacks` | Scutturtle Formation (352011-352013) | ✅ | End of turn: +3 DEF, consume 1 stack |
| `cacopoisonous_formation_stacks` | Cacopoisonous Formation (352021-352023) | ✅ | Turn start: +1 internal_injury to enemy |
| `spiritage_formation_stacks` | Spiritage Formation (353011-353013) | ✅ | Turn start: +2 Qi |
| `endless_sword_formation_stacks` | Endless Sword Formation (353021-353023) | ✅ | After ATK card: +5 ATK |
| `heavenly_spirit_forceage_formation_stacks` | Heavenly Spirit Forceage (354011-354013) | ✅ | Turn start: +1 increase_atk |
| `octgates_lock_formation_stacks` | Octgates Lock Formation (354021-354023) | ⚠️ | Enemy debuff - deals 8 DMG before enemy chase; stacks added to player 1 but impl reads player 0 |
| `motionless_tutelary_formation_stacks` | Motionless Tutelary (354031-354033) | ✅ | End of turn: +7 DEF, +7 HP/MaxHP if no chase |
| `anthomania_formation_stacks` | Anthomania Formation (355011-355013) | ✅ | End of turn: +1 decrease_atk to enemy, steal HP = enemy decrease_atk |
| `do_echo_formation_thing()` | Echo Formation (355021-355023) | ✅ | Retrigger slot 1 if continuous, with upgrade 0/1/2 |

### Plant Master (prefix 36) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `hard_bamboo_stacks` | Hard Bamboo (361023) | ✅ | End of turn: deal (def/4) * stacks damage |
| Mystery Seed (362021-362023) | Mystery Seed | N/A | Meta-game card transformation - intentionally empty in battle |
| `leaf_shield_flower_stacks` | Leaf Shield Flower (362033) | ✅ | Up to half of HP loss absorbed by DEF |
| `leaf_blade_flower_stacks` | Leaf Blade Flower (362043) | ✅ | All attacks get smash_def effect |
| `do_qi_seeking_sunflower()` | Qi-seeking Sunflower (363013) | ✅ | +4 Qi, +2 more if either side has Qi > 0 |
| `do_qi_corrupting_sunflower()` | Qi-corrupting Sunflower (363023) | ✅ | Enemy -3 Qi, deal 5 dmg per missing Qi |
| `frozen_snow_lotus_stacks` | Frozen Snow Lotus (364013) | ✅ | Next 3 HP losses → gain equal DEF |
| `do_frozen_blood_lotus()` | Frozen Blood Lotus (364031-364033) | ✅ | -10 HP N times (min 1 left), +N guard_up |
| `entangling_ancient_vine_stacks` | Entangling Ancient Vine (365033) | ✅ | When entangle blocks chase, add 2 wound |
| `devouring_ancient_vine_stacks` | Devouring Ancient Vine (365043) | ⚠️ | Enemy debuff - steal HP on chase; stacks added to player 1 but impl reads player 0 |
| `shadow_owl_reishi_stacks` | Shadow Owl Reishi (absorb) | ✅ | Battle start: -HP (stacks amt), +1 flying_brush_stacks |
| Other absorb plants | Divine Power Grass, Lose Power Grass, etc. | N/A | Non-playable absorb cards - stacks initialized but effects not wired up (see UNIMPLEMENTED_CARDS.md) |

### Fortune Teller (prefix 37) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `observe_body_stacks` | Examine Body (371041-371043) | ✅ | After ATK card, deal stacks as extra ATK |
| `god_luck_approach_stacks` | Heavenly Fortune - Seek Fortune (372011-372013) | ✅ | On opening card: trigger opening + deal 3 DMG |
| `god_luck_avoid_stacks` | Heavenly Fortune - Shun Misfortune (372021-372023) | ✅ | On non-opening card: +3 DEF +2 HP |
| `bad_omen_stacks` | Bad Omen (372041-372043) | ✅ | When enemy loses HP: -1 stack, +1 wound |
| `skip_to_previous_card_stacks` | Heavenly Time - Recurring (373021-373023) | ✅ | Skip to previous card by reversing direction |
| `everything_goes_way_stacks` | Everything Goes Your Way (374011-374013) | ✅ | ATK minimum 6 while stacks > 0 |
| `retrigger_next_opening()` | God Star - Promotion/Traction (374021-374033) | ✅ | Triggers N openings in direction M times each |
| `nothing_is_appropriate_stacks` | Everything is Unadvisable (374041-374043) | ✅ | Reduce incoming ATK by 6, -1 stack per attack |
| `fate_reincarnates_stacks` | Cycle of Fate (375021-375023) | ✅ | Skip slot 4/5, trigger opening instead |
| `god_opportunity_conform_stacks` | Heavenly Will - Comply (375031-375033) | ✅ | DEF/HP/MaxHP +40% (ceil(amt*14/10)) |
| `god_opportunity_reversal_stacks` | Heavenly Will - Defy (375041-375043) | ⚠️ | CSV says 50% rounded down, impl uses 60% rounded up |
| Opening effects (swogi.json) | Multiple cards | ✅ | Foretell Fate, Examine Body, Detect Qi, Bad Omen, Disaster of Bloodshed, etc. |

### Spiritual Pet (prefix 50) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `break_sky_eagle_stacks` | Break Sky Eagle (501011-501013) | ✅ | Each turn: deal stacks as DMG |
| `fat_immortal_raccoon_stacks` | Fat Immortal Raccoon (501021-501023) | ✅ | Each turn: heal by stack amount |
| `dark_star_bat_stacks` | Dark Star Bat (502011-502013) | ✅ | If ATK dmg dealt ≤ stacks, heal that amount |
| `lonely_night_wolf_stacks` | Lonely Night Wolf (502021-502023) | ✅ | If HP < 50% max, all cards +stack ATK |
| `black_earth_turtle_stacks` | Black Earth Turtle (503011-503013) | ✅ | After losing HP, +stacks DEF |
| `brocade_rat_stacks` | Brocade Rat (503021-503023) | N/A | Meta-game effect (extra card draw at battle end) |
| `scarlet_eye_the_sky_consumer_stacks` | Scarlet-Eye The Sky Consumer (504011-504013) | ✅ | Each turn: steal stacks HP from enemy |
| `ashes_phoenix_stacks` | Ashes Phoenix (504021-504023) | ✅ | Revive with stacks HP and +stacks max HP |
| `three_tailed_cat_stacks` | Three Tailed Cat (504031-504033) | ✅ | Each turn: +1 hexproof (stacks always = 1) |
| `colorful_spirit_crane_stacks` | Colorful Spirit Crane (505011-505013) | ✅ | Qi gains doubled when stacks > 0 |
| `shadow_owl_rabbit_stacks` | Shadow Owl Rabbit (505021-505023) | ✅ | All cards Chase, but lose stacks HP before chase |
| `void_the_spirit_consumer_stacks` | Void The Spirit Consumer (506011-506013) | ✅ | Each turn: steal stacks Qi from enemy |
| `nether_void_canine_stacks` | Nether Void Canine (506021-506023) | ⚠️ | Player index bug: stacks added to enemy (player 1), but do_nether_void_canine reads player 0 |

### Talisman (prefix 40) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `carefree_guqin_stacks` | Carefree Guqin (404031-404033) | ✅ | Both players' Normal Attack +N ATK and gains Chase |
| `for_each_x_add_y("def", "def")` | Celestial Vine Rattan Armor (401011-401013) | ✅ | Generic doubling function |
| HP threshold condition | Nameless Ancient Sword (402021-402023) | ✅ | If HP ≤ 11, double ATK |
| `for_each_x_reduce_c_pct_y("hp", 15, "hp")` | Blood Crystal of Wolf King (403031-403033) | ✅ | Reduce HP by 15% |
| `if_injured()` | Bow of Hunting Owl (405031-405033) | ✅ | Standard condition - add entangle if injured |
| `cannot_act_stacks` | Mysterious Gates Devil Seal Tower (406021-406023) | ✅ | Standard debuff - enemy skips turns |

### S1 Secret Enchantment (prefix 21) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `sword_intent_flow_stacks` | Sword Intent Flow (214011-214013) | ✅ | Next attack keeps sword_intent |
| `emptiness_sword_formation_stacks` | Emptiness Sword Formation (214021-214023) | ✅ | After Sword Formation, +stacks ATK |
| `apex_sword_citta_dharma_stacks` | Apex Sword Citta-Dharma (215011-215013) | ✅ | Each turn start: +stacks sword_intent |
| `step_moon_into_cloud_stacks` | Step Moon Into Cloud (215021-215023) | ✅ | After Cloud Sword: +stacks increase_atk |
| `unrestrained_sword_twin_dragons_stacks` | Unrestrained Sword - Twin Dragons (215031-215033) | ✅ | Next Unrestrained Sword triggers twice |
| `bonus_sword_intent_multiplier` | One Heart One Sword (213021-213023) | ✅ | Multiplies sword_intent bonus on attack |
| `ignore_weaken()` | One Heart One Sword (213021-213023) | ✅ | Ignores weaken for this attack |

### S2 Secret Enchantment (prefix 22) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `vitality_blossom_stacks` | Vitality Blossom (222011-222013) | ✅ | Heals on HP loss |
| `do_sun_and_moon_for_glory()` | Sun And Moon For Glory (223011-223013) | ✅ | ATK with multiplier based on HP |
| `thunder_citta_dharma_stacks` | Thunder Citta-Dharma (224031-224033) | ✅ | Adds % damage multiplier |
| `preemptive_strike_stacks` | Preemptive Strike (225021-225023) | ✅ | Acts before enemy |
| `covert_shift_stacks` | Covert Shift (226021-226023) | ✅ | Reverses HP damage to healing |
| `bonus_star_power_multiplier` | Astral Move - Dragon Slay (224021-224023) | ✅ | Multiplies star_power bonus |
| `if_post_action()` | Star Born Rhythm (222021-222023) | ✅ | Checks if after enemy action |
| `exhaust_x()` | Hexagrams Spirit Resurrection (221011-221013) | ✅ | Consumes all of a stat |

### S3 Secret Enchantment (prefix 23) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `metal_spirit_chokehold_stacks` | Metal Spirit - Chokehold (232011-232013) | ⚠️ | Duration mismatch: CSV says turn-based, impl is HP-loss-based |
| `do_fire_spirit_rhythm_earth()` | Fire Spirit - Rhythm Earth (232031-232033) | ✅ | Fire Spirit: burn enemy, +DEF |
| `do_metal_spirit_rhythm_water()` | Metal Spirit - Rhythm Water (233021-233023) | ✅ | Metal Spirit: +penetrate |
| `do_five_elements_escape()` | Five Elements Escape (233031-233033) | ✅ | +DEF per active element |
| `do_fire_spirit_burning_sky()` | Fire Spirit - Burning Sky (235011-235013) | ✅ | ATK per fire spirit stack |
| `trigger_card_by_id()` | Five Elements Blossom (236021-236023) | ✅ | Triggers specific card effects |

### S4 Secret Enchantment (prefix 24) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `endless_force_stacks` | Endless Force (241021-241023) | ✅ | If force=0, gain stacks as force |
| `toxin_immunity_stacks` | Toxin Immunity (242011-242013) | ✅ | Turn end: heal per debuff (capped) |
| `lying_drunk_stacks` | Lying Drunk (242021-242023) | ✅ | Normal Attack repeats +stacks times |
| `crash_fist_double_stacks` | Crash Fist - Double (244021-244023) | ✅ | Next attack triggers twice |
| `get_debuff_count()` | Break Cocoon (245011-245013) | ✅ | Counts all debuff stacks |
| `do_endless_crash()` | Endless Crash (246011-246013) | ✅ | Repeated ATK based on physique |
| `return_to_simplicity_stacks` | Return To Simplicity (246021-246023) | ✅ | Normal Attack +ATK and +agility |

### Character-Specific S1 (prefix 61) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `do_clear_heart()` | Clear Heart Sword Embryo (611033) | ✅ | Lv3 only - triggers sword formation effect |
| `ignore_def` | Cloud Sword - Cat Paw (612011-612013) | ✅ | Ignores 1 DEF per hit |
| `hand_count` | Spirit Cat Chaos Sword (614031-614033) | ✅ | ATK repeats based on cards in hand |

### Character-Specific S2 (prefix 62) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `ultimate_hexagram_base_stacks` | Ultimate Hexagram Base (623011-623013) | ✅ | Turn start: +2 hexagram |
| `resonance_within_reach_stacks` | Within Reach (624021-624023) | ✅ | Round 11+: adds debuffs before ATK calc |

### Character-Specific S3 (prefix 63) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `kun_wu_metal_ring_stacks` | Kun Wu Metal Ring (633011-633013) | ✅ | Adds to Qi gain amount |

### Character-Specific S4 (prefix 64) Effects
| Effect | Card(s) | Verified? | Notes |
|--------|---------|-----------|-------|
| `overwhelming_power_stacks` | Overwhelming Power (642021-642023) | ✅ | Deals damage when losing DEF |
| `counter_move_stacks` | Counter Move (642031-642033) | ✅ | Counters enemy attacks |
| `crash_fist_stygian_night_stacks` | Crash Fist - Stygian Night (644011-644013) | ✅ | ATK bonus based on debuffs (capped) |
