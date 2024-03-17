// this is a node.js script
// first load the contents of the file swogi.json
var fs = require('fs');
var swogi = JSON.parse(fs.readFileSync('swogi.json', 'utf8'));
// next generate a list of the keys in the top level of the swogi object
var keys = Object.keys(swogi);
// sort the keys
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
// for each card that not in the base_id form, propagate the name and qi_cost and hp_cost from the base_id, if they exist and are not already set
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
}
function is_unrestrained_sword(card_id) {
    return swogi[card_id].name.includes("Unrestrained Sword");
}
function is_cloud_sword(card_id) {
    return swogi[card_id].name.includes("Cloud Sword");
}
// simulate 6 turns of the game
// the way the game works is that each turn, the next card in the deck is played
// if the player doesn't have enough qi, they spend 1 turn to gain 1 qi
// each card has an "actions" array that contains the actions that the card takes
// each action is a string that names a function that we must call to manipulate the game state
class Player {
    constructor() {
        this.next_card_index = 0;
        this.cards = [];
        this.can_play = []; // used for consumption/continuous cards
        this.destiny = 100;
        this.cultivation = 70;
        this.speed = 0;
        this.qi = 0;
        this.hp = 100;
        this.max_hp = 100;
        this.def = 0;
        this.this_card_attacked = false; // whether the player has attacked with this card
        this.this_turn_attacked = false; // whether the player has attacked this turn
        this.this_atk_injured = false; // whether the enemy hp has been injured by this atk
        this.damage_dealt_to_hp_by_atk = 0; // for stuff that keys off how much damage went through to hp
        this.ignore_def = 0;
        this.guard_up = 0;
        this.bonus_atk_amt = 0; // card-specific bonus atk
        this.bonus_dmg_amt = 0; // card-specific bonus dmg
        this.bonus_rep_amt = 0; // card-specific bonus rep
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
        this.currently_playing_card_id = undefined;
        this.currently_triggering_card_idx = undefined;
        this.currently_triggering_card_id = undefined;
        this.trigger_depth = 0; // used to decide whether "continuous" and "consumption" deactivate a card
        this.increase_atk = 0;
        this.regen = 0;
        // debuffs
        this.internal_injury = 0;
        this.decrease_atk = 0;
        this.weaken = 0;
        this.flaw = 0;
        this.entangle = 0;
        this.wound = 0;
        // cloud sword sect
        this.sword_intent_flow_stacks = 0;
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
        this.unrestrained_sword_clear_heart_stacks = 0;
        this.cloud_sword_clear_heart_stacks = 0;
        // 5e sect
        this.metal_spirit_iron_bone_stacks = 0;
        this.water_spirit_dive_stacks = 0;
    }
    reset_can_play() {
        this.can_play = [];
        for (var i=0; i<this.cards.length; i++) {
            this.can_play.push(true);
        }
    }
}
class GameState {
    constructor() {
        this.indentation = "";
        this.players = [];
        this.players[0] = new Player();
        this.players[1] = new Player();
        this.output = [];
    }
    crash() {
        this.dump();
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
    sim_n_turns(n) {
        this.players[0].reset_can_play();
        this.players[1].reset_can_play();
        for (var i=0; i<n; i++) {
            this.log("turn " + i + " begins");
            this.indent();
            this.sim_turn();
            this.unindent();
            this.log("turn " + i + " ends");
        }
    }
    do_action(arr) {
        // the actions list is like this: [["atk", 14], ["injured", ["regain_sword_intent"]]]
        // so we need to call this[arr[0]] passing in the rest of the array as arguments
        if (arr.length === 0) {
            this.log("empty action list");
            return;
        }
        // if arr[0] is actually an array, then try calling do_action on all the elements of arr
        if (Array.isArray(arr[0])) {
            for (var i=0; i<arr.length; i++) {
                this.do_action(arr[i]);
            }
            return;
        }
        var action_name = arr[0];
        var args = arr.slice(1);
        if (this[action_name] === undefined) {
            this.log("action " + action_name + " is not defined");
            this.crash();
        }
        this[action_name](...args);
    }
    do_cloud_sword_softheart(card_id) {
        // if this card has "Cloud Sword" in the name, gain hp for each cloud_sword_softheart_stacks
        if (is_cloud_sword(card_id)) {
            this.heal(this.players[0].cloud_sword_softheart_stacks);
        }
    }
    do_unrestrained_sword_count(card_id) {
        // if this card has "Unrestrained Sword" in the name, increment unrestrained_sword_count
        if (is_unrestrained_sword(card_id) || this.players[0].unrestrained_sword_clear_heart_stacks > 0) {
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
    trigger_card(card_id, idx) {
        this.indent();
        this.players[0].trigger_depth += 1;
        const prev_triggering_idx = this.players[0].currently_triggering_card_idx;
        const prev_triggering_id = this.players[0].currently_triggering_card_id;
        const prev_bonus_atk_amt = this.players[0].bonus_atk_amt;
        const prev_bonus_dmg_amt = this.players[0].bonus_dmg_amt;
        const prev_bonus_rep_amt = this.players[0].bonus_rep_amt;
        var card = swogi[card_id];
        this.players[0].currently_triggering_card_idx = idx;
        this.players[0].currently_triggering_card_id = card_id;
        this.players[0].bonus_atk_amt = 0;
        this.players[0].bonus_rep_amt = 0;
        this.do_cloud_sword_softheart(card_id);
        this.do_action(card.actions);
        this.do_unrestrained_sword_count(card_id);
        this.players[0].currently_triggering_card_idx = prev_triggering_idx;
        this.players[0].currently_triggering_card_id = prev_triggering_id;
        this.players[0].bonus_atk_amt = prev_bonus_atk_amt;
        this.players[0].bonus_dmg_amt = prev_bonus_dmg_amt;
        this.players[0].bonus_rep_amt = prev_bonus_rep_amt;
        this.players[0].trigger_depth -= 1;
        this.unindent();
    }
    play_card(card_id, idx) {
        this.players[0].this_card_attacked = false;
        this.players[0].sword_intent_flow_mode = false;
        this.players[0].this_card_chases = 0;
        this.players[0].currently_playing_card_idx = idx;
        this.trigger_card(card_id, idx);
        this.do_cloud_sword_chain_count(card_id);
        // if we chased 1 or more times during this card, let's regard that as 1 chase for now...
        if (this.players[0].this_card_chases > 0) {
            // TODO: entangle, predicament, etc.
            this.players[0].chases += 1;
            this.log("incremented chases to " + this.players[0].chases);
        }
        this.reduce_idx_x_by_c(0, "unrestrained_sword_clear_heart_stacks", 1);
        this.players[0].currently_playing_card_idx = undefined;
    }
    advance_next_card_index() {
        for (var i=0; i<this.players[0].cards.length; i++) {
            this.players[0].next_card_index += 1;
            if (this.players[0].next_card_index >= this.players[0].cards.length) {
                this.players[0].next_card_index = 0;
            }
            if (this.players[0].can_play[this.players[0].next_card_index]) {
                return;
            }
        }
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
    do_def_decay() {
        // def lost is is def*def_decay / 100, rounded up
        const prev_def = this.players[0].def;
        var def_decay = 50;
        if (this.players[0].moon_water_sword_formation_stacks > 0) {
            def_decay = 0;
            this.reduce_idx_x_by_c(0, "moon_water_sword_formation_stacks", 1);
        }
        const amt = Math.ceil(this.players[0].def * def_decay / 100);
        this.reduce_idx_x_by_c(0, "def", amt);
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
    do_internal_injury() {
        if (this.players[0].internal_injury > 0) {
            this.reduce_my_hp(this.players[0].internal_injury);
        }
    }
    sim_turn() {
        this.players[0].chases = 0;
        this.players[0].this_turn_attacked = false;
        this.do_def_decay();
        this.reduce_idx_x_by_c(0, "metal_spirit_iron_bone_stacks", 1);
        this.reduce_idx_x_by_c(0, "water_spirit_dive_stacks", 1);
        this.do_spirit_gather_citta_dharma();
        this.do_next_turn_def();
        this.do_regen();
        this.do_internal_injury();
        var action_idx = 0;
        while (action_idx <= this.players[0].chases && action_idx <= this.players[0].max_chases) {
            if (action_idx > 0) {
                this.log("chase!!");
            }
            action_idx += 1;
            if (!this.can_play_a_card()) {
                this.log("can't play any card :( ending turn");
                break;
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
            if (this.players[0].qi < qi_cost) {
                this.gain_qi_to_afford_card();
                this.log("player 0 gained qi instead of playing " + card.name + ". They now have " + this.players[0].qi + "/" + qi_cost + " qi");
            } else {
                if (qi_cost > 0) {
                    this.reduce_idx_x_by_c(0, "qi", qi_cost);
                    this.log("player 0 spent " + qi_cost + " qi to play " + card.name + ".");
                } else {
                    this.log("player 0 is playing " + format_card(card_id));
                }
                this.play_card(card_id, this.players[0].next_card_index);
                this.log("player 0 finished playing " + card.name);
                this.advance_next_card_index();
            }
        }
        this.reduce_idx_x_by_c(0, "entangle", 1);
        this.reduce_idx_x_by_c(0, "flaw", 1);
        this.reduce_idx_x_by_c(0, "weaken", 1);
        // stuff like sword_in_sheathed goes down here
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
        if (amt < 0) {
            this.log("error: amt is negative: " + amt);
            this.crash();
        }
        if (amt === 0) {
            return 0;
        }
        const prev_hp = this.players[idx].hp;
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
    increase_idx_x_by_c(idx, x, c) {
        if (typeof this.players[idx][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        if (x === "hp") {
            return this.increase_idx_hp(idx, c);
        }
        if (c < 0) {
            this.log("error: c is negative: " + c);
            this.crash();
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
            dmg += this.players[0].bonus_atk_amt;
            dmg += this.players[0].this_card_sword_intent;
            dmg += this.players[0].increase_atk;
            dmg -= this.players[0].decrease_atk;
            dmg += this.players[1].wound;
            if (this.players[1].metal_spirit_iron_bone_stacks > 0) {
                dmg -= 5;
            }
            if (this.players[1].water_spirit_dive_stacks > 0) {
                pct_multiplier -= 40;
            }
            if (this.players[0].weaken > 0) {
                pct_multiplier -= 40;
            }
            if (this.players[1].flaw > 0) {
                pct_multiplier += 40;
            }
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
            if (damage_actually_dealt_to_hp > 0) {
                this.players[0].this_atk_injured = true;
                if (this.players[0].unrestrained_sword_zero_stacks > 0) {
                    if (is_unrestrained_sword(this.players[0].currently_triggering_card_id) ||
                            (this.players[0].unrestrained_sword_clear_heart_stacks > 0 && this.players[0].trigger_depth === 1)) {
                        var healing_amt = Math.floor(damage_actually_dealt_to_hp * this.players[0].unrestrained_sword_zero_stacks / 100);
                        this.heal(healing_amt);
                    }
                }
            }
        }
    }
    atk(dmg) {
        var ignore_def = false;
        if (this.players[0].ignore_def > 0) {
            this.reduce_idx_x_by_c(0, "ignore_def", 1);
            ignore_def = true;
            this.log("ignoring def for this atk. " + this.players[0].ignore_def + " ignore def remaining");
        }
        this.deal_damage_inner(dmg, ignore_def, true);
    }
    cloud_hit(arr) {
        if (this.players[0].cloud_sword_chain_count > 0) {
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
    for_each_x_add_c_pct_y(x, c, y) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            this.crash();
        }
        if (typeof this.players[0][y] !== "number") {
            this.log("error: " + y + " is not a number");
            this.crash();
        }
        const to_gain = Math.floor(this.players[0][x] * c / 100);
        this.increase_idx_x_by_c(0, y, to_gain);
    }
    for_each_x_add_c_y(x, c, y) {
        this.for_each_x_add_c_pct_y(x, c*100, y);
    }
    for_each_x_add_y(x, y) {
        this.for_each_x_add_c_y(x, 1, y);
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
    heal(amt) {
        this.increase_my_hp(amt);
    }
    next_turn_def(amt) {
        this.increase_idx_x_by_c(0, "next_turn_def", amt);
    }
    chase() {
        this.increase_idx_x_by_c(0, "this_card_chases", 1);
    }
    reduce_enemy_x_by_c(x, c) {
        this.reduce_idx_x_by_c(1, x, c);
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
        // TODO: reduce a random debuff by amt
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
