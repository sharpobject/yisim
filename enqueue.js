import fs from 'fs';
import path from 'path';
import readline from 'readline';
import sqlite3 from 'sqlite3';
import { card_name_to_id_fuzzy, guess_character, swogi } from "./gamestate_nolog.js";

// Check if a command-line argument is provided
if (process.argv.length < 3) {
  console.error('Usage: bun enqueue.js <json_file>');
  process.exit(1);
}

const jsonFilePath = process.argv[2];

// Read the JSON file
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
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
  const permutations = [];
  const tried_permutations = {};
  for (let combo of combos) {
    do {
      const p_id = combo.join(',');
      if (!tried_permutations[p_id]) {
        tried_permutations[p_id] = true;
        const p = [];
        for (let i = 0; i < 8; i++) {
          p[i] = combo[i];
        }
        permutations.push(p);
      }
    } while (next_permutation(combo));
  }
  return permutations;
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
  if (combos[0].length * combos[1].length >= 100000000) {
    const continueExecution = await promptUser(`Warning: ${combos[0].length} * ${combos[1].length} = ${(combos[0].length * combos[1].length).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} jobs! Continue? [y/N] `);
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

  const initDB = (db) => {
    const checkTableExists = (tableName) => {
      return new Promise((resolve, reject) => {
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}';`, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(!!row); // Resolve with true if the table exists, otherwise false
          }
        });
      });
    };

    const createTable = (tableName, createQuery) => {
      return new Promise(async (resolve, reject) => {
        try {
          const exists = await checkTableExists(tableName);
          db.run(createQuery, (err) => {
            if (err) {
              reject(err);
            } else {
              if (exists) {
                console.log(`${tableName} table already existed.`);
              } else {
                console.log(`${tableName} table created.`);
              }
              resolve();
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    };

    // Queries for creating the tables
    const createBatchTableQuery = `
    CREATE TABLE IF NOT EXISTS BATCH (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      OPTIONS TEXT NOT NULL,
      PLAYER_A TEXT NOT NULL,
      PLAYER_B TEXT NOT NULL
    );
  `;

    const createJobTableQuery = `
    CREATE TABLE IF NOT EXISTS JOB (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      A1 INTEGER,
      A2 INTEGER,
      A3 INTEGER,
      A4 INTEGER,
      A5 INTEGER,
      A6 INTEGER,
      A7 INTEGER,
      A8 INTEGER,
      B1 INTEGER,
      B2 INTEGER,
      B3 INTEGER,
      B4 INTEGER,
      B5 INTEGER,
      B6 INTEGER,
      B7 INTEGER,
      B8 INTEGER
    );
  `;

    // Create tables and log their status
    return Promise.all([
      createTable('BATCH', createBatchTableQuery),
      createTable('JOB', createJobTableQuery)
    ]);
  };

  fs.mkdirSync(tmpDirPath, {
    recursive: true
  });
  fs.mkdirSync(newDirPath, {
    recursive: true
  });

  // Create database
  const db = new sqlite3.Database(tmpPath, (err) => {
    if (err) {
      console.error('Could not connect to the database', err);
    } else {
      console.log('Connected to the database');
    }
  });
  await initDB(db);

  const player_a = jsonData.a;
  const player_b = jsonData.b;
  delete jsonData.a;
  delete jsonData.b;
  delete player_a.cards;
  delete player_b.cards;

  await new Promise((resolve, reject) => {
    db.serialize(() => {
      const insertBatch = db.prepare('INSERT INTO BATCH (OPTIONS, PLAYER_A, PLAYER_B) VALUES (json(?), json(?), json(?));');
      insertBatch.run(JSON.stringify(jsonData), JSON.stringify(player_a), JSON.stringify(player_b));
      insertBatch.finalize();

      const insertJob = db.prepare('INSERT INTO JOB (A1, A2, A3, A4, A5, A6, A7, A8, B1, B2, B3, B4, B5, B6, B7, B8) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (let x of combos[0]) {
        for (let y of combos[1]) {
          insertJob.run(...x, ...y);
        }
      }
      insertJob.finalize();

      resolve();
    });
  });

  // Close the database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing the database', err);
      return;
    }
    console.log('Database connection closed');

    // Move the database file to the new directory
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
  });
}());
