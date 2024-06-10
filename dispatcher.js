import os from 'os';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

// sqlite3.verbose();

const numWorkers = os.cpus().length;

// Specify the database file
const dbFilePath = path.join(__dirname, 'db', 'yisim.sqlite');
const newDirPath = path.join(__dirname, 'db', 'new');

// Function to initialize the main database tables
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
      CREATED DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      OPTIONS TEXT NOT NULL,
      PLAYER_A TEXT NOT NULL,
      PLAYER_B TEXT NOT NULL
    );
  `;

  const createJobTableQuery = `
    CREATE TABLE IF NOT EXISTS JOB (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      BATCH_ID INTEGER NOT NULL,
      DISPATCHED DATETIME,
      PROCESSED DATETIME,
      CARDS TEXT NOT NULL,
      FOREIGN KEY(BATCH_ID) REFERENCES BATCH(ID)
    );
  `;

  const createBattleTableQuery = `
    CREATE TABLE IF NOT EXISTS BATTLE (
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
    );
  `; // Xom: I think it might be good if USED_RANDOM didn't count randomizing who goes first

  // Create tables and log their status
  return Promise.all([
    createTable('BATCH', createBatchTableQuery),
    createTable('JOB', createJobTableQuery),
    createTable('BATTLE', createBattleTableQuery),
  ]);
};

// Function to merge a temporary database file into the main database
// Assumption: Temporary database contains exactly one batch
const mergeTempDB = (db, tempFilePath) => {
  const tempDBAlias = `tempDB_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  db.serialize(() => {
    db.run(`ATTACH DATABASE '${tempFilePath}' AS ${tempDBAlias};`, (err) => {
      if (err) {
        console.error(`Error attaching database '${tempFilePath}' as ${tempDBAlias}`, err);
        return;
      }
      console.log(`Attached temporary database '${tempFilePath}' as ${tempDBAlias}`);

      // Insert data from the temporary BATCH table into the main BATCH table
      db.run(`
        INSERT INTO BATCH (OPTIONS, PLAYER_A, PLAYER_B)
        SELECT OPTIONS, PLAYER_A, PLAYER_B FROM ${tempDBAlias}.BATCH;
      `, function(err) {
        if (err) {
          console.error(`Error merging BATCH table from '${tempFilePath}'`, err);
        } else {
          console.log(`Merged BATCH table from '${tempFilePath}'`);

          // Get the last inserted BATCH ID
          const lastBatchID = this.lastID;

          // Insert data from the temporary JOB table into the main JOB table
          db.run(`
            INSERT INTO JOB (BATCH_ID, CARDS)
            SELECT ${lastBatchID}, CARDS FROM ${tempDBAlias}.JOB;
          `, (err) => {
            if (err) {
              console.error(`Error merging JOB table from '${tempFilePath}'`, err);
            } else {
              console.log(`Merged JOB table from '${tempFilePath}'`);
            }

            // Detach the temporary database
            db.run(`DETACH DATABASE ${tempDBAlias};`, (err) => {
              if (err) {
                console.error(`Error detaching database '${tempFilePath}'`, err);
              } else {
                console.log(`Detached temporary database '${tempFilePath}'`);

                // Delete the temporary file after merging
                fs.unlink(tempFilePath, (err) => {
                  if (err) {
                    console.error(`Error deleting file '${tempFilePath}'`, err);
                  } else {
                    console.log(`Deleted temporary file '${tempFilePath}'`);
                  }
                });
              }
            });
          });
        }
      });
    });
  });
};

const fetchUnprocessedJobs = (db, limit) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT
        ID, BATCH_ID, CARDS
      FROM JOB
      WHERE JOB.DISPATCHED IS NULL
      LIMIT ${limit}
    `, (err, rows) => {
      if (err) {
        console.error('Error fetching unprocessed jobs', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const fetchBatchInfo = (db, batchIds) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT
        ID, OPTIONS, PLAYER_A, PLAYER_B
      FROM BATCH
      WHERE ID IN (${batchIds.join(',')})
    `, (err, rows) => {
      if (err) {
        console.error('Error fetching batch info', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const markJobsDispatched = (db, jobIds) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE JOB
      SET DISPATCHED = CURRENT_TIMESTAMP
      WHERE ID IN (${jobIds.join(',')});
    `;

    db.run(query, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes); // Returns the number of rows affected
      }
    });
  });
};

(async function() {
  fs.mkdirSync(newDirPath, {
    recursive: true
  });

  // Connect to the main database
  const db = new sqlite3.Database(dbFilePath, (err) => {
    if (err) {
      console.error('Could not connect to the main database', err);
    } else {
      console.log('Connected to the main database');
    }
  });

  // Handle SIGINT (Ctrl-C) gracefully
  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing database connection');
    db.close((err) => {
      if (err) {
        console.error('Error closing the main database', err);
      } else {
        console.log('Main database connection closed');
      }
      process.exit(0);
    });
  });

  // Initialize the main database
  await initDB(db);

  // Process existing files on startup
  fs.readdir(newDirPath, (err, files) => {
    if (err) {
      console.error('Error reading new directory:', err);
      return;
    }
    files.forEach((file) => {
      if (file.endsWith('.sqlite')) {
        const tempFilePath = path.join(newDirPath, file);
        console.log(`Processing existing file: ${tempFilePath}`);
        mergeTempDB(db, tempFilePath);
      }
    });
  });
  // Watch db/new for new files
  fs.watch(newDirPath, (eventType, filename) => {
    if (eventType === 'rename' && filename.endsWith('.sqlite')) {
      const tempFilePath = path.join(newDirPath, filename);
      // Ensure the file exists (it might have been deleted already)
      if (fs.existsSync(tempFilePath)) {
        console.log(`Detected new file: ${tempFilePath}`);
        mergeTempDB(db, tempFilePath);
      }
    }
  });
  console.log('Watching for new SQLITE files in db/new...');

  const workers = [];
  const messages_outstanding = [];

  for (let i = 0; i < numWorkers; i++) {
    const worker = new Worker('./worker2.js');
    workers.push(worker);
    messages_outstanding.push(0);

    worker.addEventListener('error', (event) => {
      console.error(`Error in worker ${i}:`, event.message);
    });
    worker.addEventListener('message', (event) => {
      messages_outstanding[i]--;
      const jobId = event.data.results[0][1];
      db.serialize(() => {
        const insertBattle = db.prepare('INSERT INTO BATTLE (BATCH_ID, JOB_ID, A1, A2, A3, A4, A5, A6, A7, A8, B1, B2, B3, B4, B5, B6, B7, B8, USED_RANDOM, A_FIRST, TURNS, HP_A, HP_B, T_SIGMOID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);')
        for (let r of event.data.results) {
          insertBattle.run(...r);
        }
        insertBattle.finalize();
        const updateJob = db.prepare('UPDATE JOB SET PROCESSED = CURRENT_TIMESTAMP WHERE ID = ?');
        updateJob.run(jobId);
        updateJob.finalize();
      });
    });
  }

  const main = async () => {
    try {
      let idleWorkers = 0;
      for (let i = 0; i < numWorkers; i++) {
        if (messages_outstanding[i] === 0) {
          idleWorkers++;
        }
      }
      if (idleWorkers === 0) {
        setTimeout(main, 100); // no idle workers
      } else {
        const jobs = await fetchUnprocessedJobs(db, idleWorkers);
        if (jobs.length) {
          // console.log(jobs[0]);
          // console.log(JSON.stringify(jobs[0]));
          // process.exit();
          const batchIds = [];
          const batchDict = {};
          for (let j of jobs) {
            if (!batchDict[j.BATCH_ID]) {
              batchIds.push(j.BATCH_ID);
              batchDict[j.BATCH_ID] = {
                jobs: [j],
              };
            } else {
              batchDict[j.BATCH_ID].jobs.push(j);
            }
          }
          const batches = await fetchBatchInfo(db, batchIds);
          for (let b of batches) {
            batchDict[b.ID].batch = {
              ID: b.ID,
              OPTIONS: JSON.parse(b.OPTIONS),
              PLAYER_A: JSON.parse(b.PLAYER_A),
              PLAYER_B: JSON.parse(b.PLAYER_B),
            };
          }
          const promises = [];
          for (let i = 0; i < numWorkers; i++) {
            if (messages_outstanding[i] === 0) {
              messages_outstanding[i]++;
              const b = batchDict[batchIds.at(-1)];
              const j = b.jobs.pop();
              promises.push(markJobsDispatched(db, [j.ID]));
              workers[i].postMessage({
                batch: b.batch,
                job: { ID: j.ID, CARDS: JSON.parse(j.CARDS) }
              });
              if (!b.jobs.length) {
                batchIds.pop();
                if (!batchIds.length) {
                  break;
                }
              }
            }
          }
          await Promise.all(promises);
          setTimeout(main, 100); // jobs dispatched
        } else {
          setTimeout(main, 1000); // no jobs
        }
      }
    } catch (error) {
      console.error('Error in main loop:', error);
      // Don't continue the main loop, but let the fs.watch (and merge) and workers continue until ctrl-C
    }
  };

  main();
}());
