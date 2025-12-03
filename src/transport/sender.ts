import axios from 'axios';
import { getFirstEvent, dequeueEvent } from './queue.js';

const REQUEST_TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 3;
const CIRCUIT_PAUSE = 60000; // 60 seconds

let consecutiveFailures = 0;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startSender() {
  setInterval(async () => {
    const event = await getFirstEvent();
    if (!event) return;

    let attempt = 0;

    //POST request with retries and circuit breaker
    while (attempt <= MAX_RETRIES) {
      const backoffTime = Math.pow(2, attempt) * 1000;
      try {
        axios.post(event.url, event.payload, { timeout: REQUEST_TIMEOUT });
        await dequeueEvent();
        consecutiveFailures = 0;
        break;
      } catch (error) {
        attempt++;
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_RETRIES) {
          setTimeout(() => {
            attempt = 0;
            consecutiveFailures = 0;
          }, CIRCUIT_PAUSE);
        }
        await delay(backoffTime);
      }
    }
  }, 1000);
}
