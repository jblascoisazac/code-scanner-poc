import HID from 'node-hid';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

function saveDevice(found: HID.Device[]): void {
  const jsonString = JSON.stringify(found, null, 2);
  const filePath = path.resolve('./devices.json');

  try {
    fs.writeFileSync(filePath, jsonString);
  } catch (err) {
    console.error('Error writing file:', err);
  }
}

export const hidEmitter = new EventEmitter();

let isConnected = false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let currentPath: string | null = null;
let serialNumber: string | undefined;

let filtered: HID.Device[] = [];

export function listHidDevices(vendorId: number, productName: string): void {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setInterval(async () => {
    let devices: HID.Device[] = [];

    try {
      devices = await HID.devicesAsync();
    } catch (e) {
      console.error('Error scanning devices:', e);
      return;
    }

    filtered = devices.filter(
      (device) => device.vendorId === vendorId && device.product === productName
    );

    const found = filtered[0];

    // --- Desconectado ---
    if (isConnected && !found) {
      console.warn('disconnect');
      isConnected = false;
      currentPath = null;
      // Mantenemos serialNumber para poder reconectar después
      hidEmitter.emit('device:disconnected');
      return; // Importante: retorno temprano
    }

    // Si no hay dispositivo, no hay más que hacer
    if (!found) {
      return;
    }

    // --- Reconectado ---
    if (!isConnected && serialNumber) {
      // Si tenemos un serialNumber guardado, comparamos
      if (found.serialNumber === serialNumber) {
        console.warn('reconnect - matched by serial number');
        isConnected = true;
        currentPath = found.path ?? null;
        hidEmitter.emit('device:reconnect', found);
        return; // Importante: retorno temprano
      }
    }

    // --- Conectado por primera vez ---
    if (!isConnected) {
      isConnected = true;
      currentPath = found.path ?? null;
      serialNumber = found.serialNumber; // Guardamos el serial para futuras reconexiones
      saveDevice(filtered);
      hidEmitter.emit('device:connected', found);
      return; // Importante: retorno temprano
    }
  }, 1000);
}
