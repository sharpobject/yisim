import {
    GameState,
    CHARACTER_ID_TO_NAME,
    guess_character,
    ready as gamestate_ready
} from "./gamestate_full.js";
import { format_card, swogi, ready as card_info_ready } from './card_info.js';
import { card_name_to_id_fuzzy } from './card_name_to_id_fuzzy';
import { preprocess_plz } from './preprocess.js';
import os from 'os';

await gamestate_ready;
await card_info_ready;
// import { onmessage } from './worker.js';

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
// console.log("zongzi_ids: " + zongzi_ids); 

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
    if ((card_id === "804063") || (card_id === "355033") || 
        (card_id === "375023") || (card_id === "245023")) {
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
        //if (winning_margins[i] > 10000) {
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
    const my_idx = riddle.my_idx;
    const enemy_idx = 1 - my_idx;
    const my_cards = riddle.players[my_idx].cards;
    const enemy_cards = riddle.players[enemy_idx].cards;
    riddle.best_winning_margin = -99999;
    riddle.try_idx = 0;
    fixup_deck(my_cards);
    fixup_deck(enemy_cards);
    const preprocessor_config = {};
    for (let player of riddle.players) {
        for (let key in player) {
            preprocessor_config[key] = true;
        }
        for (let card_id of player.cards) {
            preprocessor_config[card_id.slice(0, 5)] = true;
        }
    }
    preprocess_plz(preprocessor_config);

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
            let hh_count = 0;
            let stdiv_count = 0;
            let faw_count = 0;
            let stradiv_count = 0;
            let twice_count = 0;
            let concon_count = 0;
            for (let i=0; i<combo.length; i++) {
                if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                    concon_count += 1;
                }
                if (swogi[combo[i]].name === "Normal Attack") {
                    normal_attack_count += 1;
                }
                if (swogi[combo[i]].name === "Heaven Hexagram") {
                    hh_count += 1;
                }
                if (swogi[combo[i]].name === "Spiritual Divination") {
                    stdiv_count += 1;
                }
                if (swogi[combo[i]].name === "Star Trail Divination") {
                    stradiv_count += 1;
                }
                if (swogi[combo[i]].name === "Flowers And Water") {
                    faw_count += 1;
                }
                if (swogi[combo[i]].name === "Strike Twice") {
                    twice_count += 1;
                }
            }
            if (concon_count >= 3) {
                continue;
            }
            // if (stdiv_count == 0 || stradiv_count < 2 || twice_count == 0) {
            //     continue;
            // }
            console.log("combo_idx: " + combo_idx);
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

async function doo_riddle(riddle) {
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
        
        // Create fake event object
        const fakeEvent = { data: riddle };
        onmessage(fakeEvent);
    } else {
        let combo_idx = 0;
        const tried_combos = {};
        
        for (let combo of k_combinations(my_cards, 8)) {
            combo_idx += 1;
            combo.sort();
            let combo_id = combo.join(",");
            
            if (tried_combos[combo_id]) {
                continue;
            }
            tried_combos[combo_id] = true;

            let normal_attack_count = 0;
            let concon_count = 0;
            for (let i = 0; i < combo.length; i++) {
                if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                    concon_count += 1;
                }
                if (swogi[combo[i]].name === "Normal Attack") {
                    normal_attack_count += 1;
                }
                if (swogi[combo[i]].name === "Flying Brush") {
                    normal_attack_count += 1;
                }
                if (swogi[combo[i]].name === "Space Spiritual Field" && i > 5) {
                    concon_count += 99;
                }
            }
            
            if (concon_count >= 3) {
                continue;
            }
            if (normal_attack_count < 2) {
                continue;
            }
            
            console.log("combo_idx: " + combo_idx);
            console.log("concon_count: " + concon_count);

            riddle.players[my_idx].cards = combo;
            riddle.worker_idx = 0;
            
            // Create fake event object
            const fakeEvent = { data: riddle };
            await new Promise(resolve => setTimeout(resolve, 0)) 
            onmessage(fakeEvent);
        }
    }
    
    console.log("try_idx: " + riddle.try_idx);

    while(true) {
        await new Promise(resolve => setTimeout(resolve, 1));
    }
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
//await riddles["253"]();
riddles["254"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 109;
    players[enemy_idx].cultivation = 74;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 105;
    players[my_idx].cultivation = 95;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "anthomania formation 3",
        "echo formation",
        "hexagram formacide 3",
        "rotary divination hexagram",
        "heaven hexagram",
        "five thunders 2",
        "meru formation 3",
        "dance dragonfly 2",
        "thunder hexagram rhythm 2",
    ];
    players[enemy_idx].cards = [
        "divine walk fulu 2",
        "ultimate world formation 2",
        "wood spirit - peach blossom",
        "water spirit - great waves",
        "five elements circulation",
        "wood spirit - fragrant",
        "five elements circulation 2",
        "fire spirit - blazing prairie 2",
    ];
    players[enemy_idx].peach_branch_ruyi_stacks = 1;
    players[enemy_idx].mark_of_water_spirit_stacks = 1;
    players[enemy_idx].blossom_dance_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["254"]();
riddles["255"] = async () => {
    let yxb_decks = [
        {
            "pool": "hepm",
            "sect": "he",
            "cards": [
                "Devouring ancient vine 3",
                "Heaven Hexagram 3",
                "Frozen Blood Lotus 3",
                "Dance of the Dragonfly 3",
                "Qi-corrupting sunflower 3",
                "Dance of the Dragonfly 3",
                "Escape Plan 3",
                "Devouring Ancient vine 3",
            ],
        },
        {
            "pool": "hepm",
            "sect": "he",
            "cards": [
                "Heaven Hexagram 3",
                "Entangling Ancient Vine 3",
                "Astral Move - Cide 3",
                "Heaven Hexagram 2",
                "Five Thunders 3",
                "Astral Move - Fly 3",
                "Frozen Blood Lotus 3",
                "Space Spiritual Field 3",
            ],
        },
        {
            "pool": "dxel",
            "sect": "dx",
            "cards": [
                "crane footwork 3",
                "styx agility 3",
                "shura roar 3",
                "ghost howling 3",
                "soul cleaving 3",
                "soul cleaving 2",
                "crane footwork 3",
                "soul seizing 3",
            ],
        },
        {
            "pool": "dxmu",
            "sect": "dx",
            "cards": [
                "Apparition confusion 3",
                "Crane footwork 3",
                "Ruptsprite 3",
                "Crane footwork 3",
                "Ruptsprite 2",
                "Exercise marrow 3",
                "Ruptsprite 2",
                "Apparition confusion 2",
            ],
        },
        {
            "pool": "swmu",
            "sect": "sw",
            "cards": [
                "Chord In Tune 3",
                "Sky Spirit Tune (Level 3)",
                "Chord In Tune (Level 2)",
                "Inspiration Sword (Level 3)",
                "Cloud Sword - Dragon Roam (Level 3)",
                "Dharma Spirit Sword (Level 3)",
                "Normal Attack",
                "Normal Attack",
            ],
        },
        {
            "pool": "swfu",
            "sect": "sw",
            "cards": [
                "Divine Walk Fulu 3",
                "Flying Spirit Shade Sword 3",
                "Divine Walk Fulu 2",
                "Dharma Spirit Sword 3",
                "Cloud Dance Rhythm 3",
                "Burst Sword 3",
                "Burst Sword 2",
                "Burst Sword 2",
            ],
        },
        {
            "pool": "heft",
            "sect": "he",
            "cards": [
                "God Star - Traction 3",
                "Plaguin 3",
                "Plaguin 2",
                "Extremely Suspicious 3",
                "Extremely Suspicious 3",
                "Disaster of Bloodshed 3",
                "Disaster of Bloodshed 2",
                "Disaster of Bloodshed 2",
            ],
        },
        {
            "pool": "fefm",
            "sect": "fe",
            "cards": [
                "Heavenly Marrow Rhythm 3",
                "Water Spirit Formation 3",
                "Water Spirit Great Waves 3",
                "Water Spirit Dive 3",
                "Echo Formation 3",
                "Water Spirit Great Waves 3",
                "Water Spirit Combine Rivers 3",
                "Water Spirit Combine Rivers 2",
            ],
        },
        {
            "pool": "swmu",
            "sect": "sw",
            "cards": [
                "Chord in Tune 3",
                "Sky Spirit Tune 3",
                "Chord in Tune 2",
                "Dharma Spirit Sword 3",
                "Cloud Sword - Dragon Roam 3",
                "Sky Spirit Tune 3",
                "Rule Sky Sword Formation 3",
                "Dharma Spirit Sword 2",
            ],
        },
        {
            "pool": "swpm",
            "sect": "sw",
            "cards": [
                "Mirror Flower Sword Formation 3",
                "Rule Sky Sword Formation 3",
                "Hard Bamboo 3",
                "Chain Sword Formation 3",
                "Hard Bamboo 3",
                "Chain Sword Formation 2",
                "Space Spiritual Field",
                "Space Spiritual Field",
            ],
        },
        {
            "pool": "heel",
            "sect": "he",
            "cards": [
                "Heaven Hexagram 3",
                "Strike Twice 3",
                "Ice Spirit Guard Elixir 3",
                "Hunter Hunting Hunter 3",
                "Five Thunders 3",
                "Great Spirit 3",
                "Starry Moon 3",
                "Hunter Becomes Preyer 3",
            ],
        }
    ];
    let decks = [
        {
            "pool": "swfu",
            "sect": "sw",
            "cards": [
                "divine walk fulu 3",
                "spirit gather citta dharma 3",
                "rule sky sword formation 3",
                "thousand evil incantation 3",
                "chain sword 3",
                "mirror flower sword formation 3",
                "giant kun spirit sword 3",
                "chain sword 3",
            ],
        },
        {
            "pool": "swmu",
            "sect": "sw",
            "cards": [
                "chord in tune 3",
                "sky spirit tune 3",
                "chord in tune 3",
                "dharma spirit sword 3",
                "predicament 3",
                "sky spirit tune 3",
                "nine evil ruptsprite 3",
                "nine evil ruptsprite 3",
            ]
        },
    ];
    // fixup decks
    for (let deck of decks) {
        fixup_deck(deck.cards);
    }
    // fixup yxb_decks
    for (let deck of yxb_decks) {
        fixup_deck(deck.cards);
    }
    let sect_list = ["sw", "he", "fe", "dx"];
    let sects = {
        "sw": [
            "cloud sword dragon roam 3",
            "cloud sword step lightly 3",
            "flying spirit shade sword 3",
            "dharma spirit sword 3",
            "sword intent surge 3",
            "rule sky sword formation 3",
            "chain sword 3",
            "unrestrained sword zero 3",
            "cloud sword flash wind 3",
            "cloud sword moon shade 3",
            "spirit gather citta dharma 3",
            "centibird spirit sword rhythm 3",
            "giant kun spirit sword 3",
            "inspiration sword 3",
            "flow cloud chaos sword 3",
            "moon water sword 3",
            "unrestrained sword two 3",
            "unrestrained sword one 3",
            "mirror flower sword formation 3",
            "raven spirit sword 3",
            "burst sword 3",
            "cloud dance rhythm 3",
            "contemplate spirits rhythm 3",
            "qi perfusion 3",
        ],
        "he": [
            "polaris citta-dharma 3",
            "astral cide 3",
            "heaven hexagram 3",
            "five thunders 3",
            "strike twice 3",
            "great spirit 3",
            "hunter hunting hunter 3",
            "propitious omen 3",
            "astral fly 3",
            "astral tiger 3",
            "hexagram formacide 3",
            "flame hexagram 3",
            "star trail divination 3",
            "dance dragonfly 3",
            "thunder and lightning 3",
            "repel citta-dharma 3",
            "escape plan 3",
            "extremely suspicious 3",
            "starry moon 3",
            "lake hexagram 3",
            "thunder hexagram rhythm 3",
            "hunter becomes preyer 3",
            "revitalized 3",
            "astral move point 3",
        ],
        "fe": [
            "wood spirit - willow leaf 3",
            "wood spirit fragrant 3",
            "wood spirit thorn 3",
            "wood spirit forest guard 3",
            "wood spirit seal 3",
            "fire spirit blazing prairie 3",
            "fire spirit flash fire 3",
            "fire spirit heart fire 3",
            "fire spirit blast 3",
            "fire spirit seal 3",
            "earth spirit combine world 3",
            "earth spirit steep 3",
            "earth spirit quicksand 3",
            "earth spirit cliff 3",
            "earth spirit seal 3",
            "metal spirit shuttle 3",
            "metal spirit seal 3",
            "metal spirit iron bone 3",
            "metal spirit giant tripod 3",
            "metal spirit charge 3",
            "metal spirit sharp 3",
            "metal spirit heart pierce 3",
            "water spirit - great waves 3",
            "water spirit - combine river 3",
            "water spirit dive 3",
            "water spirit formation 3",
            "earth spirit formation 3",
            "metal spirit formation 3",
            "water spirit spring 3",
            "water spirit turbulent 3",
            "ultimate world formation 3",
            "five elements heavenly marrow rhythm 3",
            "world smash 3",
            "five elements circulation 3",
        ],
        "dx": [
            "crash fist blink 3",
            "crash fist shocked 3",
            "crash fist subdue dragon 3",
            "crash fist continue 3",
            "crash fist inch force 3",
            "exercise soul 3",
            "exercise marrow 3",
            "realm-killing palms 3",
            "shura roar 3",
            "soul cleaving 3",
            "gather intense force 3",
            "vast universe 3",
            "crash citta-dharma 3",
            "crane footwork 3",
            "elusive footwork 3",
            "styx agility 3",
            "soul seizing 3",
            "surging waves 3",
            "overwhelming force 3",
            "crash footwork 3",
            "crash fist truncate 3",
            "bearing the load 3",
            "ghost howling 3",
        ],
    };
    let side_job_list = ["el", "fu", "mu", "pa", "fm", "pm", "ft"];
    let side_jobs = {
        "el": [
            "cloud elixir 3",
            "exorcism elixir 3",
            "spiritage elixir 3",
            "ice spirit guard elixir 3",
        ],
        "fu": [
            "soul requiem fulu 3",
            "divine walk fulu 3",
            "thousand evil incantation 3",
            "spiritage incantation 3",
            "distubing fulu 3",
            "weaken fulu 3",
            "spirit absorb fulu 3",
            "ice incantation 3",
        ],
        "mu": [
            "predicament 3",
            "chord in tune 3",
            "apparition confusion 3",
            "nine evil ruptsprite 3",
            "concentric tune 3",
            "craze dance tune 3",
            "heartbroken tune 3",
            "sky spirit tune 3",
            "earth tune 3",
        ],
        "pa": [
            "flying brush 3",
            "inspiration 3",
        ],
        "fm": [
            "anthomania formation 3",
            "echo formation 3",
            "meru formation 3",
            "octgates formation 3",
            "motionless formation 3",
            "heavenly forceage formation 3",
            "spiritage formation 3",
            "hexproof formation 3",
        ],
        "pm": [
            "space spiritual field 3",
            "entangling ancient vine 3",
            "devouring ancient vine 3",
            "frozen blood lotus 3",
            "frozen snow lotus 3",
            "qi-seeking sunflower 3",
            "hard bamboo 3",
        ],
        "ft": [
            "observe body 3",
            "disaster of bloodshed 3",
            "Good Omen 3",
            "detect qi 3",
            "everything goes way 3",
            "God Fate - Reborn 3",
            "God Fate - Flies 3",
            "God Star - Traction 3",
            "Calamity Plaguin 3",
            "Fate Reincarnates 3",
            "God's Opportunity - Reversal 3",
        ],
    }
    let pools = {};
    let pools_list = [];
    for (const sect in sects) {
        fixup_deck(sects[sect]);
        for (const side_job in side_jobs) {
            fixup_deck(side_jobs[side_job]);
            pools[sect + side_job] = sects[sect].concat(side_jobs[side_job]);
            pools_list.push(sect + side_job);
        }
    }
    function score_deck(hero_deck, villain_deck) {
        let ret = 0;
        for (let my_idx = 0; my_idx < 2; my_idx++) {
            const players = [{},{}];
            const enemy_idx = 1 - my_idx;

            players[enemy_idx].hp = 99;
            players[enemy_idx].cultivation = 55;
            players[enemy_idx].physique = 0;
            players[enemy_idx].max_physique = 0;
            if (villain_deck.sect == "dx") {
                players[enemy_idx].physique = 61;
                players[enemy_idx].max_physique = 66;
            }
            players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
            players[my_idx].hp = 99;
            players[my_idx].cultivation = 55;
            players[my_idx].physique = 0;
            players[my_idx].max_physique = 0;
            if (hero_deck.sect == "dx") {
                players[my_idx].physique = 61;
                players[my_idx].max_physique = 66;
            }
            players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
            players[my_idx].cards = [
                ...hero_deck.cards,
            ];
            players[enemy_idx].cards = [
                ...villain_deck.cards,
            ];
            let game = new GameState();
            for (let key in players[my_idx]) {
                game.players[my_idx][key] = players[my_idx][key];
            }
            for (let key in players[enemy_idx]) {
                game.players[enemy_idx][key] = players[enemy_idx][key];
            }
            game.sim_n_turns(64);
            if (game.winner === my_idx && !game.used_randomness) {
                ret += 1;
            }
        }
        return ret;
    }
    function score(decks, deck) {
        let ret = 0;
        for (let i = 0; i < decks.length; i++) {
            ret += score_deck(deck, decks[i]);
        }
        return ret;
    }
    function score_short(decks, deck) {
        let ret = 0;
        for (let i = 0; i < decks.length; i++) {
            ret += score_deck(deck, decks[i]);
            if (i < 4 && ret < (i+1)) {
                return ret;
            }
        }
        return ret;
    }
    function shuffle(array) {
        let currentIndex = array.length;
      
        // While there remain elements to shuffle...
        while (currentIndex != 0) {
      
          // Pick a remaining element...
          let randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex--;
      
          // And swap it with the current element.
          [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
        }
      }
    function mutate(decks, deck) {
        let orig_deck = deck;
        let best_score = score(decks, deck);
        let best_cards = null;
        deck = {...deck};
        deck.cards = [...upgradedd(deck.cards)];
        // add a random card from the pool
        let pool = pools[deck.pool];
        let cards = [...deck.cards];
        let card = pool[Math.floor(Math.random() * pool.length)];
        cards.push(card);
        for (let i = 0; i < 100; i++) {
            let new_deck = {...deck};
            // shuffle the cards and pick the first 8
            shuffle(cards);
            let sub_cards = cards.slice(0, 8);
            new_deck.cards = sub_cards;
            // downgrade randomly
            let downgradings = [...downgraded(sub_cards)];
            if (downgradings.length == 0) {
                continue;
            }
            sub_cards = downgradings[Math.floor(Math.random() * downgradings.length)];
            let concon_count = 0;
            for (let i=0; i<sub_cards.length; i++) {
                if (swogi[sub_cards[i]].is_continuous || swogi[sub_cards[i]].is_consumption) {
                    concon_count += 1;
                }
            }
            if (concon_count > 2) {
                continue;
            }
            new_deck.cards = sub_cards;
            let this_score = score(decks, new_deck);
            if (this_score > best_score) {
                best_score = this_score;
                best_cards = sub_cards;
            }
        }
        if (best_cards != null) {
            console.log("mutated deck", deck, "to", best_cards);
            orig_deck.cards = best_cards;
        }
    }
    let n_junk_to_add = 10;
    while (true) {
        let new_junk = [];
        for (let qq = 0; qq < n_junk_to_add; qq++) {
            let best_score = 0;
            let best_deck = null;
            for (let i = 0; i < 100; i++) {
                // pick a random pool
                let pool = pools_list[Math.floor(Math.random() * pools_list.length)];
                let sect = pool.substring(0, 2);
                // pick 8 cards from the pool
                let cards = [];
                for (let j = 0; j < 8; j++) {
                    let card = pools[pool][Math.floor(Math.random() * pools[pool].length)];
                    cards.push(card);
                }
                cards = upgradedd(cards);
                // pick a random way of downgrading the deck
                let downgradings = [...downgraded(cards)];
                if (downgradings.length == 0) {
                    continue;
                }
                cards = downgradings[Math.floor(Math.random() * downgradings.length)];
                // if this deck has more than 2 continuous or consumption cards, skip it
                let concon_count = 0;
                for (let i=0; i<cards.length; i++) {
                    if (swogi[cards[i]].is_continuous || swogi[cards[i]].is_consumption) {
                        concon_count += 1;
                    }
                }
                if (concon_count > 2) {
                    continue;
                }
                // score the deck against the existing decks
                let hero_deck = {
                    "pool": pool,
                    "sect": sect,
                    "cards": cards,
                };
                let this_score = score(yxb_decks, hero_deck);
                if (this_score > best_score) {
                    best_score = this_score;
                    best_deck = hero_deck;
                }
            }
            if (best_deck != null) {
                new_junk.push(best_deck);
                console.log("added deck", best_deck);
            }
        }
        n_junk_to_add = 2;
        // append the new junk to the decks
        decks = decks.concat(new_junk);
        {
            for (let i = 0; i < decks.length; i++) {
                let this_score = score(yxb_decks, decks[i]);
                decks[i].score = this_score;
            }
            // sort the decks by score in descending order
            shuffle(decks);
            decks.sort((a, b) => b.score - a.score);
            console.log("best deck", decks[0]);
        }
        while (decks.length >= 20) {
            let best_score = 0;
            let best_idx = null;
            // remove the worst deck
            let worst_score = 1e99;
            let worst_idx = -1;
            for (let i = 0; i < decks.length; i++) {
                let this_score = score(yxb_decks, decks[i]);
                decks[i].score = this_score;
                if (this_score < worst_score) {
                    worst_score = this_score;
                    worst_idx = i;
                }
                if (this_score > best_score) {
                    best_score = this_score;
                    best_idx = i;
                }
            }
            console.log("best deck", decks[best_idx]);
            console.log("removing deck", decks[worst_idx]);
            if (worst_idx != -1) {
                decks.splice(worst_idx, 1);
            }
            // sort the decks by score in descending order
            decks.sort((a, b) => b.score - a.score);
        }
        // mutate a random deck
        let deck_idx = Math.floor(Math.random() * decks.length);
        let deck = decks[deck_idx];
        mutate(yxb_decks, deck);
    }



    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 109;
    players[enemy_idx].cultivation = 74;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 105;
    players[my_idx].cultivation = 95;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "anthomania formation 3",
        "echo formation",
        "hexagram formacide 3",
        "rotary divination hexagram",
        "heaven hexagram",
        "five thunders 2",
        "meru formation 3",
        "dance dragonfly 2",
        "thunder hexagram rhythm 2",
    ];
    players[enemy_idx].cards = [
        "divine walk fulu 2",
        "ultimate world formation 2",
        "wood spirit - peach blossom",
        "water spirit - great waves",
        "five elements circulation",
        "wood spirit - fragrant",
        "five elements circulation 2",
        "fire spirit - blazing prairie 2",
    ];
    players[enemy_idx].peach_branch_ruyi_stacks = 1;
    players[enemy_idx].mark_of_water_spirit_stacks = 1;
    players[enemy_idx].blossom_dance_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["255"]();
riddles["256"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 99;
    players[enemy_idx].cultivation = 74;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 99;
    players[my_idx].cultivation = 95;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "heaven hexagram 3",
        "strike twice 3",
        "ice spirit guard elixir 3",
        "hunter hunting hunter 3",
        "five thunders 3",
        "great spirit 3",
        "starry moon 3",
        "hunter becomes preyer 3",
    ];
    players[enemy_idx].cards = [
        "Heaven Hexagram 3",
        "Entangling Ancient Vine 3",
        "Astral Move - Cide 3",
        "Heaven Hexagram 2",
        "Five Thunders 3",
        "Astral Move - Fly 3",
        "Frozen Blood Lotus 3",
        "Space Spiritual Field 3",
    ];
    return await do_riddle({players: players, my_idx: my_idx, just_run: true});
};
//await riddles["256"]();
riddles["257"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 109;
    players[enemy_idx].cultivation = 88;
    players[enemy_idx].physique = 63;
    players[enemy_idx].max_physique = 91;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 115;
    players[my_idx].cultivation = 95;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "divine power elixir 3",
        "unrestrained sword zero 2",
        "unrestrained sword one 1",
        "unrestrained sword one 3",
        "unrestrained sword two 3",
        "unrestrained sword two 2",
        "unrestrained sword two 1",
        "normal attack",
    ];
    players[enemy_idx].cards = [
        "styx agility 1",
        "styx agility 1",
        "styx agility 1",
        "shura roar 2",
        "concentric tune 2",
        "concentric tune 2",
        "soul cleaving 2",
        "soul seizing 2",
    ];
    players[my_idx].p5_mad_obsession_stacks = 1;
    players[enemy_idx].p5_mark_of_dark_heart_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["257"]();
riddles["258"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 112;
    players[enemy_idx].cultivation = 82;
    players[enemy_idx].physique = 66;
    players[enemy_idx].max_physique = 86;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 113;
    players[my_idx].cultivation = 80;
    players[my_idx].physique = 56;
    players[my_idx].max_physique = 90;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "chord in tune 2",
        "predicament 1",
        "heartbroken tune 2",
        "shura roar",
        "soul seizing 2",
        "soul seizing 2",
        "concentric tune 2",
        "soul cleaving 2",
    ];
    players[enemy_idx].cards = [
        "changuang",
        "crash fist night",
        "crash citta-dharma 3",
        "crash fist inch force 3",
        "crash fist continue 2",
        "crash fist shocked 2",
        "crash fist continue",
        "crash fist shocked",
    ];
    players[my_idx].p3_mark_of_dark_heart_stacks = 1;
    players[my_idx].unwavering_soul_stacks = 1;
    players[enemy_idx].entering_styx_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["258"]();
riddles["259"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 111;
    players[enemy_idx].cultivation = 89;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 121;
    players[my_idx].cultivation = 71;
    players[my_idx].physique = 47;
    players[my_idx].max_physique = 85;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "chord in tune",
        "apparition confusion 2",
        "crane footwork 2",
        "heartbroken tune 2",
        "styx agility 2",
        "shura roar",
        "concentric tune 3",
        "soul seizing",
        "ghost howling 2",
        "ghost howling",
    ];
    players[enemy_idx].cards = [
        "divine power elixir 2",
        "cloud sword softheart 2",
        "cloud sword flash wind 2",
        "cloud sword moon shade 2",
        "cloud sword flash wind",
        "cloud sword step lightly 2",
        "cloud sword flash wind",
        "cloud sword avalanche",
    ];
    players[my_idx].unwavering_soul_stacks = 1;
    players[enemy_idx].drift_ice_blade_stacks = 1;
    players[enemy_idx].p5_rule_of_the_cloud_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["259"]();
riddles["260"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 105;
    players[enemy_idx].cultivation = 75;
    players[enemy_idx].physique = 75;
    players[enemy_idx].max_physique = 85;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 111;
    players[my_idx].cultivation = 73;
    players[my_idx].physique = 66;
    players[my_idx].max_physique = 85;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "crane footwork 2",
        "heartbroken tune 2",
        "styx agility",
        "shura roar",
        "crane footwork",
        "soul cleaving 2",
        "concentric tune",
        "soul seizing 3",
    ];
    players[enemy_idx].cards = [
        "exercise soul 2",
        "crash fist blink 2",
        "meditation of xuan",
        "crash fist shocked 3",
        "wan xuan demon breaking palm",
        "crash fist subdue dragon 3",
        "exercise marrow 2",
        "realm-killing palms 2",
    ];
    players[my_idx].p2_regenerating_body_stacks = 1;
    players[my_idx].unwavering_soul_stacks = 1;
    players[enemy_idx].zen_mind_forging_body_stacks = 1;
    players[enemy_idx].mind_body_resonance_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["260"]();
riddles["261"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 121;
    players[enemy_idx].cultivation = 91;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 126;
    players[my_idx].cultivation = 94;
    players[my_idx].physique = 65;
    players[my_idx].max_physique = 104;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "crane footwork 2",
        "elusive footwork 2",
        "surging waves 2",
        "gather intense force 2",
        "vast universe 2",
        "crash fist shocked 2",
        "crash fist inch force 2",
        "crash fist continue 3",
    ];
    players[enemy_idx].cards = [
        "polaris citta-dharma 2",
        "star moon folding fan 2",
        "astral cide 2",
        "astral fly 2",
        "starry moon 3",
        "astral fly 2",
        "astral tiger 3",
        "astral fly",
    ];
    players[enemy_idx].star_moon_folding_fan_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["261"]();
riddles["262"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 107;
    players[enemy_idx].cultivation = 77;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 111;
    players[my_idx].cultivation = 76;
    players[my_idx].physique = 74;
    players[my_idx].max_physique = 85;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "chord in tune 2",
        "heartbroken tune 2",
        "predicament 2",
        "shura roar 2",
        "styx agility",
        "soul cleaving",
        "styx agility",
        "concentric tune 2",
        "soul seizing",
        "normal attack",
    ];
    players[enemy_idx].cards = [
        "drag moon in sea 2",
        "hunter hunting hunter",
        "lake hexagram 2",
        "great spirit 2",
        "escape plan",
        "hunter becomes preyer 2",
        "normal attack",
        "hunter hunting hunter",
    ];
    players[my_idx].unwavering_soul_stacks = 1;
    players[enemy_idx].p2_divination_stacks = 1;
    players[enemy_idx].p5_divination_stacks = 1;
    players[enemy_idx].act_underhand_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["262"]();
riddles["263"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 115;
    players[enemy_idx].cultivation = 84;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 116;
    players[my_idx].cultivation = 81;
    players[my_idx].physique = 64;
    players[my_idx].max_physique = 94;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "crane footwork 2",
        "elusive footwork 2",
        "crash citta-dharma 3",
        "surging waves",
        "crash fist inch force 3",
        "crash fist continue 2",
        "crash fist shocked 3",
        "mysterious gates devil seal tower 2",
        "gather intense force",
    ];
    players[enemy_idx].cards = [
        "five elements heavenly marrow rhythm 2",
        "water spirit formation 2",
        "water spirit spring 3",
        "water spirit great waves 2",
        "water spirit great waves 3",
        "water spirit combine rivers 2",
        "water spirit combine rivers",
        "water spirit waves",
    ];
    players[enemy_idx].mark_of_five_elements_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["263"]();
riddles["264"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 114;
    players[enemy_idx].cultivation = 91;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 115;
    players[my_idx].cultivation = 87;
    players[my_idx].physique = 67;
    players[my_idx].max_physique = 95;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "styx agility 3",
        "heartbroken tune 3",
        "crane footwork 3",
        "shura roar 3",
        "ghost howling 3",
        "soul cleaving 2",
        "concentric tune 2",
        "soul seizing 2",
        "soul seizing",
    ];
    players[enemy_idx].cards = [
        "metal spirit shuttle 2",
        "water spirit spring 3",
        "wood spirit - willow leaf 2",
        "world smash 3",
        "ice spirit guard elixir 2",
        "wood spirit thorn 3",
        "fire spirit flash fire 2",
        "earth spirit dust 3",
    ];
    players[my_idx].unwavering_soul_stacks = 1;
    players[enemy_idx].mark_of_five_elements_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["264"]();
riddles["265"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 114;
    players[enemy_idx].cultivation = 99;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 111;
    players[my_idx].cultivation = 94;
    players[my_idx].physique = 83;
    players[my_idx].max_physique = 100;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "spiritage elixir 3",
        "wood spirit fragrant 2",
        "wood spirit willow leaf 3",
        "fire spirit blast 3",
        "wood spirit forest guard 2",
        "wood spirit thorn 3",
        "wood spirit forest guard 2",
        "fire spirit blazing prairie 2",
    ];
    players[enemy_idx].cards = [
        "crane footwork 3",
        "meditation of xuan",
        "styx agility 3",
        "elusive footwork 3",
        "ghost howling 2",
        "soul cleaving 3",
        "soul cleaving 3",
        "wan xuan demon breaking palm",
    ];
    players[my_idx].mark_of_five_elements_stacks = 1;
    players[enemy_idx].zen_mind_forging_body_stacks = 1;
    players[enemy_idx].p2_regenerating_body_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["265"]();
riddles["266"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 107;
    players[enemy_idx].cultivation = 99;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 130;
    players[my_idx].cultivation = 94;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "spiritage elixir",
        "wood spirit fragrant 2",
        "wood spirit willow leaf 2",
        "five elements circulation 2",
        "fire spirit heart fire 2",
        "wood spirit forest guard 2",
        "fire spirit blazing prairie 2",
        "wood spirit thorn 3",
        "wood spirit willow leaf",
        "ice spirit guard elixir 2",
    ];
    players[enemy_idx].cards = [
        "anthomania 2",
        "unrestrained zero 1",
        "clear heart sword 3",
        "meru formation 1",
        "normal attack",
        "echo formation 2",
        "unrestrained two 2",
        "unrestrained two 2",
    ];
    players[my_idx].mark_of_five_elements_stacks = 1;
    players[enemy_idx].blade_forging_stable_stacks = 1;
    players[enemy_idx].sword_pattern_carving_intense_stacks = 1;
    players[enemy_idx].quench_of_sword_heart_unrestrained_stacks = 1;
    players[enemy_idx].p4_mad_obsession_stacks = 1;
    players[enemy_idx].round_number = 17;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["266"]();
riddles["267"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 107;
    players[enemy_idx].cultivation = 99;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 105;
    players[my_idx].cultivation = 999;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "unrestrained sword zero",
        "heavenly forceage formation 2",
        "motionless formation 2",
        "motionless formation",
        "unrestrained sword flame dance",
        "unrestrained sword one 3",
        "unrestrained sword two 2",
        "unrestrained sword two",
        "meru formation",
        "normal attack",
    ];
    players[enemy_idx].cards = [
        "spiritage elixir 3",
        "five elements heavenly marrow rhythm",
        "wood spirit fragrant 3",
        "wood spirit fragrant",
        "wood spirit forest guard 2",
        "wood spirit thorn 3",
        "wood spirit forest guard 2",
        "wood spirit bud 2",
    ];
    players[my_idx].p4_mad_obsession_stacks = 1;
    players[enemy_idx].mark_of_five_elements_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["267"]();
riddles["268"] = async () => {
    const players = [{},{}];
    const my_idx = 0;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 111;
    players[enemy_idx].cultivation = 99;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 120;
    players[my_idx].cultivation = 999;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "five elements heavenly marrow rhythm 2",
        "earth spirit formation 2",
        "earth spirit cliff 2",
        "earth spirit combine world 2",
        "earth spirit steep 3",
        "boulder seal 2",
        "earth spirit rhythm metal 2",
        "earth spirit quicksand 3",
        "earth spirit combine world",
    ];
    players[enemy_idx].cards = [
        "divine walk fulu 2",
        "qi perfusion 2",
        "divine walk fulu",
        "spiritage incantation 2",
        "spiritage incantation 2",
        "thousand evil incantation 2",
        "dharma spirit sword 2",
        "normal attack",
    ];
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["268"]();
riddles["269"] = async () => {
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 100;
    players[enemy_idx].cultivation = 99;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 133;
    players[my_idx].cultivation = 9;
    players[my_idx].physique = 0;
    players[my_idx].max_physique = 0;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    players[my_idx].cards = [
        "kun wu metal ring",
        "earth spirit formation",
        "metal spirit shuttle",
        "earth spirit combine world",
        "earth spirit dust",
        "flying brush",
        "earth spirit steep",
        "earth spirit landslide",
        "earth spirit quicksand 2",
        "earth spirit cliff",
    ];
    players[enemy_idx].cards = [
        "metal spirit shuttle",
        "water spirit spring 2",
        "wood spirit willow leaf 2",
        "world smash 3",
        "wood spirit thorn 2",
        "fire spirit flash fire 2",
        "earth spirit dust 2",
        "normal attack",
    ];
    players[my_idx].the_body_of_fierce_tiger_stacks = 1;
    players[enemy_idx].mark_of_five_elements_stacks = 1;
    return await do_riddle({players: players, my_idx: my_idx});
};
//await riddles["269"]();
riddles["270"] = async () => {
    const data = {
        "hero": {
            "cultivation": 82,
            "hp": 104,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Divine Walk Fulu",
                "Wood Spirit Secret Seal 2",
                "Wood Spirit Willow Leaf 2",
                "Fire Spirit Heart Fire 3",
                "Five Elements Circulation 2",
                "Earth Spirit Combine World 2",
                "Wood Spirit Secret Seal",
                "Wood Spirit Bud 3"
            ]
        },
        "villain": {
            "cultivation": 91,
            "hp": 111,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Ultimate Hexagram Base",
                "Hexagram Formacide 3",
                "Heaven Hexagram 2",
                "Starry Moon",
                "Fury Thunder 2",
                "Five Thunders 2",
                "Dance Of The Dragonfly 2",
                "Thunder Hexagram Rhythm 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["270"]();
riddles["271"] = async () => {
    const data = {
        "hero": {
            "cultivation": 93,
            "hp": 110,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "Only Traces 2",
                "Hunter Hunting Hunter 2",
                "Strike Twice",
                "Drag Moon In Sea 3",
                "Hunter Becomes Preyer 2",
                "Hunter Hunting Hunter",
                "Great Spirit 2",
                "Escape Plan 3"
            ]
        },
        "villain": {
            "cultivation": 95,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "God Star Traction 2",
                "Strike Twice 2",
                "Astral Move Cide 3",
                "Extremely Suspicious 3",
                "Strike Twice 3",
                "Within Reach",
                "Disaster of Bloodshed 2",
                "Disaster of Bloodshed"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["271"]();
riddles["272"] = async () => {
    const data = {
        "hero": {
            "cultivation": 92,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "Heartbroken Tune 3",
                "Polaris Citta-Dharma",
                "Chord In Tune 3",
                "Extremely Suspicious",
                "Astral Move Cide",
                "Strike Twice",
                "Within Reach",
                "Astral Move Fly",
                "Ruthless Water 2",
                "Repel Citta-Dharma"
            ]
        },
        "villain": {
            "cultivation": 95,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "Divine Walk Fulu",
                "Sword Defence 3",
                "Cloud Dance Rhythm 3",
                "Sword Intent Surge",
                "Flow Cloud Chaos Sword 3",
                "Flow Cloud Chaos Sword",
                "Dharma Spirit Sword 2",
                "Contemplate Spirits Rhythm 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p2_astral_eclipse_stacks = 1;
    hero.p3_astral_eclipse_stacks = 1;
    villain.p3_sword_rhyme_cultivate_stacks = 1;
    villain.p5_sword_rhyme_cultivate_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["272"]();
riddles["273"] = async () => {
    const data = {
        "hero": {
            "cultivation": 94,
            "hp": 126,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "God Star Traction 3",
                "Extremely Suspicious 2",
                "Fate Reincarnates",
                "Disaster of Bloodshed 2",
                "Disaster of Bloodshed 2",
                "Extremely Suspicious",
                "Strike Twice 2",
                "Within Reach"
            ]
        },
        "villain": {
            "cultivation": 88,
            "hp": 116,
            "physique": 80,
            "max_physique": 91,
            "round": 18,
            "cards": [
                "Stygian Moon's Changuang",
                "Shura Roar 3",
                "Styx Agility 2",
                "Ghost Howling 2",
                "Soul Cleaving 2",
                "Soul Cleaving",
                "Ice Spirit Guard Elixir",
                "Soul Seizing 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p2_astral_eclipse_stacks = 1;
    villain.entering_styx_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["273"]();
riddles["274"] = async () => {
    const data = {
        "hero": {
            "cultivation": 93,
            "hp": 115,
            "physique": 0,
            "max_physique": 0,
            "round": 19,
            "cards": [
                "Cloud Sword Flash Wind 2",
                "Cloud Sword Moon Shade 3",
                "Cloud Sword Dragon Roam 2",
                "Flying Spirit Shade Sword",
                "Cloud Sword Flash Wind 2",
                "Cloud Sword Step Lightly",
                "Cloud Sword Flash Wind 2",
                "Cloud Sword Step Lightly"
            ]
        },
        "villain": {
            "cultivation": 104,
            "hp": 114,
            "physique": 0,
            "max_physique": 0,
            "round": 19,
            "cards": [
                "Ultimate Hexagram Base",
                "Heaven Hexagram 2",
                "Bow Of Hunting Owl",
                "Heaven Hexagram",
                "Starry Moon 3",
                "Fury Thunder",
                "Five Thunders",
                "Hexagram Formacide 3"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.endurance_as_cloud_sea_stacks = 1;
    hero.p4_rule_of_the_cloud_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["274"]();
riddles["275"] = async () => {
    const data = {
        "hero": {
            "cultivation": 93,
            "hp": 107,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "God Star Traction 2",
                "Calamity Plaguin 2",
                "Fate Reincarnates",
                "Disaster of Bloodshed 2",
                "Disaster of Bloodshed 2",
                "Strike Twice",
                "Extremely Suspicious 2",
                "Within Reach"
            ]
        },
        "villain": {
            "cultivation": 86,
            "hp": 107,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "Fate Reincarnates",
                "Unrestrained Sword Flame Dance",
                "Unrestrained Sword Two 2",
                "Calamity Plaguin 2",
                "Calamity Plaguin",
                "Unrestrained Sword Two 2",
                "Cloud Sword Dragon Roam 2",
                "Unrestrained Sword Two 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    villain.p4_mad_obsession_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["275"]();
riddles["276"] = async () => {
    const data = {
        "hero": {
            "cultivation": 91,
            "hp": 111,
            "physique": 0,
            "max_physique": 0,
            "round": 19,
            "cards": [
                "Moon Water Sword Formation 2",
                "Rule Sky Sword Formation 2",
                "Nine Evil Ruptsprite",
                "Chain Sword Formation 2",
                "Earth Tune 3",
                "Chord In Tune 2",
                "Mirror Flower Sword Formation 3",
                "Chain Sword Formation"
            ]
        },
        "villain": {
            "cultivation": 101,
            "hp": 111,
            "physique": 0,
            "max_physique": 0,
            "round": 19,
            "cards": [
                "God Star Traction 2",
                "Calamity Plaguin 2",
                "Extremely Suspicious 2",
                "Within Reach",
                "Strike Twice 2",
                "Astral Move Cide",
                "Disaster of Bloodshed 3",
                "Disaster of Bloodshed"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p3_sword_formation_guard_stacks = 1;
    hero.p5_sword_formation_guard_stacks = 1;
    villain.p3_astral_eclipse_stacks = 1;
    villain.p5_astral_eclipse_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["276"]();
riddles["277"] = async () => {
    const data = {
        "hero": {
            "cultivation": 85,
            "hp": 105,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "God Star Traction",
                "Calamity Plaguin 2",
                "Extremely Suspicious 3",
                "Within Reach",
                "Strike Twice",
                "Disaster of Bloodshed 2",
                "Disaster of Bloodshed 2",
                "normal attack"
            ]
        },
        "villain": {
            "cultivation": 84,
            "hp": 124,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Hexagram Formacide 3",
                "Dance Of The Dragonfly 3",
                "Flame Hexagram 2",
                "Heaven Hexagram 3",
                "Five Thunders",
                "Thunder Hexagram Rhythm",
                "Fury Thunder",
                "Thunder And Lightning 3"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    villain.p3_divination_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["277"]();
riddles["278"] = async () => {
    const data = {
        "hero": {
            "cultivation": 98,
            "hp": 111,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "Polaris Citta-Dharma 2",
                "Propitious Omen 2",
                "Star Moon Folding Fan 1",
                "Astral Move Hit 3",
                "Astral Move Hit 2",
                "Astral Move Cide 1",
                "normal attack",
                "normal attack"
            ]
        },
        "villain": {
            "cultivation": 98,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "Heartbroken Tune 2",
                "Chord In Tune 1",
                "Predicament for Immortals 2",
                "Strike Twice 2",
                "Concentric Tune 3",
                "Within Reach 1",
                "Extremely Suspicious 2",
                "Normal Attack 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.star_moon_folding_fan_stacks = 1;
    villain.p5_astral_eclipse_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["278"]();
riddles["279"] = async () => {
    const data = {
        "hero": {
            "cultivation": 85,
            "hp": 107,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "God Star Traction 2",
                "Calamity Plaguin 1",
                "Calamity Plaguin 1",
                "Extremely Suspicious 2",
                "Within Reach 1",
                "Astral Move Cide 2",
                "God Fate Reborn 2",
                "Disaster of Bloodshed 1",
                "Astral Tiger 2",
                "Heaven Hexagram 2",
                "Astral Cide",
                "Strike Twice",
            ]
        },
        "villain": {
            "cultivation": 7,
            "hp": 127,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "Kun Wu Metal Ring 1",
                "Metal Spirit Formation 2",
                "Metal Spirit Shuttle 1",
                "Metal Spirit Charge 2",
                "Metal Spirit Shuttle 1",
                "Metal Spirit Vigorous 1",
                "Metal Spirit Shuttle 1",
                "Metal Spirit Giant Tripod 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p5_astral_eclipse_stacks = 1;
    villain.the_body_of_fierce_tiger_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["279"]();
riddles["280"] = async () => {
    const data = {
        "hero": {
            "cultivation": 92,
            "hp": 107,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "Chord In Tune 2",
                "Heartbroken Tune 3",
                "Predicament for Immortals 2",
                "Ruthless Water 2",
                "Concentric Tune 2",
                "Astral Move Cide 1",
                "Within Reach 1",
                "Flowers And Water 1"
            ]
        },
        "villain": {
            "cultivation": 90,
            "hp": 110,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "Heaven Hexagram 3",
                "Ultimate Hexagram Base 1",
                "Astral Move Cide 1",
                "Thunder And Lightning 3",
                "Ice Spirit Guard Elixir 3",
                "Five Thunders 2",
                "Thunder Hexagram Rhythm 2",
                "Dance Of The Dragonfly 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p5_astral_eclipse_stacks = 1;
    villain.the_body_of_fierce_tiger_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["280"]();
riddles["281"] = async () => {
    const data = {
        "hero": {
            "cultivation": 97,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "round": 8,
            "cards": [
                "God Star Traction 2",
                "Calamity Plaguin 2",
                "Fate Reincarnates 2",
                "Calamity Plaguin 1",
                "Nothing Is Appropriate 2",
                "Within Reach 1",
                "Disaster of Bloodshed 2",
                "Disaster of Bloodshed 2"
            ]
        },
        "villain": {
            "cultivation": 96,
            "hp": 125,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "Hexagram Formacide 2",
                "Flame Hexagram 3",
                "Heaven Hexagram 2",
                "Ice Spirit Guard Elixir 1",
                "Fury Thunder 2",
                "Five Thunders 2",
                "Thunder Hexagram Rhythm 3",
                "Heaven Hexagram 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p3_astral_eclipse_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["281"]();
riddles["282"] = async () => {
    const data = {
        "hero": {
            "cultivation": 86,
            "hp": 107,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "God Star Traction 3",
                "Calamity Plaguin 1",
                "Calamity Plaguin 1",
                "Strike Twice 1",
                "Within Reach 1",
                "Calamity Plaguin 1",
                "Disaster of Bloodshed 1",
                "Disaster of Bloodshed 1",
                "Everything Goes Way 2",
                "Everything Goes Way 1",
            ]
        },
        "villain": {
            "cultivation": 92,
            "hp": 107,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "Fate Reincarnates 2",
                "Unrestrained Sword Zero 1",
                "Unrestrained Sword Flame Dance 1",
                "Good Omen 2",
                "Good Omen 1",
                "Unrestrained Sword Two 2",
                "Cloud Sword Dragon Roam 2",
                "Unrestrained Sword Two 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p3_astral_eclipse_stacks = 1;
    hero.p5_astral_eclipse_stacks = 1;
    villain.fire_flame_blade_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["282"]();
riddles["283"] = async () => {
    const data = {
        "hero": {
            "cultivation": 87,
            "hp": 107,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "Chord In Tune 1",
                "Predicament for Immortals 1",
                "Heartbroken Tune 3",
                "Flower Sentient 2",
                "Extremely Suspicious 2",
                "Strike Twice 1",
                "Within Reach 1",
                "Ruthless Water 3",
                "Astral Cide 2",
            ]
        },
        "villain": {
            "cultivation": 87,
            "hp": 111,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "Drag Moon In Sea 2",
                "Hunter Hunting Hunter 3",
                "Normal Attack 1",
                "Escape Plan 2",
                "Extremely Suspicious 1",
                "Heaven Hexagram 2",
                "Hunter Becomes Preyer 3",
                "Exorcism Elixir 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p5_astral_eclipse_stacks = 1;
    villain.p2_divination_stacks = 1;
    villain.p5_divination_stacks = 1;
    villain.act_underhand_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["283"]();
riddles["284"] = async () => {
    const data = {
        "hero": {
            "cultivation": 73,
            "hp": 109,
            "physique": 75,
            "max_physique": 85,
            "round": 16,
            "cards": [
                "Crane Footwork 2",
                "Realm-Killing Palms 1",
                "Wan Xuan Demon Breaking Palm 1",
                "Meditation of Xuan 1",
                "Exercise Marrow 3",
                "Soul Cleaving 2",
                "Toxin Immunity 2",
                "Soul Seizing 3",
                "styx agility",
                "shura roar",
                "crane footwork",
            ]
        },
        "villain": {
            "cultivation": 79,
            "hp": 113,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Hexagram Formacide 2",
                "Flame Hexagram 2",
                "Heaven Hexagram 1",
                "Starry Moon 3",
                "Fury Thunder 1",
                "Five Thunders 2",
                "Flame Hexagram 1",
                "Dance Of The Dragonfly 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.zen_mind_forging_body_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["284"]();
riddles["285"] = async () => {
    const data = {
        "hero": {
            "cultivation": 72,
            "hp": 106,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Sword Slash 3",
                "Disaster of Bloodshed 1",
                "Sword Defence 3",
                "Cloud Dance Rhythm 1",
                "Thousand Evil Incantation 1",
                "Spirit Cat Chaos Sword 2",
                "Learn Fortune 3",
                "Ice Incantation 2",
                "rule sky 2",
                "weaken fulu",
                "contemplate spirits rhythm 2",
                "sword intent surge",
            ]
        },
        "villain": {
            "cultivation": 82,
            "hp": 111,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Ultimate Hexagram Base 1",
                "Heaven Hexagram 2",
                "Thunder Hexagram Rhythm 1",
                "Fury Thunder 1",
                "Five Thunders 1",
                "Dance Of The Dragonfly 2",
                "Thunder And Lightning 1",
                "Ice Spirit Guard Elixir 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["285"]();
riddles["286"] = async () => {
    const data = {
        "hero": {
            "cultivation": 94,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "Calamity Plaguin 1",
                "Extremely Suspicious 1",
                "Disaster of Bloodshed 2",
                "Disaster of Bloodshed 1",
                "Extremely Suspicious 1",
                "Within Reach 1",
                "God Fate Flies 2",
                "Detect Qi 2"
            ]
        },
        "villain": {
            "cultivation": 82,
            "hp": 114,
            "physique": 86,
            "max_physique": 91,
            "round": 18,
            "cards": [
                "Stygian Moon's Changuang 1",
                "Shura Roar 1",
                "Crane Footwork 1",
                "Ice Spirit Guard Elixir 2",
                "Styx Agility 2",
                "Soul Cleaving 2",
                "Soul Seizing 2",
                "Soul Seizing 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p3_astral_eclipse_stacks = 1;
    hero.p5_astral_eclipse_stacks = 1;
    villain.entering_styx_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["286"]();
riddles["287"] = async () => {
    const data ={
        "hero": {
            "cultivation": 90,
            "hp": 108,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "Ultimate Hexagram Base 1",
                "Heaven Hexagram 2",
                "Astral Move Cide 2",
                "Starry Moon 1",
                "Fury Thunder 1",
                "Five Thunders 3",
                "Dance Of The Dragonfly 1",
                "Ice Spirit Guard Elixir 2"
            ]
        },
        "villain": {
            "cultivation": 97,
            "hp": 107,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "God Star Traction 2",
                "Calamity Plaguin 1",
                "Fate Reincarnates 2",
                "Disaster of Bloodshed 2",
                "Disaster of Bloodshed 1",
                "Calamity Plaguin 1",
                "Strike Twice 1",
                "Within Reach 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    villain.p5_astral_eclipse_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["287"]();
riddles["288"] = async () => {
    const data = {
        "hero": {
            "cultivation": 79,
            "hp": 105,
            "physique": 0,
            "max_physique": 0,
            "round": 15,
            "cards": [
                "Hexagram Formacide 2",
                "Hexagram Formacide 1",
                "Flame Hexagram 3",
                "Heaven Hexagram 1",
                "Starry Moon 1",
                "Fury Thunder 1",
                "Thunder And Lightning 1",
                "Thunder Hexagram Rhythm 2",
                "Astral Cide 2",
                "Ultimate Hexagram Base",
                "Ice Spirit Guard Elixir 3",
                "Polaris 2",
                "Astral Hit 2",
            ]
        },
        "villain": {
            "cultivation": 14,
            "hp": 103,
            "physique": 0,
            "max_physique": 0,
            "round": 15,
            "cards": [
                "Chord In Tune 1",
                "Illusion Tune 3",
                "Moon Water Sword Formation 3",
                "Rule Sky Sword Formation 1",
                "Earth Tune 2",
                "Chain Sword Formation 1",
                "Mirror Flower Sword Formation 2",
                "Mirror Flower Sword Formation 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    villain.coral_sword_stacks = 1;
    villain.p5_store_qi_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["288"]();
riddles["289"] = async () => {
    const data = {
        "hero": {
            "cultivation": 84,
            "hp": 107,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "Hexagram Formacide 2",
                "Thunder Citta Dharma 1",
                "Flame Hexagram 2",
                "Fury Thunder 1",
                "Thunder And Lightning 2",
                "Strike Twice 1",
                "Five Thunders 1",
                "Dance Of The Dragonfly 3",
                "Hexagram Formacide",
                "Thunder Hexagram Rhythm 2",
            ]
        },
        "villain": {
            "cultivation": 81,
            "hp": 127,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "Earth Spirit Formation 1",
                "Earth Spirit Formation 1",
                "Earth Spirit Combine World 1",
                "Earth Spirit Steep 2",
                "Earth Spirit Landslide 1",
                "Earth Spirit Cliff 2",
                "Earth Spirit Quicksand 2",
                "Earth Spirit Quicksand 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    villain.the_body_of_fierce_tiger_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["289"]();
riddles["290"] = async () => {
    const data = {
        "hero": {
            "cultivation": 83,
            "hp": 114,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "Lake Hexagram 2",
                "Drag Moon In Sea 3",
                "Hunter Hunting Hunter 2",
                "Hunter Hunting Hunter 1",
                "Drag Moon In Sea 1",
                "Astral Move Cide 1",
                "Great Spirit 3",
                "Strike Twice 2",
                "Heaven Hexagram",
                "Escape Plan",
                "Five Thunders",
            ]
        },
        "villain": {
            "cultivation": 97,
            "hp": 116,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "Ultimate Hexagram Base 2",
                "Hexagram Formacide 3",
                "Heaven Hexagram 1",
                "Flame Hexagram 3",
                "Fury Thunder 2",
                "Five Thunders 2",
                "Dance Of The Dragonfly 3",
                "Thunder Hexagram Rhythm 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.act_underhand_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["290"]();
riddles["291"] = async () => {
    const data = {
        "hero": {
            "cultivation": 79,
            "hp": 105,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Polaris Citta-Dharma 2",
                "Propitious Omen 3",
                "Star Moon Folding Fan 1",
                "Astral Move Tiger 2",
                "Metal Tri-Thorn Spear 1",
                "Astral Move Hit 2",
                "Flying Brush 1",
                "Astral Move Cide 1"
            ]
        },
        "villain": {
            "cultivation": 83,
            "hp": 108,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Ultimate Hexagram Base 1",
                "Hexagram Formacide 3",
                "Heaven Hexagram 1",
                "Flame Hexagram 3",
                "Fury Thunder 1",
                "Five Thunders 2",
                "Thunder Hexagram Rhythm 2",
                "Thunder And Lightning 3"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.star_moon_folding_fan_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["291"]();
riddles["292"] = async () => {
    const data = {
        "hero": {
            "cultivation": 96,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "Chord In Tune 2",
                "Predicament for Immortals 3",
                "Heartbroken Tune 3",
                "Extremely Suspicious 1",
                "Concentric Tune 2",
                "Strike Twice 2",
                "Within Reach 1",
                "Astral Move Cide 1"
            ]
        },
        "villain": {
            "cultivation": 71,
            "hp": 123,
            "physique": 90,
            "max_physique": 95,
            "round": 18,
            "cards": [
                "Exercise Soul 2",
                "Exercise Soul 2",
                "Exercise Soul 2",
                "Exercise Marrow 3",
                "Realm-Killing Palms 2",
                "Shura Roar 3",
                "Soul Cleaving 2",
                "Space Spiritual Field 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p3_store_qi_stacks = 1;
    villain.p4_regenerating_body_stacks = 1;
    villain.stance_of_fierce_attack_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["292"]();
riddles["293"] = async () => {
    const data = {
        "hero": {
            "cultivation": 106,
            "hp": 120,
            "physique": 0,
            "max_physique": 0,
            "round": 20,
            "cards": [
                "Fate Reincarnates 2",
                "Calamity Plaguin 2",
                "Extremely Suspicious 2",
                "Detect Qi 2",
                "Disaster of Bloodshed 1",
                "Within Reach 1",
                "Nothing Is Appropriate 3",
                "Great Spirit 3"
            ]
        },
        "villain": {
            "cultivation": 99,
            "hp": 90,
            "physique": 0,
            "max_physique": 0,
            "round": 20,
            "cards": [
                "Water Spirit Seal 3",
                "Ultimate World Formation 1",
                "Wood Spirit Secret Seal 2",
                "Wood Spirit Fragrant 3",
                "Five Elements Circulation 3",
                "Fire Spirit Blazing Prairie 3",
                "Wood Spirit Willow Leaf 1",
                "Fire Spirit Heart Fire 3"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p2_astral_eclipse_stacks = 1;
    villain.five_elements_explosion_stacks = 1;
    villain.swift_burning_seal_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["293"]();
riddles["294"] = async () => {
    const data = {
        "hero": {
            "cultivation": 101,
            "hp": 119,
            "physique": 0,
            "max_physique": 0,
            "round": 20,
            "cards": [
                "Dragon Devours Clouds 2",
                "Cloud Sword Dragon Roam 2",
                "Unrestrained Sword Two 1",
                "Cloud Sword Flash Wind 2",
                "Unrestrained Sword Dragon Coiled 1",
                "Cloud Sword Flash Wind 1",
                "Unrestrained Sword Twin Dragons 1",
                "Unrestrained Sword Two 2"
            ]
        },
        "villain": {
            "cultivation": 109,
            "hp": 113,
            "physique": 0,
            "max_physique": 0,
            "round": 20,
            "cards": [
                "God Star Traction 3",
                "Calamity Plaguin 3",
                "Fate Reincarnates 2",
                "Disaster of Bloodshed 3",
                "Disaster of Bloodshed 1",
                "Strike Twice 3",
                "Within Reach 1",
                "God Fate Flies 3"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p5_rule_of_the_cloud_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["294"]();
riddles["295"] = async () => {
    const data = {
        "hero": {
            "cultivation": 60,
            "hp": 102,
            "physique": 0,
            "max_physique": 0,
            "round": 13,
            "cards": [
                "Spirit Gather Citta Dharma 1",
                "Spiritage Elixir 3",
                "Clear Heart Sword Embryo 3",
                "Cloud Sword Pierce The Star 2",
                "Raven Spirit Sword 1",
                "Giant Kun Spirit Sword 2",
                "Mirror Flower Sword Formation 1",
                "Rule Sky Sword Formation 1",
                "Spiritage Elixir",
                "Dharma Spirit Sword",
                "Cloud Sword Pierce The Star",
                "Moon Water Sword",
            ]
        },
        "villain": {
            "cultivation": 64,
            "hp": 99,
            "physique": 0,
            "max_physique": 0,
            "round": 13,
            "cards": [
                "God Star Traction 1",
                "Calamity Plaguin 1",
                "Ruthless Water 2",
                "Extremely Suspicious 1",
                "Within Reach 1",
                "God Fate Reborn 1",
                "Disaster of Bloodshed 1",
                "Normal Attack 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.quench_of_sword_heart_cloud_stacks = 1;
    hero.qi_forging_spiritstat_stacks = 1;
    villain.p3_astral_eclipse_stacks = 1;
    villain.p5_astral_eclipse_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["295"]();
riddles["296"] = async () => {
    const data = {
        "hero": {
            "cultivation": 80,
            "hp": 103,
            "physique": 0,
            "max_physique": 0,
            "round": 15,
            "cards": [
                "God Star Traction 2",
                "Calamity Plaguin 1",
                "Calamity Plaguin 1",
                "Extremely Suspicious 1",
                "Within Reach 1",
                "Disaster of Bloodshed 2",
                "Disaster of Bloodshed 1",
                "Disaster of Bloodshed 1"
            ]
        },
        "villain": {
            "cultivation": 82,
            "hp": 106,
            "physique": 0,
            "max_physique": 0,
            "round": 15,
            "cards": [
                "Polaris Citta-Dharma 2",
                "Propitious Omen 2",
                "Astral Move Fly 3",
                "Astral Move Tiger 3",
                "Astral Move Fly 2",
                "Starry Moon 3",
                "Astral Move Fly 2",
                "Astral Move Hit 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["296"]();
riddles["297"] = async () => {
    const data = {
        "hero": {
            "cultivation": 78,
            "hp": 105,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Flame Hexagram 2",
                "Heaven Hexagram 2",
                "Fury Thunder 1",
                "Five Thunders 1",
                "Dance Of The Dragonfly 3",
                "Astral Move Cide 1",
                "Propitious Omen 2",
                "Strike Twice 2",
                "Polaris Citta Dharma",
                "Thunder Hexagram Rhythm 2",
                "Thunder Hexagram Rhythm",
                "Ultimate Hexagram Base",
            ]
        },
        "villain": {
            "cultivation": 75,
            "hp": 107,
            "physique": 53,
            "max_physique": 81,
            "round": 16,
            "cards": [
                "Stygian Moon's Changuang 1",
                "Crash Citta Dharma 2",
                "Styx Agility 2",
                "Crash Fist Stygian Night 1",
                "Gather Intense Force 2",
                "Crash Fist Subdue Dragon 2",
                "Crash Fist Inch Force 2",
                "Crash Fist Continue 3"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p4_stargaze_stacks = 1;
    villain.entering_styx_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["297"]();
riddles["298"] = async () => {
    const data = {
        "hero": {
            "cultivation": 85,
            "hp": 124,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "Cloud Sword Dragon Roam 1",
                "Cloud Sword Moon Shade 2",
                "Cloud Sword Flash Wind 2",
                "Cloud Sword Fleche 3",
                "Cloud Sword Flash Wind 1",
                "Cloud Sword Necessity 2",
                "Cloud Sword Flash Wind 1",
                "Cloud Sword Avalanche 1"
            ]
        },
        "villain": {
            "cultivation": 93,
            "hp": 107,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "God Star Traction 3",
                "Calamity Plaguin 2",
                "Calamity Plaguin 1",
                "Extremely Suspicious 2",
                "Within Reach 1",
                "Disaster of Bloodshed 2",
                "Disaster of Bloodshed 1",
                "Disaster of Bloodshed 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.fire_flame_blade_stacks = 1;
    hero.drift_ice_blade_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["298"]();
riddles["299"] = async () => {
    const data = {
        "hero": {
            "cultivation": 88,
            "hp": 123,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "God Star Traction 2",
                "Calamity Plaguin 2",
                "Calamity Plaguin 1",
                "Extremely Suspicious 2",
                "Within Reach 1",
                "God Fate Reborn 2",
                "Disaster of Bloodshed 2",
                "Disaster of Bloodshed 1"
            ]
        },
        "villain": {
            "cultivation": 83,
            "hp": 110,
            "physique": 80,
            "max_physique": 86,
            "round": 17,
            "cards": [
                "Crane Footwork 2",
                "Stygian Moon's Changuang 1",
                "Crash Footwork 2",
                "Crash Fist Stygian Night 1",
                "Exercise Soul 2",
                "Crash Fist Blink 2",
                "Crash Fist Subdue Dragon 3",
                "Realm-Killing Palms 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p3_rejuvenation_stacks = 1;
    villain.entering_styx_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["299"]();
riddles["300"] = async () => {
    const data = {
        "hero": {
            "cultivation": 82,
            "hp": 108,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Ultimate Hexagram Base 1",
                "Hexagram Formacide 2",
                "Heaven Hexagram 2",
                "Starry Moon 1",
                "Fury Thunder 1",
                "Five Thunders 2",
                "Dance Of The Dragonfly 2",
                "Thunder Hexagram Rhythm 1"
            ]
        },
        "villain": {
            "cultivation": 81,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Five Elements Heavenly Marrow Rhythm 2",
                "Fire Spirit Formation 3",
                "Fire Spirit Flame Eater 2",
                "Fire Spirit Blast 3",
                "Fire Spirit Heart Fire 3",
                "Fire Spirit Blazing Prairie 2",
                "Fire Spirit Heart Fire 2",
                "Fire Spirit Scarlet Flame 2"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p3_rejuvenation_stacks = 1;
    villain.entering_styx_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["300"]();
riddles["301"] = async () => {
    const data = {
        "hero": {
            "cultivation": 91,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "God Star Traction 3",
                "Fate Reincarnates 3",
                "Great Spirit 2",
                "Calamity Plaguin 1",
                "Calamity Plaguin 1",
                "Disaster of Bloodshed 2",
                "Extremely Suspicious 2",
                "Within Reach 1"
            ]
        },
        "villain": {
            "cultivation": 94,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "Polaris Citta-Dharma 3",
                "Propitious Omen 3",
                "Astral Move Fly 2",
                "Astral Move Cide 3",
                "Heaven Hexagram 3",
                "Five Thunders 1",
                "Normal Attack 1",
                "Normal Attack 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p3_astral_eclipse_stacks = 1;
    hero.p5_astral_eclipse_stacks = 1;
    villain.astral_divination_hexagram_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = 0;//data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
riddles["302"] = async () => {
    const data = {
        "hero": {
            "cultivation": 79,
            "hp": 103,
            "physique": 0,
            "max_physique": 0,
            "round": 15,
            "cards": [
                "Heartbroken Tune 2",
                "Chord In Tune 1",
                "Extremely Suspicious 1",
                "Concentric Tune 1",
                "Within Reach 1",
                "Extremely Suspicious 1",
                "Heartbroken Tune 1",
                "Propitious Omen 2"
            ]
        },
        "villain": {
            "cultivation": 60,
            "hp": 120,
            "physique": 0,
            "max_physique": 0,
            "round": 15,
            "cards": [
                "Cloud Dance Rhythm 2",
                "Sword Defence 3",
                "Contemplate Spirits Rhythm 2",
                "Spirit Cat Chaos Sword 1",
                "Cloud Sword Touch Sky 2",
                "Cloud Sword Necessity 2",
                "Cloud Sword Conceal 2",
                "Unrestrained Sword One 3"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["302"]();
riddles["303"] = async () => {
    const data = {
        "hero": {
            "cultivation": 95,
            "hp": 120,
            "physique": 99,
            "max_physique": 104,
            "round": 20,
            "cards": [
                "Crash Footwork 2",
                "Exercise Soul 3",
                "Stygian Moon's Changuang 1",
                "Exercise Marrow 3",
                "Crash Fist Subdue Dragon 2",
                "Realm-Killing Palms 2",
                "Crash Fist Blink 3",
                "Crane Footwork 2",
                "Crane Footwork",
                "Realm-Killing Palms",
            ]
        },
        "villain": {
            "cultivation": 112,
            "hp": 115,
            "physique": 0,
            "max_physique": 0,
            "round": 20,
            "cards": [
                "Heartbroken Tune 3",
                "Chord In Tune 1",
                "Predicament for Immortals 3",
                "Concentric Tune 3",
                "Strike Twice 1",
                "Extremely Suspicious 3",
                "Within Reach 1",
                "Normal Attack 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p2_regenerating_body_stacks = 1;
    hero.p3_regenerating_body_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["303"]();
riddles["304"] = async () => {
    const data = {
        "hero": {
            "cultivation": 102,
            "hp": 116,
            "physique": 0,
            "max_physique": 0,
            "round": 19,
            "cards": [
                "Hexagram Formacide 3",
                "Flame Hexagram 2",
                "Heaven Hexagram 1",
                "Propitious Omen 2",
                "Ice Spirit Guard Elixir 1",
                "Fury Thunder 1",
                "Five Thunders 2",
                "Dance Of The Dragonfly 3"
            ]
        },
        "villain": {
            "cultivation": 91,
            "hp": 115,
            "physique": 64,
            "max_physique": 96,
            "round": 19,
            "cards": [
                "Stygian Moon's Changuang 1",
                "Crash Citta Dharma 2",
                "Styx Agility 2",
                "Crash Fist Stygian Night 2",
                "Crash Fist Blink 2",
                "Crash Fist Double 2",
                "Crash Fist Shocked 2",
                "Crash Fist Inch Force 3"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p2_regenerating_body_stacks = 1;
    hero.p3_regenerating_body_stacks = 1;
    villain.entering_styx_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["304"]();
riddles["305"] = async () => {
    const data = {
        "hero": {
            "cultivation": 102,
            "hp": 116,
            "physique": 0,
            "max_physique": 0,
            "round": 19,
            "cards": [
                "Hexagram Formacide 3",
                "Flame Hexagram 2",
                "Heaven Hexagram 1",
                "Propitious Omen 2",
                "Ice Spirit Guard Elixir 1",
                "Fury Thunder 1",
                "Five Thunders 2",
                "Dance Of The Dragonfly 3"
            ]
        },
        "villain": {
            "cultivation": 91,
            "hp": 115,
            "physique": 64,
            "max_physique": 96,
            "round": 19,
            "cards": [
                "Stygian Moon's Changuang 1",
                "Crash Citta Dharma 2",
                "Styx Agility 2",
                "Crash Fist Stygian Night 2",
                "Crash Fist Blink 2",
                "Crash Fist Double 2",
                "Crash Fist Shocked 2",
                "Crash Fist Inch Force 3"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p2_regenerating_body_stacks = 1;
    hero.p3_regenerating_body_stacks = 1;
    villain.p3_astral_eclipse_stacks = 1;
    villain.p5_astral_eclipse_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["305"]();
riddles["306"] = async () => {
    const data = {
        "hero": {
            "cultivation": 78,
            "hp": 105,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Only Traces 1",
                "Strike Twice 1",
                "Stillness Citta Dharma 2",
                "Great Spirit 2",
                "God's Opportunity - Conform 2",
                "Astral Move Cide 3",
                "Great Spirit 1",
                "Revitalized 1",
                "Stillness Citta Dharma",
                "Fate Reincarnates 3",
                "Calamity Plaguin 2",
            ]
        },
        "villain": {
            "cultivation": 81,
            "hp": 105,
            "physique": 0,
            "max_physique": 0,
            "round": 16,
            "cards": [
                "Divine Walk Fulu 1",
                "Miasma Fulu 3",
                "Flower Sentient 1",
                "Extremely Suspicious 1",
                "Extremely Suspicious 1",
                "Strike Twice 1",
                "Thousand Evil Incantation 2",
                "Within Reach 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    villain.p3_astral_eclipse_stacks = 1;
    villain.p5_astral_eclipse_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["306"]();
riddles["307"] = async () => {
    const data = {
        "hero": {
            "cultivation": 88,
            "hp": 107,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "God Star Traction 3",
                "Extremely Suspicious 2",
                "Astral Move Cide 2",
                "Disaster of Bloodshed 3",
                "Disaster of Bloodshed 1",
                "Great Spirit 2",
                "Extremely Suspicious 1",
                "Within Reach 1"
            ]
        },
        "villain": {
            "cultivation": 90,
            "hp": 114,
            "physique": 0,
            "max_physique": 0,
            "round": 17,
            "cards": [
                "Polaris Citta-Dharma 1",
                "Starry Moon 3",
                "Astral Move Fly 2",
                "Propitious Omen 2",
                "Astral Move Fly 1",
                "Ice Spirit Guard Elixir 2",
                "Astral Move Hit 3",
                "Astral Move Tiger 3"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = 0;//data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["307"]();
riddles["308"] = async () => {
    const data = {
        "hero": {
            "cultivation": 95,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "God's Opportunity Conform 2",
                "Extremely Suspicious 3",
                "Fate Reincarnates 2",
                "Disaster of Bloodshed 2",
                "Disaster of Bloodshed 2",
                "Strike Twice 2",
                "Thousand Evil Incantation 1",
                "Divine Walk Fulu 1"
            ]
        },
        "villain": {
            "cultivation": 86,
            "hp": 131,
            "physique": 0,
            "max_physique": 0,
            "round": 18,
            "cards": [
                "Kun Wu Metal Ring 1",
                "Metal Spirit Shuttle 1",
                "Finishing Touch 3",
                "Flying Brush 1",
                "Earth Spirit Combine World 2",
                "Flying Brush 1",
                "Earth Spirit Steep 2",
                "Earth Spirit Landslide 1"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    villain.the_body_of_fierce_tiger_stacks = 1;
    hero.max_hp = hero.hp + hero.physique;
    villain.max_hp = villain.hp + villain.physique;
    const my_idx = 0;//data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["308"]();
riddles["309"] = async () => {
    const data = {
        "hero": {
            "cultivation": 90,
            "hp": 112,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 112,
            "round": 17,
            "cards": [
                "Hexagram Formacide 2",
                "Hexagram Formacide 1",
                "Flame Hexagram 3",
                "Heaven Hexagram 2",
                "Starry Moon 2",
                "Fury Thunder 1",
                "Five Thunders 2",
                "Dance Of The Dragonfly 2"
            ],
            "talents": [
                "Bloodline Power",
                "Flame of life",
                "Ultimate Hexagram Base",
                "Tool Governor",
                "Fury Thunder"
            ]
        },
        "villain": {
            "cultivation": 88,
            "hp": 110,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 110,
            "round": 17,
            "cards": [
                "Hexagram Formacide 3",
                "Hexagram Formacide 2",
                "Rotary Divination Hexagram 2",
                "Heaven Hexagram 2",
                "Five Thunders 2",
                "Dance Of The Dragonfly 2",
                "Thunder Hexagram Rhythm 2",
                "Normal Attack 1"
            ],
            "talents": [
                "Innate Spirit Body",
                "The Way of Adaptation",
                "Flame Flutter",
                "Rotary Divination Hexagram",
                "Fortunes and Luck"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["309"]();
riddles["310"] = async () => {
    const data = {
        "hero": {
            "cultivation": 76,
            "hp": 105,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 105,
            "round": 16,
            "cards": [
                "Heavenly Spirit Forceage Formation 2",
                "Clear Heart Sword Embryo  3",
                "Echo Formation 1",
                "Unrestrained Sword Two 1",
                "Unrestrained Sword Two 3",
                "Anthomania Formation 2",
                "Cloud Sword Dragon Roam 1",
                "Meru Formation 2"
            ],
            "talents": [
                "Swordsmith",
                "Sharp Blade",
                "Charge Sword Pattern",
                "Mad Obsession",
                "Unrestrained Sword Heart"
            ]
        },
        "villain": {
            "cultivation": 83,
            "hp": 105,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 105,
            "round": 16,
            "cards": [
                "Heartbroken Tune 2",
                "Chord In Tune 2",
                "Predicament for Immortals 1",
                "Strike Twice 1",
                "Concentric Tune 2",
                "Within Reach 1",
                "Extremely Suspicious 2",
                "Extremely Suspicious 2"
            ],
            "talents": [
                "Bloodline Power",
                "Flame of life",
                "Ultimate Hexagram Base",
                "Within Reach",
                "Astral Eclipse"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    villain.p5_astral_eclipse_stacks = 1;
    hero.blade_forging_sharpness_stacks = 1;
    hero.sword_pattern_carving_charge_stacks = 1;
    hero.p4_mad_obsession_stacks = 1;
    hero.quench_of_sword_heart_unrestrained_stacks = 1;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["310"]();
riddles["311"] = async () => {
    const data = {
        "hero": {
            "cultivation": 92,
            "hp": 121,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 121,
            "round": 20,
            "cards": [
                "Spirit Gather Citta Dharma 3",
                "Spiritage Elixir 2",
                "Rule Sky Sword Formation 2",
                "Moon Water Sword Formation 3",
                "Rule Sky Sword Formation 2",
                "Raven Spirit Sword 3",
                "Chain Sword Formation 3",
                "Mirror Flower Sword Formation 2"
            ],
            "talents": [
                "Shift As Cloud",
                "Sword In Sheathed",
                "Endurance As Cloud Sea",
                "Shade Of Cloud",
                "The Way of Adaptation"
            ]
        },
        "villain": {
            "cultivation": 102,
            "hp": 119,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 119,
            "round": 20,
            "cards": [
                "Contemplate Spirits Rhythm 3",
                "Cloud Dance Rhythm 3",
                "Sword Intent Surge 3",
                "Sword Intent Surge 3",
                "Flying Spirit Shade Sword 3",
                "Dharma Spirit Sword 3",
                "Normal Attack 1",
                "Normal Attack 1"
            ],
            "talents": [
                "Shift As Cloud",
                "Fortunes and Luck",
                "Shattered Dao",
                "Thunder Tribulation",
                "Spring Course Tea"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.sword_in_sheathed_stacks = 1;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["311"]();
riddles["312"] = async () => {
    const data = {
        "hero": {
            "cultivation": 87,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 109,
            "round": 18,
            "cards": [
                "Colorful Spirit Crane 1",
                "Spirit Gather Citta Dharma 3",
                "Rule Sky Sword Formation 2",
                "Spiritage Incantation 3",
                "Rule Sky Sword Formation 1",
                "Thousand Evil Incantation 2",
                "Chain Sword Formation 1",
                "Egret Spirit Sword 2"
            ],
            "talents": [
                "Shift As Cloud",
                "Sword In Sheathed",
                "Inheritance of Sword Formation",
                "Mental Perception",
                "Fortunes and Luck"
            ]
        },
        "villain": {
            "cultivation": 94,
            "hp": 115,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 115,
            "round": 18,
            "cards": [
                "Unrestrained Sword Zero 2",
                "Cloud Sword Dragon Roam 1",
                "Cloud Sword Moon Shade 2",
                "Cloud Sword Dragon Roam 1",
                "Unrestrained Sword One 3",
                "Exorcism Elixir 1",
                "Unrestrained Sword Flame Dance 1",
                "Unrestrained Sword Two 1"
            ],
            "talents": [
                "Bloodline Potential",
                "Fire Flame Blade",
                "Drift Ice Blade",
                "Mad Obsession",
                "Flame Dance"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.sword_in_sheathed_stacks = 1;
    villain.fire_flame_blade_stacks = 1;
    villain.drift_ice_blade_stacks = 1;
    villain.p4_mad_obsession_stacks = 1;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["312"]();
riddles["313"] = async () => {
    const data = {
        "hero": {
            "cultivation": 87,
            "hp": 109,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 109,
            "round": 18,
            "cards": [
                "Step Moon Into Cloud 1",
                "Cloud Sword Dragon Roam 1",
                "Cloud Sword Step Lightly 2",
                "Cloud Sword Flash Wind 3",
                "Cloud Sword Necessity 3",
                "Cloud Sword Dragon Roam 1",
                "Cloud Sword Sunset Glow 2",
                "Flying Spirit Shade Sword 3"
            ],
            "talents": [
                "Shift As Cloud",
                "Inheritance of Cloud Sword",
                "Epiphany",
                "Shade Of Cloud",
                "Spring Course Tea"
            ]
        },
        "villain": {
            "cultivation": 89,
            "hp": 132,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 132,
            "round": 18,
            "cards": [
                "Kun Wu Metal Ring 2",
                "Metal Spirit Formation 3",
                "Metal Spirit Shuttle 1",
                "Metal Spirit Charge 1",
                "Metal Spirit Shuttle 1",
                "Metal Spirit Vigorous 1",
                "Metal Spirit Shuttle 1",
                "Metal Spirit Giant Tripod 2"
            ],
            "talents": [
                "The Body of Fierce Tiger",
                "Quench of Wood Spirit",
                "Kun Wu Metal Ring",
                "Vigorous",
                "Concentrated Element"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    villain.the_body_of_fierce_tiger_stacks = 1;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["313"]();
riddles["314"] = async () => {
    const data = {
        "hero": {
            "cultivation": 86,
            "hp": 115,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 115,
            "round": 18,
            "cards": [
                "Apex Sword Citta Dharma 2",
                "Cloud Dance Rhythm 3",
                "Ice Spirit Guard Elixir 3",
                "Rule Sky Sword Formation 2",
                "Sword Intent Flow 2",
                "Sword Intent Surge 2",
                "Flow Cloud Chaos Sword 3",
                "Flying Spirit Shade Sword 2"
            ],
            "talents": [
                "Shift As Cloud",
                "Sword In Sheathed",
                "Endurance As Cloud Sea",
                "Shade Of Cloud",
                "Spring Course Tea"
            ]
        },
        "villain": {
            "cultivation": 92,
            "hp": 91,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 91,
            "round": 18,
            "cards": [
                "Water Spirit Secret Seal 1",
                "Ultimate World Formation 3",
                "Wood Spirit Secret Seal 2",
                "Wood Spirit Fragrant 2",
                "Five Elements Circulation 1",
                "Fire Spirit Blazing Prairie 3",
                "Five Elements Circulation 1",
                "Earth Spirit Combine World 2"
            ],
            "talents": [
                "Secret Seal Affinity",
                null,
                "Five Elements Explosion",
                "Mental Perception",
                "Swift Burning Seal"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.sword_in_sheathed_stacks = 1;
    villain.five_elements_explosion_stacks = 1;
    villain.swift_burning_seal_stacks = 1;
    const my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["314"]();
riddles["315"] = async () => {
    const data = {
        "hero": {
            "cultivation": 60,
            "hp": 99,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 99,
            "round": 13,
            "cards": [
                "Spirit Gather Citta Dharma 2",
                "Centibird Spirit Sword Rhythm 3",
                "Inspiration Sword 1",
                "Cloud Dance Rhythm 2",
                "Contemplate Spirits Rhythm 2",
                "Flow Cloud Chaos Sword 1",
                "Giant Kun Spirit Sword 2",
                "Dharma Spirit Sword 1",
                "Giant Kun Spirit Sword 1",
                "Giant Roc Spirit Sword 2",
                "Raven Spirit Sword 1",
                "Egret Spirit Sword 2",
            ],
            "talents": [
                "Shift As Cloud",
                "Epiphany",
                "Mental Perception",
                "Shade Of Cloud",
                "Sword Rhyme Cultivate"
            ]
        },
        "villain": {
            "cultivation": 62,
            "hp": 121,
            "physique": 0,
            "max_physique": 0,
            "max_hp": 121,
            "round": 13,
            "cards": [
                "Kun Wu Metal Ring 1",
                "Metal Spirit Formation 3",
                "Metal Spirit Iron Bone 2",
                "Metal Spirit Charge 2",
                "Metal Spirit Shuttle 1",
                "Metal Spirit Vigorous 1",
                "Metal Spirit Heart Pierce 1",
                "Metal Spirit Sharp 1"
            ],
            "talents": [
                "The Body of Fierce Tiger",
                "Quench of Wood Spirit",
                "Kun Wu Metal Ring",
                "Vigorous",
                "Additional Fuluist"
            ]
        }
    };
    const hero = data.hero;
    const villain = data.villain;
    hero.p5_sword_rhyme_cultivate_stacks = 1;
    villain.the_body_of_fierce_tiger_stacks = 1;
    const my_idx = 0;//data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx});
}
//await riddles["315"]();
riddles["420"] = async () => {
    // load the data from riddle_data.json
    // open a file and read its contents
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('riddle_data.json', 'utf8'));
    const hero = data.hero;
    const villain = data.villain;
    let my_idx = data.hero.cultivation >= data.villain.cultivation ? 0 : 1;
    //my_idx = 0;
    let players = [hero, villain];
    if (my_idx == 1) {
        players = [villain, hero];
    }
    return await do_riddle({players: players, my_idx: my_idx, dummy: true});
}
await riddles["420"]();
console.log("done"); 



riddles["421"] = async () => {
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

//await riddles["421"]();
//console.log("done"); 