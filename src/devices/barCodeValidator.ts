import { EventEmitter } from 'events';

export const barCodeEmitter = new EventEmitter();

type Symbology =
  | 'Code128-A'
  | 'Code128-B'
  | 'Code128-C'
  | 'EAN-13'
  | 'EAN-8'
  | 'UPC-A'
  | 'UPC-E'
  | 'UNKNOWN';

// Descriptive constants
const ASCII_PRINTABLE_START = 32;
const ASCII_PRINTABLE_END = 126;
const CODE128_A_MAX = 95;
const MOD_10 = 10;

/*
 * SYMBOLOGY DETECTION
 * Identifies the barcode symbology based on its content
 */
function detectBarcodeSymbology(barcodeData: string): Symbology {
  const isOnlyNumeric = /^\d+$/.test(barcodeData);
  const barcodeLength = barcodeData.length;

  // GS1 AIM ID prefixes (standard for HID scanners)
  if (barcodeData.startsWith(']C')) return 'Code128-C';
  if (barcodeData.startsWith(']A')) return 'Code128-A';
  if (barcodeData.startsWith(']B')) return 'Code128-B';

  // EAN-13: exactly 13 digits
  if (isOnlyNumeric && barcodeLength === 13) return 'EAN-13';

  // UPC-A: exactly 12 digits
  if (isOnlyNumeric && barcodeLength === 12) return 'UPC-A';

  // UPC-E: exactly 8 digits, starts with 0 or 1
  if (isOnlyNumeric && barcodeLength === 8 && (barcodeData[0] === '0' || barcodeData[0] === '1')) {
    const expansionDigit = Number(barcodeData[6]);
    if (expansionDigit >= 0 && expansionDigit <= 9) return 'UPC-E';
  }

  // EAN-8: exactly 8 digits
  if (isOnlyNumeric && barcodeLength === 8) return 'EAN-8';

  // Code128-C: numeric only with even length
  if (isOnlyNumeric && barcodeLength % 2 === 0) return 'Code128-C';

  // Code128-A: ASCII 32–95
  if (isValidCode128A(barcodeData)) return 'Code128-A';

  // Code128-B: ASCII 32–126
  if (isValidCode128B(barcodeData)) return 'Code128-B';

  return 'UNKNOWN';
}

/*
 * CODE128-A VALIDATION
 * Verifies that all characters are within the valid range (32–95)
 */
function isValidCode128A(barcodeData: string): boolean {
  for (let charIndex = 0; charIndex < barcodeData.length; charIndex++) {
    const charCode = barcodeData.charCodeAt(charIndex);
    if (charCode < ASCII_PRINTABLE_START || charCode > CODE128_A_MAX) {
      return false;
    }
  }
  return true;
}

/*
 * CODE128-B VALIDATION
 * Verifies that all characters are within the valid range (32–126)
 */
function isValidCode128B(barcodeData: string): boolean {
  for (let charIndex = 0; charIndex < barcodeData.length; charIndex++) {
    const charCode = barcodeData.charCodeAt(charIndex);
    if (charCode < ASCII_PRINTABLE_START || charCode > ASCII_PRINTABLE_END) {
      return false;
    }
  }
  return true;
}

/*
 * CODE128-C VALIDATION
 * Verifies that the barcode is numeric only and has even length
 */
function isValidCode128C(barcodeData: string): boolean {
  const isNumericOnly = /^\d+$/.test(barcodeData);
  const isEvenLength = barcodeData.length % 2 === 0;
  return isNumericOnly && isEvenLength;
}

/*
 * UPC-E → UPC-A EXPANSION
 * Converts compressed UPC-E format (8 digits) to UPC-A format (12 digits)
 */
function expandUpcEtoUpcA(upcEBarcode: string): string {
  if (!/^\d{8}$/.test(upcEBarcode)) {
    throw new Error('Invalid UPC-E code: must be exactly 8 digits');
  }

  const [
    numberSystemDigit,
    manufacturer1,
    manufacturer2,
    manufacturer3,
    manufacturer4,
    manufacturer5,
    expansionDigit,
    checkDigit,
  ] = upcEBarcode.split('');

  // UPC-E valid only for leading 0 or 1
  if (numberSystemDigit !== '0' && numberSystemDigit !== '1') {
    throw new Error('UPC-E must start with 0 or 1');
  }

  let manufacturerCode = '';

  // Expansion based on the expansion digit (position 7)
  switch (expansionDigit) {
    case '0':
    case '1':
    case '2':
      manufacturerCode = `${numberSystemDigit}${manufacturer1}${manufacturer2}${expansionDigit}0000${manufacturer3}${manufacturer4}${manufacturer5}`;
      break;

    case '3':
      manufacturerCode = `${numberSystemDigit}${manufacturer1}${manufacturer2}${manufacturer3}00000${manufacturer4}${manufacturer5}`;
      break;

    case '4':
      manufacturerCode = `${numberSystemDigit}${manufacturer1}${manufacturer2}${manufacturer3}${manufacturer4}00000${manufacturer5}`;
      break;

    default:
      manufacturerCode = `${numberSystemDigit}${manufacturer1}${manufacturer2}${manufacturer3}${manufacturer4}${manufacturer5}0000${expansionDigit}`;
      break;
  }

  return manufacturerCode + checkDigit;
}

/*
 * MOD10 CHECKSUM (GS1)
 * Calculates checksum for EAN/UPC using the MOD10 algorithm
 * Algorithm: from the right, alternate multipliers 3 and 1
 */
function calculateMod10Checksum(barcodeData: string): number {
  const barcodeDigits = barcodeData.split('').map(Number);
  const dataWithoutCheckDigit = barcodeDigits.slice(0, -1);

  let checksumSum = 0;
  let multiplicador = 3;

  // Procesamos de derecha a izquierda
  for (let digitIndex = dataWithoutCheckDigit.length - 1; digitIndex >= 0; digitIndex--) {
    const currentDigit = dataWithoutCheckDigit[digitIndex] ?? 0;
    checksumSum += currentDigit * multiplicador;
    multiplicador = multiplicador === 3 ? 1 : 3;
  }

  const remainder = checksumSum % MOD_10;
  return (MOD_10 - remainder) % MOD_10;
}

/*
Below are functions used to validate the MOD103 checksum.
The current real-world issue is that some scanners do not emit a proper
Code128 checksum character; a correctly configured scanner should provide
the final checksum symbol for validation.

function code128Value(char: string): number {
  const code = char.charCodeAt(0);
  return code - 32;
}

function validate128Mod103(barcodeData: string, set: 'A' | 'B' | 'C'): boolean {
  if (barcodeData.length < 2) return false;

  const data = barcodeData.slice(0, -1);
  const checksumChar = barcodeData.slice(-1);
  const checksumCharValue = code128Value(checksumChar);

  let sum = 0;
  let position = 1;

  if (set === 'C') {
    for (let i = 0; i < data.length; i += 2) {
      const pair = Number(data.substring(i, i + 2));
      sum += pair * position;
      position++;
    }
  } else {
    for (const c of data) {
      sum += code128Value(c) * position++;
    }
  }

  const startCodeValue = set === 'A' ? 103 : set === 'B' ? 104 : 105;

  const mod = (startCodeValue + sum) % 103;
  return mod === checksumCharValue;
}

*/
/*
 * MAIN VALIDATION FUNCTION
 * Detects the barcode type and validates according to specific rules
 */
export function validateBarCode(barcodeData: string): void {
  const symbologyType = detectBarcodeSymbology(barcodeData);
  let isValid = false;
  let errorMessage: string | undefined;

  try {
    switch (symbologyType) {
      case 'EAN-13':
      case 'EAN-8':
      case 'UPC-A': {
        const expectedCheckDigit = calculateMod10Checksum(barcodeData);
        const actualCheckDigit = Number(barcodeData.slice(-1));
        isValid = expectedCheckDigit === actualCheckDigit;
        break;
      }

      case 'UPC-E': {
        const expanded = expandUpcEtoUpcA(barcodeData);
        const expectedCheckDigit = calculateMod10Checksum(expanded);
        const actualCheckDigit = Number(barcodeData[7]);
        isValid = expectedCheckDigit === actualCheckDigit;
        break;
      }

      case 'Code128-A':
        isValid = isValidCode128A(barcodeData);
        break;

      case 'Code128-B':
        isValid = isValidCode128B(barcodeData);
        break;

      case 'Code128-C':
        isValid = isValidCode128C(barcodeData);
        break;

      case 'UNKNOWN':
        throw new Error(`Unsupported or unrecognized barcode format`);
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    isValid = false;
    console.error(`Validation error for barcode "${barcodeData}": ${errorMessage}`);
  }
  const now = new Date();
  const ts = now.toLocaleString('es-ES');
  // Emit a single event with all information
  barCodeEmitter.emit('code:validated', {
    barcode: barcodeData,
    simbology: symbologyType,
    valid: isValid,
    ts,
    error: errorMessage,
  });
}
