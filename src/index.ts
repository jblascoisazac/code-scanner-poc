import { listHidDevices } from './devices/hidDiscovery.js';

const vendorId = parseInt(process.env['VENDOR_ID'] ?? '');
const productId = process.env['PRODUCT'] ?? '';

await listHidDevices(vendorId, productId);
