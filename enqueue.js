import fs from 'fs';
import readline from 'readline';
import { card_name_to_id_fuzzy, guess_character, swogi } from './gamestate_nolog.js';
import db from './db_sqlite';

// Check if a command-line argument is provided
if (process.argv.length < 3) {
  console.error('Usage: bun enqueue.js <json_file>');
  process.exit(1);
}

const dataFilePath = process.argv[2];
const dataString = fs.readFileSync(dataFilePath, 'utf8');

let jsonData = null;
if (dataFilePath.endsWith('.json')) {
  jsonData = JSON.parse(dataString);
} else {
  jsonData = {
    permute_a: false,
    permute_b: false,
    a_first: true,
    limit_consumption: true,
    a: { physique: 0, max_physique: 0, cards: [] },
    b: { physique: 0, max_physique: 0, cards: [] },
  };
  const lines = dataString.split(/\r\n|\r|\n/).map((s) => s.trim()).filter((s) => s.length);
  let section = 0;
  for (let line of lines) {
    const comment = line.indexOf('#');
    if (comment !== -1) {
      line = line.substring(0, comment).trimEnd();
      if (!line.length) {
        continue;
      }
    }
    if (line === 'a:') {
      section = 1;
      continue;
    }
    if (line === 'b:') {
      section = 2;
      continue;
    }
    const colon = line.indexOf(':');
    if (colon === -1) {
      (section === 1 ? jsonData.a : jsonData.b).cards.push(line);
    } else {
      const leftSide = line.substring(0, colon).trimEnd().replaceAll(' ', '_');
      let rightSide = line.substring(colon + 1).trimStart();
      switch (rightSide) {
        case 'true':
        case 'yes':
          rightSide = true;
          break;
        case 'false':
        case 'no':
          rightSide = false;
          break;
        default:
          if (!isNaN(rightSide)) {
            rightSide = +rightSide;
          }
      }
      if (section === 0) {
        if (leftSide === 'permute') {
          if (rightSide === 'a') {
            jsonData.permute_a = true;
          } else if (rightSide === 'b') {
            jsonData.permute_b = true;
          }
        } else {
          jsonData[leftSide] = rightSide;
        }
      } else {
        (section === 1 ? jsonData.a : jsonData.b)[leftSide] = rightSide;
      }
    }
  }
}

if (jsonData.permute_a && jsonData.permute_b) {
  console.error('Permuting both players not supported.');
  process.exit(1);
}
if (jsonData.players) {
  jsonData.a = jsonData.players[0];
  jsonData.b = jsonData.players[1];
  delete jsonData.players;
}
jsonData.a.max_hp = jsonData.a.hp + jsonData.a.physique;
jsonData.b.max_hp = jsonData.b.hp + jsonData.b.physique;
// I really want this feature, but JSON doesn't support newlines
// if (typeof jsonData.a.cards === 'string') {
//   jsonData.a.cards = jsonData.a.cards.split(/\r\n|\r|\n/).filter((s) => s.length);
// }
// if (typeof jsonData.b.cards === 'string') {
//   jsonData.b.cards = jsonData.b.cards.split(/\r\n|\r|\n/).filter((s) => s.length);
// }
while (jsonData.a.cards.length < 8) {
  jsonData.a.cards.push('normal attack');
}
while (jsonData.b.cards.length < 8) {
  jsonData.b.cards.push('normal attack');
}
jsonData.a.cards = jsonData.a.cards.map(card_name_to_id_fuzzy);
jsonData.b.cards = jsonData.b.cards.map(card_name_to_id_fuzzy);
if (!jsonData.a.character) {
  jsonData.a.character = guess_character(jsonData.a);
}
if (!jsonData.b.character) {
  jsonData.b.character = guess_character(jsonData.b);
}

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

const getCombos = (character, options, permute) => {
  if (!permute) {
    return [character.cards.slice(0, 8)];
  }
  const limit_consumption = options.limit_consumption;
  const combos = [];
  const tried_combos = {};
  for (let combo of k_combinations(character.cards, 8)) {
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

if (combos[0].length * (jsonData.permute_a ? 40320 : 1) * combos[1].length * (jsonData.permute_b ? 40320 : 1) >= 100000000) {
  const message = `Warning: ${combos[0].length} * ${jsonData.permute_a ? 40320 : 1} * ${combos[1].length} * ${jsonData.permute_b ? 40320 : 1} = ${(combos[0].length * (jsonData.permute_a ? 40320 : 1) * combos[1].length * (jsonData.permute_b ? 40320 : 1)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} jobs! Continue? [y/N] `;
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
