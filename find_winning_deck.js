import { guess_character, ready as gamestate_ready } from "./gamestate_full_ui.js";
import { swogi, format_card, ready as card_info_ready } from './card_info.js';

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

function handle_response(riddle, response) {
    const winning_decks = response.winning_decks;
    const winning_margins = response.winning_margins;
    const winning_logs = response.winning_logs;
    // console.log("got response with " + winning_decks.length + " winning decks");
    for (let i=0; i<winning_decks.length; i++) {
        //if (winning_margins[i] > 10000) {
        if (winning_margins[i] > riddle.best_winning_margin) {
            riddle.best_winning_margin = winning_margins[i];
            for (let j=0; j<winning_decks[i].length; j++) {
                winning_decks[i][j] = format_card(winning_decks[i][j]);
            }
            // console.log(winning_logs[i].join("\n"));
            //const deck_str = stringifiedd(winning_decks[i]);
            //console.log("\"" + deck_str + "\": "+winning_margins[i]+",");
            //deck_to_hp[deck_str] = winning_margins[i];
            // console.log("winning deck: " + JSON.stringify(winning_decks[i]));
            // console.log("winning margin: " + winning_margins[i]);
        }
    }
    riddle.try_idx += response.try_idx;
    // console.log("handled response");
}

export async function do_riddle(riddle, handler) {
    await gamestate_ready;
    await card_info_ready;
    const my_idx = riddle.my_idx;
    const enemy_idx = 1 - my_idx;
    const my_cards = riddle.players[my_idx].cards;
    const enemy_cards = riddle.players[enemy_idx].cards;
    riddle.best_winning_margin = -99999;
    riddle.try_idx = 0;
    // const preprocessor_config = {};
    // for (let player of riddle.players) {
    //     for (let key in player) {
    //         preprocessor_config[key] = true;
    //     }
    //     for (let card_id of player.cards) {
    //         preprocessor_config[card_id.slice(0, 5)] = true;
    //     }
    // }
    // preprocess_plz(preprocessor_config);

    const numCores = Math.max(1, Math.floor(0.8 * navigator.hardwareConcurrency));
    const workers = [];
    const messages_outstanding = [];

    for (let i = 0; i < numCores; i++) {
        const worker = new Worker('engine/web_worker.js', { type: 'module' });
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

    if (riddle.players[my_idx].character === undefined || riddle.players[my_idx].character.length !== 3) {
        riddle.players[my_idx].character = guess_character(riddle.players[my_idx]);
    }
    if (riddle.players[enemy_idx].character === undefined || riddle.players[enemy_idx].character.length !== 3) {
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
            }
            if (concon_count >= 3) {
                continue;
            }
            // console.log("combo_idx: " + combo_idx);
            // console.log("concon_count: " + concon_count);
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
                handler(riddle, response);
            }
            riddle.players[my_idx].cards = combo;
            riddle.worker_idx = worker_idx;
            //console.log("sending message to worker_idx: " + worker_idx);
            messages_outstanding[worker_idx] += 1;
            workers[worker_idx].postMessage(riddle);
        }
    }
    // wait for all messages to come back
    let total_messages_outstanding = 0;
    for (let i=0; i<numCores; i++) {
        total_messages_outstanding += messages_outstanding[i];
    }
    // console.log("total_messages_outstanding: " + total_messages_outstanding);
    while (total_messages_outstanding > 0) {
        let response = await getMessage();
        handler(riddle, response);
        total_messages_outstanding -= 1;
    }
    // shut down the workers
    for (let i = 0; i < numCores; i++) {
        workers[i].terminate();
    }
    // console.log("try_idx: " + riddle.try_idx);
}
