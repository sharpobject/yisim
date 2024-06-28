import db from './db_sqlite';

// Keep all writes in this thread!

onmessage = (event) => {
  switch (event.data.command) {
    case 'init':
      db.init();
      postMessage('ready');
      break;
    case 'merge':
      db.merge(event.data.newDbFile);
      break;
    case 'dispatch':
      db.markDispatched(event.data.jobIds);
      postMessage('dispatched');
      break;
    case 'insert':
      db.insertBattles(event.data.rows);
      break;
    case 'close':
      db.close();
      postMessage('closed');
      break;
    default:
      console.error('Writer worker received unknown command:');
      console.error(event);
      db.close();
      postMessage('closed');
      break;
  }
};
