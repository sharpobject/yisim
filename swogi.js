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

let riddles = {};
function fixup_deck(deck) {
    for (let i=0; i<deck.length; i++) {
        if (swogi[deck[i]] == undefined) {
            deck[i] = card_name_to_id_fuzzy(deck[i]);
        }
    }
}

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
            combo_idx += 1;
            console.log("combo_idx: " + combo_idx);
            // sort the combo
            combo.sort();
            let combo_id = combo.join(",");
            if (tried_combos[combo_id]) {
                continue;
            }
            tried_combos[combo_id] = true;
            // if this combo has 3 or more continuous/consumption cards, skip it
            let normal_attack_count = 0;
            let concon_count = 0;
            for (let i=0; i<8; i++) {
                if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                    concon_count += 1;
                }
            }
            if (concon_count >= 3) {
                continue;
            }
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
await riddles["225"]();
console.log("done");
