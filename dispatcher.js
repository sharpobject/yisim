import os from 'os';
import fs from 'fs';
import path from 'path';
import db from './db_sqlite';

const numSimWorkers = (os.cpus().length - 1) || 1;

const workers = [];
const messages_outstanding = []; // currently always 0 or 1

const writer = new Worker('./writer.js');

const dispatchJobs = (batches) => {
  const jobIds = [];
  let i = 0;
  for (const { batch, jobs } of batches) {
    for (const j of jobs) {
      while (i < numSimWorkers && messages_outstanding[i] !== 0) {
        i++;
      }
      if (i === numSimWorkers) {
        return jobIds;
      }
      messages_outstanding[i]++;
      jobIds.push(j.ID);
      workers[i].postMessage({
        batch,
        job: { ID: j.ID, CARDS_A: JSON.parse(j.CARDS_A), CARDS_B: JSON.parse(j.CARDS_B) }
      });
    }
  }
  return jobIds;
};

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
      const batches = Object.values(db.getUndispatched(idleWorkers));
      if (batches.length) {
        const jobIds = dispatchJobs(batches);
        writer.postMessage({ command: 'dispatch', jobIds }); // setTimeout(main, 100) after reply
      } else {
        setTimeout(main, 1000); // no jobs
      }
    }

  } catch (error) {
    console.error('Error in main loop:', error);
    // Don't continue the main loop, but let the fs.watch (and merge) and workers continue until ctrl-C
  }
};

writer.addEventListener('error', (event) => {
  console.error(`Error in writer worker:`, event.message);
});

let alreadyReceivedSIGINT = false;

writer.addEventListener('message', (event) => {
  if (event.data === 'ready') {
    db.connectForRead();

    // Handle SIGINT (Ctrl-C) gracefully?
    process.on('SIGINT', () => {
      if (alreadyReceivedSIGINT) {
        process.exit(0);
      } else {
        alreadyReceivedSIGINT = true;
        console.log('\nSIGINT signal received: closing database connection...');
        writer.postMessage({ command: 'close' }); // exit after reply
      }
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

  } else if (event.data === 'dispatched') {
    setTimeout(main, 100); // jobs dispatched
  } else if (event.data === 'closed') {
    db.close();
    process.exit(0);
  } else {
    console.error('Received unknown message from writer worker:');
    console.error(event);
    writer.postMessage({ command: 'close' });
  }
});

fs.mkdirSync(db.DIR_NEW, { recursive: true });

writer.postMessage({ command: 'init' });

// Process existing files on startup
fs.readdir(db.DIR_NEW, (err, files) => {
  if (err) {
    console.error(`Error reading directory ${db.DIR_NEW}:`, err);
    return;
  }
  for (const f of files) {
    if (f.endsWith('.sqlite')) {
      const newDbFile = path.join(db.DIR_NEW, f);
      console.log(`Found existing file: ${newDbFile}`);
      writer.postMessage({ command: 'merge', newDbFile });
    }
  }
});
// Watch db/new for new files
fs.watch(db.DIR_NEW, (eventType, filename) => {
  if (eventType === 'rename' && filename.endsWith('.sqlite')) {
    const newDbFile = path.join(db.DIR_NEW, filename);
    // Ensure the file exists (it might have been deleted already?)
    if (fs.existsSync(newDbFile)) {
      console.log(`Found new file: ${newDbFile}`);
      writer.postMessage({ command: 'merge', newDbFile });
    }
  }
});
console.log('Watching for new .sqlite files in db/new...');
