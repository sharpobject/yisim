import fs from 'fs';
import { GameState, format_card } from './gamestate';
import parse_input from './parse_input';
import db from './db_sqlite';

let jsonData = null;

// Check if a command-line argument is provided
if (process.argv.length < 3) {
  jsonData = parse_input(fs.readFileSync(0, 'utf8')); // if no command-line argument, read JSON or pseudo-YAML from stdin
  jsonData.a_first = jsonData.a_first !== false;
  const deck_slots = jsonData.deck_slots || 8;
  jsonData.a.cards = jsonData.a.cards.slice(0, deck_slots);
  jsonData.b.cards = jsonData.b.cards.slice(0, deck_slots);
} else {
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
