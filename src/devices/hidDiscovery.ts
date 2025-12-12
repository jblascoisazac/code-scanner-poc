import HID from 'node-hid';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { logger } from '../infra/logger.js';
import { Connection } from './conecction.js';

export const hidEmitter = new EventEmitter();

export class HidDevice extends Connection {
  private isConnected = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly vendorId: number,
    private readonly productName: string,
    codigo: string
  ) {
    super(codigo, 'HID');
  }

  /**
   * Inicia el escaneo periódico de dispositivos HID
   * Retorna una función de limpieza
   */
  public connect(): () => void {
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

      const deviceInfo: { name?: string; serialNumber?: string } = {};

      if (found.product !== undefined) {
        deviceInfo.name = found.product;
      }

      if (found.serialNumber !== undefined) {
        deviceInfo.serialNumber = found.serialNumber;
      }

      this.setDeviceInfo(deviceInfo);

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

    return () => this.stop();
  }

  /**
   * Detiene el escaneo
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Persiste información del dispositivo
   */
  private saveDevice(devices: HID.Device[]): void {
    const filePath = path.resolve('./devices.json');

    try {
      fs.writeFileSync(filePath, JSON.stringify(devices, null, 2));
      logger.info(`Device information saved to ${filePath}`);
    } catch (err) {
      logger.error({ err }, 'Error writing file');
    }
  }

  public override disconnect(): void {
    this.stop();
    this.isConnected = false;
  }
}
