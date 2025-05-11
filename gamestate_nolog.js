const fs = require('fs');
const process = require('process');
const uf = require('@leeoniya/ufuzzy');
export const swogi = JSON.parse(fs.readFileSync('swogi.json', 'utf8'));
const names_json = JSON.parse(fs.readFileSync('names.json', 'utf8'));
import { card_actions } from './card_actions.js';
//import { readFileSync } from 'fs';
//let swogi = JSON.parse(readFileSync('swogi.json', 'utf8'));
//import { readFileSync } from 'fs';
//let swogi = JSON.parse(readFileSync('swogi.json', 'utf8'));
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
    if (is_crash_fist(card_id)) {
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
];
function is_debuff(attr_name) {
    if (attr_name === "internal_injury") return true;
    return false;
}
const ACTIVATE_NAMES = [
];
function is_activate(attr_name) {
}
export class Player {
    constructor() {
        this.cards = [];
        this.can_play = []; // used for consumption/continuous cards
        this.reset();
    }
    reset() {
        this.next_card_index = 0;
        this.cards.length = 0;
        this.can_play.length = 0; // used for consumption/continuous cards
        this.round_number = 15;
        this.destiny = 100;
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
        this.ignore_def = 0;
        this.bonus_rep_amt = 0; // card-specific bonus rep
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


        // debuffs
        this.internal_injury = 0;


        // cloud sword sect normal cards
        this.moon_water_sword_formation_stacks = 0;


        // cloud sword sect secret enchantment cards


        // cloud sword sect character-specific cards


        // cloud sword sect legendary cards


        // heptastar sect normal cards
        this.card_play_direction = 1;


        // heptastar sect secret enchantment cards


        // heptastar sect character-specific cards


        // heptastar sect legendary cards


        // five elements sect normal cards


        // five elements sect secret enchantment cards


        // five elements sect character-specific cards


        // five elements sect legendary cards


        // duan xuan sect normal cards
        this.physique = 0;
        this.max_physique = 0;


        // duan xuan sect secret enchantment cards


        // duan xuan sect character-specific cards


        // musician side job cards
        this.predicament_for_immortals_stacks = 0;
        this.has_played_musician_card = 0;


        // painter side job cards


        // formation master side job cards
        this.skip_next_card_stacks = 0;


        // plant master side job cards
        // TODO: implement most of the below plants
        // divine_power_grass_stacks -> increase_atk
        // lose_power_grass_stacks -> decrease_atk
        // healing_chamomile_stacks -> regen
        // clear_chamomile_stacks -> hexproof
        // flying_owl_reishi_stacks -> speed
        // shadow_owl_reishi_stacks -> flying_brush_stacks
        // toxic_purple_fern_stacks -> internal_injury


        // fortune teller side job cards
        this.nothing_is_appropriate_stacks = 0;
        this.fate_reincarnates_stacks = 0;
        this.god_opportunity_reversal_stacks = 0;


        // talisman cards


        // spiritual pet cards


        // general immortal fates


        // cloud sword sect immortal fates
        this.sword_in_sheathed_stacks = 0;
        this.coral_sword_stacks = 0;


        // heptastar sect immortal fates

        // five elements sect immortal fates


        // duan xuan sect immortal fates


        // life shop buffs


        // super serious event buffs


        // immortal relics fusion cards
        this.prevent_anti_chase = 0;


        // merpeople pearls


        // general resonance immortal fates


        // cloud sword sect resonance immortal fates
        // this.resonance_sword_rhyme_cultivate_stacks = 0;
        this.resonance_sword_formation_guard_stacks = 0;
        // this.resonance_rule_of_the_cloud_stacks = 0;
        // this.resonance_sword_pool_the_heart_ask_stacks = 0;
        // this.resonance_sword_in_sheathed_stacks = 0;
        // this.resonance_endurance_as_cloud_sea_stacks = 0;
        // this.resonance_fire_flame_blade_stacks = 0;
        // this.resonance_drift_ice_blade_stacks = 0;
        // this.resonance_dragon_scale_stacks = 0;
        // this.resonance_pray_rain_stacks = 0;
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
        // this.resonance_birdie_wind_stacks = 0;
        // this.resonance_avatar_of_bird_shade_stacks = 0;
        // this.resonance_bloodline_power_stacks = 0;
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


        // duan xuan sect resonance immortal fates
    }
    reset_can_play() {
        this.cards = this.cards.slice();
        this.can_play.length = 0;
        const n_cards = this.cards.length;
        for (let i=0; i<n_cards; i++) {
            this.can_play.push(true);
        }
    }
    post_deck_setup() {
        this.reset_can_play();
    }
}
export class GameState {
    constructor(a, b) {
        this.indentation = "";
        if (a === undefined) {
            a = new Player();
        } else {
            a.reset();
        }
        if (b === undefined) {
            b = new Player();
        } else {
            b.reset();
        }
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
        for (let i=0; i<this.players[idx].coral_sword_stacks; i++) {
            this.increase_idx_x_by_c(idx, "ignore_def", 2);
        }
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
        return true;
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
        const prev_bonus_rep_amt = me.bonus_rep_amt;
        const prev_this_trigger_directly_attacked = me.this_trigger_directly_attacked;
        me.currently_triggering_card_idx = trigger_idx;
        me.currently_triggering_card_id = card_id;
        me.bonus_rep_amt = 0;
        me.this_trigger_directly_attacked = false;
        this.do_action(action);
        me.currently_triggering_card_idx = prev_triggering_idx;
        me.currently_triggering_card_id = prev_triggering_id;
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
            this.do_coral_sword(idx);
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
            this.indent();
            if (i % 2 === 1) {
                this.swap_players();
            }
            this.sim_turn();
            if (i % 2 === 1) {
                this.swap_players();
            }
            this.unindent();
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
    }
    sim_n_turns_zongzi(n) {
        this.start_of_game_setup();
        let i = 0;
        for (; i<n; i++) {
            this.indent();
            this.sim_turn();
            this.unindent();
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
    }
    do_action(arr) {
        // the actions list is like this: [["atk", 14], ["injured", ["regain_sword_intent"]]]
        // so we need to call this[arr[0]] passing in the rest of the array as arguments
        let ret = undefined;
        if (arr.length === 0) {
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
            this.crash();
        }
        return this[action_name](...args);
    }
    do_record_musician_card_played_for_chord_in_tune(card_id) {
        if (swogi[card_id].marking === "mu") {
            this.players[0].has_played_musician_card = 1;
        }
    }
    is_crash_fist(card_id) {
        return (
        is_crash_fist(card_id));
    }
    get_debuff_count(idx) {
        const me = this.players[idx];
        let ret = 0;
        ret += me.internal_injury;
        return ret;
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
        const prev_bonus_rep_amt = p0.bonus_rep_amt;
        const prev_this_trigger_directly_attacked = p0.this_trigger_directly_attacked;
        let card = swogi[card_id];
        p0.currently_triggering_card_idx = idx;
        p0.currently_triggering_card_id = card_id;
        p0.bonus_rep_amt = 0;
        p0.this_trigger_directly_attacked = false;
        this.just_do_the_card_and_nothing_else(card);
        //card_actions[card_id](this);
        //this.do_action(card.actions);
        // expire crash fist buffs - they don't apply to extra attacks


        // Extra attacks zone
        // Endless sword formation seems to not trigger for cards that only attacked
        // because of hhh, Shocked, or Stance of Fierce Attack.
        // End of extra attacks zone


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
        // if we chased 1 or more times during this card, let's regard that as 1 chase for now...
        if (me.this_card_chases > 0 && me.chases < me.max_chases) {
                me.chases += 1;
                if (me.surge_of_qi_stacks > 0 && !me.stance_is_fist) {
                    this.increase_idx_qi(0, 1);
                }
        }
    }
    play_card_inner(card_id, idx) {
        const me = this.players[0];
        me.this_card_attacked = false;
        me.this_card_directly_attacked = false;
        this.trigger_card(card_id, idx);
        this.do_record_musician_card_played_for_chord_in_tune(card_id);
    }
    play_card(card_id, idx) {
        const me = this.players[0];
        me.this_card_chases = 0;
        me.currently_playing_card_idx = idx;
        let plays = 1;
        for (let i=0; i<plays; i++) {
            this.play_card_inner(card_id, idx);
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
        {
            this.increase_idx_qi(0, 1);
        }
    }
    do_def_decay() {
        // def lost is is def*def_decay / 100, rounded up
        const me = this.players[0];
        let def_decay = 50;
        if (me.moon_water_sword_formation_stacks > 0) {
            def_decay = 0;
            this.reduce_idx_x_by_c(0, "moon_water_sword_formation_stacks", 1);
        }
        this.for_each_x_reduce_c_pct_y("def", def_decay, "def");
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
            this.reduce_idx_hp(idx, amt);
        }
    }
    do_nothing_is_appropriate() {
        if (this.players[0].nothing_is_appropriate_stacks > 0) {
            this.reduce_idx_x_by_c(0, "nothing_is_appropriate_stacks", 1);
            return -6;
        }
        return 0;
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
    do_skip_next_card() {
        const me = this.players[0];
        while (me.skip_next_card_stacks > 0) {
            me.skip_next_card_stacks -= 1;
            this.advance_next_card_index();
        }
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
        this.reduce_idx_x_by_c(0, "god_opportunity_reversal_stacks", 1);
        this.do_def_decay();
        this.do_internal_injury(0, true);
        if (this.check_for_death()) {
            return;
        }
        let action_idx = 0;
        let can_act = true;
        while (action_idx <= me.chases && action_idx <= me.max_chases && can_act) {
            if (this.check_for_death()) {
                return;
            }
            if (action_idx > 0) {
            }
            action_idx += 1;
            if (!this.can_play_a_card()) {
                me.can_play[0] = true;
                me.next_card_index = 0;
                me.cards[0] = "601011";
            }
            this.do_skip_next_card();
            let card_id = me.cards[me.next_card_index];
            let card = swogi[card_id];
            let qi_cost = card.qi_cost;
            // TODO: ths has to get reworked for chengyun's fusion style.
            if (card.decrease_qi_cost_by_x !== undefined) {
                let x = card.decrease_qi_cost_by_x;
                let reduce_amt = 0;
                if (x === "debuff") {
                    reduce_amt = this.get_debuff_count(0);
                } else {
                    reduce_amt = me[x];
                }
                if (reduce_amt) {
                    qi_cost = Math.max(0, qi_cost - reduce_amt);
                }
            }
            let hp_cost = card.hp_cost;
            const orig_hp_cost = hp_cost;
            if (me.qi < qi_cost) {
                this.gain_qi_to_afford_card(card.gather_qi);
            } else {
                if (qi_cost > 0) {
                    this.reduce_idx_x_by_c(0, "qi", qi_cost);
                }
                if (hp_cost !== undefined) {
                    if (hp_cost > 0) {
                        {
                            this.reduce_idx_hp(0, hp_cost, true);
                        }
                    }
                    // bounce is consumed by spending 0 hp to play mountain cleaving palms
                    // but it is not used when paying hp via unbounded qi
                }
                if (hp_cost === undefined && qi_cost === 0) {
                }
                const card_idx = me.next_card_index;
                card_id = me.cards[card_idx];
                this.play_card(card_id, card_idx);
                if (this.check_for_death()) {
                    return;
                }
                this.advance_next_card_index();
                this.process_this_card_chases();
            }
        }
        if (this.check_for_death()) {
            return;
        }
        this.do_sword_in_sheathed();
        this.do_resonance_sword_formation_guard();
        if (this.check_for_death()) {
            return;
        }
    }
    reduce_idx_def(idx, amt) {
        if (amt < 0) {
            this.crash();
        }
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        const reduced_amt = Math.min(amt, me.def);
        me.def -= reduced_amt;
    }
    reduce_idx_hp(idx, dmg, is_cost, ignore_guard_up) {
        if (dmg < 0) {
            this.crash();
        }
        if (dmg === 0) {
            return 0;
        }
        const me = this.players[idx];
        me.hp -= dmg;
        return dmg;
    }
    reduce_idx_max_hp(idx, amt) {
        if (amt < 0) {
            this.crash();
        }
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        const reduced_amt = Math.min(amt, me.max_hp);
        me.max_hp -= reduced_amt;
        if (me.hp > me.max_hp) {
            me.hp = me.max_hp;
        }
    }
    reduce_idx_force(idx, amt) {
        if (amt < 0) {
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
    }
    increase_idx_max_hp(idx, amt) {
        if (amt === 0) {
            return 0;
        }
        const me = this.players[idx];
        me.max_hp += amt;
    }
    increase_idx_hp(idx, amt, heal_while_dead) {
        const me = this.players[idx];
        if (amt === 0) {
            return 0;
        }
        const prev_hp = me.hp;
        if (prev_hp <= 0 && !heal_while_dead) {
            return 0;
        }
        if (me.god_opportunity_reversal_stacks > 0) {
            const dmg_amt = Math.ceil(amt * 6 / 10);
            this.deal_damage_inner(dmg_amt, false, idx);
        }
        me.hp += amt;
        if (me.hp > me.max_hp) {
            {
                me.hp = me.max_hp;
            }
        }
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
        if (me.god_opportunity_reversal_stacks > 0) {
            const dmg_amt = Math.ceil(amt * 6 / 10);
            this.deal_damage_inner(dmg_amt, false, idx);
        }
        me.def += amt;
    }
    increase_idx_penetrate(idx, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        me.penetrate += amt;
    }
    increase_idx_qi(idx, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        me.qi += amt;
    }
    increase_idx_force(idx, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        me.force += amt;
        if (me.force > me.max_force) {
            const excess_amt = me.force - me.max_force;
            me.force = me.max_force;
            this.increase_idx_def(idx, excess_amt);
        }
        if (me.surge_of_qi_stacks > 0 && me.stance_is_fist) {
            this.increase_idx_x_by_c(idx, "agility", 2);
        }
    }
    increase_idx_activate(idx, x, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        me[x] += amt;
    }
    increase_idx_physique(idx, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        const prev = me.physique;
        me.physique += amt;
        this.increase_idx_max_hp(idx, amt);
        if (me.max_physique < me.physique) {
            let heal_amt = amt;
            if (prev < me.max_physique) {
                heal_amt -= me.max_physique - prev;
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
    }
    increase_idx_star_power(idx, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        me.star_power += amt;
    }
    increase_idx_debuff(idx, x, amt) {
        if (amt === 0) {
            return;
        }
        const me = this.players[idx];
        me[x] += amt;
    }
    increase_idx_x_by_c(idx, x, c) {
        if (c === 0) {
            return;
        }
        const me = this.players[idx];
        if (c < 0) {
            this.crash();
        }
        if (x === "hp") {
            return this.increase_idx_hp(idx, c);
        }
        if (x === "def") {
            return this.increase_idx_def(idx, c);
        }
        if (x === "physique") {
            return this.increase_idx_physique(idx, c);
        }
        me[x] += c;
    }
    reduce_idx_x_by_c(idx, x, c) {
        if (c === 0) {
            return;
        }
        const me = this.players[idx];
        if (x === "hp") {
            return this.reduce_idx_hp(idx, c, false);
        }
        if (x === "max_hp") {
            return this.reduce_idx_max_hp(idx, c);
        }
        if (c < 0) {
            this.crash();
        }
        const prev_x = me[x];
        me[x] -= c;
        if (me[x] < 0) {
            me[x] = 0;
        }
        if (prev_x !== me[x] || c !== 1) {
        }
    }
    deal_damage_inner(dmg, is_atk, my_idx, is_extra) {
        const enemy_idx = 1 - my_idx;
        let ignore_def = false;
        let min_dmg = 1;
        const me = this.players[my_idx];
        const enemy = this.players[enemy_idx];
        if (is_atk) {
            me.this_atk_injured = false;
            if (me.trigger_depth <= 1) {
                me.this_card_directly_attacked = true;
            }
            me.this_trigger_directly_attacked = true;
            me.this_card_attacked = true;
            me.this_turn_attacked = true;
            if (me.ignore_def > 0) {
                this.reduce_idx_x_by_c(my_idx, "ignore_def", 1);
                ignore_def = true;
            }
            dmg += this.do_nothing_is_appropriate();
        }
        dmg = Math.max(min_dmg, dmg);
        let damage_to_def = 0;
        let damage_to_hp = 0;
        if (ignore_def) {
            damage_to_def = 0;
            damage_to_hp = dmg;
        } else
        {
            damage_to_def = Math.min(enemy.def, dmg);
            damage_to_hp = dmg - damage_to_def;
        }
        this.reduce_idx_def(enemy_idx, damage_to_def);
        let ignore_guard_up = false;
        if (is_atk) {
            let can_wound = damage_to_hp > 0;
        }
        let damage_actually_dealt_to_hp = this.reduce_idx_hp(
            enemy_idx, damage_to_hp, false, ignore_guard_up);
        if (is_atk) {
            me.damage_dealt_to_hp_by_atk = damage_actually_dealt_to_hp;
            if (damage_actually_dealt_to_hp > 0) {
                me.this_atk_injured = true;
            }
        }
    }
    deal_damage(dmg) {
        this.deal_damage_inner(dmg, false, 0);
    }
    atk(dmg, is_extra) {
        const me = this.players[0];
        const enemy = this.players[1];
        this.deal_damage_inner(dmg, true, 0, is_extra);
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
    gain_ignore_def(amt) {
        this.increase_idx_x_by_c(0, "ignore_def", amt);
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
    check_for_death() {
        //return false;
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
            return true;
        }
        while (me.hp <= 0) {
            {
                this.game_over = true;
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
            this.trigger_card(arr[crash_idx], playing_idx);
        }
    }
    do_clear_heart() {
        const ult = (0
        );
        let first_atk_damage = 6 + Math.min(this.players[0].round_number, 19);
        first_atk_damage += ult;
        // do the first atk
        this.atk(first_atk_damage);
    }
    do_clear_heart_sword_formation(first_atk_damage) {
        const first_def_amt = first_atk_damage;
        // do the first atk
        this.atk(first_atk_damage);
        this.increase_idx_def(0, first_def_amt);
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
            this.trigger_card(new_card_id, this.players[0].currently_playing_card_idx);
        }
    }
    cards_have_generating_interaction(id1, id2) {
        if (id1 === undefined || id2 === undefined) {
            return false;
        }
        const c1 = swogi[id1];
        const c2 = swogi[id2];
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
            this.trigger_card(new_id, idx);
        }
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
    idx_has_debuff(idx) {
        const me = this.players[idx];
        if (me.internal_injury > 0) return true;
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
    if_either_has_def() {
        return this.players[0].def > 0 || this.players[1].def > 0;
    }
    if_any_element_activated() {
        const me = this.players[0];
    }
    trigger_card_by_id(id) {
        this.trigger_card(id, this.players[0].currently_playing_card_idx);
    }
    do_five_elements_escape(def) {
        this.increase_idx_def(0, def);
        let activated = 0;
        const me = this.players[0];
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
        return false;
    }
    is_cloud_sword(card_id) {
        const card = swogi[card_id];
        if (card.is_cloud_sword) {
            return true;
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
    trigger_next_enemy_card() {
        const idx = this.players[1].next_card_index;
        const card_id = this.players[1].cards[idx];
        this.trigger_card(card_id, this.players[0].currently_triggering_card_idx);
    }
    trigger_next_card() {
        let idx = this.players[0].currently_playing_card_idx;
        const next_idx = this.get_next_idx(idx);
        const next_id = this.players[0].cards[next_idx];
        this.trigger_card(next_id, idx);
    }
    trigger_previous_card() {
        let idx = this.players[0].currently_playing_card_idx;
        const prev_idx = this.get_prev_idx(idx);
        const prev_id = this.players[0].cards[prev_idx];
        this.trigger_card(prev_id, idx);
    }
    prevent_anti_chase() {
        this.players[0].prevent_anti_chase += 1;
    }
    do_xuanming_requiem_fulu(my_hp_loss_pct, fixed_hp_loss) {
        const my_hp_loss = Math.ceil(this.players[0].hp * my_hp_loss_pct / 100);
        this.reduce_idx_hp(0, my_hp_loss);
        this.reduce_enemy_hp(my_hp_loss + fixed_hp_loss);
        this.reduce_enemy_max_hp(my_hp_loss + fixed_hp_loss);
    }
    do_resonance_setup(idx) {
        const me = this.players[idx];
        const round_number = me.round_number;
        if (!(round_number >= 13 && me.resonance_sword_formation_guard_stacks > 0)) {
            me.resonance_sword_formation_guard_stacks = 0;
        }
    }
    do_normal_attack(atk_amt) {
        const me = this.players[0];
        let rep_amt = 1;
        for (let i = 0; i < rep_amt; i++) {
            this.atk(atk_amt);
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
