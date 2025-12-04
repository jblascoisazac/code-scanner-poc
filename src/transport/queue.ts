import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, 'queue.json');
const db = new Low<{ events: any[] }>(new JSONFile(dbFile), { events: [] });

async function init() {
  await db.read();

  if (!Array.isArray(db.data!.events)) {
    db.data!.events = [];
    await db.write();
  }
}

export async function enqueueEvent(url: string, payload: any) {
  await init();
  db.data!.events.push({ url: url, payload: payload });
  await db.write();
}

export async function getFirstEvent() {
  await init();
  return db.data!.events[0];
}

export async function dequeueEvent() {
  await init();
  const event = db.data!.events.shift();
  await db.write();
  return event;
}
