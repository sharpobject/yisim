import { GameState } from './gamestate_full_nolog';

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

function simulateGame(batch, job, aFirst) {
  const deck_slots = batch.OPTIONS.deck_slots || 8;
  const players = aFirst ? [batch.PLAYER_A, batch.PLAYER_B] : [batch.PLAYER_B, batch.PLAYER_A];

  const game = new GameState();

  for (let i = 0; i < 2; i++) {
    Object.assign(game.players[i], players[i]);
  }
  game.players[0].cards = (aFirst ? job.CARDS_A : job.CARDS_B).slice(0, deck_slots);
  game.players[1].cards = (aFirst ? job.CARDS_B : job.CARDS_A).slice(0, deck_slots);

  game.sim_n_turns(64);

  return formatResult(batch, job, aFirst, game);
}

function calculateMargin(aFirst, game) {
  const hpDifference = game.players[1].hp - game.players[0].hp;
  const baseMargin = Math.abs(hpDifference) - 1000 * game.turns_taken;
  const transformedMargin = 2 - 2 / (1 + 2 ** (baseMargin / 4096));
  return (hpDifference > 0) === aFirst ? -transformedMargin : transformedMargin;
}

function formatResult(batch, job, aFirst, game) {
  const cardsA = game.players[aFirst ? 0 : 1].cards.map(Number);
  const cardsB = game.players[aFirst ? 1 : 0].cards.map(Number);
  const margin = calculateMargin(aFirst, game);
  while (cardsA.length < 8) {
    cardsA.push(null);
  }
  while (cardsB.length < 8) {
    cardsB.push(null);
  }

  return [
    batch.ID, job.ID,
    ...cardsA, ...cardsB,
    game.used_randomness ? 1 : 0, aFirst ? 1 : 0,
    game.turns_taken, game.players[aFirst ? 0 : 1].hp, game.players[aFirst ? 1 : 0].hp, margin
  ];
}

// Message handler
onmessage = (event) => {
  const { batch, job } = event.data;
  const aFirst = batch.OPTIONS.a_first !== false;
  const results = [];

  if (batch.OPTIONS.permute_a) {
    do {
      results.push(simulateGame(batch, job, aFirst));
    } while (next_permutation(job.CARDS_A));
  } else if (batch.OPTIONS.permute_b) {
    do {
      results.push(simulateGame(batch, job, aFirst));
    } while (next_permutation(job.CARDS_B));
  } else {
    results.push(simulateGame(batch, job, aFirst));
  }

  postMessage({ results });
};
