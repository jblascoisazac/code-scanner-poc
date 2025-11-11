import { hidEmitter, listHidDevices, cleanupDevice } from './devices/hidDiscovery.js';
import { HidReader } from './devices/hidReader.js';
import { logger } from './infra/logger.js';
import HID from 'node-hid';

const HEX_START = '0x';
const reader = new HidReader();

const vendorIdRaw = process.env['VENDOR_ID'];
if (!vendorIdRaw) throw new Error('VENDOR_ID must be set');

let vendorId = Number(vendorIdRaw);
if (vendorIdRaw.trim().toLowerCase().startsWith(HEX_START)) {
  vendorId = parseInt(vendorIdRaw, 16);
}
if (Number.isNaN(vendorId)) {
  throw new Error(`VENDOR_ID is not a valid number: "${vendorIdRaw}"`);
}

const productName = process.env['PRODUCT'];

if (!productName) throw new Error('PRODUCT must be set');

let currentDevice: HID.HID | null = null;
hidEmitter.on('device:connected', (found) => {
  logger.info('Event → Connected');

  // Cerrar dispositivo previo si existe
  cleanupDevice(currentDevice);

  reader.read(found);
});

hidEmitter.on('device:reconnect', (found) => {
  logger.info('Event → Reconnected');

  cleanupDevice(currentDevice);
  reader.read(found);
});

hidEmitter.on('device:disconnected', () => {
  logger.info('Event → Disconnected');
  cleanupDevice(currentDevice);
  currentDevice = null;
});

reader.on('scan:raw', (line) => {
  logger.info(`Readed code: ${line}`);
});

reader.on('error', (err) => {
  logger.error({ err }, 'HID Error');
});

listHidDevices(vendorId, productName);

process.on('SIGINT', () => {
  cleanupDevice(currentDevice);
  process.exit(0);
});
