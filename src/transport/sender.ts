import axios from 'axios';
import { enqueueEvent, dequeueEvent } from './queue.js';

const REQUEST_TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 3;
const CIRCUIT_PAUSE = 60000; // 60 seconds
