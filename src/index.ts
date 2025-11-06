import { hidEmitter, listHidDevices } from './devices/hidDiscovery.js';

const vendorId = parseInt(process.env['VENDOR_ID'] ?? '');
const productId = process.env['PRODUCT'] ?? '';

hidEmitter.on('device:connected', () => {
  console.log('Evento → Conectado:');
});

hidEmitter.on('device:reconnect', () => {
  console.log('Evento → Reconectado:');
});

hidEmitter.on('device:disconnected', () => {
  console.log('Evento → Desconectado');
});

listHidDevices(vendorId, productId);
