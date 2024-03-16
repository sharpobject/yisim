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
  if (card_id != base_id) {
    var base = swogi[base_id];
    if (card.name == undefined) {
      card.name = base.name;
    }
    if (card.qi_cost == undefined) {
      card.qi_cost = base.qi_cost;
    }
    if (card.hp_cost == undefined) {
      card.hp_cost = base.hp_cost;
    }
    if (card.decrease_qi_cost_by_x == undefined) {
      card.decrease_qi_cost_by_x = base.decrease_qi_cost_by_x;
    }
  }
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
        this.qi = 0;
        this.hp = 42;
        this.max_hp = 42;
        this.def = 0;
        this.this_card_sword_intent = 0; // the amount of sword intent restored by flying fang sword
        this.sword_intent = 0; // the amount of sword intent we currently have in some sense
        this.this_card_attacked = false; // whether the player has attacked with this card
        this.this_turn_attacked = false; // whether the player has attacked this turn
        this.this_card_injured = false; // whether the enemy hp has been injured by this card's atk
        this.ignore_def = 0;
        this.guard_up = 0;
        this.def_decay = 50; // the normal rate of def decay is 50%
        this.bonus_atk_amt = 0; // card-specific bonus atk
        this.bonus_rep_amt = 0; // card-specific bonus rep
        this.damage_dealt_to_hp_by_atk = 0; // for stuff that keys off how much damage went through to hp
        this.unrestrained_sword_count = 0;
        this.cloud_sword_softheart_stacks = 0;
        this.next_turn_def = 0;
        this.chases = 0;
        this.max_chases = 1;
        this.currently_playing_card_idx = undefined;
        this.currently_triggering_card_idx = undefined;
        this.cloud_sword_chain_count = 0;
        this.centibird_spirit_sword_rhythm_stacks = 0;
        this.moon_water_sword_formation_stacks = 0;
        this.spirit_gather_citta_dharma_stacks = 0;
        this.spirit_gather_citta_dharma_odd_gives_qi = true;
        this.unrestrained_sword_zero_stacks = 0;
        this.increase_atk = 0;
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
        if (arr.length == 0) {
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
        if (this[action_name] == undefined) {
            this.log("action " + action_name + " is not defined");
            process.exit(1);
        }
        this[action_name](...args);
    }
    trigger_card(card_id, idx) {
        const prev_triggering_idx = this.players[0].currently_triggering_card_idx;
        var card = swogi[card_id];
        this.players[0].currently_triggering_card_idx = idx;
        this.players[0].this_card_sword_intent = 0;
        this.players[0].this_card_injured = false;
        this.players[0].bonus_atk_amt = 0;
        this.players[0].bonus_rep_amt = 0;
        this.do_action(card.actions);
        this.players[0].currently_triggering_card_idx = prev_triggering_idx;
    }
    play_card(card_id, idx) {
        this.players[0].currently_playing_card_idx = idx;

        // if this card has "Cloud Sword" in the name, gain hp for each cloud_sword_softheart_stacks
        if (swogi[card_id].name.includes("Cloud Sword")) {
            this.heal(this.players[0].cloud_sword_softheart_stacks);
        }
        this.trigger_card(card_id, idx);
        // if this card has "Unrestrained Sword" in the name, increment unrestrained_sword_count
        if (swogi[card_id].name.includes("Unrestrained Sword")) {
            this.players[0].unrestrained_sword_count += 1;
            this.log("incremented unrestrained_sword_count to " + this.players[0].unrestrained_sword_count);
        }
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
        this.players[0].currently_playing_card_idx = undefined;
        this.players[0].this_card_attacked = false;
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
    sim_turn() {
        this.players[0].chases = 0;
        this.players[0].this_turn_attacked = false;
        if (this.players[0].spirit_gather_citta_dharma_stacks > 0) {
            var qi_gain = Math.floor(this.players[0].spirit_gather_citta_dharma_stacks / 2);
            if (this.players[0].spirit_gather_citta_dharma_stacks % 2 == 1) {
                const odd_gives_qi = this.players[0].spirit_gather_citta_dharma_odd_gives_qi;
                if (odd_gives_qi) {
                    qi_gain += 1;
                }
                this.players[0].spirit_gather_citta_dharma_odd_gives_qi = !odd_gives_qi;
            }
            this.qi(qi_gain);
            this.log("gained " + qi_gain + " qi from spirit_gather_citta_dharma_stacks");
        }
        // def is multiplied by def_decay / 100, rounded down
        const prev_def = this.players[0].def;
        var def_decay = 50;
        if (this.players[0].moon_water_sword_formation_stacks > 0) {
            def_decay = 100;
            this.players[0].moon_water_sword_formation_stacks -= 1;
            this.log("decremented moon_water_sword_formation_stacks to " + this.players[0].moon_water_sword_formation_stacks);
        }
        this.players[0].def = Math.floor(this.players[0].def * def_decay / 100);
        if (prev_def !== 0) {
            this.log("def decayed from " + prev_def + " to " + this.players[0].def);
        }
        // next_turn_def
        if (this.players[0].next_turn_def > 0) {
            this.players[0].def += this.players[0].next_turn_def;
            this.log("gained " + this.players[0].next_turn_def + " next turn def. Now have " + this.players[0].def + " def");
        }
        this.players[0].next_turn_def = 0;
        // 
        var action_idx = 0;
        while (action_idx <= this.players[0].chases && action_idx < this.players[0].max_chases) {
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
                    process.exit(1);
                }
                qi_cost = Math.max(0, qi_cost - this.players[0][x]);
            }
            if (this.players[0].qi < qi_cost) {
                this.gain_qi_to_afford_card();
                this.log("player 0 gained qi instead of playing " + card.name + ". They now have " + this.players[0].qi + "/" + qi_cost + " qi");
            } else {
                if (qi_cost > 0 || base_qi_cost > 0) {
                    this.players[0].qi -= qi_cost;
                    this.log("player 0 spent " + qi_cost + " qi to play " + card.name + ". They now have " + this.players[0].qi + " qi");
                } else {
                    this.log("player 0 is playing " + format_card(card_id));
                }
                this.indent();
                this.play_card(card_id, this.players[0].next_card_index);
                this.unindent();
                this.log("player 0 finished playing " + card.name);
                this.advance_next_card_index();
            }
        }
        // stuff like sword_in_sheathed goes down here
    }
    reduce_enemy_hp(dmg) {
        if (this.players[1].guard_up > 0) {
            this.players[1].guard_up -= 1;
            this.log("prevented " + dmg + " damage to hp with guard up. " + this.players[1].guard_up + " guard up remaining");
            return 0;
        } else {
            this.players[1].hp -= dmg;
            this.log("reduced enemy hp by " + dmg + " to " + this.players[1].hp);
            return dmg;
        }
    }
    deal_damage(dmg, ignore_def, is_atk) {
        var damage_to_def = Math.min(this.players[1].def, dmg);
        if (ignore_def) {
            damage_to_def = 0;
        }
        var damage_to_hp = dmg - damage_to_def;
        this.players[1].def -= damage_to_def;
        var damage_actually_dealt_to_hp = this.reduce_enemy_hp(damage_to_hp);
        if (is_atk) {
            this.players[0].damage_dealt_to_hp_by_atk = damage_actually_dealt_to_hp;
            if (damage_actually_dealt_to_hp > 0) {
                this.players[0].this_card_injured = true;
            }
        }
        this.log("dealt " + damage_to_def + " damage to def and " + damage_to_hp + " damage to hp");
    }
    atk(dmg) {
        // if this is the first ask of a card, exhaust sword intent
        if (this.players[0].bonus_atk_amt > 0) {
            dmg += this.players[0].bonus_atk_amt;
            this.log("gained " + this.players[0].bonus_atk_amt + " bonus atk. Now attacking for " + dmg + " damage");
        }
        if (this.players[0].sword_intent > 0) {
            this.log("consuming " + this.players[0].sword_intent + " sword intent");
            this.players[0].this_card_sword_intent += this.players[0].sword_intent;
            this.players[0].sword_intent = 0;
        }
        this.players[0].this_card_attacked = true;
        this.players[0].this_turn_attacked = true;
        dmg += this.players[0].this_card_sword_intent;
        if (this.players[0].ignore_def > 0) {
            this.players[0].ignore_def -= 1;
            this.log("ignoring def for this atk. " + this.players[0].ignore_def + " ignore def remaining");
            this.deal_damage(dmg, true, true);
        } else {
            this.deal_damage(dmg, false, true);
        }
    }
    cloud_hit(arr) {
        if (this.players[0].cloud_sword_chain_count > 0) {
            this.do_action(arr);
        }
    }
    injured(arr) {
        // injured means "if the atk so far have dealt damage to the enemy hp, do an action"
        if (this.players[0].this_card_injured) {
            this.do_action(arr);
        } else {
            this.log("no injured because the atk so far have not dealt damage to the enemy hp");
        }
    }
    def(amt) {
        this.players[0].def += amt;
        this.log("gained " + amt + " def. Now have " + this.players[0].def + " def");
    }
    qi(amt) {
        this.players[0].qi += amt;
        this.log("gained " + amt + " qi. Now have " + this.players[0].qi + " qi");
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
        this.players[0].sword_intent += amt;
        this.log("gained " + amt + " sword intent. Now have " + this.players[0].sword_intent + " sword intent");
    }
    gain_ignore_def(amt) {
        this.players[0].ignore_def += amt;
        this.log("gained " + amt + " ignore def. Now have " + this.players[0].ignore_def + " ignore def");
    }
    regain_sword_intent() {
        this.players[0].sword_intent += this.players[0].this_card_sword_intent;
        this.log("regained " + this.players[0].this_card_sword_intent + " sword intent. Now have " + this.players[0].sword_intent + " sword intent");
    }
    for_each_x_add_c_pct_y(x, c, y) {
        // x and y are the names of player properties
        // they should both be numbers
        // assert that they are both numbers
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            process.exit(1);
        }
        if (typeof this.players[0][y] !== "number") {
            this.log("error: " + y + " is not a number");
            process.exit(1);
        }
        const to_gain = Math.floor(this.players[0][x] * c / 100);
        this.players[0][y] += to_gain;
        this.log("gained " + to_gain + " " + y + " ("+c+"% of "+ x +"). Now have " + this.players[0][y] + " " + y);
    }
    for_each_x_add_c_y(x, c, y) {
        this.for_each_x_add_c_pct_y(x, c*100, y);
    }
    for_each_x_add_y(x, y) {
        this.for_each_x_add_c_y(x, 1, y);
    }
    exhaust_x_to_add_y(x, y) {
        this.for_each_x_add_y(x, y);
        this.players[0][x] = 0;
        this.log("exhausted " + x + " to add " + y);
    }
    exhaust_x_to_add_c_y(x, c, y) {
        this.for_each_x_add_c_y(x, c, y);
        this.players[0][x] = 0;
        this.log("exhausted " + x + " to add " + c + "x " + y);
    }
    if_x_at_least_c_do(x, c, arr) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            process.exit(1);
        }
        if (this.players[0][x] >= c) {
            this.do_action(arr);
        } else {
            this.log("no " + JSON.stringify(arr) + " because " + x + " is less than " + c);
        }
    }
    heal(amt) {
        const prev_hp = this.players[0].hp;
        this.players[0].hp += amt;
        if (this.players[0].hp > this.players[0].max_hp) {
            this.players[0].hp = this.players[0].max_hp;
        }
        this.log("healed " + amt + " hp. Went from " + prev_hp + " to " + this.players[0].hp);
    }
    next_turn_def(amt) {
        this.players[0].next_turn_def += amt;
        this.log("gained " + amt + " next turn def. Now have " + this.players[0].next_turn_def + " next turn def");
    }
    chase() {
        this.players[0].chases += 1;
    }
    reduce_enemy_x_by_c(x, c) {
        if (typeof this.players[1][x] !== "number") {
            this.log("error: " + x + " is not a number");
            process.exit(1);
        }
        this.players[1][x] -= c;
        if (x !== "hp" && this.players[1][x] < 0) {
            this.players[1][x] = 0;
        }
        this.log("reduced enemy " + x + " by " + c + " to " + this.players[1][x]);
    }
    continuous() {
        this.players[0].can_play[this.players[0].currently_playing_card_idx] = false;
    }
    add_c_of_x(c, x) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            process.exit(1);
        }
        this.players[0][x] += c;
        this.log("gained " + c + " " + x + ". Now have " + this.players[0][x] + " " + x);
    }
    for_each_x_up_to_c_add_y(x, c, y) {
        if (typeof this.players[0][x] !== "number") {
            this.log("error: " + x + " is not a number");
            process.exit(1);
        }
        var amt_to_add = Math.min(c, this.players[0][x]);
        this.add_c_of_x(amt_to_add, y);
    }
    reset_injured() {
        this.players[0].this_card_injured = false;
    }
    retrigger_previous_sword_formation() {
        const my_idx = this.players[0].currently_triggering_card_idx;
        var idx = my_idx - 1;
        while (idx >= 0) {
            var card_id = this.players[0].cards[idx];
            var card = swogi[card_id];
            if (card.name.includes("Sword Formation")) {
                this.log("retriggering " + card_id);
                this.trigger_card(card_id, idx);
                return;
            }
            idx -= 1;
        }
    }
}
var fuzz = false;
if (fuzz) {
    for (var i=0;; i++) {
        // now generate a random deck of 8 cards from among these keys
        var decks = [[],[]];
        for (var j=1; j<2; j++) {
            for (var j=0; j<8; j++) {
                var index = Math.floor(Math.random() * keys.length);
                decks.push(keys[index]);
            }
        }
        var game = new GameState();
        game.players[0].cards = decks[0];
        game.players[1].cards = decks[1];
        game.sim_n_turns(32);
        if (i % 10000 == 0) {
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
