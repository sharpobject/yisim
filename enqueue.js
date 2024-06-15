import fs from 'fs';
import readline from 'readline';
import { swogi } from './gamestate_nolog';
import parse_input from './parse_input';
import db from './db_sqlite';

// Check if a command-line argument is provided
if (process.argv.length < 3) {
  console.error('Usage: bun enqueue.js <path to JSON or pseudo-YAML>');
  process.exit(1);
}
const dataFilePath = process.argv[2];
const dataString = fs.readFileSync(dataFilePath, 'utf8');

const jsonData = parse_input(dataString);

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
  for (let subcombo of k_combinations(tail, k - 1)) {
    yield [head, ...subcombo];
  }
  for (let subcombo of k_combinations(tail, k)) {
    yield subcombo;
  }
}

const deck_slots = jsonData.deck_slots || 8;

const getCombos = (character, options, permute) => {
  if (!permute) {
    return [character.cards.slice(0, deck_slots)];
  }
  const limit_consumption = options.limit_consumption !== false;
  const combos = [];
  const tried_combos = {};
  for (let combo of k_combinations(character.cards, deck_slots)) {
    combo.sort();
    let combo_id = combo.join(',');
    if (tried_combos[combo_id]) {
      continue;
    }
    tried_combos[combo_id] = true;
    let consumption_count = 0;
    if (limit_consumption) {
      for (let card of combo) {
        const x = swogi[card];
        if (x.is_consumption || x.is_continuous) {
          consumption_count++;
          if (consumption_count > 2) {
            break;
          }
        }
      }
    }
    if (consumption_count <= 2) {
      combos.push(combo);
    }
  }
  return combos;
};

const combos = [getCombos(jsonData.a, jsonData, jsonData.permute_a), getCombos(jsonData.b, jsonData, jsonData.permute_b)];

let factorial = 1;
for (let i = 2; i <= deck_slots; i++) {
  factorial *= i;
}

if (combos[0].length * (jsonData.permute_a ? factorial : 1) * combos[1].length * (jsonData.permute_b ? factorial : 1) >= 100000000) {
  const message = `Warning: ${combos[0].length} * ${jsonData.permute_a ? factorial : 1} * ${combos[1].length} * ${jsonData.permute_b ? factorial : 1} = ${(combos[0].length * (jsonData.permute_a ? factorial : 1) * combos[1].length * (jsonData.permute_b ? factorial : 1)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} jobs! Continue? [y/N] `;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(message, (answer) => {
    rl.close();
    if (answer[0].toLowerCase() === 'y') {
      db.enqueueAndExit(jsonData, combos);
    } else {
      console.log('Exiting...');
      process.exit(1);
    }
  });
} else {
  db.enqueueAndExit(jsonData, combos);
}
