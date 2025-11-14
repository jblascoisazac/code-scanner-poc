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

/*
 * SANITIZACIÓN REAL HID
 * Elimina TODO lo que no sea ASCII imprimible (32–126)
 */

/*
 * DETECCIÓN DE SIMBOLOGÍA
 */
function simbologyDetection(barcode: string): Symbology {
  const isNumeric = /^\d+$/.test(barcode);

  // 1. GS1 prefixes Code128
  if (barcode.startsWith(']C')) return 'Code128-C';
  if (barcode.startsWith(']A')) return 'Code128-A';
  if (barcode.startsWith(']B')) return 'Code128-B';

  // 2. EAN-13
  if (isNumeric && barcode.length === 13) return 'EAN-13';

  // 3. UPC-A
  if (isNumeric && barcode.length === 12) return 'UPC-A';

  // 4. UPC-E (antes que EAN-8)
  if (isNumeric && barcode.length === 8 && (barcode[0] === '0' || barcode[0] === '1')) {
    const exp = Number(barcode[6]);

    if (exp >= 0 && exp <= 9) return 'UPC-E';
  }

  // 5. EAN-8
  if (isNumeric && barcode.length === 8) return 'EAN-8';

  // 6. Code128-C (numérico par)
  if (isNumeric && barcode.length % 2 === 0) return 'Code128-C';

  // 7. Code128-A (ASCII 32–95)
  let isA = true;
  for (let i = 0; i < barcode.length; i++) {
    const cc = barcode.charCodeAt(i);
    if (cc < 32 || cc > 95) {
      isA = false;
      break;
    }
  }
  if (isA) return 'Code128-A';

  // 8. Code128-B (ASCII 32–126)
  let isB = true;
  for (let i = 0; i < barcode.length; i++) {
    const cc = barcode.charCodeAt(i);
    if (cc < 32 || cc > 126) {
      isB = false;
      break;
    }
  }
  if (isB) return 'Code128-B';

  return 'UNKNOWN';
}

/*
 * EXPANSIÓN UPC-E → UPC-A
 */
function expandUpcEtoUpcA(upce: string): string {
  if (!/^\d{8}$/.test(upce)) throw new Error('Invalid UPC-E code');

  const [n, m1, m2, m3, m4, m5, exp, checkDigit] = upce.split('');

  // UPC-E only exists for N = 0 or 1
  if (n !== '0' && n !== '1') throw new Error('UPC-E must start with 0 or 1');

  let body = '';

  switch (exp) {
    case '0':
    case '1':
    case '2':
      body = `${n}${m1}${m2}${exp}0000${m3}${m4}${m5}`;
      break;

    case '3':
      body = `${n}${m1}${m2}${m3}00000${m4}${m5}`;
      break;

    case '4':
      body = `${n}${m1}${m2}${m3}${m4}00000${m5}`;
      break;

    default:
      body = `${n}${m1}${m2}${m3}${m4}${m5}0000${exp}`;
      break;
  }

  return body + checkDigit; // keep UPC-E check digit
}

/*
 * MOD10 GS1 CORREGIDO (EAN/UPC)
 */
function mod10CheckSum(barcode: string): number {
  const digits = barcode.split('').map(Number);
  const data = digits.slice(0, -1); // remove check digit

  let sum = 0;

  // Work from right to left, alternating 3 and 1
  let weight = 3;

  for (let i = data.length - 1; i >= 0; i--) {
    sum += (data[i] ?? 0) * weight;
    weight = weight === 3 ? 1 : 3;
  }

  return (10 - (sum % 10)) % 10;
}

/*
 * CODE128 — CHECKSUM MOD103
 */
// Code128-A → ASCII 0–95
function isCode128A(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const cc = str.charCodeAt(i);
    if (cc < 0 || cc > 95) return false;
  }
  return true;
}

// Code128-B → ASCII 32–126
function isCode128B(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const cc = str.charCodeAt(i);
    if (cc < 32 || cc > 126) return false;
  }
  return true;
}

// Code128-C → Solo números + longitud par
function isCode128C(str: string): boolean {
  return /^\d+$/.test(str) && str.length % 2 === 0;
}

/*
 * VALIDACIÓN FINAL
 */
export function validateBarCode(barcode: string): void {
  const type = simbologyDetection(barcode);

  let valid = false;

  try {
    // --- EAN / UPC ---
    if (['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E'].includes(type)) {
      // --- CASO ESPECIAL UPC-E ---
      if (type === 'UPC-E') {
        const expanded = expandUpcEtoUpcA(barcode);
        const expected = mod10CheckSum(expanded);
        const actual = Number(barcode[7]); // último dígito UPC-E
        valid = expected === actual;

        barCodeEmitter.emit('code:validated', {
          barcode,
          simbology: type,
          valid,
        });
        return;
      }

      // EAN-13, EAN-8, UPC-A
      const expected = mod10CheckSum(barcode);
      const actual = Number(barcode.slice(-1));
      valid = expected === actual;
    }

    // --- CODE128-A ---
    else if (type === 'Code128-A') {
      valid = isCode128A(barcode);
    }

    // --- CODE128-B ---
    else if (type === 'Code128-B') {
      valid = isCode128B(barcode);
    }

    // --- CODE128-C ---
    else if (type === 'Code128-C') {
      valid = isCode128C(barcode);
    }

    // --- SIMBOLOGÍA NO SOPORTADA ---
    else {
      throw new Error('Unsupported symbology');
    }

    // --- EMITIR RESULTADO ---
    barCodeEmitter.emit('code:validated', {
      barcode,
      simbology: type,
      valid,
    });
  } catch (err) {
    console.error(`Validation error for ${barcode}:`, (err as Error).message);
  }
}
