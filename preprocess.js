#!/usr/bin/env bun

import { preprocessJavaScript } from './preprocessor.js';
import fs from 'fs';
import { execSync } from 'child_process';

// HAS_SHADOW_OWL_REISHI -> HAS_FLYING_BRUSH

const deps = {
    HAS_BAD_OMEN: ["37204", "bad_omen_stacks"],
    HAS_BLOSSOM_DANCE: ["blossom_dance_stacks"],
    HAS_COURAGE_TO_FIGHT: ["courage_to_fight_stacks"],
    HAS_COVERT_SHIFT: ["22602", "covert_shift_stacks"],
    HAS_CRASH_FIST_ENTANGLE: ["14202", "crash_fist_entangle_stacks"],
    HAS_CYCLE_OF_FIVE_ELEMENTS_AND_FRIENDS: [
        "HAS_P2_CYCLE_OF_FIVE_ELEMENTS",
        "HAS_P3_CYCLE_OF_FIVE_ELEMENTS",
        "HAS_P4_CYCLE_OF_FIVE_ELEMENTS",
        "HAS_P5_CYCLE_OF_FIVE_ELEMENTS",
        "HAS_BLOSSOM_DANCE"],
    HAS_P2_CYCLE_OF_FIVE_ELEMENTS: ["p2_cycle_of_five_elements_stacks"],
    HAS_P3_CYCLE_OF_FIVE_ELEMENTS: ["p3_cycle_of_five_elements_stacks"],
    HAS_P4_CYCLE_OF_FIVE_ELEMENTS: ["p4_cycle_of_five_elements_stacks"],
    HAS_P5_CYCLE_OF_FIVE_ELEMENTS: ["p5_cycle_of_five_elements_stacks"],
    HAS_ENTANGLING_ANCIENT_VINE: ["36503", "entangling_ancient_vine_stacks"],
    HAS_FIRE_FLAME_BLADE: ["fire_flame_blade_stacks"],
    HAS_GUARD_UP: ["HAS_PEACH_BRANCH_RUYI", "guard_up",
        "36403", "12409", "24302", "31501", "34402", "40501",
        "40502", "60509", "61502", "90403", "91503", "91601"],
    HAS_PEACH_BRANCH_RUYI: ["peach_branch_ruyi_stacks"],
    HAS_IGNORE_GUARD_UP: ["91601", "ignore_guard_up"],
    HAS_INTERNAL_INJURY: ["HAS_TOXIC_PURPLE_FERN",
        "HAS_MARK_OF_DARK_HEART",
        "HAS_HEARTBROKEN_TUNE",
        "HAS_MEDITATION_OF_XUAN",
        "HAS_CACOPOISONOUS_FORMATION",
        "HAS_ZONGZI_MODE",
        "HAS_RESONANCE_WITHIN_REACH",
        "internal_injury",
        "12210", "12307", "12410", "14108", "14308", "14505",
        "14506", "22401", "24401", "24501", "24502", "32202",
        "32303", "32503", "33403", "34301", "37303", "37501",
        "40301", "60301", "60507", "60601", "62303", "64301",
        "72502", "92401", "94402"],
    HAS_MARK_OF_DARK_HEART: ["HAS_P2_MARK_OF_DARK_HEART",
        "HAS_P3_MARK_OF_DARK_HEART",
        "HAS_P4_MARK_OF_DARK_HEART",
        "HAS_P5_MARK_OF_DARK_HEART"],
    HAS_P2_MARK_OF_DARK_HEART: ["p2_mark_of_dark_heart_stacks"],
    HAS_P3_MARK_OF_DARK_HEART: ["p3_mark_of_dark_heart_stacks"],
    HAS_P4_MARK_OF_DARK_HEART: ["p4_mark_of_dark_heart_stacks"],
    HAS_P5_MARK_OF_DARK_HEART: ["p5_mark_of_dark_heart_stacks"],
    HAS_METAL_SPIRIT_GIANT_TRIPOD: ["13504", "metal_spirit_giant_tripod_stacks"],
    HAS_PENETRATE: ["13108", "13207", 
        "13308", "13407", "23104", "63401", "73502", "13307",
        "p5_cycle_of_five_elements_stacks",
        "five_elements_anima_stacks",
        "HAS_METAL_SPIRIT_RHYTHM_WATER",
        "HAS_EARTH_SPIRIT_RHYTHM_METAL",
        "HAS_METAL_SPIRIT_FORMATION",
        "HAS_METAL_SPIRIT_CHARGE",
        "penetrate"],
    HAS_TOXIC_PURPLE_FERN: ["toxic_purple_fern_stacks"],
    HAS_WATER_SPIRIT_SPRING: ["13310", "water_spirit_spring_stacks"],
    HAS_WOUND: ["wound", "HAS_CRASH_FIST_ENTANGLE",
        "HAS_ENTANGLING_ANCIENT_VINE",
        "HAS_BAD_OMEN",
        "HAS_COURAGE_TO_FIGHT",
        "14107", "14308", "14506", "22401", "24501", "24502",
        "32202", "33403", "34301", "60302", "60503", "60602",
        "61501", "64301"],
    HAS_DECREASE_ATK: ["HAS_ANTHOMANIA_FORMATION", "decrease_atk",
        "14407", "14506", "22401", "24501", "32202", "33403",
        "34301", "64301"],
    HAS_IGNORE_DECREASE_ATK: ["14506", "ignore_decrease_atk"],
    HAS_WEAKEN: ["weaken",
        "12208", "12402", "14207", "14506", "22102", "22401",
        "24501", "24502", "32202", "32403", "32503", "33403",
        "34301", "40401", "60504", "64301", "90403"],
    HAS_IGNORE_WEAKEN: ["14506", "21302", "ignore_weaken"],
    HAS_FLAW: ["flaw",
        "12304", "14206", "14506", "22102", "22401", "24501",
        "24502", "32202", "32402", "32503", "33403", "34301",
        "40402", "60509", "61101", "64301"],
    HAS_ENTANGLE: ["entangle",
        "HAS_RESONANCE_WITHIN_REACH",
        "14305", "14506", "22401", "24501", "24502", "32202",
        "33403", "34301", "36503", "40503", "60507", "64301",
        "90602"],
    HAS_STYX: ["styx", "HAS_ENTERING_STYX",
        "14506", "22401", "24501", "32202", "33403", "64301",
        "64401", "64501", "94401"],
    HAS_ENTERING_STYX: ["entering_styx_stacks"],
    HAS_PREVENT_ANTI_CHASE: ["prevent_anti_chase",
        "93601", "60603"],
    HAS_EXTRA_MAX_CHASES: ["max_chases", "60603"],
    HAS_PREDICAMENT_FOR_IMMORTALS: ["predicament_for_immortals_stacks",
        "33501"],
    HAS_ACTIVATE: [
        "HAS_ACTIVATE_WOOD",
        "HAS_ACTIVATE_FIRE",
        "HAS_ACTIVATE_EARTH",
        "HAS_ACTIVATE_METAL",
        "HAS_ACTIVATE_WATER"],
    HAS_ACTIVATE_WOOD: ["activate_wood_spirit_stacks",
        "HAS_INNATE_WOOD",
        "HAS_ACTIVATE_ANY",
        "13101", "23101", "63201", "63302", "93601", "73401"],
    HAS_ACTIVATE_FIRE: ["activate_fire_spirit_stacks",
        "HAS_INNATE_FIRE",
        "HAS_ACTIVATE_ANY",
        "13103", "23102", "63302", "93301", "93401", "93601",
        "73402"],
    HAS_ACTIVATE_EARTH: ["activate_earth_spirit_stacks",
        "HAS_INNATE_EARTH",
        "HAS_ACTIVATE_ANY",
        "13105", "23103", "63301", "63302", "93301", "93601",
        "73501", "73402"],
    HAS_ACTIVATE_METAL: ["activate_metal_spirit_stacks",
        "HAS_INNATE_METAL",
        "HAS_ACTIVATE_ANY",
        "13107", "23104", "63301", "63302", "93601", "73502",
        "73501"],
    HAS_ACTIVATE_WATER: ["activate_water_spirit_stacks",
        "HAS_INNATE_WATER",
        "HAS_ACTIVATE_ANY",
        "13109", "23105", "63302", "93401", "93601", "73502",
        "73401"],
    HAS_ACTIVATE_ANY: ["13311", "63402", "93502",
        "HAS_COSMOS_SEAL", "HAS_ACTIVATE_NEXT"],
    HAS_COSMOS_SEAL: ["HAS_MARK_OF_FIVE_ELEMENTS", "13211"],
    HAS_ACTIVATE_NEXT: ["93201", "93507"],
    HAS_MARK_OF_FIVE_ELEMENTS: ["mark_of_five_elements_stacks"],
    HAS_ZONGZI_MODE: [],
    HAS_CORAL_SWORD: ["coral_sword_stacks"],
    HAS_IGNORE_DEF: ["ignore_def", "HAS_CORAL_SWORD",
        "HAS_RESONANCE_CORAL_SWORD",
        "11106", "11302", "13208", "14207", "31201", "33101",
        "33303", "61201", "91401", "91601"],
    HAS_SMASH_DEF: ["smash_def",
        "HAS_FRACCIDE_FORMATION",
        "HAS_LEAF_BLADE_FLOWER",
        "HAS_CRASH_FIST_BLITZ",
        "13302", "13411", "14203", "14209", "91507"],
    HAS_FRACCIDE_FORMATION: ["fraccide_formation_stacks", "35102"],
    HAS_LEAF_BLADE_FLOWER: ["leaf_blade_flower_stacks", "36204"],
    HAS_CRASH_FIST_BLITZ: ["crash_fist_blitz_stacks", "14203",
        "this_card_crash_fist_blitz_stacks"],
    HAS_NEXT_TURN_DEF: ["next_turn_def", "HAS_EARTH_SPIRIT_DUST",
        "11309", "13206", "23103", "90405"],
    HAS_EARTH_SPIRIT_DUST: ["13305"],
    HAS_INCREASE_ATK: ["increase_atk", "HAS_COURAGE_TO_FIGHT",
        "HAS_STEP_MOON_INTO_CLOUD",
        "HAS_WOOD_SPIRIT_ALL_THINGS_GROW",
        "HAS_HEAVENLY_SPIRIT_FORCEAGE_FORMATION",
        "HAS_XUANMING_FORCEAGE_FORMATION",
        "HAS_FIVE_ELEMENTS_ANIMA",
        "sword_pattern_carving_charge_stacks",
        "11402", "13201", "13202", "13304", "13401", "13501",
        "14503", "21202", "23101", "24302", "24401", "31302",
        "40303", "60503", "64502", "91507"],
    HAS_STEP_MOON_INTO_CLOUD: ["step_moon_into_cloud_stacks", "21502"],
    HAS_WOOD_SPIRIT_ALL_THINGS_GROW: ["93503",
        "wood_spirit_all_things_grow_stacks"],
    HAS_HEAVENLY_SPIRIT_FORCEAGE_FORMATION: ["35401",
        "heavenly_spirit_forceage_formation_stacks"],
    HAS_XUANMING_FORCEAGE_FORMATION: ["90404",
        "xuanming_forceage_formation_stacks"],
    HAS_FIVE_ELEMENTS_ANIMA: ["five_elements_anima_stacks"],
    HAS_REGEN: ["regen", "HAS_MARK_OF_DARK_HEART",
        "HAS_MEDITATION_OF_XUAN",
        "40302", "61402", "80102", "80302", "80503", "94402"],
    HAS_MEDITATION_OF_XUAN: ["meditation_of_xuan_stacks", "64402"],
    HAS_RESONANCE_LANDSLIDE: ["resonance_landslide_stacks"],
    HAS_THREE_TAILED_CAT: ["three_tailed_cat_stacks", "50403"],
    HAS_HEXPROOF: ["hexproof", "HAS_THREE_TAILED_CAT",
        "14211", "35303", "37401", "80205"],
    HAS_ELUSIVE_FOOTWORK: ["elusive_footwork_stacks", "14406"],
    HAS_STYX_NIGHT_FOOTWORK: ["styx_night_footwork_stacks", "94401"],
    HAS_BEAST_SPIRIT_SWORD_FORMATION: [
        "beast_spirit_sword_formation_stacks", "71502"],
    HAS_METAL_SPIRIT_IRON_BONE: ["metal_spirit_iron_bone_stacks",
        "13408"],
    HAS_WATER_SPIRIT_DIVE: ["water_spirit_dive_stacks", "13410"],
    HAS_EVERYTHING_GOES_WAY: ["everything_goes_way_stacks", "37401"],
    HAS_HEAVENLY_WILL_COMPLY: ["god_opportunity_conform_stacks",
        "37503"],
    HAS_HEAVENLY_WILL_DEFY: ["god_opportunity_reversal_stacks",
        "37504"],
    HAS_FLAME_SOUL_REBIRTH: ["flame_soul_rebirth_stacks"],
    HAS_XUANMING_RECURRING: ["90301"],
    HAS_BLACK_EARTH_TURTLE: ["black_earth_turtle_stacks", "50301"],
    HAS_MOON_WATER_SWORD_FORMATION: ["moon_water_sword_formation_stacks",
        "11409", "HAS_SWORD_FORMATION_GUARD"],
    HAS_FAT_IMMORTAL_RACCOON: ["fat_immortal_raccoon_stacks", "50102"],
    HAS_SCARLET_EYE_THE_SKY_CONSUMER: [
        "scarlet_eye_the_sky_consumer_stacks", "50401"],
    HAS_BREAK_SKY_EAGLE: ["break_sky_eagle_stacks", "50101"],
    HAS_VOID_THE_SPIRIT_CONSUMER: ["void_the_spirit_consumer_stacks",
        "50601"],
    HAS_SPIRIT_GATHER_CITTA_DHARMA: ["spirit_gather_citta_dharma_stacks",
        "11403"],
    HAS_APEX_SWORD_CITTA_DHARMA: ["apex_sword_citta_dharma_stacks",
        "21501"],
    HAS_HEARTBROKEN_TUNE: ["heartbroken_tune_stacks", "33301"],
    HAS_ILLUSION_TUNE: ["illusion_tune_stacks", "33202"],
    HAS_CACOPOISONOUS_FORMATION: ["cacopoisonous_formation_stacks",
        "35202"],
    HAS_SPIRITAGE_FORMATION: ["spiritage_formation_stacks", "35301"],
    HAS_ULTIMATE_HEXAGRAM_BASE: ["ultimate_hexagram_base_stacks",
        "62301"],
    HAS_QI_GATHERING_MERPEOPLE_PEARL: [
        "qi_gathering_merpeople_pearl_stacks", "60502"],
    HAS_ULTIMATE_POLARIS_HEXAGRAM_BASE: [
        "ultimate_polaris_hexagram_base_stacks", "92501"],
    HAS_WATER_SPIRIT_SPRING_RAIN: [
        "water_spirit_spring_rain_stacks", "63403"],
    HAS_NUWA_STONE: ["nuwa_stone_stacks", "90601"],
    HAS_ASHES_PHOENIX: ["ashes_phoenix_stacks", "50402"],
    HAS_HEAVENLY_MAIDEN_WHITE_JADE_RING: [
        "heavenly_maiden_white_jade_ring_stacks", "92601"],
    HAS_CANNOT_ACT: ["cannot_act_stacks", "heptastar_soulstat_stacks",
        "23502", "40602", "62401"],
    HAS_REVIVE: ["HAS_ASHES_PHOENIX", "HAS_FLAME_SOUL_REBIRTH",
        "HAS_HEAVENLY_MAIDEN_WHITE_JADE_RING"],
    HAS_SHADOW_OWL_RABBIT: ["shadow_owl_rabbit_stacks", "50502"],
    HAS_OCTGATES_LOCK_FORMATION: [
        "octgates_lock_formation_stacks", "35402"],
    HAS_DEVOURING_ANCIENT_VINE: [
        "devouring_ancient_vine_stacks", "36504"],
    HAS_SKIP_TO_PREVIOUS_CARD: ["skip_to_previous_card_stacks",
        "37302", "90301"],
    HAS_SKIP_NEXT_CARD: ["skip_next_card_stacks",
        "12502", "35503", "37301", "80406", "90603"],
    HAS_CYCLE_OF_FATE: ["fate_reincarnates_stacks", "37502"],
    HAS_ASTRAL_MOVE_JUMP: ["astral_move_jump_stacks", "92509"],
    HAS_SKIP_ONE_PLAY: ["36502"],
    HAS_WATER_SPIRIT_COST_0_QI: ["13209"],
    HAS_REDUCE_QI_COST_ON_STAR_POINT: [
        "reduce_qi_cost_on_star_point_stacks", "62501"],
    HAS_INSPIRATION: ["inspiration_stacks", "34302"],
    HAS_MOUNTAIN_CLEAVING_PALMS: ["14105"],
    HAS_UNBOUNDED_QI: ["unbounded_qi_stacks"],
    HAS_GATHER_QI: ["90601", "90602", "90605", "90607", "91601",
        "92601", "93601"],
    HAS_REST_AND_OUTWIT: ["rest_and_outwit_stacks"],
    HAS_CRACKING_FIST: ["cracking_fist_stacks"],
    HAS_CRASH_FIST_BOUNCE: ["crash_fist_bounce_stacks", "14103"],
    HAS_CRASH_FIST_RETURN_TO_XUAN: [
        "crash_fist_return_to_xuan_stacks", "94402"],
    HAS_REFUND_HP_COST: ["HAS_CRASH_FIST_BOUNCE",
        "HAS_CRASH_FIST_RETURN_TO_XUAN"],
    HAS_FINISHING_TOUCH: [
        "finishing_touch_stacks", "34502", "91501"],
    HAS_CLOUD_SWORD_DRAGON_SPRING: ["91501"],
    HAS_P2_MUTUAL_GROWTH: ["p2_mutual_growth_stacks"],
    HAS_P3_MUTUAL_GROWTH: ["p3_mutual_growth_stacks"],
    HAS_P4_MUTUAL_GROWTH: ["p4_mutual_growth_stacks"],
    HAS_P5_MUTUAL_GROWTH: ["p5_mutual_growth_stacks"],
    HAS_MUTUAL_GROWTH: [
        "HAS_P2_MUTUAL_GROWTH", "HAS_P3_MUTUAL_GROWTH",
        "HAS_P4_MUTUAL_GROWTH", "HAS_P5_MUTUAL_GROWTH"],
    HAS_NETHER_VOID_CANINE: ["nether_void_canine_stacks", "50602"],
    HAS_KONGTONG_SEAL: ["kongtong_seal_stacks", "90604"],
    HAS_SPIRIT_FUSION_POT: ["spirit_fusion_pot_stacks", "90607"],
    HAS_FIVE_ELEMENTS_HEAVENLY_MARROW_RHYTHM: [
        "five_elements_heavenly_marrow_rhythm_stacks", "13507"],
    HAS_HEAVENLY_MARROW_GOURD: [
        "heavenly_marrow_gourd_stacks", "93501"],
    HAS_REGEN_TUNE: ["regen_tune_stacks", "33401"],
    HAS_TOXIN_IMMUNITY: ["toxin_immunity_stacks", "24201"],
    HAS_SWORD_IN_SHEATHED: ["sword_in_sheathed_stacks"],
    HAS_ANTHOMANIA_FORMATION: [
        "anthomania_formation_stacks", "35501"],
    HAS_MOTIONLESS_TUTELARY_FORMATION: [
        "motionless_tutelary_formation_stacks", "35403"],
    HAS_SCUTTURTLE_FORMATION: [
        "scutturtle_formation_stacks", "35201"],
    HAS_THUNDERPHILIA_FORMATION: [
        "thunderphilia_formation_stacks", "35101"],
    HAS_FORCE_OF_WATER: ["force_of_water",
        "HAS_WATER_SPIRIT_SPRING_RAIN",
        "HAS_WATER_SPIRIT_SPRING",
        "HAS_FIVE_ELEMENTS_ANIMA",
        "HAS_METAL_SPIRIT_RHYTHM_WATER",
        "13110", "13209", "13210", "13409", "13505", "23105",
        "23502", "93401"],
    HAS_METAL_SPIRIT_RHYTHM_WATER: ["23302"],
    HAS_HARD_BAMBOO: ["hard_bamboo_stacks", "36102"],
    HAS_XUANMING_REGEN_TUNE: [
        "xuanming_regen_tune_heal_stacks",
        "xuanming_regen_tune_hurt_stacks", "90402"],
    HAS_THUNDERBOLT_TUNE: ["thunderbolt_tune_stacks", "92403"],
    HAS_METAL_SPIRIT_CHOKEHOLD: [
        "metal_spirit_chokehold_stacks", "23201"],
    HAS_IF_PLAYED_CONTINUOUS: [
        "35103", "35203", "35303", "35503"],
    HAS_UNRESTRAINED_SWORD_TWIN_DRAGONS: [
        "unrestrained_sword_twin_dragons_stacks", "21503"],
    HAS_STRIKE_TWICE: ["strike_twice_stacks", "12505", "80505"],
    HAS_CRASH_FIST_DOUBLE: ["crash_fist_double_stacks", "24402"],
    HAS_SWIFT_BURNING_SEAL: ["swift_burning_seal_stacks"],
    HAS_OTHER_SWORD_FORMATION_DECK_COUNT: ["21303"],
    HAS_SWORD_FORMATION_DECK_COUNT: [
        "HAS_OTHER_SWORD_FORMATION_DECK_COUNT"],
    HAS_FLYING_BRUSH: ["flying_brush_stacks",
        "HAS_SHADOW_OWL_REISHI", "34501"],
    HAS_SHADOW_OWL_REISHI: ["shadow_owl_reishi_stacks"],
    HAS_CLOUD_SWORD_CHAIN_COUNT: [
        "HAS_STEP_MOON_INTO_CLOUD",
        "11102", "11103", "11201", "11202", "11203", "11302",
        "11304", "11401", "11402", "11501", "11502", "21201",
        "21602", "61101", "61401", "71402", "91403", "91502",
        "91505"],
    HAS_ENDURANCE_AS_CLOUD_SEA: ["endurance_as_cloud_sea_stacks"],
    HAS_ULTIMATE_OVERCOME_FORMATION: [
        "ultimate_overcome_formation_stacks", "93502"],
    HAS_HAS_PLAYED_MUSICIAN_CARD: ["33101", "33303", "33503"],
    HAS_CHORD_IN_TUNE: ["33503"],
    HAS_PREEMPTIVE_STRIKE: ["preemptive_strike_stacks", "22502"],
    HAS_ACT_UNDERHAND: ["act_underhand_stacks"],
    HAS_POST_ACTION: [
        "12112", "12211", "12310", "12311", "12409", "12506",
        "22202", "62201", "72501", "72502", "92301", "92503",
        "90605"],
    HAS_EXCHANGE_CARD_CHANCE: ["HAS_THREE_TAILED_CAT"],
    HAS_CLOUD_SWORD_SOFTHEART_AND_FRIENDS: [
        "HAS_CLOUD_SWORD_SOFTHEART",
        "HAS_LITHE_AS_CAT",
        "HAS_P2_RULE_OF_THE_CLOUD",
        "HAS_P3_RULE_OF_THE_CLOUD",
        "HAS_P4_RULE_OF_THE_CLOUD",
        "HAS_P5_RULE_OF_THE_CLOUD",
        "HAS_CLOUD_SWORD_CLEAR_HEART"],
    HAS_CLOUD_SWORD_SOFTHEART: [
        "cloud_sword_softheart_stacks", "11301"],
    HAS_LITHE_AS_CAT: ["lithe_as_cat_stacks"],
    HAS_P2_RULE_OF_THE_CLOUD: ["p2_rule_of_the_cloud_stacks"],
    HAS_P3_RULE_OF_THE_CLOUD: ["p3_rule_of_the_cloud_stacks"],
    HAS_P4_RULE_OF_THE_CLOUD: ["p4_rule_of_the_cloud_stacks"],
    HAS_P5_RULE_OF_THE_CLOUD: ["p5_rule_of_the_cloud_stacks"],
    HAS_CLOUD_SWORD_CLEAR_HEART: ["cloud_sword_clear_heart_stacks",
        "quench_of_sword_heart_cloud_stacks"],
    HAS_ASTRAL_DIVINATION_HEXAGRAM: ["astral_divination_hexagram_stacks"],
    HAS_SWORD_FORMATION_GUARD: [
        "HAS_P2_SWORD_FORMATION_GUARD",
        "HAS_P3_SWORD_FORMATION_GUARD",
        "HAS_P4_SWORD_FORMATION_GUARD",
        "HAS_P5_SWORD_FORMATION_GUARD"],
    HAS_P2_SWORD_FORMATION_GUARD: ["p2_sword_formation_guard_stacks"],
    HAS_P3_SWORD_FORMATION_GUARD: ["p3_sword_formation_guard_stacks"],
    HAS_P4_SWORD_FORMATION_GUARD: ["p4_sword_formation_guard_stacks"],
    HAS_P5_SWORD_FORMATION_GUARD: ["p5_sword_formation_guard_stacks"],
    HAS_BONUS_FORCE: ["14506"],
    HAS_DAMAGE_DEALT_TO_HP_BY_THIS_CARD_ATK: [
        "HAS_CRASH_FIST_STAR_SEIZING", "13402", "13404"],
    HAS_CRASH_FIST_STAR_SEIZING: [
        "this_card_crash_fist_star_seizing_stacks",
        "crash_fist_star_seizing_stacks",
        "94403"],
    HAS_CRYSTALLIZED_MERPEOPLE_PEARL: [
        "crystallized_merpeople_pearl_stacks", "60505"],
    HAS_PANGU_AXE: ["pangu_axe_stacks", "94601"],
    HAS_KUNLUN_MIRROR: ["is_triggering_kunlun_mirror", "93601"],
    HAS_DONGHUANG_ZHONG: ["is_triggering_donghuang_zhong", "90605"],
    HAS_CHASE_IF_HP_GAINED: ["chase_if_hp_gained", "13302", "92503"],
    HAS_STAR_SKY_FORGE_BONE: ["star_sky_forge_bone_stacks", "94301"],
    HAS_CRASH_FIST_RETURN_TO_XUAN: [
        "crash_fist_return_to_xuan_stacks", "94402"],
    HAS_KUN_WU_MOLTEN_RING: ["kun_wu_molten_ring_stacks", "93301"],
    HAS_STAR_MOON_HEXAGRAM_FAN: [
        "star_moon_hexagram_fan_stacks", "92502"],
    HAS_PACT_OF_EQUILIBRIUM: ["pact_of_equilibrium_stacks"],
    HAS_PACT_OF_ADVERSITY_REINFORCEMENT: [
        "pact_of_adversity_reinforcement_stacks"],
    HAS_MIND_BODY_RESONANCE: ["mind_body_resonance_stacks"],
    HAS_ZEN_MIND_FORGING_BODY: ["zen_mind_forging_body_stacks"],
    HAS_P2_FULL_OF_FORCE: ["p2_full_of_force_stacks"],
    HAS_P3_FULL_OF_FORCE: ["p3_full_of_force_stacks"],
    HAS_P4_FULL_OF_FORCE: ["p4_full_of_force_stacks"],
    HAS_P5_FULL_OF_FORCE: ["p5_full_of_force_stacks"],
    HAS_FULL_OF_FORCE: [
        "HAS_P2_FULL_OF_FORCE", "HAS_P3_FULL_OF_FORCE",
        "HAS_P4_FULL_OF_FORCE", "HAS_P5_FULL_OF_FORCE"],
    HAS_P2_REGENERATING_BODY: ["p2_regenerating_body_stacks"],
    HAS_P3_REGENERATING_BODY: ["p3_regenerating_body_stacks"],
    HAS_P4_REGENERATING_BODY: ["p4_regenerating_body_stacks"],
    HAS_P5_REGENERATING_BODY: ["p5_regenerating_body_stacks"],
    HAS_REGENERATING_BODY: [
        "HAS_P2_REGENERATING_BODY", "HAS_P3_REGENERATING_BODY",
        "HAS_P4_REGENERATING_BODY", "HAS_P5_REGENERATING_BODY"],
    HAS_P2_FIRMNESS_BODY: ["p2_firmness_body_stacks"],
    HAS_P3_FIRMNESS_BODY: ["p3_firmness_body_stacks"],
    HAS_P4_FIRMNESS_BODY: ["p4_firmness_body_stacks"],
    HAS_P5_FIRMNESS_BODY: ["p5_firmness_body_stacks"],
    HAS_FIRMNESS_BODY: [
        "HAS_P2_FIRMNESS_BODY", "HAS_P3_FIRMNESS_BODY",
        "HAS_P4_FIRMNESS_BODY", "HAS_P5_FIRMNESS_BODY"],
    HAS_STANCE_OF_FIERCE_ATTACK: ["stance_of_fierce_attack_stacks"],
    HAS_UNWAVERING_SOUL: ["unwavering_soul_stacks"],
    HAS_P2_CONCENTRATED_ELEMENT: ["p2_concentrated_element_stacks"],
    HAS_P3_CONCENTRATED_ELEMENT: ["p3_concentrated_element_stacks"],
    HAS_P4_CONCENTRATED_ELEMENT: ["p4_concentrated_element_stacks"],
    HAS_P5_CONCENTRATED_ELEMENT: ["p5_concentrated_element_stacks"],
    HAS_CONCENTRATED_ELEMENT: [
        "HAS_P2_CONCENTRATED_ELEMENT", "HAS_P3_CONCENTRATED_ELEMENT",
        "HAS_P4_CONCENTRATED_ELEMENT", "HAS_P5_CONCENTRATED_ELEMENT"],
    HAS_THE_BODY_OF_FIERCE_TIGER: ["the_body_of_fierce_tiger_stacks"],
    HAS_MARK_OF_WATER_SPIRIT: ["mark_of_water_spirit_stacks"],
    HAS_INNATE_WOOD: ["innate_wood_stacks"],
    HAS_INNATE_FIRE: ["innate_fire_stacks"],
    HAS_INNATE_EARTH: ["innate_earth_stacks"],
    HAS_INNATE_METAL: ["innate_metal_stacks"],
    HAS_INNATE_WATER: ["innate_water_stacks"],
    HAS_INNATE_MARK: ["innate_mark_stacks"],
    HAS_FIVE_ELEMENTS_EXPLOSION: ["five_elements_explosion_stacks"],
    HAS_FIRE_SPIRIT_GENERATION: ["fire_spirit_generation_stacks"],
    HAS_P2_REJUVENATION: ["p2_rejuvenation_stacks"],
    HAS_P3_REJUVENATION: ["p3_rejuvenation_stacks"],
    HAS_P4_REJUVENATION: ["p4_rejuvenation_stacks"],
    HAS_P5_REJUVENATION: ["p5_rejuvenation_stacks"],
    HAS_P2_POST_STRIKE: ["p2_post_strike_stacks"],
    HAS_P3_POST_STRIKE: ["p3_post_strike_stacks"],
    HAS_P4_POST_STRIKE: ["p4_post_strike_stacks"],
    HAS_P5_POST_STRIKE: ["p5_post_strike_stacks"],
    HAS_POST_STRIKE: [
        "HAS_P2_POST_STRIKE", "HAS_P3_POST_STRIKE",
        "HAS_P4_POST_STRIKE", "HAS_P5_POST_STRIKE"],
    HAS_P2_ASTRAL_ECLIPSE: ["p2_astral_eclipse_stacks"],
    HAS_P3_ASTRAL_ECLIPSE: ["p3_astral_eclipse_stacks"],
    HAS_P4_ASTRAL_ECLIPSE: ["p4_astral_eclipse_stacks"],
    HAS_P5_ASTRAL_ECLIPSE: ["p5_astral_eclipse_stacks"],
    HAS_ASTRAL_ECLIPSE: [
        "HAS_P2_ASTRAL_ECLIPSE", "HAS_P3_ASTRAL_ECLIPSE",
        "HAS_P4_ASTRAL_ECLIPSE", "HAS_P5_ASTRAL_ECLIPSE"],
    HAS_GAIN_EXTRA_DEBUFF: [
        "gain_extra_debuff", "HAS_ASTRAL_ECLIPSE"],
    HAS_P2_STARGAZE: ["p2_stargaze_stacks"],
    HAS_P3_STARGAZE: ["p3_stargaze_stacks"],
    HAS_P4_STARGAZE: ["p4_stargaze_stacks"],
    HAS_P5_STARGAZE: ["p5_stargaze_stacks"],
    HAS_STARGAZE: [
        "HAS_P2_STARGAZE", "HAS_P3_STARGAZE",
        "HAS_P4_STARGAZE", "HAS_P5_STARGAZE"],
    HAS_P2_DIVINATION: ["p2_divination_stacks"],
    HAS_P3_DIVINATION: ["p3_divination_stacks"],
    HAS_P4_DIVINATION: ["p4_divination_stacks"],
    HAS_P5_DIVINATION: ["p5_divination_stacks"],
    HAS_DIVINATION: [
        "HAS_P2_DIVINATION", "HAS_P3_DIVINATION",
        "HAS_P4_DIVINATION", "HAS_P5_DIVINATION"],
    HAS_STAR_MOON_FOLDING_FAN: ["star_moon_folding_fan_stacks"],
    HAS_HEPTASTAR_SOULSTAT: ["heptastar_soulstat_stacks"],
    HAS_ASTROLOGY: ["astrology_stacks"],
    HAS_BIRDIE_WIND: ["birdie_wind_stacks"],
    HAS_P2_SWORD_RHYME_CULTIVATE: ["p2_sword_rhyme_cultivate_stacks"],
    HAS_P3_SWORD_RHYME_CULTIVATE: ["p3_sword_rhyme_cultivate_stacks"],
    HAS_P4_SWORD_RHYME_CULTIVATE: ["p4_sword_rhyme_cultivate_stacks"],
    HAS_P5_SWORD_RHYME_CULTIVATE: ["p5_sword_rhyme_cultivate_stacks"],
    HAS_SWORD_RHYME_CULTIVATE: [
        "HAS_P2_SWORD_RHYME_CULTIVATE", "HAS_P3_SWORD_RHYME_CULTIVATE",
        "HAS_P4_SWORD_RHYME_CULTIVATE", "HAS_P5_SWORD_RHYME_CULTIVATE"],
    HAS_P4_MAD_OBSESSION: ["p4_mad_obssession_stacks"],
    HAS_P5_MAD_OBSESSION: ["p5_mad_obssession_stacks"],
    HAS_MAD_OBSESSION: [
        "HAS_P4_MAD_OBSESSION", "HAS_P5_MAD_OBSESSION"],
    HAS_CLEAR_HEART_ULTIMATE: ["quench_of_sword_heart_ultimate_stacks"],
    HAS_UNRESTRAINED_SWORD_CLEAR_HEART: [
        "quench_of_sword_heart_unrestrained_stacks",
        "unrestrained_sword_clear_heart_stacks"],
    HAS_QI_FORGING_SPIRITUAL_POWER: [
        "qi_forging_spiritual_power_stacks"],
    HAS_QI_FORGING_SPIRITSTAT: [
        "qi_forging_spiritstat_stacks"],
    HAS_QI_FORGING_SPIRITAGE: [
        "qi_forging_spiritage_stacks"],
    HAS_SWORD_PATTERN_INTENSE: [
        "sword_pattern_carving_intense_stacks"],
    HAS_SWORD_PATTERN_CHARGE: [
        "sword_pattern_carving_charge_stacks"],
    HAS_SWORD_PATTERN_CHAIN_ATTACK: [
        "sword_pattern_carving_chain_attack_stacks"],
    HAS_BLADE_FORGING_STABLE: [
        "blade_forging_stable_stacks"],
    HAS_BLADE_FORGING_SHARPNESS: [
        "blade_forging_sharpness_stacks"],
    HAS_DRIFT_ICE_BLADE: [
        "drift_ice_blade_stacks"],
    HAS_P2_STORE_QI: ["p2_store_qi_stacks"],
    HAS_P3_STORE_QI: ["p3_store_qi_stacks"],
    HAS_P4_STORE_QI: ["p4_store_qi_stacks"],
    HAS_P5_STORE_QI: ["p5_store_qi_stacks"],
    HAS_STORE_QI: [
        "HAS_P2_STORE_QI", "HAS_P3_STORE_QI",
        "HAS_P4_STORE_QI", "HAS_P5_STORE_QI"],
    HAS_COLORFUL_SPIRIT_CRANE: [
        "colorful_spirit_crane_stacks", "50501"],
    HAS_BROCADE_RAT: [
        "brocade_rat_stacks", "50302"],
    HAS_LONELY_NIGHT_WOLF: [
        "lonely_night_wolf_stacks", "50202"],
    HAS_DARK_STAR_BAT: [
        "dark_star_bat_stacks", "50201"],
    HAS_CAREFREE_GUQIN: ["carefree_guqin_stacks", "40403"],
    HAS_UNADVISABLE: ["nothing_is_appropriate_stacks", "37404"],
    HAS_GOD_LUCK_AVOID: ["god_luck_avoid_stacks", "37202"],
    HAS_GOD_LUCK_APPROACH: ["god_luck_approach_stacks", "37201"],
    HAS_OBSERVE_BODY: ["observe_body_stacks", "37104"],
    HAS_FLYING_OWL_REISHI: ["flying_owl_reishi_stacks"],
    HAS_CLEAR_CHAMOMILE: ["clear_chamomile_stacks"],
    HAS_HEALING_CHAMOMILE: ["healing_chamomile_stacks"],
    HAS_LOSE_POWER_GRASS: ["lose_power_grass_stacks"],
    HAS_DIVINE_POWER_GRASS: ["divine_power_grass_stacks"],
    HAS_FROZEN_SNOW_LOTUS: ["frozen_snow_lotus_stacks", "36401"],
    HAS_LEAF_SHIELD_FLOWER: ["leaf_shield_flower_stacks", "36203"],
    HAS_ENDLESS_SWORD_FORMATION: [
        "endless_sword_formation_stacks", "35302"],
    HAS_APPARITION_CONFUSION: [
        "apparition_confusion_stacks", "33502"],
    HAS_CRAZE_DANCE_TUNE: ["craze_dance_tune_stacks", "33302"],
    HAS_KINDNESS_TUNE: ["kindness_tune_stacks", "33201"],
    HAS_CAREFREE_TUNE: ["carefree_tune_stacks", "33103"],
    HAS_CRASH_FIST_STYX_NIGHT: [
        "crash_fist_stygian_night_stacks", "64401"],
    HAS_OVERWHELMING_POWER: [
        "overwhelming_power_stacks", "64202"],
    HAS_RETURN_TO_SIMPLICITY: [
        "return_to_simplicity_stacks", "24602"],
    HAS_LYING_DRUNK: [
        "lying_drunk_stacks", "24202"],
    HAS_ENDLESS_FORCE: [
        "endless_force_stacks", "24102"],
    HAS_MAJESTIC_QI: ["majestic_qi_stacks", "14309"],
    HAS_EXERCISE_BONES: ["exercise_bones_stacks", "14304"],
    HAS_PHYSIQUE_GAINED: ["physique_gained", "14504"],
    HAS_HP_LOST: ["hp_lost", "HAS_CRASH_FIST_SHOCKED",
        "90401", "90405", "91506", "93504", "94503"],
    HAS_CRASH_CITTA_DHARMA: ["crash_citta_dharma_stacks", "14401"],
    HAS_CRASH_FIST_SHOCKED: ["this_card_crash_fist_shocked_stacks",
        "crash_fist_shocked_stacks", "14502"],
    HAS_CRASH_FIST_INCH_FORCE: [
        "this_card_crash_fist_inch_force_stacks",
        "crash_fist_inch_force_stacks", "14402"],
    HAS_CRASH_FIST_BLINK: ["crash_fist_blink_stacks", "14501"],
    HAS_CRASH_FIST_TRUNCATE: ["crash_fist_truncate_stacks", "14302"],
    HAS_CRASH_FOOTWORK: ["crash_footwork_stacks", "14301"],
    HAS_CRASH_FIST_SHAKE: ["crash_fist_shake_stacks", "14201"],
    HAS_CRASH_FIST_BLOCK: ["crash_fist_block_stacks",
        "14102", "14303"],
    HAS_CRASH_FIST_POKE: ["later_crash_fist_poke_stacks",
        "crash_fist_poke_stacks", "14101", "14303"],
    HAS_CRASH_FIST_CONTINUE: ["14403"],
    HAS_FORCE: ["force", "max_force",
        "HAS_FULL_OF_FORCE",
        "HAS_CRASH_CITTA_DHARMA",
        "HAS_CRASH_FIST_SHAKE",
        "HAS_ENDLESS_FORCE",
        "HAS_MAJESTIC_QI",
        "HAS_SOUL_OVERWHELMING_PALM",
        "14110", "14111", "14208", "14309", "14310", "14311",
        "14401", "14409", "14410", "14507", "14508", "24102",
        "24302", "64202", "94301", "94501", "94504"],
    HAS_SOUL_OVERWHELMING_PALM: ["94502"],
    HAS_THUNDER_CITTA_DHARMA: [
        "thunder_citta_dharma_stacks", "22403"],
    HAS_PCT_MULTIPLIER: [
        "HAS_FORCE",
        "HAS_WATER_SPIRIT_DIVE",
        "HAS_WEAKEN",
        "HAS_FLAW",
        "HAS_THUNDER_CITTA_DHARMA"],
    HAS_AGILITY: ["agility",
        "HAS_CRASH_FIST_BLINK",
        "HAS_ELUSIVE_FOOTWORK",
        "HAS_STYX_NIGHT_FOOTWORK",
        "HAS_RETURN_TO_SIMPLICITY",
        "14301", "14310", "14405", "14406", "14407", "14409",
        "14410", "14501", "14503", "14508", "24202", "24501",
        "64501", "94401", "94501", "94504"],
    HAS_PLAYED_CARD_COUNT: ["played_card_count", "73501"],
    HAS_WILD_CROSSING_SEAL: ["wild_crossing_seal_stacks", "73401"],
    HAS_KUN_WU_METAL_RING: ["kun_wu_metal_ring_stacks", "63301"],
    HAS_MAX_HP_LOST: ["max_hp_lost",
        "HAS_FIRE_SPIRIT_RHYTHM_EARTH",
        "HAS_FIRE_SPIRIT_BURNING_SKY"],
    HAS_FIRE_SPIRIT_RHYTHM_EARTH: ["23203"],
    HAS_FIRE_SPIRIT_BURNING_SKY: ["23501"],
    HAS_EARTH_SPIRIT_RHYTHM_METAL: ["23403"],
    HAS_ULTIMATE_WORLD_FORMATION: [
        "ultimate_world_formation_stacks", "13506"],
    HAS_DEF_LOST: ["def_lost",
        "HAS_EARTH_SPIRIT_RHYTHM_METAL",
        "13405", "13406", "93402"],
    HAS_EARTH_SPIRIT_COMBINE_WORLD: [
        "earth_spirit_combine_world_stacks",
        "HAS_RESONANCE_LANDSLIDE",
        "13503"],
    HAS_EARTH_SPIRIT_CLIFF: [
        "earth_spirit_cliff_stacks",
        "13306"],
    HAS_WOOD_SPIRIT_FORMATION: [
        "wood_spirit_formation_stacks", "13301"],
    HAS_FIRE_SPIRIT_FORMATION: [
        "fire_spirit_formation_stacks", "13303"],
    HAS_EARTH_SPIRIT_FORMATION: [
        "earth_spirit_formation_stacks", "13205"],
    HAS_METAL_SPIRIT_FORMATION: [
        "metal_spirit_formation_stacks", "13207"],
    HAS_WATER_SPIRIT_FORMATION: [
        "water_spirit_formation_stacks", "13309"],
    HAS_WOOD_SPIRIT_RHYTHM_FIRE: ["23402"],
    HAS_EARTH_SPIRIT_LANDSLIDE: ["63501"],
    HAS_METAL_SPIRIT_CHARGE: ["13307"],
    HAS_IF_WOOD_SPIRIT: [
        "HAS_WOOD_SPIRIT_RHYTHM_FIRE",
        "13102", "13201", "13202", "13302", "13401", "13402",
        "13501", "23202", "23301", "23601", "93503"],
    HAS_IF_FIRE_SPIRIT: [
        "HAS_FIRE_SPIRIT_RHYTHM_EARTH",
        "HAS_WOOD_SPIRIT_RHYTHM_FIRE",
        "HAS_FIRE_SPIRIT_BURNING_SKY",
        "13104", "13203", "13204", "13304", "13403", "13404",
        "13502", "23601"],
    HAS_IF_EARTH_SPIRIT: [
        "HAS_EARTH_SPIRIT_LANDSLIDE",
        "HAS_FIRE_SPIRIT_RHYTHM_EARTH",
        "HAS_EARTH_SPIRIT_RHYTHM_METAL",
        "13106", "13206", "13305", "13306", "13405", "13406",
        "13503", "23401", "23601"],
    HAS_IF_METAL_SPIRIT: [
        "HAS_METAL_SPIRIT_CHARGE",
        "HAS_METAL_SPIRIT_RHYTHM_WATER",
        "HAS_EARTH_SPIRIT_RHYTHM_METAL",
        "13108", "13208", "13308", "13407", "13408", "13504",
        "23201", "23601", "93402"],
    HAS_IF_WATER_SPIRIT: [
        "HAS_WATER_SPIRIT_COST_0_QI",
        "HAS_METAL_SPIRIT_RHYTHM_WATER",
        "13110", "13210", "13310", "13409", "13410", "13505",
        "23202", "23502", "23601"],
    HAS_LAST_CARD_ID: [
        "HAS_CYCLE_OF_FIVE_ELEMENTS_AND_FRIENDS",
        "HAS_IF_WOOD_SPIRIT",
        "HAS_IF_FIRE_SPIRIT",
        "HAS_IF_EARTH_SPIRIT",
        "HAS_IF_METAL_SPIRIT",
        "HAS_IF_WATER_SPIRIT",
        "HAS_FIVE_ELEMENTS_HEAVENLY_MARROW_RHYTHM",
        "HAS_HEAVENLY_MARROW_GOURD",
        "HAS_MUTUAL_GROWTH"],
    HAS_THROW_PETALS: ["throw_petals_stacks", "72402"],
    HAS_SPIRITUAL_DIVINATION: [
        "spiritual_divination_stacks", "72401"],
    HAS_BONUS_STAR_POWER_MULTIPLIER: [
        "bonus_star_power_multiplier", "22402"],
    HAS_VITALITY_BLOSSOM: [
        "vitality_blossom_stacks", "22201"],
    HAS_HUNTER_HUNTING_HUNTER: [
        "hunter_hunting_hunter_stacks", "12507"],
    HAS_REPEL_CITTA_DHARMA: [
        "repel_citta_dharma_stacks", "12408"],
    HAS_HEXAGRAM_FORMACIDE: [
        "hexagram_formacide_stacks", "12403"],
    HAS_TRIGGERED_HEXAGRAM_COUNT: [
        "triggered_hexagram_count", "12305"],
    HAS_STILLNESS_CITTA_DHARMA: [
        "stillness_citta_dharma_stacks", "12209"],
    HAS_HP_GAINED: [
        "HAS_CHASE_IF_HP_GAINED",
        "12309", "23301", "92301"],
    HAS_STAR_POWER: [
        "HAS_STARGAZE",
        "HAS_ULTIMATE_POLARIS_HEXAGRAM_BASE",
        "HAS_ASTROLOGY",
        "HAS_POLARIS_CITTA_DHARMA",
        "HAS_PROPITIOUS_OMEN",
        "HAS_STAR_TRAIL_DIVINATION",
        "HAS_THOUSAND_STAR_EXPLOSION",
        "12102", "12201", "12301", "22202", "22402", "22503",
        "62101", "62302", "62501", "92502", "92503"],
    HAS_STAR_POINT: [
        "HAS_STAR_POWER",
        "HAS_STAR_MOON_FOLDING_FAN",
        "HAS_REDUCE_QI_COST_ON_STAR_POINT",
        "HAS_POLARIS_CITTA_DHARMA",
        "HAS_IF_STAR_POINT",
        "HAS_BECOME_STAR_POINT"],
    HAS_IF_STAR_POINT: [
        "12103", "12104", "12202", "12203", "12302", "12401",
        "12402", "12502", "72501", "92509"],
    HAS_BECOME_STAR_POINT: [
        "12101", "12205", "12301", "62101", "92201", "92501"],
    HAS_POLARIS_CITTA_DHARMA: ["12501"],
    HAS_THOUSAND_STAR_EXPLOSION: ["92402"],
    HAS_STAR_TRAIL_DIVINATION: ["12405"],
    HAS_PROPITIOUS_OMEN: ["12508"],
    HAS_THUNDER_AND_LIGHTNING: ["12407"],
    HAS_XUANMING_THUNDERCLOUD_TRIBULATION: ["92504"],
    HAS_HEXAGRAM: [
        "HAS_DIVINATION",
        "HAS_ASTRAL_DIVINATION_HEXAGRAM",
        "HAS_REST_AND_OUTWIT",
        "HAS_ULTIMATE_HEXAGRAM_BASE",
        "HAS_ULTIMATE_POLARIS_HEXAGRAM_BASE",
        "HAS_SPIRITUAL_DIVINATION",
        "HAS_PROPITIOUS_OMEN",
        "HAS_STAR_TRAIL_DIVINATION",
        "HAS_THUNDER_AND_LIGHTNING",
        "HAS_RAND_RANGE",
        "HAS_IF_C_PCT",
        "12105", "12106", "12107", "12204", "12205", "12303",
        "12305", "12306", "12404", "12503", "22101", "22403",
        "22601", "62101", "62301", "62403", "72401", "92501"],
    HAS_RAND_RANGE: [
        "HAS_THUNDER_AND_LIGHTNING",
        "12108", "12109", "12111", "12206", "12207", "12305",
        "12308", "22102", "22302", "32101", "34201", "62303"],
    HAS_IF_C_PCT: [
        "HAS_XUANMING_THUNDERCLOUD_TRIBULATION",
        "HAS_THUNDERBOLT_TUNE",
        "HAS_ACT_UNDERHAND",
        "12110", "12208", "12304", "12406", "12504", "22501",
        "92401", "92505"],
    HAS_DRAGON_DEVOURS_CLOUDS: [
        "dragon_devours_clouds_stacks", "71501"],
    HAS_FAKE_UNRESTRAINED_SWORD: [
        "HAS_UNRESTRAINED_SWORD_CLEAR_HEART"],
    HAS_FAKE_CLOUD_SWORD: [
        "HAS_CLOUD_SWORD_CLEAR_HEART",
        "HAS_CLOUD_SWORD_ENDLESS"],
    HAS_PHYSIQUE: ["physique", "max_physique",
        "HAS_FIRMNESS_BODY",
        "HAS_ZEN_MIND_FORGING_BODY",
        "HAS_REGENERATING_BODY",
        "HAS_EXERCISE_BONES",
        "HAS_MOUNTAIN_CLEAVING_PALMS",
        "HAS_UNBOUNDED_QI",
        "14104", "14106", "14204", "14205", "14304", "14305",
        "14306", "14404", "14405", "14503", "14504", "24101",
        "24401", "24501", "24602", "64201", "64301", "64402",
        "64501", "64502", "94301", "94501"],
    HAS_HAND_COUNT: [
        "hand_count",
        "HAS_PACT_OF_EQUILIBRIUM",
        "60501", "61403"],
    HAS_CLOUD_SWORD_HAND_COUNT: ["21601"],
    HAS_EMPTINESS_SWORD_FORMATION: [
        "emptiness_sword_formation_stacks", "21402"],
    HAS_SWORD_INTENT_FLOW: [
        "sword_intent_flow_mode",
        "sword_intent_flow_stacks",
        "11111", "21401"],
    HAS_BONUS_SWORD_INTENT_MULTIPLIER: [
        "bonus_sword_intent_multiplier",
        "21302", "91507"],
    HAS_UNRESTRAINED_SWORD_ZERO: [
        "unrestrained_sword_zero_stacks", "11508"],
    HAS_CENTIBIRD_SPIRIT_SWORD_RHYTHM: [
        "centibird_spirit_sword_rhythm_stacks",
        "11404", "91503"],
    HAS_UNRESTRAINED_SWORD_COUNT: [
        "unrestrained_sword_count",
        "HAS_MAD_OBSESSION",
        "HAS_UNRESTRAINED_SWORD_CLEAR_HEART",
        "11211", "11410", "21301", "61501", "71501", "91301",
        "91401"],
    HAS_SWORD_INTENT: [
        "sword_intent",
        "this_card_sword_intent",
        "HAS_SWORD_INTENT_FLOW",
        "HAS_SWORD_RHYME_CULTIVATE",
        "HAS_APEX_SWORD_CITTA_DHARMA",
        "HAS_SWORD_PATTERN_INTENSE",
        "11109", "11110", "11111", "11202", "11207", "11208",
        "11210", "11305", "11407", "11505", "21302", "21401",
        "61102", "71401", "71402", "91301", "91402", "91506",
        "91507"],
    INCREASE_MAX_HP_DISPATCH: [
        "HAS_HEAVENLY_WILL_COMPLY"],
    INCREASE_IDX_DEF_DISPATCH: [
        "HAS_KUN_WU_METAL_RING",
        "HAS_KUN_WU_MOLTEN_RING",
        "HAS_HEAVENLY_WILL_COMPLY",
        "HAS_HEAVENLY_WILL_DEFY"],
    INCREASE_IDX_QI_DISPATCH: [
        "HAS_MORTAL_BODY",
        "HAS_ZONGZI_MODE",
        "HAS_COLORFUL_SPIRIT_CRANE",
        "HAS_STILLNESS_CITTA_DHARMA",
        "HAS_SPIRITUAL_DIVINATION",
        "HAS_WILD_CROSSING_SEAL",
        "HAS_STAR_MOON_HEXAGRAM_FAN",
        "HAS_SPIRITSTAT_TUNE"],
    INCREASE_IDX_DEBUFF_DISPATCH: [
        "HAS_ZONGZI_MODE",
        "HAS_GAIN_EXTRA_DEBUFF",
        "HAS_HEXPROOF",
        "HAS_UNWAVERING_SOUL",
        "HAS_STYX"],
    INCREASE_IDX_PENETRATE_DISPATCH: [
        "HAS_KUN_WU_METAL_RING"],
    INCREASE_IDX_ACTIVATE_DISPATCH: [
        "HAS_ULTIMATE_WORLD_FORMATION",
        "HAS_FIVE_ELEMENTS_EXPLOSION",
        "HAS_FIVE_ELEMENTS_ANIMA"],
    INCREASE_IDX_HEXAGRAM_DISPATCH: [
        "HAS_ASTROLOGY",
        "HAS_HEXAGRAM_FORMACIDE",
        "HAS_STAR_MOON_HEXAGRAM_FAN"],
    INCREASE_IDX_STAR_POWER_DISPATCH: [
        "HAS_STAR_MOON_HEXAGRAM_FAN"],
    REDUCE_IDX_DEF_DISPATCH: [
        "HAS_DEF_LOST",
        "HAS_EARTH_SPIRIT_CLIFF",
        "HAS_EARTH_SPIRIT_COMBINE_WORLD"],
    REDUCE_IDX_FORCE_DISPATCH: [
        "HAS_OVERWHELMING_POWER",
        "HAS_ENDLESS_FORCE"],
    HAS_BONUS_ATK_AMT: [
        "HAS_CRASH_FIST_STYX_NIGHT",
        "HAS_CRASH_FIST_POKE"],
    HAS_POST_CRASH_FIST: [
        "HAS_CRASH_FIST_BLITZ",
        "HAS_CRASH_FIST_INCH_FORCE",
        "HAS_CRASH_FIST_STAR_SEIZING",
        "HAS_CRASH_FIST_POKE"],
    HAS_PRE_CRASH_FIST: [
        "HAS_CRASH_FIST_STYX_NIGHT",
        "HAS_CRASH_FIST_POKE",
        "HAS_CRASH_FIST_BLOCK",
        "HAS_CRASH_FIST_SHAKE",
        "HAS_CRASH_FIST_ENTANGLE",
        "HAS_CRASH_FIST_BLITZ",
        "HAS_CRASH_FIST_TRUNCATE",
        "HAS_CRASH_FIST_INCH_FORCE",
        "HAS_CRASH_FIST_STAR_SEIZING",
        "HAS_CRASH_FIST_BLINK",
        "HAS_CRASH_FIST_SHOCKED"],
    HAS_RESONANCE_WITHIN_REACH: ["resonance_within_reach_stacks"],
    HAS_HEAVENLY_MARROW_DANCE_TUNE: [
        "heavenly_marrow_dance_tune_stacks", "93506"],
    HAS_RESONANCE_CORAL_SWORD: ["resonance_coral_sword_stacks"],
    HAS_RESONANCE_FIRMNESS_BODY: ["resonance_firmness_body_stacks"],
    HAS_RESONANCE_REJUVENATION: ["resonance_rejuvenation_stacks"],
    HAS_RESONANCE_SWIFT_BURNING_SEAL: ["resonance_swift_burning_seal_stacks"],
    HAS_RESONANCE_STORE_QI: ["resonance_store_qi_stacks"],
    HAS_RESONANCE_SWORD_FORMATION_GUARD: [
        "resonance_sword_formation_guard_stacks"],
    HAS_STANCE_IS_FIST: ["stance_is_fist",
        "HAS_SURGE_OF_QI", "HAS_MORTAL_BODY",
        "HAS_RESONANCE_INDOMITABLE_WILL",
        "HAS_INDOMITABLE_WILL"],
    HAS_SURGE_OF_QI: ["surge_of_qi_stacks"],
    HAS_MORTAL_BODY: ["mortal_body_stacks"],
    HAS_RESONANCE_INDOMITABLE_WILL: ["resonance_indomitable_will_stacks"],
    HAS_INDOMITABLE_WILL: ["indomitable_will_stacks"],
    HAS_RESONANCE_FULL_OF_FORCE: ["resonance_full_of_force_stacks"],
    HAS_RESONANCE_CAT_PAW: ["resonance_cat_paw_stacks"],
    HAS_RESONANCE_SKY_DELICATE_BRACELET: [
        "resonance_sky_delicate_bracelet_stacks"],
    HAS_RESONANCE_INHERITANCE_OF_SPIRIT_SWORD: [
        "resonance_inheritance_of_spirit_sword_stacks"],
    HAS_SPIRITSTAT_TUNE: ["spiritstat_tune_stacks", "91302"],
    HAS_CLOUD_SWORD_ENDLESS: ["cloud_sword_endless_stacks", "91404"],
    HAS_HEAVENLY_WILL_EARTH_EVIL: ["heavenly_will_earth_evil_stacks", "91509"],
    


};

const implies = {};

for (let x in deps) {
    let ys = deps[x];
    for (let y of ys) {
        if (implies[y] === undefined) {
            implies[y] = [];
        }
        implies[y].push(x);
    }
}


// Define the features we want to enable
// const defines = {};
// for (let x in deps) {
//     defines[x] = true;
// }

// Get the input file from command line arguments
// const args = process.argv.slice(2);
// if (args.length !== 1) {
//     console.error('Usage: node preprocess.js <input-file>');
//     process.exit(1);
// }

export function preprocess_plz(config) {
    const defines = {};
    const visited = {};
    let go = true;
    while (go) {
        go = false;
        const new_defines = {};
        for (let xd of [config, defines]) {
            for (let key in xd) {
                if (visited[key]) {
                    continue;
                }
                visited[key] = true;
                console.log("I'm visiting " + key);
                go = true;
                if (implies[key] !== undefined) {
                    for (let implies_key of implies[key]) {
                        if (defines[implies_key] === undefined) {
                            new_defines[implies_key] = true;
                        }
                    }
                }
            }
        }
        for (let new_key in new_defines) {
            defines[new_key] = true;
        }
    }
    console.log(defines);
    // for (let key in deps) {
    //     defines[key] = true;
    // }
    const sourceCode = fs.readFileSync("gamestate.jscpp", 'utf8');
    const processedCode = preprocessJavaScript(sourceCode, defines);
    fs.writeFileSync("gamestate.js", processedCode);
    execSync("make clean");
    execSync("make");
}

export function make_full_gamestate() {
    const defines = {};
    for (let key in deps) {
        defines[key] = true;
    }
    const sourceCode = fs.readFileSync("gamestate.jscpp", 'utf8');
    const processedCode = preprocessJavaScript(sourceCode, defines);
    fs.writeFileSync("gamestate_full.js", processedCode);
}

make_full_gamestate();
