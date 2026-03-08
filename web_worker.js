// Static imports for card data (needed by specialized gamestate code)
import { swogi, SECTS, format_card, CRASH_FIST_CARDS, ready as card_info_ready } from './card_info.js';
// Full gamestate with logging, used for replaying winning combos
import { GameState as GameStateWithLog, Player as PlayerWithLog, ready as gamestate_ready } from './gamestate_full_ui.js';

let SpecializedGameState = null;
let SpecializedPlayer = null;

function next_permutation(arr) {
    let i = arr.length - 1;
    while (i > 0 && arr[i-1] >= arr[i]) {
        i -= 1;
    }
    if (i === 0) {
        return false;
    }
    let j = arr.length - 1;
    while (arr[j] <= arr[i-1]) {
        j -= 1;
    }
    let temp = arr[i-1];
    arr[i-1] = arr[j];
    arr[j] = temp;
    j = arr.length - 1;
    while (i < j) {
        temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        i += 1;
        j -= 1;
    }
    return true;
}

// receive a GameState and return a list of most-winning decks
self.onmessage = async (event) => {
    await gamestate_ready;
    await card_info_ready;

    // Handle init message: compile specialized gamestate code
    if (event.data.type === 'init') {
        const factory = new Function('swogi', 'SECTS', 'format_card', 'CRASH_FIST_CARDS',
            event.data.code);
        const exports = factory(swogi, SECTS, format_card, CRASH_FIST_CARDS);
        SpecializedGameState = exports.GameState;
        SpecializedPlayer = exports.Player;
        postMessage({ type: 'init_done' });
        return;
    }

    const worker_idx = event.data.worker_idx;
    const players = event.data.players;
    const my_idx = event.data.my_idx;
    const enemy_idx = 1 - my_idx;
    const combo = event.data.players[my_idx].cards.slice();
    const ret = {};
    const winning_decks = [];
    const winning_margins = [];
    let winning_info = {};
    const winning_logs = [];
    let try_idx = 0;
    let best_winning_margin = -99999;
    let best_winrate = 0.8;
    let best_hp = -99999;

    // Use specialized (faster, nolog) classes for brute force if available
    const FastGameState = SpecializedGameState || GameStateWithLog;
    const FastPlayer = SpecializedPlayer || PlayerWithLog;

    const a = new FastPlayer();
    const b = new FastPlayer();
    const alog = new PlayerWithLog();
    const blog = new PlayerWithLog();
    if (event.data.just_run) {
        let game = new GameStateWithLog(alog, blog);
        for (let key in players[my_idx]) {
            game.players[my_idx][key] = players[my_idx][key];
        }
        for (let key in players[enemy_idx]) {
            game.players[enemy_idx][key] = players[enemy_idx][key];
        }
        game.players[my_idx].cards = combo;
        if (event.data.zongzi) {
            game.sim_n_turns_zongzi(8);
        } else if (event.data.dummy) {
            game.sim_n_turns_zongzi(12);
        } else {
            game.sim_n_turns(64);
        }
        const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp - 1000 * game.turns_taken;
        const p_combo = combo.slice();
        winning_decks.push(p_combo);
        winning_margins.push(winning_margin);
        winning_logs.push(game.output);
    } else {
        do {
            var winrate = 0;
            try_idx += 1;
            let game = new FastGameState(a, b);
            for (let key in players[my_idx]) {
                game.players[my_idx][key] = players[my_idx][key];
            }
            for (let key in players[enemy_idx]) {
                game.players[enemy_idx][key] = players[enemy_idx][key];
            }
            game.players[my_idx].cards = combo;
            if (event.data.zongzi) {
                game.sim_n_turns_zongzi(8);
            } else if (event.data.dummy) {
                game.sim_n_turns_zongzi(12);
            } else {
                game.sim_n_turns(64);
            }

            if (game.used_randomness && game.winner === my_idx && false) {
                var win_count = game.winner === my_idx ? 1 : 0;
                var total_count = 1;
                for(var qq=0; qq<20; qq++) {
                    let game = new FastGameState(a, b);
                    for (let key in players[my_idx]) {
                        game.players[my_idx][key] = players[my_idx][key];
                    }
                    for (let key in players[enemy_idx]) {
                        game.players[enemy_idx][key] = players[enemy_idx][key];
                    }
                    game.players[my_idx].cards = combo;
                    game.sim_n_turns(64);
                    total_count += 1;
                    if (game.winner === my_idx) {
                        win_count += 1;
                    }
                }
                winrate = win_count / total_count;
            } else {
                winrate = game.winner === my_idx ? 1 : 0;
            }
            if (game.winner === my_idx && !game.used_randomness) {
                best_winrate = winrate;
                const myHP = game.players[my_idx].hp;
                const enemyHP = game.players[enemy_idx].hp;
                const turns = game.turns_taken;
                const winning_margin = (myHP * 2 - enemyHP - Math.min(turns, 8) * 2);
                const p_combo = combo.slice();
                if (winning_margin > best_winning_margin) {
                    winning_decks.length = 0;
                    winning_margins.length = 0;
                    winning_logs.length = 0;
                    best_winning_margin = winning_margin;
                    winning_decks.push(p_combo);
                    winning_margins.push(winning_margin);
                    winning_info = {
                        myHP,
                        enemyHP,
                        turns,
                    }
                    // Replay winning combo with full logging
                    let game_with_log = new GameStateWithLog(alog, blog);
                    for (let key in players[my_idx]) {
                        game_with_log.players[my_idx][key] = players[my_idx][key];
                    }
                    for (let key in players[enemy_idx]) {
                        game_with_log.players[enemy_idx][key] = players[enemy_idx][key];
                    }
                    game_with_log.players[my_idx].cards = combo;
                    if (event.data.zongzi) {
                        game_with_log.sim_n_turns_zongzi(8);
                    } else if (event.data.dummy) {
                        game_with_log.sim_n_turns_zongzi(12);
                    } else {
                        game_with_log.sim_n_turns(64);
                    }
                    winning_logs.push(game_with_log.output);
                }
            }
        } while (next_permutation(combo));
    }
    ret.worker_idx = worker_idx;
    ret.combo = combo;
    ret.winning_decks = winning_decks;
    ret.winning_margins = winning_margins;
    ret.winning_info = winning_info;
    ret.winning_logs = winning_logs;
    ret.try_idx = try_idx;
    postMessage(ret);
};
