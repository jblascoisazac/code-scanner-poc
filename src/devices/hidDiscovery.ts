import HID from 'node-hid';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { logger } from '../infra/logger.js';

export const hidEmitter = new EventEmitter();

export class HidDevice {
  private isConnected = false;
  private serialNumber: string | undefined;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private vendorId: number,
    private productName: string
  ) {}

  /**
   * Inicia el escaneo periódico de dispositivos HID
   * Retorna una función de limpieza
   */
  public start(): () => void {
    this.intervalId = setInterval(async () => {
      let devices: HID.Device[] = [];

      try {
        devices = await HID.devicesAsync();
      } catch (e) {
        logger.error({ err: e }, 'Error scanning devices');
        return;
      }

      const filtered = devices.filter(
        (device) => device.vendorId === this.vendorId && device.product === this.productName
      );

      const found = filtered[0];

      // --- Disconnected ---
      if (this.isConnected && !found) {
        this.isConnected = false;
        hidEmitter.emit('device:disconnected');
        return;
      }

      // Si no hay dispositivo, no hay nada más que hacer
      if (!found) {
        return;
      }

      // --- Reconnected ---
      if (!this.isConnected && this.serialNumber) {
        if (found.serialNumber === this.serialNumber) {
          this.isConnected = true;
          logger.info({
            event: 'device_reconnected',
            deviceId: found.serialNumber,
          });
          hidEmitter.emit('device:reconnect', found);
          return;
        }
      }

      // --- Connected for the first time ---
      if (!this.isConnected) {
        this.isConnected = true;
        this.serialNumber = found.serialNumber;

        logger.info({
          event: 'device_connected',
          deviceId: found.serialNumber,
        });

        this.saveDevice(filtered);
        hidEmitter.emit('device:connected', found);
      }
    }, 1000);

    // Cleanup
    return () => this.stop();
  }

  /**
   * Detiene el escaneo
   */
  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Persiste información del dispositivo
   */
  private saveDevice(devices: HID.Device[]): void {
    const jsonString = JSON.stringify(devices, null, 2);
    const filePath = path.resolve('./devices.json');

    try {
      fs.writeFileSync(filePath, jsonString);
      logger.info(`Device information saved to ${filePath}`);
    } catch (err) {
      logger.error({ err }, 'Error writing file');
    }
  }
}
