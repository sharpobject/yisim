({ GameState } = require("./gamestate_nolog.js"));

// receive a GameState and return a list of most-winning decks
onmessage = (event) => {
    const batch = event.data.batch;
    if (batch.OPTIONS.a_first === false) {
        const players = [batch.PLAYER_B, batch.PLAYER_A];
        for (let j of event.data.jobs) {
            const game = new GameState();
            for (let i = 0; i < 2; i++) {
                for (let key in players[i]) {
                    game.players[i][key] = players[i][key];
                }
            }
            game.players[0].cards = [j.B1.toString(), j.B2.toString(), j.B3.toString(), j.B4.toString(), j.B5.toString(), j.B6.toString(), j.B7.toString(), j.B8.toString()];
            game.players[1].cards = [j.A1.toString(), j.A2.toString(), j.A3.toString(), j.A4.toString(), j.A5.toString(), j.A6.toString(), j.A7.toString(), j.A8.toString()];
            game.sim_n_turns(64);
            let margin = game.players[0].hp < game.players[1].hp ?
                game.players[1].hp - game.players[0].hp - 1000 * game.turns_taken :
                game.players[0].hp - game.players[1].hp - 1000 * game.turns_taken;
            margin = 2 - 2 / (1 + 2 ** (margin / 4096)); // monotonic transformation to non-negative
            if (!(game.players[0].hp < game.players[1].hp)) {
                margin = -margin;
            }
            j.USED_RANDOM = game.used_randomness ? 1 : 0;
            j.A_FIRST = 0;
            j.TURNS = game.turns_taken;
            j.HP_A = game.players[1].hp;
            j.HP_B = game.players[0].hp;
            j.T_SIGMOID = margin;
        }
    } else {
        const players = [batch.PLAYER_A, batch.PLAYER_B];
        for (let j of event.data.jobs) {
            const game = new GameState();
            for (let i = 0; i < 2; i++) {
                for (let key in players[i]) {
                    game.players[i][key] = players[i][key];
                }
            }
            game.players[0].cards = [j.A1.toString(), j.A2.toString(), j.A3.toString(), j.A4.toString(), j.A5.toString(), j.A6.toString(), j.A7.toString(), j.A8.toString()];
            game.players[1].cards = [j.B1.toString(), j.B2.toString(), j.B3.toString(), j.B4.toString(), j.B5.toString(), j.B6.toString(), j.B7.toString(), j.B8.toString()];
            game.sim_n_turns(64);
            let margin = game.players[0].hp < game.players[1].hp ?
                game.players[1].hp - game.players[0].hp - 1000 * game.turns_taken :
                game.players[0].hp - game.players[1].hp - 1000 * game.turns_taken;
            margin = 2 - 2 / (1 + 2 ** (margin / 4096)); // monotonic transformation to non-negative
            if (game.players[0].hp < game.players[1].hp) {
                margin = -margin;
            }
            j.USED_RANDOM = game.used_randomness ? 1 : 0;
            j.A_FIRST = 1;
            j.TURNS = game.turns_taken;
            j.HP_A = game.players[0].hp;
            j.HP_B = game.players[1].hp;
            j.T_SIGMOID = margin;
        }
    }
    postMessage(({ jobs: event.data.jobs }));
};
