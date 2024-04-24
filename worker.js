({ GameState, card_name_to_id_fuzzy } = require("./gamestate_nolog.js"));
const { GameState: GameStateWithLog } = require("./gamestate.js");


function next_permutation(arr) {
    var i = arr.length - 1;
    while (i > 0 && arr[i-1] >= arr[i]) {
        i -= 1;
    }
    if (i === 0) {
        return false;
    }
    var j = arr.length - 1;
    while (arr[j] <= arr[i-1]) {
        j -= 1;
    }
    var temp = arr[i-1];
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
onmessage = (event) => {
    const worker_idx = event.data.worker_idx;
    const players = event.data.players;
    const my_idx = event.data.my_idx;
    const enemy_idx = 1 - my_idx;
    const combo = event.data.players[my_idx].cards.slice();
    const ret = {};
    const winning_decks = [];
    const winning_margins = [];
    const winning_logs = [];
    var try_idx = 0;
    var best_winning_margin = -99999;
    do {
        try_idx += 1;
        var game = new GameState();
        for (let key in players[my_idx]) {
            game.players[my_idx][key] = players[my_idx][key];
        }
        for (let key in players[enemy_idx]) {
            game.players[enemy_idx][key] = players[enemy_idx][key];
        }
        game.players[my_idx].cards = combo;
        game.sim_n_turns(64);
        if (game.winner === my_idx && !game.used_randomness) {
        //if (!game.used_randomness) {
            const winning_margin = game.players[my_idx].hp - game.players[enemy_idx].hp - 1000 * game.turns_taken;
            const p_combo = combo.slice();
            if (winning_margin > best_winning_margin) {
                best_winning_margin = winning_margin;
                winning_decks.push(p_combo);
                winning_margins.push(winning_margin);
                var game_with_log = new GameStateWithLog();
                for (let key in players[my_idx]) {
                    game_with_log.players[my_idx][key] = players[my_idx][key];
                }
                for (let key in players[enemy_idx]) {
                    game_with_log.players[enemy_idx][key] = players[enemy_idx][key];
                }
                game_with_log.players[my_idx].cards = combo;
                game_with_log.sim_n_turns(64);
                winning_logs.push(game_with_log.output);
            }
        }
    } while (next_permutation(combo));
    ret.worker_idx = worker_idx;
    ret.combo = combo;
    ret.winning_decks = winning_decks;
    ret.winning_margins = winning_margins;
    ret.winning_logs = winning_logs;
    ret.try_idx = try_idx;
    postMessage(ret);
};