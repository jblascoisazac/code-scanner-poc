import axios from 'axios';
import { getFirstEvent, dequeueEvent } from './queue.js';

const REQUEST_TIMEOUT = 5000;
const MAX_RETRIES = 3;
const CIRCUIT_PAUSE = 60000;

let consecutiveFailures = 0;
let circuitOpen = false;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startSender() {
  while (true) {
    if (circuitOpen) {
      await delay(CIRCUIT_PAUSE);
      circuitOpen = false;
      consecutiveFailures = 0;
      continue;
    }

    const event = await getFirstEvent();
    if (!event) {
      await delay(500); //Wait if no events
      continue;
    }

    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        await axios.post(event.url, event.payload, { timeout: REQUEST_TIMEOUT });
        await dequeueEvent(); //Remove event if the post was succesful
        consecutiveFailures = 0;
        break;
      } catch (error) {
        attempt++;
        consecutiveFailures++;

        if (consecutiveFailures >= MAX_RETRIES) {
          circuitOpen = true;
          console.warn('Too many consecutive failures. Pausing for a minute.');
        } else if (attempt < MAX_RETRIES) {
          await delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }
  }
}
