import fs from 'fs';
import path from 'path';
import { Database } from 'bun:sqlite';

const DIR_DB = path.join(__dirname, 'db');
const DIR_NEW = path.join(DIR_DB, 'new');
const DIR_TMP = path.join(DIR_DB, 'tmp');
const DB_FILE = path.join(DIR_DB, 'yisim.sqlite');

let db = null;

const enqueueAndExit = (jsonData, combos) => {
  const player_a = jsonData.a;
  const player_b = jsonData.b;
  delete jsonData.a;
  delete jsonData.b;
  const cards_a = player_a.cards;
  const cards_b = player_b.cards;
  delete player_a.cards;
  delete player_b.cards;

  const r = (Math.floor(Math.random() * 10000) + 10000).toString().substring(1);
  const filename = `${Date.now()}_${r}.sqlite`;
  const newDbFile = path.join(DIR_NEW, filename);
  const tmpDbFile = path.join(DIR_TMP, filename);
  fs.mkdirSync(DIR_NEW, { recursive: true });
  fs.mkdirSync(DIR_TMP, { recursive: true });

  const tmpDb = new Database(tmpDbFile, { create: true });
  tmpDb.run('PRAGMA journal_mode = OFF;');

  tmpDb.run(`CREATE TABLE BATCH (
    OPTIONS TEXT NOT NULL,
    PLAYER_A TEXT NOT NULL,
    PLAYER_B TEXT NOT NULL,
    CARDS_A TEXT NOT NULL,
    CARDS_B TEXT NOT NULL
  );
  CREATE TABLE JOB (
    CARDS_A TEXT NOT NULL,
    CARDS_B TEXT NOT NULL
  );`);

  const insertBatch = tmpDb.prepare(`INSERT INTO BATCH (OPTIONS, PLAYER_A, PLAYER_B, CARDS_A, CARDS_B) VALUES (json(?1), json(?2), json(?3), json(?4), json(?5));`);
  const insertJob = tmpDb.prepare('INSERT INTO JOB (CARDS_A, CARDS_B) VALUES (json(?1), json(?2));');

  (tmpDb.transaction(() => {
    insertBatch.run(
      JSON.stringify(jsonData),
      JSON.stringify(player_a),
      JSON.stringify(player_b),
      JSON.stringify(cards_a),
      JSON.stringify(cards_b)
    );
    for (let a of combos[0]) {
      for (let b of combos[1]) {
        insertJob.run(JSON.stringify(a), JSON.stringify(b));
      }
    }
  })());

  tmpDb.close(false);
  tmpDb.close(true);

  fs.rename(tmpDbFile, newDbFile, (err) => {
    if (err) {
      console.error('Error moving the database file', err);
      process.exit(1);
    } else {
      console.log(`Database file moved to ${newDbFile}`);
      process.exit(0);
    }
  });
};

const connectForRead = () => {
  if (db) {
    return;
  }
  db = new Database(DB_FILE);
};

const init = () => {
  if (db) {
    return;
  }
  fs.mkdirSync(DIR_DB, { recursive: true });
  db = new Database(DB_FILE, { create: true });
  db.run('PRAGMA journal_mode = WAL;');

  db.run(`CREATE TABLE IF NOT EXISTS BATCH (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    CREATED DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    OPTIONS TEXT NOT NULL,
    PLAYER_A TEXT NOT NULL,
    PLAYER_B TEXT NOT NULL,
    CARDS_A TEXT NOT NULL,
    CARDS_B TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS JOB (
    ID INTEGER PRIMARY KEY,
    BATCH_ID INTEGER NOT NULL,
    DISPATCHED DATETIME,
    PROCESSED DATETIME,
    CARDS_A TEXT NOT NULL,
    CARDS_B TEXT NOT NULL,
    FOREIGN KEY(BATCH_ID) REFERENCES BATCH(ID)
  );
  CREATE TABLE IF NOT EXISTS BATTLE (
    ID INTEGER PRIMARY KEY,
    BATCH_ID INTEGER NOT NULL,
    JOB_ID INTEGER,
    PROCESSED DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    B8 INTEGER,
    USED_RANDOM INTEGER,
    A_FIRST INTEGER,
    TURNS INTEGER,
    TURNS_A INTEGER GENERATED ALWAYS AS (
      CASE
      WHEN A_FIRST IS NULL THEN NULL
      WHEN A_FIRST = TRUE THEN ((TURNS + 1) / 2)
      ELSE (TURNS / 2)
      END
    ),
    TURNS_B INTEGER GENERATED ALWAYS AS (TURNS - TURNS_A),
    HP_A INTEGER,
    HP_B INTEGER,
    HP_DIFF INTEGER GENERATED ALWAYS AS (HP_A - HP_B),
    T_SIGMOID REAL,
    FOREIGN KEY(BATCH_ID) REFERENCES BATCH(ID)
  );
  CREATE INDEX IF NOT EXISTS idx_battle_batch_id ON BATTLE (BATCH_ID);
  CREATE INDEX IF NOT EXISTS idx_job_dispatched ON JOB (DISPATCHED);`);
  // Xom: I think it might be good if USED_RANDOM didn't count randomizing who goes first
};

const close = () => {
  db.close(false);
  db.close(true);
};

// Assumption: New DB contains exactly one batch.
const merge = (newDbFile) => {
  const newDbName = 'tmp_' + path.basename(newDbFile, '.sqlite');

  db.run(`ATTACH DATABASE ?1 AS ${newDbName}`, newDbFile);
  db.run(`INSERT INTO BATCH (OPTIONS, PLAYER_A, PLAYER_B, CARDS_A, CARDS_B)
    SELECT OPTIONS, PLAYER_A, PLAYER_B, CARDS_A, CARDS_B FROM ${newDbName}.BATCH;
  WITH const AS (SELECT LAST_INSERT_ROWID() AS ID)
    INSERT INTO JOB (BATCH_ID, CARDS_A, CARDS_B)
    SELECT const.ID, CARDS_A, CARDS_B FROM const, ${newDbName}.JOB;
  DETACH DATABASE ${newDbName};`);

  console.log(`Merged from '${newDbFile}'`);

  fs.unlink(newDbFile, (err) => {
    if (err) {
      console.error(`Error deleting '${newDbFile}'`, err);
    } else {
      console.log(`Deleted '${newDbFile}'`);
    }
  });
};

const getUndispatched = (limit) => {
  const batchDict = {};
  const jobs = db.query(`SELECT ID, BATCH_ID, CARDS_A, CARDS_B FROM JOB WHERE JOB.DISPATCHED IS NULL LIMIT ?1`).all(limit);
  if (!jobs.length) {
    return batchDict;
  }
  for (const j of jobs) {
    if (batchDict[j.BATCH_ID]) {
      batchDict[j.BATCH_ID].jobs.push(j);
    } else {
      batchDict[j.BATCH_ID] = { jobs: [j] };
    }
  }
  const batches = db.prepare(`SELECT ID, OPTIONS, PLAYER_A, PLAYER_B FROM BATCH WHERE ID IN (${Object.keys(batchDict).join(',')})`).all();
  for (const b of batches) {
    batchDict[b.ID].batch = {
      ID: b.ID,
      OPTIONS: JSON.parse(b.OPTIONS),
      PLAYER_A: JSON.parse(b.PLAYER_A),
      PLAYER_B: JSON.parse(b.PLAYER_B),
    };
  }
  return batchDict;
};

const markDispatched = (jobIds) => {
  db.run(`UPDATE JOB SET DISPATCHED = CURRENT_TIMESTAMP WHERE ID IN (${jobIds.join(',')})`);
};

let _insertBattles = null; // can't define while db is null

const initInsertBattles = () => {
  const q = db.prepare('INSERT INTO BATTLE (BATCH_ID, JOB_ID, A1, A2, A3, A4, A5, A6, A7, A8, B1, B2, B3, B4, B5, B6, B7, B8, USED_RANDOM, A_FIRST, TURNS, HP_A, HP_B, T_SIGMOID) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24);');
  const q2 = db.prepare('UPDATE JOB SET PROCESSED = CURRENT_TIMESTAMP WHERE ID = ?1');

  _insertBattles = db.transaction((rows) => {
    for (const r of rows) {
      q.run(...r);
    }
    q2.run(rows[0][1]);
  });
};

const insertBattles = (rows) => {
  if (_insertBattles === null) {
    initInsertBattles();
  }
  return _insertBattles(rows);
};

const getBattle = (id) => {
  return db.query('SELECT PLAYER_A, PLAYER_B, A1, A2, A3, A4, A5, A6, A7, A8, B1, B2, B3, B4, B5, B6, B7, B8, A_FIRST FROM BATCH, BATTLE WHERE BATCH.ID = BATCH_ID AND BATTLE.ID = ?1').get(id);
};

const getBattleByBatchId = (batchId) => {
  return db.query('SELECT PLAYER_A, PLAYER_B, A1, A2, A3, A4, A5, A6, A7, A8, B1, B2, B3, B4, B5, B6, B7, B8, OPTIONS FROM BATCH, BATTLE WHERE BATCH.ID = BATCH_ID AND BATCH.ID = ?1 LIMIT 1').get(batchId);
};

const getBattles = (minBatchId, maxBatchId) => {
  const options = JSON.parse(db.query('SELECT OPTIONS FROM BATCH WHERE ID BETWEEN ?1 AND ?2 LIMIT 1').get(minBatchId, maxBatchId).OPTIONS);
  const permute_a = !!options.permute_a;
  if (permute_a === !!options.permute_b) {
    console.error(`Error: permute_a == permute_b\npermute_a: ${options.permute_a}\npermute_b: ${options.permute_b}`);
    process.exit(1);
  }
  const s = permute_a ? 'SELECT BATCH_ID, A1, A2, A3, A4, A5, A6, A7, A8, -T_SIGMOID FROM BATTLE WHERE BATCH_ID BETWEEN ?1 AND ?2' : 'SELECT BATCH_ID, B1, B2, B3, B4, B5, B6, B7, B8, T_SIGMOID FROM BATTLE WHERE BATCH_ID BETWEEN ?1 AND ?2';
  return db.query(s).values(minBatchId, maxBatchId);
};

export default { DIR_NEW, enqueueAndExit, connectForRead, init, close, merge, getUndispatched, markDispatched, insertBattles, getBattle, getBattleByBatchId, getBattles };
