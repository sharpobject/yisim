import fs from 'fs';
import path from 'path';
import { Database } from 'bun:sqlite';

const dbPath = path.join(__dirname, 'db', 'yisim.sqlite');

let db = null;

const initDb = () => {
  db = new Database(dbPath, { create: true });
  db.exec('PRAGMA journal_mode = WAL;');

  db.query(`CREATE TABLE IF NOT EXISTS BATCH (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    CREATED DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    OPTIONS TEXT NOT NULL,
    PLAYER_A TEXT NOT NULL,
    PLAYER_B TEXT NOT NULL
  )`).run();

  db.query(`CREATE TABLE IF NOT EXISTS JOB (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    BATCH_ID INTEGER NOT NULL,
    DISPATCHED DATETIME,
    PROCESSED DATETIME,
    CARDS TEXT NOT NULL,
    FOREIGN KEY(BATCH_ID) REFERENCES BATCH(ID)
  )`).run();

  db.query(`CREATE TABLE IF NOT EXISTS BATTLE (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
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
  )`).run(); // Xom: I think it might be good if USED_RANDOM didn't count randomizing who goes first

  postMessage('ready');
};

const closeDb = () => {
  db.close(false);
  db.close(true);
  postMessage('closed');
};

const mergeDb = (newDbPath) => {
  const newDbName = 'tmp_' + path.basename(newDbPath, '.sqlite');

  db.query(`ATTACH DATABASE '${newDbPath}' AS ${newDbName};`).run();

  db.query(`
    INSERT INTO BATCH (OPTIONS, PLAYER_A, PLAYER_B)
    SELECT OPTIONS, PLAYER_A, PLAYER_B FROM ${newDbName}.BATCH;
  `).run();
  const batchId = db.query('SELECT LAST_INSERT_ROWID()').get()["LAST_INSERT_ROWID()"];
  console.log(`Merged BATCH table from '${newDbPath}'`);

  db.query(`INSERT INTO JOB (BATCH_ID, CARDS) SELECT ?1, CARDS FROM ${newDbName}.JOB`).run(batchId);
  console.log(`Merged JOB table from '${newDbPath}'`);

  db.query(`DETACH DATABASE ${newDbName}`).run();

  fs.unlink(newDbPath, (err) => {
    if (err) {
      console.error(`Error deleting '${newDbPath}'`, err);
    } else {
      console.log(`Deleted '${newDbPath}'`);
    }
  });
};

const insertBattles = (rows) => {
  const jobId = rows[0][1];

  const q = db.prepare('INSERT INTO BATTLE (BATCH_ID, JOB_ID, A1, A2, A3, A4, A5, A6, A7, A8, B1, B2, B3, B4, B5, B6, B7, B8, USED_RANDOM, A_FIRST, TURNS, HP_A, HP_B, T_SIGMOID) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24);');
  db.transaction(() => {
    for (let r of rows) {
      q.run(...r);
    }
  })();

  db.query('UPDATE JOB SET PROCESSED = CURRENT_TIMESTAMP WHERE ID = ?1').run(jobId);
};

const dispatch = (dispatchedJobIds) => {
  db.query(`UPDATE JOB SET DISPATCHED = CURRENT_TIMESTAMP WHERE ID IN (${dispatchedJobIds.join(',')})`).run();
  postMessage('dispatched');
};

onmessage = (event) => {
  switch (event.data.command) {
    case 'init':
      initDb();
      break;
    case 'close':
      closeDb();
      break;
    case 'merge':
      mergeDb(event.data.newDbPath);
      break;
    case 'insert':
      insertBattles(event.data.rows);
      break;
    case 'dispatch':
      dispatch(event.data.dispatchedJobIds);
      break;
    default:
      console.error('Writer worker received unknown command:');
      console.error(event);
      closeDb();
      break;
  }
};
