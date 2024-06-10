import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { card_name_to_id_fuzzy } from "./gamestate_nolog.js";

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

(async function(){
    fs.mkdirSync(tmpDirPath, {recursive: true});
    fs.mkdirSync(newDirPath, {recursive: true});

    // Create database
    const db = new sqlite3.Database(tmpPath, (err) => {
        if (err) {
            console.error('Could not connect to the database', err);
        } else {
            console.log('Connected to the database');
        }
    });
    await initDB(db);

    const options = {};
    const players = [{},{}];
    const my_idx = 1;
    const enemy_idx = 1 - my_idx;
    players[enemy_idx].hp = 110;
    players[enemy_idx].cultivation = 100;
    players[enemy_idx].physique = 0;
    players[enemy_idx].max_physique = 0;
    players[enemy_idx].max_hp = players[enemy_idx].hp + players[enemy_idx].physique;
    players[my_idx].hp = 110;
    players[my_idx].cultivation = 80;
    players[my_idx].physique = 80;
    players[my_idx].max_physique = 85;
    players[my_idx].max_hp = players[my_idx].hp + players[my_idx].physique;
    //players[my_idx].stance_of_fierce_attack_stacks = 1;
    players[enemy_idx].birdie_wind_stacks = 1;
    players[my_idx].cards = [
        "heavenly forceage 3",
        "break pots and sink boats",
        "meru formation 3",
        "normal attack",
        "normal attack",
        "normal attack",
        "exercise soul 3",
        "exercise soul 2",
    ];
    players[enemy_idx].cards = [
        "hunter hunting hunter 2",
        "escape plan 3",
        "great spirit 2",
        "echo formation",
        "normal attack",
        "normal attack",
        "echo formation 2",
        "only traces 2",
    ];
    const a = players[0].cards.map(card_name_to_id_fuzzy);
    const b = players[1].cards.map(card_name_to_id_fuzzy);

    await new Promise((resolve, reject) => {
        db.serialize(() => {
            const insertBatch = db.prepare('INSERT INTO BATCH (OPTIONS, PLAYER_A, PLAYER_B) VALUES (json(?), json(?), json(?));');
            insertBatch.run(JSON.stringify(options), JSON.stringify(players[0]), JSON.stringify(players[1]));
            insertBatch.finalize();

            const insertJob = db.prepare('INSERT INTO JOB (A1, A2, A3, A4, A5, A6, A7, A8, B1, B2, B3, B4, B5, B6, B7, B8) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            insertJob.run(...a, ...b);
            // insertJob.run(...b, ...a);
            insertJob.finalize();

            resolve();
        })
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
                } else {
                    console.log(`Database file moved to ${newPath}`);
                }
            },
        );
    });
}());
