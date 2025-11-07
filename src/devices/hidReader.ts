import { EventEmitter } from 'events';
import HID from 'node-hid';

export class HidReader extends EventEmitter {
  private device: HID.HID | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private vendorId: number;
  private productId: number;

  constructor() {
    super();

    const vendorIdRaw = process.env['VENDOR_ID'];
    const productIdRaw = process.env['PRODUCT'];

    if (!vendorIdRaw) {
      throw new Error('VENDOR_ID no está definido');
    }
    if (!productIdRaw) {
      throw new Error('PRODUCT_ID no está definido');
    }

    this.vendorId = vendorIdRaw.trim().toLowerCase().startsWith('0x')
      ? parseInt(vendorIdRaw, 16)
      : parseInt(vendorIdRaw, 10);

    this.productId = productIdRaw.trim().toLowerCase().startsWith('0x')
      ? parseInt(productIdRaw, 16)
      : parseInt(productIdRaw, 10);
  }

  /*Starts the HID reader instance. this function  stores all the devices HID and then filters for the ones that
  matches the requeriments
  */
  start(): void {
    if (this.device) return;

    try {
      const devices = HID.devices();
      const found = devices.find(
        (d) =>
          d.vendorId === this.vendorId &&
          (d.productId === this.productId || d.product === process.env['PRODUCT'])
      );

      if (!found || !found.path) {
        throw new Error('No se encontró el dispositivo HID con el vendorId/productId especificado');
      }

      this.device = new HID.HID(found.path);

      this.device.on('data', this.onData.bind(this));
      this.device.on('error', (err: Error) => {
        this.emit('error', err);
        this.stop();
        setTimeout(() => this.start(), 500);
      });
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      setTimeout(() => this.start(), 1000);
    }
  }

  //function to stop the instance, on triggered it removes the listeners an sets the buffer to 0
  stop(): void {
    if (!this.device) return;
    this.device.removeAllListeners('data');
    this.device.removeAllListeners('error');
    this.device.close();
    this.device = null;
    this.buffer = Buffer.alloc(0);
  }

  //Cleans incoming data and filters out invalid bytes
  private onData(data: Buffer): void {
    // Filter valid bytes (printable ASCII + carriage return)
    const clean = Buffer.from(
      Array.from(data).filter((b) => b === 0x0d || (b >= 0x20 && b <= 0x7e))
    );
    if (!clean.length) return;

    // Append new bytes to internal buffer
    this.buffer = Buffer.concat([this.buffer, clean]);

    // Process complete lines (terminated by CR = 0x0D)
    let idx = this.buffer.indexOf(0x0d);
    while (idx !== -1) {
      const line = Buffer.from(this.buffer.subarray(0, idx))
        .toString('utf8')
        .replace(/\x00/g, '')
        .trim();

      if (line.length) this.emit('scan:raw', line);

      // Advance buffer after CR, create a copy to avoid shared memory
      this.buffer = Buffer.from(this.buffer.subarray(idx + 1));

      idx = this.buffer.indexOf(0x0d);
    }

    // Limit buffer size to avoid excessive growth
    const MAX_BUFFER = 16 * 1024;
    if (this.buffer.length > MAX_BUFFER) {
      this.buffer = Buffer.from(this.buffer.subarray(this.buffer.length - MAX_BUFFER));
    }
  }
}
