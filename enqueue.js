import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Database } from 'bun:sqlite';
import { card_name_to_id_fuzzy, guess_character, swogi } from './gamestate_nolog.js';

// Check if a command-line argument is provided
if (process.argv.length < 3) {
  console.error('Usage: bun enqueue.js <json_file>');
  process.exit(1);
}

const jsonFilePath = process.argv[2];

// Read the JSON file
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function promptUser(message) {
  return new Promise((resolve, reject) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

(async function() {
  if (combos[0].length * (jsonData.permute_a ? 40320 : 1) * combos[1].length * (jsonData.permute_b ? 40320 : 1) >= 100000000) {
    const continueExecution = await promptUser(`Warning: ${combos[0].length} * ${jsonData.permute_a ? 40320 : 1} * ${combos[1].length} * ${jsonData.permute_b ? 40320 : 1} = ${(combos[0].length * (jsonData.permute_a ? 40320 : 1) * combos[1].length * (jsonData.permute_b ? 40320 : 1)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} jobs! Continue? [y/N] `);
    if (!continueExecution) {
      console.log('Exiting...');
      process.exit(0);
    }
  }

  // Specify the database file
  const tmpFile = `${Date.now()}.sqlite`;
  const tmpDirPath = path.join(__dirname, 'db', 'tmp');
  const newDirPath = path.join(__dirname, 'db', 'new');
  const tmpPath = path.join(__dirname, 'db', 'tmp', tmpFile);
  const newPath = path.join(__dirname, 'db', 'new', tmpFile);

  fs.mkdirSync(tmpDirPath, { recursive: true });
  fs.mkdirSync(newDirPath, { recursive: true });

  const db = new Database(tmpPath, { create: true });
  db.exec('PRAGMA journal_mode = OFF;')

  db.query(`CREATE TABLE BATCH (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    OPTIONS TEXT NOT NULL,
    PLAYER_A TEXT NOT NULL,
    PLAYER_B TEXT NOT NULL
  )`).run();
  db.query(`CREATE TABLE IF NOT EXISTS JOB (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    CARDS TEXT NOT NULL
  )`).run();

  const player_a = jsonData.a;
  const player_b = jsonData.b;
  delete jsonData.a;
  delete jsonData.b;
  delete player_a.cards;
  delete player_b.cards;

  db.query('INSERT INTO BATCH (OPTIONS, PLAYER_A, PLAYER_B) VALUES (json(?1), json(?2), json(?3))').run(JSON.stringify(jsonData), JSON.stringify(player_a), JSON.stringify(player_b));

  const insertJob = db.query('INSERT INTO JOB (CARDS) VALUES (json(?1))');
  for (let x of combos[0]) {
    for (let y of combos[1]) {
      insertJob.run(JSON.stringify({ a: x, b: y }));
    }
  }

  db.close(false);
  db.close(true);

  fs.rename(
    tmpPath,
    newPath,
    (err) => {
      if (err) {
        console.error('Error moving the database file', err);
        process.exit();
      } else {
        console.log(`Database file moved to ${newPath}`);
        process.exit();
      }
    },
  );
}());
