import {
    GameState,
    card_name_to_id_fuzzy,
    swogi,
    format_card,
    CHARACTER_ID_TO_NAME,
    guess_character
} from "./gamestate.js";
import os from 'os';

// a generator that takes an array and k and generates all k-combinations of the array's elements
function* k_combinations(arr, k) {
    if (k === 0) {
        yield [];
        return;
    }
    if (arr.length < k) {
        return;
    }
    let head = arr[0];
    let tail = arr.slice(1);
    for (let subcombo of k_combinations(tail, k-1)) {
        yield [head, ...subcombo];
    }
    for (let subcombo of k_combinations(tail, k)) {
        yield subcombo;
    }
}

const copies_to_levels = [
    [],
    [[3]],
    [[3,3]],
    [[3,2,2]],
    [[3,2,1,1],[2,2,2,2]],
];
const p5_copies_to_levels = [
    [],
    [[3]],
    [[3,2]],
    [[3,1,1],[2,2,2]],
    [[2,2,1,1]],
];
const meru_copies_to_levels = [
    [],
    [[3],[2],[1]],
    [[3,3],[3,2],[3,1],[2,2],[2,1],[1,1]],
    [[3,2,2],[3,2,1],[3,1,1],[2,2,2],[2,2,1],[2,1,1],[1,1,1]],
];
const zongzi_ids = [];
// for each key in swogi, if it starts with 8 and ends with 3, add it to zongzi_ids
for (let key in swogi) {
    if (key.startsWith("8") && key.endsWith("3") && ((0+key[2])>1)) {
        zongzi_ids.push(key);
    }
}
console.log("zongzi_ids: " + zongzi_ids);

function upgradedd(deck) {
    let ret = [];
    for (let card_id of deck) {
        let new_card_id = card_id.slice(0, -1) + "3";
        ret.push(new_card_id);
    }
    // sort the deck
    ret.sort();
    return ret;
}

function sortedd(deck) {
    let ret = [];
    for (let card_id of deck) {
        let new_card_id = card_id;
        ret.push(new_card_id);
    }
    // sort the deck
    ret.sort();
    return ret;
}

function upgradestringifiedd(deck) {
    const ret = upgradedd(deck);
    return ret.join();
}

function stringifiedd(deck) {
    const ret = sortedd(deck);
    return ret.join();
}

function str_to_arr(str) {
    return str.split(",");
}

// read the contents of blah.json
//const fs = require('fs');
//const data = fs.readFileSync('blah.json');
//const blah = JSON.parse(data);
const blah = {};

// a generator that takes a deck of max level cards and downgrades some cards if needed
function* downgraded(max_level_deck) {
    let cards = [];
    let copies = [];
    let idx = 0;
    let sofar = [];
    for (let card_id of max_level_deck) {
        // if it's in cards, increment copies
        if (cards.includes(card_id)) {
            copies[cards.indexOf(card_id)] += 1;
        } else {
            // if it's not in cards, add it to cards and set copies to 1
            cards.push(card_id);
            copies.push(1);
        }
    }
    for (let result of downgrade_inner(cards, copies, sofar, idx)) {
        yield result;
    }
}

function* downgrade_inner(cards, copies, sofar, idx) {
    if (idx === cards.length) {
        yield sofar;
        return;
    }
    let card_id = cards[idx];
    //console.log("cards: " + cards);
    //console.log("copies: " + copies);
    //console.log("sofar: " + sofar);
    //console.log("idx: " + idx);
    let copy = copies[idx];
    let my_copies_to_levels = copies_to_levels;
    if (card_id === "804063") {
        my_copies_to_levels = meru_copies_to_levels;
    } else if (card_id[2] === "5") {
        my_copies_to_levels = p5_copies_to_levels;
    }
    if (copy >= my_copies_to_levels.length) {
        return;
    }
    for (let levels_arr of my_copies_to_levels[copy]) {
        let new_sofar = sofar.slice();
        for (let level of levels_arr) {
            // trim the last digit of the card_id and replace it with the level
            const new_card_id = card_id.slice(0, -1) + level;
            new_sofar.push(new_card_id);
        }
        for (let result of downgrade_inner(cards, copies, new_sofar, idx+1)) {
            yield result;
        }
    }
}

// a generator that takes a deck of zongzi and generates all adjacent decks of zongzi
function* adjacent_decks(deck, small_radius) {
    // for each zongzi_id, make a bigger deck containing deck + zongzi_id
    for (let zongzi_id of zongzi_ids) {
        const bigger_deck = deck.slice();
        bigger_deck.push(zongzi_id);
        for (let subcombo of k_combinations(bigger_deck, 8)) {
            for (let downgraded_subcombo of downgraded(subcombo)) {
                yield downgraded_subcombo;
            }
        }
    }
    // for each two zongzi_id's, make a bigger deck containing deck + zongzi_id_a + zongzi_id_b
    if (!small_radius) {
    for (let zongzi_id_a of zongzi_ids) {
        for (let zongzi_id_b of zongzi_ids) {
            const bigger_deck = deck.slice();
            bigger_deck.push(zongzi_id_a);
            bigger_deck.push(zongzi_id_b);
            for (let subcombo of k_combinations(bigger_deck, 8)) {
                for (let downgraded_subcombo of downgraded(subcombo)) {
                    yield downgraded_subcombo;
                }
            }
        }
    }
    }
}

let riddles = {};
function fixup_deck(deck) {
    for (let i=0; i<deck.length; i++) {
        if (swogi[deck[i]] == undefined) {
            deck[i] = card_name_to_id_fuzzy(deck[i]);
        }
    }
}

const deck_to_hp = blah;
const searched_from_deck = {};

function handle_response(riddle, response) {
    const winning_decks = response.winning_decks;
    const winning_margins = response.winning_margins;
    const winning_logs = response.winning_logs;
    console.log("got response with " + winning_decks.length + " winning decks");
    for (let i=0; i<winning_decks.length; i++) {
        if (winning_margins[i] > riddle.best_winning_margin) {
            riddle.best_winning_margin = winning_margins[i];
            for (let j=0; j<winning_decks[i].length; j++) {
                winning_decks[i][j] = format_card(winning_decks[i][j]);
            }
            console.log(winning_logs[i].join("\n"));
            //const deck_str = stringifiedd(winning_decks[i]);
            //console.log("\"" + deck_str + "\": "+winning_margins[i]+",");
            //deck_to_hp[deck_str] = winning_margins[i];
            console.log("winning deck: " + JSON.stringify(winning_decks[i]));
            console.log("winning margin: " + winning_margins[i]);
        }
    }
    riddle.try_idx += response.try_idx;
    console.log("handled response");
}

async function do_riddle(riddle) {
    const numCores = os.cpus().length;
    const workers = [];
    const messages_outstanding = [];

    for (let i = 0; i < numCores; i++) {
        const worker = new Worker('./worker.js');
        workers.push(worker);
        messages_outstanding.push(0);
        // Add error event listener to each worker
        worker.addEventListener('error', (event) => {
            console.error(`Error in worker ${i}:`, event.message);
        });
    }

    function createMessageHandler(workers) {
        const messageQueue = [];
        let resolvePromise = null;

        const messageHandler = (event) => {
            messageQueue.push(event.data);
            if (resolvePromise) {
                const ret = messageQueue.shift();
                messages_outstanding[ret.worker_idx] -= 1;
                resolvePromise(ret);
                resolvePromise = null;
            }
        };

        // Attach the message event listener to all workers
        workers.forEach((worker) => {
            worker.addEventListener('message', messageHandler);
        });

        return async function getFirstMessage() {
            if (messageQueue.length > 0) {
                const ret = messageQueue.shift();
                messages_outstanding[ret.worker_idx] -= 1;
                return ret;
            }

            return new Promise((resolve) => {
                resolvePromise = resolve;
            });
        };
    }
    const getMessage = createMessageHandler(workers);

    const my_idx = riddle.my_idx;
    const enemy_idx = 1 - my_idx;
    const my_cards = riddle.players[my_idx].cards;
    const enemy_cards = riddle.players[enemy_idx].cards;
    riddle.best_winning_margin = -99999;
    riddle.try_idx = 0;
    fixup_deck(my_cards);
    fixup_deck(enemy_cards);
    if (riddle.players[my_idx].character === undefined) {
        riddle.players[my_idx].character = guess_character(riddle.players[my_idx]);
    }
    if (riddle.players[enemy_idx].character === undefined) {
        riddle.players[enemy_idx].character = guess_character(riddle.players[enemy_idx]);
    }
    if (riddle.just_run) {
        riddle.players[my_idx].cards = my_cards;
        riddle.players[enemy_idx].cards = enemy_cards;
        riddle.worker_idx = 0;
        messages_outstanding[0] += 1;
        workers[0].postMessage(riddle);
    } else {
        let combo_idx = 0;
        const tried_combos = {};
        for (let combo of k_combinations(my_cards, 8)) {
        //for (let combo of adjacent_decks(my_cards, riddle.small_radius)) {
            combo_idx += 1;
            console.log("combo_idx: " + combo_idx);
            // sort the combo
            combo.sort();
            let combo_id = combo.join(",");
            //if (deck_to_hp[combo_id] !== undefined) {
            //   continue;
            //}
            if (tried_combos[combo_id]) {
                continue;
            }
            tried_combos[combo_id] = true;
            // if this combo has 3 or more continuous/consumption cards, skip it
            let normal_attack_count = 0;
            let concon_count = 0;
            for (let i=0; i<combo.length; i++) {
                if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                    concon_count += 1;
                }
                if (swogi[combo[i]].name === "Normal Attack") {
                    normal_attack_count += 1;
                }
            }
            if (concon_count >= 3) {
                continue;
            }
            //if (normal_attack_count !== 1) {
            //    continue;
            //}
            console.log("concon_count: " + concon_count);
            // if there is a ready worker, send the message
            let worker_idx = -1;
            for (let i=0; i<numCores; i++) {
                if (messages_outstanding[i] == 0) {
                    worker_idx = i;
                    break;
                }
            }
            if (worker_idx == -1) {
                // wait for a message to come back
                let response = await getMessage();
                worker_idx = response.worker_idx;
                handle_response(riddle, response);
            }
            riddle.players[my_idx].cards = combo;
            riddle.worker_idx = worker_idx;
            console.log("sending message to worker_idx: " + worker_idx);
            messages_outstanding[worker_idx] += 1;
            workers[worker_idx].postMessage(riddle);
        }
    }
    // wait for all messages to come back
    let total_messages_outstanding = 0;
    for (let i=0; i<numCores; i++) {
        total_messages_outstanding += messages_outstanding[i];
    }
    console.log("total_messages_outstanding: " + total_messages_outstanding);
    while (total_messages_outstanding > 0) {
        let response = await getMessage();
        handle_response(riddle, response);
        total_messages_outstanding -= 1;
    }
    // shut down the workers
    for (let i = 0; i < numCores; i++) {
        workers[i].terminate();
    }
    console.log("try_idx: " + riddle.try_idx);
}
riddles["99"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 118;
    players[enemy_idx].cultivation = 102;
    players[enemy_idx].physique = 0;
    players[my_idx].hp = 133;
    players[my_idx].cultivation = 90;
    players[my_idx].physique = 0;
    players[my_idx].cards = [
        "kun wu metal ring",
        "metal spirit shuttle 2",
        "flying brush",
        "finishing touch 2",
        "earth spirit combine world 2",
        "flying brush",
        "earth spirit steep 2",
        "earth spirit landslide",
        //
        "earth spirit dust 2",
        "earth spirit dust",
        "earth spirit formation 2",
        "five elements heavenly marrow rhythm",
    ];
    players[enemy_idx].cards = [
        "spiritage elixir 3",
        "ultimate world formation 3",
        "wood spirit willow leaf 3",
        "wood spirit fragrant 2",
        "wood spirit forest guard 2",
        "wood spirit thorn 3",
        "five elements circulation 3",
        "fire spirit blazing prairie 2",
    ];
    players[enemy_idx].mark_of_five_elements_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
riddles["201"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 115;
    players[enemy_idx].cultivation = 103;
    players[enemy_idx].physique = 0;
    players[my_idx].hp = 115;
    players[my_idx].cultivation = 104;
    players[my_idx].physique = 0;
    players[my_idx].cards = [
        "kun wu metal ring",
        "metal spirit shuttle 2",
        "flying brush",
        "finishing touch 2",
        "earth spirit combine world 2",
        "flying brush",
        "earth spirit steep 2",
        "earth spirit landslide",
        //
        "earth spirit dust 2",
        "earth spirit dust",
        "earth spirit formation 2",
        "five elements heavenly marrow rhythm",
    ];
    players[enemy_idx].cards = [
        "spiritage elixir 3",
        "ultimate world formation 3",
        "wood spirit willow leaf 3",
        "wood spirit fragrant 2",
        "wood spirit forest guard 2",
        "wood spirit thorn 3",
        "five elements circulation 3",
        "fire spirit blazing prairie 2",
    ];
    players[enemy_idx].sword_in_sheathed_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
riddles["202"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 113;
    players[enemy_idx].cultivation = 76;
    players[enemy_idx].physique = 88;
    players[enemy_idx].max_physique = 93;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 115;
    players[my_idx].cultivation = 104;
    players[my_idx].physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "spirit gather citta dharma 3",
        "finishing touch 2",
        "sky delicate bracelet",
        "rule sky sword formation 3",
        "chain sword formation 2",
        "flying brush",
        "raven spirit sword 3",
        "mirror flower sword formation",
        //
        "pierce the star 3",
        "egret sword 2",
        "moon water sword 2",
        "kun spirit sword 3",
        "echo formation",
        "dharma spirit sword",
        "flying spirit shade sword 2",
    ];
    players[enemy_idx].cards = [
        "crane footwork 3",
        "devouring ancient vine 3",
        "exercise soul 2",
        "exercise soul 2",
        "exercise soul 2",
        "exercise soul",
        "exercise soul",
        "realm killing palm",
    ];
    players[enemy_idx].p3_regenerating_body_stacks = 1;
    players[enemy_idx].p4_firmness_body_stacks = 1;
    players[enemy_idx].stance_of_fierce_attack_stacks = 1;
    players[my_idx].p4_sword_rhyme_cultivate_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["202"]();
riddles["203"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 70;
    players[enemy_idx].cultivation = 85;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 129;
    players[my_idx].cultivation = 75;
    players[my_idx].physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "kun wu metal ring",
        "metal spirit shuttle 2",
        "flying brush",
        "earth spirit formation 2",
        "earth spirit combine world 2",
        "flying brush",
        "earth spirit steep",
        "earth spirit landslide",
        //
        "earth spirit dust 3",
        "earth spirit cliff 3",
        "earth spirit quicksand 2",
        "earth spirit combine world",
        "heavenly marrow rhythm 2",
    ];
    players[enemy_idx].cards = [
        "hard bamboo 3",
        "hard bamboo 3",
        "earth spirit secret seal",
        "earth spirit dust 3",
        "metal spirit shuttle 2",
        "earth spirit combine world 2",
        "metal spirit shuttle 2",
        "earth spirit steep 2",
    ];
    players[enemy_idx].flame_soul_rebirth_stacks = 1;
    players[enemy_idx].swift_burning_seal_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["203"]();
riddles["204"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 120;
    players[enemy_idx].cultivation = 119;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 115;
    players[my_idx].cultivation = 104;
    players[my_idx].physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "finishing touch 2",
        "spirit gather citta dharma 2",
        "sky delicate bracelet",
        "moon water sword 3",
        "rule sky sword formation 2",
        "flying brush 3",
        "raven spirit sword 3",
        "mirror flower sword formation 3",
        //
        "chain sword formation 2",
        "rule sky sword formation",
        "chain sword formation 3",
        "qi perfusion 3",
        "egret sword 3",
        "sky spirit tune",
    ];
    players[enemy_idx].cards = [
        "polaris 3",
        "propitious 2",
        "astral fly 3",
        "rotary 2",
        "heaven hexagram 2",
        "five thunders 3",
        "astral fly 2",
        "astral tiger 3",
    ];
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["204"]();
riddles["205"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 120;
    players[enemy_idx].cultivation = 119;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 115;
    players[my_idx].cultivation = 104;
    players[my_idx].physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "spirit gather citta dharma 2",
        "finishing touch 2",
        "sky delicate bracelet",
        "moon water sword 3",
        "rule sky sword formation 2",
        "chain sword formation 3",
        "chain sword formation 2",
        "mirror flower sword formation 3",
        //
    ];
    players[enemy_idx].cards = [
        "polaris 3",
        "propitious 2",
        "astral fly 3",
        "rotary 2",
        "heaven hexagram 2",
        "five thunders 3",
        "astral fly 2",
        "astral tiger 3",
    ];
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["205"]();
riddles["206"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 107;
    players[enemy_idx].cultivation = 79;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 107;
    players[my_idx].cultivation = 66;
    players[my_idx].physique = 85;
    players[my_idx].max_physique = 90;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "crane footwork",
        "exercise marrow 3",
        "exercise soul",
        "exercise soul",
        "exercise soul",
        "realm killing palm",
        "exercise soul",
        "exercise soul",
        "exercise marrow 3",
        "crane footwork",
        "hexproof formation",
        "hexproof formation",
    ];
    players[enemy_idx].cards = [
        "unrestrained zero 2",
        "anthomania 2",
        "echo formation 2",
        "unrestrained one 2",
        "unrestrained flame dance",
        "unrestrained two 3",
        "meru formation 2",
        "normal attack",
    ];
    players[enemy_idx].hand_count = 4;
    players[enemy_idx].pact_of_equilibrium_stacks = 1;
    players[my_idx].hand_count = 14;
    players[my_idx].pact_of_equilibrium_stacks = 1;
    players[my_idx].p4_regenerating_body_stacks = 1;
    players[my_idx].stance_of_fierce_attack_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["206"]();
riddles["207"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 97;
    players[enemy_idx].cultivation = 58;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 97;
    players[my_idx].cultivation = 55;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "spirit gather citta dharma 2",
        "centibird spirit sword",
        "giant roc spirit sword",
        "thousand evil incantation",
        "moon water sword",
        "spiritage incantation",
        "giant kun spirit sword 2",
        "mirror flower sword formation",
        "raven spirit sword 2",
        "raven spirit sword",
        "cloud sword dragon roam",
        "egret sword",
        "cloud sword pierce the star",
    ];
    players[enemy_idx].cards = [
        "spiritage formation 2",
        "great spirit 2",
        "hunter hunting hunter",
        "escape plan",
        "strike twice",
        "imposing 2",
        "extremely suspicious 2",
        "normal attack",
    ];
    players[enemy_idx].heptastar_soulstat_stacks = 1;
    players[my_idx].sword_in_sheathed_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["207"]();
riddles["208"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 111;
    players[enemy_idx].cultivation = 99;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 107;
    players[my_idx].cultivation = 53;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "spirit gather citta dharma 3",
        "divine walk fulu 2",
        "giant kun spirit sword 3",
        "raven spirit sword 2",
        "egret sword 3",
        "thousand evil incantation",
        "moon water sword 3",
        "rule sky sword 2",
        "chain sword",
        "chain sword",
        "mirror flower sword formation 3",
    ];
    players[enemy_idx].cards = [
        "sword slash 3",
        "cloud dance rhythm 3",
        "contemplate spirits rhythm 3",
        "sword intent surge",
        "thousand evil 2",
        "spirit cat chaos 2",
        "cloud sword cat paw",
        "cloud sword flash wind 3",
    ];
    players[my_idx].sword_in_sheathed_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["208"]();
riddles["209"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 119;
    players[enemy_idx].cultivation = 74;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 107;
    players[my_idx].cultivation = 80;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "rule sky sword 3",
        "thousand evil incantation",
        "dharma spirit sword",
        "spiritage incantation 2",
        "spiritage incantation 2",
        "qi perfusion 2",
        "spirit gather citta dharma 2",
        "moon water sword 2",
        "divine walk fulu",
        "chain sword",
    ];
    players[enemy_idx].cards = [
        "chord in tune",
        "sky spirit tune 3",
        "sky delicate bracelet",
        "moon water 2",
        "rule sky sword",
        "raven spirit sword 2",
        "chain sword",
        "mirror flower sword",
    ];
    players[enemy_idx].coral_sword_stacks = 1;
    players[my_idx].sword_in_sheathed_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["209"]();
riddles["210"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 109;
    players[enemy_idx].cultivation = 74;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 109;
    players[my_idx].cultivation = 80;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "rule sky sword 3",
        "thousand evil incantation",
        "dharma spirit sword",
        "spiritage incantation 3",
        "spiritage incantation 2",
        "qi perfusion 2",
        "spirit gather citta dharma 2",
        "moon water sword 2",
        "divine walk fulu 2",
        "chain sword 2",
        "chain sword",
        "raven spirit sword 2",
    ];
    players[enemy_idx].cards = [
        "metal spirit shuttle 2",
        "water spirit spring 2",
        "wood spirit willow leaf 3",
        "world smash 2",
        "gourd of leisure",
        "fire spirit flash fire 2",
        "fire spirit blazing prairie 2",
        "earth spirit dust 2",
    ];
    players[enemy_idx].mark_of_five_elements_stacks = 1;
    players[my_idx].sword_in_sheathed_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
riddles["211"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 106;
    players[enemy_idx].cultivation = 777;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 127;
    players[my_idx].cultivation = 80;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "kun wu metal ring",
        "five elements heavenly marrow rhythm 2",
        "earth spirit combine world 2",
        "flying brush 2",
        "earth spirit cliff 3",
        "earth spirit landslide",
        "earth spirit steep 3",
        "flying brush 2",
        "earth spirit formation",
        "metal spirit shuttle",
        "finishing touch",
        "earth spirit combine world"
    ];
    players[enemy_idx].cards = [
        "ultimate hexagram base",
        "heaven hexagram 3",
        "astral cide",
        "dance dragonfly 3",
        "ice spirit guard elixir 3",
        "starry moon 3",
        "fury thunder",
        "five thunders",
    ];
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["211"]();
riddles["212"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 107;
    players[enemy_idx].cultivation = 72;
    players[enemy_idx].physique = 59;
    players[enemy_idx].max_physique = 81;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 105;
    players[my_idx].cultivation = 61;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "spirit gather citta dharma 2",
        "centibird spirit sword 2",
        "moon water sword 2",
        "moon water sword",
        "giant kun spirit sword 2",
        "mirror flower sword formation 2",
        "mirror flower sword formation",
        "chain sword",
        "hard bamboo 3",
        "dharma spirit sword",
    ];
    players[enemy_idx].cards = [
        "styx agility",
        "heartbroken tune 2",
        "shura roar 2",
        "predicament 2",
        "ghost howling 3",
        "soul cleaving 3",
        "soul seizing",
        "soul seizing",
    ];
    players[enemy_idx].p3_mark_of_dark_heart_stacks = 1;
    players[enemy_idx].unwavering_soul_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["212"]();
riddles["213"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 119;
    players[enemy_idx].cultivation = 81;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 139;
    players[my_idx].cultivation = 74;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "kun wu metal ring",
        "flying brush",
        "five elements heavenly marrow rhythm 3",
        "earth spirit steep",
        "earth spirit steep 2",
        "earth spirit landslide",
        "earth spirit dust 2",
        "flying brush 2",
        "metal spirit shuttle",
        "earth spirit formation",
        "earth spirit cliff",
    ];
    players[enemy_idx].cards = [
        "polaris 3",
        "star moon folding fan",
        "astral cide 2",
        "prop omen 2",
        "astral fly",
        "astral tiger 2",
        "astral hit 2",
        "astral hit 2",
    ];
    return await do_riddle({players: players, my_idx: my_idx});
};
// gmagezxpd6
riddles["214"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 111;
    players[enemy_idx].cultivation = 93;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 115;
    players[my_idx].cultivation = 69;
    players[my_idx].physique = 85;
    players[my_idx].max_physique = 90;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "anthomania 2",
        "crane footwork 2",
        "exercise marrow 3",
        "exercise soul 3",
        "exercise marrow 2",
        "meru formation",
        "exercise marrow",
        "echo formation",
    ];
    players[enemy_idx].cards = [
        "anthomania 2",
        "unrestrained zero",
        "unrestrained sword flame dance",
        "echo formation",
        "meru formation 2",
        "unrestrained two",
        "normal attack",
        "unrestrained two 2",
    ];
    players[my_idx].stance_of_fierce_attack_stacks = 1;
    //players[enemy_idx].fire_flame_blade_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx, just_run: true});
};
//await riddles["214"]();

// gmagiw3m2p
riddles["215"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 129;
    players[enemy_idx].cultivation = 82;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 115;
    players[my_idx].cultivation = 79;
    players[my_idx].physique = 80;
    players[my_idx].max_physique = 89;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "crane footwork 2",
        "spiritage elixir 3",
        "overwhelming power",
        "exercise marrow 3",
        "surging waves 3",
        "gather intense force 2",
        "vast universe 2",
        "overwhelming force",
    ];
    players[enemy_idx].cards = [
        "kun wu metal ring 2",
        "shuttle 2",
        "finishing touch",
        "flying brush 3",
        "combine world 2",
        "flying brush",
        "steep",
        "landslide",
    ];
    // players[my_idx].stance_of_fierce_attack_stacks = 1;
    //players[enemy_idx].fire_flame_blade_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["215"]();
// gmagiw3m2p
riddles["216"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 123;
    players[enemy_idx].cultivation = 117;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 115;
    players[my_idx].cultivation = 98;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "spirit gather citta dharma 3",
        "mirror flower sword formation 2",
        "finishing touch 3",
        "sky delicate bracelet",
        "moon water sword 2",
        "rule sky sword formation 3",
        "raven spirit sword 2",
        "chain sword formation 2",
        "egret spirit sword 3",
    ];
    players[enemy_idx].cards = [
        "hexagram formacide 3",
        "heaven hexagram 3",
        "astral cide 3",
        "dance dragonfly 3",
        "flame hexagram 3",
        "ice spirit guard elixir 3",
        "dance dragonfly 3",
        "five thunders 2",
    ];
    // players[my_idx].stance_of_fierce_attack_stacks = 1;
    //players[enemy_idx].fire_flame_blade_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["216"]();
// gmagfyic13
riddles["217"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 146;
    players[enemy_idx].cultivation = 107;
    players[enemy_idx].physique = 61;
    players[enemy_idx].max_physique = 115;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 117;
    players[my_idx].cultivation = 113;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "hunter hunting hunter 3",
        "escape plan 3",
        "great spirit 3",
        "echo formation 2",
        "anthomania formation 2",
        "revitalized 3",
        "echo formation 2",
        "only traces 2",
        //"stillness citta dharma 3",
        //"propitious 2",
    ];
    players[enemy_idx].cards = [
        "crane footwork 3",
        "elusive footwork 2",
        "surging waves 3",
        "gather intense force 3",
        "vast universe 2",
        "crash fist inch force 3",
        "crash fist shocked 2",
        "crash fist shocked 2",
    ];
    // players[my_idx].stance_of_fierce_attack_stacks = 1;
    //players[enemy_idx].fire_flame_blade_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["217"]();
// gmagf0q3le
riddles["218"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 111;
    players[enemy_idx].cultivation = 96;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 107;
    players[my_idx].cultivation = 88;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "five elements heavenly marrow rhythm 3",
        "earth spirit formation 2",
        "earth spirit combine world",
        "earth spirit combine world",
        "earth spirit steep 2",
        "earth spirit steep 2",
        "echo formation 2",
        "earth spirit cliff",
        "earth spirit quicksand 3",
    ];
    players[enemy_idx].cards = [
        "ultimate world formation 2",
        "wood spirit secret seal",
        "fire spirit heart fire 2",
        "earth spirit combine world 2",
        "five elements circulation 2",
        "metal spirit secret seal",
        "cloud elixir 2",
        "wood spirit fragrant 2",
    ];
    players[my_idx].mark_of_five_elements_stacks = 1;
    players[enemy_idx].five_elements_explosion_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["218"]();
// 
riddles["219"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 119;
    players[enemy_idx].cultivation = 86;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 123;
    players[my_idx].cultivation = 76;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "divine walk fulu",
        "thousand evil 2",
        "spirit gather 2",
        "rule sky sword 2",
        "rule sky sword",
        "mirror flower sword 2",
        "chain sword 2",
        "chain sword",
        "giant kun spirit sword 3",
        "mirror flower sword",
        "spiritage incantation",
        "egret sword 2",
    ];
    players[enemy_idx].cards = [
        "metal spirit shuttle 3",
        "water spirit spring 2",
        "wood spirit willow leaf 3",
        "world smash 3",
        "gourd of leisure",
        "wood spirit thorn 3",
        "fire spirit flash fire 2",
        "earth spirit dust",
    ];
    players[my_idx].sword_in_sheathed_stacks = 1;
    players[enemy_idx].mark_of_five_elements_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["219"]();
riddles["220"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 119;
    players[enemy_idx].cultivation = 86;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 112;
    players[my_idx].cultivation = 44;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "spirit gather 3",
        "spirit gather",
        "weaken fulu",
        "reflexive sword 2",
        "cloud sword reguard",
        "giant kun sword",
        "spiritage incantation 2",
        "burst sword",
        "cloud sword pierce the star 2",
        "chain sword",
        "thunder sword",
    ];
    players[enemy_idx].cards = [
        "polaris 2",
        "star moon fan",
        "astral fly",
        "astral tiger 2",
        "water hexagram",
        "astral hit",
        "dance dragonfly 2",
        "falling thunder 2",
    ];
    players[my_idx].sword_in_sheathed_stacks = 1;
    players[enemy_idx].p2_store_qi_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["220"]();
riddles["221"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 103;
    players[enemy_idx].cultivation = 72;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 110;
    players[my_idx].cultivation = 69;
    players[my_idx].physique = 60;
    players[my_idx].max_physique = 76;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "stygian moon's changuang",
        "crash citta-dharma 2",
        "styx agility 2",
        "crash fist stygian night",
        "crash fist blink",
        "crash fist blitz 2",
        "crash fist continue",
        "crash fist inch force",
        "crash fist shocked",
        "crash fist subdue dragon 2",
        "gather intense force 2",
    ];
    players[enemy_idx].cards = [
        "spirit gather citta dharma",
        "fate reincarnates 2",
        "god star traction 2",
        "detect qi",
        "detect qi 2",
        "clear heart sword embryo 3",
        "giant kun spirit sword",
        "god opportunity reversal 2",
    ];
    players[my_idx].entering_styx_stacks = 1;
    players[my_idx].character = "dx3";
    players[enemy_idx].blade_forging_sharpness_stacks = 1;
    players[enemy_idx].qi_forging_spiritstat_stacks = 1;
    players[enemy_idx].quench_of_sword_heart_ultimate_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["221"]();
riddles["222"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 76;
    players[enemy_idx].cultivation = 100;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 117;
    players[my_idx].cultivation = 100;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "spiritage elixir 3",
        "wood fragrant 3",
        "wood forest guard 3",
        "wood thorn 2",
        "fire blazing prairie 2",
        "wood willow leaf 3",
        "wood thorn 3",
        "wood forest guard",
    ];
    players[enemy_idx].cards = [
        "earth spirit secret seal",
        "five elements heavenly marrow rhythm 3",
        "fate reincarnates 2",
        "calamity plaguin 2",
        "calamity plaguin",
        "god opportunity reversal",
        "earth spirit combine world 2",
        "earth spirit steep 2",
    ];
    players[my_idx].mark_of_five_elements_stacks = 1;
    players[enemy_idx].flame_soul_rebirth_stacks = 1;
    players[enemy_idx].swift_burning_seal_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["222"]();
riddles["223"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 110;
    players[enemy_idx].cultivation = 100;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 110;
    players[my_idx].cultivation = 80;
    players[my_idx].physique = 80;
    players[my_idx].max_physique = 85;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "heavenly forceage 3",
        "break pots and sink boats",
        "meru formation 3",
        "normal attack",
        "normal attack",
        "normal attack",
        "exercise soul 3",
        "exercise soul 2",
    ];
    players[enemy_idx].cards = [
        "hunter hunting hunter 2",
        "escape plan 3",
        "great spirit 2",
        "echo formation",
        "normal attack",
        "normal attack",
        "echo formation 2",
        "only traces 2",
    ];
    //players[my_idx].stance_of_fierce_attack_stacks = 1;
    players[enemy_idx].birdie_wind_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx, just_run: true});
};
//await riddles["223"]();
riddles["224"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 103;
    players[enemy_idx].cultivation = 77;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 107;
    players[my_idx].cultivation = 90;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "divine walk fulu",
        "spirit gather citta dharma 2",
        "rule sky sword formation 2",
        "chain sword 2",
        "chain sword",
        "giant kun spirit sword 3",
        "giant kun spirit sword",
        "centibird spirit sword 3",
        "mirror flower sword formation 2",
        "raven spirit sword 2",
        "spiritage incantation",
        "transforming spirits rhythm 2",
        "flying spirit shade sword 2",
        "dharma spirit sword",
        "thousand evil incantation",
    ];
    players[enemy_idx].cards = [
        "divine walk fulu 2",
        "hexagram formacide 3",
        "astral fly 2",
        "flame hexagram 2",
        "heaven hexagram 2",
        "thousand evil incantation",
        "dance dragonfly 2",
        "five thunders 3",
    ];
    players[my_idx].sword_in_sheathed_stacks = 1;
    players[enemy_idx].p2_divination_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
riddles["225"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 103;
    players[enemy_idx].cultivation = 77;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 107;
    players[my_idx].cultivation = 90;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "inspiration",
        "inspiration",
        "inspiration",
    ];
    players[enemy_idx].cards = [
        "divine walk fulu 2",
        "hexagram formacide 3",
        "astral fly 2",
        "flame hexagram 2",
        "heaven hexagram 2",
        "thousand evil incantation",
        "dance dragonfly 2",
        "five thunders 3",
    ];
    players[my_idx].sword_in_sheathed_stacks = 1;
    players[enemy_idx].p2_divination_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx, just_run: true});
};
//await riddles["225"]();
riddles["226"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 102;
    players[enemy_idx].cultivation = 63;
    players[enemy_idx].physique = 11;
    players[enemy_idx].max_physique = 66;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 99;
    players[my_idx].cultivation = 61;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "hunter hunting hunter",
        "motionless tutelary formation",
        "only traces",
        "escape plan",
        "drag moon in sea",
        "echo formation",
        "great spirit 2",
        "imposing 3",
    ];
    players[enemy_idx].cards = [
        "stygian moon's changuang",
        "crash citta-dharma  2",
        "styx agility",
        "crash fist stygian night",
        "crash fist blink",
        "crash fist subdue dragon 2",
        "crash fist inch force",
        "crash fist continue 3",
    ];
    players[enemy_idx].character = "dx3";
    players[enemy_idx].entering_styx_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx, just_run: true});
};
//await riddles["226"]();
riddles["227"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 113;
    players[enemy_idx].cultivation = 101;
    players[enemy_idx].physique = 11;
    players[enemy_idx].max_physique = 66;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 119;
    players[my_idx].cultivation = 95;
    players[my_idx].physique = 67;
    players[my_idx].max_physique = 105;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "chord in tune 2",
        "heartbroken tune 3",
        "crane footwork 3",
        "ghost howling 2",
        "styx agility 3",
        "concentric tune",
        "crane footwork 2",
        "soul seizing 3",
    ];
    players[enemy_idx].cards = [
        "divine walk fulu 2",
        "spirit gather citta dharma 2",
        "spiritage incantation 3",
        "cloud sword pierce the star 3",
        "thousand evil incantation 2",
        "dharma spirit sword 3",
        "normal attack",
        "normal attack",
    ];
    players[enemy_idx].sword_in_sheathed_stacks = 1;
    players[my_idx].unbounded_qi_stacks = 1;
    players[my_idx].unwavering_soul_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["227"]();
riddles["228"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 107;
    players[enemy_idx].cultivation = 85;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 107;
    players[my_idx].cultivation = 79;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "cacopoisonous formation 3",
        "spiritage formation 2",
        "extremely suspicious 3",
        "echo formation",
        "meru formation",
        "strike twice 2",
        "normal attack",
        "great spirit 2",
        "hunter hunting hunter 2",
        "heaven hexagram 2",
        "anthomania formation 2",
        "escape plan 2",
        "astral move - cide",
        //"heaven hexagram",
        //"great spirit",
    ];
    players[enemy_idx].cards = [
        "hunter hunting hunter 3",
        "escape plan 2",
        "great spirit 2",
        "imposing 2",
        "great spirit",
        "echo formation",
        "echo formation",
        "only traces 2",
    ];
    players[enemy_idx].p5_astral_eclipse_stacks = 1;
    players[my_idx].heptastar_soulstat_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["228"]();
riddles["229"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 124;
    players[enemy_idx].cultivation = 66;
    players[enemy_idx].physique = 85;
    players[enemy_idx].max_physique = 90;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 107;
    players[my_idx].cultivation = 79;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "predicament 2",
        "centibird spirit sword 2",
        "egret spirit sword 3",
        "egret spirit sword 2",
        "egret spirit sword",
        "giant roc spirit sword 3",
        "giant roc spirit sword",
        "giant kun spirit sword 2",
        "sky spirit tune 3",
        "apparition confusion",
        "spirit gather citta dharma",
    ];
    players[enemy_idx].cards = [
        "exercise soul 2",
        "exercise soul",
        "cosmos seal divine orb",
        "exercise marrow 2",
        "exercise soul",
        "exercise marrow 2",
        "realm-killing palms",
        "space spiritual field",
    ];
    players[enemy_idx].p3_regenerating_body_stacks = 1;
    players[enemy_idx].stance_of_fierce_attack_stacks = 1;
    players[my_idx].p2_store_qi_stacks = 1;
    players[my_idx].p3_store_qi_stacks = 1;
    players[my_idx].p4_store_qi_stacks = 1;
    players[my_idx].internal_injury = 2;
    players[enemy_idx].increase_atk = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["229"]();
riddles["230"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 103;
    players[enemy_idx].cultivation = 76;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 107;
    players[my_idx].cultivation = 79;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "fire spirit secret seal",
        "water spirit spring",
        "world smash 2",
        "fire spirit flash fire",
        "metal spirit iron bone 2",
        "metal spirit shuttle 2",
        "fire spirit heart fire",
        "earth spirit combine world",
        "metal spirit giant tripod 2",
        "water spirit great waves 2",
        "water spirit dive 2",
        "wood spirit forest guard",
    ];
    players[enemy_idx].cards = [
        "chord in tune",
        "illusion tune 2",
        "qi perfusion 3",
        "giant kun spirit sword 2",
        "mirror flower sword formation 3",
        "giant kun spirit sword",
        "mirror flower sword formation",
        "tremolo 3",
    ];
    players[enemy_idx].coral_sword_stacks = 1;
    players[enemy_idx].stance_of_fierce_attack_stacks = 1;
    players[my_idx].fire_spirit_generation_stacks = 1;
    players[my_idx].p3_cycle_of_five_elements_stacks = 1;
    players[my_idx].p4_mutual_growth_stacks = 1;
    players[my_idx].p5_cycle_of_five_elements_stacks = 2;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["230"]();
riddles["231"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 101;
    players[enemy_idx].cultivation = 69;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 100;
    players[my_idx].cultivation = 70;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "hexagram formacide 2",
        "hexagram formacide",
        "ice spirit guard elixir",
        "flame hexagram 2",
        "flame hexagram",
        "thunder hexagram 2",
        "thunder hexagram",
        "strike twice 2",
        "astral cide 2",
        "water hexagram",
        "dance dragonfly",
        "astral fly",
        "rotary divination hexagram",
    ];
    players[enemy_idx].cards = [
        "divine walk fulu 2",
        "transforming spirits rhythm 3",
        "divine walk fulu",
        "spiritage incantation 2",
        "thousand evil incantation 2",
        "dharma spirit sword 2",
        "qi perfusion 3",
        "mirror flower sword",
    ];
    players[enemy_idx].sword_in_sheathed_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["231"]();
riddles["232"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 99;
    players[enemy_idx].cultivation = 64;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 99;
    players[my_idx].cultivation = 61;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "centibird spirit sword 2",
        "spiritage elixir 2",
        "clear heart sword embryo 3",
        "rule sky sword formation",
        "egret spirit sword 2",
        "cloud sword pierce the star",
        "raven spirit sword",
        "normal attack",
        "giant kun spirit sword 2",
        "dharma spirit sword",
    ];
    players[enemy_idx].cards = [
        "spirit gather citta dharma 2",
        "spirit gather citta dharma 2",
        "rule sky sword formation 2",
        "spiritage incantation 2",
        "giant roc spirit sword",
        "raven spirit sword 2",
        "giant kun spirit sword",
        "mirror flower sword formation",
    ];
    players[enemy_idx].sword_in_sheathed_stacks = 1;
    players[my_idx].qi_forging_spiritstat_stacks = 1;
    players[my_idx].quench_of_sword_heart_cloud_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["232"]();
riddles["233"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 107;
    players[enemy_idx].cultivation = 78;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 99;
    players[my_idx].cultivation = 61;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "Fate Reincarnates",
        "unrestrained zero 2",
        "unrestrained flame dance",
        "calamity plaguin 2",
        "good omen",
        "unrestrained two 2",
        "cloud sword dragon roam 2",
        "unrestrained two 2",
        "everything goes way 2",
        "unrestrained one",
    ];
    players[enemy_idx].cards = [
        "divine walk fulu 2",
        "spirit gather citta dharma 2",
        "transforming spirits rhythm 3",
        "rule sky sword formation 3",
        "spiritage incantation 2",
        "chain sword formation",
        "thousand evil incantation 2",
        "dharma spirit sword 2",
    ];
    players[enemy_idx].sword_in_sheathed_stacks = 1;
    players[my_idx].fire_flame_blade_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["233"]();
riddles["234"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 109;
    players[enemy_idx].cultivation = 69;
    players[enemy_idx].physique = 76;
    players[enemy_idx].max_physique = 81;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 108;
    players[my_idx].cultivation = 80;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "fire spirit formation 2",
        "earth spirit formation 2",
        "fire spirit flash fire",
        "fire spirit rhythm earth 3",
        "five elements circulation 2",
        "earth spirit combine world",
        "lava seal 2",
        "lava seal",
        "fire spirit formation",
    ];
    players[enemy_idx].cards = [
        "stygian moon's changuang",
        "shura roar",
        "styx agility",
        "gone crazy",
        "crane footwork 2",
        "strength driven mad",
        "soul cleaving 3",
        "soul seizing",
    ];
    players[enemy_idx].entering_styx_stacks = 1;
    players[my_idx].p3_mutual_growth_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["234"]();
riddles["235"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 111;
    players[enemy_idx].cultivation = 69;
    players[enemy_idx].physique = 76;
    players[enemy_idx].max_physique = 81;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 117;
    players[my_idx].cultivation = 99;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "step moon into cloud 2",
        "cloud sword softheart 2",
        "cloud sword flash wind 2",
        "cloud sword sunset glow",
        "cloud sword dragon roam 2",
        "cloud sword dawn 2",
        "cloud sword dragon roam",
        "cloud sword step lightly",
        "cloud sword moon shade 2",
    ];
    players[enemy_idx].cards = [
        "heavenly forceage 3",
        "unrestrained zero 3",
        "unrestrained flame dance",
        "unrestrained two 3",
        "meru formation 2",
        "normal attack",
        "normal attack",
        "unrestrained two 2",
    ];
    players[enemy_idx].fire_flame_blade_stacks = 1;
    players[enemy_idx].drift_ice_blade_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["235"]();
riddles["236"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 107;
    players[enemy_idx].cultivation = 85;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 107;
    players[my_idx].cultivation = 76;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "spirit gather citta dharma 2",
        "dharma spirit sword 2",
        "rule sky sword formation 2",
        "chain sword 2",
        "spiritage incantation 2",
        "spiritage incantation 2",
        "moon water sword 3",
        "thousand evil incantation",
        "giant kun spirit sword 3",
        "giant kun spirit sword 2",
        "emptiness sword formation",
        "mirror flower sword formation 3",
        "mirror flower sword formation",
        "rule sky sword formation",
        "normal attack",
    ];
    players[enemy_idx].cards = [
        "finishing touch 2",
        "heaven hexagram",
        "astral cide 2",
        "drag moon in sea 2",
        "hunter hunting hunter 2",
        "hunter becomes preyer",
        "drag moon in sea",
        "escape plan 2",
    ];
    players[enemy_idx].p2_divination_stacks = 1;
    players[enemy_idx].act_underhand_stacks = 1;
    players[my_idx].sword_in_sheathed_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["236"]();
riddles["237"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 101;
    players[enemy_idx].cultivation = 59;
    players[enemy_idx].physique = 67;
    players[enemy_idx].max_physique = 72;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 103;
    players[my_idx].cultivation = 65;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "perfectly planned 3",
        "star moon folding fan",
        "starry moon 2",
        "astral tiger 2",
        "astral hit",
        "starry moon",
        "astral hit",
        "astral hit",
        "normal attack",
    ];
    players[enemy_idx].cards = [
        "meditation of xuan",
        "elusive footwork",
        "ghost howling 2",
        "soul cleaving",
        "bearing the load 2",
        "bearing the load",
        "soul seizing",
        "soul seizing",
    ];
    players[enemy_idx].zen_mind_forging_body_stacks = 1;
    players[my_idx].rest_and_outwit_stacks = 1;
    players[my_idx].p3_stargaze_stacks = 1;
    players[my_idx].star_moon_folding_fan_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["237"]();
riddles["238"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 1;
    players[enemy_idx].cultivation = 0;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = 10000;
    players[my_idx].hp = 1;
    players[my_idx].cultivation = 0;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = 10000;
    players[my_idx].cards = [
        // "salted egg yolk zongzi 3",
        // "salted egg yolk zongzi 3",
        // "pungent zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "double plum zongzi 3",
        // "assorted meat zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "pickled mustard zongzi 3",

        // "crystal ice zongzi 3",
        // "shura zongzi 3",
        // "crystal ice zongzi 3",
        // "shura zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "shura zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "spirit zongzi 3",

        // "crystal ice zongzi 3",
        // "shura zongzi 3",
        // "crystal ice zongzi 3",
        // "shura zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "spirit zongzi 3",
        // "double plum zongzi 3",
        // "double plum zongzi 3",

        // "crystal ice zongzi 3",
        // "double plum zongzi 3",
        // "shura zongzi 3",
        // "crystal ice zongzi 3",
        // "spirit zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "double plum zongzi 2",
        // "shura zongzi 2",
        // "water combined zongzi 3",
        // "water combined zongzi 2",
        // "fresh fruit zongzi 3",
        // "fresh fruit zongzi 3",

        "crystal ice zongzi",
        "crystal ice zongzi",
        "sour bamboo shoot zongzi",
        "sour bamboo shoot zongzi",
        "shura zongzi",
        "pungent zongzi",
        "spirit zongzi",
        "alkaline water zongzi",
        "double plum zongzi",
        "shura zongzi",
    ];
    players[enemy_idx].cards = [
        "meditation of xuan",
        "elusive footwork",
        "ghost howling 2",
        "soul cleaving",
        "bearing the load 2",
        "bearing the load",
        "soul seizing",
        "soul seizing",
    ];
    return await do_riddle({players: players, my_idx: my_idx, zongzi: true});
};
//await riddles["238"]();
riddles["239"] = async () => {
    let try_idx = 0;
    while (true) {
        // find the highest value deck in deck_to_hp
        // that is not also in seached_from_deck
        let deck = null;
        let best_value = 0;
        let deck_up_str = null;
        let deck_contains_meru = false;
        try_idx = try_idx + 1;
        const meru_ok = (try_idx % 5) === 0;
        for (const [key, value] of Object.entries(deck_to_hp)) {
            if (value <= best_value) {
                continue;
            }
            const deck_arr = upgradedd(str_to_arr(key));
            deck_contains_meru = false;
            for (const card of deck_arr) {
                if (card === "804063") {
                    deck_contains_meru = true;
                }
            }
            if (deck_contains_meru && value <= 1301 && !meru_ok) {
                continue;
            }
            const up_str = stringifiedd(deck_arr);
            if (searched_from_deck[up_str]) {
                continue;
            }
            deck = deck_arr;
            best_value = value;
            deck_up_str = up_str;
        }
        deck_contains_meru = false;
        // search the deck for meru ("804063")
        for (const card of deck) {
            if (card === "804063") {
                deck_contains_meru = true;
            }
        }
        searched_from_deck[deck_up_str] = true;
        const players = [{},{}];
        const my_idx = 0;
        const enemy_idx = 1 - my_idx;
        players[enemy_idx].hp = 1;
        players[enemy_idx].cultivation = 0;
        players[enemy_idx].physique = 0;
        players[enemy_idx].max_physique = 0;
        players[enemy_idx].max_hp = 10000;
        players[my_idx].hp = 1;
        players[my_idx].cultivation = 0;
        players[my_idx].physique = 0;
        players[my_idx].max_physique = 0;
        players[my_idx].max_hp = 10000;
        players[my_idx].cards = deck;
        players[enemy_idx].cards = [
            "meditation of xuan",
            "elusive footwork",
            "ghost howling 2",
            "soul cleaving",
            "bearing the load 2",
            "bearing the load",
            "soul seizing",
            "soul seizing",
        ];
        await do_riddle({players: players, my_idx: my_idx, zongzi: true, small_radius: false});
    }
};
//await riddles["239"]();
riddles["240"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 107;
    players[enemy_idx].cultivation = 90;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 107;
    players[my_idx].cultivation = 80;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "divine walk fulu",
        "spirit gather citta dharma 3",
        "spirit gather citta dharma",
        "rule sky sword formation 3",
        "chain sword 2",
        "chain sword",
        "mirror flower sword formation 3",
        "giant kun spirit sword",
        "moon water sword 3",
        "thousand evil incantation 2",
        "cloud sword dragon roam",
    ];
    players[enemy_idx].cards = [
        "hunter hunting hunter 3",
        "escape plan 2",
        "great spirit",
        "echo formation 2",
        "normal attack",
        "normal attack",
        "echo formation 2",
        "only traces 2",
    ];
    players[my_idx].sword_in_sheathed_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["240"]();
riddles["241"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 106;
    players[enemy_idx].cultivation = 90;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 103;
    players[my_idx].cultivation = 80;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "divine walk fulu 2",
        "spirit gather citta dharma 2",
        "spirit gather citta dharma",
        "rule sky sword formation",
        "chain sword 2",
        "chain sword",
        "mirror flower sword formation 3",
        "raven spirit sword 2",
        "giant kun spirit sword 2",
        "moon water sword 2",
        "spiritage incantation 2",
        "dharma spirit sword",
    ];
    players[enemy_idx].cards = [
        "divine power elixir 2",
        "cloud sword softheart 2",
        "cloud sword dragon roam",
        "cloud sword step lightly",
        "cloud sword dragon roam",
        "cloud sword step lightly",
        "cloud sword flash wind",
        "cloud sword avalanche",
    ];
    players[my_idx].sword_in_sheathed_stacks = 1;
    players[enemy_idx].fire_flame_blade_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["241"]();
riddles["242"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 101;
    players[enemy_idx].cultivation = 54;
    players[enemy_idx].physique = 70;
    players[enemy_idx].max_physique = 75;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 101;
    players[my_idx].cultivation = 80;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "spiritage incantation 2",
        "spiritage incantation",
        "thousand evil incantation",
        "rule sky sword formation",
        "rule sky sword formation 2",
        "chain sword 2",
        "chain sword",
        "raven spirit sword 3",
        "moon water sword 3",
        "mirror flower sword formation 2",
        "mirror flower sword formation",
        "dharma spirit sword 2",
        "cloud sword pierce the star 3",
    ];
    players[enemy_idx].cards = [
        "crane footwork",
        "exercise soul",
        "exercise soul",
        "ashes phoenix",
        "frozen blood lotus 3",
        "crane footwork",
        "realm-killing palms",
        "realm-killing palms",
    ];
    players[my_idx].sword_in_sheathed_stacks = 1;
    players[enemy_idx].p2_regenerating_body_stacks = 1;
    players[enemy_idx].p3_regenerating_body_stacks = 1;
    players[enemy_idx].stance_of_fierce_attack_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["242"]();
riddles["243"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 104;
    players[enemy_idx].cultivation = 62;
    players[enemy_idx].physique = 56;
    players[enemy_idx].max_physique = 71;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 104;
    players[my_idx].cultivation = 60;
    players[my_idx].physique = 59;
    players[my_idx].max_physique = 71;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "stygian moon's changuang",
        "crash footwork",
        "crane footwork 3",
        "crash fist - stygian night",
        "crash fist - blink",
        "crash fist - subdue dragon 2",
        "realm-killing palms 2",
        "ghost howling",
        "styx agility",
        "soul cleaving 2",
        "shura roar 2",
        "crash fist - shocked",
        "crash fist - inch force",
        "soul seizing",
    ];
    players[enemy_idx].cards = [
        "crane footwork 2",
        "elusive footwork 3",
        "surging waves",
        "gather intense force 2",
        "vast universe",
        "mighty force 2",
        "crash fist shocked 2",
        "crash fist continue 2",
    ];
    players[my_idx].entering_styx_stacks = 1;
    players[enemy_idx].p3_full_of_force_stacks = 1;
    players[enemy_idx].p5_full_of_force_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["243"]();
riddles["244"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 1;
    players[enemy_idx].cultivation = 0;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = 10000;
    players[my_idx].hp = 1;
    players[my_idx].cultivation = 0;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = 10000;
    players[my_idx].cards = [
        // "salted egg yolk zongzi 3",
        // "salted egg yolk zongzi 3",
        // "pungent zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "double plum zongzi 3",
        // "assorted meat zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "pickled mustard zongzi 3",

        // "crystal ice zongzi 3",
        // "shura zongzi 3",
        // "crystal ice zongzi 3",
        // "shura zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "shura zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "spirit zongzi 3",

        // "crystal ice zongzi 3",
        // "shura zongzi 3",
        // "crystal ice zongzi 3",
        // "shura zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "spirit zongzi 3",
        // "double plum zongzi 3",
        // "double plum zongzi 3",

        // "crystal ice zongzi 3",
        // "double plum zongzi 3",
        // "shura zongzi 3",
        // "crystal ice zongzi 3",
        // "spirit zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "sour bamboo shoot zongzi 3",
        // "double plum zongzi 2",
        // "shura zongzi 2",
        // "water combined zongzi 3",
        // "water combined zongzi 2",
        // "fresh fruit zongzi 3",
        // "fresh fruit zongzi 3",

        "803042",
        "803042",
        "803043",
        "803063",
        "804043",
        "805033",
        "805043",
        "805053"
    ];
    players[enemy_idx].cards = [
        "meditation of xuan",
        "elusive footwork",
        "ghost howling 2",
        "soul cleaving",
        "bearing the load 2",
        "bearing the load",
        "soul seizing",
        "soul seizing",
    ];
    return await do_riddle({players: players, my_idx: my_idx, zongzi: true});
};
//await riddles["244"]();
riddles["245"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 109;
    players[enemy_idx].cultivation = 62;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 111;
    players[my_idx].cultivation = 99;
    players[my_idx].physique = 80;
    players[my_idx].max_physique = 91;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "stygian moon's changuang 2",
        "shura roar 2",
        "crane footwork 2",
        //"styx agility",
        "styx agility",
        "ghost howling 2",
        //"soul cleaving 2",
        "crane footwork",
        "soul seizing 2",
        "soul cleaving",
        "soul cleaving",
    ];
    players[enemy_idx].cards = [
        "hunter hunting hunter 3",
        "escape plan 2",
        "great spirit",
        "echo formation",
        "normal attack",
        "normal attack",
        "echo formation 2",
        "only traces 2",
    ];
    players[my_idx].entering_styx_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["245"]();
riddles["246"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 109;
    players[enemy_idx].cultivation = 62;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 109;
    players[my_idx].cultivation = 99;
    players[my_idx].physique = 78;
    players[my_idx].max_physique = 86;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "stygian moon's changuang 2",
        "shura roar 2",
        "crane footwork 2",
        //"styx agility",
        "styx agility",
        "ghost howling 2",
        //"soul cleaving 2",
        "crane footwork",
        "soul seizing 2",
        "soul cleaving",
        "soul cleaving 2",
        //"styx agility 2",
    ];
    players[enemy_idx].cards = [
        "hexagram formacide 3",
        "echo formation",
        "echo formation",
        "flame hexagram 3",
        "propitious omen 3",
        "propitious omen",
        "five thunders 2",
        "meru formation",
    ];
    players[my_idx].entering_styx_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["246"]();
riddles["247"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 97;
    players[enemy_idx].cultivation = 56;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 97;
    players[my_idx].cultivation = 44;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "finishing touch",
        "cloud dance rhythm",
        "rule sky sword formation",
        "sword defence 3",
        "flying brush",
        "sword intent surge",
        "spirit cat chaos sword 2",
        "contemplate spirits rhythm",
        "sword slash 3",
    ];
    players[enemy_idx].cards = [
        "metal spirit shuttle 2",
        "water spirit spring",
        "gourd of leisurely",
        "world smash 2",
        "metal spirit shuttle",
        "wood spirit thorn 3",
        "fire spirit flash fire 2",
        "earth spirit dust 3",
    ];
    players[my_idx].p2_sword_rhyme_cultivate_stacks = 1;
    players[enemy_idx].mark_of_five_elements_stacks = 1;
    players[enemy_idx].p5_cycle_of_five_elements_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["247"]();
riddles["248"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 103;
    players[enemy_idx].cultivation = 56;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 124;
    players[my_idx].cultivation = 44;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "contemplate spirits rhythm 2",
        "bronze cat 2",
        "bronze cat",
        "finishing touch 2",
        "rule sky sword formation 2",
        "chain sword formation",
        "flying brush",
        "sword defence 3",
        "sword intent surge 3",
        "spirit cat chaos sword 2",
        "cloud dance rhythm",
        "entangling ancient vine 3",
    ];
    players[enemy_idx].cards = [
        "ultimate world formation",
        "water spirit seal 3",
        "wood spirit secret seal 2",
        "five elements circulation 2",
        "fire spirit blazing prairie 2",
        "five elements circulation",
        "earth spirit combine world 3",
        "metal spirit secret seal 2",
    ];
    players[enemy_idx].five_elements_explosion_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["248"]();
riddles["249"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 113;
    players[enemy_idx].cultivation = 56;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 127;
    players[my_idx].cultivation = 44;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "kun wu metal ring",
        "finishing touch 2",
        "earth spirit formation 3",
        "earth spirit combine world 2",
        "flying brush",
        "earth spirit combine world",
        "flying brush",
        "earth spirit steep 2",
        "earth spirit landslide",
        "earth spirit cliff",
        "earth spirit cliff 2",
        "earth spirit quicksand",
    ];
    players[enemy_idx].cards = [
        "starry moon 3",
        "star moon folding fan 2",
        "polaris 2",
        "astral fly 2",
        "astral hit 2",
        "astral fly",
        "astral tiger 2",
        "astral fly",
    ];
    players[my_idx].the_body_of_fierce_tiger_stacks = 1;
    players[enemy_idx].star_moon_folding_fan_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["249"]();
riddles["250"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 110;
    players[enemy_idx].cultivation = 56;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 108;
    players[my_idx].cultivation = 44;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "cloud dance rhythm 2",
        "bronze cat 2",
        "bronze cat",
        "contemplate spirits rhythm 2",
        "centibird spirit sword rhythm",
        "finishing touch 2",
        "spirit cat chaos sword 2",
        "sword defence 3",
        "rule sky sword formation 3",
        "chain sword formation",
        "chain sword formation 2",
    ];
    players[enemy_idx].cards = [
        "hexagram formacide 2",
        "flame hexagram 3",
        "heaven hexagram 2",
        "five thunders 2",
        "dance dragonfly 2",
        "thunder hexagram rhythm 2",
        "dance dragonfly 2",
        "ice spirit guard elixir 2",
    ];
    players[my_idx].p2_sword_rhyme_cultivate_stacks = 1;
    players[my_idx].p3_sword_rhyme_cultivate_stacks = 1;
    players[my_idx].p5_sword_rhyme_cultivate_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["250"]();
riddles["251"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 105;
    players[enemy_idx].cultivation = 56;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 106;
    players[my_idx].cultivation = 44;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "contemplate spirits rhythm 2",
        "cloud dance rhythm 2",
        "cloud dance rhythm",
        "rule sky sword formation 3",
        "chain sword 2",
        "chain sword",
        "bronze cat 2",
        "bronze cat",
        "sword defence 3",
        "finishing touch 2",
        "spirit cat chaos sword 2",


        // "contemplate spirits rhythm 2",
        // "rule sky sword formation 3",
        // "finishing touch 2",
        // "spirit cat chaos sword 2",
        // "cloud dance rhythm 2",
        // "chain sword",
        // "sword defence 3",
        // "chain sword 2",
    ];
    players[enemy_idx].cards = [
        "illusion tune 2",
        "chord in tune",
        "moon water sword",
        "rule sky sword formation",
        "reflexive sword 2",
        "sky delicate bracelet",
        "mirror flower sword formation 2",
        "apparition confusion",
    ];
    players[my_idx].p2_sword_rhyme_cultivate_stacks = 1;
    players[my_idx].p3_sword_rhyme_cultivate_stacks = 1;
    players[my_idx].p5_sword_rhyme_cultivate_stacks = 1;
    players[enemy_idx].coral_sword_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["251"]();
riddles["252"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 110;
    players[enemy_idx].cultivation = 56;
    players[enemy_idx].physique = 79;
    players[enemy_idx].max_physique = 84;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 104;
    players[my_idx].cultivation = 44;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "cloud dance rhythm 2",
        "cloud dance rhythm",
        "contemplate spirits rhythm 2",
        "sword defence 3",
        "finishing touch 2",
        "rule sky sword formation 2",
        "rule sky sword formation",
        "chain sword 2",
        "bronze cat 2",
        "bronze cat",
        "spirit cat chaos sword 2",
    ];
    players[enemy_idx].cards = [
        "crane footwork 2",
        "elusive footwork 2",
        "frozen snow lotus 3",
        "crane footwork",
        "exercise marrow 3",
        "surging waves 3",
        "overwhelming force 3",
        "leaf shield flower 3",
    ];
    players[my_idx].p2_sword_rhyme_cultivate_stacks = 1;
    players[my_idx].p3_sword_rhyme_cultivate_stacks = 1;
    players[my_idx].p5_sword_rhyme_cultivate_stacks = 1;
    players[enemy_idx].regen = 2;
    players[enemy_idx].stance_of_fierce_attack_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["252"]();
riddles["253"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 113;
    players[enemy_idx].cultivation = 56;
    players[enemy_idx].physique = 79;
    players[enemy_idx].max_physique = 84;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 110;
    players[my_idx].cultivation = 44;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "emptiness sword",
        "synergy sword formation 2",
        "chain sword 2",
        "chain sword",
        "chain sword",
        "synergy sword formation",
        "rule sky sword formation 2",
        "mirror flower sword formation 2",
        "moon water sword 2",
        "moon water sword",
    ];
    players[enemy_idx].cards = [
        "hunter hunting hunter 2",
        "escape plan 2",
        "great spirit 2",
        "echo formation",
        "normal attack",
        "normal attack",
        "echo formation",
        "only traces 2",
    ];
    players[my_idx].p2_sword_formation_guard_stacks = 1;
    players[enemy_idx].p3_rejuvenation_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
await riddles["253"]();
console.log("done");
