import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

interface EventEntry {
  url: string;
  payload: EventPayload;
}
export interface EventPayload {
  simbology: string;
  valid: string;
}

export class Queue {
  private __filename = fileURLToPath(import.meta.url);
  private __dirname = path.dirname(this.__filename);
  private dbFile = path.join(this.__dirname, 'queue.json');
  private db = new Low<{ events: EventEntry[] }>(new JSONFile(this.dbFile), { events: [] });

  async init() {
    await this.db.read();

    if (!Array.isArray(this.db.data.events)) {
      this.db.data.events = [];
      this.db.write();
    }
  }

  async enqueueEvent(url: string, payload: EventPayload) {
    await this.init();
    this.db.data.events.push({ url: url, payload: payload });
    await this.db.write();
  }

  async getFirstEvent() {
    await this.init();
    return this.db.data.events[0];
  }

  async dequeueEvent() {
    await this.init();
    const event = this.db.data.events.shift();
    await this.db.write();
    return event;
  }
}
