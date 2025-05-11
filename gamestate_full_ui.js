// const fs = require('fs');
// const process = require('process');
// const uf = require('@leeoniya/ufuzzy');
import uf from '@leeoniya/ufuzzy'
// export const swogi = JSON.parse(fs.readFileSync('swogi.json', 'utf8'));
// const names_json = JSON.parse(fs.readFileSync('names.json', 'utf8'));
import { card_actions } from './card_actions.js';
//import { readFileSync } from 'fs';
//let swogi = JSON.parse(readFileSync('swogi.json', 'utf8'));
//import { readFileSync } from 'fs';
//let swogi = JSON.parse(readFileSync('swogi.json', 'utf8'));

import  names_json from './names.json';
import  swogi from './swogi.json';

let keys = Object.keys(swogi);
keys.sort();
// the base_id of a card is the same id except that it always ends in 1
function get_base_id(card_id) {
    return card_id.substring(0, card_id.length-1) + "1";
}
function format_name_level(name, level) {
    return name + " (level " + level + ")";
}
export function format_card(card_id) {
    //console.log(card_id);
    let card_name = swogi[card_id].name;
    let card_level = card_id.substring(card_id.length-1);
    return format_name_level(card_name, card_level);
}
function actions_contains_str(actions, str) {
    if (actions.length > 0 && actions[0] === str) {
        return true;
    }
    for (let i=0; i<actions.length; i++) {
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
export const CHARACTER_ID_TO_NAME = {
    "sw1": "Mu Yifeng",
    "sw2": "Yan Xue",
    "sw3": "Long Yao",
    "sw4": "Lin Xiaoyue",
    "sw5": "Lu Jianxin",
    "sw6": "Li Chengyun",
    "he1": "Tan Shuyan",
    "he2": "Yan Chen",
    "he3": "Yao Ling",
    "he4": "Jiang Ximing",
    "he5": "Wu Ce",
    "fe1": "Wu Xingzhi",
    "fe2": "Du Lingyuan",
    "fe3": "Hua Qinrui",
    "fe4": "Mu Hu",
    "fe5": "Nangong Sheng",
    "dx1": "Xiao Bu",
    "dx2": "Tu Kui",
    "dx3": "Ye Mingming",
    "dx4": "Ji Fangsheng",
    "dx5": "Li Man",
}
const PREFIX_TO_MARKING = {
    ["11"]: "sw", // regular sect cards - cloud spirit sword sect
    ["12"]: "he", // regular sect cards - heptastar
    ["13"]: "fe", // regular sect cards - five elements
    ["14"]: "dx", // regular sect cards - duan xuan
    ["21"]: "sw", // secret enchantment cards - cloud spirit sword sect
    ["22"]: "he", // secret enchantment cards - heptastar
    ["23"]: "fe", // secret enchantment cards - five elements
    ["24"]: "dx", // secret enchantment cards - duan xuan
    ["31"]: "el", // side job cards - elixirist
    ["32"]: "fu", // side job cards - fuluist
    ["33"]: "mu", // side job cards - musician
    ["34"]: "pa", // side job cards - painter
    ["35"]: "fm", // side job cards - formation master
    ["36"]: "pm", // side job cards - plant master
    ["37"]: "ft", // side job cards - fortune teller
    ["40"]: "talisman", // talisman cards
    ["50"]: "spiritual_pet", // spiritual pet cards
    ["60"]: "no_marking", // normal attack, event cards
    ["61"]: "no_marking", // character-specific cards - cloud spirit sword sect
    ["62"]: "no_marking", // character-specific cards - heptastar
    ["63"]: "no_marking", // character-specific cards - five elements
    ["64"]: "no_marking", // character-specific cards - duan xuan
    ["71"]: "sw", // legendary cards - cloud spirit sword sect
    ["72"]: "he", // legendary cards - heptastar
    ["73"]: "fe", // legendary cards - five elements
    ["74"]: "dx", // legendary cards - duan xuan
    ["80"]: "no_marking", // zongzi cards
    ["90"]: "check", // fusion cards - side jobs
    ["91"]: "check", // fusion cards - cloud spirit sword sect
    ["92"]: "check", // fusion cards - heptastar
    ["93"]: "check", // fusion cards - five elements
    ["94"]: "check", // fusion cards - duan xuan
};
const valid_markings_list = ["no_marking","el", "fu", "mu", "pa", "fm", "pm", "ft", "sw", "he", "fe", "dx", "talisman", "spiritual_pet"];
const valid_markings = new Set(valid_markings_list);
function get_marking(card_id) {
    const prefix = card_id.substring(0, 2);
    let marking = PREFIX_TO_MARKING[prefix];
    if (marking === "check") {
        const card = swogi[card_id];
        if (card.character !== undefined) {
            return "no_marking";
        }
        const sect = parseInt(card_id.substring(1, 2)) - 1;
        if (sect === -1) {
            marking = card.marking;
        }
        if (sect >= 0 && sect < SECTS.length) {
            marking = SECTS[sect];
        }
    }
    if (card_id.startsWith("90600")) {
        marking = "no_marking";
    }
    if (!valid_markings.has(marking)) {
        throw new Error("suspicious card id " + card_id);
    }
    return marking;
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
    let ret = [];
    for (let i=0; i<keys.length; i++) {
        let card_id = keys[i];
        if (card_id.startsWith("1" + sect_num) || card_id.startsWith("2" + sect_num) || card_id.startsWith("3") || card_id.startsWith("4") || card_id.startsWith("5") || card_id.startsWith("60") || card_id.startsWith("6" + sect_num)) {
            ret.push(card_id);
        }
    }
    return ret;
}
// divine brush can generate "any sect card" meaning just those cards
// with the marking of the sect of the player
function get_available_divine_brush_cards_for_sect(sect_num) {
    let ret = [];
    for (let i=0; i<keys.length; i++) {
        let card_id = keys[i];
        if (card_id.startsWith("1" + sect_num) || card_id.startsWith("2" + sect_num)) {
            ret.push(card_id);
        }
    }
    return ret;
}
const SECT_TO_DIVINE_BRUSH_CARDS = {};
const SECT_TO_AVAILABLE_DECK_CARDS = {};
for (let i=0; i<SECTS.length; i++) {
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
    if (swogi[card_id].name === "Earth Spirit Elixir") {
        return false;
    }
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
let is_astral_move = function(card_id) {
    return swogi[card_id].name.includes("Astral Move");
}
let is_post_action = function(card_id) {
    return actions_contains_str(swogi[card_id].actions, "post_action");
}
let is_thunder = function(card_id) {
    return swogi[card_id].name.includes("Thunder");
}
let is_seal = function(card_id) {
    if (swogi[card_id].name === "Mysterious Gates Devil Seal Tower") {
        return false;
    }
    if (swogi[card_id].name === "Cosmos Seal Divine Orb") {
        return false;
    }
    return swogi[card_id].name.includes("Seal");
}
let is_spirit_sword = function(card_id) {
    return swogi[card_id].name.includes("Spirit Sword");
}
let is_cat = function(card_id) {
    return swogi[card_id].name.includes("Cat") &&
        (swogi[card_id].name.includes("Cat Paw") ||
        swogi[card_id].name.includes("Cat Claw") ||
        swogi[card_id].name.includes("Cat Chaos") ||
        swogi[card_id].name.includes("Bronze Cat"));
}
function with_default(x, default_val) {
    if (x === undefined) {
        return default_val;
    }
    return x;
}
const id_to_names_ = {};
const id_to_name_ = {};
for (let i=0; i<names_json.length; i++) {
    const id = names_json[i].id + "";
    const names = [];
    for (const prop in names_json[i]) {
        // if it starts with "name", add it to the names array
        if (prop.startsWith("name")) {
            names.push(names_json[i][prop]);
        }
    }
    id_to_names_[id] = names;
    if (names_json[i].name !== undefined) {
        id_to_name_[id] = names_json[i].name;
    }
}
for (let i=0; i<keys.length; i++) {
    const card_id = keys[i];
    if (id_to_names_[card_id] !== undefined) {
        swogi[card_id].names = id_to_names_[card_id];
    }
    if (id_to_name_[card_id] !== undefined) {
        swogi[card_id].name = id_to_name_[card_id];
    }
}

for (let i=0; i<keys.length; i++) {
    const card_id = keys[i];
    const base_id = get_base_id(card_id);
    const name = with_default(swogi[card_id].name, swogi[base_id].name);
    swogi[card_id].name = name;
    let names = with_default(swogi[card_id].names, swogi[base_id].names);
    if (names === undefined && name !== undefined) {
        names = [name];
    }
    const qi_cost = with_default(swogi[card_id].qi_cost, with_default(swogi[base_id].qi_cost, 0));
    const hp_cost = with_default(swogi[card_id].hp_cost, with_default(swogi[base_id].hp_cost, undefined));
    const character = with_default(swogi[card_id].character, with_default(swogi[base_id].character, undefined));
    const decrease_qi_cost_by_x = with_default(swogi[card_id].decrease_qi_cost_by_x, with_default(swogi[base_id].decrease_qi_cost_by_x, undefined));
    const water_spirit_cost_0_qi = with_default(swogi[card_id].water_spirit_cost_0_qi, with_default(swogi[base_id].water_spirit_cost_0_qi, undefined));
    const is_salty = with_default(swogi[card_id].is_salty, with_default(swogi[base_id].is_salty, undefined));
    const is_sweet = with_default(swogi[card_id].is_sweet, with_default(swogi[base_id].is_sweet, undefined));
    const marking = with_default(swogi[card_id].marking, with_default(swogi[base_id].marking, undefined));
    const gather_qi = with_default(swogi[card_id].gather_qi, with_default(swogi[base_id].gather_qi, undefined));
    const card = {
        name: name,
        names: names,
        qi_cost: qi_cost,
        hp_cost: hp_cost,
        decrease_qi_cost_by_x: decrease_qi_cost_by_x,
        water_spirit_cost_0_qi: water_spirit_cost_0_qi,
        gather_qi: gather_qi,
//        actions: swogi[card_id].actions,
        card_actions: card_actions[card_id],
        opening: swogi[card_id].opening,
        character: character,
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
        is_astral_move: is_astral_move(card_id),
        is_post_action: is_post_action(card_id),
        is_thunder: is_thunder(card_id),
        is_seal: is_seal(card_id),
        is_spirit_sword: is_spirit_sword(card_id),
        is_cat: is_cat(card_id),
        marking: marking,
        is_salty: is_salty,
        is_sweet: is_sweet,
    };
    swogi[card_id] = card;
    if (card.marking === undefined) {
        card.marking = get_marking(card_id);
    }
    Object.freeze(card);
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
is_astral_move = function(card_id) {
    return swogi[card_id].is_astral_move;
}
is_post_action = function(card_id) {
    return swogi[card_id].is_post_action;
}
is_thunder = function(card_id) {
    return swogi[card_id].is_thunder;
}
is_seal = function(card_id) {
    return swogi[card_id].is_seal;
}
is_spirit_sword = function(card_id) {
    return swogi[card_id].is_spirit_sword;
}
const CRASH_FIST_CARDS = [[],[],[],[]];
for (let i=0; i<keys.length; i++) {
    let card_id = keys[i];
    if (is_crash_fist(card_id) && (card_id.startsWith("1") || card_id.startsWith("2"))) {
        let level = parseInt(card_id.substring(card_id.length-1));
        CRASH_FIST_CARDS[level].push(card_id);
    }
}
const card_names = [];
const card_name_to_id = {};
for (let i=0; i<keys.length; i++) {
    const card_id = keys[i];
    //console.log(card_id, swogi[card_id].name, swogi[card_id].names);
    for (const name of [swogi[card_id].name, ...swogi[card_id].names]) {
        if (card_id.endsWith("1")) {
            card_names.push(name);
            card_name_to_id[name] = card_id;
        }
        const level = card_id.substring(card_id.length-1);
        const another_name = format_name_level(name, level);
        card_names.push(another_name);
        card_name_to_id[another_name] = card_id;
        if (card_id.endsWith("3")) {
            const lvmax = name + " (level max)";
            card_names.push(lvmax);
            card_name_to_id[lvmax] = card_id;
        }
    }
}
card_names.sort((a, b) => a.length - b.length);
const fuzzy = new uf();
export function card_name_to_id_fuzzy(name) {
    if (swogi[name] !== undefined) {
        return name;
    }
    const [idxs, info, order] = fuzzy.search(card_names, name);
    if (idxs.length === 0) {
        console.log("could not find card with name " + name);
        throw new Error("could not find card with name " + name);
    }
    return card_name_to_id[card_names[idxs[0]]];
}
const DEBUFF_NAMES = [
    "internal_injury",
    "decrease_atk",
    "weaken",
    "flaw",
    "entangle",
    "wound",
    "styx",
    "indigestion",
];
function is_debuff(attr_name) {
    if (attr_name === "internal_injury") return true;
    if (attr_name === "decrease_atk") return true;
    if (attr_name === "weaken") return true;
    if (attr_name === "flaw") return true;
    if (attr_name === "entangle") return true;
    if (attr_name === "wound") return true;
    if (attr_name === "styx") return true;
    if (attr_name === "indigestion") return true;
    return false;
}
const ACTIVATE_NAMES = [
    "activate_wood_spirit_stacks",
    "activate_fire_spirit_stacks",
    "activate_earth_spirit_stacks",
    "activate_metal_spirit_stacks",
    "activate_water_spirit_stacks",
];
function is_activate(attr_name) {
    if (attr_name === "activate_wood_spirit_stacks") return true;
    if (attr_name === "activate_fire_spirit_stacks") return true;
    if (attr_name === "activate_earth_spirit_stacks") return true;
    if (attr_name === "activate_metal_spirit_stacks") return true;
    if (attr_name === "activate_water_spirit_stacks") return true;
}
export class Player {
    constructor() {
        this.cards = [];
        this.can_play = []; // used for consumption/continuous cards
        this.is_star_point = [];
        this.can_post_action = [];
        this.skip_one_play = [];
        this.reset();
    }
    reset() {
        this.next_card_index = 0;
        this.cards.length = 0;
        this.can_play.length = 0; // used for consumption/continuous cards
        this.is_star_point.length = 0;
        this.can_post_action.length = 0;
        this.skip_one_play.length = 0;
        this.exchange_card_chance = 0;
        this.round_number = 15;
        this.destiny = 30;
        this.cultivation = 70;
        this.speed = 0;
        this.qi = 0;
        this.hp = 400;
        this.max_hp = 400;
        this.def = 0;
        this.this_card_attacked = false; // whether the player has attacked with this card
        this.this_card_directly_attacked = false; // whether this card attacked, excluding attacks by triggering other cards
        this.this_trigger_directly_attacked = false; // whether this card (the triggering one) attacked, excluding attacks by triggering other cards
        this.this_turn_attacked = false; // whether the player has attacked this turn
        this.this_atk_injured = false; // whether the enemy hp has been injured by this atk
        this.damage_dealt_to_hp_by_atk = 0; // for stuff that keys off how much damage went through to hp
        this.damage_dealt_to_hp_by_this_card_atk = 0; // for stuff that keys off how much damage went through to hp for all attacks by this card
        this.ignore_def = 0;
        this.smash_def = 0;
        this.guard_up = 0;
        this.bonus_atk_amt = 0; // card-specific bonus atk
        this.bonus_rep_amt = 0; // card-specific bonus rep
        this.bonus_force_amt = 0;
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


        // cloud sword sect legendary cards
        this.dragon_devours_clouds_stacks = 0;
        this.beast_spirit_sword_formation_stacks = 0;
        this.triggered_beast_spirit_sword_formation = false;


        // heptastar sect normal cards
        this.hexagram = 0;
        this.star_power = 0;
        this.strike_twice_stacks = 0;
        this.hp_gained = 0;
        this.stillness_citta_dharma_stacks = 0;
        this.triggered_hexagram_count = 0;
        this.hexagram_formacide_stacks = 0;
        this.repel_citta_dharma_stacks = 0;
        this.card_play_direction = 1;
        this.hunter_hunting_hunter_stacks = 0;


        // heptastar sect secret enchantment cards
        this.vitality_blossom_stacks = 0;
        this.bonus_star_power_multiplier = 0;
        this.thunder_citta_dharma_stacks = 0;
        this.preemptive_strike_stacks = 0;
        this.covert_shift_stacks = 0;


        // heptastar sect character-specific cards
        this.cannot_act_stacks = 0;
        this.reduce_qi_cost_on_star_point_stacks = 0;


        // heptastar sect legendary cards
        this.spiritual_divination_stacks = 0;
        this.throw_petals_stacks = 0;


        // five elements sect normal cards
        this.last_card_id = "601011";
        this.activate_wood_spirit_stacks = 0;
        this.activate_fire_spirit_stacks = 0;
        this.activate_earth_spirit_stacks = 0;
        this.activate_metal_spirit_stacks = 0;
        this.activate_water_spirit_stacks = 0;
        this.penetrate = 0;
        this.disable_penetrate_stacks = 0;
        this.force_of_water = 0;
        this.cosmos_seal_stacks = 0;
        this.wood_spirit_formation_stacks = 0;
        this.fire_spirit_formation_stacks = 0;
        this.earth_spirit_formation_stacks = 0;
        this.metal_spirit_formation_stacks = 0;
        this.water_spirit_formation_stacks = 0;
        this.earth_spirit_cliff_stacks = 0;
        this.metal_spirit_iron_bone_stacks = 0;
        this.water_spirit_dive_stacks = 0;
        this.earth_spirit_combine_world_stacks = 0;
        this.def_lost = 0;
        this.metal_spirit_giant_tripod_stacks = 0;
        this.ultimate_world_formation_stacks = 0;
        this.five_elements_heavenly_marrow_rhythm_stacks = 0;
        this.water_spirit_spring_stacks = 0;


        // five elements sect secret enchantment cards
        this.metal_spirit_chokehold_stacks = 0;
        this.max_hp_lost = 0;


        // five elements sect character-specific cards
        this.kun_wu_metal_ring_stacks = 0;
        this.water_spirit_spring_rain_stacks = 0;


        // five elements sect legendary cards
        this.wild_crossing_seal_stacks = 0;
        this.played_card_count = 0;


        // duan xuan sect normal cards
        this.agility = 0;
        this.physique = 0;
        this.max_physique = 0;
        this.force = 0;
        this.max_force = 6;
        this.later_crash_fist_poke_stacks = 0;
        this.crash_fist_poke_stacks = 0;
        this.crash_fist_block_stacks = 0;
        this.crash_fist_bounce_stacks = 0;
        this.crash_fist_shake_stacks = 0;
        this.crash_fist_entangle_stacks = 0;
        this.crash_fist_blitz_stacks = 0;
        this.this_card_crash_fist_blitz_stacks = 0;
        this.crash_footwork_stacks = 0;
        this.crash_fist_truncate_stacks = 0;
        this.crash_fist_blink_stacks = 0;
        this.crash_fist_inch_force_stacks = 0;
        this.this_card_crash_fist_inch_force_stacks = 0;
        this.crash_fist_shocked_stacks = 0;
        this.this_card_crash_fist_shocked_stacks = 0;
        this.elusive_footwork_triggered = false;
        this.elusive_footwork_stacks = 0;
        this.crash_citta_dharma_stacks = 0;
        this.hp_lost = 0;
        this.physique_gained = 0;
        this.exercise_bones_stacks = 0;
        this.majestic_qi_stacks = 0;
        this.ignore_decrease_atk = false;


        // duan xuan sect secret enchantment cards
        this.endless_force_stacks = 0;
        this.toxin_immunity_stacks = 0;
        this.lying_drunk_stacks = 0;
        this.crash_fist_double_stacks = 0;
        this.return_to_simplicity_stacks = 0;


        // duan xuan sect character-specific cards
        this.overwhelming_power_stacks = 0;
        this.styx = 0;
        this.crash_fist_stygian_night_stacks = 0;
        this.meditation_of_xuan_stacks = 0;


        // musician side job cards
        this.carefree_tune_stacks = 0;
        this.kindness_tune_stacks = 0;
        this.illusion_tune_stacks = 0;
        this.heartbroken_tune_stacks = 0;
        this.craze_dance_tune_stacks = 0;
        this.regen_tune_stacks = 0;
        this.predicament_for_immortals_stacks = 0;
        this.apparition_confusion_stacks = 0;
        this.has_played_musician_card = 0;


        // painter side job cards
        this.inspiration_stacks = 0;
        this.flying_brush_stacks = 0;
        this.finishing_touch_stacks = 0;


        // formation master side job cards
        this.thunderphilia_formation_stacks = 0;
        this.fraccide_formation_stacks = 0;
        this.scutturtle_formation_stacks = 0;
        this.cacopoisonous_formation_stacks = 0;
        this.spiritage_formation_stacks = 0;
        this.endless_sword_formation_stacks = 0;
        this.heavenly_spirit_forceage_formation_stacks = 0;
        this.octgates_lock_formation_stacks = 0;
        this.motionless_tutelary_formation_stacks = 0;
        this.skip_next_card_stacks = 0;
        this.has_played_continuous_card = false;
        this.anthomania_formation_stacks = 0;


        // plant master side job cards
        this.hard_bamboo_stacks = 0;
        this.leaf_blade_flower_stacks = 0;
        this.leaf_shield_flower_stacks = 0;
        this.frozen_snow_lotus_stacks = 0;
        this.entangling_ancient_vine_stacks = 0;
        this.devouring_ancient_vine_stacks = 0;
        // TODO: implement most of the below plants
        // divine_power_grass_stacks -> increase_atk
        // lose_power_grass_stacks -> decrease_atk
        // healing_chamomile_stacks -> regen
        // clear_chamomile_stacks -> hexproof
        // flying_owl_reishi_stacks -> speed
        // shadow_owl_reishi_stacks -> flying_brush_stacks
        // toxic_purple_fern_stacks -> internal_injury
        this.divine_power_grass_stacks = 0;;
        this.lose_power_grass_stacks = 0;
        this.healing_chamomile_stacks = 0;
        this.clear_chamomile_stacks = 0;
        this.flying_owl_reishi_stacks = 0;
        this.shadow_owl_reishi_stacks = 0;
        this.toxic_purple_fern_stacks = 0;


        // fortune teller side job cards
        this.observe_body_stacks = 0;
        this.god_luck_approach_stacks = 0;
        this.god_luck_avoid_stacks = 0;
        this.bad_omen_stacks = 0;
        this.skip_to_previous_card_stacks = 0;
        this.everything_goes_way_stacks = 0;
        this.nothing_is_appropriate_stacks = 0;
        this.fate_reincarnates_stacks = 0;
        this.god_opportunity_conform_stacks = 0;
        this.god_opportunity_reversal_stacks = 0;


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
        this.astrology_stacks = 0;
        this.heptastar_soulstat_stacks = 0;
        this.astral_divination_hexagram_stacks = 0;
        this.star_moon_folding_fan_stacks = 0;
        this.act_underhand_stacks = 0;
        this.rest_and_outwit_stacks = 0;
        this.ultimate_hexagram_base_stacks = 0;
        this.p2_divination_stacks = 0;
        this.p3_divination_stacks = 0;
        this.p4_divination_stacks = 0;
        this.p5_divination_stacks = 0;
        this.p2_stargaze_stacks = 0;
        this.p3_stargaze_stacks = 0;
        this.p4_stargaze_stacks = 0;
        this.p5_stargaze_stacks = 0;
        this.p2_astral_eclipse_stacks = 0;
        this.p3_astral_eclipse_stacks = 0;
        this.p4_astral_eclipse_stacks = 0;
        this.p5_astral_eclipse_stacks = 0;
        this.gain_extra_debuff = 0;
        this.p2_post_strike_stacks = 0;
        this.p3_post_strike_stacks = 0;
        this.p4_post_strike_stacks = 0;
        this.p5_post_strike_stacks = 0;
        this.p2_rejuvenation_stacks = 0;
        this.p3_rejuvenation_stacks = 0;
        this.p4_rejuvenation_stacks = 0;
        this.p5_rejuvenation_stacks = 0;

        // five elements sect immortal fates
        this.fire_spirit_generation_stacks = 0;
        this.flame_soul_rebirth_stacks = 0;
        this.flame_soul_rebirth_reviving = false;
        this.five_elements_explosion_stacks = 0;
        this.swift_burning_seal_stacks = 0;
        this.mark_of_five_elements_stacks = 0;
        this.innate_wood_stacks = 0;
        this.innate_fire_stacks = 0;
        this.innate_earth_stacks = 0;
        this.innate_metal_stacks = 0;
        this.innate_water_stacks = 0;
        this.innate_mark_stacks = 0;
        this.five_elements_anima_stacks = 0;
        this.peach_branch_ruyi_stacks = 0;
        this.mark_of_water_spirit_stacks = 0;
        this.blossom_dance_stacks = 0;
        this.the_body_of_fierce_tiger_stacks = 0;
        this.p2_cycle_of_five_elements_stacks = 0;
        this.p3_cycle_of_five_elements_stacks = 0;
        this.p4_cycle_of_five_elements_stacks = 0;
        this.p5_cycle_of_five_elements_stacks = 0;
        this.p2_mutual_growth_stacks = 0;
        this.p3_mutual_growth_stacks = 0;
        this.p4_mutual_growth_stacks = 0;
        this.p5_mutual_growth_stacks = 0;
        this.mutual_growth_stacks = 0;
        this.p2_concentrated_element_stacks = 0;
        this.p3_concentrated_element_stacks = 0;
        this.p4_concentrated_element_stacks = 0;
        this.p5_concentrated_element_stacks = 0;
        this.just_revived = false;


        // duan xuan sect immortal fates
        this.unbounded_qi_stacks = 0;
        this.unwavering_soul_stacks = 0;
        this.courage_to_fight_stacks = 0;
        this.cracking_fist_stacks = 0;
        this.stance_of_fierce_attack_stacks = 0;
        this.p2_firmness_body_stacks = 0;
        this.p3_firmness_body_stacks = 0;
        this.p4_firmness_body_stacks = 0;
        this.p5_firmness_body_stacks = 0;
        this.p2_regenerating_body_stacks = 0;
        this.p3_regenerating_body_stacks = 0;
        this.p4_regenerating_body_stacks = 0;
        this.p5_regenerating_body_stacks = 0;
        this.p2_full_of_force_stacks = 0;
        this.p3_full_of_force_stacks = 0;
        this.p4_full_of_force_stacks = 0;
        this.p5_full_of_force_stacks = 0;
        this.p2_mark_of_dark_heart_stacks = 0;
        this.p3_mark_of_dark_heart_stacks = 0;
        this.p4_mark_of_dark_heart_stacks = 0;
        this.p5_mark_of_dark_heart_stacks = 0;
        this.entering_styx_stacks = 0;
        this.zen_mind_forging_body_stacks = 0;
        this.mind_body_resonance_stacks = 0;
        this.surge_of_qi_stacks = 0;
        this.stance_is_fist = true;
        this.mortal_body_stacks = 0;
        this.indomitable_will_stacks = 0;


        // life shop buffs
        this.pact_of_adversity_reinforcement_stacks = 0;
        this.pact_of_equilibrium_stacks = 0;


        // super serious event buffs
        this.alkaline_water_zongzi_stacks = 0;
        this.fresh_fruit_zongzi_stacks = 0;
        this.salted_egg_yolk_zongzi_stacks = 0;
        this.mixed_grain_zongzi_stacks = 0;
        this.sweet_zongzi_count = 0;
        this.appetite = 0;
        this.indigestion = 0;


        // immortal relics fusion cards
        this.ultimate_polaris_hexagram_base_stacks = 0;
        this.star_moon_hexagram_fan_stacks = 0;
        this.kun_wu_molten_ring_stacks = 0;
        this.heavenly_marrow_gourd_stacks = 0;
        this.ultimate_overcome_formation_stacks = 0;
        this.wood_spirit_all_things_grow_stacks = 0;
        this.styx_night_footwork_triggered = false;
        this.styx_night_footwork_stacks = 0;
        this.crash_fist_return_to_xuan_stacks = 0;
        this.star_sky_forge_bone_stacks = 0;
        this.crash_fist_star_seizing_stacks = 0;
        this.this_card_crash_fist_star_seizing_stacks = 0;
        this.chase_if_hp_gained = 0;
        this.nuwa_stone_stacks = 0;
        this.is_triggering_donghuang_zhong = 0;
        this.is_triggering_kunlun_mirror = 0;
        this.pangu_axe_stacks = 0;
        this.kongtong_seal_stacks = 0;
        this.spirit_fusion_pot_stacks = 0;
        this.ignore_guard_up = 0;
        this.heavenly_maiden_white_jade_ring_stacks = 0;
        this.prevent_anti_chase = 0;
        this.xuanming_forceage_formation_stacks = 0;
        this.xuanming_regen_tune_heal_stacks = 0;
        this.xuanming_regen_tune_hurt_stacks = 0;
        this.xuanming_recurring_hp = 0;
        this.thunderbolt_tune_stacks = 0;
        this.astral_move_jump_stacks = 0;
        this.heavenly_marrow_dance_tune_stacks = 0;
        this.spiritstat_tune_stacks = 0;
        this.cloud_sword_endless_stacks = 0;
        this.heavenly_will_earth_evil_stacks = 0;


        // merpeople pearls
        this.qi_gathering_merpeople_pearl_stacks = 0;
        //TODO: implement crystallized_merpeople_pearl_stacks
        this.crystallized_merpeople_pearl_stacks = 0;


        // general resonance immortal fates
        this.resonance_store_qi_stacks = 0;


        // cloud sword sect resonance immortal fates
        // this.resonance_sword_rhyme_cultivate_stacks = 0;
        this.resonance_inheritance_of_spirit_sword_stacks = 0;
        this.resonance_sword_formation_guard_stacks = 0;
        // this.resonance_rule_of_the_cloud_stacks = 0;
        // this.resonance_sword_pool_the_heart_ask_stacks = 0;
        // this.resonance_sword_in_sheathed_stacks = 0;
        // this.resonance_endurance_as_cloud_sea_stacks = 0;
        // this.resonance_fire_flame_blade_stacks = 0;
        // this.resonance_drift_ice_blade_stacks = 0;
        this.gain_ignore_def_on_chase_stacks = 0;
        this.resonance_coral_sword_stacks = 0;
        // this.resonance_dragon_scale_stacks = 0;
        // this.resonance_pray_rain_stacks = 0;
        this.resonance_sky_delicate_bracelet_stacks = 0;
        this.resonance_cat_paw_stacks = 0;
        this.can_trigger_resonance_cat_paw = true;
        // this.resonance_spirit_cat_chaos_sword_stacks = 0;
        // this.resonance_lithe_as_cat_stacks = 0;
        // this.resonance_blade_forging_stacks = 0;
        // this.resonance_sword_pattern_carving_stacks = 0;
        // this.resonance_qi_forging_stacks = 0;
        // this.resonance_wind_rose_stacks = 0;
        // this.resonance_yeying_sword_formation_stacks = 0;
        // this.can_trigger_resonance_yeying_sword_formation = true;


        // heptastar sect resonance immortal fates
        // this.resonance_divination_stacks = 0;
        // this.resonance_stargaze_stacks = 0;
        // this.resonance_post_strike_stacks = 0;
        // this.resonance_astral_eclipse_stacks = 0;
        // this.resonance_inheritance_of_thunder_stacks = 0;
        this.resonance_rejuvenation_stacks = 0;
        // this.resonance_birdie_wind_stacks = 0;
        // this.resonance_avatar_of_bird_shade_stacks = 0;
        // this.resonance_bloodline_power_stacks = 0;
        this.resonance_within_reach_stacks = 0;
        // this.resonance_fury_thunder_stacks = 0;
        // this.resonance_innate_spirit_body_stacks = 0;
        // this.resonance_flame_flutter_stacks = 0;
        // this.resonance_rotary_divination_hexagram_stacks = 0;
        // this.resonance_astrology_stacks = 0;
        // this.resonance_starburst_stacks = 0;
        // this.resonance_heptastar_soulstat_stacks = 0;
        // this.resonance_astral_divination_hexagram_stacks = 0;
        // this.resonance_perfectly_planned_stacks = 0;
        // this.resonance_rest_and_outwit_stacks = 0;
        // this.resonance_act_underhand_stacks = 0;
        // this.resonance_star_moon_folding_fan_stacks = 0;


        // five elements sect resonance immortal fates
        this.resonance_landslide_stacks = 0;
        this.resonance_swift_burning_seal_stacks = 0;


        // duan xuan sect resonance immortal fates
        this.resonance_indomitable_will_stacks = 0;
        this.resonance_full_of_force_stacks = 0;
        this.resonance_firmness_body_stacks = 0;
    }
    reset_can_play() {
        this.cards = this.cards.slice();
        this.can_play.length = 0;
        this.is_star_point.length = 0;
        this.can_post_action.length = 0;
        this.skip_one_play.length = 0;
        const n_cards = this.cards.length;
        for (let i=0; i<n_cards; i++) {
            this.can_play.push(true);
            this.is_star_point.push(false);
            this.can_post_action.push(false);
            this.skip_one_play.push(false);
        }
        if (2 < n_cards) {
            this.is_star_point[2] = true;
        }
        if (5 < n_cards) {
            this.is_star_point[5] = true;
        }
        if (swogi[this.cards[n_cards - 1]].name === "Space Spiritual Field") {
            this.skip_one_play[n_cards - 1] = true;
        }
        if (swogi[this.cards[n_cards - 2]].name === "Space Spiritual Field") {
            this.skip_one_play[n_cards - 2] = true;
        }
        if (this.cards[n_cards - 1] === "601011" && this.heptastar_soulstat_stacks > 0) {
            this.cards[n_cards - 1] = "624011";
        }
        if (this.star_moon_folding_fan_stacks > 0 && this.cards.length > 6) {
            this.is_star_point[6] = true;
        }
        this.cosmos_seal_stacks = this.mark_of_five_elements_stacks;
    }
    reset_deck_counts() {
        const n_cards = this.cards.length;
        for (let i=0; i<n_cards; i++) {
            let card_id = this.cards[i];
            let card = swogi[card_id];
            if (card.is_sword_formation) {
                this.sword_formation_deck_count += 1;
            }
        }
    }
    post_deck_setup() {
        this.xuanming_recurring_hp = this.hp;
        this.reset_can_play();
        this.reset_deck_counts();
    }
}
export class GameState {
    constructor(l, na) {
        this.l = l;
        this.indentation = "";
        const a = new Player();
        const b = new Player();
        this.players = [a, b];
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
        let result = str.replace(/_/g, ' ');
        if (this.l.lang === 'cn') {

            const cardPattern = new RegExp(names_json.map(item => item.name).join("|"), "gi");
            result = result.replace(cardPattern, match => {
              return names_json.find(item => item.name.toLowerCase() === match.toLowerCase())?.namecn || match;
            });

            const pattern = new RegExp(Object.keys(this.l.cn).join("|"), "gi");
            result = result.replace(pattern, match => {
              return this.l.cn[match.toLowerCase()] || match;
            });
        }
        
        this.output.push(this.indentation + result);
    }
    indent() {
        this.indentation += "> ";
    }
    unindent() {
        this.indentation = this.indentation.substring(2);
    }
    do_coral_sword(idx) {
        for (let i=0; i<this.players[idx].coral_sword_stacks; i++) {
            this.increase_idx_x_by_c(idx, "ignore_def", 2);
        }
    }
    do_store_qi(idx) {
        const me = this.players[idx];
        for (let i=0; i<me.p2_store_qi_stacks; i++) {
            this.increase_idx_qi(idx, 1);
        }
        for (let i=0; i<me.p3_store_qi_stacks; i++) {
            this.increase_idx_qi(idx, 1);
        }
        for (let i=0; i<me.p4_store_qi_stacks; i++) {
            this.increase_idx_qi(idx, 2);
        }
        for (let i=0; i<me.p5_store_qi_stacks; i++) {
            this.increase_idx_qi(idx, 3);
        }
    }
    do_mad_obsession(idx) {
        const me = this.players[idx];
        this.increase_idx_x_by_c(idx, "unrestrained_sword_count", me.p4_mad_obsession_stacks);
        this.increase_idx_x_by_c(idx, "unrestrained_sword_count", me.p5_mad_obsession_stacks);
    }
    do_sword_rhyme_cultivate(idx) {
        const me = this.players[idx];
        for (let i=0; i<me.p2_sword_rhyme_cultivate_stacks; i++) {
            this.increase_idx_x_by_c(idx, "sword_intent", 1);
        }
        for (let i=0; i<me.p3_sword_rhyme_cultivate_stacks; i++) {
            this.increase_idx_x_by_c(idx, "sword_intent", 1);
        }
        for (let i=0; i<me.p4_sword_rhyme_cultivate_stacks; i++) {
            this.increase_idx_x_by_c(idx, "sword_intent", 1);
        }
        for (let i=0; i<me.p5_sword_rhyme_cultivate_stacks; i++) {
            this.increase_idx_x_by_c(idx, "sword_intent", 2);
        }
    }
    do_divination(idx) {
        const me = this.players[idx];
        for (let i=0; i<me.p2_divination_stacks; i++) {
            this.increase_idx_hexagram(idx, 1);
        }
        for (let i=0; i<me.p3_divination_stacks; i++) {
            this.increase_idx_hexagram(idx, 1);
        }
        for (let i=0; i<me.p4_divination_stacks; i++) {
            this.increase_idx_hexagram(idx, 2);
        }
        for (let i=0; i<me.p5_divination_stacks; i++) {
            this.increase_idx_hexagram(idx, 3);
        }
    }
    do_stargaze(idx) {
        const me = this.players[idx];
        for (let i=0; i<me.p2_stargaze_stacks; i++) {
            this.increase_idx_star_power(idx, 1);
        }
        for (let i=0; i<me.p3_stargaze_stacks; i++) {
            this.increase_idx_star_power(idx, 1);
        }
        for (let i=0; i<me.p4_stargaze_stacks; i++) {
            this.increase_idx_star_power(idx, 1);
        }
        for (let i=0; i<me.p5_stargaze_stacks; i++) {
            this.increase_idx_star_power(idx, 1);
        }
    }
    do_astral_eclipse(idx) {
        const enemy_idx = 1 - idx;
        const enemy = this.players[enemy_idx];
        const me = this.players[idx];
        enemy.gain_extra_debuff += me.p2_astral_eclipse_stacks;
        enemy.gain_extra_debuff += me.p3_astral_eclipse_stacks;
        enemy.gain_extra_debuff += 2 * me.p4_astral_eclipse_stacks;
        enemy.gain_extra_debuff += 3 * me.p5_astral_eclipse_stacks;
    }
    do_mutual_growth_setup(idx) {
        const me = this.players[idx];
        me.mutual_growth_stacks += me.p2_mutual_growth_stacks;
        me.mutual_growth_stacks += me.p3_mutual_growth_stacks;
        me.mutual_growth_stacks += 2 * me.p4_mutual_growth_stacks;
        me.mutual_growth_stacks += 3 * me.p5_mutual_growth_stacks;
    }
    get_n_different_five_elements(idx) {
        const cards = this.players[idx].cards;
        let has_wood = false;
        let has_fire = false;
        let has_earth = false;
        let has_metal = false;
        let has_water = false;
        let different_elements = 0;
        for (let i=0; i<cards.length; i++) {
            let card_id = cards[i];
            let card = swogi[card_id];
            if (card.is_wood_spirit && !has_wood) {
                has_wood = true;
                different_elements += 1;
            }
            if (card.is_fire_spirit && !has_fire) {
                has_fire = true;
                different_elements += 1;
            }
            if (card.is_earth_spirit && !has_earth) {
                has_earth = true;
                different_elements += 1;
            }
            if (card.is_metal_spirit && !has_metal) {
                has_metal = true;
                different_elements += 1;
            }
            if (card.is_water_spirit && !has_water) {
                has_water = true;
                different_elements += 1;
            }
        }
        return different_elements;
    }
    do_concentrated_element(idx) {
        if (this.get_n_different_five_elements(idx) !== 1) {
            return;
        }
        const me = this.players[idx];
        me.speed += 3 * me.p2_concentrated_element_stacks;
        me.speed += 4 * me.p3_concentrated_element_stacks;
        me.speed += 5 * me.p4_concentrated_element_stacks;
        me.speed += 6 * me.p5_concentrated_element_stacks;
    }
    do_innate_mark(idx) {
        const me = this.players[idx];
        if (me.innate_mark_stacks === 0) {
            return;
        }
        if (me.innate_wood_stacks > 0) {
            this.increase_idx_activate(idx, "activate_wood_spirit_stacks", 1);
        }
        if (me.innate_fire_stacks > 0) {
            this.increase_idx_activate(idx, "activate_fire_spirit_stacks", 1);
        }
        if (me.innate_earth_stacks > 0) {
            this.increase_idx_activate(idx, "activate_earth_spirit_stacks", 1);
        }
        if (me.innate_metal_stacks > 0) {
            this.increase_idx_activate(idx, "activate_metal_spirit_stacks", 1);
        }
        if (me.innate_water_stacks > 0) {
            this.increase_idx_activate(idx, "activate_water_spirit_stacks", 1);
        }
    }
    do_peach_branch_ruyi(idx) {
        for (let i=0; i<this.players[idx].peach_branch_ruyi_stacks; i++) {
            this.increase_idx_x_by_c(idx, "guard_up", 1);
        }
    }
    do_mark_of_water_spirit(idx) {
        for (let i=0; i<this.players[idx].mark_of_water_spirit_stacks; i++) {
            this.increase_idx_activate(idx, "activate_water_spirit_stacks", 1);
            this.increase_idx_qi(idx, 1);
        }
    }
    do_courage_to_fight(idx) {
        for (let i=0; i<this.players[idx].courage_to_fight_stacks; i++) {
            this.increase_idx_x_by_c(idx, "increase_atk", 1);
            this.increase_idx_debuff(idx, "wound", 1);
        }
    }
    do_firmness_body(idx) {
        const me = this.players[idx];
        for (let i=0; i<me.p2_firmness_body_stacks; i++) {
            this.for_each_idx_x_add_idx_c_pct_y(idx, "physique", idx, 10, "hp");
        }
        for (let i=0; i<me.p3_firmness_body_stacks; i++) {
            this.for_each_idx_x_add_idx_c_pct_y(idx, "physique", idx, 11.111112, "hp");
        }
        for (let i=0; i<me.p4_firmness_body_stacks; i++) {
            this.for_each_idx_x_add_idx_c_pct_y(idx, "physique", idx, 14.285715, "hp");
        }
        for (let i=0; i<me.p5_firmness_body_stacks; i++) {
            this.for_each_idx_x_add_idx_c_pct_y(idx, "physique", idx, 16.666667, "hp");
        }
    }
    do_full_of_force(idx) {
        const me = this.players[idx];
        for (let i=0; i<me.p2_full_of_force_stacks; i++) {
            this.increase_idx_force(idx, 1);
        }
        for (let i=0; i<me.p3_full_of_force_stacks; i++) {
            this.increase_idx_x_by_c(idx, "max_force", 1);
            this.increase_idx_force(idx, 1);
        }
        for (let i=0; i<me.p4_full_of_force_stacks; i++) {
            this.increase_idx_x_by_c(idx, "max_force", 2);
            this.increase_idx_force(idx, 1);
        }
        for (let i=0; i<me.p5_full_of_force_stacks; i++) {
            this.increase_idx_x_by_c(idx, "max_force", 3);
            this.increase_idx_force(idx, 1);
        }
    }
    do_mark_of_dark_heart(idx) {
        const me = this.players[idx];
        for (let i=0; i<me.p2_mark_of_dark_heart_stacks; i++) {
            this.increase_idx_debuff(idx, "internal_injury", 1);
            this.increase_idx_x_by_c(idx, "regen", 1);
        }
        for (let i=0; i<me.p3_mark_of_dark_heart_stacks; i++) {
            this.increase_idx_debuff(idx, "internal_injury", 2);
            this.increase_idx_x_by_c(idx, "regen", 2);
        }
        for (let i=0; i<me.p4_mark_of_dark_heart_stacks; i++) {
            this.increase_idx_debuff(idx, "internal_injury", 2);
            this.increase_idx_x_by_c(idx, "regen", 2);
        }
        for (let i=0; i<me.p5_mark_of_dark_heart_stacks; i++) {
            this.increase_idx_debuff(idx, "internal_injury", 3);
            this.increase_idx_x_by_c(idx, "regen", 3);
        }
    }
    do_entering_styx(idx) {
        const me = this.players[idx];
        if (me.entering_styx_stacks === 0) {
            return;
        }
        this.increase_idx_debuff(idx, "styx", me.entering_styx_stacks);
    }
    do_zen_mind_forging_body(idx) {
        const me = this.players[idx];
        if (me.zen_mind_forging_body_stacks === 0) {
            return;
        }
        this.increase_idx_physique(idx, me.zen_mind_forging_body_stacks);
    }
    try_upgrade_card(player_idx, card_idx) {
        const card_id = this.players[player_idx].cards[card_idx];
        const upgrade_level = card_id.substring(card_id.length - 1);
        if (upgrade_level === "3") {
            return false;
        }
        const new_level = parseInt(upgrade_level) + 1;
        const new_card_id = card_id.substring(0, card_id.length - 1) + new_level;
        if (swogi[new_card_id].does_not_exist) {
            return false;
        }
        this.players[player_idx].cards[card_idx] = new_card_id;
        this.log("player " + player_idx + " upgrades " + format_card(card_id) + " to " + format_card(new_card_id));
        return true;
    }
    try_downgrade_card(player_idx, card_idx) {
        const card_id = this.players[player_idx].cards[card_idx];
        const upgrade_level = card_id.substring(card_id.length - 1);
        if (upgrade_level === "1") {
            return false;
        }
        const new_level = parseInt(upgrade_level) - 1;
        const new_card_id = card_id.substring(0, card_id.length - 1) + new_level;
        if (swogi[new_card_id].does_not_exist) {
            return false;
        }
        this.players[player_idx].cards[card_idx] = new_card_id;
        this.log("player " + player_idx + " downgrades " + format_card(card_id) + " to " + format_card(new_card_id));
        return true;
    }
    do_pact_of_equilibrium(idx) {
        const me = this.players[idx];
        for (let i=0; i<me.pact_of_equilibrium_stacks; i++) {
            let upgrades = Math.floor(me.hand_count / 2);
            for (let card_idx = 0; card_idx < me.cards.length && upgrades > 0; card_idx++) {
                const card_id = me.cards[card_idx];
                const upgrade_level = card_id.substring(card_id.length - 1);
                if (upgrade_level === "1" && this.try_upgrade_card(idx, card_idx)) {
                    upgrades -= 1;
                }
            }
        }
    }
    do_the_body_of_fierce_tiger(idx) {
        const me = this.players[idx];
        if (me.the_body_of_fierce_tiger_stacks === 0) {
            return;
        }
        if (me.hp < 120) {
            return;
        }
        let upgrades = me.the_body_of_fierce_tiger_stacks;
        for (let card_idx = 0; card_idx < me.cards.length && upgrades > 0; card_idx++) {
            const card_id = me.cards[card_idx];
            const upgrade_level = card_id.substring(card_id.length - 1);
            const name = swogi[card_id].name;
            const is_innate = name === "Kun Wu Metal Ring" ||
                            name === "Metal Spirit - Vigorous" ||
                            name === "Earth Spirit - Landslide";
            if (upgrade_level === "1" && is_innate && this.try_upgrade_card(idx, card_idx)) {
                upgrades -= 1;
            }
        }
        for (let card_idx = 0; card_idx < me.cards.length && upgrades > 0; card_idx++) {
            const card_id = me.cards[card_idx];
            const upgrade_level = card_id.substring(card_id.length - 1);
            if (upgrade_level === "1" && this.try_upgrade_card(idx, card_idx)) {
                upgrades -= 1;
            }
        }
    }
    do_pact_of_adversity_reinforcement(idx) {
        const me = this.players[idx];
        for (let i=0; i<me.pact_of_adversity_reinforcement_stacks; i++) {
            for (let card_idx = 0; card_idx < me.cards.length; card_idx++) {
                if (this.try_upgrade_card(idx, card_idx)) {
                    break;
                }
            }
        }
    }
    do_opening(card_idx, trigger_idx) {
        const me = this.players[0];
        const card_id = me.cards[card_idx];
        const action = swogi[card_id].opening;
        if (action === undefined) {
            return;
        }
        if (trigger_idx === undefined) {
            trigger_idx = card_idx;
        }
        const prev_triggering_idx = me.currently_triggering_card_idx;
        const prev_triggering_id = me.currently_triggering_card_id;
        const prev_bonus_atk_amt = me.bonus_atk_amt;
        me.bonus_atk_amt = 0;
        const prev_bonus_rep_amt = me.bonus_rep_amt;
        const prev_this_trigger_directly_attacked = me.this_trigger_directly_attacked;
        me.currently_triggering_card_idx = trigger_idx;
        me.currently_triggering_card_id = card_id;
        me.bonus_rep_amt = 0;
        me.damage_dealt_to_hp_by_this_card_atk = 0;
        me.this_trigger_directly_attacked = false;
        this.do_action(action);
        me.currently_triggering_card_idx = prev_triggering_idx;
        me.currently_triggering_card_id = prev_triggering_id;
        me.bonus_atk_amt = prev_bonus_atk_amt;
        me.bonus_rep_amt = prev_bonus_rep_amt;
        me.this_trigger_directly_attacked = prev_this_trigger_directly_attacked;
    }
    start_of_game_setup() {
        //for (let idx = 0; idx < 2; idx++) {
        //    this.players[idx].max_hp += this.players[idx].physique;
        //}
        for (let idx = 0; idx < 2; idx++) {
            this.players[idx].post_deck_setup();
        }
        for (let idx = 0; idx < 2; idx++) {
            this.do_the_body_of_fierce_tiger(idx);
            this.do_pact_of_equilibrium(idx);
            this.do_pact_of_adversity_reinforcement(idx);
            this.do_coral_sword(idx);
            this.do_store_qi(idx);
            this.do_mad_obsession(idx);
            this.do_sword_rhyme_cultivate(idx);
            this.do_divination(idx);
            this.do_stargaze(idx);
            this.do_astral_eclipse(idx);
            this.do_mutual_growth_setup(idx);
            this.do_concentrated_element(idx);
            this.do_firmness_body(idx);
            this.do_peach_branch_ruyi(idx);
            this.do_mark_of_water_spirit(idx);
            this.do_shadow_owl_reishi(idx);
            this.do_full_of_force(idx);
            this.do_innate_mark(idx);
            this.do_courage_to_fight(idx);
            this.do_mark_of_dark_heart(idx);
            this.do_entering_styx(idx);
            this.do_zen_mind_forging_body(idx);
            this.do_resonance_setup(idx);
            if (idx === 1) {
                this.swap_players();
            }
            const nc = this.players[0].cards.length;
            for (let card_idx = 0; card_idx < nc; card_idx++) {
                this.do_opening(card_idx);
            }
            if (idx === 1) {
                this.swap_players();
            }
        }
    }
    swap_players() {
        const players = this.players;
        const temp = players[0];
        players[0] = players[1];
        players[1] = temp;
    }
    sim_n_turns(n) {
        this.start_of_game_setup();
        let i = 0;
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
            this.log("-----------");
            if (this.game_over) {
                break;
            }
        }
        let winner = 0;
        if (this.players[0].hp < this.players[1].hp) {
            winner = 1;
        }
        this.winner = winner;
        this.turns_taken = i;
        const winner_character_id = this.players[winner].character;
        const winner_character = CHARACTER_ID_TO_NAME[winner_character_id];
        this.log("player " + winner + " (" + winner_character_id + ") wins");
    }
    sim_n_turns_zongzi(n) {
        this.start_of_game_setup();
        let i = 0;
        for (; i<n; i++) {
            this.log("turn " + i + " begins");
            this.indent();
            this.sim_turn();
            this.unindent();
            this.log("turn " + i + " ends");
            if (this.game_over) {
                break;
            }
        }
        let winner = 0;
        if (this.players[0].hp < this.players[1].hp) {
            winner = 1;
        }
        this.winner = winner;
        this.turns_taken = i;
        const winner_character_id = this.players[winner].character;
        const winner_character = CHARACTER_ID_TO_NAME[winner_character_id];
        this.log("player " + winner + " (" + winner_character + ") wins");
    }
    do_action(arr) {
        // the actions list is like this: [["atk", 14], ["injured", ["regain_sword_intent"]]]
        // so we need to call this[arr[0]] passing in the rest of the array as arguments
        let ret = undefined;
        if (arr.length === 0) {
            this.log("empty action list");
            return ret;
        }
        // if arr[0] is actually an array, then try calling do_action on all the elements of arr
        if (Array.isArray(arr[0])) {
            for (let i=0; i<arr.length; i++) {
                ret = this.do_action(arr[i]);
            }
            return ret;
        }
        let action_name = arr[0];
        let args = arr.slice(1);
        if (this[action_name] === undefined) {
            this.log("action " + action_name + " is not defined");
            this.crash();
        }
        return this[action_name](...args);
    }
    do_cloud_sword_softheart_and_friends(card_id) {
        if (this.is_cloud_sword(card_id)) {
            const me = this.players[0];
            if (me.cloud_sword_softheart_stacks > 0) {
                this.heal(me.cloud_sword_softheart_stacks);
            }
            for (let i=0; i<me.lithe_as_cat_stacks; i++) {
                this.increase_idx_qi(0, 1);
            }
            for (let i=0; i<me.p2_rule_of_the_cloud_stacks; i++) {
                this.increase_idx_def(0, 1);
            }
            for (let i=0; i<me.p3_rule_of_the_cloud_stacks; i++) {
                this.increase_idx_def(0, 2);
            }
            for (let i=0; i<me.p4_rule_of_the_cloud_stacks; i++) {
                this.increase_idx_def(0, 2);
            }
            for (let i=0; i<me.p5_rule_of_the_cloud_stacks; i++) {
                this.increase_idx_def(0, 3);
            }
            if (me.cloud_sword_clear_heart_stacks > 0) {
                this.chase();
                me.cloud_sword_clear_heart_stacks -= 1;
            }
        }
    }
    do_unrestrained_sword_count(card_id) {
        // if this card has "Unrestrained Sword" in the name, increment unrestrained_sword_count
        const me = this.players[0];
        if (me.unrestrained_sword_clear_heart_stacks > 0) {
            this.players[0].unrestrained_sword_count += 1;
            this.log("incremented unrestrained_sword_count to " + this.players[0].unrestrained_sword_count);
            this.reduce_idx_x_by_c(0, "unrestrained_sword_clear_heart_stacks", 1);
        } else
        if (this.is_unrestrained_sword(card_id)) {
            this.players[0].unrestrained_sword_count += 1;
            this.log("incremented unrestrained_sword_count to " + this.players[0].unrestrained_sword_count);
        }
    }
    do_sweet_zongzi_count(card_id) {
        const card = swogi[card_id];
        if (card.is_sweet) {
            this.players[0].sweet_zongzi_count += 1;
            this.log("incremented sweet_zongzi_count to " + this.players[0].sweet_zongzi_count);
        }
    }
    do_alkaline_water_zongzi(card_id) {
        if (this.players[0].alkaline_water_zongzi_stacks === 0) {
            return;
        }
        const card = swogi[card_id];
        if (card.is_sweet) {
            this.increase_idx_qi(0, this.players[0].alkaline_water_zongzi_stacks);
        }
        if (card.is_salty) {
            this.heal(this.players[0].alkaline_water_zongzi_stacks * 2);
        }
    }
    do_salted_egg_yolk_zongzi(card_idx) {
        if (this.players[0].salted_egg_yolk_zongzi_stacks > 0) {
            this.reduce_idx_x_by_c(0, "salted_egg_yolk_zongzi_stacks", 1);
            if (!this.try_upgrade_card(0, card_idx)) {
                this.add_c_of_x(2, "appetite");
            }
        }
    }
    do_cloud_sword_chain_count(card_id) {
        const me = this.players[0];
        // if this card has "Cloud Sword" in the name, increment cloud_sword_chain_count
        if (this.is_cloud_sword(card_id)) {
            me.cloud_sword_chain_count += 1;
            this.log("incremented cloud_sword_chain_count to " + me.cloud_sword_chain_count);
            this.do_step_moon_into_cloud(card_id);
        } else {
            if (me.cloud_sword_chain_count > 0
                && me.endurance_as_cloud_sea_stacks === 0
            ) {
                me.cloud_sword_chain_count = 0;
                this.log("reset cloud_sword_chain_count to 0");
            }
        }
    }
    do_elemental_spirit_stuff(card_id) {
        this.players[0].last_card_id = card_id;
    }
    do_sword_formation_deck_count(card_id) {
        const me = this.players[0];
        me.other_sword_formation_deck_count = me.sword_formation_deck_count;
        if (swogi[card_id].is_sword_formation) {
            me.other_sword_formation_deck_count -= 1;
        }
    }
    do_step_moon_into_cloud(card_id) {
        if (this.players[0].step_moon_into_cloud_stacks === 0) {
            return;
        }
        if (this.is_cloud_sword(card_id)) {
            this.for_each_x_add_y("step_moon_into_cloud_stacks", "increase_atk");
        }
    }
    do_emptiness_sword_formation(card_id) {
        const atk = this.players[0].emptiness_sword_formation_stacks;
        if (atk === 0) {
            return;
        }
        if (this.players[0].trigger_depth > 1) {
            return;
        }
        if (is_sword_formation(card_id)) {
            this.log("Attacking for " + atk + " from emptiness sword formation.");
            this.atk(atk, true);
        }
    }
    do_beast_spirit_sword_formation(card_id) {
        const stacks = this.players[0].beast_spirit_sword_formation_stacks;
        if (stacks === 0) {
            return;
        }
        if (this.players[0].trigger_depth > 1) {
            return;
        }
        if (this.players[0].triggered_beast_spirit_sword_formation) {
            return;
        }
        this.players[0].triggered_beast_spirit_sword_formation = true;
        const dmg = stacks * this.players[0].qi;
        if (dmg > 0) {
            if (is_sword_formation(card_id) || is_spirit_sword(card_id)) {
                this.log("Dealing " + dmg + " damage from beast spirit sword formation.");
                this.deal_damage(dmg);
            }
        }
    }
    do_stance_of_fierce_attack(card_id) {
        const me = this.players[0];
        const reps = me.stance_of_fierce_attack_stacks;
        if (reps > 0 ) {
            if (me.trigger_depth > 1) {
                return;
            }
            const atk = 3;
            if (is_add_physique(card_id)) {
                for (let i=0; i<reps; i++) {
                    this.log("Attacking for " + atk + " from stance of fierce attack.");
                    this.atk(atk, true);
                }
            }
        }
    }
    do_hunter_hunting_hunter(card_id) {
        const me = this.players[0];
        const atk = me.hunter_hunting_hunter_stacks;
        if (atk > 0) {
            if (me.trigger_depth > 1) {
                return;
            }
            if (is_post_action(card_id)) {
                this.log("Attacking for " + atk + " from hunter hunting hunter.");
                this.atk(atk, true);
            }
        }
    }
    do_endless_sword_formation() {
        const me = this.players[0];
        if (me.endless_sword_formation_stacks > 0 && me.this_card_directly_attacked) {
            if (me.trigger_depth > 1) {
                return;
            }
            this.reduce_idx_x_by_c(0, "endless_sword_formation_stacks", 1);
            this.log("Attacking for 5 from endless sword formation.");
            this.atk(5, true);
        }
    }
    do_observe_body() {
        const me = this.players[0];
        if (me.observe_body_stacks > 0 && me.this_card_directly_attacked) {
            if (me.trigger_depth > 1) {
                return;
            }
            const amt = me.observe_body_stacks;
            this.reduce_idx_x_by_c(0, "observe_body_stacks", amt);
            this.log("Attacking for " + amt + " from observe body.");
            this.atk(amt, true);
        }
    }
    do_cloud_sword_endless(card_id) {
        const me = this.players[0];
        if (this.is_cloud_sword(card_id) &&
            me.cloud_sword_endless_stacks > 0 &&
            me.this_card_directly_attacked) {
            if (me.trigger_depth > 1) {
                return;
            }
            const amt = me.cloud_sword_endless_stacks;
            this.log("Attacking for " + amt + " from cloud sword - endless.");
            this.atk(amt, true);
        }
    }
    do_sword_formation_guard(idx) {
        const me = this.players[0];
        if (me.trigger_depth > 1) {
            return;
        }
        if (idx !== 0) {
            return;
        }
        for (let i=0; i<me.p2_sword_formation_guard_stacks; i++) {
            this.increase_idx_def(0, 1);
            this.add_c_of_x(1, "moon_water_sword_formation_stacks");
        }
        for (let i=0; i<me.p3_sword_formation_guard_stacks; i++) {
            this.increase_idx_def(0, 3);
            this.add_c_of_x(1, "moon_water_sword_formation_stacks");
        }
        for (let i=0; i<me.p4_sword_formation_guard_stacks; i++) {
            this.increase_idx_def(0, 6);
            this.add_c_of_x(1, "moon_water_sword_formation_stacks");
        }
        for (let i=0; i<me.p5_sword_formation_guard_stacks; i++) {
            this.increase_idx_def(0, 9);
            this.add_c_of_x(1, "moon_water_sword_formation_stacks");
        }
    }
    do_regenerating_body(idx) {
        if (idx !== 0) {
            return;
        }
        const me = this.players[0];
        if (me.trigger_depth > 1) {
            return;
        }
        for (let i=0; i<me.p2_regenerating_body_stacks; i++) {
            this.increase_idx_physique(0, 1);
            this.increase_idx_hp(0, 1);
        }
        for (let i=0; i<me.p3_regenerating_body_stacks; i++) {
            this.increase_idx_physique(0, 1);
            this.increase_idx_hp(0, 2);
        }
        for (let i=0; i<me.p4_regenerating_body_stacks; i++) {
            this.increase_idx_physique(0, 2);
            this.increase_idx_hp(0, 4);
        }
        for (let i=0; i<me.p5_regenerating_body_stacks; i++) {
            this.increase_idx_physique(0, 2);
            this.increase_idx_hp(0, 6);
        }
    }
    do_resonance_store_qi(idx) {
        if (idx !== 0) {
            return;
        }
        const me = this.players[0];
        if (me.resonance_store_qi_stacks > 0) {
            this.increase_idx_qi(0, 1);
        }
    }
    do_resonance_inheritance_of_spirit_sword(card_id) {
        const me = this.players[0];
        if (me.resonance_inheritance_of_spirit_sword_stacks === 0) {
            return;
        }
        if (!is_spirit_sword(card_id)) {
            return;
        }
        this.increase_idx_qi(0, 2);
        me.resonance_inheritance_of_spirit_sword_stacks = 0;
    }
    do_record_musician_card_played_for_chord_in_tune(card_id) {
        if (swogi[card_id].marking === "mu") {
            this.players[0].has_played_musician_card = 1;
        }
    }
    do_crash_citta_dharma(card_id) {
        if (swogi[card_id].hp_cost !== undefined && swogi[card_id].hp_cost > 0) {
            this.for_each_x_add_y("crash_citta_dharma_stacks", "force");
        }
    }
    is_crash_fist(card_id) {
        return (
            this.players[0].crash_footwork_stacks > 0 ||
        is_crash_fist(card_id));
    }
    get_debuff_count(idx) {
        const me = this.players[idx];
        let ret = 0;
        ret += me.decrease_atk;
        ret += me.internal_injury;
        ret += me.wound;
        ret += me.styx;
        ret += me.entangle;
        ret += me.flaw;
        ret += me.weaken;
        return ret;
    }
    do_pre_crash_fist(card_id) {
        if (!this.is_crash_fist(card_id)) {
            return;
        }
        const me = this.players[0];
        if (me.crash_fist_stygian_night_stacks > 0) {
            const debuff_amt = this.get_debuff_count(0);
            const bonus_atk = Math.min(debuff_amt, me.crash_fist_stygian_night_stacks);
            this.increase_idx_x_by_c(0, "bonus_atk_amt", bonus_atk);
        }
        this.for_each_x_add_y("crash_fist_poke_stacks", "bonus_atk_amt");
        this.for_each_x_add_y("crash_fist_block_stacks", "def");
        this.for_each_x_add_y("crash_fist_shake_stacks", "force");
        const wound_amt = me.crash_fist_entangle_stacks;
        this.increase_idx_debuff(1, "wound", wound_amt);
        this.for_each_x_add_y("crash_fist_blitz_stacks", "this_card_crash_fist_blitz_stacks");
        if (me.crash_fist_truncate_stacks > 0) {
            this.transfer_random_debuff();
        }
        this.for_each_x_add_y("crash_fist_inch_force_stacks", "this_card_crash_fist_inch_force_stacks");
        this.for_each_x_add_y("crash_fist_star_seizing_stacks", "this_card_crash_fist_star_seizing_stacks");
        this.for_each_x_add_y("crash_fist_blink_stacks", "agility");
        this.for_each_x_add_y("crash_fist_shocked_stacks", "this_card_crash_fist_shocked_stacks");
        if (swogi[card_id].name !== "Crash Fist - Continue")
        {
            me.crash_fist_block_stacks = 0;
            me.crash_fist_shake_stacks = 0;
            me.crash_fist_entangle_stacks = 0;
            me.crash_fist_blitz_stacks = 0;
            me.crash_fist_truncate_stacks = 0;
            me.crash_fist_inch_force_stacks = 0;
            me.crash_fist_blink_stacks = 0;
            me.crash_fist_shocked_stacks = 0;
            me.crash_fist_star_seizing_stacks = 0;
        }
    }
    do_post_crash_fist(card_id) {
        if (!this.is_crash_fist(card_id)) {
            return;
        }
        const me = this.players[0];
        me.this_card_crash_fist_blitz_stacks = 0;
        me.this_card_crash_fist_inch_force_stacks = 0;
        if (me.this_card_crash_fist_star_seizing_stacks > 0) {
            me.this_card_crash_fist_star_seizing_stacks = 0;
            this.for_each_x_add_c_pct_y("damage_dealt_to_hp_by_this_card_atk", 60, "hp");
        }
        if (me.this_trigger_directly_attacked
            && swogi[card_id].name !== "Crash Fist - Continue"
        ) {
            me.crash_fist_poke_stacks = 0;
        }
        me.crash_fist_poke_stacks += me.later_crash_fist_poke_stacks;
        me.later_crash_fist_poke_stacks = 0;
    }
    do_crash_fist_shocked(card_id) {
        const me = this.players[0];
        if (me.this_card_crash_fist_shocked_stacks === 0) {
            return;
        }
        if (!this.is_crash_fist(card_id)) {
            return;
        }
        if (this.players[0].this_card_crash_fist_shocked_stacks > 0) {
            let atk_amt = 1;
            atk_amt += Math.floor(0.2 * this.players[0].hp_lost);
            this.log("Attacking for " + atk_amt + " from crash fist - shocked effect.");
            this.atk(atk_amt, true);
        }
        this.players[0].this_card_crash_fist_shocked_stacks = 0;
    }
    do_wood_spirit_formation(card_id) {
        const card = swogi[card_id];
        if (card.is_wood_spirit) {
            this.for_each_x_add_y("wood_spirit_formation_stacks", "hp");
        }
    }
    do_fire_spirit_formation(card_id) {
        const card = swogi[card_id];
        if (card.is_fire_spirit) {
            const amt = this.players[0].fire_spirit_formation_stacks;
            this.reduce_idx_hp(1, amt);
            this.reduce_idx_max_hp(1, amt);
        }
    }
    do_earth_spirit_formation(card_id) {
        const card = swogi[card_id];
        if (card.is_earth_spirit) {
            this.for_each_x_add_y("earth_spirit_formation_stacks", "def");
        }
    }
    do_metal_spirit_formation(card_id) {
        const card = swogi[card_id];
        if (card.is_metal_spirit) {
            this.for_each_x_add_y("metal_spirit_formation_stacks", "penetrate");
        }
    }
    do_water_spirit_formation(card_id) {
        const card = swogi[card_id];
        if (card.is_water_spirit) {
            this.for_each_x_add_y("water_spirit_formation_stacks", "qi");
        }
    }
    do_cycle_of_five_elements_and_friends(card_id) {
        const me = this.players[0];
        let bail = true;
        if (me.p2_cycle_of_five_elements_stacks > 0) bail = false;
        if (me.p3_cycle_of_five_elements_stacks > 0) bail = false;
        if (me.p4_cycle_of_five_elements_stacks > 0) bail = false;
        if (me.p5_cycle_of_five_elements_stacks > 0) bail = false;
        if (me.blossom_dance_stacks > 0) bail = false;
        if (bail) return;
        if (!this.cards_have_generating_interaction(me.last_card_id, card_id)) {
            return;
        }
        const def_amt = 3 * me.p2_cycle_of_five_elements_stacks;
        if (def_amt > 0) {
            this.increase_idx_def(0, def_amt);
        }
        const qi_amt = me.p3_cycle_of_five_elements_stacks;
        if (qi_amt > 0) {
            this.increase_idx_qi(0, qi_amt);
        }
        const hp_amt = 4 * me.p4_cycle_of_five_elements_stacks;
        if (hp_amt > 0) {
            this.add_c_of_x(hp_amt, "max_hp");
            this.heal(hp_amt);
        }
        const pen_amt = 4 * me.p5_cycle_of_five_elements_stacks;
        if (pen_amt > 0) {
            this.add_c_of_x(pen_amt, "penetrate");
        }
        if (me.blossom_dance_stacks > 0) {
            this.increase_idx_qi(0, 1);
            this.add_c_of_x(1, "max_hp");
            this.heal(1);
            if (swogi[card_id].name === "Wood Spirit - Peach Blossom Seal") {
                this.chase();
            }
        }
    }
    do_swift_burning_seal(card_id, idx) {
        if (this.players[0].swift_burning_seal_stacks > 0) {
            if (is_seal(card_id)) {
                this.players[0].swift_burning_seal_stacks -= 1;
                this.players[0].can_play[idx] = false;
                this.chase();
            }
        }
    }
    do_astral_divination_hexagram(card_id) {
        if (this.players[0].astral_divination_hexagram_stacks === 0) {
            return;
        }
        if (is_astral_move(card_id)) {
            this.increase_idx_hexagram(0, 1);
        }
    }
    do_cosmos_seal(card_id) {
        if (this.players[0].cosmos_seal_stacks > 0) {
            const card = swogi[card_id];
            if (card.is_wood_spirit) {
                this.activate_wood_spirit();
                this.players[0].cosmos_seal_stacks -= 1;
                return;
            }
            if (card.is_fire_spirit) {
                this.activate_fire_spirit();
                this.players[0].cosmos_seal_stacks -= 1;
                return;
            }
            if (card.is_earth_spirit) {
                this.activate_earth_spirit();
                this.players[0].cosmos_seal_stacks -= 1;
                return;
            }
            if (card.is_metal_spirit) {
                this.activate_metal_spirit();
                this.players[0].cosmos_seal_stacks -= 1;
                return;
            }
            if (card.is_water_spirit) {
                this.activate_water_spirit();
                this.players[0].cosmos_seal_stacks -= 1;
                return;
            }
        }
    }
    do_post_strike(card_id, idx) {
        const me = this.players[0];
        if (me.can_post_action[idx]) {
            return;
        }
        if (!is_post_action(card_id)) {
            return;
        }
        for (let i=0; i<me.p2_post_strike_stacks; i++) {
            this.increase_idx_def(0, 2);
            this.add_c_of_x(2, "max_hp");
            this.heal(2);
        }
        for (let i=0; i<me.p3_post_strike_stacks; i++) {
            this.increase_idx_def(0, 3);
            this.add_c_of_x(3, "max_hp");
            this.heal(3);
        }
        for (let i=0; i<me.p4_post_strike_stacks; i++) {
            this.increase_idx_def(0, 4);
            this.add_c_of_x(4, "max_hp");
            this.heal(4);
        }
        for (let i=0; i<me.p5_post_strike_stacks; i++) {
            this.increase_idx_def(0, 5);
            this.add_c_of_x(5, "max_hp");
            this.heal(5);
        }
    }
    do_god_luck_approach(card_id) {
        if (this.players[0].god_luck_approach_stacks > 0) {
            const card = swogi[card_id];
            const opening = card.opening;
            if (opening !== undefined) {
                this.do_action(opening);
                this.deal_damage(3);
                this.reduce_c_of_x(1, "god_luck_approach_stacks");
            }
        }
    }
    do_god_luck_avoid(card_id) {
        if (this.players[0].god_luck_avoid_stacks > 0) {
            const card = swogi[card_id];
            const opening = card.opening;
            if (opening === undefined) {
                this.increase_idx_def(0, 3);
                this.heal(2);
                this.reduce_c_of_x(1, "god_luck_avoid_stacks");
            }
        }
    }
    just_do_the_card_and_nothing_else(card) {
        card.card_actions(this);
    }
    trigger_card(card_id, idx) {
        this.indent();
        const p0 = this.players[0];
        p0.trigger_depth += 1;
        const prev_triggering_idx = p0.currently_triggering_card_idx;
        const prev_triggering_id = p0.currently_triggering_card_id;
        const prev_bonus_atk_amt = p0.bonus_atk_amt;
        p0.bonus_atk_amt = 0;
        const prev_bonus_rep_amt = p0.bonus_rep_amt;
        const prev_this_trigger_directly_attacked = p0.this_trigger_directly_attacked;
        let card = swogi[card_id];
        p0.currently_triggering_card_idx = idx;
        p0.currently_triggering_card_id = card_id;
        p0.bonus_rep_amt = 0;
        p0.damage_dealt_to_hp_by_this_card_atk = 0;
        p0.this_trigger_directly_attacked = false;
        this.do_cloud_sword_softheart_and_friends(card_id);
        this.do_astral_divination_hexagram(card_id);
        this.do_sword_formation_guard(idx);
        this.do_regenerating_body(idx);
        this.do_crash_citta_dharma(card_id);
        this.do_pre_crash_fist(card_id);
        this.do_cycle_of_five_elements_and_friends(card_id);
        this.do_wood_spirit_formation(card_id);
        this.do_fire_spirit_formation(card_id);
        this.do_earth_spirit_formation(card_id);
        this.do_metal_spirit_formation(card_id);
        this.do_water_spirit_formation(card_id);
        this.do_god_luck_avoid(card_id);
        this.do_alkaline_water_zongzi(card_id);
        this.do_resonance_store_qi(idx);
        this.do_resonance_inheritance_of_spirit_sword(card_id);
        this.just_do_the_card_and_nothing_else(card);
        //card_actions[card_id](this);
        //this.do_action(card.actions);
        this.do_post_strike(card_id, idx);
        p0.bonus_atk_amt = 0;
        this.do_god_luck_approach(card_id);
        // expire crash fist buffs - they don't apply to extra attacks
        this.do_post_crash_fist(card_id);


        // Extra attacks zone
        this.do_emptiness_sword_formation(card_id);
        this.do_endless_sword_formation();
        // Endless sword formation seems to not trigger for cards that only attacked
        // because of hhh, Shocked, or Stance of Fierce Attack.
        this.do_hunter_hunting_hunter(card_id);
        this.do_stance_of_fierce_attack(card_id);
        this.do_crash_fist_shocked(card_id);
        this.do_observe_body();
        this.do_cloud_sword_endless(card_id);
        // End of extra attacks zone


        this.do_beast_spirit_sword_formation(card_id);
        this.do_unrestrained_sword_count(card_id);
        this.do_sweet_zongzi_count(card_id);
        if (p0.chase_if_hp_gained > 0) {
            if (p0.hp_gained > 0) {
                this.chase();
            }
            p0.chase_if_hp_gained = 0;
        }
        p0.bonus_atk_amt = prev_bonus_atk_amt;
        p0.bonus_rep_amt = prev_bonus_rep_amt;
        p0.this_trigger_directly_attacked = prev_this_trigger_directly_attacked;
        p0.currently_triggering_card_idx = prev_triggering_idx;
        p0.currently_triggering_card_id = prev_triggering_id;
        p0.trigger_depth -= 1;
        this.unindent();
    }
    process_this_card_chases() {
        const me = this.players[0];
        if (me.predicament_for_immortals_stacks > 0
            && me.prevent_anti_chase === 0
        ) {
            return;
        }
        const prevent_anti_chase = me.prevent_anti_chase > 0;
        if (me.prevent_anti_chase > 0) {
            me.prevent_anti_chase -= 1;
        }
        if (me.just_revived) {
            return;
        }
        // if we chased 1 or more times during this card, let's regard that as 1 chase for now...
        if (me.this_card_chases <= 0) {
            if (me.agility >= 10 && me.chases < me.max_chases) {
                me.this_card_chases += 1;
                me.agility -= 10;
                this.log("Spent 10 agility to chase. Agility is now " + me.agility);
            }
        }
        if (me.this_card_chases > 0 && me.chases < me.max_chases) {
            let do_entangle = (me.entangle > 0
                && !prevent_anti_chase
            );
            if (do_entangle &&
                me.resonance_indomitable_will_stacks > 0 &&
                !me.stance_is_fist
            ) {
                do_entangle = false;
                this.reduce_idx_hp(0, 15);
            }
            if (do_entangle) {
                this.reduce_idx_x_by_c(0, "entangle", 1);
                this.for_each_x_add_y("entangling_ancient_vine_stacks", "wound");
            } else {
                me.chases += 1;
                this.log("incremented chases to " + me.chases);
                if (me.surge_of_qi_stacks > 0 && !me.stance_is_fist) {
                    this.increase_idx_qi(0, 1);
                }
                if (me.gain_ignore_def_on_chase_stacks > 0) {
                    this.increase_idx_x_by_c(0, "ignore_def", 1);
                }
            }
        }
    }
    play_card_inner(card_id, idx) {
        const me = this.players[0];
        me.this_card_attacked = false;
        me.this_card_directly_attacked = false;
        me.sword_intent_flow_mode = false;
        me.this_card_sword_intent = 0;
        this.do_swift_burning_seal(card_id, idx);
        this.do_sword_formation_deck_count(card_id);
        this.do_cosmos_seal(card_id);
        this.do_flying_brush_chase();
        this.trigger_card(card_id, idx);
        this.do_cloud_sword_chain_count(card_id);
        this.do_elemental_spirit_stuff(card_id);
        this.do_ultimate_overcome_formation(idx);
        this.do_record_musician_card_played_for_chord_in_tune(card_id);
        me.can_post_action[idx] = true;
    }
    play_card(card_id, idx) {
        const me = this.players[0];
        me.this_card_chases = 0;
        me.currently_playing_card_idx = idx;
        let plays = 1;
        if (me.unrestrained_sword_twin_dragons_stacks > 0) {
            if (this.is_unrestrained_sword(card_id)) {
                plays += 1;
                this.reduce_idx_x_by_c(0, "unrestrained_sword_twin_dragons_stacks", 1);
            }
        }
        if (me.strike_twice_stacks > 0) {
            plays += 1;
            this.reduce_idx_x_by_c(0, "strike_twice_stacks", 1);
        }
        if (me.crash_fist_double_stacks > 0) {
            if (this.is_crash_fist(card_id)) {
                plays += 1;
                if (swogi[card_id].name !== "Crash Fist - Continue")
                {
                    this.reduce_idx_x_by_c(0, "crash_fist_double_stacks", 1);
                }
            }
        }
        for (let i=0; i<plays; i++) {
            this.play_card_inner(card_id, idx);
            me.played_card_count += 1;
        }
        me.currently_playing_card_idx = undefined;
    }
    get_next_idx(idx) {
        const me = this.players[0];
        const len = me.cards.length;
        const incr = me.card_play_direction;
        idx = (idx + len + incr) % len;
        return idx;
    }
    get_prev_idx(idx) {
        const me = this.players[0];
        const len = me.cards.length;
        const incr = me.card_play_direction;
        idx = (idx + len - incr) % len;
        return idx;
    }
    get_next_playable_idx(idx) {
        const me = this.players[0];
        const len = me.cards.length;
        const incr = me.card_play_direction;
        for (let i=0; i<len; i++) {
            idx = (idx + len + incr) % len;
            if (me.can_play[idx]) {
                return idx;
            }
        }
    }
    advance_next_card_index() {
        const me = this.players[0];
        me.next_card_index = this.get_next_playable_idx(me.next_card_index);
    }
    can_play_a_card() {
        const me = this.players[0];
        return me.next_card_index < me.cards.length && me.can_play[me.next_card_index];
    }
    gain_qi_to_afford_card(gather_qi) {
        if (gather_qi !== undefined) {
            this.increase_idx_qi(0, gather_qi);
        }
        if (this.players[0].rest_and_outwit_stacks > 0) {
            this.increase_idx_qi(0, 3);
            this.add_c_of_x(3, "hexagram");
        } else
        {
            this.increase_idx_qi(0, 1);
        }
    }
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
    do_qi_gathering_merpeople_pearl() {
        if (this.players[0].qi_gathering_merpeople_pearl_stacks > 0) {
            this.increase_idx_qi(0, this.players[0].qi_gathering_merpeople_pearl_stacks);
        }
    }
    do_apex_sword_citta_dharma() {
        if (this.players[0].apex_sword_citta_dharma_stacks > 0) {
            this.add_c_of_x(this.players[0].apex_sword_citta_dharma_stacks, "sword_intent");
        }
    }
    do_def_decay() {
        // def lost is is def*def_decay / 100, rounded up
        const me = this.players[0];
        let def_decay = 50;
        if (me.black_earth_turtle_stacks > 0) {
            def_decay = 20;
        }
        if (me.moon_water_sword_formation_stacks > 0) {
            def_decay = 0;
            this.reduce_idx_x_by_c(0, "moon_water_sword_formation_stacks", 1);
        }
        this.for_each_x_reduce_c_pct_y("def", def_decay, "def");
        if (me.black_earth_turtle_stacks > 0) {
            this.for_each_x_add_y("black_earth_turtle_stacks", "def");
        }
    }
    do_next_turn_def() {
        const amt = this.players[0].next_turn_def;
        if (amt > 0) {
            this.reduce_idx_x_by_c(0, "next_turn_def", amt);
            this.increase_idx_def(0, amt);
        }
    }
    do_regen() {
        const me = this.players[0];
        if (me.regen > 0) {
            this.heal(me.regen);
        }
    }
    do_regen_tune() {
        const me = this.players[0];
        if (me.regen_tune_stacks > 0) {
            this.increase_idx_max_hp(0, me.regen_tune_stacks);
            this.heal(me.regen_tune_stacks);
        }
    }
    do_xuanming_regen_tune() {
        const me = this.players[0];
        if (me.xuanming_regen_tune_heal_stacks > 0) {
            this.increase_idx_max_hp(me.xuanming_regen_tune_heal_stacks);
            this.heal(me.xuanming_regen_tune_heal_stacks);
        }
        if (me.xuanming_regen_tune_hurt_stacks > 0) {
            this.reduce_idx_hp(0, me.xuanming_regen_tune_hurt_stacks);
        }
    }
    do_thunderbolt_tune() {
        const amt = this.players[0].thunderbolt_tune_stacks;
        if (amt > 0) {
            if (this.if_c_pct(10)) {
                this.deal_damage(amt);
            }
        }
    }
    do_resonance_sword_formation_guard() {
        const me = this.players[0];
        if (me.resonance_sword_formation_guard_stacks > 0 &&
            me.def > 0) {
            this.increase_idx_def(0, 3);
        }
    }
    do_internal_injury(idx, is_start_of_turn) {
        const me = this.players[idx];
        let amt = me.internal_injury;
        if (amt > 0) {
            if (is_start_of_turn &&
                me.resonance_indomitable_will_stacks > 0 &&
                me.stance_is_fist
            ) {
                amt = Math.floor(amt * 0.5);
            }
            this.reduce_idx_hp(idx, amt);
        }
    }
    do_ultimate_hexagram_base() {
        const amt = this.players[0].ultimate_hexagram_base_stacks;
        if (amt > 0) {
            this.add_c_of_x(amt, "hexagram");
        }
    }
    do_ultimate_polaris_hexagram_base() {
        const amt = this.players[0].ultimate_polaris_hexagram_base_stacks;
        if (amt > 0) {
            this.add_c_of_x(amt, "hexagram");
            this.add_c_of_x(amt, "star_power");
        }
    }
    do_water_spirit_spring_rain() {
        const amt = this.players[0].water_spirit_spring_rain_stacks;
        if (amt > 0) {
            this.add_c_of_x(amt, "force_of_water");
        }
    }
    do_wood_spirit_all_things_grow() {
        const amt = this.players[0].wood_spirit_all_things_grow_stacks;
        if (amt > 0) {
            this.add_c_of_x(amt, "increase_atk");
        }
    }
    do_nuwa_stone() {
        const amt = this.players[0].nuwa_stone_stacks;
        if (amt > 0) {
            this.reduce_c_of_x(1, "nuwa_stone_stacks");
            this.heal(this.players[0].hp);
        }
    }
    do_resonance_rejuvenation() {
        const me = this.players[0];
        if (me.resonance_rejuvenation_stacks === 0) {
            return;
        }
        if (me.hp < 0.5 * me.max_hp) {
            this.increase_idx_hp(0, Math.floor(me.max_hp * 0.25));
            this.reduce_idx_x_by_c(0, "resonance_rejuvenation_stacks", 1);
        }
    }
    do_illusion_tune() {
        const amt = this.players[0].illusion_tune_stacks;
        if (amt > 0) {
            this.reduce_my_hp(amt);
            this.increase_idx_def(0, amt);
        }
    }
    do_heartbroken_tune() {
        const amt = this.players[0].heartbroken_tune_stacks;
        if (amt > 0) {
            this.add_c_of_x(amt, "internal_injury");
        }
    }
    do_meditation_of_xuan() {
        if (this.players[0].meditation_of_xuan_stacks === 0) {
            return;
        }
        this.for_each_x_add_y("meditation_of_xuan_stacks", "internal_injury");
        this.for_each_x_add_y("meditation_of_xuan_stacks", "regen");
    }
    do_unrestrained_sword_zero() {
        if (this.players[0].unrestrained_sword_zero_stacks > 0) {
            const card_id = this.players[0].currently_triggering_card_id;
            if (this.is_unrestrained_sword(card_id)) {
                let healing_amt = Math.floor(this.players[0].damage_dealt_to_hp_by_atk * this.players[0].unrestrained_sword_zero_stacks / 100);
                this.heal(healing_amt);
            }
        }
    }
    do_dark_star_bat() {
        if (this.players[0].dark_star_bat_stacks > 0) {
            if (this.players[0].damage_dealt_to_hp_by_atk > 0 && this.players[0].damage_dealt_to_hp_by_atk <= this.players[0].dark_star_bat_stacks) {
                this.log("dark star bat triggers!!");
                this.heal(this.players[0].damage_dealt_to_hp_by_atk);
            }
        }
    }
    do_water_spirit_spring() {
        if (this.players[0].water_spirit_spring_stacks > 0) {
            this.for_each_x_add_c_pct_y("damage_dealt_to_hp_by_atk", 20, "force_of_water");
            this.players[0].water_spirit_spring_stacks -= 1;
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
        if (this.players[0].lonely_night_wolf_stacks > 0) {
            if (this.players[0].hp < this.players[0].max_hp * .5) {
                return this.players[0].lonely_night_wolf_stacks;
            }
        }
        return 0;
    }
    do_nothing_is_appropriate() {
        if (this.players[0].nothing_is_appropriate_stacks > 0) {
            this.reduce_idx_x_by_c(0, "nothing_is_appropriate_stacks", 1);
            return -6;
        }
        return 0;
    }
    do_indomitable_will() {
        let ret = 0;
        let me = this.players[0];
        let enemy = this.players[1];
        if (me.indomitable_will_stacks > 0 && !me.stance_is_fist) {
            ret += 1;
        }
        if (enemy.indomitable_will_stacks > 0 && enemy.stance_is_fist) {
            ret -= 1;
        }
        return ret;
    }
    do_exercise_bones() {
        if (this.players[0].exercise_bones_stacks > 0) {
            this.add_c_of_x(1, "physique");
            this.reduce_c_of_x(1, "exercise_bones_stacks");
            return 3;
        }
        return 0;
    }
    do_star_sky_forge_bone() {
        const amt = this.players[0].star_sky_forge_bone_stacks;
        if (amt > 0) {
            this.reduce_c_of_x(amt, "star_sky_forge_bone_stacks");
        }
        return amt;
    }
    do_flying_brush_chase() {
        if (this.players[0].flying_brush_stacks > 0) {
            this.chase();
            this.reduce_idx_x_by_c(0, "flying_brush_stacks", 1);
        }
    }
    do_five_elements_heavenly_marrow_rhythm_chase() {
        const me = this.players[0];
        if (me.predicament_for_immortals_stacks > 0
            && me.prevent_anti_chase === 0
        ) {
            return;
        }
        if (me.five_elements_heavenly_marrow_rhythm_stacks > 0) {
            if (me.this_card_chases === 0 && me.chases < me.max_chases && !me.this_card_attacked) {
                const id = me.last_card_id;
                const card = swogi[id];
                if (card.is_wood_spirit || card.is_fire_spirit || card.is_earth_spirit || card.is_metal_spirit || card.is_water_spirit) {
                    //this.log(JSON.stringify(card));
                    this.chase();
                    this.reduce_idx_x_by_c(0, "five_elements_heavenly_marrow_rhythm_stacks", 1);
                }
            }
        }
    }
    do_heavenly_marrow_gourd_chase() {
        const me = this.players[0];
        if (me.predicament_for_immortals_stacks > 0
            && me.prevent_anti_chase === 0
        ) {
            return;
        }
        if (me.heavenly_marrow_gourd_stacks > 0) {
            if (me.this_card_chases === 0 && me.chases < me.max_chases) {
                const id = me.last_card_id;
                const card = swogi[id];
                let played_activated_element = false;
                played_activated_element ||= card.is_wood_spirit && me.activate_wood_spirit_stacks > 0;
                played_activated_element ||= card.is_fire_spirit && me.activate_fire_spirit_stacks > 0;
                played_activated_element ||= card.is_earth_spirit && me.activate_earth_spirit_stacks > 0;
                played_activated_element ||= card.is_metal_spirit && me.activate_metal_spirit_stacks > 0;
                played_activated_element ||= card.is_water_spirit && me.activate_water_spirit_stacks > 0;
                if (played_activated_element) {
                    this.chase();
                    this.reduce_idx_x_by_c(0, "heavenly_marrow_gourd_stacks", 1);
                }
            }
        }
    }
    do_wild_crossing_seal_chase() {
        const player = this.players[0];
        if (player.wild_crossing_seal_stacks > 0) {
            if (player.this_card_chases === 0 && player.chases < player.max_chases) {
                this.chase();
                this.reduce_idx_x_by_c(0, "wild_crossing_seal_stacks", 1);
            }
        }
    }
    do_heavenly_marrow_dance_tune_chase() {
        const me = this.players[0];
        if (me.predicament_for_immortals_stacks > 0
            && me.prevent_anti_chase === 0
        ) {
            return;
        }
        if (me.heavenly_marrow_dance_tune_stacks > 0) {
            this.chase();
        }
    }
    do_shadow_owl_rabbit_chase() {
        const me = this.players[0];
        if (me.predicament_for_immortals_stacks > 0
            && me.prevent_anti_chase === 0
        ) {
            return;
        }
        if (me.shadow_owl_rabbit_stacks > 0) {
            this.chase();
        }
    }
    do_shadow_owl_rabbit_lose_hp(action_idx) {
        if (this.players[0].shadow_owl_rabbit_stacks > 0 && action_idx > 0) {
            this.reduce_my_hp(this.players[0].shadow_owl_rabbit_stacks);
        }
    }
    do_octgates_lock_formation(action_idx) {
        if (this.players[0].octgates_lock_formation_stacks > 0 && action_idx > 0) {
            this.deal_damage_inner(8, false, 1);
            this.reduce_idx_x_by_c(0, "octgates_lock_formation_stacks", 1);
        }
    }
    do_devouring_ancient_vine(action_idx) {
        if (this.players[0].devouring_ancient_vine_stacks > 0 && action_idx > 0) {
            this.reduce_idx_hp(0, this.players[0].devouring_ancient_vine_stacks);
            this.increase_idx_hp(1, this.players[0].devouring_ancient_vine_stacks);
        }
    }
    do_void_the_spirit_consumer() {
        let amt = this.players[0].void_the_spirit_consumer_stacks;
        if (amt === 0) {
            return;
        }
        amt = Math.min(amt, this.players[1].qi);
        if (amt === 0) {
            return;
        }
        this.reduce_idx_x_by_c(1, "qi", amt);
        this.increase_idx_qi(0, amt);
    }
    do_finishing_touch(card_idx) {
        if (this.players[0].finishing_touch_stacks > 0) {
            if (this.try_upgrade_card(0, card_idx)) {
                this.reduce_idx_x_by_c(0, "finishing_touch_stacks", 1);
            }
        }
    }
    do_kongtong_seal(card_idx) {
        if (this.players[0].kongtong_seal_stacks > 0) {
            if (this.try_upgrade_card(0, card_idx)) {
                this.reduce_idx_x_by_c(0, "kongtong_seal_stacks", 1);
            }
        }
    }
    do_spirit_fusion_pot(card_idx) {
        if (this.players[0].spirit_fusion_pot_stacks > 0) {
            this.reduce_idx_x_by_c(0, "spirit_fusion_pot_stacks", 1);
            if (!this.try_downgrade_card(0, card_idx)) {
                this.add_enemy_c_of_x(9, "max_hp");
                this.add_enemy_c_of_x(9, "hp");
                this.reduce_c_of_x(9, "hp");
                this.reduce_c_of_x(9, "max_hp");
            }
        }
    }
    do_mutual_growth(card_idx) {
        if (this.players[0].mutual_growth_stacks === 0) {
            return;
        }
        const existing_id = this.players[0].cards[card_idx];
        if (!this.cards_have_generating_interaction(this.players[0].last_card_id, existing_id)) {
            return;
        }
        if (this.try_upgrade_card(0, card_idx)) {
            this.reduce_idx_x_by_c(0, "mutual_growth_stacks", 1);
        }
    }
    do_nether_void_canine(card_idx) {
        if (this.players[0].nether_void_canine_stacks > 0) {
            const exising_id = this.players[0].cards[card_idx];
            const existing_upgrade_level = exising_id.substring(exising_id.length-1);
            const new_id = "60101" + existing_upgrade_level;
            this.log("Nether Void Canine is replacing " + format_card(exising_id) + " with " + format_card(new_id));
            this.players[0].cards[card_idx] = new_id;
            this.reduce_idx_x_by_c(0, "nether_void_canine_stacks", 1);
        }
    }
    do_sword_in_sheathed() {
        if (this.players[0].sword_in_sheathed_stacks > 0) {
            if (!this.players[0].this_turn_attacked) {
                for (let i=0; i<this.players[0].sword_in_sheathed_stacks; i++) {
                    this.add_c_of_x(3, "def");
                }
            }
        }
    }
    do_anthomania_formation() {
        if (this.players[0].anthomania_formation_stacks > 0) {
            this.increase_idx_debuff(1, "decrease_atk", 1);
            const amt = this.players[1].decrease_atk;
            this.reduce_idx_hp(1, amt);
            this.increase_idx_hp(0, amt);
            this.reduce_idx_x_by_c(0, "anthomania_formation_stacks", 1);
        }
    }
    do_motionless_tutelary_formation(action_idx) {
        if (this.players[0].motionless_tutelary_formation_stacks > 0) {
            this.increase_idx_def(0, 7);
            if (action_idx === 1 || action_idx === 9999) {
                this.increase_idx_max_hp(0, 7);
                this.heal(7);
            }
            this.reduce_idx_x_by_c(0, "motionless_tutelary_formation_stacks", 1);
        }
    }
    do_scutturtle_formation() {
        if (this.players[0].scutturtle_formation_stacks > 0) {
            this.increase_idx_def(0, 3);
            this.reduce_idx_x_by_c(0, "scutturtle_formation_stacks", 1);
        }
    }
    do_thunderphilia_formation() {
        if (this.players[0].thunderphilia_formation_stacks > 0) {
            this.deal_damage(4);
            this.reduce_idx_x_by_c(0, "thunderphilia_formation_stacks", 1);
        }
    }
    do_hard_bamboo() {
        if (this.players[0].hard_bamboo_stacks > 0) {
            const dmg_per_stack = Math.floor(this.players[0].def / 4);
            const dmg = dmg_per_stack * this.players[0].hard_bamboo_stacks;
            this.deal_damage(dmg);
        }
    }
    do_force_of_water() {
        if (this.players[0].force_of_water > 0) {
            this.deal_damage(this.players[0].force_of_water);
        }
    }
    do_toxin_immunity() {
        const cap = this.players[0].toxin_immunity_stacks;
        if (cap === 0) {
            return;
        }
        const count = this.get_debuff_count(0);
        const amt = Math.min(count, cap);
        this.heal(amt);
    }
    do_fire_flame_blade() {
        for (let i=0; i<this.players[0].fire_flame_blade_stacks; i++) {
            this.reduce_enemy_c_of_x(1, "max_hp");
        }
    }
    do_drift_ice_blade() {
        for (let i = 0; i<this.players[0].drift_ice_blade_stacks; i++) {
            let amt = 1;
            if (this.players[0].def === 0) {
                amt *= 2;
            }
            this.increase_idx_def(0, amt);
        }
    }
    do_heavenly_spirit_forceage_formation() {
        if (this.players[0].heavenly_spirit_forceage_formation_stacks > 0) {
            this.reduce_idx_x_by_c(0, "heavenly_spirit_forceage_formation_stacks", 1);
            this.add_c_of_x(1, "increase_atk");
        }
    }
    do_cacopoisonous_formation() {
        if (this.players[0].cacopoisonous_formation_stacks > 0) {
            this.reduce_idx_x_by_c(0, "cacopoisonous_formation_stacks", 1);
            this.add_enemy_c_of_x(1, "internal_injury");
        }
    }
    do_spiritage_formation() {
        if (this.players[0].spiritage_formation_stacks > 0) {
            this.reduce_idx_x_by_c(0, "spiritage_formation_stacks", 1);
            this.add_c_of_x(2, "qi");
        }
    }
    do_skip_next_card() {
        const me = this.players[0];
        if (me.skip_to_previous_card_stacks > 0) {
            me.card_play_direction *= -1;
            while (me.skip_to_previous_card_stacks > 0) {
                me.skip_to_previous_card_stacks -= 1;
                this.advance_next_card_index();
            }
            me.card_play_direction *= -1;
        }
        while (me.skip_next_card_stacks > 0) {
            me.skip_next_card_stacks -= 1;
            this.advance_next_card_index();
        }
        const jump_amt = me.astral_move_jump_stacks;
        if (jump_amt > 0) {
            this.reduce_idx_x_by_c(0, "astral_move_jump_stacks", jump_amt);
            let idx_to_which_to_skip = me.next_card_index;
            let found = false;
            for (let i=0; i < jump_amt; i++) {
                const card_id = me.cards[idx_to_which_to_skip];
                if (is_astral_move(card_id)) {
                    found = true;
                    break;
                }
                idx_to_which_to_skip = this.get_next_playable_idx(idx_to_which_to_skip);
            }
            if (found) {
                while (me.next_card_index !== idx_to_which_to_skip) {
                    this.do_opening(me.next_card_index);
                    this.advance_next_card_index();
                }
            }
        };
        while (me.fate_reincarnates_stacks > 0 &&
                (me.next_card_index === 3 || me.next_card_index === 4)) {
            this.reduce_idx_x_by_c(0, "fate_reincarnates_stacks", 1);
            this.do_opening(me.next_card_index);
            this.advance_next_card_index();
        }
    }
    sim_turn() {
        const me = this.players[0];
        const enemy = this.players[1];
        me.chases = 0;
        me.this_turn_attacked = false;
        me.elusive_footwork_triggered = false;
        me.styx_night_footwork_triggered = false;
        enemy.styx_night_footwork_triggered = false;
        me.triggered_beast_spirit_sword_formation = false;
        me.can_trigger_resonance_cat_paw = true;
        this.reduce_idx_x_by_c(0, "metal_spirit_iron_bone_stacks", 1);
        this.reduce_idx_x_by_c(0, "water_spirit_dive_stacks", 1);
        this.reduce_idx_x_by_c(0, "everything_goes_way_stacks", 1);
        this.reduce_idx_x_by_c(0, "god_opportunity_conform_stacks", 1);
        this.reduce_idx_x_by_c(0, "god_opportunity_reversal_stacks", 1);
        this.do_resonance_rejuvenation();
        me.xuanming_recurring_hp = me.hp;
        this.do_def_decay();
        this.do_fat_immortal_raccoon();
        this.do_scarlet_eye_the_sky_consumer();
        this.do_break_sky_eagle();
        this.do_void_the_spirit_consumer();
        this.do_spirit_gather_citta_dharma();
        this.do_apex_sword_citta_dharma();
        this.do_next_turn_def();
        this.do_meditation_of_xuan();
        this.do_regen();
        this.do_heartbroken_tune();
        this.do_internal_injury(0, true);
        this.do_illusion_tune();
        this.do_heavenly_spirit_forceage_formation();
        this.do_cacopoisonous_formation();
        this.do_spiritage_formation();
        this.do_ultimate_hexagram_base();
        this.do_qi_gathering_merpeople_pearl();
        this.do_ultimate_polaris_hexagram_base();
        this.do_water_spirit_spring_rain();
        this.do_wood_spirit_all_things_grow();
        this.do_nuwa_stone();
        if (this.check_for_death()) {
            return;
        }
        let action_idx = 0;
        let can_act = true;
        if (me.cannot_act_stacks > 0) {
            this.reduce_idx_x_by_c(0, "cannot_act_stacks", 1);
            can_act = false;
        }
        while (action_idx <= me.chases && action_idx <= me.max_chases && can_act) {
            me.just_revived = false;
            this.do_shadow_owl_rabbit_lose_hp(action_idx);
            this.do_octgates_lock_formation(action_idx);
            this.do_devouring_ancient_vine(action_idx);
            if (this.check_for_death()) {
                return;
            }
            if (action_idx > 0) {
                this.log("chase!!");
            }
            action_idx += 1;
            if (!this.can_play_a_card()) {
                this.log("can't play any card :( converting slot 0 to normal");
                me.can_play[0] = true;
                me.next_card_index = 0;
                me.cards[0] = "601011";
            }
            this.do_skip_next_card();
            while (me.skip_one_play[me.next_card_index]) {
                me.skip_one_play[me.next_card_index] = false;
                this.advance_next_card_index();
                this.do_skip_next_card();
            }
            let card_id = me.cards[me.next_card_index];
            let card = swogi[card_id];
            let qi_cost = card.qi_cost;
            // TODO: ths has to get reworked for chengyun's fusion style.
            if (card.decrease_qi_cost_by_x !== undefined) {
                let x = card.decrease_qi_cost_by_x;
                let reduce_amt = 0;
                if (x === "food") {
                    reduce_amt = me.internal_injury +
                                me.indigestion +
                                me.appetite +
                                me.regen;
                } else
                if (x === "debuff") {
                    reduce_amt = this.get_debuff_count(0);
                } else {
                    reduce_amt = me[x];
                }
                if (reduce_amt) {
                    qi_cost = Math.max(0, qi_cost - reduce_amt);
                }
            }
            if (card.water_spirit_cost_0_qi && this.if_water_spirit()) {
                qi_cost = 0;
            }
            if (me.is_star_point[me.next_card_index]) {
                qi_cost = Math.max(0, qi_cost - me.reduce_qi_cost_on_star_point_stacks);
            }
            qi_cost = Math.max(0, qi_cost - me.inspiration_stacks);
            let hp_cost = card.hp_cost;
            const orig_hp_cost = hp_cost;
            if (hp_cost === 4) {
                if (card.name === "Mountain Cleaving Palms") {
                    let reduce_amt = Math.floor(me.physique / 2);
                    hp_cost = Math.max(0, hp_cost - reduce_amt);
                }
            }
            if (me.unbounded_qi_stacks > 0) {
                if (me.qi < qi_cost) {
                    const excess_qi = qi_cost - me.qi;
                    if (me.physique >= excess_qi && me.hp >= 3 * excess_qi) {
                        qi_cost -= excess_qi;
                        let unbounded_qi_hp_cost = 3 * excess_qi;
                        let unbounded_qi_physique_cost = excess_qi;
                        this.log("player 0 is spending " + unbounded_qi_hp_cost + " hp and " + unbounded_qi_physique_cost + " physique to play " + format_card(card_id));
                        this.reduce_idx_hp(0, unbounded_qi_hp_cost, true);
                        this.reduce_idx_x_by_c(0, "physique", unbounded_qi_physique_cost);
                    }
                }
            }
            if (me.qi < qi_cost) {
                this.gain_qi_to_afford_card(card.gather_qi);
                this.log("player 0 gained qi instead of playing " + format_card(card_id) + ". They now have " + me.qi + "/" + qi_cost + " qi");
            } else {
                me.inspiration_stacks = 0;
                if (qi_cost > 0) {
                    this.reduce_idx_x_by_c(0, "qi", qi_cost);
                    this.log("player 0 spent " + qi_cost + " qi to play " + format_card(card_id));
                }
                if (hp_cost !== undefined) {
                    if (hp_cost > 0) {
                        if (me.cracking_fist_stacks > 0) {
                            this.reduce_idx_max_hp(0, hp_cost);
                        } else
                        {
                            this.reduce_idx_hp(0, hp_cost, true);
                        }
                    }
                    this.log("player 0 spent " + hp_cost + " hp to play " + format_card(card_id));
                    // bounce is consumed by spending 0 hp to play mountain cleaving palms
                    // but it is not used when paying hp via unbounded qi
                    let refund_hp = false;
                    refund_hp ||= me.crash_fist_bounce_stacks > 0;
                    refund_hp ||= me.crash_fist_return_to_xuan_stacks > 0;
                    if (refund_hp) {
                        if (this.is_crash_fist(card_id)) {
                            if (me.crash_fist_bounce_stacks > 0) {
                                this.heal(hp_cost);
                                this.log("player 0 healed " + hp_cost + " hp from crash fist bounce");
                                if (swogi[card_id].name !== "Crash Fist - Continue")
                                {
                                    me.crash_fist_bounce_stacks = 0;
                                }
                            }
                            if (me.crash_fist_return_to_xuan_stacks > 0) {
                                this.heal(hp_cost);
                                this.log("player 0 healed " + hp_cost + " hp from crash fist return to xuan");
                            }
                        }
                    }
                }
                if (hp_cost === undefined && qi_cost === 0) {
                    this.log("player 0 is playing " + format_card(card_id));
                }
                const card_idx = me.next_card_index;
                this.do_finishing_touch(card_idx);
                this.do_salted_egg_yolk_zongzi(card_idx);
                this.do_mutual_growth(card_idx);
                this.do_nether_void_canine(card_idx);
                this.do_kongtong_seal(card_idx);
                this.do_spirit_fusion_pot(card_idx);
                card_id = me.cards[card_idx];
                this.play_card(card_id, card_idx);
                if (this.check_for_death()) {
                    return;
                }
                this.log("player 0 finished playing " + card.name);
                this.advance_next_card_index();
                this.do_heavenly_marrow_dance_tune_chase();
                this.do_shadow_owl_rabbit_chase();
                this.do_five_elements_heavenly_marrow_rhythm_chase();
                this.do_heavenly_marrow_gourd_chase();
                this.process_this_card_chases();
            }
        }
        if (this.check_for_death()) {
            return;
        }
        this.do_regen_tune();
        this.do_toxin_immunity();
        this.do_three_tailed_cat();
        this.do_sword_in_sheathed();
        this.do_anthomania_formation();
        this.do_motionless_tutelary_formation(action_idx);
        this.do_scutturtle_formation();
        this.do_thunderphilia_formation();
        this.do_force_of_water();
        this.do_hard_bamboo();
        this.do_xuanming_regen_tune();
        this.do_thunderbolt_tune();
        this.do_resonance_sword_formation_guard();
        this.reduce_idx_x_by_c(0, "entangle", 1);
        this.reduce_idx_x_by_c(0, "flaw", 1);
        this.reduce_idx_x_by_c(0, "weaken", 1);
        this.reduce_idx_x_by_c(0, "metal_spirit_chokehold_stacks", 1);
        if (this.check_for_death()) {
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
        const me = this.players[idx];
        const reduced_amt = Math.min(amt, me.def);
        me.def_lost += reduced_amt;
        me.def -= reduced_amt;
        this.log("reduced player " + idx + " def by " + reduced_amt + " to " + me.def);
        if (me.earth_spirit_cliff_stacks > 0) {
            this.reduce_idx_x_by_c(idx, "earth_spirit_cliff_stacks", 1);
            this.deal_damage_inner(reduced_amt, false, idx);
        }
        if (me.earth_spirit_combine_world_stacks > 0) {
            this.reduce_idx_x_by_c(idx, "earth_spirit_combine_world_stacks", 1);
            this.increase_idx_def(idx, reduced_amt);
        }
    }
    reduce_idx_hp(idx, dmg, is_cost, ignore_guard_up) {
        if (dmg < 0) {
            this.log("error: dmg is negative: " + dmg);
            this.crash();
        }
        if (dmg === 0) {
            return 0;
        }
        const me = this.players[idx];
        const use_guard_up = (me.guard_up > 0 && !is_cost
            && !ignore_guard_up
        );
        if (use_guard_up) {
            me.guard_up -= 1;
            this.log("prevented " + dmg + " damage to hp with guard up. " + me.guard_up + " guard up remaining");
            return 0;
        }
        if (me.covert_shift_stacks > 0 && !is_cost) {
            me.covert_shift_stacks -= 1;
            this.log("reversed " + dmg + " damage to hp with covert shift. " + me.covert_shift_stacks + " covert shift remaining");
            this.increase_idx_hp(idx, dmg);
            return 0;
        }
        if (me.leaf_shield_flower_stacks > 0 && !is_cost) {
            let dmg_to_def = Math.floor(dmg / 2);
            dmg_to_def = Math.min(dmg_to_def, me.def);
            this.reduce_idx_def(idx, dmg_to_def);
            dmg -= dmg_to_def;
        }
        me.hp_lost += dmg;
        me.hp -= dmg;
        this.log("reduced player " + idx +" hp by " + dmg + " to " + me.hp);
        if (me.hp <= 0 && me.pangu_axe_stacks > 0) {
            this.log("pangu axe: reduced player " + idx + " destiny by " + me.pangu_axe_stacks + " to " + me.destiny);
            me.destiny -= me.pangu_axe_stacks;
            me.pangu_axe_stacks = 0;
        }
        if (me.elusive_footwork_stacks > 0 && idx === 0 && !me.elusive_footwork_triggered) {
            me.elusive_footwork_triggered = true;
            this.add_c_of_x(1, "qi");
            this.add_c_of_x(1, "agility");
        }
        if (me.styx_night_footwork_stacks > 0 && !me.styx_night_footwork_triggered) {
            me.styx_night_footwork_triggered = true;
            this.increase_idx_qi(idx, 1);
            this.increase_idx_x_by_c(idx, "agility", 1);
        }
        if (me.bad_omen_stacks > 0) {
            this.reduce_idx_x_by_c(idx, "bad_omen_stacks", 1);
            this.increase_idx_debuff(idx, "wound", 1);
        }
        for (let i=0; i<me.birdie_wind_stacks; i++) {
            this.increase_idx_def(idx, 1);
        }
        if (me.frozen_snow_lotus_stacks > 0) {
            this.reduce_idx_x_by_c(idx, "frozen_snow_lotus_stacks", 1);
            this.increase_idx_def(idx, dmg);
        }
        if (me.xuanming_forceage_formation_stacks > 0) {
            this.reduce_idx_x_by_c(idx, "xuanming_forceage_formation_stacks", 1);
            this.increase_idx_x_by_c(idx, "increase_atk", 1);
        }
        return dmg;
    }
    reduce_idx_max_hp(idx, amt) {
        if (amt < 0) {
            this.log("error: amt is negative: " + amt);
            this.crash();
        }
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        if (!me.flame_soul_rebirth_reviving)
        {
            amt += this.players[1-idx].kun_wu_molten_ring_stacks;
        }
        const reduced_amt = Math.min(amt, me.max_hp);
        me.max_hp -= reduced_amt;
        me.max_hp_lost += reduced_amt;
        if (me.hp > me.max_hp) {
            this.log("reducing hp to max_hp of " + me.max_hp);
            me.hp = me.max_hp;
        }
        if (me.hp <= 0 && me.pangu_axe_stacks > 0) {
            this.log("pangu axe: reduced player " + idx + " destiny by " + me.pangu_axe_stacks + " to " + me.destiny);
            me.destiny -= me.pangu_axe_stacks;
            me.pangu_axe_stacks = 0;
        }
        this.log("reduced player " + idx + " max_hp by " + amt + " to " + me.max_hp);
    }
    reduce_idx_force(idx, amt) {
        if (amt < 0) {
            this.log("error: amt is negative: " + amt);
            this.crash();
        }
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        if (me.force === 0) {
            return;
        }
        const reduced_amt = Math.min(amt, me.force);
        me.force -= reduced_amt;
        if (me.overwhelming_power_stacks > 0) {
            const dmg = me.overwhelming_power_stacks * reduced_amt;
            this.deal_damage_inner(dmg, false, idx);
        }
        this.log("reduced player " + idx + " force by " + reduced_amt + " to " + me.force);
        if (me.force === 0) {
            const endless_force_stacks = me.endless_force_stacks;
            if (endless_force_stacks > 0) {
                this.increase_idx_force(idx, endless_force_stacks);
            }
        }
    }
    increase_idx_max_hp(idx, amt) {
        if (amt === 0) {
            return 0;
        }
        const me = this.players[idx];
        if (!me.flame_soul_rebirth_reviving)
        {
            if (me.god_opportunity_conform_stacks > 0) {
                amt = Math.ceil(amt * 14 / 10);
            }
        }
        me.max_hp += amt;
        this.log("increased player " + idx + " max_hp by " + amt + " to " + me.max_hp);
    }
    increase_idx_hp(idx, amt, heal_while_dead) {
        const me = this.players[idx];
        if (amt === 0) {
            return 0;
        }
        amt = amt - me.indigestion;
        amt = amt + me.appetite;
        if (amt <= 0) {
            amt = 1;
        }
        const prev_hp = me.hp;
        if (prev_hp <= 0 && !heal_while_dead) {
            this.log("refusing to heal a dead player");
            return 0;
        }
        if (me.metal_spirit_chokehold_stacks > 0) {
            this.log("refusing to heal a player with metal_spirit_chokehold_stacks");
            return 0;
        }
        for (let i=0; i<me.p2_rejuvenation_stacks; i++) {
            this.increase_idx_max_hp(idx, 3);
        }
        for (let i=0; i<me.p3_rejuvenation_stacks; i++) {
            this.increase_idx_max_hp(idx, 4);
        }
        for (let i=0; i<me.p4_rejuvenation_stacks; i++) {
            this.increase_idx_max_hp(idx, 5);
        }
        for (let i=0; i<me.p5_rejuvenation_stacks; i++) {
            this.increase_idx_max_hp(idx, 6);
        }
        if (!me.flame_soul_rebirth_reviving)
        {
            if (me.god_opportunity_conform_stacks > 0) {
                amt = Math.ceil(amt * 14 / 10);
            }
        }
        if (me.god_opportunity_reversal_stacks > 0) {
            const dmg_amt = Math.ceil(amt * 6 / 10);
            this.deal_damage_inner(dmg_amt, false, idx);
        }
        if (me.wild_crossing_seal_stacks > 0 && idx === 0) {
            this.do_wild_crossing_seal_chase();
        }
        me.hp += amt;
        me.hp_gained += amt;
        if (me.hp > me.max_hp) {
            if (me.vitality_blossom_stacks > 0) {
                const exccess_hp = me.hp - me.max_hp;
                this.increase_idx_max_hp(idx, exccess_hp);
            }
            if (me.hp > me.max_hp)
            {
                me.hp = me.max_hp;
            }
        }
        if (prev_hp !== me.hp) {
            for (let i=0; i<me.birdie_wind_stacks; i++) {
                this.increase_idx_def(idx, 1);
            }
        }
        this.log("healed " + amt + " hp. Went from " + prev_hp + " to " + me.hp);
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
        const me = this.players[idx];
        if (amt === 0) {
            return;
        }
        amt += me.kun_wu_metal_ring_stacks;
        amt += me.kun_wu_molten_ring_stacks;
        if (me.god_opportunity_conform_stacks > 0) {
            amt = Math.ceil(amt * 14 / 10);
        }
        if (me.god_opportunity_reversal_stacks > 0) {
            const dmg_amt = Math.ceil(amt * 6 / 10);
            this.deal_damage_inner(dmg_amt, false, idx);
        }
        me.def += amt;
        this.log("gained " + amt + " def. Now have " + me.def + " def");
    }
    increase_idx_penetrate(idx, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        amt += me.kun_wu_metal_ring_stacks;
        me.penetrate += amt;
        this.log("gained " + amt + " penetrate. Now have " + me.penetrate + " penetrate");
    }
    increase_idx_qi(idx, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        if (me.mortal_body_stacks > 0) {
            this.increase_idx_physique(idx, amt);
            return;
        }
        if (me.mixed_grain_zongzi_stacks > 0) {
            amt += 1;
            this.increase_idx_hp(idx, me.mixed_grain_zongzi_stacks);
        }
        if (me.colorful_spirit_crane_stacks > 0) {
            amt *= 2;
        }
        if (me.stillness_citta_dharma_stacks > 0) {
            this.increase_idx_hp(idx, amt * me.stillness_citta_dharma_stacks);
        }
        if (me.spiritual_divination_stacks > 0) {
            const hexagram_amt = amt * me.spiritual_divination_stacks;
            this.increase_idx_hexagram(idx, hexagram_amt);
        }
        if (me.wild_crossing_seal_stacks > 0 && idx === 0) {
            this.do_wild_crossing_seal_chase();
        }
        if (me.star_moon_hexagram_fan_stacks > 0) {
            const dmg = amt * me.star_moon_hexagram_fan_stacks;
            this.deal_damage_inner(dmg, false, idx);
        }
        if (me.spiritstat_tune_stacks > 0) {
            this.increade_idx_x_by_c(idx, "def", amt * me.spiritstat_tune_stacks);
        }
        me.qi += amt;
        this.log("gained " + amt + " qi. Now have " + me.qi + " qi");
    }
    increase_idx_force(idx, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        me.force += amt;
        if (me.resonance_full_of_force_stacks > 0 &&
            me.force > me.max_force) {
            me.max_force += 1;
        }
        if (me.force > me.max_force) {
            const excess_amt = me.force - me.max_force;
            me.force = me.max_force;
            this.increase_idx_def(idx, excess_amt);
        }
        if (me.surge_of_qi_stacks > 0 && me.stance_is_fist) {
            this.increase_idx_x_by_c(idx, "agility", 2);
        }
        this.log("gained " + amt + " force. Now have " + me.force + " force");
    }
    increase_idx_activate(idx, x, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        let can_uwf = true;
        if (me.predicament_for_immortals_stacks > 0
            && me.prevent_anti_chase === 0
        ) {
            can_uwf = false;
        }
        if (can_uwf && me.ultimate_world_formation_stacks > 0 && idx === 0
            && me.this_card_chases === 0
            && me.chases < me.max_chases) {
            this.reduce_idx_x_by_c(0, "ultimate_world_formation_stacks", 1);
            this.chase();
        }
        for (let i=0; i < me.five_elements_explosion_stacks; i++) {
            const enemy_idx = 1 - idx;
            this.reduce_idx_hp(enemy_idx, 3, false);
            this.reduce_idx_max_hp(enemy_idx, 3);
        }
        const prev_amt = me[x];
        if (prev_amt === 0 && me.five_elements_anima_stacks > 0) {
            const enemy_idx = 1 - idx;
            switch (x) {
                case "activate_wood_spirit_stacks":
                    this.increase_idx_x_by_c(idx, "increase_atk", 1);
                    break;
                case "activate_fire_spirit_stacks":
                    this.reduce_idx_hp(enemy_idx, 7, false);
                    this.reduce_idx_max_hp(enemy_idx, 7);
                    break;
                case "activate_earth_spirit_stacks":
                    this.increase_idx_def(idx, 12);
                    break;
                case "activate_metal_spirit_stacks":
                    this.increase_idx_penetrate(idx, 4);
                    break;
                case "activate_water_spirit_stacks":
                    this.increase_idx_x_by_c(idx, "force_of_water", 2);
                    break;
            }
        }
        me[x] += amt;
        this.log("gained " + amt + " " + x + ". Now have " + me[x] + " " + x);
    }
    increase_idx_physique(idx, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        const prev = me.physique;
        me.physique += amt;
        me.physique_gained += amt;
        this.log("gained " + amt + " physique. Now have " + me.physique + " physique");
        this.increase_idx_max_hp(idx, amt);
        if (me.mind_body_resonance_stacks > 0) {
            this.increase_idx_def(idx, amt);
        }
        if (me.max_physique < me.physique) {
            let heal_amt = amt;
            if (prev < me.max_physique) {
                heal_amt -= me.max_physique - prev;
            }
            if (me.resonance_firmness_body_stacks > 0) {
                heal_amt *= 2;
            }
            this.increase_idx_hp(idx, heal_amt);
        }
    }
    increase_idx_hexagram(idx, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        me.hexagram += amt;
        if (me.astrology_stacks > 0 && me.star_power === 0) {
            this.increase_idx_star_power(idx, 1);
        }
        if (me.hexagram_formacide_stacks > 0) {
            const dmg = amt * me.hexagram_formacide_stacks;
            this.deal_damage_inner(dmg, false, idx);
        }
        if (me.star_moon_hexagram_fan_stacks > 0) {
            const dmg = amt * me.star_moon_hexagram_fan_stacks;
            this.deal_damage_inner(dmg, false, idx);
        }
        this.log("gained " + amt + " hexagram. Now have " + me.hexagram + " hexagram");
    }
    increase_idx_star_power(idx, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        me.star_power += amt;
        if (me.star_moon_hexagram_fan_stacks > 0) {
            const dmg = amt * me.star_moon_hexagram_fan_stacks;
            this.deal_damage_inner(dmg, false, idx);
        }
        this.log("gained " + amt + " star power. Now have " + me.star_power + " star power");
    }
    increase_idx_debuff(idx, x, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        if (me.fresh_fruit_zongzi_stacks > 0 &&
            (x === "internal_injury" || x === "indigestion")) {
            this.reduce_idx_x_by_c(idx, "fresh_fruit_zongzi_stacks", 1);
            this.increase_idx_x_by_c(idx, "regen", amt);
            return;
        }
        if (x !== "styx")
        {
            amt += me.gain_extra_debuff;
            me.gain_extra_debuff = 0;
        }
        const to_sub = Math.min(amt, me.hexproof);
        if (to_sub > 0) {
            this.reduce_idx_x_by_c(idx, "hexproof", to_sub);
            amt -= to_sub;
        }
        if (amt === 0) {
            return;
        }
        if (me.indomitable_will_stacks > 0) {
            if (me.stance_is_fist) {
                if (x === "wound") {
                    amt -= 1;
                }
            } else {
                if (x === "decrease_atk") {
                    amt -= 1;
                }
            }
        }
        for (let i=0; i<me.unwavering_soul_stacks; i++) {
            this.increase_idx_hp(idx, amt);
        }
        if (x === "styx") {
            if (me.character === "dx3") {
                this.increase_idx_hp(idx, amt * 3);
            } else {
                this.reduce_idx_hp(idx, amt * 3, false);
            }
        }
        me[x] += amt;
        this.log("gained " + amt + " " + x + ". Now have " + me[x] + " " + x);
    }
    increase_idx_x_by_c(idx, x, c) {
        if (c === 0) {
            return;
        }
        const me = this.players[idx];
        if (c < 0) {
            this.log("error: c is negative: " + c);
            this.crash();
        }
        if (x === "hp") {
            return this.increase_idx_hp(idx, c);
        }
        if (x === "max_hp") {
            return this.increase_idx_max_hp(idx, c);
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
        if (x === "physique") {
            return this.increase_idx_physique(idx, c);
        }
        if (is_activate(x)) {
            return this.increase_idx_activate(idx, x, c);
        }
        if (x === "hexagram") {
            return this.increase_idx_hexagram(idx, c);
        }
        if (x === "star_power") {
            return this.increase_idx_star_power(idx, c);
        }
        if (is_debuff(x)) {
            return this.increase_idx_debuff(idx, x, c);
        }
        me[x] += c;
        this.log("gained " + c + " " + x + ". Now have " + me[x] + " " + x);
    }
    reduce_idx_x_by_c(idx, x, c) {
        if (c === 0) {
            return;
        }
        const me = this.players[idx];
        if (x === "hp") {
            return this.reduce_idx_hp(idx, c, false);
        }
        if (x === "def") {
            return this.reduce_idx_def(idx, c);
        }
        if (x === "max_hp") {
            return this.reduce_idx_max_hp(idx, c);
        }
        if (x === "force") {
            return this.reduce_idx_force(idx, c);
        }
        if (c < 0) {
            this.log("error: c is negative: " + c);
            this.crash();
        }
        const prev_x = me[x];
        me[x] -= c;
        if (me[x] < 0) {
            me[x] = 0;
        }
        if (prev_x !== me[x] || c !== 1) {
            this.log("lost " + c + " " + x + ". Now have " + me[x] + " " + x);
        }
    }
    deal_damage_inner(dmg, is_atk, my_idx, is_extra) {
        const enemy_idx = 1 - my_idx;
        let ignore_def = false;
        let smash_def = false;
        let pct_multiplier = 100;
        let min_dmg = 1;
        const me = this.players[my_idx];
        const enemy = this.players[enemy_idx];
        if (enemy.metal_spirit_iron_bone_stacks > 0) {
            dmg -= 5;
        }
        if (is_atk) {
            me.this_atk_injured = false;
            if (me.trigger_depth <= 1) {
                me.this_card_directly_attacked = true;
            }
            me.this_trigger_directly_attacked = true;
            me.this_card_attacked = true;
            me.this_turn_attacked = true;
            if (!me.sword_intent_flow_mode && me.sword_intent_flow_stacks > 0) {
                this.reduce_idx_x_by_c(my_idx, "sword_intent_flow_stacks", 1);
                me.sword_intent_flow_mode = true;
            }
            if (me.sword_intent > 0) {
                if (me.sword_intent_flow_mode) {
                    if (me.this_card_sword_intent < me.sword_intent) {
                        this.log("in sword intent flow mode, using " + me.sword_intent + " sword intent without consuming");
                        me.this_card_sword_intent = me.sword_intent;
                    }
                } else
                {
                    this.log("consuming " + me.sword_intent + " sword intent");
                    me.this_card_sword_intent += me.sword_intent;
                    this.reduce_idx_x_by_c(my_idx, "sword_intent", me.sword_intent);
                }
            }
            if (me.is_star_point[me.currently_playing_card_idx]) {
                dmg += (me.star_power
                    * (1 + me.bonus_star_power_multiplier)
                );
            }
            if (me.smash_def > 0) {
                this.reduce_idx_x_by_c(my_idx, "smash_def", 1);
                smash_def = true;
            }
            if (me.fraccide_formation_stacks > 0) {
                this.reduce_idx_x_by_c(my_idx, "fraccide_formation_stacks", 1);
                smash_def = true;
                dmg += 3;
            }
            if (me.leaf_blade_flower_stacks > 0) {
                smash_def = true;
            }
            if (me.this_card_crash_fist_blitz_stacks > 0) {
                smash_def = true;
            }
            if (me.ignore_def > 0) {
                this.reduce_idx_x_by_c(my_idx, "ignore_def", 1);
                ignore_def = true;
                if (me.resonance_coral_sword_stacks > 0) {
                    dmg += 1;
                }
            }
            dmg += this.do_exercise_bones();
            dmg += this.do_star_sky_forge_bone();
            dmg += this.do_lonely_night_wolf();
            dmg += this.do_nothing_is_appropriate();
            dmg += this.do_indomitable_will();
            dmg += me.bonus_atk_amt;
            dmg += (me.this_card_sword_intent
                * (1 + me.bonus_sword_intent_multiplier)
            );
            dmg += me.increase_atk;
            dmg += me.craze_dance_tune_stacks;
            if (!me.ignore_decrease_atk) {
                dmg -= me.decrease_atk;
            }
            me.ignore_decrease_atk = false;
            if (me.majestic_qi_stacks > 0) {
                this.reduce_idx_x_by_c(my_idx, "majestic_qi_stacks", 1);
                this.increase_idx_force(my_idx, 1);
            }
            let force = me.force;
            force += me.bonus_force_amt;
            this.reduce_c_of_x(1, "force");
            pct_multiplier += 10 * force;
            if (me.this_card_crash_fist_inch_force_stacks > 0) {
                pct_multiplier += 10 * force;
            }
            if (enemy.water_spirit_dive_stacks > 0) {
                pct_multiplier -= 40;
            }
            if (me.weaken > 0
                && !me.ignore_weaken
            ) {
                pct_multiplier -= 40;
                if (me.resonance_indomitable_will_stacks > 0 &&
                    !me.stance_is_fist
                ) {
                    pct_multiplier += 20;
                }
            }
            me.ignore_weaken = false;
            if (enemy.flaw > 0) {
                pct_multiplier += 40;
                if (enemy.resonance_indomitable_will_stacks > 0 &&
                    enemy.stance_is_fist
                ) {
                    pct_multiplier -= 20;
                }
            }
            if (is_thunder(me.currently_triggering_card_id)) {
                pct_multiplier += me.thunder_citta_dharma_stacks;
            }
            me.bonus_sword_intent_multiplier = 0;
            me.bonus_star_power_multiplier = 0;
            me.bonus_force_amt = 0;
            if (me.everything_goes_way_stacks > 0) {
                min_dmg = 6;
            }
        }
        dmg = Math.floor(dmg * pct_multiplier / 100);
        dmg = Math.max(min_dmg, dmg);
        let damage_to_def = 0;
        let damage_to_hp = 0;
        if (ignore_def) {
            damage_to_def = 0;
            damage_to_hp = dmg;
        } else
        if (smash_def) {
            const effective_def = Math.floor(enemy.def * .5);
            const pre_multiplied_damage_to_def = Math.min(effective_def, dmg);
            damage_to_def = pre_multiplied_damage_to_def * 2;
            if (enemy.def % 2 === 1 && effective_def < dmg) {
                damage_to_def += 1;
            }
            damage_to_hp = dmg - pre_multiplied_damage_to_def;
        } else
        {
            damage_to_def = Math.min(enemy.def, dmg);
            damage_to_hp = dmg - damage_to_def;
        }
        this.reduce_idx_def(enemy_idx, damage_to_def);
        let ignore_guard_up = false;
        if (is_atk) {
            let can_wound = damage_to_hp > 0;
            let usable_guard_up = enemy.guard_up;
            if (me.ignore_guard_up > 0) {
                ignore_guard_up = true;
                me.ignore_guard_up -= 1;
                usable_guard_up = 0;
            }
            can_wound = can_wound && usable_guard_up === 0;
            can_wound = can_wound && enemy.covert_shift_stacks === 0;
            can_wound = can_wound || me.fire_flame_blade_stacks > 0;
            if (me.disable_penetrate_stacks > 0) {
                me.disable_penetrate_stacks -= 1;
            } else if (me.penetrate > 0) {
                if (can_wound) {
                    this.log("penetrating " + me.penetrate + " damage");
                    damage_to_hp += me.penetrate;
                    this.reduce_c_of_x(me.penetrate, "penetrate");
                }
            }
            if (can_wound) {
                damage_to_hp += enemy.wound;
            }
            if (me.metal_spirit_giant_tripod_stacks > 0) {
                me.metal_spirit_giant_tripod_stacks -= 1;
                if (enemy.covert_shift_stacks === 0) {
                    damage_to_hp *= 2;
                }
            }
        }
        let damage_actually_dealt_to_hp = this.reduce_idx_hp(
            enemy_idx, damage_to_hp, false, ignore_guard_up);
        if (is_atk) {
            me.damage_dealt_to_hp_by_atk = damage_actually_dealt_to_hp;
            me.damage_dealt_to_hp_by_this_card_atk += damage_actually_dealt_to_hp;
            if (me.fire_flame_blade_stacks > 0) {
                me.this_atk_injured = true;
            }
            this.do_water_spirit_spring();
            if (damage_actually_dealt_to_hp > 0) {
                me.this_atk_injured = true;
                if (!is_extra) {
                    this.do_unrestrained_sword_zero();
                }
                this.do_dark_star_bat();
                this.do_resonance_cat_paw();
            }
            if (me.heavenly_will_earth_evil_stacks > 0) {
                this.reduce_idx_x_by_c(0, "heavenly_will_earth_evil_stacks", 1);
                this.increase_idx_def(0, damage_actually_dealt_to_hp);
            }
        }
    }
    deal_damage(dmg) {
        this.deal_damage_inner(dmg, false, 0);
    }
    atk(dmg, is_extra) {
        this.do_drift_ice_blade();
        const me = this.players[0];
        const enemy = this.players[1];
        if (me.apparition_confusion_stacks > 0) {
            this.reduce_my_hp(me.apparition_confusion_stacks);
        }
        if (enemy.repel_citta_dharma_stacks > 0) {
            const repel_dmg = enemy.repel_citta_dharma_stacks;
            this.deal_damage_inner(repel_dmg, false, 1);
        }
        if (me.throw_petals_stacks > 0) {
            const amt = me.throw_petals_stacks;
            this.increase_idx_debuff(1, "internal_injury", amt);
        }
        if (enemy.throw_petals_stacks > 0) {
            const amt = enemy.throw_petals_stacks;
            this.increase_idx_debuff(0, "internal_injury", amt);
        }
        this.do_fire_flame_blade();
        this.deal_damage_inner(dmg, true, 0, is_extra);
    }
    if_cloud_hit() {
        return (this.players[0].cloud_sword_chain_count > 0
            || this.players[0].endurance_as_cloud_sea_stacks > 0
        );
    }
    if_fist_stance() {
        return this.players[0].stance_is_fist;
    }
    if_stick_stance() {
        return !this.players[0].stance_is_fist;
    }
    switch_stance() {
        this.players[0].stance_is_fist = !this.players[0].stance_is_fist;
    }
    if_injured() {
        return this.players[0].this_atk_injured;
    }
    def(amt) {
        this.increase_idx_def(0, amt);
    }
    qi(amt) {
        this.increase_idx_qi(0, amt);
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
        let to_lose = Math.ceil(this.players[0][x] * c / 100);
        to_lose = Math.max(0, to_lose);
        this.reduce_idx_x_by_c(0, y, to_lose);
    }
    for_each_idx_x_add_idx_c_pct_y(idx_a, x, idx_b, c, y) {
        let amt_x = 0;
        if (x === "debuff") {
            amt_x = this.get_debuff_count(idx_a);
        } else {
            amt_x = this.players[idx_a][x];
        }
        const to_gain = Math.floor(amt_x * c / 100);
        this.increase_idx_x_by_c(idx_b, y, to_gain);
    }
    for_each_x_add_c_pct_y(x, c, y) {
        let amt_x = 0;
        if (x === "debuff") {
            amt_x = this.get_debuff_count(0);
        } else {
            amt_x = this.players[0][x];
        }
        const to_gain = Math.floor(amt_x * c / 100);
        this.increase_idx_x_by_c(0, y, to_gain);
    }
    for_each_x_add_c_pct_y_up_to_d(x, c, y, d) {
        const to_gain = Math.min(d, Math.floor(this.players[0][x] * c / 100));
        this.increase_idx_x_by_c(0, y, to_gain);
    }
    for_each_x_add_c_y(x, c, y) {
        let amt_x = 0;
        if (x === "debuff") {
            amt_x = this.get_debuff_count(0);
        } else {
            amt_x = this.players[0][x];
        }
        const to_gain = c * amt_x;
        this.increase_idx_x_by_c(0, y, to_gain);
    }
    for_each_x_add_y(x, y) {
        let amt_x = 0;
        if (x === "debuff") {
            amt_x = this.get_debuff_count(0);
        } else {
            amt_x = this.players[0][x];
        }
        this.increase_idx_x_by_c(0, y, amt_x);
    }
    add_my_x_to_enemy_y(x, y) {
        this.increase_idx_x_by_c(1, y, this.players[0][x]);
    }
    exhaust_x(x) {
        const reduce_amt = this.players[0][x];
        this.reduce_idx_x_by_c(0, x, reduce_amt);
        return reduce_amt;
    }
    exhaust_x_to_add_y(x, y) {
        const reduce_amt = this.players[0][x];
        const gain_amt = reduce_amt;
        this.reduce_idx_x_by_c(0, x, reduce_amt);
        this.increase_idx_x_by_c(0, y, gain_amt);
    }
    exhaust_x_to_add_c_y(x, c, y) {
        const reduce_amt = this.players[0][x];
        const gain_amt = reduce_amt * c;
        this.reduce_idx_x_by_c(0, x, reduce_amt);
        this.increase_idx_x_by_c(0, y, gain_amt);
    }
    heal(amt) {
        this.increase_idx_hp(0, amt);
    }
    next_turn_def(amt) {
        this.increase_idx_x_by_c(0, "next_turn_def", amt);
    }
    chase() {
        this.increase_idx_x_by_c(0, "this_card_chases", 1);
    }
    reduce_enemy_c_of_x(c, x) {
        this.reduce_idx_x_by_c(1, x, c);
    }
    reduce_enemy_x_by_c_pct_enemy_y(x, c, y) {
        const to_lose = Math.ceil(this.players[1][y] * c / 100);
        this.reduce_idx_x_by_c(1, x, to_lose);
    }
    reduce_enemy_x_by_enemy_y(x, y) {
        this.reduce_idx_x_by_c(1, x, this.players[1][y]);
    }
    add_enemy_c_of_x(c, x) {
        this.increase_idx_x_by_c(1, x, c);
    }
    continuous() {
        if (this.players[0].trigger_depth === 1) {
            this.players[0].can_play[this.players[0].currently_playing_card_idx] = false;
            this.players[0].has_played_continuous_card = true;
        }
    }
    consumption() {
        if (this.players[0].trigger_depth === 1) {
            this.players[0].can_play[this.players[0].currently_playing_card_idx] = false;
        }
    }
    add_c_of_x(c, x) {
        this.increase_idx_x_by_c(0, x, c);
    }
    reduce_c_of_x(c, x) {
        this.reduce_idx_x_by_c(0, x, c);
    }
    for_each_x_up_to_c_add_y(x, c, y) {
        let amt_to_add = Math.min(c, this.players[0][x]);
        this.add_c_of_x(amt_to_add, y);
    }
    retrigger_previous_sword_formation() {
        const my_idx = this.players[0].currently_triggering_card_idx;
        const step = -this.players[0].card_play_direction;
        let idx = my_idx + step;
        while (idx >= 0 && idx < this.players[0].cards.length) {
            const card_id = this.players[0].cards[idx];
            if (is_sword_formation(card_id)) {
                this.log("retriggering " + format_card(card_id));
                this.trigger_card(card_id, idx);
                return;
            }
            idx += step;
        }
    }
    retrigger_next_opening(step_multiplier, n_cards, reps_per_card) {
        const my_idx = this.players[0].currently_triggering_card_idx;
        const step = this.players[0].card_play_direction * step_multiplier;
        let idx = my_idx + step;
        while (idx >= 0 && idx < this.players[0].cards.length && n_cards > 0) {
            const card_id = this.players[0].cards[idx];
            const opening = swogi[card_id].opening;
            if (opening !== undefined) {
                n_cards -= 1;
                for (let i=0; i<reps_per_card; i++) {
                    this.do_opening(idx, my_idx);
                }
            }
            idx += step;
        }
    }
    // the reason this wouldn't just use `rep` is that we'd like to
    // detect whether the game outcome actually depends on randomness.
    // in cases where the player has 2 debuffs and this effect clears
    // both, it's not really random - the order doesn't matter.
    reduce_random_debuff_by_c_n_times(c,n) {
        if (n === 0) {
            return;
        }
        let my_debuff_names = [];
        let my_debuff_stack_counts = [];
        let necessary_times = 0;
        const me = this.players[0];
        for (let i=0; i<DEBUFF_NAMES.length; i++) {
            if (me[DEBUFF_NAMES[i]] > 0) {
                my_debuff_names.push(DEBUFF_NAMES[i]);
                my_debuff_stack_counts.push(me[DEBUFF_NAMES[i]]);
                necessary_times += Math.ceil(me[DEBUFF_NAMES[i]] / c);
            }
        }
        if (necessary_times > n && my_debuff_names.length > 1) {
            this.used_randomness = true;
        }
        for (let i=0; i<n; i++) {
            // pick a random debuff we have.
            // reduce it by c
            // if it's 0, remove it from the list of debuffs we have
            if (my_debuff_names.length === 0) {
                break;
            }
            /*
            // if internal injury is active, reduce it by c
            if (me.internal_injury > 0) {
                this.reduce_idx_x_by_c(0, "internal_injury", c);
                // get the index of internal injury
                const debuff_idx = my_debuff_names.indexOf("internal_injury");
                if (me.internal_injury === 0) {
                    my_debuff_names.splice(debuff_idx, 1);
                    my_debuff_stack_counts.splice(debuff_idx, 1);
                }
                continue;
            }
            // if flaw is active, reduce it by c
            if (me.flaw > 0) {
                this.reduce_idx_x_by_c(0, "flaw", c);
                // get the index of flaw
                const debuff_idx = my_debuff_names.indexOf("flaw");
                if (me.flaw === 0) {
                    my_debuff_names.splice(debuff_idx, 1);
                    my_debuff_stack_counts.splice(debuff_idx, 1);
                }
                continue;
            }
            */
            let debuff_idx = Math.floor(Math.random() * my_debuff_names.length);
            let debuff_name = my_debuff_names[debuff_idx];
            this.reduce_idx_x_by_c(0, debuff_name, c);
            if (me[debuff_name] === 0) {
                my_debuff_names.splice(debuff_idx, 1);
                my_debuff_stack_counts.splice(debuff_idx, 1);
            }
        }
    }
    transfer_random_debuff() {
        let my_debuff_names = [];
        const me = this.players[0];
        for (let i=0; i<DEBUFF_NAMES.length; i++) {
            if (me[DEBUFF_NAMES[i]] > 0) {
                my_debuff_names.push(DEBUFF_NAMES[i]);
            }
        }
        if (my_debuff_names.length === 0) {
            return;
        }
        if (my_debuff_names.length > 1) {
            this.used_randomness = true;
        }
        let debuff_idx = Math.floor(Math.random() * my_debuff_names.length);
        let debuff_name = my_debuff_names[debuff_idx];
        this.reduce_idx_x_by_c(0, debuff_name, 1);
        this.increase_idx_debuff(1, debuff_name, 1);
    }
    is_fake_unrestrained_sword(card_id) {
        let ret = false;
        const me = this.players[0];
        ret ||= (me.unrestrained_sword_clear_heart_stacks > 0);
        ret ||= (me.quench_of_sword_heart_unrestrained_stacks > 0 &&
            swogi[card_id].name === "Clear Heart Sword Embryo");
        return ret;
    }
    is_fake_cloud_sword(card_id) {
        let ret = false;
        ret ||= (swogi[card_id].name === "Clear Heart Sword Embryo" &&
            this.players[0].quench_of_sword_heart_cloud_stacks > 0)
        ret ||= (swogi[card_id].marking === "fm" &&
            this.players[0].cloud_sword_endless_stacks > 0);
        return ret;
    }
    ignore_weaken() {
        this.players[0].ignore_weaken = true;
    }
    ignore_decrease_atk() {
        this.players[0].ignore_decrease_atk = true;
    }
    check_for_death() {
        const me = this.players[0];
        const enemy = this.players[1];
        while (me.hp <= 0 ||
            me.destiny <= 0 ||
            enemy.hp <= 0 ||
            enemy.destiny <= 0) {
            this.check_idx_for_death(0);
            this.check_idx_for_death(1);
            if (this.game_over) {
                return true;
            }
        }
        return false;
    }
    check_idx_for_death(idx) {
        const me = this.players[idx];
        if (me.destiny <= 0) {
            me.hp = 0;
            this.game_over = true;
            this.log("player " + idx + " has died of destiny loss");
            return true;
        }
        while (me.hp <= 0) {
            if (me.ashes_phoenix_stacks > 0) {
                const amt = me.ashes_phoenix_stacks;
                this.reduce_idx_x_by_c(idx, "ashes_phoenix_stacks", amt);
                const heal_amt = amt - me.hp;
                this.increase_idx_max_hp(idx, amt);
                this.increase_idx_hp(idx, heal_amt, true);
                me.just_revived = true;
            } else
            if (me.flame_soul_rebirth_stacks > 0) {
                this.reduce_idx_x_by_c(idx, "flame_soul_rebirth_stacks", 1);
                me.flame_soul_rebirth_reviving = true;
                this.set_idx_c_of_x(idx, 15, "max_hp");
                const heal_amt = 15 - me.hp;
                this.increase_idx_hp(idx, heal_amt, true);
                me.flame_soul_rebirth_reviving = false;
                me.just_revived = true;
            } else
            if (me.heavenly_maiden_white_jade_ring_stacks > 0) {
                this.reduce_idx_x_by_c(idx, "heavenly_maiden_white_jade_ring_stacks", 1);
                const heal_amt = 64 - me.hp;
                this.increase_idx_hp(idx, heal_amt, true);
                me.just_revived = true;
            } else
            {
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
    set_idx_c_of_x(idx, c, x) {
        const current_value = this.players[idx][x];
        if (current_value > c) {
            this.reduce_idx_x_by_c(idx, x, current_value - c);
        } else if (current_value < c) {
            this.increase_idx_x_by_c(idx, x, c - current_value);
        }
    }
    trigger_hexagram(idx) {
        if (this.players[idx].hexagram > 0) {
            this.reduce_idx_x_by_c(idx, "hexagram", 1);
            this.increase_idx_x_by_c(idx, "triggered_hexagram_count", 1);
            return true;
        }
        return false;
    }
    rand_range(lo_inclusive, hi_inclusive) {
        if (this.trigger_hexagram(0)) {
            return hi_inclusive;
        }
        this.used_randomness = true;
        const extent = hi_inclusive - lo_inclusive + 1;
        return lo_inclusive + Math.floor(Math.random() * extent);
    }
    do_chord_in_tune_thing() {
        if (this.players[0].has_played_musician_card > 0) {
            this.chase();
            return;
        }
        const next_idx = this.get_next_playable_idx(this.players[0].currently_playing_card_idx);
        const next_id = this.players[0].cards[next_idx];
        if (swogi[next_id].marking === "mu") {
            this.chase();
        }
    }
    trigger_random_sect_card() {
        this.used_randomness = true;
        //TODO: this.
    }
    trigger_random_unrestrained_card() {
        this.used_randomness = true;
        //TODO: this.
    }
    do_endless_crash(upgrade_level) {
        this.used_randomness = true;
        const arr = CRASH_FIST_CARDS[upgrade_level];
        const playing_idx = this.players[0].currently_playing_card_idx;
        for (let i=0; i<5; i++) {
            const crash_idx = Math.floor(Math.random() * arr.length);
            const card_id = arr[crash_idx];
            this.log("triggering " + format_card(card_id));
            this.trigger_card(card_id, playing_idx);
        }
    }
    do_clear_heart() {
        const ult = (0
            + this.players[0].quench_of_sword_heart_ultimate_stacks
        );
        let first_atk_damage = 6 + Math.min(this.players[0].round_number, 19);
        first_atk_damage += 3 * this.players[0].blade_forging_sharpness_stacks;
        first_atk_damage -= 3 * this.players[0].blade_forging_stable_stacks;
        first_atk_damage -= 1 * this.players[0].sword_pattern_carving_intense_stacks;
        first_atk_damage += 3 * this.players[0].quench_of_sword_heart_unrestrained_stacks;
        first_atk_damage -= 8 * this.players[0].quench_of_sword_heart_cloud_stacks;
        first_atk_damage += ult;
        // do the first atk
        this.atk(first_atk_damage);
        // gain def from blade_forging_stable
        const blade_forging_stable_def = 8 + ult;
        for (let i=0; i<this.players[0].blade_forging_stable_stacks; i++) {
            this.increase_idx_def(0, blade_forging_stable_def);
        }
        // attack for chain_attack
        const chain_attack_atk = 5 + ult;
        for (let i=0; i<this.players[0].sword_pattern_carving_chain_attack_stacks; i++) {
            this.atk(chain_attack_atk);
        }
        // gain increase_atk from charge
        const charge_increase_atk = 1 + ult;
        for (let i=0; i<this.players[0].sword_pattern_carving_charge_stacks; i++) {
            this.increase_idx_x_by_c(0, "increase_atk", charge_increase_atk);
        }
        // gain sword_intent from intense
        const intense_sword_intent = 4 + ult;
        for (let i=0; i<this.players[0].sword_pattern_carving_intense_stacks; i++) {
            this.increase_idx_x_by_c(0, "sword_intent", intense_sword_intent);
        }
        // gain qi from spiritage
        const spiritage_qi = 2 + ult;
        for (let i=0; i<this.players[0].qi_forging_spiritage_stacks; i++) {
            this.increase_idx_qi(0, spiritage_qi);
        }
        // gain def from spiritstat
        const spiritstat_def = 3 + ult;
        for (let i=0; i<this.players[0].qi_forging_spiritstat_stacks; i++) {
            this.for_each_x_add_c_y("qi", spiritstat_def, "def");
        }
        // pay qi to make attacks from spiritual_power
        const spiritual_power_qi_cost = 1 + ult;
        const spiritual_power_rep = 2 + ult;
        const spiritual_power_atk = 4 + ult;
        for (let i=0; i<this.players[0].qi_forging_spiritual_power_stacks; i++) {
            if (this.players[0].qi >= spiritual_power_qi_cost) {
                this.reduce_c_of_x(spiritual_power_qi_cost, "qi");
                for (let j=0; j<spiritual_power_rep; j++) {
                    this.atk(spiritual_power_atk);
                }
            }
        }
        // next card counts as unrestrained sword if we picked unrestrained
        if (this.players[0].quench_of_sword_heart_unrestrained_stacks > 0) {
            this.players[0].unrestrained_sword_clear_heart_stacks += this.players[0].quench_of_sword_heart_unrestrained_stacks + 1;
        }
        // next cloud sword chases if we picked cloud
        this.players[0].cloud_sword_clear_heart_stacks += this.players[0].quench_of_sword_heart_cloud_stacks;
    }
    do_clear_heart_sword_formation(first_atk_damage) {
        const first_def_amt = first_atk_damage;
        first_atk_damage += 3 * this.players[0].blade_forging_sharpness_stacks;
        first_atk_damage -= 3 * this.players[0].blade_forging_stable_stacks;
        first_atk_damage -= 1 * this.players[0].sword_pattern_carving_intense_stacks;
        // do the first atk
        this.atk(first_atk_damage);
        this.increase_idx_def(0, first_def_amt);
        // gain def from blade_forging_stable
        const blade_forging_stable_def = 8;
        for (let i=0; i<this.players[0].blade_forging_stable_stacks; i++) {
            this.increase_idx_def(0, blade_forging_stable_def);
        }
        // attack for chain_attack
        const chain_attack_atk = 5;
        for (let i=0; i<this.players[0].sword_pattern_carving_chain_attack_stacks; i++) {
            this.atk(chain_attack_atk);
        }
        // gain increase_atk from charge
        const charge_increase_atk = 1;
        for (let i=0; i<this.players[0].sword_pattern_carving_charge_stacks; i++) {
            this.increase_idx_x_by_c(0, "increase_atk", charge_increase_atk);
        }
        // gain sword_intent from intense
        const intense_sword_intent = 4;
        for (let i=0; i<this.players[0].sword_pattern_carving_intense_stacks; i++) {
            this.increase_idx_x_by_c(0, "sword_intent", intense_sword_intent);
        }
        // gain qi from spiritage
        const spiritage_qi = 2;
        for (let i=0; i<this.players[0].qi_forging_spiritage_stacks; i++) {
            this.increase_idx_qi(0, spiritage_qi);
        }
        // gain def from spiritstat
        const spiritstat_def = 3;
        for (let i=0; i<this.players[0].qi_forging_spiritstat_stacks; i++) {
            this.for_each_x_add_c_y("qi", spiritstat_def, "def");
        }
        // pay qi to make attacks from spiritual_power
        const spiritual_power_qi_cost = 1;
        const spiritual_power_rep = 2;
        const spiritual_power_atk = 4;
        for (let i=0; i<this.players[0].qi_forging_spiritual_power_stacks; i++) {
            if (this.players[0].qi >= spiritual_power_qi_cost) {
                this.reduce_c_of_x(spiritual_power_qi_cost, "qi");
                for (let j=0; j<spiritual_power_rep; j++) {
                    this.atk(spiritual_power_atk);
                }
            }
        }
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
    if_wood_spirit() {
        const me = this.players[0];
        if (me.activate_wood_spirit_stacks > 0) {
            return true;
        }
        const card_id = me.last_card_id;
        const card = swogi[card_id];
        return card.is_wood_spirit || this.cards_have_generating_interaction(card_id, "131011");
    }
    if_fire_spirit() {
        const me = this.players[0];
        if (me.activate_fire_spirit_stacks > 0) {
            return true;
        }
        const card_id = me.last_card_id;
        const card = swogi[card_id];
        return card.is_fire_spirit || this.cards_have_generating_interaction(card_id, "131031");
    }
    if_earth_spirit() {
        const me = this.players[0];
        if (me.activate_earth_spirit_stacks > 0) {
            return true;
        }
        const card_id = me.last_card_id;
        const card = swogi[card_id];
        return card.is_earth_spirit || this.cards_have_generating_interaction(card_id, "131051");
    }
    if_metal_spirit() {
        const me = this.players[0];
        if (me.activate_metal_spirit_stacks > 0) {
            return true;
        }
        const card_id = me.last_card_id;
        const card = swogi[card_id];
        return card.is_metal_spirit || this.cards_have_generating_interaction(card_id, "131071");
    }
    if_water_spirit() {
        const me = this.players[0];
        if (me.activate_water_spirit_stacks > 0) {
            return true;
        }
        const card_id = me.last_card_id;
        const card = swogi[card_id];
        return card.is_water_spirit || this.cards_have_generating_interaction(card_id, "131091");
    }
    do_earth_spirit_landslide(base_atk, def_multiplier) {
        let atk = base_atk;
        if (this.if_earth_spirit()) {
            const def_reduction = Math.ceil(this.players[0].def * 0.5);
            atk += def_reduction * def_multiplier;
            this.log("landslide: " + def_reduction + " def reduction");
            this.reduce_c_of_x(def_reduction, "def");
        }
        this.atk(atk);
    }
    if_played_continuous() {
        return this.players[0].has_played_continuous_card;
    }
    do_ultimate_world_formation(chases) {
        let has_wood_spirit_card = false;
        let has_fire_spirit_card = false;
        let has_earth_spirit_card = false;
        let has_metal_spirit_card = false;
        let has_water_spirit_card = false;
        const me = this.players[0];
        for (let i=0; i<me.cards.length; i++) {
            const card_id = me.cards[i];
            const card = swogi[card_id];
            has_wood_spirit_card |= card.is_wood_spirit;
            has_fire_spirit_card |= card.is_fire_spirit;
            has_earth_spirit_card |= card.is_earth_spirit;
            has_metal_spirit_card |= card.is_metal_spirit;
            has_water_spirit_card |= card.is_water_spirit;
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
        this.increase_idx_x_by_c(0, "ultimate_world_formation_stacks", chases);
    }
    if_star_point() {
        const me = this.players[0];
        return me.is_star_point[me.currently_playing_card_idx];
    }
    do_polaris_citta_dharma(star_power) {
        if (this.players[0].currently_playing_card_idx === 0) {
            star_power += 1;
        }
        this.increase_idx_star_power(0, star_power);
        for (let i = 0; i < this.players[0].is_star_point.length; i++) {
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
    if_c_pct(c) {
        if (this.trigger_hexagram(0)) {
            return true;
        }
        this.used_randomness = true;
        return Math.random() < c / 100;
    }
    do_fire_spirit_blazing_praerie(amt) {
        const desired_max_hp = this.players[1].hp - amt;
        const reduce_amt = Math.max(0, this.players[1].max_hp - desired_max_hp);
        this.reduce_idx_max_hp(1, reduce_amt);
    }
    for_each_x_reduce_enemy_c_y(x, c, y) {
        let to_lose = this.players[0][x] * c;
        this.reduce_enemy_c_of_x(to_lose, y);
    }
    if_post_action() {
        let can_post_action = false;
        if (this.players[0].can_post_action[this.players[0].currently_playing_card_idx]) {
            can_post_action = true;
        }
        else if (this.players[0].preemptive_strike_stacks > 0) {
            can_post_action = true;
        }
        else if (this.players[0].act_underhand_stacks > 0) {
            can_post_action = this.if_c_pct(1);
        }
        return can_post_action;
    }
    physique(amt) {
        this.increase_idx_physique(0, amt);
    }
    set_x_down_to_c(x, c) {
        if (this.players[0][x] > c) {
            this.reduce_idx_x_by_c(0, x, this.players[0][x] - c);
        }
    }
    do_echo_formation_thing(upgrade_amt) {
        const first_slot_id = this.players[0].cards[0];
        if (swogi[first_slot_id].is_continuous) {
            const existing_upgrade_level = first_slot_id.substring(first_slot_id.length-1);
            const new_upgrade_level = Math.min(3, parseInt(existing_upgrade_level) + upgrade_amt);
            const new_card_id = first_slot_id.substring(0, first_slot_id.length-1) + new_upgrade_level;
            this.log("triggering " + format_card(new_card_id));
            this.trigger_card(new_card_id, this.players[0].currently_playing_card_idx);
        }
    }
    become_star_point(amt) {
        const me = this.players[0];
        let qi_amt = 0;
        let idx = me.currently_playing_card_idx;
        for (let i=0; i<amt; i++) {
            idx = this.get_next_idx(idx);
            if (me.is_star_point[idx]) {
                qi_amt += 1;
            } else {
                me.is_star_point[idx] = true;
            }
        }
        this.add_c_of_x(qi_amt, "qi");
    }
    cards_have_generating_interaction(id1, id2) {
        if (id1 === undefined || id2 === undefined) {
            return false;
        }
        const c1 = swogi[id1];
        const c2 = swogi[id2];
        if (this.players[0].fire_spirit_generation_stacks > 0) {
            if (c1.is_fire_spirit) {
                return c2.is_wood_spirit || c2.is_earth_spirit || c2.is_metal_spirit || c2.is_water_spirit;
            }
            if (c2.is_fire_spirit) {
                return c1.is_wood_spirit || c1.is_earth_spirit || c1.is_metal_spirit || c1.is_water_spirit;
            }
        }
        if (c1.is_wood_spirit) {
            return c2.is_fire_spirit;
        }
        if (c1.is_fire_spirit) {
            return c2.is_earth_spirit;
        }
        if (c1.is_earth_spirit) {
            return c2.is_metal_spirit;
        }
        if (c1.is_metal_spirit) {
            return c2.is_water_spirit;
        }
        if (c1.is_water_spirit) {
            return c2.is_wood_spirit;
        }
        return false;
    }
    cards_have_overcoming_interaction(id1, id2) {
        for (let i=1; i<10; i+=2) {
            const mid = "1310" + i + "1";
            if (this.cards_have_generating_interaction(id1, mid) &&
                this.cards_have_generating_interaction(mid, id2)) {
                return true;
            }
        }
        return false;
    }
    activate_element_of_card(id) {
        let activated = false;
        const card = swogi[id];
        if (card.is_wood_spirit) {
            this.activate_wood_spirit();
            activated = true;
        }
        if (card.is_fire_spirit) {
            this.activate_fire_spirit();
            activated = true;
        }
        if (card.is_earth_spirit) {
            this.activate_earth_spirit();
            activated = true;
        }
        if (card.is_metal_spirit) {
            this.activate_metal_spirit();
            activated = true;
        }
        if (card.is_water_spirit) {
            this.activate_water_spirit();
            activated = true;
        }
        return activated;
    }
    do_five_elements_circulation(upgrade_level) {
        let idx = this.players[0].currently_playing_card_idx;
        const prev_idx = this.get_prev_idx(idx);
        const next_idx = this.get_next_idx(idx);
        const prev_id = this.players[0].cards[prev_idx];
        const next_id = this.players[0].cards[next_idx];
        if (this.cards_have_generating_interaction(prev_id, next_id)) {
            this.activate_element_of_card(next_id);
            const next_upgrade_level = parseInt(next_id.substring(next_id.length-1));
            upgrade_level = Math.min(upgrade_level, next_upgrade_level);
            const new_id = next_id.substring(0, next_id.length-1) + upgrade_level;
            this.log("triggering " + format_card(new_id));
            this.trigger_card(new_id, idx);
        }
    }
    do_earth_spirit_dust() {
        let amt = this.players[0].max_hp - this.players[1].max_hp;
        amt = Math.abs(amt);
        amt = Math.floor(amt * 0.25);
        this.increase_idx_def(0, amt);
        this.increase_idx_x_by_c(0, "next_turn_def", amt);
    }
    do_frozen_blood_lotus(times) {
        for (let i=0; i<times; i++) {
            let amt = 10;
            if (this.players[0].hp <= 10) {
                amt = this.players[0].hp - 1;
            }
            this.reduce_idx_x_by_c(0, "hp", amt);
        }
        this.increase_idx_x_by_c(0, "guard_up", times);
    }
    reverse_card_play_direction() {
        this.players[0].card_play_direction *= -1;
    }
    do_metal_spirit_charge(amt) {
        if (this.if_metal_spirit()) {
            amt += Math.floor(this.players[0].def / 4);
        }
        this.increase_idx_penetrate(0, amt);
    }
    idx_has_debuff(idx) {
        const me = this.players[idx];
        if (me.internal_injury > 0) return true;
        if (me.weaken > 0) return true;
        if (me.flaw > 0) return true;
        if (me.decrease_atk > 0) return true;
        if (me.entangle > 0) return true;
        if (me.wound > 0) return true;
        if (me.styx > 0) return true;
    }
    if_no_debuff() {
        return !this.idx_has_debuff(0);
    }
    if_enemy_has_debuff() {
        return this.idx_has_debuff(1);
    }
    do_qi_corrupting_sunflower() {
        const desired_qi_reduction = 3;
        const qi_reduction = Math.min(desired_qi_reduction, this.players[1].qi);
        const damage = (desired_qi_reduction - qi_reduction) * 5;
        this.reduce_idx_x_by_c(1, "qi", qi_reduction);
        if (damage > 0) {
            this.deal_damage(damage);
        }
    }
    do_qi_seeking_sunflower() {
        let amt = 4;
        if (this.players[0].qi > 0 || this.players[1].qi > 0) {
            amt += 2;
        }
        this.increase_idx_qi(0, amt);
    }
    reduce_enemy_max_hp(amt) {
        this.reduce_idx_x_by_c(1, "max_hp", amt);
    }
    def_rand_range(lo_inclusive, hi_inclusive) {
        const amt = this.rand_range(lo_inclusive, hi_inclusive);
        this.increase_idx_def(0, amt);
    }
    atk_rand_range(lo_inclusive, hi_inclusive) {
        const amt = this.rand_range(lo_inclusive, hi_inclusive);
        this.atk(amt);
    }
    reduce_enemy_max_hp_rand_range(lo_inclusive, hi_inclusive) {
        const amt = this.rand_range(lo_inclusive, hi_inclusive);
        this.reduce_enemy_max_hp(amt);
    }
    heal_rand_range(lo_inclusive, hi_inclusive) {
        const amt = this.rand_range(lo_inclusive, hi_inclusive);
        this.heal(amt);
    }
    deal_damage_rand_range(lo_inclusive, hi_inclusive) {
        const amt = this.rand_range(lo_inclusive, hi_inclusive);
        this.deal_damage(amt);
    }
    do_star_trail_divination(def, sp, qi, hp) {
        this.increase_idx_def(0, def);
        const amt = this.players[0].hexagram;
        this.reduce_c_of_x(amt, "hexagram");
        this.add_c_of_x(amt*sp, "star_power");
        this.add_c_of_x(amt*qi, "qi");
        this.heal(amt*hp);
    }
    do_thunder_and_lightning(hi_inclusive) {
        for (let i=0; i<2; i++) {
            const had_hexagram = this.players[0].hexagram > 0;
            this.atk_rand_range(1, hi_inclusive);
            if (had_hexagram) {
                this.increase_idx_qi(0, 1);
            }
        }
    }
    if_either_has_def() {
        return this.players[0].def > 0 || this.players[1].def > 0;
    }
    if_any_element_activated() {
        const me = this.players[0];
        if (me.activate_wood_spirit_stacks > 0) return true;
        if (me.activate_fire_spirit_stacks > 0) return true;
        if (me.activate_earth_spirit_stacks > 0) return true;
        if (me.activate_metal_spirit_stacks > 0) return true;
        if (me.activate_water_spirit_stacks > 0) return true;
    }
    do_metal_spirit_rhythm_water(pen_gain_amt) {
        if (this.if_metal_spirit()) {
            this.increase_idx_penetrate(0, pen_gain_amt);
        }
        if (this.if_water_spirit()) {
            const amt = Math.ceil(this.players[0].penetrate / 2);
            this.reduce_c_of_x(amt, "penetrate");
            this.add_c_of_x(amt, "force_of_water");
        }
    }
    trigger_card_by_id(id) {
        this.trigger_card(id, this.players[0].currently_playing_card_idx);
    }
    do_fire_spirit_rhythm_earth(burn_amt, def_amt) {
        if (this.if_fire_spirit()) {
            this.reduce_enemy_hp(burn_amt);
            this.reduce_enemy_max_hp(burn_amt);
        }
        if (this.if_earth_spirit()) {
            def_amt += Math.floor(this.players[1].max_hp_lost / 2);
            this.increase_idx_def(0, def_amt);
        }
    }
    do_earth_spirit_rhythm_metal(def_amt) {
        if (this.if_earth_spirit()) {
            this.increase_idx_def(0, def_amt);
            def_amt = this.players[0].def;
            this.reduce_idx_def(0, def_amt);
            this.increase_idx_def(0, def_amt);
        }
        if (this.if_metal_spirit()) {
            const pen_amt = Math.floor(this.players[0].def_lost / 4);
            this.add_c_of_x(pen_amt, "penetrate");
        }
    }
    do_fire_spirit_burning_sky(atk_amt) {
        if (this.if_fire_spirit()) {
            atk_amt += Math.floor(this.players[1].max_hp_lost / 3);
        }
        for (let i=0; i<3; i++) {
            this.atk(atk_amt);
        }
    }
    do_wood_spirit_rhythm_fire(heal_amt) {
        const hp_to_reduce = Math.ceil(this.players[0].hp / 2);
        if (this.if_wood_spirit()) {
            this.heal(heal_amt);
        }
        if (this.if_fire_spirit()) {
            this.reduce_idx_hp(0, hp_to_reduce);
            this.atk(1 + hp_to_reduce);
        }
    }
    do_five_elements_escape(def) {
        this.increase_idx_def(0, def);
        let activated = 0;
        const me = this.players[0];
        if (me.activate_wood_spirit_stacks > 0) {
            activated += 1;
        }
        if (me.activate_fire_spirit_stacks > 0) {
            activated += 1;
        }
        if (me.activate_earth_spirit_stacks > 0) {
            activated += 1;
        }
        if (me.activate_metal_spirit_stacks > 0) {
            activated += 1;
        }
        if (me.activate_water_spirit_stacks > 0) {
            activated += 1;
        }
        if (activated >= 2) {
            this.chase();
        }
    }
    for_each_enemy_x_add_y(x, y) {
        let amt_x = 0;
        if (x === "debuff") {
            amt_x = this.get_debuff_count(1);
        } else {
            amt_x = this.players[1][x];
        }
        this.add_c_of_x(amt_x, y);
    }
    do_sun_and_moon_for_glory(atk_amt, multiplier) {
        const hp_diff = this.players[0].max_hp - this.players[1].max_hp;
        if (hp_diff > 0) {
            atk_amt += Math.floor(hp_diff * multiplier);
        }
        this.deal_damage(atk_amt);
    }
    add_enemy_rand_range_of_x(lo_inclusive, hi_inclusive, x) {
        const amt = this.rand_range(lo_inclusive, hi_inclusive);
        this.add_enemy_c_of_x(amt, x);
    }
    set_enemy_c_of_x(c, x) {
        const current_value = this.players[1][x];
        if (current_value > c) {
            this.reduce_enemy_c_of_x(current_value - c, x);
        } else if (current_value < c) {
            this.add_enemy_c_of_x(c - current_value, x);
        }
    }
    do_fury_thunder(flaw_amt) {
        this.add_enemy_c_of_x(flaw_amt, "flaw");
        const me = this.players[0];
        const next_idx = this.get_next_playable_idx(me.currently_playing_card_idx);
        const next_id = me.cards[next_idx];
        if (is_thunder(next_id)) {
            this.chase();
        }
    }
    do_overcome_with_each_other(qi_amt, def_amt) {
        this.increase_idx_qi(0, qi_amt);
        this.increase_idx_def(0, def_amt);
        const me = this.players[0];
        const prev_idx = this.get_prev_idx(me.currently_playing_card_idx);
        const next_idx = this.get_next_idx(me.currently_playing_card_idx);
        const prev_id = me.cards[prev_idx];
        const next_id = me.cards[next_idx];
        if (this.cards_have_overcoming_interaction(prev_id, next_id)) {
            this.activate_element_of_card(next_id);
            this.chase();
        }
    }
    do_ultimate_overcome_formation(idx) {
        const me = this.players[0];
        const amt = me.ultimate_overcome_formation_stacks;
        if (amt === 0) {
            return;
        }
        const card_id = me.cards[idx];
        const next_idx = this.get_next_idx(idx);
        const next_id = me.cards[next_idx];
        if (this.cards_have_overcoming_interaction(card_id, next_id)) {
            this.activate_element_of_card(next_id);
            this.increase_idx_qi(0, amt);
            this.increase_idx_def(0, amt * 2 + 2);
        }
    }
    activate_next_slots(n) {
        let idx = this.players[0].currently_triggering_card_idx;
        for (let i=0; i<n; i++) {
            idx = this.get_next_idx(idx);
            const id = this.players[0].cards[idx];
            this.activate_element_of_card(id);
        }
    }
    downgrade_enemy_card_or_deal_damage(dmg_amt) {
        const idx = this.players[0].currently_triggering_card_idx;
        if (!this.try_downgrade_card(1, idx)) {
            this.deal_damage(dmg_amt);
        }
    }
    is_unrestrained_sword(card_id) {
        const card = swogi[card_id];
        if (card.is_unrestrained_sword) {
            return true;
        }
        if (this.is_fake_unrestrained_sword(card_id)) {
            return true;
        }
        if (this.players[0].dragon_devours_clouds_stacks > 0) {
            if (card.is_cloud_sword) {
                return true;
            }
            if (this.is_fake_cloud_sword(card_id)) {
                return true;
            }
        }
        return false;
    }
    is_cloud_sword(card_id) {
        const card = swogi[card_id];
        if (card.is_cloud_sword) {
            return true;
        }
        if (this.is_fake_cloud_sword(card_id)) {
            return true;
        }
        if (this.players[0].dragon_devours_clouds_stacks > 0) {
            if (card.is_unrestrained_sword) {
                return true;
            }
            if (this.is_fake_unrestrained_sword(card_id)) {
                return true;
            }
        }
        return false;
    }
    for_each_x_convert_c_pct_debuff_to_y(x, c, y) {
        let debuff_amt = this.get_debuff_count(0);
        let c_pct_x = Math.floor(this.players[0][x] * c / 100);
        let convert_amt = Math.min(debuff_amt, c_pct_x);
        this.reduce_random_debuff_by_c_n_times(1, convert_amt);
        /*
        // first reduce weaken
        let weaken_amt = Math.min(this.players[0].weaken, convert_amt);
        let other_amt = convert_amt - weaken_amt;
        this.reduce_c_of_x(weaken_amt, "weaken");
        // then reduce decrease_atk
        const keep_decrease_atk_amt = 1;
        const max_decrease_atk_reduction = Math.max(this.players[0].decrease_atk - keep_decrease_atk_amt, 0);
        let decrease_atk_amt = Math.min(max_decrease_atk_reduction, other_amt);
        other_amt -= decrease_atk_amt;
        this.reduce_c_of_x(decrease_atk_amt, "decrease_atk");
        // then reduce internal injury
        let internal_injury_amt = Math.min(this.players[0].internal_injury, other_amt);
        other_amt -= internal_injury_amt;
        this.reduce_c_of_x(internal_injury_amt, "internal_injury");
        this.reduce_random_debuff_by_c_n_times(1, other_amt);
        /**/
        this.add_c_of_x(convert_amt, y);
    }
    do_cloud_sword_dragon_spring(finishing_touch_amt) {
        for (let i=0; i<2; i++) {
            this.atk(2);
            if (this.players[0].this_atk_injured) {
                this.add_c_of_x(finishing_touch_amt, "finishing_touch_stacks");
                finishing_touch_amt = 0;
            }
        }
        if (this.if_cloud_hit()) {
            this.chase();
        }
    }
    do_thousand_star_explosion(atk_per_star_power) {
        this.atk(4 + atk_per_star_power * this.players[0].star_power);
        const star_power_to_reduce = Math.ceil(this.players[0].star_power / 2);
        this.reduce_idx_x_by_c(0, "star_power", star_power_to_reduce);
    }
    do_soul_overwhelming_palm(force_per_debuff, base_atk, atk_per_force) {
        let my_distinct_debuffs = 0;
        const me = this.players[0];
        for (let i=0; i<DEBUFF_NAMES.length; i++) {
            if (me[DEBUFF_NAMES[i]] > 0) {
                my_distinct_debuffs++;
            }
        }
        this.add_c_of_x(my_distinct_debuffs * force_per_debuff, "force");
        this.atk(base_atk + atk_per_force * this.players[0].force);
    }
    do_shadow_owl_reishi(idx) {
        if (this.players[idx].shadow_owl_reishi_stacks > 0) {
            this.reduce_idx_x_by_c(idx, "hp", this.players[0].shadow_owl_reishi_stacks);
            this.increase_idx_x_by_c(idx, "flying_brush_stacks", 1);
        }
    }
    do_donghuang_zhong() {
        if (this.players[0].is_triggering_donghuang_zhong > 0) {
            return;
        }
        this.players[0].is_triggering_donghuang_zhong += 1;
        const lim = this.players[0].currently_triggering_card_idx;
        for (let idx = 0; idx < lim; idx++) {
            const card_id = this.players[0].cards[idx];
            if (this.players[0].can_post_action[idx]) {
                this.log("retriggering " + format_card(card_id));
                this.trigger_card(card_id, idx);
            }
        }
        this.players[0].is_triggering_donghuang_zhong -= 1;
    }
    trigger_next_enemy_card() {
        const idx = this.players[1].next_card_index;
        const card_id = this.players[1].cards[idx];
        this.log("triggering enemy card: " + format_card(card_id));
        this.trigger_card(card_id, this.players[0].currently_triggering_card_idx);
    }
    trigger_next_card() {
        let idx = this.players[0].currently_playing_card_idx;
        const next_idx = this.get_next_idx(idx);
        const next_id = this.players[0].cards[next_idx];
        this.log("triggering " + format_card(next_id));
        this.trigger_card(next_id, idx);
    }
    trigger_previous_card() {
        let idx = this.players[0].currently_playing_card_idx;
        const prev_idx = this.get_prev_idx(idx);
        const prev_id = this.players[0].cards[prev_idx];
        this.log("triggering " + format_card(prev_id));
        this.trigger_card(prev_id, idx);
    }
    prevent_anti_chase() {
        this.players[0].prevent_anti_chase += 1;
    }
    do_xuanming_thundercloud_tribulation(dmg) {
        for (let i=0; i<5; i++) {
            if (!this.if_c_pct(10)) {
                this.deal_damage_inner(7, false, 1);
            }
            this.deal_damage(dmg);
        }
    }
    do_xuanming_requiem_fulu(my_hp_loss_pct, fixed_hp_loss) {
        const my_hp_loss = Math.ceil(this.players[0].hp * my_hp_loss_pct / 100);
        this.reduce_idx_hp(0, my_hp_loss);
        this.reduce_enemy_hp(my_hp_loss + fixed_hp_loss);
        this.reduce_enemy_max_hp(my_hp_loss + fixed_hp_loss);
    }
    do_xuanming_recurring(amt) {
        if (this.players[0].xuanming_recurring_hp !== undefined) {
            this.set_idx_c_of_x(0, "hp", this.players[0].xuanming_recurring_hp + amt);
        }
    }
    do_resonance_setup(idx) {
        const me = this.players[idx];
        const round_number = me.round_number;
        if (!(round_number >= 6 && me.indomitable_will_stacks > 0 &&
            me.resonance_indomitable_will_stacks > 0)) {
            me.resonance_indomitable_will_stacks = 0;
        }
        if (!(round_number >= 8 && me.resonance_full_of_force_stacks > 0)) {
            me.resonance_full_of_force_stacks = 0;
        }
        if (!(round_number >= 10 && me.resonance_store_qi_stacks > 0)) {
            me.resonance_store_qi_stacks = 0;
        }
        if (!(round_number >= 11 && me.resonance_within_reach_stacks > 0)) {
            me.resonance_within_reach_stacks = 0;
        }
        if (!(round_number >= 11 && me.resonance_inheritance_of_spirit_sword_stacks > 0)) {
            me.resonance_inheritance_of_spirit_sword_stacks = 0;
        }
        if (round_number >= 12 &&
            me.resonance_swift_burning_seal_stacks > 0 &&
            me.swift_burning_seal_stacks > 0) {
            me.swift_burning_seal_stacks += 1;
        }
        if (!(round_number >= 13 && me.resonance_sword_formation_guard_stacks > 0)) {
            me.resonance_sword_formation_guard_stacks = 0;
        }
        if (round_number >= 13 && me.resonance_landslide_stacks > 0) {
            this.increase_idx_x_by_c(idx, "earth_spirit_combine_world_stacks", 2);
        }
        if (round_number >= 13 && me.resonance_cat_paw_stacks > 0) {
            me.resonance_cat_paw_stacks += 1;
        }
        if (round_number >= 13 && me.resonance_coral_sword_stacks > 0) {
            me.gain_ignore_def_on_chase_stacks = 1;
        }
        if (!(round_number >= 13 && me.resonance_firmness_body_stacks > 0)) {
            me.resonance_firmness_body_stacks = 0;
        }
        if (!(round_number >= 13 && me.resonance_rejuvenation_stacks > 0)) {
            me.resonance_rejuvenation_stacks = 0;
        }
        if (round_number >= 14 && me.resonance_sky_delicate_bracelet_stacks > 0) {
            let n_upgraded = 0;
            const max_n_upgraded = 2;
            for (let card_idx = 0; card_idx < me.cards.length; card_idx++) {
                const card_id = me.cards[card_idx];
                if (swogi[card_id].qi_cost === 1 && this.try_upgrade_card(idx, card_idx)) {
                    n_upgraded += 1;
                    if (n_upgraded === max_n_upgraded) {
                        break;
                    }
                }
            }
        }
    }
    do_resonance_cat_paw() {
        const me = this.players[0];
        const amt = me.resonance_cat_paw_stacks;
        if (amt > 0 &&
            me.can_trigger_resonance_cat_paw &&
            swogi[me.currently_triggering_card_id].is_cat) {
            this.increase_idx_debuff(1, "wound", amt);
            me.can_trigger_resonance_cat_paw = false;
        }
    }
    do_normal_attack(atk_amt) {
        const me = this.players[0];
        atk_amt += me.carefree_tune_stacks;
        atk_amt += me.carefree_guqin_stacks;
        let rep_amt = 1;
        rep_amt += me.lying_drunk_stacks;
        atk_amt += me.return_to_simplicity_stacks;
        this.increase_idx_x_by_c(0, "agility", me.return_to_simplicity_stacks);
        for (let i = 0; i < rep_amt; i++) {
            this.atk(atk_amt);
        }
        if (this.players[0].carefree_guqin_stacks >= 1) {
            this.chase();
        }
    }
    random_int(n) {
        this.used_randomness = true;
        return Math.floor(Math.random() * n);
    }
    spirit_sword_deck_cound(max_n) {
        const me = this.players[0];
        let n = 0;
        for (let i=0; i<me.cards.length; i++) {
            if (is_spirit_sword(me.cards[i])) {
                n += 1;
            }
        }
        return Math.min(n, max_n);
    }
}

const FATE_TO_CHARACTER_OR_SECT = {
    sword_in_sheathed_stacks: "sw1",
    endurance_as_cloud_sea_stacks: "sw1",
    fire_flame_blade_stacks: "sw2",
    drift_ice_blade_stacks: "sw2",
    coral_sword_stacks: "sw3",
    lithe_as_cat_stacks: "sw4",
    blade_forging_sharpness_stacks: "sw5",
    blade_forging_stable_stacks: "sw5",
    sword_pattern_carving_chain_attack_stacks: "sw5",
    sword_pattern_carving_charge_stacks: "sw5",
    sword_pattern_carving_intense_stacks: "sw5",
    qi_forging_spiritage_stacks: "sw5",
    qi_forging_spiritstat_stacks: "sw5",
    qi_forging_spiritual_power_stacks: "sw5",
    quench_of_sword_heart_unrestrained_stacks: "sw5",
    quench_of_sword_heart_cloud_stacks: "sw5",
    quench_of_sword_heart_ultimate_stacks: "sw5",
    p4_mad_obsession_stacks: "sw",
    p5_mad_obsession_stacks: "sw",
    p2_rule_of_the_cloud_stacks: "sw",
    p3_rule_of_the_cloud_stacks: "sw",
    p4_rule_of_the_cloud_stacks: "sw",
    p5_rule_of_the_cloud_stacks: "sw",
    p2_sword_rhyme_cultivate_stacks: "sw",
    p3_sword_rhyme_cultivate_stacks: "sw",
    p4_sword_rhyme_cultivate_stacks: "sw",
    p5_sword_rhyme_cultivate_stacks: "sw",
    p2_sword_formation_guard_stacks: "sw",
    p3_sword_formation_guard_stacks: "sw",
    p4_sword_formation_guard_stacks: "sw",
    p5_sword_formation_guard_stacks: "sw",
    birdie_wind_stacks: "he1",
    astrology_stacks: "he4",
    heptastar_soulstat_stacks: "he4",
    astral_divination_hexagram_stacks: "he4",
    star_moon_folding_fan_stacks: "he5",
    act_underhand_stacks: "he5",
    rest_and_outwit_stacks: "he5",
    p2_divination_stacks: "he",
    p3_divination_stacks: "he",
    p4_divination_stacks: "he",
    p5_divination_stacks: "he",
    p2_stargaze_stacks: "he",
    p3_stargaze_stacks: "he",
    p4_stargaze_stacks: "he",
    p5_stargaze_stacks: "he",
    p2_astral_eclipse_stacks: "he",
    p3_astral_eclipse_stacks: "he",
    p4_astral_eclipse_stacks: "he",
    p5_astral_eclipse_stacks: "he",
    p2_post_strike_stacks: "he",
    p3_post_strike_stacks: "he",
    p4_post_strike_stacks: "he",
    p5_post_strike_stacks: "he",
    p2_rejuvenation_stacks: "he",
    p3_rejuvenation_stacks: "he",
    p4_rejuvenation_stacks: "he",
    p5_rejuvenation_stacks: "he",
    fire_spirit_generation_stacks: "fe5",
    flame_soul_rebirth_stacks: "fe5",
    five_elements_explosion_stacks: "fe5",
    swift_burning_seal_stacks: "fe5",
    mark_of_five_elements_stacks: "fe1",
    innate_wood_stacks: "fe2",
    innate_fire_stacks: "fe2",
    innate_earth_stacks: "fe2",
    innate_metal_stacks: "fe2",
    innate_water_stacks: "fe2",
    innate_mark_stacks: "fe2",
    five_elements_anima_stacks: "fe2",
    peach_branch_ruyi_stacks: "fe3",
    mark_of_water_spirit_stacks: "fe3",
    blossom_dance_stacks: "fe3",
    the_body_of_fierce_tiger_stacks: "fe4",
    p2_cycle_of_five_elements_stacks: "fe",
    p3_cycle_of_five_elements_stacks: "fe",
    p4_cycle_of_five_elements_stacks: "fe",
    p5_cycle_of_five_elements_stacks: "fe",
    p2_mutual_growth_stacks: "fe",
    p3_mutual_growth_stacks: "fe",
    p4_mutual_growth_stacks: "fe",
    p5_mutual_growth_stacks: "fe",
    p2_concentrated_element_stacks: "fe",
    p3_concentrated_element_stacks: "fe",
    p4_concentrated_element_stacks: "fe",
    p5_concentrated_element_stacks: "fe",
    unbounded_qi_stacks: "dx1",
    unwavering_soul_stacks: "dx1",
    courage_to_fight_stacks: "dx2",
    cracking_fist_stacks: "dx2",
    stance_of_fierce_attack_stacks: "dx2",
    entering_styx_stacks: "dx3",
    zen_mind_forging_body_stacks: "dx4",
    mind_body_resonance_stacks: "dx4",
    p2_firmness_body_stacks: "dx",
    p3_firmness_body_stacks: "dx",
    p4_firmness_body_stacks: "dx",
    p5_firmness_body_stacks: "dx",
    p2_regenerating_body_stacks: "dx",
    p3_regenerating_body_stacks: "dx",
    p4_regenerating_body_stacks: "dx",
    p5_regenerating_body_stacks: "dx",
    p2_full_of_force_stacks: "dx",
    p3_full_of_force_stacks: "dx",
    p4_full_of_force_stacks: "dx",
    p5_full_of_force_stacks: "dx",
    p2_mark_of_dark_heart_stacks: "dx",
    p3_mark_of_dark_heart_stacks: "dx",
    p4_mark_of_dark_heart_stacks: "dx",
    p5_mark_of_dark_heart_stacks: "dx",
}

export function guess_character(player) {
    const character_id_to_guess_count = {};
    const sect_id_to_guess_count = {};
    for (let id in CHARACTER_ID_TO_NAME) {
        character_id_to_guess_count[id] = 0;
    }
    for (let i=0; i<SECTS.length; i++) {
        sect_id_to_guess_count[SECTS[i]] = 0;
    }
    for (let i=0; i<player.cards.length; i++) {
        const card_id = player.cards[i];
        const character = swogi[card_id].character;
        if (character) {
            character_id_to_guess_count[character]++;
            const sect = character.substring(0, 2);
            sect_id_to_guess_count[sect]++;
        } else {
            const marking = swogi[card_id].marking;
            if (sect_id_to_guess_count[marking] !== undefined) {
                sect_id_to_guess_count[marking] += 0.01
            }
        }
    }
    for (let id in FATE_TO_CHARACTER_OR_SECT) {
        if (player[id] > 0) {
            const character_or_sect = FATE_TO_CHARACTER_OR_SECT[id];
            if (character_or_sect.length === 2) {
                sect_id_to_guess_count[character_or_sect]++;
            } else {
                character_id_to_guess_count[character_or_sect]++;
                const sect = character_or_sect.substring(0, 2);
                sect_id_to_guess_count[sect]++;
            }
        }
    }
    // if any character has nonzero count, return the first such character
    // with the highest count
    let max_character_count = 0;
    let max_character_id = "";
    for (let id in character_id_to_guess_count) {
        if (character_id_to_guess_count[id] > max_character_count) {
            max_character_count = character_id_to_guess_count[id];
            max_character_id = id;
        }
    }
    if (max_character_count > 0) {
        return max_character_id;
    }
    // return the first character belonging to
    // the first sect with the highest count
    let max_sect_count = -1;
    let max_sect_id = "";
    for (let id in sect_id_to_guess_count) {
        if (sect_id_to_guess_count[id] > max_sect_count) {
            max_sect_count = sect_id_to_guess_count[id];
            max_sect_id = id;
        }
    }
    return max_sect_id + "1";
}

//module.exports = { GameState, card_name_to_id_fuzzy, swogi };