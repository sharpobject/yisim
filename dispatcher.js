import os from 'os';
import fs from 'fs';
import path from 'path';
import { Database } from 'bun:sqlite';

const numSimWorkers = (os.cpus().length - 1) || 1;

const dbPath = path.join(__dirname, 'db', 'yisim.sqlite');
const newDirPath = path.join(__dirname, 'db', 'new');

let db = null;
const workers = [];
const messages_outstanding = [];

fs.mkdirSync(newDirPath, { recursive: true });

const main = () => {
  try {
    let idleWorkers = 0;
    for (let i = 0; i < numSimWorkers; i++) {
      if (messages_outstanding[i] === 0) {
        idleWorkers++;
      }
    }
    if (idleWorkers === 0) {
      setTimeout(main, 100); // no idle workers
    } else {
      const jobs = db.query(`SELECT ID, BATCH_ID, CARDS FROM JOB WHERE JOB.DISPATCHED IS NULL LIMIT ?1`).all(idleWorkers);
      if (jobs.length) {
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
        const batches = db.query(`SELECT ID, OPTIONS, PLAYER_A, PLAYER_B FROM BATCH WHERE ID IN (${batchIds.join(',')})`).all();
        for (let b of batches) {
          batchDict[b.ID].batch = {
            ID: b.ID,
            OPTIONS: JSON.parse(b.OPTIONS),
            PLAYER_A: JSON.parse(b.PLAYER_A),
            PLAYER_B: JSON.parse(b.PLAYER_B),
          };
        }
        const dispatchedJobIds = [];
        for (let i = 0; i < numSimWorkers; i++) {
          if (messages_outstanding[i] === 0) {
            messages_outstanding[i]++;
            const b = batchDict[batchIds.at(-1)];
            const j = b.jobs.pop();
            dispatchedJobIds.push(j.ID);
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
        db.query(`UPDATE JOB SET DISPATCHED = CURRENT_TIMESTAMP WHERE ID IN (${dispatchedJobIds.join(',')})`).run();
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

const writer = new Worker('./writer.js');

writer.addEventListener('error', (event) => {
  console.error(`Error in writer worker:`, event.message);
});
writer.addEventListener('message', (event) => {
  if (event.data === 'ready') {
    db = new Database(dbPath);

    // Handle SIGINT (Ctrl-C) gracefully?
    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing database connection...');
      writer.postMessage({ command: 'close' });
    });

    for (let i = 0; i < numSimWorkers; i++) {
      const worker = new Worker('./worker2.js');
      workers.push(worker);
      messages_outstanding.push(0);

      worker.addEventListener('error', (event) => {
        console.error(`Error in worker ${i}:`, event.message);
      });
      worker.addEventListener('message', (event) => {
        messages_outstanding[i]--;
        writer.postMessage({ command: 'insert', rows: event.data.results });
      });
    }

    main();

  } else if (event.data === 'closed') {
    db.close(false);
    db.close(true);
    process.exit(0);
  } else {
    console.error('Received unknown message from writer worker:');
    console.error(event);
    writer.postMessage({ command: 'close' });
  }
});

writer.postMessage({ command: 'init' });

// Process existing files on startup
fs.readdir(newDirPath, (err, files) => {
  if (err) {
    console.error('Error reading new directory:', err);
    return;
  }
  files.forEach((file) => {
    if (file.endsWith('.sqlite')) {
      const newDbPath = path.join(newDirPath, file);
      console.log(`Found existing file: ${newDbPath}`);
      writer.postMessage({ command: 'merge', newDbPath: newDbPath });
    }
  });
});
// Watch db/new for new files
fs.watch(newDirPath, (eventType, filename) => {
  if (eventType === 'rename' && filename.endsWith('.sqlite')) {
    const newDbPath = path.join(newDirPath, filename);
    // Ensure the file exists (it might have been deleted already)
    if (fs.existsSync(newDbPath)) {
      console.log(`Found new file: ${newDbPath}`);
      writer.postMessage({ command: 'merge', newDbPath: newDbPath });
    }
  }
});
console.log('Watching for new .sqlite files in db/new...');
