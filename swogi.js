var fs = require('fs');
var swogi = JSON.parse(fs.readFileSync('swogi.json', 'utf8'));
var keys = Object.keys(swogi);
keys.sort();
// the base_id of a card is the same id except that it always ends in 1
function get_base_id(card_id) {
    return card_id.substring(0, card_id.length-1) + "1";
}
function format_card(card_id) {
    var card_name = swogi[card_id].name;
    var card_level = card_id.substring(card_id.length-1);
    return card_name + " (level " + card_level + ")";
}
const SECTS = ["no marking", "sw", "he", "fe", "dx"];
const JOBS = ["no marking", "el", "fu", "mu", "pa", "fo", "pl"];
function get_marking(card_id) {
    const sect = card_id.substring(1, 2);
    const class_ = card_id.substring(0, 1);
    if (class_ === "1" || class_ === "2") {
        return SECTS[parseInt(sect)];
    }
    if (class_ === "3") {
        return JOBS[parseInt(sect)];
    }
    if (class_ === "4") {
        return "talisman";
    }
    if (class_ === "5") {
        return "spiritual_pet";
    }
    if (class_ === "6") {
        return "no marking";
    }
    throw new Error("suspicious card id " + card_id);
}
for (var i=0; i<keys.length; i++) {
  var card_id = keys[i];
  var card = swogi[card_id];
  var base_id = get_base_id(card_id);
  if (card_id !== base_id) {
    var base = swogi[base_id];
    if (card.name === undefined) {
      card.name = base.name;
    }
    if (card.qi_cost === undefined) {
      card.qi_cost = base.qi_cost;
    }
    if (card.hp_cost === undefined) {
      card.hp_cost = base.hp_cost;
    }
    if (card.decrease_qi_cost_by_x === undefined) {
      card.decrease_qi_cost_by_x = base.decrease_qi_cost_by_x;
    }
  }
  card.marking = get_marking(card_id);
}
function is_unrestrained_sword(card_id) {
    return swogi[card_id].name.includes("Unrestrained Sword");
}
function is_cloud_sword(card_id) {
    return swogi[card_id].name.includes("Cloud Sword");
}
function is_sword_formation(card_id) {
    return swogi[card_id].name.includes("Sword Formation");
}
function is_debuff(attr_name) {
    return DEBUFF_NAMES.includes(attr_name);
}
const DEBUFF_NAMES = ["internal_injury", "decrease_atk", "weaken", "flaw", "entangle", "wound"];
class Player {
    constructor() {
        this.next_card_index = 0;
        this.cards = [];
        this.can_play = []; // used for consumption/continuous cards
        this.exchange_card_chance = 0;
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
        // TODO: the above is for endless sword formation
        this.this_turn_attacked = false; // whether the player has attacked this turn
        this.this_atk_injured = false; // whether the enemy hp has been injured by this atk
        this.damage_dealt_to_hp_by_atk = 0; // for stuff that keys off how much damage went through to hp
        this.ignore_def = 0;
        this.guard_up = 0;
        this.bonus_atk_amt = 0; // card-specific bonus atk
        this.bonus_dmg_amt = 0; // card-specific bonus dmg
        this.bonus_rep_amt = 0; // card-specific bonus rep
        this.bonus_def_amt = 0; // card-specific bonus def
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
        this.strike_twice_stacks = 0;
        // heptastar sect character-specific cards
        this.cannot_act_stacks = 0;
        // five elements sect normal cards
        this.metal_spirit_iron_bone_stacks = 0;
        this.water_spirit_dive_stacks = 0;
        // duan xuan sect normal cards
        this.agility = 0;
        this.physique = 0;
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
    }
    reset_can_play() {
        this.can_play = [];
        for (var i=0; i<this.cards.length; i++) {
            this.can_play.push(true);
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
    start_of_game_setup() {
        for (var idx = 0; idx < 2; idx++) {
            this.players[idx].post_deck_setup();
        }
        for (var idx = 0; idx < 2; idx++) {
            this.do_coral_sword(idx);
            this.do_store_qi(idx);
            this.do_mad_obsession(idx);
            this.do_sword_rhyme_cultivate(idx);
        }
    }
    swap_players() {
        var temp = this.players[0];
        this.players[0] = this.players[1];
        this.players[1] = temp;
    }
    sim_n_turns(n) {
        this.start_of_game_setup();
        for (var i=0; i<n; i++) {
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
                var winner = 0;
                if (this.players[0].hp < this.players[1].hp) {
                    winner = 1;
                }
                this.log("player " + winner + " wins");
                return;
            }
        }
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
    do_record_musician_card_played_for_chord_in_tune(card_id) {
        if (swogi[card_id].marking === "mu") {
            this.players[0].has_played_musician_card = true;
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
        var card = swogi[card_id];
        this.players[0].currently_triggering_card_idx = idx;
        this.players[0].currently_triggering_card_id = card_id;
        this.players[0].bonus_atk_amt = 0;
        this.players[0].bonus_dmg_amt = 0;
        this.players[0].bonus_rep_amt = 0;
        this.players[0].bonus_def_amt = 0;
        this.do_cloud_sword_softheart_and_friends(card_id);
        this.do_sword_formation_guard(idx);
        this.do_action(card.actions);
        if (!this.game_over) {
            this.do_emptiness_sword_formation(card_id);
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
        this.players[0].trigger_depth -= 1;
        this.unindent();
    }
    process_this_card_chases() {
        // if we chased 1 or more times during this card, let's regard that as 1 chase for now...
        if (this.players[0].this_card_chases > 0) {
            this.players[0].chases += 1;
            this.log("incremented chases to " + this.players[0].chases);
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
        this.do_record_musician_card_played_for_chord_in_tune(card_id);
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
            const new_id = "10101" + existing_upgrade_level;
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
    sim_turn() {
        this.players[0].chases = 0;
        this.players[0].this_turn_attacked = false;
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
            this.do_finishing_touch();
            this.do_nether_void_canine();
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
                if (qi_cost > 0) {
                    this.reduce_idx_x_by_c(0, "qi", qi_cost);
                    this.log("player 0 spent " + qi_cost + " qi to play " + format_card(card_id));
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
    reduce_idx_hp(idx, dmg) {
        if (dmg < 0) {
            this.log("error: dmg is negative: " + dmg);
            this.crash();
        }
        if (dmg === 0) {
            return 0;
        }
        if (this.players[idx].guard_up > 0) {
            this.players[idx].guard_up -= 1;
            this.log("prevented " + dmg + " damage to hp with guard up. " + this.players[idx].guard_up + " guard up remaining");
            return 0;
        } else {
            this.players[idx].hp -= dmg;
            this.log("reduced player " + idx +" hp by " + dmg + " to " + this.players[idx].hp);
            return dmg;
        }
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
        if (this.players[idx].hp > this.players[idx].max_hp) {
            this.players[idx].hp = this.players[idx].max_hp;
        }
        this.log("healed " + amt + " hp. Went from " + prev_hp + " to " + this.players[idx].hp);
    }
    reduce_my_hp(dmg) {
        return this.reduce_idx_hp(0, dmg);
    }
    reduce_enemy_hp(dmg) {
        return this.reduce_idx_hp(1, dmg);
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
        this.players[idx].def += amt;
        this.log("gained " + amt + " def. Now have " + this.players[idx].def + " def");
    }
    increase_idx_qi(idx, amt) {
        if (amt === 0) {
            return;
        }
        if (this.players[idx].colorful_spirit_crane_stacks > 0) {
            amt *= 2;
        }
        this.players[idx].qi += amt;
        this.log("gained " + amt + " qi. Now have " + this.players[idx].qi + " qi");
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
            return this.reduce_idx_hp(idx, c);
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
    deal_damage_inner(dmg, ignore_def, is_atk) {
        var pct_multiplier = 100;
        if (is_atk) {
            this.players[0].this_atk_injured = false;
            if (this.players[0].trigger_depth <= 1) {
                this.players[0].this_card_directly_attacked = true;
            }
            this.players[0].this_card_attacked = true;
            this.players[0].this_turn_attacked = true;
            if (!this.players[0].sword_intent_flow_mode && this.players[0].sword_intent_flow_stacks > 0) {
                this.reduce_idx_x_by_c(0, "sword_intent_flow_stacks", 1);
                this.players[0].sword_intent_flow_mode = true;
            }
            if (this.players[0].sword_intent > 0) {
                if (this.players[0].sword_intent_flow_mode) {
                    if (this.players[0].this_card_sword_intent < this.players[0].sword_intent) {
                        this.log("in sword intent flow mode, using " + this.players[0].sword_intent + " sword intent without consuming");
                        this.players[0].this_card_sword_intent = this.players[0].sword_intent;
                    }
                } else {
                    this.log("consuming " + this.players[0].sword_intent + " sword intent");
                    this.players[0].this_card_sword_intent += this.players[0].sword_intent;
                    this.reduce_idx_x_by_c(0, "sword_intent", this.players[0].sword_intent);
                }
            }
            dmg += this.do_lonely_night_wolf();
            dmg += this.players[0].bonus_atk_amt;
            dmg += this.players[0].this_card_sword_intent * (1 + this.players[0].bonus_sword_intent_multiplier);
            dmg += this.players[0].increase_atk;
            dmg += this.players[0].craze_dance_tune_stacks;
            dmg -= this.players[0].decrease_atk;
            dmg += this.players[1].wound;
            if (this.players[1].metal_spirit_iron_bone_stacks > 0) {
                dmg -= 5;
            }
            if (this.players[1].water_spirit_dive_stacks > 0) {
                pct_multiplier -= 40;
            }
            if (this.players[0].weaken > 0 && !this.players[0].ignore_weaken) {
                pct_multiplier -= 40;
            }
            if (this.players[1].flaw > 0) {
                pct_multiplier += 40;
            }
            this.players[0].ignore_weaken = false;
            this.players[0].bonus_sword_intent_multiplier = 0;
        }
        dmg += this.players[0].bonus_dmg_amt;
        dmg = Math.floor(dmg * pct_multiplier / 100);
        dmg = Math.max(1, dmg);
        if (this.players[1].def < 0) {
            this.log("error: def is negative: " + this.players[1].def);
            this.crash();
        }
        var damage_to_def = Math.min(this.players[1].def, dmg);
        if (ignore_def) {
            damage_to_def = 0;
        }
        var damage_to_hp = dmg - damage_to_def;
        this.reduce_idx_x_by_c(1, "def", damage_to_def);
        var damage_actually_dealt_to_hp = this.reduce_enemy_hp(damage_to_hp);
        if (is_atk) {
            this.players[0].damage_dealt_to_hp_by_atk = damage_actually_dealt_to_hp;
            if (this.players[0].fire_flame_blade_stacks > 0) {
                this.players[0].this_atk_injured = true;
            }
            if (damage_actually_dealt_to_hp > 0) {
                this.players[0].this_atk_injured = true;
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
        this.deal_damage_inner(dmg, ignore_def, false);
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
        this.deal_damage_inner(dmg, ignore_def, true);
        this.do_fire_flame_blade();
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
}
var fuzz = true;
if (fuzz) {
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
        console.log("decks: " + JSON.stringify(decks_formatted));
        game.sim_n_turns(32);
        game.dump();
        if (i % 10000 === 0) {
            console.log(i);
        }
        //console.log(i);
    }
} else {
}
/* print the deck
for (var i=0; i<8; i++) {
  console.log(format_card(deck[i]));
}*/
