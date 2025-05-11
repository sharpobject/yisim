import fs from 'fs';
import { GameState, ready as gamestate_ready } from './gamestate_full';
import { format_card, ready as card_info_ready } from './card_info';
import { card_name_to_id_fuzzy } from './card_name_to_id_fuzzy';
import parse_input from './parse_input';
import db from './db_sqlite';

await gamestate_ready;
await card_info_ready;

let jsonData = null;

if (process.argv.length === 3) {
  db.connectForRead();
  const result = db.getBattle(process.argv[2]); // command-line argument is BATTLE.ID
  db.close();
  jsonData = {
    a_first: result.A_FIRST,
    a: JSON.parse(result.PLAYER_A),
    b: JSON.parse(result.PLAYER_B),
  };
  jsonData.a.cards = [result.A1, result.A2, result.A3, result.A4, result.A5, result.A6, result.A7, result.A8].filter((i) => (i)).map((i) => ('' + i));
  jsonData.b.cards = [result.B1, result.B2, result.B3, result.B4, result.B5, result.B6, result.B7, result.B8].filter((i) => (i)).map((i) => ('' + i));
} else if (process.argv.length > 3) {
  db.connectForRead();
  const result = db.getBattleByBatchId(process.argv[2]); // command-line arguments are BATCH.ID followed by cards to substitute for the permuting player
  db.close();
  const options = JSON.parse(result.OPTIONS);
  jsonData = {
    a_first: options.a_first !== false,
    a: JSON.parse(result.PLAYER_A),
    b: JSON.parse(result.PLAYER_B),
  };
  if (options.permute_a) {
    if (options.permute_b) {
      console.error('Error: permute_a && permute_b');
      process.exit(1);
    }
    jsonData.a.cards = process.argv.slice(3).map((s) => s.trim().toLowerCase()).filter((s) => (s !== 'null')).map(card_name_to_id_fuzzy);
    jsonData.b.cards = [result.B1, result.B2, result.B3, result.B4, result.B5, result.B6, result.B7, result.B8].filter((i) => (i)).map((i) => ('' + i));
  } else if (!options.permute_b) {
    console.error('Error: permute_a == false && permute_b == false');
    process.exit(1);
  } else {
    jsonData.a.cards = [result.A1, result.A2, result.A3, result.A4, result.A5, result.A6, result.A7, result.A8].filter((i) => (i)).map((i) => ('' + i));
    jsonData.b.cards = process.argv.slice(3).map((s) => s.trim().toLowerCase()).filter((s) => (s !== 'null')).map(card_name_to_id_fuzzy);
  }
} else {
  jsonData = parse_input(fs.readFileSync(0, 'utf8')); // if no command-line argument, read JSON or pseudo-YAML from stdin
  jsonData.a_first = jsonData.a_first !== false;
  const deck_slots = jsonData.deck_slots || 8;
  jsonData.a.cards = jsonData.a.cards.slice(0, deck_slots);
  jsonData.b.cards = jsonData.b.cards.slice(0, deck_slots);
}

const game = new GameState();

if (jsonData.a_first) {
  Object.assign(game.players[0], jsonData.a);
  Object.assign(game.players[1], jsonData.b);
} else {
  Object.assign(game.players[0], jsonData.b);
  Object.assign(game.players[1], jsonData.a);
}

game.sim_n_turns(64);

console.log(game.output.join('\n'));
console.log('Player 0\'s deck:');
console.log(game.players[0].cards.map((c) => `  ${format_card(c)}`).join('\n'));
console.log('Player 1\'s deck:');
console.log(game.players[1].cards.map((c) => `  ${format_card(c)}`).join('\n'));
