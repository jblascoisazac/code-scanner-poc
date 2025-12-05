import axios from 'axios';
import { Queue } from './queue.js';
import { logger } from '../infra/logger.js';

const REQUEST_TIMEOUT = 5000;
const MAX_RETRIES = 3;
const CIRCUIT_PAUSE = 60000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class EventSender {
  private queue: Queue;
  private consecutiveFailures = 0;
  private circuitOpen = false;

  constructor(queue: Queue) {
    this.queue = queue;
  }

  public async start() {
    while (true) {
      if (this.circuitOpen) {
        await delay(CIRCUIT_PAUSE);
        this.circuitOpen = false;
        this.consecutiveFailures = 0;
        continue;
      }

      await this.queue.init(); // ensures db is loaded
      const event = await this.queue.getFirstEvent();
      if (!event) {
        await delay(500); // if there are no events, wait before checking again
        continue;
      }

      let attempt = 0;
      while (attempt < MAX_RETRIES) {
        try {
          await axios.post(event.url, event.payload, { timeout: REQUEST_TIMEOUT });
          await this.queue.dequeueEvent();
          this.consecutiveFailures = 0;
          break;
        } catch (error) {
          attempt++;
          this.consecutiveFailures++;

          if (this.consecutiveFailures >= MAX_RETRIES) {
            this.circuitOpen = true;
            logger.warn('Too many failed attemps. Circuit breaker opened for 60 seconds.');
          } else if (attempt < MAX_RETRIES) {
            await delay(Math.pow(2, attempt) * 1000);
          }
        }
      }
    }
  }
}
