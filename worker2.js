({
  GameState
} = require("./gamestate_nolog.js"));

function next_permutation(arr) {
  let i = arr.length - 1;
  while (i > 0 && arr[i - 1] >= arr[i]) {
    i -= 1;
  }
  if (i === 0) {
    return false;
  }
  let j = arr.length - 1;
  while (arr[j] <= arr[i - 1]) {
    j -= 1;
  }
  let temp = arr[i - 1];
  arr[i - 1] = arr[j];
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

onmessage = (event) => {
  const batch = event.data.batch;
  const job = event.data.job;
  const results = [];
  if (batch.OPTIONS.permute_a) {

  } else if (batch.OPTIONS.permute_b) {

  } else {
    if (batch.OPTIONS.a_first === false) {
      const players = [batch.PLAYER_B, batch.PLAYER_A];
      const game = new GameState();
      for (let i = 0; i < 2; i++) {
        for (let key in players[i]) {
          game.players[i][key] = players[i][key];
        }
      }
      game.players[0].cards = job.CARDS.b;
      game.players[1].cards = job.CARDS.a;
      for (let p of game.players) {
        for (let i = 0; i < 8; i++) {
          p.cards[i] = p.cards[i].toString();
        }
      }
      game.sim_n_turns(64);
      let margin = game.players[0].hp < game.players[1].hp ?
        game.players[1].hp - game.players[0].hp - 1000 * game.turns_taken :
        game.players[0].hp - game.players[1].hp - 1000 * game.turns_taken;
      margin = 2 - 2 / (1 + 2 ** (margin / 4096)); // monotonic transformation to non-negative
      if (!(game.players[0].hp < game.players[1].hp)) {
        margin = -margin;
      }
      // results.push({
      //   BATCH_ID: job.BATCH_ID, JOB_ID: job.ID,
      //   A1: +game.players[1].cards[0], A2: +game.players[1].cards[1], A3: +game.players[1].cards[2], A4: +game.players[1].cards[3], A5: +game.players[1].cards[4], A6: +game.players[1].cards[5], A7: +game.players[1].cards[6], A8: +game.players[1].cards[7],
      //   B1: +game.players[0].cards[0], B2: +game.players[0].cards[1], B3: +game.players[0].cards[2], B4: +game.players[0].cards[3], B5: +game.players[0].cards[4], B6: +game.players[0].cards[5], B7: +game.players[0].cards[6], B8: +game.players[0].cards[7],
      //   USED_RANDOM: game.used_randomness ? 1 : 0, A_FIRST: 0, TURNS: game.turns_taken, HP_A: game.players[1].hp, HP_B: game.players[0].hp, T_SIGMOID: margin,
      // });
      results.push([
        batch.ID, job.ID,
        +game.players[1].cards[0], +game.players[1].cards[1], +game.players[1].cards[2], +game.players[1].cards[3], +game.players[1].cards[4], +game.players[1].cards[5], +game.players[1].cards[6], +game.players[1].cards[7],
        +game.players[0].cards[0], +game.players[0].cards[1], +game.players[0].cards[2], +game.players[0].cards[3], +game.players[0].cards[4], +game.players[0].cards[5], +game.players[0].cards[6], +game.players[0].cards[7],
        game.used_randomness ? 1 : 0, 0, game.turns_taken, game.players[1].hp, game.players[0].hp, margin
      ]);
    } else {
      const players = [batch.PLAYER_A, batch.PLAYER_B];
      const game = new GameState();
      for (let i = 0; i < 2; i++) {
        for (let key in players[i]) {
          game.players[i][key] = players[i][key];
        }
      }
      game.players[0].cards = job.CARDS.a;
      game.players[1].cards = job.CARDS.b;
      for (let p of game.players) {
        for (let i = 0; i < 8; i++) {
          p.cards[i] = p.cards[i].toString();
        }
      }
      game.sim_n_turns(64);
      let margin = game.players[0].hp < game.players[1].hp ?
        game.players[1].hp - game.players[0].hp - 1000 * game.turns_taken :
        game.players[0].hp - game.players[1].hp - 1000 * game.turns_taken;
      margin = 2 - 2 / (1 + 2 ** (margin / 4096)); // monotonic transformation to non-negative
      if (game.players[0].hp < game.players[1].hp) {
        margin = -margin;
      }
      // results.push({
      //   BATCH_ID: job.BATCH_ID, JOB_ID: job.ID,
      //   A1: +game.players[0].cards[0], A2: +game.players[0].cards[1], A3: +game.players[0].cards[2], A4: +game.players[0].cards[3], A5: +game.players[0].cards[4], A6: +game.players[0].cards[5], A7: +game.players[0].cards[6], A8: +game.players[0].cards[7],
      //   B1: +game.players[1].cards[0], B2: +game.players[1].cards[1], B3: +game.players[1].cards[2], B4: +game.players[1].cards[3], B5: +game.players[1].cards[4], B6: +game.players[1].cards[5], B7: +game.players[1].cards[6], B8: +game.players[1].cards[7],
      //   USED_RANDOM: game.used_randomness ? 1 : 0, A_FIRST: 1, TURNS: game.turns_taken, HP_A: game.players[0].hp, HP_B: game.players[1].hp, T_SIGMOID: margin,
      // });
      results.push([
        batch.ID, job.ID,
        +game.players[0].cards[0], +game.players[0].cards[1], +game.players[0].cards[2], +game.players[0].cards[3], +game.players[0].cards[4], +game.players[0].cards[5], +game.players[0].cards[6], +game.players[0].cards[7],
        +game.players[1].cards[0], +game.players[1].cards[1], +game.players[1].cards[2], +game.players[1].cards[3], +game.players[1].cards[4], +game.players[1].cards[5], +game.players[1].cards[6], +game.players[1].cards[7],
        game.used_randomness ? 1 : 0, 1, game.turns_taken, game.players[0].hp, game.players[1].hp, margin,
      ]);
    }
  }
  postMessage(({ results }));
};
