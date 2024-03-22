const fs = require('fs');
const process = require('process');
var swogi = JSON.parse(fs.readFileSync('swogi.json', 'utf8'));
//import { readFileSync } from 'fs';
//var swogi = JSON.parse(readFileSync('swogi.json', 'utf8'));
//import { readFileSync } from 'fs';
//var swogi = JSON.parse(readFileSync('swogi.json', 'utf8'));
var keys = Object.keys(swogi);
keys.sort();
// the base_id of a card is the same id except that it always ends in 1
function get_base_id(card_id) {
    return card_id.substring(0, card_id.length-1) + "1";
}
function format_card(card_id) {
    //console.log(card_id);
    var card_name = swogi[card_id].name;
    var card_level = card_id.substring(card_id.length-1);
    return card_name + " (level " + card_level + ")";
}
function actions_contains_str(actions, str) {
    if (actions.length > 0 && actions[0] === str) {
        return true;
    }
    for (var i=0; i<actions.length; i++) {
        if (Array.isArray(actions[i])) {
            if (actions_contains_str(actions[i], str)) {
                return true;
            }
        }
    }
    return false;
}
function id_is_continuous(card_id) {
    return actions_contains_str(swogi[card_id].actions, "continuous");
}
function id_is_consumption(card_id) {
    return actions_contains_str(swogi[card_id].actions, "consumption");
}
const SECTS = ["sw", "he", "fe", "dx"];
const SECTS_FOR_MARKING = ["no marking"] + SECTS;
const JOBS_FOR_MARKING = ["no marking", "el", "fu", "mu", "pa", "fo", "pl"];
function get_marking(card_id) {
    const sect = parseInt(card_id.substring(1, 2));
    const class_ = parseInt(card_id.substring(0, 1));
    if (class_ === 1 || class_ === 2) {
        if (sect > 0 && sect < SECTS_FOR_MARKING.length) {
            return SECTS_FOR_MARKING[parseInt(sect)];
        }
    }
    if (class_ === 3) {
        if (sect > 0 && sect < JOBS_FOR_MARKING.length) {
            return JOBS_FOR_MARKING[parseInt(sect)];
        }
    }
    if (class_ === 4) {
        return "talisman";
    }
    if (class_ === 5) {
        return "spiritual_pet";
    }
    if (class_ === 6) {
        return "no marking";
    }
    throw new Error("suspicious card id " + card_id);
}
// for the purpose of our little sim, a player of a certain sect
// has access to these cards:
// - all cards of their sect (ID starts with 1 or 2 and the second digit is the sect number)
// - all cards of every side job (ID starts with 3)
// - all talisman cards (ID starts with 4)
// - all spiritual pet cards (ID starts with 5)
// - all "general" no-marking cards (ID starts with 6 and the second digit is 0)
// - all "sect-affiliated" no-marking cards (ID starts with 6 and the second digit is the sect number)
function get_available_deck_cards_for_sect(sect_num) {
    var ret = [];
    for (var i=0; i<keys.length; i++) {
        var card_id = keys[i];
        if (card_id.startsWith("1" + sect_num) || card_id.startsWith("2" + sect_num) || card_id.startsWith("3") || card_id.startsWith("4") || card_id.startsWith("5") || card_id.startsWith("60") || card_id.startsWith("6" + sect_num)) {
            ret.push(card_id);
        }
    }
    return ret;
}
// divine brush can generate "any sect card" meaning just those cards
// with the marking of the sect of the player
function get_available_divine_brush_cards_for_sect(sect_num) {
    var ret = [];
    for (var i=0; i<keys.length; i++) {
        var card_id = keys[i];
        if (card_id.startsWith("1" + sect_num) || card_id.startsWith("2" + sect_num)) {
            ret.push(card_id);
        }
    }
    return ret;
}
const SECT_TO_DIVINE_BRUSH_CARDS = {};
const SECT_TO_AVAILABLE_DECK_CARDS = {};
for (var i=1; i<SECTS_FOR_MARKING.length; i++) {
    const sect_num = i;
    const sect = SECTS[i];
    SECT_TO_AVAILABLE_DECK_CARDS[sect] = get_available_deck_cards_for_sect(sect_num);
    SECT_TO_DIVINE_BRUSH_CARDS[sect] = get_available_divine_brush_cards_for_sect(sect_num);
}
let is_unrestrained_sword = function(card_id) {
    return swogi[card_id].name.includes("Unrestrained Sword");
}
let is_cloud_sword = function(card_id) {
    return swogi[card_id].name.includes("Cloud Sword");
}
let is_sword_formation = function(card_id) {
    return swogi[card_id].name.includes("Sword Formation");
}
let is_crash_fist = function(card_id) {
    return swogi[card_id].name.includes("Crash Fist");
}
let is_wood_spirit = function(card_id) {
    return swogi[card_id].name.includes("Wood Spirit");
}
let is_fire_spirit = function(card_id) {
    return swogi[card_id].name.includes("Fire Spirit");
}
let is_earth_spirit = function(card_id) {
    return swogi[card_id].name.includes("Earth Spirit");
}
let is_metal_spirit = function(card_id) {
    return swogi[card_id].name.includes("Metal Spirit");
}
let is_water_spirit = function(card_id) {
    return swogi[card_id].name.includes("Water Spirit");
}
let is_add_physique = function(card_id) {
    return actions_contains_str(swogi[card_id].actions, "physique");
}
function with_default(x, default_val) {
    if (x === undefined) {
        return default_val;
    }
    return x;
}
for (var i=0; i<keys.length; i++) {
    var card_id = keys[i];
    var base_id = get_base_id(card_id);
    var name = with_default(swogi[card_id].name, swogi[base_id].name);
    swogi[card_id].name = name;
    var qi_cost = with_default(swogi[card_id].qi_cost, with_default(swogi[base_id].qi_cost, 0));
    var hp_cost = with_default(swogi[card_id].hp_cost, with_default(swogi[base_id].hp_cost, 0));
    var decrease_qi_cost_by_x = with_default(swogi[card_id].decrease_qi_cost_by_x, with_default(swogi[base_id].decrease_qi_cost_by_x, undefined));
    var card = {
        name: name,
        qi_cost: qi_cost,
        hp_cost: hp_cost,
        decrease_qi_cost_by_x: decrease_qi_cost_by_x,
        actions: swogi[card_id].actions,
        is_continuous: id_is_continuous(card_id),
        is_consumption: id_is_consumption(card_id),
        is_unrestrained_sword: is_unrestrained_sword(card_id),
        is_cloud_sword: is_cloud_sword(card_id),
        is_sword_formation: is_sword_formation(card_id),
        is_crash_fist: is_crash_fist(card_id),
        is_wood_spirit: is_wood_spirit(card_id),
        is_fire_spirit: is_fire_spirit(card_id),
        is_earth_spirit: is_earth_spirit(card_id),
        is_metal_spirit: is_metal_spirit(card_id),
        is_water_spirit: is_water_spirit(card_id),
        is_add_physique: is_add_physique(card_id),
        marking: get_marking(card_id),
    };
    swogi[card_id] = card;
}
is_unrestrained_sword = function(card_id) {
    return swogi[card_id].is_unrestrained_sword;
}
is_cloud_sword = function(card_id) {
    return swogi[card_id].is_cloud_sword;
}
is_sword_formation = function(card_id) {
    return swogi[card_id].is_sword_formation;
}
is_crash_fist = function(card_id) {
    return swogi[card_id].is_crash_fist;
}
is_wood_spirit = function(card_id) {
    return swogi[card_id].is_wood_spirit;
}
is_fire_spirit = function(card_id) {
    return swogi[card_id].is_fire_spirit;
}
is_earth_spirit = function(card_id) {
    return swogi[card_id].is_earth_spirit;
}
is_metal_spirit = function(card_id) {
    return swogi[card_id].is_metal_spirit;
}
is_water_spirit = function(card_id) {
    return swogi[card_id].is_water_spirit;
}
is_add_physique = function(card_id) {
    return swogi[card_id].is_add_physique;
}
const DEBUFF_NAMES = ["internal_injury", "decrease_atk", "weaken", "flaw", "entangle", "wound"];
function is_debuff(attr_name) {
    return DEBUFF_NAMES.includes(attr_name);
}
const ACTIVATE_NAMES = ["activate_wood_spirit_stacks", "activate_fire_spirit_stacks", "activate_earth_spirit_stacks", "activate_metal_spirit_stacks", "activate_water_spirit_stacks"];
function is_activate(attr_name) {
    return ACTIVATE_NAMES.includes(attr_name);
}
class Player {
    constructor() {
        this.next_card_index = 0;
        this.cards = [];
        this.can_play = []; // used for consumption/continuous cards
        this.is_star_point = [];
        this.can_post_action = [];
        this.skip_one_play = [];
        this.exchange_card_chance = 0;
        this.round_number = 20;
        this.destiny = 100;
        this.cultivation = 70;
        this.speed = 0;
        this.qi = 0;
        this.hp = 400;
        this.max_hp = 400;
        this.def = 0;
        this.this_card_attacked = false; // whether the player has attacked with this card
        // TODO: the above is for... nothing?
        this.this_card_directly_attacked = false; // whether this card attacked, excluding attacks by triggering other cards
        this.this_turn_attacked = false; // whether the player has attacked this turn
        this.this_atk_injured = false; // whether the enemy hp has been injured by this atk
        this.damage_dealt_to_hp_by_atk = 0; // for stuff that keys off how much damage went through to hp
        this.damage_dealt_to_hp_by_this_card_atk = 0; // for stuff that keys off how much damage went through to hp for all attacks by this card
        this.ignore_def = 0;
        this.guard_up = 0;
        this.bonus_atk_amt = 0; // card-specific bonus atk
        this.bonus_dmg_amt = 0; // card-specific bonus dmg
        this.bonus_rep_amt = 0; // card-specific bonus rep
        this.bonus_def_amt = 0; // card-specific bonus def
        this.bonus_reduce_enemy_hp_amt = 0; // this is getting to be a bit much
        this.bonus_reduce_enemy_max_hp_amt = 0;
        this.next_turn_def = 0;
        // for situations where multiple chases are allowed (Loong),
        // I'm not sure whether a single card chasing two times works the same as two cards chasing once.
        // So cards record their chases in `this_card_chases`, and then we can change how we apply that to
        // `chases` later. Also, what's the interaction of 2 chase on 1 card with entangle?
        // we can check irl i guess...
        this.this_card_chases = 0;
        this.chases = 0;
        this.max_chases = 1;
        this.currently_playing_card_idx = undefined;
        //this.currently_playing_card_id = undefined;
        this.currently_triggering_card_idx = undefined;
        this.currently_triggering_card_id = undefined;
        this.trigger_depth = 0; // used to decide whether "continuous" and "consumption" deactivate a card
        this.increase_atk = 0;
        this.regen = 0;
        this.hexproof = 0;
        // debuffs
        this.internal_injury = 0;
        this.decrease_atk = 0;
        this.weaken = 0;
        this.flaw = 0;
        this.entangle = 0;
        this.wound = 0;
        // cloud sword sect normal cards
        this.sword_intent_flow_mode = false; // whether the current card is in sword intent flow mode
        this.this_card_sword_intent = 0; // the amount of sword intent restored by flying fang sword
        this.sword_intent = 0; // the amount of sword intent we currently have in some sense
        this.unrestrained_sword_count = 0;
        this.cloud_sword_softheart_stacks = 0;
        this.cloud_sword_chain_count = 0;
        this.centibird_spirit_sword_rhythm_stacks = 0;
        this.moon_water_sword_formation_stacks = 0;
        this.spirit_gather_citta_dharma_stacks = 0;
        this.spirit_gather_citta_dharma_odd_gives_qi = true;
        this.unrestrained_sword_zero_stacks = 0;
        // cloud sword sect secret enchantment cards
        this.bonus_sword_intent_multiplier = 0;
        this.ignore_weaken = false;
        this.sword_formation_deck_count = 0;
        this.other_sword_formation_deck_count = 0;
        this.sword_intent_flow_stacks = 0;
        this.emptiness_sword_formation_stacks = 0;
        this.apex_sword_citta_dharma_stacks = 0;
        this.step_moon_into_cloud_stacks = 0;
        this.unrestrained_sword_twin_dragons_stacks = 0;
        this.cloud_sword_hand_count = 17;
        // cloud sword sect character-specific cards
        this.hand_count = 17;
        this.unrestrained_sword_clear_heart_stacks = 0;
        this.cloud_sword_clear_heart_stacks = 0;
        // heptastar sect normal cards
        this.hexagram = 0;
        this.star_power = 0;
        this.strike_twice_stacks = 0;
        this.hp_gained = 0;
        this.stillness_citta_dharma_stacks = 0;
        // heptastar sect secret enchantment cards
        this.bonus_star_power_multiplier = 0;
        // heptastar sect character-specific cards
        this.cannot_act_stacks = 0;
        // five elements sect normal cards
        this.last_card_is_wood_spirit = false;
        this.last_card_is_fire_spirit = false;
        this.last_card_is_earth_spirit = false;
        this.last_card_is_metal_spirit = false;
        this.last_card_is_water_spirit = false;
        this.activate_wood_spirit_stacks = 0;
        this.activate_fire_spirit_stacks = 0;
        this.activate_earth_spirit_stacks = 0;
        this.activate_metal_spirit_stacks = 0;
        this.activate_water_spirit_stacks = 0;
        this.penetrate = 0;
        this.earth_spirit_formation_stacks = 0;
        this.fire_spirit_formation_stacks = 0;
        this.metal_spirit_formation_stacks = 0;
        this.earth_spirit_cliff_stacks = 0;
        this.metal_spirit_iron_bone_stacks = 0;
        this.water_spirit_dive_stacks = 0;
        this.earth_spirit_combine_world_stacks = 0;
        this.def_lost = 0;
        this.metal_spirit_giant_tripod_stacks = 0;
        this.disable_penetrate_stacks = 0;
        this.ultimate_world_formation_stacks = 0;
        this.five_elements_heavenly_marrow_rhythm_stacks = 0;
        // five elements sect character-specific cards
        this.kun_wu_metal_ring_stacks = 0;
        // duan xuan sect normal cards
        this.agility = 0;
        this.physique = 0;
        this.max_force = 6;
        this.force = 0;
        this.elusive_footwork_triggered = false;
        this.elusive_footwork_stacks = 0;
        this.crash_citta_dharma_stacks = 0;
        this.crash_fist_subdue_dragon_stacks = 0;
        this.this_card_crash_fist_inch_force_stacks = 0;
        this.crash_fist_inch_force_stacks = 0;
        this.this_card_crash_fist_shocked_stacks = 0;
        this.crash_fist_shocked_stacks = 0;
        this.hp_lost = 0;
        this.physique_gained = 0;
        // duan xuan sect secret enchantment cards
        this.lying_drunk_stacks = 0;
        this.return_to_simplicity_stacks = 0;
        // musician side job cards
        this.carefree_tune_stacks = 0;
        this.kindness_tune_stacks = 0;
        this.illusion_tune_stacks = 0;
        this.heartbroken_tune_stacks = 0;
        this.craze_dance_tune_stacks = 0;
        this.regen_tune_stacks = 0;
        this.predicament_for_immortals_stacks = 0;
        this.apparition_confusion_stacks = 0;
        this.has_played_musician_card = false;
        // painter side job cards
        this.inspiration_stacks = 0;
        this.flying_brush_stacks = 0;
        this.finishing_touch_stacks = 0;
        // formation master side job cards
        this.endless_sword_formation_stacks = 0;
        this.heavenly_spirit_forceage_formation_stacks = 0;
        this.skip_next_card_stacks = 0;
        this.has_played_continuous_card = false;
        // plant master side job cards
        this.leaf_shield_flower_stacks = 0;
        this.entangling_ancient_vine_stacks = 0;
        // TODO: the above is not implemented
        // talisman cards
        this.carefree_guqin_stacks = 0;
        // spiritual pet cards
        this.break_sky_eagle_stacks = 0;
        this.fat_immortal_raccoon_stacks = 0;
        this.dark_star_bat_stacks = 0;
        this.lonely_night_wolf_stacks = 0;
        this.black_earth_turtle_stacks = 0;
        this.brocade_rat_stacks = 0;
        this.scarlet_eye_the_sky_consumer_stacks = 0;
        this.ashes_phoenix_stacks = 0;
        this.three_tailed_cat_stacks = 0;
        this.colorful_spirit_crane_stacks = 0;
        this.shadow_owl_rabbit_stacks = 0;
        this.void_the_spirit_consumer_stacks = 0;
        this.nether_void_canine_stacks = 0;
        // general immortal fates
        this.p2_store_qi_stacks = 0;
        this.p3_store_qi_stacks = 0;
        this.p4_store_qi_stacks = 0;
        this.p5_store_qi_stacks = 0;
        // cloud sword sect immortal fates
        this.sword_in_sheathed_stacks = 0;
        this.endurance_as_cloud_sea_stacks = 0;
        this.fire_flame_blade_stacks = 0;
        this.drift_ice_blade_stacks = 0;
        this.coral_sword_stacks = 0;
        this.lithe_as_cat_stacks = 0;
        this.blade_forging_sharpness_stacks = 0;
        this.blade_forging_stable_stacks = 0;
        this.sword_pattern_carving_chain_attack_stacks = 0;
        this.sword_pattern_carving_charge_stacks = 0;
        this.sword_pattern_carving_intense_stacks = 0;
        this.qi_forging_spiritage_stacks = 0;
        this.qi_forging_spiritstat_stacks = 0;
        this.qi_forging_spiritual_power_stacks = 0;
        this.quench_of_sword_heart_unrestrained_stacks = 0;
        this.quench_of_sword_heart_cloud_stacks = 0;
        this.quench_of_sword_heart_ultimate_stacks = 0;
        this.p4_mad_obsession_stacks = 0;
        this.p5_mad_obsession_stacks = 0;
        this.p2_rule_of_the_cloud_stacks = 0;
        this.p3_rule_of_the_cloud_stacks = 0;
        this.p4_rule_of_the_cloud_stacks = 0;
        this.p5_rule_of_the_cloud_stacks = 0;
        this.p2_sword_rhyme_cultivate_stacks = 0;
        this.p3_sword_rhyme_cultivate_stacks = 0;
        this.p4_sword_rhyme_cultivate_stacks = 0;
        this.p5_sword_rhyme_cultivate_stacks = 0;
        this.p2_sword_formation_guard_stacks = 0;
        this.p3_sword_formation_guard_stacks = 0;
        this.p4_sword_formation_guard_stacks = 0;
        this.p5_sword_formation_guard_stacks = 0;
        // heptastar sect immortal fates
        this.birdie_wind_stacks = 0;
        this.p2_divination_stacks = 0;
        this.p3_divination_stacks = 0;
        this.p4_divination_stacks = 0;
        this.p5_divination_stacks = 0;
        this.p2_stargaze_stacks = 0;
        this.p3_stargaze_stacks = 0;
        this.p4_stargaze_stacks = 0;
        this.p5_stargaze_stacks = 0;
        // five elements sect immortal fates
        this.fire_spirit_generation_stacks = 0;
        this.flame_soul_rebirth_stacks = 0;
        this.five_elements_explosion_stacks = 0;
        this.swift_burning_seal_stacks = 0;
        // duan xuan sect immortal fates
        this.courage_to_fight_stacks = 0;
        this.stance_of_fierce_attack_stacks = 0;
        this.p2_regenerating_body_stacks = 0;
        this.p3_regenerating_body_stacks = 0;
        this.p4_regenerating_body_stacks = 0;
        this.p5_regenerating_body_stacks = 0;
    }
    reset_can_play() {
        this.can_play = [];
        for (var i=0; i<this.cards.length; i++) {
            this.can_play.push(true);
            this.is_star_point.push(false);
            this.can_post_action.push(false);
            this.skip_one_play.push(false);
        }
        if (2 < this.cards.length) {
            this.is_star_point[2] = true;
        }
        if (5 < this.cards.length) {
            this.is_star_point[5] = true;
        }
        if (swogi[this.cards[this.cards.length - 1]].name === "Space Spiritual Field") {
            this.skip_one_play[this.cards.length - 1] = true;
        }
        if (swogi[this.cards[this.cards.length - 2]].name === "Space Spiritual Field") {
            this.skip_one_play[this.cards.length - 2] = true;
        }
    }
    reset_deck_counts() {
        for (var i=0; i<this.cards.length; i++) {
            var card_id = this.cards[i];
            var card = swogi[card_id];
            if (is_sword_formation(card_id)) {
                this.sword_formation_deck_count += 1;
            }
        }
    }
    post_deck_setup() {
        this.reset_can_play();
        this.reset_deck_counts();
    }
}
class GameState {
    constructor() {
        this.indentation = "";
        this.players = [];
        this.players[0] = new Player();
        this.players[1] = new Player();
        this.output = [];
        this.used_randomness = false;
    }
    crash() {
        this.dump();
        console.trace();
        process.exit(1);
    }
    dump() {
        console.log(this.output.join("\n"));
    }
    log(str) {
        this.output.push(this.indentation + str);
        //console.log(this.indentation + str);
    }
    indent() {
        this.indentation += "  ";
    }
    unindent() {
        this.indentation = this.indentation.substring(2);
    }
    do_coral_sword(idx) {
        for (var i=0; i<this.players[idx].coral_sword_stacks; i++) {
            this.increase_idx_x_by_c(idx, "ignore_def", 2);
        }
    }
    do_store_qi(idx) {
        for (var i=0; i<this.players[idx].p2_store_qi_stacks; i++) {
            this.increase_idx_x_by_c(idx, "qi", 1);
        }
        for (var i=0; i<this.players[idx].p3_store_qi_stacks; i++) {
            this.increase_idx_x_by_c(idx, "qi", 1);
        }
        for (var i=0; i<this.players[idx].p4_store_qi_stacks; i++) {
            this.increase_idx_x_by_c(idx, "qi", 2);
        }
        for (var i=0; i<this.players[idx].p5_store_qi_stacks; i++) {
            this.increase_idx_x_by_c(idx, "qi", 3);
        }
    }
    do_mad_obsession(idx) {
        this.for_each_x_add_y("p4_mad_obsession_stacks", "unrestrained_sword_count");
        this.for_each_x_add_y("p5_mad_obsession_stacks", "unrestrained_sword_count");
    }
    do_sword_rhyme_cultivate(idx) {
        for (var i=0; i<this.players[idx].p2_sword_rhyme_cultivate_stacks; i++) {
            this.increase_idx_x_by_c(idx, "sword_intent", 1);
        }
        for (var i=0; i<this.players[idx].p3_sword_rhyme_cultivate_stacks; i++) {
            this.increase_idx_x_by_c(idx, "sword_intent", 1);
        }
        for (var i=0; i<this.players[idx].p4_sword_rhyme_cultivate_stacks; i++) {
            this.increase_idx_x_by_c(idx, "sword_intent", 1);
        }
        for (var i=0; i<this.players[idx].p5_sword_rhyme_cultivate_stacks; i++) {
            this.increase_idx_x_by_c(idx, "sword_intent", 2);
        }
    }
    do_divination(idx) {
        for (var i=0; i<this.players[idx].p2_divination_stacks; i++) {
            this.increase_idx_x_by_c(idx, "hexagram", 1);
        }
        for (var i=0; i<this.players[idx].p3_divination_stacks; i++) {
            this.increase_idx_x_by_c(idx, "hexagram", 1);
        }
        for (var i=0; i<this.players[idx].p4_divination_stacks; i++) {
            this.increase_idx_x_by_c(idx, "hexagram", 2);
        }
        for (var i=0; i<this.players[idx].p5_divination_stacks; i++) {
            this.increase_idx_x_by_c(idx, "hexagram", 3);
        }
    }
    do_stargaze(idx) {
        for (var i=0; i<this.players[idx].p2_stargaze_stacks; i++) {
            this.increase_idx_x_by_c(idx, "star_power", 1);
        }
        for (var i=0; i<this.players[idx].p3_stargaze_stacks; i++) {
            this.increase_idx_x_by_c(idx, "star_power", 1);
        }
        for (var i=0; i<this.players[idx].p4_stargaze_stacks; i++) {
            this.increase_idx_x_by_c(idx, "star_power", 1);
        }
        for (var i=0; i<this.players[idx].p5_stargaze_stacks; i++) {
            this.increase_idx_x_by_c(idx, "star_power", 1);
        }
    }
    do_courage_to_fight(idx) {
        for (var i=0; i<this.players[idx].courage_to_fight_stacks; i++) {
            this.increase_idx_x_by_c(idx, "increase_atk", 1);
            this.increase_idx_x_by_c(idx, "wound", 1);
        }
    }
    start_of_game_setup() {
        for (var idx = 0; idx < 2; idx++) {
            this.players[idx].post_deck_setup();
        }
        for (var idx = 0; idx < 2; idx++) {
            this.do_coral_sword(idx);
            this.do_store_qi(idx);
            this.do_mad_obsession(idx);
            this.do_sword_rhyme_cultivate(idx);
            this.do_divination(idx);
            this.do_stargaze(idx);
            this.do_courage_to_fight(idx);
        }
    }
    swap_players() {
        var temp = this.players[0];
        this.players[0] = this.players[1];
        this.players[1] = temp;
    }
    sim_n_turns(n) {
        this.start_of_game_setup();
        var i = 0;
        for (; i<n; i++) {
            this.log("turn " + i + " begins");
            this.indent();
            if (i % 2 === 1) {
                this.swap_players();
            }
            this.sim_turn();
            if (i % 2 === 1) {
                this.swap_players();
            }
            this.unindent();
            this.log("turn " + i + " ends");
            if (this.game_over) {
                break;
            }
        }
        var winner = 0;
        if (this.players[0].hp < this.players[1].hp) {
            winner = 1;
        }
        this.winner = winner;
        this.turns_taken = i;
        this.log("player " + winner + " wins");
    }
    do_action(arr) {
        // the actions list is like this: [["atk", 14], ["injured", ["regain_sword_intent"]]]
        // so we need to call this[arr[0]] passing in the rest of the array as arguments
        var ret = undefined;
        if (arr.length === 0) {
            this.log("empty action list");
            return ret;
        }
        // if arr[0] is actually an array, then try calling do_action on all the elements of arr
        if (Array.isArray(arr[0])) {
            for (var i=0; i<arr.length; i++) {
                ret = this.do_action(arr[i]);
                if (this.game_over) {
                    return ret;
                }
            }
            return ret;
        }
        var action_name = arr[0];
        var args = arr.slice(1);
        if (this[action_name] === undefined) {
            this.log("action " + action_name + " is not defined");
            this.crash();
        }
        return this[action_name](...args);
    }
    do_cloud_sword_softheart_and_friends(card_id) {
        if (is_cloud_sword(card_id)) {
            this.heal(this.players[0].cloud_sword_softheart_stacks);
            for (var i=0; i<this.players[0].lithe_as_cat_stacks; i++) {
                this.qi(1);
            }
            for (var i=0; i<this.players[0].p2_rule_of_the_cloud_stacks; i++) {
                this.def(1);
            }
            for (var i=0; i<this.players[0].p3_rule_of_the_cloud_stacks; i++) {
                this.def(2);
            }
            for (var i=0; i<this.players[0].p4_rule_of_the_cloud_stacks; i++) {
                this.def(2);
            }
            for (var i=0; i<this.players[0].p5_rule_of_the_cloud_stacks; i++) {
                this.def(3);
            }
            if (this.players[0].cloud_sword_clear_heart_stacks > 0) {
                this.chase();
                this.players[0].cloud_sword_clear_heart_stacks -= 1;
            }
        }
    }
    do_unrestrained_sword_count(card_id) {
        // if this card has "Unrestrained Sword" in the name, increment unrestrained_sword_count
        if (is_unrestrained_sword(card_id) || this.is_fake_unrestrained_sword()) {
            this.players[0].unrestrained_sword_count += 1;
            this.log("incremented unrestrained_sword_count to " + this.players[0].unrestrained_sword_count);
        }
    }
    do_cloud_sword_chain_count(card_id) {
        // if this card has "Cloud Sword" in the name, increment cloud_sword_chain_count
        if (swogi[card_id].name.includes("Cloud Sword")) {
            this.players[0].cloud_sword_chain_count += 1;
            this.log("incremented cloud_sword_chain_count to " + this.players[0].cloud_sword_chain_count);
        } else {
            if (this.players[0].cloud_sword_chain_count > 0) {
                this.players[0].cloud_sword_chain_count = 0;
                this.log("reset cloud_sword_chain_count to 0");
            }
        }
    }
    do_elemental_spirit_stuff(card_id) {
        this.players[0].last_card_is_wood_spirit = is_wood_spirit(card_id);
        this.players[0].last_card_is_fire_spirit = is_fire_spirit(card_id);
        this.players[0].last_card_is_earth_spirit = is_earth_spirit(card_id);
        this.players[0].last_card_is_metal_spirit = is_metal_spirit(card_id);
        this.players[0].last_card_is_water_spirit = is_water_spirit(card_id);
    }
    do_sword_formation_deck_count(card_id) {
        this.players[0].other_sword_formation_deck_count = this.players[0].sword_formation_deck_count;
        if (is_sword_formation(card_id)) {
            this.players[0].other_sword_formation_deck_count -= 1;
        }
    }
    do_step_moon_into_cloud(card_id) {
        if (is_cloud_sword(card_id)) {
            this.for_each_x_add_y("step_moon_into_cloud_stacks", "increase_atk");
        }
    }
    do_emptiness_sword_formation(card_id) {
        if (this.players[0].trigger_depth > 1) {
            return;
        }
        const atk = this.players[0].emptiness_sword_formation_stacks;
        if (atk > 0) {
            if (is_sword_formation(card_id)) {
                this.log("Attacking for " + atk + " from emptiness sword formation.");
                this.atk(atk);
            }
        }
    }
    do_stance_of_fierce_attack(card_id) {
        if (this.players[0].trigger_depth > 1) {
            return;
        }
        const reps = this.players[0].stance_of_fierce_attack_stacks;
        const atk = 3;
        if (reps > 0 ) {
            if (is_add_physique(card_id)) {
                for (var i=0; i<reps; i++) {
                    this.log("Attacking for " + atk + " from stance of fierce attack.");
                    this.atk(atk);
                }
            }
        }
    }
    do_endless_sword_formation() {
        if (this.players[0].trigger_depth > 1) {
            return;
        }
        if (this.players[0].endless_sword_formation_stacks > 0 && this.players[0].this_card_directly_attacked) {
            this.reduce_idx_x_by_c(0, "endless_sword_formation_stacks", 1);
            this.log("Attacking for 5 from endless sword formation.");
            this.atk(5);
        }
    }
    do_sword_formation_guard(idx) {
        if (this.players[0].trigger_depth > 1) {
            return;
        }
        if (idx !== 0) {
            return;
        }
        for (var i=0; i<this.players[0].p2_sword_formation_guard_stacks; i++) {
            this.def(4);
            this.add_c_of_x(1, "moon_water_sword_formation_stacks");
        }
        for (var i=0; i<this.players[0].p3_sword_formation_guard_stacks; i++) {
            this.def(6);
            this.add_c_of_x(1, "moon_water_sword_formation_stacks");
        }
        for (var i=0; i<this.players[0].p4_sword_formation_guard_stacks; i++) {
            this.def(8);
            this.add_c_of_x(1, "moon_water_sword_formation_stacks");
        }
        for (var i=0; i<this.players[0].p5_sword_formation_guard_stacks; i++) {
            this.def(10);
            this.add_c_of_x(1, "moon_water_sword_formation_stacks");
        }
    }
    do_regenerating_body(idx) {
        if (this.players[0].trigger_depth > 1) {
            return;
        }
        if (idx !== 0) {
            return;
        }
        for (var i=0; i<this.players[0].p2_regenerating_body_stacks; i++) {
            this.increase_idx_physique(0, 1);
            this.increase_idx_hp(0, 2);
        }
        for (var i=0; i<this.players[0].p3_regenerating_body_stacks; i++) {
            this.increase_idx_physique(0, 1);
            this.increase_idx_hp(0, 4);
        }
        for (var i=0; i<this.players[0].p4_regenerating_body_stacks; i++) {
            this.increase_idx_physique(0, 2);
            this.increase_idx_hp(0, 7);
        }
        for (var i=0; i<this.players[0].p5_regenerating_body_stacks; i++) {
            this.increase_idx_physique(0, 2);
            this.increase_idx_hp(0, 9);
        }
    }
    do_record_musician_card_played_for_chord_in_tune(card_id) {
        if (swogi[card_id].marking === "mu") {
            this.players[0].has_played_musician_card = true;
        }
    }
    do_record_continuous_card_played_for_meru_formation(card_id) {
        if (swogi[card_id].is_continuous) {
            this.players[0].has_played_continuous_card = true;
        }
    }
    do_crash_citta_dharma(card_id) {
        if (swogi[card_id].hp_cost !== undefined && swogi[card_id].hp_cost > 0) {
            this.for_each_x_add_y("crash_citta_dharma_stacks", "force");
        }
    }
    do_pre_crash_fist(card_id) {
        if (is_crash_fist(card_id)) {
            this.for_each_x_add_y("crash_fist_subdue_dragon_stacks", "bonus_atk_amt");
            this.for_each_x_add_y("crash_fist_subdue_dragon_stacks", "bonus_def_amt");
            this.for_each_x_add_y("crash_fist_inch_force_stacks", "this_card_crash_fist_inch_force_stacks");
            this.for_each_x_add_y("crash_fist_shocked_stacks", "this_card_crash_fist_shocked_stacks");
        }
        if (swogi[card_id].name !== "Crash Fist - Continue") {
            this.players[0].crash_fist_subdue_dragon_stacks = 0;
            this.players[0].crash_fist_inch_force_stacks = 0;
            this.players[0].crash_fist_shocked_stacks = 0;
        }
    }
    do_post_crash_fist(card_id) {
        if (is_crash_fist(card_id)) {
            if (this.players[0].this_card_crash_fist_shocked_stacks > 0) {
                var atk_amt = 1;
                atk_amt += Math.floor(0.2 * this.players[0].hp_lost);
                this.log("Attacking for " + atk_amt + " from crash fist - shocked effect.");
                this.atk(atk_amt);
            }
        }
        this.players[0].this_card_crash_fist_inch_force_stacks = 0;
        this.players[0].this_card_crash_fist_shocked_stacks = 0;
    }
    do_earth_spirit_formation(card_id) {
        if (is_earth_spirit(card_id)) {
            this.for_each_x_add_y("earth_spirit_formation_stacks", "def");
        }
    }
    do_metal_spirit_formation(card_id) {
        if (is_metal_spirit(card_id)) {
            this.for_each_x_add_y("metal_spirit_formation_stacks", "penetrate");
        }
    }
    do_fire_spirit_formation(card_id) {
        if (is_fire_spirit(card_id)) {
            const amt = this.players[0].fire_spirit_formation_stacks;
            this.reduce_idx_hp(1, amt);
            this.reduce_idx_max_hp(1, amt);
        }
    }
    trigger_card(card_id, idx) {
        this.indent();
        this.players[0].trigger_depth += 1;
        const prev_triggering_idx = this.players[0].currently_triggering_card_idx;
        const prev_triggering_id = this.players[0].currently_triggering_card_id;
        const prev_bonus_atk_amt = this.players[0].bonus_atk_amt;
        const prev_bonus_dmg_amt = this.players[0].bonus_dmg_amt;
        const prev_bonus_rep_amt = this.players[0].bonus_rep_amt;
        const prev_bonus_def_amt = this.players[0].bonus_def_amt;
        const prev_bonus_reduce_enemy_hp_amt = this.players[0].bonus_reduce_enemy_hp_amt;
        const prev_bonus_reduce_enemy_max_amt = this.players[0].bonus_reduce_enemy_max_amt;
        var card = swogi[card_id];
        this.players[0].currently_triggering_card_idx = idx;
        this.players[0].currently_triggering_card_id = card_id;
        this.players[0].bonus_atk_amt = 0;
        this.players[0].bonus_dmg_amt = 0;
        this.players[0].bonus_rep_amt = 0;
        this.players[0].bonus_def_amt = 0;
        this.do_cloud_sword_softheart_and_friends(card_id);
        this.do_sword_formation_guard(idx);
        this.do_regenerating_body(idx);
        this.do_crash_citta_dharma(card_id);
        this.do_pre_crash_fist(card_id);
        this.do_earth_spirit_formation(card_id);
        this.do_metal_spirit_formation(card_id);
        this.do_fire_spirit_formation(card_id);
        this.do_action(card.actions);
        if (!this.game_over) {
            this.do_stance_of_fierce_attack(card_id);
        }
        if (!this.game_over) {
            this.do_emptiness_sword_formation(card_id);
        }
        if (!this.game_over) {
            this.do_post_crash_fist(card_id);
        }
        if (!this.game_over) {
            this.do_endless_sword_formation();
        }
        this.do_unrestrained_sword_count(card_id);
        this.players[0].currently_triggering_card_idx = prev_triggering_idx;
        this.players[0].currently_triggering_card_id = prev_triggering_id;
        this.players[0].bonus_atk_amt = prev_bonus_atk_amt;
        this.players[0].bonus_dmg_amt = prev_bonus_dmg_amt;
        this.players[0].bonus_rep_amt = prev_bonus_rep_amt;
        this.players[0].bonus_def_amt = prev_bonus_def_amt;
        this.players[0].bonus_reduce_enemy_hp_amt = prev_bonus_reduce_enemy_hp_amt;
        this.players[0].bonus_reduce_enemy_max_amt = prev_bonus_reduce_enemy_max_amt;
        this.players[0].trigger_depth -= 1;
        this.unindent();
    }
    process_this_card_chases() {
        // if we chased 1 or more times during this card, let's regard that as 1 chase for now...
        if (this.players[0].this_card_chases <= 0) {
            if (this.players[0].agility >= 10 && this.players[0].chases < this.players[0].max_chases) {
                this.players[0].this_card_chases += 1;
                this.players[0].agility -= 10;
                this.log("Spent 10 agility to chase. Agility is now " + this.players[0].agility);
            }
        }
        if (this.players[0].this_card_chases > 0 && this.players[0].chases < this.players[0].max_chases) {
            if (this.players[0].entangle > 0) {
                this.reduce_idx_x_by_c(0, "entangle", 1);
                this.for_each_x_add_y("entangling_ancient_vine_stacks", "wound");
            } else {
                this.players[0].chases += 1;
                this.log("incremented chases to " + this.players[0].chases);
            }
        }
    }
    play_card_inner(card_id, idx) {
        this.players[0].this_card_attacked = false;
        this.players[0].this_card_directly_attacked = false;
        this.players[0].sword_intent_flow_mode = false;
        this.players[0].this_card_chases = 0;
        this.players[0].this_card_sword_intent = 0;
        this.do_sword_formation_deck_count(card_id);
        this.trigger_card(card_id, idx);
        this.do_cloud_sword_chain_count(card_id);
        this.do_elemental_spirit_stuff(card_id);
        this.do_record_musician_card_played_for_chord_in_tune(card_id);
        this.do_record_continuous_card_played_for_meru_formation(card_id);
        this.reduce_idx_x_by_c(0, "unrestrained_sword_clear_heart_stacks", 1);
    }
    play_card(card_id, idx) {
        this.players[0].currently_playing_card_idx = idx;
        var plays = 1;
        if (this.players[0].unrestrained_sword_twin_dragons_stacks > 0) {
            if (is_unrestrained_sword(card_id) || this.is_fake_unrestrained_sword()) {
                plays += 1;
                this.reduce_idx_x_by_c(0, "unrestrained_sword_twin_dragons_stacks", 1);
            }
        }
        if (this.players[0].strike_twice_stacks > 0) {
            plays += 1;
            this.reduce_idx_x_by_c(0, "strike_twice_stacks", 1);
        }
        for (var i=0; i<plays; i++) {
            if (!this.game_over) {
                this.play_card_inner(card_id, idx);
            }
        }
        this.players[0].can_post_action[idx] = true;
        this.players[0].currently_playing_card_idx = undefined;
    }
    get_next_playable_idx(idx) {
        for (var i=0; i<this.players[0].cards.length; i++) {
            idx += 1;
            if (idx >= this.players[0].cards.length) {
                idx = 0;
            }
            if (this.players[0].can_play[idx]) {
                return idx;
            }
        }
    }
    advance_next_card_index() {
        this.players[0].next_card_index = this.get_next_playable_idx(this.players[0].next_card_index);
    }
    can_play_a_card() {
        return this.players[0].next_card_index < this.players[0].cards.length && this.players[0].can_play[this.players[0].next_card_index];
    }
    gain_qi_to_afford_card() {
        // TODO: wu ce's immortal fate
        this.qi(1);
    }
    do_spirit_gather_citta_dharma() {
        if (this.players[0].spirit_gather_citta_dharma_stacks > 0) {
            var qi_gain = Math.floor(this.players[0].spirit_gather_citta_dharma_stacks / 2);
            if (this.players[0].spirit_gather_citta_dharma_stacks % 2 === 1) {
                const odd_gives_qi = this.players[0].spirit_gather_citta_dharma_odd_gives_qi;
                if (odd_gives_qi) {
                    qi_gain += 1;
                }
                this.players[0].spirit_gather_citta_dharma_odd_gives_qi = !odd_gives_qi;
            }
            this.qi(qi_gain);
            this.log("gained " + qi_gain + " qi from spirit_gather_citta_dharma_stacks");
        }
    }
    do_apex_sword_citta_dharma() {
        this.for_each_x_add_y("apex_sword_citta_dharma_stacks", "sword_intent");
    }
    do_def_decay() {
        // def lost is is def*def_decay / 100, rounded up
        const prev_def = this.players[0].def;
        var def_decay = 50;
        if (this.players[0].black_earth_turtle_stacks > 0) {
            def_decay = 20;
        }
        if (this.players[0].moon_water_sword_formation_stacks > 0) {
            def_decay = 0;
            this.reduce_idx_x_by_c(0, "moon_water_sword_formation_stacks", 1);
        }
        this.for_each_x_reduce_c_pct_y("def", def_decay, "def");
        if (this.players[0].black_earth_turtle_stacks > 0) {
            this.for_each_x_add_y("black_earth_turtle_stacks", "def");
        }
    }
    do_next_turn_def() {
        const amt = this.players[0].next_turn_def;
        if (amt > 0) {
            this.reduce_idx_x_by_c(0, "next_turn_def", amt);
            this.increase_idx_x_by_c(0, "def", amt);
        }
    }
    do_regen() {
        if (this.players[0].regen > 0) {
            this.heal(this.players[0].regen);
        }
    }
    do_regen_tune() {
        if (this.players[0].regen_tune_stacks > 0) {
            this.heal(this.players[0].regen_tune_stacks);
        }
    }
    do_internal_injury() {
        if (this.players[0].internal_injury > 0) {
            this.reduce_my_hp(this.players[0].internal_injury);
        }
    }
    do_illusion_tune() {
        const amt = this.players[0].illusion_tune_stacks;
        if (amt > 0) {
            this.reduce_my_hp(amt);
            this.def(amt);
        }
    }
    do_heartbroken_tune() {
        this.for_each_x_add_y("heartbroken_tune_stacks", "internal_injury");
    }
    do_unrestrained_sword_zero() {
        if (this.players[0].unrestrained_sword_zero_stacks > 0) {
            if (is_unrestrained_sword(this.players[0].currently_triggering_card_id) || this.is_fake_unrestrained_sword()) {
                var healing_amt = Math.floor(this.players[0].damage_dealt_to_hp_by_atk * this.players[0].unrestrained_sword_zero_stacks / 100);
                this.heal(healing_amt);
            }
        }
    }
    do_dark_star_bat() {
        if (this.players[0].damage_dealt_to_hp_by_atk > 0 && this.damage_dealt_to_hp_by_atk <= this.players[0].dark_star_bat_stacks) {
            this.log("dark star bat triggers!!");
            this.heal(this.players[0].damage_dealt_to_hp_by_atk);
        }
    }
    do_fat_immortal_raccoon() {
        if (this.players[0].fat_immortal_raccoon_stacks > 0) {
            this.heal(this.players[0].fat_immortal_raccoon_stacks);
        }
    }
    do_break_sky_eagle() {
        if (this.players[0].break_sky_eagle_stacks > 0) {
            this.deal_damage(this.players[0].break_sky_eagle_stacks);
        }
    }
    do_scarlet_eye_the_sky_consumer() {
        if (this.players[0].scarlet_eye_the_sky_consumer_stacks > 0) {
            this.reduce_enemy_hp(this.players[0].scarlet_eye_the_sky_consumer_stacks);
            this.heal(this.players[0].scarlet_eye_the_sky_consumer_stacks);
        }
    }
    do_three_tailed_cat() {
        if (this.players[0].three_tailed_cat_stacks > 0) {
            this.for_each_x_add_y("three_tailed_cat_stacks", "hexproof");
        }
    }
    do_lonely_night_wolf() {
        if (this.players[0].hp < this.players[0].max_hp * .5) {
            return this.players[0].lonely_night_wolf_stacks;
        }
        return 0;
    }
    do_flying_brush_chase() {
        if (this.players[0].flying_brush_stacks > 0) {
            this.chase();
            this.reduce_idx_x_by_c(0, "flying_brush_stacks", 1);
        }
    }
    do_five_elements_heavenly_marrow_rhythm_chase() {
        const player = this.players[0];
        if (player.this_card_chases === 0 && player.chases < player.max_chases && player.five_elements_heavenly_marrow_rhythm_stacks > 0 && !player.this_card_attacked) {
            if (player.last_card_is_wood_spirit || player.last_card_is_fire_spirit || player.last_card_is_earth_spirit || player.last_card_is_metal_spirit || player.last_card_is_water_spirit) {
                this.log(JSON.stringify(card));
                this.chase();
                this.reduce_idx_x_by_c(0, "five_elements_heavenly_marrow_rhythm_stacks", 1);
            }
        }
    }
    do_shadow_owl_rabbit_chase() {
        if (this.players[0].shadow_owl_rabbit_stacks > 0) {
            this.chase();
        }
    }
    do_shadow_owl_rabbit_lose_hp(action_idx) {
        if (action_idx > 0 && this.players[0].shadow_owl_rabbit_stacks > 0) {
            this.reduce_my_hp(this.players[0].shadow_owl_rabbit_stacks);
        }
    }
    do_void_the_spirit_consumer() {
        const amt = this.players[0].void_the_spirit_consumer_stacks;
        if (amt > 0) {
            const to_steal = Math.min(amt, this.players[1].qi);
            this.reduce_idx_x_by_c(1, "qi", to_steal);
            this.increase_idx_x_by_c(0, "qi", to_steal);
        }
    }
    do_finishing_touch() {
        if (this.players[0].finishing_touch_stacks > 0) {
            const existing_id = this.players[0].cards[this.players[0].next_card_index];
            const existing_upgrade_level = existing_id.substring(existing_id.length-1);
            if (existing_upgrade_level === "3") {
                return;
            }
            const new_upgrade_level = (parseInt(existing_upgrade_level) + 1).toString();
            const new_id = existing_id.substring(0, existing_id.length-1) + new_upgrade_level;
            this.log("Finishing Touch is upgrading " + format_card(existing_id) + " to " + format_card(new_id));
            this.players[0].cards[this.players[0].next_card_index] = new_id;
            this.reduce_idx_x_by_c(0, "finishing_touch_stacks", 1);
        }
    }
    do_nether_void_canine() {
        if (this.players[0].nether_void_canine_stacks > 0) {
            const exising_id = this.players[0].cards[this.players[0].next_card_index];
            const existing_upgrade_level = exising_id.substring(exising_id.length-1);
            const new_id = "60101" + existing_upgrade_level;
            this.log("Nether Void Canine is replacing " + format_card(exising_id) + " with " + format_card(new_id));
            this.players[0].cards[this.players[0].next_card_index] = new_id;
            this.reduce_idx_x_by_c(0, "nether_void_canine_stacks", 1);
        }
    }
    do_sword_in_sheathed() {
        if (!this.players[0].this_turn_attacked) {
            for (var i=0; i<this.players[0].sword_in_sheathed_stacks; i++) {
                this.add_c_of_x(3, "def");
            }
        }
    }
    do_fire_flame_blade() {
        for (var i=0; i<this.players[0].fire_flame_blade_stacks; i++) {
            this.reduce_enemy_c_of_x(1, "max_hp");
        }
    }
    do_drift_ice_blade() {
        for (var i = 0; i<this.players[0].drift_ice_blade_stacks; i++) {
            var amt = 1;
            if (this.players[0].def === 0) {
                amt *= 2;
            }
            this.def(amt);
        }
    }
    do_heavenly_spirit_forceage_formation() {
        if (this.players[0].heavenly_spirit_forceage_formation_stacks > 0) {
            this.players[0].heavenly_spirit_forceage_formation_stacks -= 1;
            this.add_c_of_x(1, "increase_atk");
        }
    }
    do_skip_next_card() {
        while (this.players[0].skip_next_card_stacks > 0) {
            this.players[0].skip_next_card_stacks -= 1;
            this.advance_next_card_index();
        }
    }
    sim_turn() {
        this.players[0].chases = 0;
        this.players[0].this_turn_attacked = false;
        this.players[0].elusive_footwork_triggered = false;
        this.do_def_decay();
        this.reduce_idx_x_by_c(0, "metal_spirit_iron_bone_stacks", 1);
        this.reduce_idx_x_by_c(0, "water_spirit_dive_stacks", 1);
        this.do_fat_immortal_raccoon();
        this.do_scarlet_eye_the_sky_consumer();
        this.do_break_sky_eagle();
        this.do_void_the_spirit_consumer();
        this.do_spirit_gather_citta_dharma();
        this.do_apex_sword_citta_dharma();
        this.do_next_turn_def();
        this.do_regen();
        this.do_regen_tune();
        this.do_heartbroken_tune();
        this.do_internal_injury();
        this.do_illusion_tune();
        this.do_heavenly_spirit_forceage_formation();
        if (this.check_idx_for_death(0)) {
            return;
        }
        var action_idx = 0;
        if (this.players[0].cannot_act_stacks > 0) {
            this.reduce_idx_x_by_c(0, "cannot_act_stacks", 1);
            action_idx = 9999;
        }
        while (action_idx <= this.players[0].chases && action_idx <= this.players[0].max_chases) {
            this.do_shadow_owl_rabbit_lose_hp(action_idx);
            if (this.check_idx_for_death(0)) {
                return;
            }
            const can_flying_brush_chase = this.players[0].flying_brush_stacks > 0;
            if (action_idx > 0) {
                this.log("chase!!");
            }
            action_idx += 1;
            if (!this.can_play_a_card()) {
                this.log("can't play any card :( ending turn");
                break;
            }
            this.do_skip_next_card();
            this.do_finishing_touch();
            this.do_nether_void_canine();
            while (this.players[0].skip_one_play[this.players[0].next_card_index]) {
                this.players[0].skip_one_play[this.players[0].next_card_index] = false;
                this.advance_next_card_index();
            }
            var card_id = this.players[0].cards[this.players[0].next_card_index];
            var card = swogi[card_id];
            var qi_cost = card.qi_cost;
            if (qi_cost === undefined) {
                qi_cost = 0;
            }
            const base_qi_cost = qi_cost;
            if (card.decrease_qi_cost_by_x !== undefined) {
                var x = card.decrease_qi_cost_by_x;
                if (typeof this.players[0][x] !== "number") {
                    this.log("error: " + x + " is not a number");
                    this.crash();
                }
                qi_cost = Math.max(0, qi_cost - this.players[0][x]);
            }
            qi_cost = Math.max(0, qi_cost - this.players[0].inspiration_stacks);
            if (this.players[0].qi < qi_cost) {
                this.gain_qi_to_afford_card();
                this.log("player 0 gained qi instead of playing " + format_card(card_id) + ". They now have " + this.players[0].qi + "/" + qi_cost + " qi");
            } else {
                this.players[0].inspiration_stacks = 0;
                var hp_cost = card.hp_cost;
                if (hp_cost === undefined) {
                    hp_cost = 0;
                }
                if (qi_cost > 0) {
                    this.reduce_idx_x_by_c(0, "qi", qi_cost);
                    this.log("player 0 spent " + qi_cost + " qi to play " + format_card(card_id));
                } else if (hp_cost > 0) {
                    this.reduce_idx_hp(0, hp_cost, true);
                    this.log("player 0 spent " + hp_cost + " hp to play " + format_card(card_id));
                } else {
                    this.log("player 0 is playing " + format_card(card_id));
                }
                this.play_card(card_id, this.players[0].next_card_index);
                if (this.game_over) {
                    return;
                }
                this.log("player 0 finished playing " + card.name);
                this.advance_next_card_index();
                if (can_flying_brush_chase) {
                    this.do_flying_brush_chase();
                }
                this.do_shadow_owl_rabbit_chase();
                this.do_five_elements_heavenly_marrow_rhythm_chase();
                this.process_this_card_chases();
            }
            if (this.predicament_for_immortals_stacks > 0) {
                break;
            }
        }
        if (this.check_idx_for_death(0)) {
            return;
        }
        this.reduce_idx_x_by_c(0, "entangle", 1);
        this.reduce_idx_x_by_c(0, "flaw", 1);
        this.reduce_idx_x_by_c(0, "weaken", 1);
        this.do_three_tailed_cat();
        this.do_sword_in_sheathed();
        if (this.check_idx_for_death(1)) {
            return;
        }
    }
    reduce_idx_def(idx, amt) {
        if (amt < 0) {
            this.log("error: amt is negative: " + amt);
            this.crash();
        }
        if (amt === 0) {
            return;
        }
        const reduced_amt = Math.min(amt, this.players[idx].def);
        this.players[idx].def_lost += reduced_amt;
        this.players[idx].def -= reduced_amt;
        this.log("reduced player " + idx + " def by " + reduced_amt + " to " + this.players[idx].def);
        if (this.players[idx].earth_spirit_combine_world_stacks > 0) {
            this.players[idx].earth_spirit_combine_world_stacks -= 1;
            //this.players[idx].def += reduced_amt;
            this.increase_idx_def(idx, reduced_amt);
        }
        if (this.players[idx].earth_spirit_cliff_stacks > 0) {
            this.players[idx].earth_spirit_cliff_stacks -= 1;
            this.deal_damage_inner(reduced_amt, false, false, idx);
        }
    }
    reduce_idx_hp(idx, dmg, is_cost) {
        if (dmg < 0) {
            this.log("error: dmg is negative: " + dmg);
            this.crash();
        }
        if (dmg === 0) {
            return 0;
        }
        if (this.players[idx].guard_up > 0 && !is_cost) {
            this.players[idx].guard_up -= 1;
            this.log("prevented " + dmg + " damage to hp with guard up. " + this.players[idx].guard_up + " guard up remaining");
            return 0;
        } else {
            this.players[idx].hp_lost += dmg;
            this.players[idx].hp -= dmg;
            this.log("reduced player " + idx +" hp by " + dmg + " to " + this.players[idx].hp);
            if (idx === 0 && this.players[idx].elusive_footwork_stacks > 0 && !this.players[idx].elusive_footwork_triggered) {
                this.add_c_of_x(1, "qi");
                this.add_c_of_x(1, "agility");
                this.elusive_footwork_triggered = true;
            }
            for (var i=0; i<this.players[idx].birdie_wind_stacks; i++) {
                this.increase_idx_def(idx, 1);
            }
            return dmg;
        }
    }
    reduce_idx_max_hp(idx, amt) {
        if (amt < 0) {
            this.log("error: amt is negative: " + amt);
            this.crash();
        }
        if (amt === 0) {
            return;
        }
        this.players[idx].max_hp -= amt;
        if (this.players[idx].hp > this.players[idx].max_hp) {
            this.log("reducing hp to max_hp of " + this.players[idx].max_hp);
            this.players[idx].hp = this.players[idx].max_hp;
        }
        this.log("reduced player " + idx + " max_hp by " + amt + " to " + this.players[idx].max_hp);
    }
    increase_idx_hp(idx, amt) {
        if (amt === 0) {
            return 0;
        }
        const prev_hp = this.players[idx].hp;
        if (prev_hp <= 0) {
            this.log("refusing to heal a dead player");
            return 0;
        }
        this.players[idx].hp += amt;
        this.players[idx].hp_gained += amt;
        if (this.players[idx].hp > this.players[idx].max_hp) {
            this.players[idx].hp = this.players[idx].max_hp;
        }
        if (prev_hp !== this.players[idx].hp) {
            for (var i=0; i<this.players[idx].birdie_wind_stacks; i++) {
                this.increase_idx_def(idx, 1);
            }
        }
        this.log("healed " + amt + " hp. Went from " + prev_hp + " to " + this.players[idx].hp);
    }
    reduce_my_hp(dmg) {
        return this.reduce_idx_hp(0, dmg, false);
    }
    reduce_enemy_hp(dmg) {
        return this.reduce_idx_hp(1, dmg, false);
    }
    increase_my_hp(amt) {
        return this.increase_idx_hp(0, amt);
    }
    increase_enemy_hp(amt) {
        return this.increase_idx_hp(1, amt);
    }
    increase_idx_def(idx, amt) {
        if (amt === 0) {
            return;
        }
        amt += this.players[idx].bonus_def_amt;
        amt += this.players[idx].kun_wu_metal_ring_stacks;
        this.players[idx].def += amt;
        this.log("gained " + amt + " def. Now have " + this.players[idx].def + " def");
    }
    increase_idx_penetrate(idx, amt) {
        if (amt === 0) {
            return;
        }
        amt += this.players[idx].kun_wu_metal_ring_stacks;
        this.players[idx].penetrate += amt;
        this.log("gained " + amt + " penetrate. Now have " + this.players[idx].penetrate + " penetrate");
    }
    increase_idx_qi(idx, amt) {
        if (amt === 0) {
            return;
        }
        if (this.players[idx].colorful_spirit_crane_stacks > 0) {
            amt *= 2;
        }
        if (this.players[idx].stillness_citta_dharma_stacks > 0) {
            this.increase_idx_hp(idx, amt * this.players[idx].stillness_citta_dharma_stacks);
        }
        this.players[idx].qi += amt;
        this.log("gained " + amt + " qi. Now have " + this.players[idx].qi + " qi");
    }
    increase_idx_force(idx, amt) {
        if (amt === 0) {
            return;
        }
        this.players[idx].force += amt;
        if (this.players[idx].force > this.players[idx].max_force) {
            this.players[idx].force = this.players[idx].max_force;
        }
        this.log("gained " + amt + " force. Now have " + this.players[idx].force + " force");
    }
    increase_idx_activate(idx, x, amt) {
        if (amt === 0) {
            return;
        }
        if (idx == 0 && this.players[idx].ultimate_world_formation_stacks > 0 ) {
            this.players[0].ultimate_world_formation_stacks -= 1;
            this.chase();
        }
        for (var i=0; i < this.players[idx].five_elements_explosion_stacks; i++) {
            const enemy_idx = 1 - idx;
            this.reduce_idx_hp(enemy_idx, 3, false);
            this.reduce_idx_max_hp(enemy_idx, 3);
        }
        this.players[idx][x] += amt;
        this.log("gained " + amt + " " + x + ". Now have " + this.players[idx][x] + " " + x);
    }
    increase_idx_physique(idx, amt) {
        if (amt === 0) {
            return;
        }
        this.players[idx].physique += amt;
        this.players[idx].physique_gained += amt;
        this.increase_idx_x_by_c(idx, "max_hp", amt);
        this.log("gained " + amt + " physique. Now have " + this.players[idx].physique + " physique");
    }
    increase_idx_x_by_c(idx, x, c) {
        if (typeof this.players[idx][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        if (c < 0) {
            this.log("error: c is negative: " + c);
            this.crash();
        }
        if (x === "hp") {
            return this.increase_idx_hp(idx, c);
        }
        if (x === "def") {
            return this.increase_idx_def(idx, c);
        }
        if (x === "qi") {
            return this.increase_idx_qi(idx, c);
        }
        if (x === "force") {
            return this.increase_idx_force(idx, c);
        }
        if (x === "penetrate") {
            return this.increase_idx_penetrate(idx, c);
        }
        if (is_activate(x)) {
            return this.increase_idx_activate(idx, x, c);
        }
        if (is_debuff(x)) {
            const to_sub = Math.min(c, this.players[idx].hexproof);
            if (to_sub > 0) {
                this.reduce_idx_x_by_c(idx, "hexproof", to_sub);
                c -= to_sub;
            }
        }
        if (c === 0) {
            return;
        }
        this.players[idx][x] += c;
        this.log("gained " + c + " " + x + ". Now have " + this.players[idx][x] + " " + x);
    }
    reduce_idx_x_by_c(idx, x, c) {
        if (typeof this.players[idx][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        if (x === "hp") {
            return this.reduce_idx_hp(idx, c, false);
        }
        if (x === "def") {
            return this.reduce_idx_def(idx, c);
        }
        if (x === "max_hp") {
            return this.reduce_idx_max_hp(idx, c);
        }
        if (c < 0) {
            this.log("error: c is negative: " + c);
            this.crash();
        }
        if (c === 0) {
            return;
        }
        const prev_x = this.players[idx][x];
        this.players[idx][x] -= c;
        if (this.players[idx][x] < 0) {
            this.players[idx][x] = 0;
        }
        if (prev_x !== this.players[idx][x] || c !== 1) {
            this.log("lost " + c + " " + x + ". Now have " + this.players[idx][x] + " " + x);
        }
    }
    deal_damage_inner(dmg, ignore_def, is_atk, my_idx) {
        const enemy_idx = 1 - my_idx;
        var pct_multiplier = 100;
        if (is_atk) {
            this.players[my_idx].this_atk_injured = false;
            if (this.players[my_idx].trigger_depth <= 1) {
                this.players[my_idx].this_card_directly_attacked = true;
            }
            this.players[my_idx].this_card_attacked = true;
            this.players[my_idx].this_turn_attacked = true;
            if (!this.players[my_idx].sword_intent_flow_mode && this.players[my_idx].sword_intent_flow_stacks > 0) {
                this.reduce_idx_x_by_c(my_idx, "sword_intent_flow_stacks", 1);
                this.players[my_idx].sword_intent_flow_mode = true;
            }
            if (this.players[my_idx].sword_intent > 0) {
                if (this.players[my_idx].sword_intent_flow_mode) {
                    if (this.players[my_idx].this_card_sword_intent < this.players[my_idx].sword_intent) {
                        this.log("in sword intent flow mode, using " + this.players[my_idx].sword_intent + " sword intent without consuming");
                        this.players[my_idx].this_card_sword_intent = this.players[my_idx].sword_intent;
                    }
                } else {
                    this.log("consuming " + this.players[my_idx].sword_intent + " sword intent");
                    this.players[my_idx].this_card_sword_intent += this.players[my_idx].sword_intent;
                    this.reduce_idx_x_by_c(my_idx, "sword_intent", this.players[my_idx].sword_intent);
                }
            }
            if (this.players[my_idx].is_star_point[this.players[0].currently_playing_card_idx]) {
                dmg += this.players[my_idx].star_power * (1 + this.players[my_idx].bonus_star_power_multiplier);
            }
            if (this.players[enemy_idx].metal_spirit_iron_bone_stacks > 0) {
                dmg -= 5;
            }
            dmg += this.do_lonely_night_wolf();
            dmg += this.players[my_idx].bonus_atk_amt;
            dmg += this.players[my_idx].this_card_sword_intent * (1 + this.players[my_idx].bonus_sword_intent_multiplier);
            dmg += this.players[my_idx].increase_atk;
            dmg += this.players[my_idx].craze_dance_tune_stacks;
            dmg -= this.players[my_idx].decrease_atk;
            pct_multiplier += 10 * this.players[my_idx].force;
            if (this.players[my_idx].this_card_crash_fist_inch_force_stacks > 0) {
                pct_multiplier += 10 * this.players[my_idx].force;
            }
            if (this.players[enemy_idx].water_spirit_dive_stacks > 0) {
                pct_multiplier -= 40;
            }
            if (this.players[my_idx].weaken > 0 && !this.players[my_idx].ignore_weaken) {
                pct_multiplier -= 40;
            }
            if (this.players[enemy_idx].flaw > 0) {
                pct_multiplier += 40;
            }
            this.players[my_idx].ignore_weaken = false;
            this.players[my_idx].bonus_sword_intent_multiplier = 0;
        } else {
            dmg += this.players[my_idx].bonus_dmg_amt;
        }
        dmg = Math.floor(dmg * pct_multiplier / 100);
        dmg = Math.max(1, dmg);
        if (this.players[enemy_idx].def < 0) {
            this.log("error: def is negative: " + this.players[enemy_idx].def);
            this.crash();
        }
        var damage_to_def = Math.min(this.players[enemy_idx].def, dmg);
        if (ignore_def) {
            damage_to_def = 0;
        }
        var damage_to_hp = dmg - damage_to_def;
        this.reduce_idx_x_by_c(enemy_idx, "def", damage_to_def);
        if (is_atk) {
            if (this.players[0].disable_penetrate_stacks > 0) {
                this.players[0].disable_penetrate_stacks -= 1;
            } else if (this.players[my_idx].penetrate > 0) {
                if (damage_to_hp > 0 && this.players[enemy_idx].guard_up === 0) {
                    this.log("penetrating " + this.players[my_idx].penetrate + " damage");
                    damage_to_hp += this.players[my_idx].penetrate;
                    this.reduce_c_of_x(this.players[my_idx].penetrate, "penetrate");
                }
            }
            if (damage_to_hp > 0 && this.players[enemy_idx].guard_up === 0) {
                dmg += this.players[enemy_idx].wound;
            }
            if (this.players[0].metal_spirit_giant_tripod_stacks > 0) {
                this.players[0].metal_spirit_giant_tripod_stacks -= 1;
                damage_to_hp *= 2;
            }
        }
        var damage_actually_dealt_to_hp = this.reduce_idx_hp(enemy_idx, damage_to_hp, false);
        if (is_atk) {
            this.players[my_idx].damage_dealt_to_hp_by_atk = damage_actually_dealt_to_hp;
            if (this.players[my_idx].fire_flame_blade_stacks > 0) {
                this.players[my_idx].this_atk_injured = true;
            }
            if (damage_actually_dealt_to_hp > 0) {
                this.players[my_idx].this_atk_injured = true;
                this.do_unrestrained_sword_zero();
                this.do_dark_star_bat();
            }
        }
    }
    eval(x) {
        if (typeof x === "number") {
            return x;
        }
        if (Array.isArray(x)) {
            return this.do_action(x);
        }
        this.log("error: " + x + " is not a number or array");
        this.crash();
    }
    deal_damage(dmg) {
        dmg = this.eval(dmg);
        var ignore_def = false;
        this.deal_damage_inner(dmg, ignore_def, false, 0);
    }
    atk(dmg) {
        if (this.players[0].apparition_confusion_stacks > 0) {
            this.reduce_my_hp(this.players[0].apparition_confusion_stacks);
            if (this.check_idx_for_death(0)) {
                return;
            }
        }
        var ignore_def = false;
        if (this.players[0].ignore_def > 0) {
            this.reduce_idx_x_by_c(0, "ignore_def", 1);
            ignore_def = true;
            this.log("ignoring def for this atk. " + this.players[0].ignore_def + " ignore def remaining");
        }
        this.do_fire_flame_blade();
        this.deal_damage_inner(dmg, ignore_def, true, 0);
        this.reduce_c_of_x(1, "force");
        this.do_drift_ice_blade();
    }
    cloud_hit(arr) {
        if (this.players[0].cloud_sword_chain_count > 0 || this.players[0].endurance_as_cloud_sea_stacks > 0) {
            this.do_action(arr);
        }
    }
    injured(arr) {
        // injured means "if the immediately preceding atk has done damage to the enemy hp, do an action"
        if (this.players[0].this_atk_injured) {
            this.do_action(arr);
        } else {
            this.log("no injured because the most recent atk has not dealt damage to the enemy hp");
        }
    }
    def(amt) {
        amt = this.eval(amt);
        this.increase_idx_x_by_c(0, "def", amt);
    }
    qi(amt) {
        this.increase_idx_x_by_c(0, "qi", amt);
    }
    rep(amt, arr) {
        // rep means "repeat the action in the array amt times"
        if (this.players[0].bonus_rep_amt > 0) {
            amt += this.players[0].bonus_rep_amt;
            this.log("the player gets " + this.players[0].bonus_rep_amt + " bonus reps, for a total of " + amt + " reps");
        }
        for (var i=0; i<amt; i++) {
            this.do_action(arr);
        }
    }
    sword_intent(amt) {
        this.increase_idx_x_by_c(0, "sword_intent", amt);
    }
    gain_ignore_def(amt) {
        this.increase_idx_x_by_c(0, "ignore_def", amt);
    }
    regain_sword_intent() {
        // this effect is only for flying fang sword.
        // weirdly, you get to keep the sword intent even if the card makes more attacks
        // (for example due to endless sword formation)
        // so we'll reuse sword_intent_flow_mode since this seems like the same thing
        this.increase_idx_x_by_c(0, "sword_intent", this.players[0].this_card_sword_intent);
        this.players[0].sword_intent_flow_mode = true;
    }
    for_each_x_reduce_c_pct_y(x, c, y) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        var to_lose = Math.ceil(this.players[0][x] * c / 100);
        to_lose = Math.max(0, to_lose);
        this.reduce_idx_x_by_c(0, y, to_lose);
    }
    for_each_x_add_c_pct_y(x, c, y) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        const to_gain = Math.floor(this.players[0][x] * c / 100);
        this.increase_idx_x_by_c(0, y, to_gain);
    }
    for_each_x_add_c_pct_y_up_to_d(x, c, y, d) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        const to_gain = Math.min(d, Math.floor(this.players[0][x] * c / 100));
        this.increase_idx_x_by_c(0, y, to_gain);
    }
    for_each_xy_add_c_pct_z(x, y, c, z) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        if (typeof this.players[0][y] !== "number") {
            this.log("error: " + y + " is not a number");
            this.crash();
        }
        const to_gain = Math.floor(this.players[0][x] * this.players[0][y] * c / 100);
        this.increase_idx_x_by_c(0, z, to_gain);
    }
    for_each_x_add_c_y(x, c, y) {
        this.for_each_x_add_c_pct_y(x, c*100, y);
    }
    for_each_x_add_y(x, y) {
        this.for_each_x_add_c_y(x, 1, y);
    }
    add_my_x_to_enemy_y(x, y) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        this.add_enemy_c_of_x(this.players[0][x], y);
    }
    exhaust_x_to_add_y(x, y) {
        this.exhaust_x_to_add_c_y(x, 1, y);
    }
    exhaust_x_to_add_c_y(x, c, y) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        const amt = this.players[0][x] * c;
        this.reduce_idx_x_by_c(0, x, amt);
        this.increase_idx_x_by_c(0, y, amt);
    }
    if_x_at_least_c_do(x, c, arr) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        if (this.players[0][x] >= c) {
            this.do_action(arr);
        } else {
            this.log("no " + JSON.stringify(arr) + " because " + x + " is less than " + c);
        }
    }
    if_x_at_most_c_do(x, c, arr) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        if (this.players[0][x] <= c) {
            this.do_action(arr);
        } else {
            this.log("no " + JSON.stringify(arr) + " because " + x + " is greater than " + c);
        }
    }
    heal(amt) {
        this.increase_my_hp(amt);
    }
    next_turn_def(amt) {
        this.increase_idx_x_by_c(0, "next_turn_def", amt);
    }
    chase() {
        this.increase_idx_x_by_c(0, "this_card_chases", 1);
    }
    reduce_enemy_c_of_x(c, x) {
        if (x === "hp") {
            c += this.players[0].bonus_reduce_enemy_hp_amt;
        }
        if (x === "max_hp") {
            c += this.players[0].bonus_reduce_enemy_max_hp_amt;
        }
        this.reduce_idx_x_by_c(1, x, c);
    }
    reduce_enemy_x_by_c_pct_enemy_y(x, c, y) {
        if (typeof this.players[1][y] !== "number") {
            this.log("error: " + y + " is not a number");
            this.crash();
        }
        const to_lose = Math.ceil(this.players[1][y] * c / 100);
        this.reduce_idx_x_by_c(1, x, to_lose);
    }
    reduce_enemy_x_by_enemy_y(x, y) {
        if (typeof this.players[1][y] !== "number") {
            this.log("error: " + y + " is not a number");
            this.crash();
        }
        if (typeof this.players[1][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        this.reduce_idx_x_by_c(1, x, this.players[1][y]);
    }
    add_enemy_c_of_x(c, x) {
        this.increase_idx_x_by_c(1, x, c);
    }
    continuous() {
        if (this.players[0].trigger_depth === 1) {
            this.players[0].can_play[this.players[0].currently_playing_card_idx] = false;
        }
    }
    consumption() {
        this.continuous();
    }
    add_c_of_x(c, x) {
        this.increase_idx_x_by_c(0, x, c);
    }
    reduce_c_of_x(c, x) {
        this.reduce_idx_x_by_c(0, x, c);
    }
    for_each_x_up_to_c_add_y(x, c, y) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        var amt_to_add = Math.min(c, this.players[0][x]);
        this.add_c_of_x(amt_to_add, y);
    }
    retrigger_previous_sword_formation() {
        const my_idx = this.players[0].currently_triggering_card_idx;
        var idx = my_idx - 1;
        while (idx >= 0) {
            var card_id = this.players[0].cards[idx];
            var card = swogi[card_id];
            if (card.name.includes("Sword Formation")) {
                this.log("retriggering " + format_card(card_id));
                this.trigger_card(card_id, idx);
                return;
            }
            idx -= 1;
        }
    }
    // the reason this wouldn't just use `rep` is that we'd like to
    // detect whether the game outcome actually depends on randomness.
    // in cases where the player has 2 debuffs and this effect clears
    // both, it's not really random - the order doesn't matter.
    reduce_random_debuff_by_c_n_times(c,n) {
        var my_debuff_names = [];
        var my_debuff_stack_counts = [];
        var necessary_times = 0;
        for (var i=0; i<DEBUFF_NAMES.length; i++) {
            if (this.players[0][DEBUFF_NAMES[i]] > 0) {
                my_debuff_names.push(DEBUFF_NAMES[i]);
                my_debuff_stack_counts.push(this.players[0][DEBUFF_NAMES[i]]);
                necessary_times += Math.ceil(this.players[0][DEBUFF_NAMES[i]] / c);
            }
        }
        if (necessary_times > n) {
            this.used_randomness = true;
        }
        for (var i=0; i<n; i++) {
            // pick a random debuff we have.
            // reduce it by c
            // if it's 0, remove it from the list of debuffs we have
            if (my_debuff_names.length === 0) {
                break;
            }
            var debuff_idx = Math.floor(Math.random() * my_debuff_names.length);
            var debuff_name = my_debuff_names[debuff_idx];
            this.reduce_idx_x_by_c(0, debuff_name, c);
            if (this.players[0][debuff_name] === 0) {
                my_debuff_names.splice(debuff_idx, 1);
                my_debuff_stack_counts.splice(debuff_idx, 1);
            }
        }
    }
    is_fake_unrestrained_sword() {
        return (this.players[0].unrestrained_sword_clear_heart_stacks > 0 &&
            this.players[0].trigger_depth <= 1);
    }
    ignore_weaken() {
        this.players[0].ignore_weaken = true;
    }
    do_thorns_spear_thing() {
        this.players[0].bonus_atk_amt += Math.floor(this.players[1].def / 2);
    }
    check_idx_for_death(idx) {
        if (this.players[idx].destiny <= 0) {
            this.players[idx].hp = 0;
            this.game_over = true;
            this.log("player " + idx + " has died of destiny loss");
            return true;
        }
        while (this.players[idx].hp <= 0) {
            if (this.players[idx].ashes_phoenix_stacks > 0) {
                const amt = this.players[idx].ashes_phoenix_stacks;
                this.reduce_idx_x_by_c(idx, "ashes_phoenix_stacks", amt);
                const heal_amt = amt - this.players[idx].hp;
                this.increase_idx_x_by_c(idx, "max_hp", amt);
                this.increase_idx_x_by_c(idx, "hp", heal_amt);
            } else {
                this.game_over = true;
                this.log("player " + idx + " has died of hp loss");
                return true;
            }
        }
        return false;
    }
    set_c_up_to_x(c, x) {
        const current_value = this.players[0][x];
        if (current_value < c) {
            this.increase_idx_x_by_c(0, x, c - current_value);
        }
    }
    set_enemy_c_up_to_x(c, x) {
        const current_value = this.players[1][x];
        if (current_value < c) {
            this.increase_idx_x_by_c(1, x, c - current_value);
        }
    }
    set_c_of_x(c, x) {
        const current_value = this.players[0][x];
        if (current_value > c) {
            this.reduce_idx_x_by_c(0, x, current_value - c);
        } else if (current_value < c) {
            this.increase_idx_x_by_c(0, x, c - current_value);
        }
    }
    rand_range(lo_inclusive, hi_inclusive) {
        if (this.players[0].hexagram > 0) {
            this.reduce_idx_x_by_c(0, "hexagram", 1);
            return hi_inclusive;
        }
        this.used_randomness = true;
        const extent = hi_inclusive - lo_inclusive + 1;
        return lo_inclusive + Math.floor(Math.random() * extent);
    }
    do_one_randomly(arr) {
        const idx = Math.floor(Math.random() * arr.length);
        this.used_randomness = true;
        this.do_action(arr[idx]);
    }
    do_chord_in_tune_thing() {
        if (this.players[0].has_played_musician_card) {
            this.chase();
            return;
        }
        const next_idx = this.get_next_playable_idx(this.players[0].currently_playing_card_idx);
        const next_id = this.players[0].cards[next_idx];
        if (swogi[next_id].marking === "musician") {
            this.chase();
        }
    }
    trigger_random_sect_card() {
        this.used_randomness = true;
        //TODO: this.
    }
    do_clear_heart() {
        const ult = this.players[0].quench_of_sword_heart_ultimate_stacks;
        var first_atk_damage = 6 + Math.min(this.players[0].round_number, 16);
        first_atk_damage += 3 * this.players[0].blade_forging_sharpness_stacks;
        first_atk_damage -= 3 * this.players[0].blade_forging_stable_stacks;
        first_atk_damage -= 2 * this.players[0].sword_pattern_carving_intense_stacks;
        first_atk_damage += 3 * this.players[0].quench_of_sword_heart_unrestrained_stacks;
        first_atk_damage -= 6 * this.players[0].quench_of_sword_heart_cloud_stacks;
        first_atk_damage += ult;
        const blade_forging_stable_def = 8 + ult;
        const chain_attack_atk = 4 + ult;
        const charge_increase_atk = 1 + ult;
        const intense_sword_intent = 4 + ult;
        const spiritage_qi = 2 + ult;
        const spiritstat_def = 3 + ult;
        const spiritual_power_qi_cost = 1 + ult;
        const spiritual_power_rep = 2 + ult;
        const spiritual_power_atk = 4 + ult;
        // do the first atk
        this.atk(first_atk_damage);
        // gain def from blade_forging_stable
        for (var i=0; i<this.players[0].blade_forging_stable_stacks; i++) {
            this.def(blade_forging_stable_def);
        }
        // attack for chain_attack
        for (var i=0; i<this.players[0].sword_pattern_carving_chain_attack_stacks; i++) {
            this.atk(chain_attack_atk);
        }
        // gain increase_atk from charge
        for (var i=0; i<this.players[0].sword_pattern_carving_charge_stacks; i++) {
            this.increase_idx_x_by_c(0, "increase_atk", charge_increase_atk);
        }
        // gain sword_intent from intense
        for (var i=0; i<this.players[0].sword_pattern_carving_intense_stacks; i++) {
            this.sword_intent(intense_sword_intent);
        }
        // gain qi from spiritage
        for (var i=0; i<this.players[0].qi_forging_spiritage_stacks; i++) {
            this.qi(spiritage_qi);
        }
        // gain def from spiritstat
        for (var i=0; i<this.players[0].qi_forging_spiritstat_stacks; i++) {
            this.def(spiritstat_def);
            this.for_each_x_add_c_y("qi", spiritstat_def, "def");
        }
        // pay qi to make attacks from spiritual_power
        for (var i=0; i<this.players[0].qi_forging_spiritual_power_stacks; i++) {
            if (this.players[0].qi >= spiritual_power_qi_cost) {
                this.reduce_c_of_x(spiritual_power_qi_cost, "qi");
                for (var j=0; j<spiritual_power_rep; j++) {
                    this.atk(spiritual_power_atk);
                }
            }
        }
        // next card counts as unrestrained sword if we picked unrestrained
        this.players[0].unrestrained_sword_clear_heart_stacks += this.players[0].quench_of_sword_heart_unrestrained_stacks;
        // next cloud sword chases if we picked cloud
        this.players[0].cloud_sword_clear_heart_stacks += this.players[0].quench_of_sword_heart_cloud_stacks;
    }
    activate_wood_spirit() {
        this.add_c_of_x(1, "activate_wood_spirit_stacks");
    }
    activate_fire_spirit() {
        this.add_c_of_x(1, "activate_fire_spirit_stacks");
    }
    activate_earth_spirit() {
        this.add_c_of_x(1, "activate_earth_spirit_stacks");
    }
    activate_metal_spirit() {
        this.add_c_of_x(1, "activate_metal_spirit_stacks");
    }
    activate_water_spirit() {
        this.add_c_of_x(1, "activate_water_spirit_stacks");
    }
    wood_spirit(arr) {
        if (this.players[0].activate_wood_spirit_stacks > 0 || this.players[0].last_card_is_water_spirit || this.players[0].last_card_is_wood_spirit) {
            this.do_action(arr);
        }
    }
    fire_spirit(arr) {
        //this.log("checking for fire spirit.");
        //this.log("activate_fire_spirit_stacks: " + this.players[0].activate_fire_spirit_stacks);
        //this.log("last_card_is_wood_spirit: " + this.players[0].last_card_is_wood_spirit);
        //this.log("last_card_is_fire_spirit: " + this.players[0].last_card_is_fire_spirit);
        //this.log("current card name: " + swogi[this.players[0].cards[this.players[0].currently_playing_card_idx]].name);
        //this.log("current is_fire_spirit: " + is_fire_spirit(this.players[0].cards[this.players[0].currently_playing_card_idx]));
        if (this.players[0].activate_fire_spirit_stacks > 0 || this.players[0].last_card_is_wood_spirit || this.players[0].last_card_is_fire_spirit) {
            this.do_action(arr);
        }
    }
    earth_spirit(arr) {
        if (this.players[0].activate_earth_spirit_stacks > 0 || this.players[0].last_card_is_fire_spirit || this.players[0].last_card_is_earth_spirit) {
            this.do_action(arr);
        }
    }
    metal_spirit(arr) {
        if (this.players[0].activate_metal_spirit_stacks > 0 || this.players[0].last_card_is_earth_spirit || this.players[0].last_card_is_metal_spirit) {
            this.do_action(arr);
        }
    }
    water_spirit(arr) {
        if (this.players[0].activate_water_spirit_stacks > 0 || this.players[0].last_card_is_metal_spirit || this.players[0].last_card_is_water_spirit) {
            this.do_action(arr);
        }
    }
    do_earth_spirit_landslide(base_atk, def_multiplier) {
        var atk = base_atk;
        if (this.players[0].activate_earth_spirit_stacks > 0 || this.players[0].last_card_is_fire_spirit || this.players[0].last_card_is_earth_spirit) {
            const def_reduction = Math.ceil(this.players[0].def * 0.5);
            atk += def_reduction * def_multiplier;
            this.log("landslide: " + def_reduction + " def reduction");
            this.reduce_c_of_x(def_reduction, "def");
        }
        this.atk(atk);
    }
    if_played_continuous(arr) {
        if (this.players[0].has_played_continuous_card) {
            this.do_action(arr);
        }
    }
    do_ultimate_world_formation(chases) {
        var has_wood_spirit_card = false;
        var has_fire_spirit_card = false;
        var has_earth_spirit_card = false;
        var has_metal_spirit_card = false;
        var has_water_spirit_card = false;
        for (var i=0; i<this.players[0].cards.length; i++) {
            var card_id = this.players[0].cards[i];
            has_wood_spirit_card |= is_wood_spirit(card_id);
            has_fire_spirit_card |= is_fire_spirit(card_id);
            has_earth_spirit_card |= is_earth_spirit(card_id);
            has_metal_spirit_card |= is_metal_spirit(card_id);
            has_water_spirit_card |= is_water_spirit(card_id);
        }
        if (has_wood_spirit_card) {
            chases++;
        }
        if (has_fire_spirit_card) {
            chases++;
        }
        if (has_earth_spirit_card) {
            chases++;
        }
        if (has_metal_spirit_card) {
            chases++;
        }
        if (has_water_spirit_card) {
            chases++;
        }
        this.players[0].ultimate_world_formation_stacks += chases;
    }
    star_point(arr) {
        if (this.players[0].is_star_point[this.players[0].currently_playing_card_idx]) {
            this.do_action(arr);
        }
    }
    do_polaris_citta_dharma(star_power) {
        if (this.players[0].currently_playing_card_idx === 0) {
            star_power += 1;
        }
        this.increase_idx_x_by_c(0, "star_power", star_power);
        for (var i = 0; i < this.players[0].is_star_point.length; i++) {
            this.players[0].is_star_point[i] = true;
        }
    }
    do_propitious_omen(amt) {
        const max_amt = Math.max(this.players[0].star_power, this.players[0].qi, this.players[0].hexagram);
        if (this.players[0].qi === max_amt) {
            this.add_c_of_x(amt, "qi");
        } else if (this.players[0].hexagram === max_amt) {
            this.add_c_of_x(amt, "hexagram");
        } else {
            this.add_c_of_x(amt, "star_power");
        }
    }
    if_c_pct_do(c, arr) {
        if (this.players[0].hexagram > 0) {
            this.reduce_idx_x_by_c(0, "hexagram", 1);
            this.do_action(arr);
            return;
        }
        this.used_randomness = true;
        if (Math.random() < c / 100) {
            this.do_action(arr);
        }
    }
    do_fire_spirit_blazing_praerie(amt) {
        const desired_max_hp = this.players[1].hp - amt;
        const reduce_amt = Math.max(0, this.players[1].max_hp - desired_max_hp);
        this.reduce_idx_max_hp(1, reduce_amt);
    }
    for_each_x_reduce_enemy_c_y(x, c, y) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        var to_lose = this.players[0][x] * c;
        this.reduce_enemy_c_of_x(to_lose, y);
    }
    post_action(arr) {
        if (this.players[0].can_post_action[this.players[0].currently_playing_card_idx]) {
            this.do_action(arr);
        }
    }
    physique(amt) {
        this.increase_idx_physique(0, amt);
    }
}

riddles = {};
riddles["1"] = () => {
    const enemy_hp = 131;
    const enemy_cultivation = 55;
    const enemy_physique = 66;
    const my_hp = 123;
    const my_cultivation = 64;
    const my_cards = [
        "345011",
        "633011",
        "362033",
        "133062",
        "135031",
        "134052",
        "635011",
        "132063",
        "132061",
        "132051",
        "133071",
        "132083"
    ];
    const enemy_cards = [
        "144052",
        "144061",
        "144092",
        "144012",
        "145081",
        "143032",
        "144032",
        "144102",
    ];
    var go = true;
    var iters = 0;
    while (go) {
        iters += 1;
        if (iters % 10000 === 0) {
            console.log("iters: " + iters);
        }
        // generate a random deck for me
        // that's 8 cards out of my_cards
        const copied_my_cards = my_cards.slice();
        var my_deck = [];
        for (var i=0; i<8; i++) {
            var idx = Math.floor(Math.random() * copied_my_cards.length);
            my_deck.push(copied_my_cards[idx]);
            copied_my_cards.splice(idx, 1);
        }
        var continuous_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[my_deck[i]].is_continuous) {
                continuous_count += 1;
            }
        }
        if (continuous_count > 2) {
            continue;   
        }
        var game = new GameState();
        game.players[0].cards = my_deck;
        game.players[1].cards = enemy_cards;
        game.players[0].max_hp = my_hp;
        game.players[0].hp = my_hp;
        game.players[1].max_hp = enemy_hp + enemy_physique;
        game.players[1].hp = enemy_hp;
        game.players[1].physique = enemy_physique;
        game.players[0].cultivation = my_cultivation;
        game.players[1].cultivation = enemy_cultivation;
        game.sim_n_turns(64);
        for (var i=0; i<8; i++) {
            my_deck[i] = format_card(my_deck[i]);
        }
        if (game.winner == 0) {
            console.log("winning deck: " + JSON.stringify(my_deck));
        } else {
            console.log("losing deck: " + JSON.stringify(my_deck));
        }
    }
};
// a generator that takes an array and k and generates all k-combinations of the array's elements
function* k_combinations(arr, k) {
    if (k === 0) {
        yield [];
        return;
    }
    if (arr.length < k) {
        return;
    }
    var head = arr[0];
    var tail = arr.slice(1);
    for (var subcombo of k_combinations(tail, k-1)) {
        yield [head, ...subcombo];
    }
    for (var subcombo of k_combinations(tail, k)) {
        yield subcombo;
    }
}
// print all 4-combinations of the array [1,2,3,4,5,6]
var arr = [1,2,3,4,5,6,7,8,9,10,11,12];
for (var combo of k_combinations(arr, 8)) {
    //console.log(JSON.stringify(combo));
}
function next_permutation(arr) {
    var i = arr.length - 1;
    while (i > 0 && arr[i-1] >= arr[i]) {
        i -= 1;
    }
    if (i === 0) {
        return false;
    }
    var j = arr.length - 1;
    while (arr[j] <= arr[i-1]) {
        j -= 1;
    }
    var temp = arr[i-1];
    arr[i-1] = arr[j];
    arr[j] = temp;
    j = arr.length - 1;
    while (i < j) {
        temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        i += 1;
        j -= 1;
    }
    return true;
}
var arr = [1,2,3,4];
do {
    //console.log(JSON.stringify(arr));
} while (next_permutation(arr));
riddles["2"] = () => {
    const enemy_hp = 127;
    const enemy_cultivation = 76;
    const my_hp = 120;
    const my_cultivation = 80;
    const my_cards = [
        "111102",
        "112071",
        "113052",
        "115052",
        "115032",
        "325032",
        "325022",
        "115042",
        //
        //"325031",
        //"115031",
        //"115012",
        //"114083"
    ];
    const enemy_cards = [
        "633011",
        "132052",
        "134083",
        "135031",
        "345011",
        "135031",
        "635011",
        "134062"
    ];
    var go = true;
    var combo_idx = 0;
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            game.players[0].cards = combo;
            game.players[1].cards = enemy_cards;
            game.players[0].max_hp = my_hp;
            game.players[0].hp = my_hp;
            game.players[1].max_hp = enemy_hp;
            game.players[1].hp = enemy_hp;
            game.players[0].cultivation = my_cultivation;
            game.players[1].cultivation = enemy_cultivation;
            game.players[0].fire_flame_blade_stacks = 1;
            game.sim_n_turns(64);
            console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
            if (game.winner == 0) {
                for (var i=0; i<8; i++) {
                    combo[i] = format_card(combo[i]);
                }
                console.log("winning deck: " + JSON.stringify(combo));
                return;
            } else {
                //console.log("losing deck: " + JSON.stringify(my_deck));
            }    
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;
};
riddles["3"] = () => {
    const enemy_hp = 138;
    const enemy_cultivation = 79;
    const my_hp = 115;
    const my_cultivation = 84;
    const my_cards = [
        "611031",
        "111063",
        "324022",
        "115032",
        "113032",
        "113032",
        "114011",
        "115041",
        //
        "324011",
        //"115031",
        //"115012",
        //"114083"
    ];
    const enemy_cards = [
        "633011",
        "135032",
        "132072",
        "134071",
        "135032",
        "133073",
        "634011",
        "135042"
    ];
    var go = true;
    var combo_idx = 0;
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            game.players[0].round_number = 18;
            game.players[0].cards = combo;
            game.players[1].cards = enemy_cards;
            game.players[0].max_hp = my_hp;
            game.players[0].hp = my_hp;
            game.players[1].max_hp = enemy_hp;
            game.players[1].hp = enemy_hp;
            game.players[0].cultivation = my_cultivation;
            game.players[1].cultivation = enemy_cultivation;
            game.players[0].blade_forging_sharpness_stacks = 1;
            game.players[0].sword_pattern_carving_intense_stacks = 1;
            game.players[0].qi_forging_spiritage_stacks = 1;
            game.players[0].quench_of_sword_heart_cloud_stacks = 1;
            game.sim_n_turns(64);
            console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
            if (game.winner == 0) {
                for (var i=0; i<8; i++) {
                    combo[i] = format_card(combo[i]);
                }
                game.dump();
                console.log("winning deck: " + JSON.stringify(combo));
                return;
            } else {
                //console.log("losing deck: " + JSON.stringify(my_deck));
            }    
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;
};
riddles["4"] = () => {
    const enemy_hp = 133;
    const enemy_cultivation = 79;
    const my_hp = 119;
    const my_cultivation = 84;
    const my_cards = [
        "144052",
        "144063",
        "144043",
        "145071",
        "144093",
        "144103",
        "144092",
        "315012",
        //
        "312013",
        "315011",
        "144102",
        "144051",
        //"144101"
    ];
    const enemy_cards = [
        "633011",
        "132072",
        "134071",
        "133073",
        "134071",
        "345011",
        "132083",
        "135042"
    ];
    var go = true;
    var combo_idx = 0;
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // if this combo has 3 or more continuous/consumption cards, skip it
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            game.players[0].cards = combo;
            game.players[1].cards = enemy_cards;
            game.players[0].max_hp = my_hp;
            game.players[0].hp = my_hp;
            game.players[1].max_hp = enemy_hp;
            game.players[1].hp = enemy_hp;
            game.players[0].cultivation = my_cultivation;
            game.players[1].cultivation = enemy_cultivation;
            game.sim_n_turns(64);
            //console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
            if (game.winner == 0) {
                for (var i=0; i<8; i++) {
                    combo[i] = format_card(combo[i]);
                }
                game.dump();
                console.log("winning deck: " + JSON.stringify(combo));
                return;
            } else {
                //console.log("losing deck: " + JSON.stringify(my_deck));
            }    
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;
};
riddles["21"] = () => {
    const enemy_hp = 123;
    const enemy_cultivation = 104;
    const my_hp = 123;
    const my_cultivation = 101;
    const my_physique = 59;
    const my_cards = [
        "144053",
        "144063",
        "145072",
        "144093",
        "315013",
        "145022",
        "144032",
        "144023",
        //
        "144031",
        //"144101"
    ];
    const enemy_cards = [
        "115011",
        "114023",
        "114011",
        "115021",
        "115011",
        "614011",
        "115022",
        "115022"
    ];
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // if this combo has 3 or more continuous/consumption cards, skip it
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            game.players[0].cards = enemy_cards;
            game.players[1].cards = combo;
            game.players[0].max_hp = enemy_hp;
            game.players[0].hp = enemy_hp;
            game.players[1].physique = my_physique;
            game.players[1].max_hp = my_hp + my_physique;
            game.players[1].hp = my_hp;
            game.players[0].cultivation = my_cultivation;
            game.players[1].cultivation = enemy_cultivation;
            game.players[0].fire_flame_blade_stacks = 1;
            game.players[0].drift_ice_blade_stacks = 1;
            game.players[0].p5_sword_rhyme_cultivate_stacks = 1;
            game.sim_n_turns(64);
            //game.dump();
            //console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
            //return;
            if (game.winner == 1) {
                for (var i=0; i<8; i++) {
                    combo[i] = format_card(combo[i]);
                }
                game.dump();
                console.log("winning deck: " + JSON.stringify(combo));
                return;
            } else {
                //console.log("losing deck: " + JSON.stringify(my_deck));
            }    
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;
};
riddles["22"] = () => {
    const enemy_hp = 109;
    const enemy_cultivation = 93;
    const my_hp = 126;
    const my_cultivation = 83;
    const my_cards = [
        "115012",
        "215011",
        "111103",
        "112072",
        "115051",
        "324023",
        "614032",
        "111093",
        //
        "325023",
        "323011",
        "111113"
        //"144101"
    ];
    const enemy_cards = [
        "354011",
        "615011",
        "112113",
        "355033",
        "601011",
        "601011",
        "601011",
        "114102"
    ];
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // if this combo has 3 or more continuous/consumption cards, skip it
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            game.players[0].cards = enemy_cards;
            game.players[1].cards = combo;
            game.players[0].max_hp = enemy_hp;
            game.players[0].hp = enemy_hp;
            game.players[1].max_hp = my_hp;
            game.players[1].hp = my_hp;
            game.players[0].cultivation = my_cultivation;
            game.players[1].cultivation = enemy_cultivation;
            game.sim_n_turns(64);
            //game.dump();
            //console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
            //return;
            if (game.winner == 1) {
                for (var i=0; i<8; i++) {
                    combo[i] = format_card(combo[i]);
                }
                game.dump();
                console.log("winning deck: " + JSON.stringify(combo));
                return;
            } else {
                //console.log("losing deck: " + JSON.stringify(my_deck));
            }    
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;
};
riddles["31"] = () => {
    const enemy_hp = 100;
    const enemy_cultivation = 72;
    const my_hp = 104;
    const my_cultivation = 68;
    const my_cards = [
        "125011",
        "125082",
        "124011",
        "224022",
        "125031",
        "125041",
        "123023",
        "124021",
        //
        "315011",
    ];
    const enemy_cards = [
        "135072",
        "133032",
        "134042",
        "134032",
        "135022",
        "134032",
        "231022",
        "132032"
    ];
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // if this combo has 3 or more continuous/consumption cards, skip it
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            game.players[0].cards = enemy_cards;
            game.players[1].cards = combo;
            game.players[0].max_hp = enemy_hp;
            game.players[0].hp = enemy_hp;
            game.players[1].max_hp = my_hp;
            game.players[1].hp = my_hp;
            game.players[0].cultivation = my_cultivation;
            game.players[1].cultivation = enemy_cultivation;
            game.players[0].five_elements_explosion_stacks = 1;
            game.sim_n_turns(64);
            //game.dump();
            //console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
            //return;
            if (game.winner == 1 && !game.used_randomness) {
                for (var i=0; i<8; i++) {
                    combo[i] = format_card(combo[i]);
                }
                game.dump();
                console.log("winning deck: " + JSON.stringify(combo));
                return;
            } else {
                //console.log("losing deck: " + JSON.stringify(my_deck));
            }    
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
riddles["32"] = () => {
    const enemy_hp = 121;
    const enemy_cultivation = 83;
    const my_hp = 121;
    const my_cultivation = 88;
    const my_cards = [
        "345022",
        "622012",
        "125053",
        "125062",
        "125083",
        "125061",
        "325031",
        "123092",
        //
        "122093",
    ];
    const enemy_cards = [
        "325022",
        "113032",
        "114012",
        "113041",
        "114012",
        "611013",
        "114053",
        "115042"
    ];
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // if this combo has 3 or more continuous/consumption cards, skip it
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            var temp_combo = combo.slice();
            try_idx += 1;
            var game = new GameState();
            game.players[1].cards = enemy_cards;
            game.players[0].cards = temp_combo;
            game.players[1].max_hp = enemy_hp;
            game.players[1].hp = enemy_hp;
            game.players[0].max_hp = my_hp;
            game.players[0].hp = my_hp;
            game.players[1].cultivation = my_cultivation;
            game.players[0].cultivation = enemy_cultivation;
            game.players[1].lithe_as_cat_stacks = 1;
            game.players[0].birdie_wind_stacks = 1;
            game.sim_n_turns(64);
            //game.dump();
            //console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
            //return;
            if (game.winner == 0 && !game.used_randomness) {
                for (var i=0; i<8; i++) {
                    combo[i] = format_card(combo[i]);
                }
                game.dump();
                console.log("winning deck: " + JSON.stringify(combo));
                return;
            } else {
                //console.log("losing deck: " + JSON.stringify(my_deck));
            }    
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["32"]();
riddles["33"] = () => {
    const enemy_hp = 112;
    const enemy_cultivation = 83;
    const enemy_physique = 87;
    const my_hp = 107;
    const my_cultivation = 88;
    const my_cards = [
        "622012",
        "125051",
        "122093",
        "345021",
        "125061",
        "125082",
        "125061",
        "123093",
        //
        "125081",
    ];
    const enemy_cards = [
        "144053",
        "145032",
        "145032",
        "144043",
        "145031",
        "145041",
        "145041",
        "365021"
    ];
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // if this combo has 3 or more continuous/consumption cards, skip it
        /*
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        console.log("concon_count: " + concon_count);
        */
        var try_idx = 0;
        do {
            var temp_combo = combo.slice();
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            game.players[1].cards = enemy_cards;
            game.players[0].cards = temp_combo;
            //game.players[0].cards = my_basic_deck;
            game.players[1].physique = enemy_physique;
            game.players[1].max_hp = enemy_hp + enemy_physique;
            game.players[1].hp = enemy_hp;
            game.players[0].max_hp = my_hp;
            game.players[0].hp = my_hp;
            game.players[1].cultivation = enemy_cultivation;
            game.players[0].cultivation = my_cultivation;
            game.players[0].birdie_wind_stacks = 1;
            game.players[1].courage_to_fight_stacks = 1;
            game.players[1].stance_of_fierce_attack_stacks = 1;
            game.players[1].p4_regenerating_body_stacks = 1;
            game.sim_n_turns(64);
            /*
            if (game.turns_taken > max_turns) {
                max_turns = game.turns_taken;
                max_turns_game = game;
                game.dump();
                console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
                for (var i=0; i<8; i++) {
                    temp_combo[i] = format_card(combo[i].replace(".0", ""));
                }
                console.log("deck to last " + max_turns + " turns: " + JSON.stringify(temp_combo));
            }*/
            //game.dump();
            //console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
            //return;
            if (game.winner == 0 && !game.used_randomness) {
                for (var i=0; i<8; i++) {
                    combo[i] = format_card(combo[i]);
                }
                game.dump();
                console.log("winning deck: " + JSON.stringify(combo));
                return;
            } else {
                //console.log("losing deck: " + JSON.stringify(my_deck));
            }    
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
riddles["34"] = () => {
    const enemy_hp = 112;
    const enemy_cultivation = 83;
    const enemy_physique = 87;
    const my_hp = 107;
    const my_cultivation = 88;
    const my_cards = [
        "345022",
        "622012",
        "125052",
        "122092",
        "125062",
        "345013",
        "125081",
        "124091",
        //
    ];
    const enemy_cards = [
        "314023",
        "111063",
        "111062",
        "115031",
        "113033",
        "114053",
        "115042",
        "601011"
    ];
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // if this combo has 3 or more continuous/consumption cards, skip it
        /*
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        console.log("concon_count: " + concon_count);
        */
        var try_idx = 0;
        do {
            var temp_combo = combo.slice();
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 0;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = temp_combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].max_hp = my_hp;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[my_idx].birdie_wind_stacks = 1;
            game.players[enemy_idx].fire_flame_blade_stacks = 1;
            game.sim_n_turns(64);
            /*
            if (game.turns_taken > max_turns) {
                max_turns = game.turns_taken;
                max_turns_game = game;
                game.dump();
                console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
                for (var i=0; i<8; i++) {
                    temp_combo[i] = format_card(combo[i].replace(".0", ""));
                }
                console.log("deck to last " + max_turns + " turns: " + JSON.stringify(temp_combo));
            }*/
            //game.dump();
            //console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
            //return;
            if (game.winner == my_idx && !game.used_randomness) {
                for (var i=0; i<8; i++) {
                    combo[i] = format_card(combo[i]);
                }
                game.dump();
                console.log("winning deck: " + JSON.stringify(combo));
                return;
            } else {
                //console.log("losing deck: " + JSON.stringify(my_deck));
            }    
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
riddles["35"] = () => {
    const enemy_hp = 113;
    const enemy_cultivation = 81;
    const enemy_physique = 0;
    const my_hp = 126;
    const my_cultivation = 71;
    const my_physique = 80;
    const my_cards = [
        "144052",
        "144051",
        "144063",
        "365033",
        "144041",
        "145031",
        "145041",
        "145042",
        //
        "144091",
        "145081",
        "145072"
    ];
    const enemy_cards = [
        "345021",
        "622011",
        "125051",
        "122092",
        "125081",
        "125061",
        "125061",
        "123092"
    ];
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // if this combo has 3 or more continuous/consumption cards, skip it
        /*
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        console.log("concon_count: " + concon_count);
        */
        var try_idx = 0;
        do {
            var temp_combo = combo.slice();
            var temp_enemy_cards = enemy_cards.slice();
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 0;
            game.players[enemy_idx].cards = temp_enemy_cards;
            game.players[my_idx].cards = temp_combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp + 13;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].birdie_wind_stacks = 1;
            //game.players[enemy_idx].fire_flame_blade_stacks = 1;
            game.sim_n_turns(64);
            /*
            if (game.turns_taken > max_turns) {
                max_turns = game.turns_taken;
                max_turns_game = game;
                game.dump();
                console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
                for (var i=0; i<8; i++) {
                    temp_combo[i] = format_card(combo[i].replace(".0", ""));
                }
                console.log("deck to last " + max_turns + " turns: " + JSON.stringify(temp_combo));
            }*/
            //game.dump();
            //console.log("my hp: " + game.players[0].hp + " enemy hp: " + game.players[1].hp);
            //return;
            if (game.winner == my_idx && !game.used_randomness) {
                for (var i=0; i<8; i++) {
                    combo[i] = format_card(combo[i]);
                }
                game.dump();
                console.log("winning deck: " + JSON.stringify(combo));
                return;
            } else {
                //console.log("losing deck: " + JSON.stringify(my_deck));
            }    
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
riddles["35"]();
var fuzz = true;
if (fuzz) {
    const start_time = process.hrtime();
    for (var i=0;; i++) {
        // now generate a random deck of 8 cards from among these keys
        var decks = [[],[]];
        for (var j=0; j<2; j++) {
            for (var k=0; k<8; k++) {
                var index = Math.floor(Math.random() * keys.length);
                decks[j].push(keys[index]);
            }
        }
        var game = new GameState();
        game.players[0].cards = decks[0];
        game.players[1].cards = decks[1];
        var decks_formatted = [[],[]];
        for (var j=0; j<2; j++) {
            for (var k=0; k<8; k++) {
                decks_formatted[j].push(format_card(decks[j][k]));
            }
        }
        //console.log("decks: " + JSON.stringify(decks_formatted));
        game.sim_n_turns(32);
        //game.dump();
        const now = process.hrtime();
        if (i % 10000 === 0) {
            console.log(i, (now[0] - start_time[0]) + (now[1] - start_time[1]) / 1e9);
        }
        //console.log(i);
    }
} else {
}
/* print the deck
for (var i=0; i<8; i++) {
  console.log(format_card(deck[i]));
}*/
