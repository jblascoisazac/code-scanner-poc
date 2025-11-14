import { validateBarCode, barCodeEmitter } from './dist/devices/barCodeValidator.js';

const testBarcode = ']E08410376012699d';

console.log(`Testing barcode: ${testBarcode}\n`);

// Listen for validation events
barCodeEmitter.on('code:validated', (event) => {
  console.log('Event received:');
  console.log(JSON.stringify(event, null, 2));
});

// Run validation
validateBarCode(testBarcode);

// Also manually decode to show what's happening
console.log('\n--- Manual Analysis ---');
let dataWithoutAIM = testBarcode;
if (dataWithoutAIM.startsWith(']')) {
  if (dataWithoutAIM.length >= 3 && dataWithoutAIM[2] === '0') {
    dataWithoutAIM = dataWithoutAIM.slice(3);
  } else {
    dataWithoutAIM = dataWithoutAIM.slice(2);
  }
}

console.log(`After AIM strip: "${dataWithoutAIM}"`);
console.log(`Data (without checksum): "${dataWithoutAIM.slice(0, -1)}"`);
console.log(`Check char: "${dataWithoutAIM.slice(-1)}" (expected value from table needed)`);

// Import CODE128B_TABLE to check mapping
import('./dist/devices/barCodeValidator.js').then((module) => {
  // The table is not exported, so let's compute manually
  const START_B_VALUE = 104;
  const data = dataWithoutAIM.slice(0, -1);
  const checkChar = dataWithoutAIM.slice(-1);

  console.log(`\nStart B value: ${START_B_VALUE}`);
  console.log(`Computing weighted sum for: "${data}"`);

  // Manually compute based on ASCII char codes (Code128-B uses charCode - 32 for values 0-95)
  let sum = START_B_VALUE;
  let weight = 1;

  for (const char of data) {
    const charCode = char.charCodeAt(0);
    // For Code128-B: values are charCode - 32 (space=0, printable ASCII = 32-126)
    const val = charCode - 32;
    console.log(
      `  '${char}' (code ${charCode}) = value ${val}, weight ${weight}, contribution ${val * weight}`
    );
    sum += val * weight;
    weight++;
  }

  console.log(`\nSum before modulo: ${sum}`);
  const calculated = sum % 103;
  console.log(`Calculated checksum (mod 103): ${calculated}`);
  console.log(
    `Check char: '${checkChar}' (code ${checkChar.charCodeAt(0)}) = value ${checkChar.charCodeAt(0) - 32}`
  );
  console.log(`Expected: ${checkChar.charCodeAt(0) - 32}`);
  console.log(`Match: ${calculated === checkChar.charCodeAt(0) - 32}`);
});
