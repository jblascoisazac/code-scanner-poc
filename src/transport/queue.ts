import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';

const dbFile = path.join(process.cwd(), 'queue.json');
const db = new Low<{ events: any[] }>(new JSONFile(dbFile), { events: [] });

async function init() {
  await db.read();
  db.data ||= { events: [] };
}

export async function enqueueEvent(event: { url: string; payload: any }) {
  await init();
  db.data!.events.push(event);
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
