import db from './db_sqlite';

// Check if two command-line arguments are provided
if (process.argv.length < 4) {
  console.error('Usage: bun elim.js <minBatchId> <maxBatchId');
  process.exit(1);
}

db.connectForRead();
const raws = db.getBattles(+process.argv[2], +process.argv[3]);
db.close();

let n = 0;
const rows = {};

for (const r of raws) {
  const deck = r.slice(1, 9).map((i) => ('' + i)).join(' ');
  if (!rows[deck]) {
    rows[deck] = {};
  }
  rows[deck][r[0]] = r[9] < 0 ? 0 : 1;
  n++;
}

let ee = Object.entries(rows);
const batchIds = Object.keys(ee[0][1]);

const isDominated = (deck, betterBuckets) => {
  const row = rows[deck];
  const wins = batchIds.filter((i) => (row[i] === 0));
  for (const bucket of betterBuckets) {
    for (const otherDeck of bucket) {
      const r = rows[otherDeck];
      if (wins.every((i) => (r[i] === 0))) {
        return true;
      }
    }
  }
  return false;
};

const isColumnDominated = (batchId, betterBuckets) => {
  const wins = ee.filter(([deck, r]) => (r[batchId] === 1));
  for (const bucket of betterBuckets) {
    for (const otherBatchId of bucket) {
      if (wins.every(([deck, r]) => (r[otherBatchId] === 1))) {
        return true;
      }
    }
  }
  return false;
};

let nPrev = n;
do {
  nPrev = n;
  let buckets = batchIds.map((x) => ([]));
  let b = buckets.length;
  for (const [deck, r] of ee) {
    const losses = batchIds.filter((i) => (r[i] === 1)).length;
    if (losses === b) {
      delete rows[deck];
      n--;
    } else {
      buckets[losses].push(deck);
    }
  }
  for (let k = 1; k < b; k++) {
    const betterBuckets = buckets.slice(0, k);
    const newBucket = [];
    for (const deck of buckets[k]) {
      if (isDominated(deck, betterBuckets)) {
        delete rows[deck];
        n--;
      } else {
        newBucket.push(deck);
      }
    }
    buckets[k] = newBucket;
  }

  ee = Object.entries(rows);
  buckets = ee.map((x) => ([]));
  b = buckets.length;
  const batchIdsForDeletion = [];
  for (const batchId of batchIds) {
    const losses = ee.filter(([deck, r]) => (r[batchId] === 0)).length;
    if (losses === b) {
      batchIdsForDeletion.push(batchId);
    } else {
      buckets[losses].push(batchId);
    }
  }
  for (let k = 1; k < b; k++) {
    const betterBuckets = buckets.slice(0, k);
    const newBucket = [];
    for (const batchId of buckets[k]) {
      if (isColumnDominated(batchId, betterBuckets)) {
        batchIdsForDeletion.push(batchId);
      }
    }
  }
  for (const batchId of batchIdsForDeletion) {
    for (const [deck, r] of ee) {
      delete r[batchId];
    }
    const pos = batchIds.indexOf(batchId);
    batchIds[pos] = batchIds[batchIds.length - 1];
    batchIds.pop();
  }
} while (n !== nPrev);

await Bun.write(Bun.stdout, ee.map(([deck, r]) => `${batchIds.map((i) => ('' + r[i])).join(',')},${deck}`).join('\n'));
await Bun.write(Bun.stdout, `\n${batchIds.map((i) => ('' + i)).join(',')}\n`);
