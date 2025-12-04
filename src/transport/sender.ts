import axios from 'axios';
import { getFirstEvent, dequeueEvent } from './queue.js';

const REQUEST_TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 3;
const CIRCUIT_PAUSE = 60000; // 60 seconds

let consecutiveFailures = 0;
let circuitOpen = false;
let running = false;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startSender() {
  setInterval(async () => {
    if (running) return;
    running = true;

    //Ensure that no events are being processed while circuit is open
    while (true) {
      if (circuitOpen) {
        await delay(CIRCUIT_PAUSE);
        continue;
      }

      //Obtain the first event in the queue
      const event = await getFirstEvent();
      if (!event) break;

      let attempt = 0;
      while (attempt < MAX_RETRIES) {
        try {
          //Try to send the event, if successful, remove it form the queue
          await axios.post(event.url, event.payload, { timeout: REQUEST_TIMEOUT });
          await dequeueEvent();
          consecutiveFailures = 0;
          break;
        } catch (error) {
          attempt++;
          consecutiveFailures++;

          if (consecutiveFailures >= MAX_RETRIES) {
            circuitOpen = true;
            await delay(CIRCUIT_PAUSE);
            console.warn('Too many consecutive failures. Pausing for a minute.');
            circuitOpen = false;
            // Reset attemps and failures after circuit pause
            consecutiveFailures = 0;
            attempt = 0;
          } else if (attempt < MAX_RETRIES) {
            await delay(Math.pow(2, attempt) * 1000); //exponential backoff
          }
        }
      }
    }
    running = false; // Mark as not running for next tick
  }, 1000);
}
