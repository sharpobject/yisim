import { card_actions } from './card_actions.js';

export const swogi = {};
export const names_json = [];
const card_names = [];
const card_name_to_id = {};
export function make_card_name_to_id_fuzzy(fuzzy) {
    return function card_name_to_id_fuzzy(name) {
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
}
function format_name_level(name, level) {
    return name + " (level " + level + ")";
}
export function format_card(card_id) {
    let card_name = swogi[card_id].name;
    let card_level = card_id.substring(card_id.length-1);
    return format_name_level(card_name, card_level);
}
export const SECTS = ["sw", "he", "fe", "dx"];
export const CRASH_FIST_CARDS = [[],[],[],[]];

export const ready = (async () => {
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  const module = await import('./card_json_node.js');
  Object.assign(swogi, module.swogi);
  Object.assign(names_json, module.names_json);
} else {
  const module = await import('./card_json_web.js');
  await module.ready;
  Object.assign(swogi, module.swogi);
  Object.assign(names_json, module.names_json);
}

let keys = Object.keys(swogi);
keys.sort();

// the base_id of a card is the same id except that it always ends in 1
function get_base_id(card_id) {
    return card_id.substring(0, card_id.length-1) + "1";
}

const id_to_names_ = {};
const id_to_name_ = {};
//console.log("names_json.length = ", names_json.length);
//console.log("names_json = ", names_json);
for (let i=0; i<names_json.length; i++) {
    const id = names_json[i].id + "";
    const names = [];
    for (const prop in names_json[i]) {
        // if it starts with "name", add it to the names array
        if (prop.startsWith("name")) {
            //console.log("ADD NAME", id, names_json[i][prop]);
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
        //console.log("SET NAMES", card_id, swogi[card_id].names);
    }
    if (id_to_name_[card_id] !== undefined) {
        swogi[card_id].name = id_to_name_[card_id];
        //console.log("SET NAME", card_id, swogi[card_id].name);
    }
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

for (let i=0; i<keys.length; i++) {
    let card_id = keys[i];
    if (is_crash_fist(card_id) && (card_id.startsWith("1") || card_id.startsWith("2"))) {
        let level = parseInt(card_id.substring(card_id.length-1));
        CRASH_FIST_CARDS[level].push(card_id);
    }
}

for (let i=0; i<keys.length; i++) {
    const card_id = keys[i];
    // console.log(card_id, swogi[card_id].name, swogi[card_id].names);
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
})();
