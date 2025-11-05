import HID from 'node-hid';
import fs from 'fs';
import path from 'path';

function saveDevice(filtered: HID.Device[]): void {
  const jsonString = JSON.stringify(filtered, null, 2);
  const filePath = path.resolve('./devices.json');

  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, jsonString);
    } else {
      fs.writeFileSync('devices.json', jsonString);
    }
  } catch (err) {
    console.error('Error writing file:', err);
  }
}

//We export the function to list all devices with the entered vendorId.
export async function listHidDevices(vendorId: number, productId: string): Promise<void> {
  //We collect all the devices
  const devices = await HID.devicesAsync();

  //We filter by vendorId
  const filtered = devices.filter(
    (device) => device.vendorId === vendorId && device.product === productId
  );

  saveDevice(filtered);

  //Check if he picks it up; I want him to tell me if he doesn't pick it up, and if he does pick it up, show them.
  if (filtered.length === 0) {
    console.warn('No se ha encontrado ningun dispositivo');
    return;
  }

  // eslint-disable-next-line no-console
  console.log(filtered);
}
