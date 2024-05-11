import { GameState, card_name_to_id_fuzzy, swogi, format_card } from "./gamestate.js";
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
    var head = arr[0];
    var tail = arr.slice(1);
    for (var subcombo of k_combinations(tail, k-1)) {
        yield [head, ...subcombo];
    }
    for (var subcombo of k_combinations(tail, k)) {
        yield subcombo;
    }
}

var riddles = {};
function fixup_deck(deck) {
    for (var i=0; i<deck.length; i++) {
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
    for (var i=0; i<winning_decks.length; i++) {
        if (winning_margins[i] > riddle.best_winning_margin) {
            riddle.best_winning_margin = winning_margins[i];
            for (var j=0; j<winning_decks[i].length; j++) {
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
    if (riddle.just_run) {
        riddle.players[my_idx].cards = my_cards;
        riddle.players[enemy_idx].cards = enemy_cards;
        riddle.worker_idx = 0;
        messages_outstanding[0] += 1;
        workers[0].postMessage(riddle);
    } else {
        var combo_idx = 0;
        const tried_combos = {};
        for (var combo of k_combinations(my_cards, 8)) {
            combo_idx += 1;
            console.log("combo_idx: " + combo_idx);
            // sort the combo
            combo.sort();
            var combo_id = combo.join(",");
            if (tried_combos[combo_id]) {
                continue;
            }
            tried_combos[combo_id] = true;
            // if this combo has 3 or more continuous/consumption cards, skip it
            var normal_attack_count = 0;
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
            // if there is a ready worker, send the message
            var worker_idx = -1;
            for (var i=0; i<numCores; i++) {
                if (messages_outstanding[i] == 0) {
                    worker_idx = i;
                    break;
                }
            }
            if (worker_idx == -1) {
                // wait for a message to come back
                var response = await getMessage();
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
    var total_messages_outstanding = 0;
    for (var i=0; i<numCores; i++) {
        total_messages_outstanding += messages_outstanding[i];
    }
    console.log("total_messages_outstanding: " + total_messages_outstanding);
    while (total_messages_outstanding > 0) {
        var response = await getMessage();
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
await riddles["218"]();
console.log("done");

/*
riddles["100"] = () => {
    const enemy_hp = 107 - 15 + 20;
    const enemy_cultivation = 74;
    const enemy_physique = 0;
    const my_hp = 125 - 50;
    const my_cultivation = 64;
    const my_physique = 0;
    const my_cards = [
        "kun wu metal ring",
        "five elements heavenly marrow rhythm 2",
        "earth spirit dust 3",
        "earth spirit combine world",
        "earth spirit steep 2",
        "flying brush",
        "earth spirit steep 2",
        "earth spirit landslide",
        ///
        "earth spirit quicksand",
        "earth spirit formation",
    ];
    const enemy_cards = [
        "cloud sword softheart",
        "cloud sword softhear",
        "cloud sword flash wind 2",
        "cloud sword moon shade 2",
        "cloud sword flash wind",
        "cloud sword step lightly 2",
        "cloud sword flash wind",
        "cloud sword avalanche",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].drift_ice_blade_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
riddles["101"] = () => {
    const enemy_hp = 107 - 15;
    const enemy_cultivation = 74;
    const enemy_physique = 0;
    const my_hp = 125 - 15;
    const my_cultivation = 64;
    const my_physique = 0;
    const my_cards = [
        "kun wu metal ring",
        "five elements heavenly marrow rhythm 2",
        "metal spirit iron bone 2",
        "metal spirit shuttle",
        "metal spirit formation",
        "metal spirit shuttle",
        "metal spirit vigorous",
        "metal spirit sharp",
        "flying brush",
    ];
    const enemy_cards = [
        "cloud sword softheart",
        "cloud sword softhear",
        "cloud sword flash wind 2",
        "cloud sword moon shade 2",
        "cloud sword flash wind",
        "cloud sword step lightly 2",
        "cloud sword flash wind",
        "cloud sword avalanche",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].drift_ice_blade_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["101"]();
riddles["102"] = () => {
    const enemy_hp = 115;
    const enemy_cultivation = 108;
    const enemy_physique = 0;
    const my_hp = 121;
    const my_cultivation = 100;
    const my_physique = 60;
    const my_cards = [
        //
        "chord in tune",
        //"predicament for immortals",
        "nine evil ruptsprite 2",
        "nine evil ruptsprite",
        //"ghost howling 2",
        //
        "styx agility 3",
        "shura roar 2",
        "styx agility",
        "soul cleaving 2",
        "soul seizing 3",
        "concentric tune 3",
        "soul cleaving",
        "soul seizing",
    ];
    const enemy_cards = [
        "divine walk fulu 3",
        "spiritage incantation 3",
        "divine walk fulu 2",
        "inspiration sword 2",
        "cloud sword dragon roam 3",
        "dharma sword",
        "flying spirit shade",
        "inspiration sword",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].fire_flame_blade_stacks = 1;
            game.players[enemy_idx].p5_store_qi_stacks = 1;
            game.players[my_idx].unwavering_soul_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["102"]();
riddles["103"] = () => {
    const enemy_hp = 114 - 15;
    const enemy_cultivation = 98;
    const enemy_physique = 0;
    const my_hp = 131 - 15;
    const my_cultivation = 90;
    const my_physique = 0;
    const my_cards = [
        //"five elements heavenly marrow rhythm",
        "five elements heavenly marrow rhythm 2",
        "kun wu metal ring",
        "flying brush 2",
        "earth spirit combine world 2",
        "flying brush 2",
        "earth spirit steep 2",
        "earth spirit landslide",
        "earth spirit cliff 3",
    ];
    const enemy_cards = [
        "polaris citta dharma 2",
        "star moon folding fan",
        "astral cide 2",
        "astral fly 2",
        "propit omen 2",
        "astral fly",
        "astral tiger 2",
        "astral fly",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].star_moon_folding_fan_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["103"]();
//riddles["102"]();
riddles["104"] = () => {
    const enemy_hp = 126;
    const enemy_cultivation = 98;
    const enemy_physique = 66;
    const my_hp = 137;
    const my_cultivation = 90;
    const my_physique = 0;
    const my_cards = [
        //"five elements heavenly marrow rhythm",
        "kun wu metal ring",
        "metal spirit shuttle 2",
        "flying brush 2",
        "earth spirit formation 2",
        "earth spirit combine world 3",
        "flying brush 2",
        "earth spirit cliff 3",
        "earth spirit landslide",
    ];
    const enemy_cards = [
        "cloud elixir 3",
        "majestic qi 3",
        "ice guard elixir 3",
        "mighty force 3",
        "vast universe 2",
        "tiger pouncing 3",
        "ghost howling 3",
        "soul cleaving 3",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].unbounded_qi_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["104"]();
riddles["105"] = () => {
    const enemy_hp = 107;
    const enemy_cultivation = 88;
    const enemy_physique = 0;
    const my_hp = 103;
    const my_cultivation = 90;
    const my_physique = 0;
    const my_cards = [
        "ultimate world formation 2",
        "water spirit seal 3",
        "predicament for immortals",
        "wood spirit secret seal 2",
        "fire spirit heart fire",
        "five elements circulation 2",
        "earth spirit combine world 2",
        "wood spirit fragrant 2",
        "fire spirit blazing prairie 2",
        "metal spirit charge 2",
        "wood spirit thorn 2",
        //"wood spirit thorn",
    ];
    const enemy_cards = [
        "colorful spirit crane",
        "divine walk fulu 3",
        "spiritage incantation 2",
        "rule sky sword 2",
        "thousand evil 2",
        "cloud sword dragon roam 2",
        "dharma spirit sword 2",
        "chain sword formation 2",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 0;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].sword_in_sheathed_stacks = 1;
            game.players[my_idx].five_elements_explosion_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["105"]();
riddles["106"] = () => {
    const enemy_hp = 109;
    const enemy_cultivation = 88;
    const enemy_physique = 0;
    const my_hp = 105;
    const my_cultivation = 90;
    const my_physique = 0;
    const my_cards = [
        "earth spirit combine world",
        "predicament for immortals",
        //"ultimate world formation 2",
        "water spirit seal 3",
        "wood spirit secret seal 2",
        "fire spirit heart fire",
        "five elements circulation 2",
        "five elements circulation",
        "earth spirit combine world 2",
        "wood spirit fragrant 2",
        "fire spirit blazing prairie 2",
        "metal spirit charge 2",
    ];
    const enemy_cards = [
        "colorful spirit crane",
        "divine walk fulu 3",
        "spiritage incantation 2",
        "rule sky sword 2",
        "thousand evil 2",
        "dharma spirit sword 2",
        "chain sword formation 2",
        "ice incantation 2",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 0;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].sword_in_sheathed_stacks = 1;
            game.players[my_idx].five_elements_explosion_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["106"]();
riddles["107"] = () => {
    const enemy_hp = 1000;
    const enemy_cultivation = 88;
    const enemy_physique = 0;
    const my_hp = 1000;
    const my_cultivation = 90;
    const my_physique = 65;
    const my_cards = [
        "crane footwork",
        "elusive footwork",
        "exercise marrow",
        "exercise soul",
        "exercise marrow",
        "meru formation",
        "normal attack",
        "mountain cleaving palm",
    ];
    const enemy_cards = [
        "normal attack",
        "normal attack",
        "normal attack",
        "normal attack",
        "normal attack",
        "normal attack",
        "normal attack",
        "normal attack",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 0;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = my_basic_deck;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[my_idx].p2_mark_of_dark_heart_stacks = 1;
            game.sim_n_turns(64);
            game.dump();
            process.exit(0);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["107"]();
riddles["108"] = () => {
    const enemy_hp = 124;
    const enemy_cultivation = 41;
    const enemy_physique = 41;
    const my_hp = 117;
    const my_cultivation = 42;
    const my_physique = 0;
    const my_cards = [
        "water spirit spring rain",
        "heavenly marrow rhythm 2",
        "water spirit spring 2",
        "water spirit great waves 2",
        "water spirit turbulent 2",
        "water spirit combine rivers",
        "water spirit combine rivers",
        "water spirit spring 1",
        "water spirit great waves 1",
        "water spirit turbulent 1",
        "water spirit billows 2",
        "heavenly marrow rhythm",
    ];
    const enemy_cards = [
        "double trouble 3",
        "gather intense force 3",
        "majestic qi 3",
        "mighty force 3",
        "vast universe 2",
        "tiger pouncing 3",
        "ghost howling 3",
        "soul cleaving 3",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 0;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].unbounded_qi_stacks = 1;
            game.players[enemy_idx].p5_mark_of_dark_heart_stacks = 1;
            game.players[my_idx].peach_branch_ruyi_stacks = 1;
            game.players[my_idx].mark_of_water_spirit_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["108"]();
riddles["109"] = () => {
    const enemy_hp = 114;
    const enemy_cultivation = 999;
    const enemy_physique = 0;
    const my_hp = 129;
    const my_cultivation = 42;
    const my_physique = 0;
    const my_cards = [
        "kun wu metal ring",
        //"heavenly marrow rhythm 2",
        "finishing touch",
        "earth spirit formation 3",
        "earth spirit combine world 2",
        "flying brush",
        "flying brush",
        "earth spirit steep 2",
        "earth spirit landslide",
        "earth spirit combine world",
        "earth spirit cliff 2",
        "metal spirit iron bone 2",
        "metal spirit charge 3",
    ];
    const enemy_cards = [
        "polaris citta dharma 2",
        "star moon folding fan",
        "propit omen 3",
        "astral fly",
        "astral hit 2",
        "astral fly",
        "astral tiger 3",
        "great spirit 2",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].star_moon_folding_fan_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["109"]();
riddles["110"] = () => {
    const enemy_hp = 114;
    const enemy_cultivation = 999;
    const enemy_physique = 0;
    const my_hp = 129;
    const my_cultivation = 42;
    const my_physique = 0;
    const my_cards = [
        "kun wu metal ring",
        "heavenly marrow rhythm 2",
        "finishing touch",
        "flying brush 2",
        //"flying brush",
        "metal spirit formation 3",
        "metal spirit iron bone 2",
        "metal spirit charge 3",
        "metal spirit giant tripod 2",
        "metal spirit giant tripod",
        "metal spirit vigorous",
    ];
    const enemy_cards = [
        "polaris citta dharma 2",
        "star moon folding fan",
        "propit omen 3",
        "astral fly",
        "astral hit 2",
        "astral fly",
        "astral tiger 3",
        "great spirit 2",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].star_moon_folding_fan_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["110"]();
riddles["111"] = () => {
    const enemy_hp = 118;
    const enemy_cultivation = 999;
    const enemy_physique = 0;
    const my_hp = 126;
    const my_cultivation = 42;
    const my_physique = 0;
    const my_cards = [
        "divine walk fulu 2",
        "thousand evil incantation",
        "rule sky sword 3",
        "spirit gather 3",
        "raven spirit sword 2",
        "chain sword 2",
        "chain sword 1",
        "mirror flower sword 3",
        "spiritage incantation 3",
        "dharma sword 2",
        "egret sword 2",
        "giant kun sword 3",
    ];
    const enemy_cards = [
        "cloud sword dragon roam 2",
        "cloud sword moon shade 2",
        "cloud sword dragon roam 1",
        "flying spirit shade sword 3",
        "giant kun spirit sword 2",
        "flow cloud chaos sword 3",
        "rule sky sword 2",
        "ice spirit guard 3",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].fire_flame_blade_stacks = 1;
            game.players[enemy_idx].drift_ice_blade_stacks = 1;
            game.players[my_idx].sword_in_sheathed_stacks = 1;
            game.players[my_idx].p2_store_qi_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["111"]();
riddles["112"] = () => {
    const enemy_hp = 102;
    const enemy_cultivation = 999;
    const enemy_physique = 0;
    const my_hp = 139;
    const my_cultivation = 42;
    const my_physique = 0;
    const my_cards = [
        "kun wu metal ring 2",
        "metal spirit formation 2",
        "flying brush",
        "metal spirit shuttle",
        "metal spirit shuttle",
        "metal spirit charge 2",
        "metal spirit giant tripod 3",
        "earth spirit dust",
        "earth spirit landslide",
        "earth spirit combine world 2",
        "metal spirit vigorous",
        "earth spirit steep 3",
    ];
    const enemy_cards = [
        "ultimate world formation 3",
        "wood spirit secret seal 2",
        "wood spirit fragrant 3",
        "five elements circulation 2",
        "fire spirit blazing prairie 3",
        "fire spirit flash fire 3",
        "wood spirit thorn 3",
        "ice spirit guard elixir 2",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[0].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].five_elements_explosion_stacks = 1;
            game.players[enemy_idx].flame_soul_rebirth_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["112"]();
riddles["113"] = () => {
    const enemy_hp = 102;
    const enemy_cultivation = 999;
    const enemy_physique = 0;
    const my_hp = 101;
    const my_cultivation = 42;
    const my_physique = 0;
    const my_cards = [
        "divine walk fulu",
        "spirit gather citta dharma 3",
        "giant kun sword",
        "raven spirit sword",
        "rule sky sword",
        "mirror flower sword",
        "chain sword",
        "spiritage incantation",
    ];
    const enemy_cards = [
        "cloud sword softheart",
        "cloud sword softheart",
        "cloud sword moon shade 3",
        "cloud sword flash wind",
        "cloud sword avalanche",
        "cloud sword flash wind",
        "cloud sword necessity",
        "cloud sword flash wind",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[my_idx].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].fire_flame_blade_stacks = 1;
            game.players[my_idx].pack_of_adversity_reinforcement_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["113"]();
riddles["114"] = () => {
    const enemy_hp = 111;
    const enemy_cultivation = 999;
    const enemy_physique = 0;
    const my_hp = 105;
    const my_cultivation = 42;
    const my_physique = 0;
    const my_cards = [
        "divine walk fulu 2",
        "spirit gather citta dharma 2",
        "thousand evil incantation",
        "spiritage incantation 2",
        "egret spirit sword 2",
        "giant kun spirit sword",
        "giant kun spirit sword",
        "mirror flower sword 2",
        "raven spirit sword 2",
        "moon water sword",
        "centibird spirit sword 2",
    ];
    const enemy_cards = [
        "cloud sword dragon roam 3",
        "cloud sword moon shade 3",
        "cloud sword flash wind 3",
        "cloud sword pierce the star 2",
        "cloud sword flying sand 2",
        "dharma sword 3",
        "flying spirit shade sword",
        "flow cloud chaos sword 2",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 1;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[my_idx].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].lithe_as_cat_stacks = 1;
            game.players[my_idx].sword_in_sheathed_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["114"]();
riddles["115"] = () => {
    const enemy_hp = 105;
    const enemy_cultivation = 76;
    const enemy_physique = 0;
    const my_hp = 93;
    const my_cultivation = 87;
    const my_physique = 0;
    const my_cards = [
        "cosmos seal",
        "ultimate world formation",
        "water spirit spring",
        "world smash 3",
        "wood spirit secret seal",
        "fire spirit blazing prairie 2",
        "five elements circulation 2",
        "earth spirit combine world 2",
        "earth spirit dust",
    ];
    const enemy_cards = [
        "divine walk fulu 2",
        "weaken fulu 3",
        "rule sky sword 3",
        "cloud dance rhythm 2",
        "chain sword",
        "contemplate spirits rhythm 2",
        "chain sword",
        "clear heart sword embryo 3",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 0;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[my_idx].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].blade_forging_sharpness_stacks = 1;
            game.players[enemy_idx].sword_pattern_carving_chain_attack_stacks = 1;
            game.players[enemy_idx].qi_forging_spiritual_power_stacks = 1;
            game.players[enemy_idx].quench_of_sword_heart_ultimate_stacks = 1;
            game.players[my_idx].five_elements_explosion_stacks = 1;
            game.players[my_idx].pack_of_adversity_reinforcement_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
//riddles["115"]();
riddles["116"] = () => {
    const enemy_hp = 94;
    const enemy_cultivation = 85;
    const enemy_physique = 0;
    const my_hp = 94;
    const my_cultivation = 90;
    const my_physique = 0;
    const my_cards = [
        "spirit gather citta dharma 2",
        "finishing touch 2",
        "sky delicate bracelet",
        "moon water sword 1",
        "rule sky sword 3",
        "flying brush",
        "mirror flower sword 3",
        "chain sword 3",
        //"raven spirit sword",
    ];
    const enemy_cards = [
        "finishing touch 2",
        "heaven hexagram",
        "astral tiger 3",
        "stillness citta dharma",
        "dance of the dragonfly 2",
        "flying brush 2",
        "strike twice 3",
        "normal attack",
    ];
    fixup_deck(my_cards);
    //for (var i=0; i<my_cards.length; i++) {
    //    console.log(format_card(my_cards[i]));
    //}
    fixup_deck(enemy_cards);
    //for (var i=0; i<enemy_cards.length; i++) {
    //    console.log(format_card(enemy_cards[i]));
    //}
    //return;
    var go = true;
    var combo_idx = 0;
    // my_basic_deck is just my_cards entries 0-7
    var my_basic_deck = my_cards.slice(0, 8);
    var max_turns_game = undefined;
    var max_turns = 0;
    var best_winning_margin = 0;
    var tried_combos = {};
    for (var combo of k_combinations(my_cards, 8)) {
        combo_idx += 1;
        console.log("combo_idx: " + combo_idx);
        // sort the combo
        combo.sort();
        // append all the card ids together separated by commas
        var combo_id = combo.join(",");
        if (tried_combos[combo_id]) {
            continue;
        }
        tried_combos[combo_id] = true;
        // if this combo has 3 or more continuous/consumption cards, skip it

        var normal_attack_count = 0;
        var concon_count = 0;
        for (var i=0; i<8; i++) {
            if (swogi[combo[i]].is_continuous || swogi[combo[i]].is_consumption) {
                concon_count += 1;
            }
            if (swogi[combo[i]].name == "Normal Attack") {
                normal_attack_count += 1;
            }
        }
        if (concon_count >= 3) {
            continue;
        }
        if (normal_attack_count < 1) {
            //continue;
        }
        console.log("concon_count: " + concon_count);
        var try_idx = 0;
        do {
            try_idx += 1;
            var game = new GameState();
            //for (var i=0; i<8; i++) {
            //    temp_combo[i] = temp_combo[i].replace(".0", "");
            //}
            const my_idx = 0;
            const enemy_idx = 1 - my_idx;
            game.players[enemy_idx].cards = enemy_cards;
            game.players[my_idx].cards = combo;
            //game.players[my_idx].cards = my_basic_deck;
            game.players[enemy_idx].physique = enemy_physique;
            game.players[enemy_idx].max_hp = enemy_hp + enemy_physique;
            game.players[enemy_idx].hp = enemy_hp;
            game.players[my_idx].physique = my_physique;
            game.players[my_idx].max_hp = my_hp + my_physique;
            game.players[my_idx].hp = my_hp;
            game.players[enemy_idx].cultivation = enemy_cultivation;
            game.players[my_idx].cultivation = my_cultivation;
            game.players[enemy_idx].astrology_stacks = 1;
            game.players[enemy_idx].heptastar_soulstat_stacks = 1;
            game.players[enemy_idx].p5_divination_stacks = 1;
            game.sim_n_turns(64);
            if (game.winner == my_idx && !game.used_randomness) {
                const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp;
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    best_winning_margin = winning_margin;
                    for (var i=0; i<8; i++) {
                        p_combo[i] = format_card(p_combo[i]);
                    }
                    game.dump();
                    console.log("winning deck: " + JSON.stringify(p_combo));
                    console.log("winning margin: " + winning_margin);
                }
            } else {
            }
        } while (next_permutation(combo));
        console.log("try_idx: " + try_idx);
    }
    return;

};
riddles["116"]();
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
