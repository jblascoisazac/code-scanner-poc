import HID from 'node-hid';

//We export the function to list all devices with the entered vendorId.
export async function listHidDevices(vendorId: number): Promise<void> {
  //We collect all the devices
  const devices = await HID.devicesAsync();

  //We filter by vendorId
  const filtered = devices.filter((device) => device.vendorId === vendorId);

  //Check if he picks it up; I want him to tell me if he doesn't pick it up, and if he does pick it up, show them.
  if (filtered.length === 0) {
    console.warn('No se ha encontrado ningun dispositivo');
    return;
  }

  console.log(filtered);
}
