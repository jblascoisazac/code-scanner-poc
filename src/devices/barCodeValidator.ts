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

/* Code128 tables and helpers
 * - A/B: printable ASCII mapping (value 0..95)
 * - SPECIAL_CODES: control/start/stop values (96..106)
 * - C: 2-digit numeric pair mapping (00..99)
 */
const CODE128_A: Record<string, number> = {};
const CODE128_B: Record<string, number> = {};
const CODE128_C: Record<string, number> = {};

for (let v = 0; v <= 95; v++) {
  const ch = String.fromCharCode(v + 32);
  CODE128_A[ch] = v;
  CODE128_B[ch] = v;
}

const SPECIAL_CODES = {
  FNC3: 96,
  FNC2: 97,
  SHIFT: 98,
  CODE_C: 99,
  CODE_B: 100,
  CODE_A: 101,
  FNC1: 102,
  START_A: 103,
  START_B: 104,
  START_C: 105,
  STOP: 106,
};

Object.assign(CODE128_A, SPECIAL_CODES);
Object.assign(CODE128_B, SPECIAL_CODES);

for (let i = 0; i <= 99; i++) CODE128_C[i.toString().padStart(2, '0')] = i;
CODE128_C['FNC1'] = 102;
CODE128_C['START_C'] = 105;
CODE128_C['STOP'] = 106;

/* Small helper: map a character to its Code128 value using a table;
   if table lookup is missing, fallback to printable ASCII mapping (charCode-32).
   Returns null when value cannot be determined. */
function mapCharToCode128Value(ch: string, table: Record<string, number>): number | null {
  if (table[ch] !== undefined) return table[ch];
  const code = ch.charCodeAt(0);
  // printable fallback
  if (code >= 32 && code <= 127) return code - 32;
  return null;
}

// Simple helper: check every character is between min and max char codes
function areCharsInRange(text: string, minCode: number, maxCode: number): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < minCode || code > maxCode) return false;
  }
  return true;
}

/* ============================================================
 * RAW detection
 * - Recognize either legacy printable start/stop glyphs (observed in
 *   some environments) or embedded raw start/stop bytes.
 * - Valid raw payloads have at least: START + payload + CHECKSUM + STOP
 * ============================================================ */
function isRawCode128Payload(input: string): boolean {
  if (typeof input !== 'string' || input.length < 4) return false;

  const first = input.charAt(0);
  const last = input.charAt(input.length - 1);
  const legacyStarts = ['Ì', 'Ë', 'Í'];

  if (legacyStarts.includes(first) && last === 'Î') return true;

  const firstCode = first.charCodeAt(0);
  const lastCode = last.charCodeAt(0);
  return (firstCode === 103 || firstCode === 104 || firstCode === 105) && lastCode === 106;
}

/* ============================================================
 * EAN / UPC helpers
 * ============================================================ */
function computeEanUpcMod10(code: string): number {
  const digits = code.split('').map(Number);
  const body = digits.slice(0, -1);

  let sum = 0;
  let weight = 3;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += (body[i] ?? 0) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10;
}

//Expand UPC-E to UPC-A
function expandUpcEtoUpcA(upcE: string): string {
  const [ns, m1, m2, m3, m4, m5, exp, checkDigit] = upcE.split('');

  switch (exp) {
    case '0':
    case '1':
    case '2':
      return `${ns}${m1}${m2}${exp}0000${m3}${m4}${m5}${checkDigit}`;
    case '3':
      return `${ns}${m1}${m2}${m3}00000${m4}${m5}${checkDigit}`;
    case '4':
      return `${ns}${m1}${m2}${m3}${m4}00000${m5}${checkDigit}`;
    default:
      return `${ns}${m1}${m2}${m3}${m4}${m5}0000${exp}${checkDigit}`;
  }
}

/* ============================================================
 * Symbol detection (non-RAW inputs)
 * - For 8-digit numerics we validate checksum before deciding
 *   EAN-8 / UPC-E; otherwise fall back to Code128-C for numeric pairs.
 * ============================================================ */
function detectSymbology(input: string): Symbology {
  const isNumeric = /^\d+$/.test(input);
  const len = input.length;

  if (isNumeric && len === 13) return 'EAN-13';

  if (isNumeric && len === 12) return 'UPC-A';

  if (isNumeric && len === 8) {
    const first = input.charAt(0);

    if (['0', '1'].includes(first)) {
      try {
        const expanded = expandUpcEtoUpcA(input);
        if (computeEanUpcMod10(expanded) === Number(expanded.slice(-1))) return 'UPC-E';
      } catch {
        // ignore and continue
      }
    }

    if (computeEanUpcMod10(input) === Number(input.slice(-1))) return 'EAN-8';

    if (len % 2 === 0) return 'Code128-C';
  }

  if (isNumeric && len % 2 === 0) return 'Code128-C';

  // Code128-A candidate: all chars in ASCII 32..95
  if (areCharsInRange(input, 32, 95)) return 'Code128-A';

  // Code128-B candidate: all chars in ASCII 32..126
  if (areCharsInRange(input, 32, 126)) return 'Code128-B';
  return 'UNKNOWN';
}

/* ============================================================
 * Keyboard-mode validations (simple range/structure checks)
 * ============================================================ */
function validateKeyboardSet(input: string, set: 'A' | 'B' | 'C'): boolean {
  if (set === 'A') return areCharsInRange(input, 32, 95);

  if (set === 'B') return areCharsInRange(input, 32, 126);

  // C: numeric even-length
  return /^\d+$/.test(input) && input.length % 2 === 0;
}

/* ============================================================
 * MOD103 validators for RAW payloads
 * ============================================================ */
function validateRawAB(
  payload: string,
  table: Record<string, number>,
  startValue: number
): boolean {
  const payloadChars = payload.split('');
  // remove stop
  payloadChars.pop();

  const checksumChar = payloadChars.pop();
  const startChar = payloadChars.shift();

  if (!checksumChar || !startChar) return false;

  const startCode = startChar.charCodeAt(0);
  if (startCode !== startValue && table[startChar] === undefined) return false;

  const expectedChecksum = mapCharToCode128Value(checksumChar, table);
  if (expectedChecksum === null) return false;

  let sum = startValue;
  let weight = 1;

  for (let i = 0; i < payloadChars.length; i++) {
    const ch = payloadChars[i];
    if (typeof ch === 'undefined') return false;

    const val = mapCharToCode128Value(ch, table);

    if (val === null) return false;
    sum += val * weight;
    weight = weight + 1;
  }
  return sum % 103 === expectedChecksum;
}

function validateRawC(payload: string): boolean {
  const payloadChars = payload.split('');
  payloadChars.pop();
  const checksumChar = payloadChars.pop();
  const startChar = payloadChars.shift();

  if (!checksumChar || !startChar) return false;

  const startCode = startChar.charCodeAt(0);
  if (startCode !== 105 && CODE128_C[startChar] !== 105) return false;

  const expectedChecksum = CODE128_C[checksumChar] ?? checksumChar.charCodeAt(0) - 32;
  let sum = 105;
  let weight = 1;

  for (let i = 0; i < payloadChars.length; i += 2) {
    const a = payloadChars[i];
    const b = payloadChars[i + 1];

    if (typeof a === 'undefined' || typeof b === 'undefined') return false;

    const pair = a + b;
    const value = CODE128_C[pair];

    if (value === undefined) return false;

    sum += value * weight;
    weight = weight + 1;
  }
  return sum % 103 === expectedChecksum;
}

/* ============================================================
 * Public entry: detect & validate (preserves previous behavior)
 * - RAW payloads are routed using the embedded start byte
 * - Non-RAW uses heuristics + keyboard validators + EAN/UPC checks
 * ============================================================ */
export function validateBarCode(barcodeData: string): void {
  let detected: Symbology = detectSymbology(barcodeData);
  let valid = false;
  let error: string | undefined;

  try {
    //Validation if it's raw code
    if (isRawCode128Payload(barcodeData)) {
      const startCode = barcodeData.charCodeAt(0);
      if (startCode === 103) {
        detected = 'Code128-A';
        valid = validateRawAB(barcodeData, CODE128_A, 103);
      } else if (startCode === 104) {
        detected = 'Code128-B';
        valid = validateRawAB(barcodeData, CODE128_B, 104);
      } else if (startCode === 105) {
        detected = 'Code128-C';
        valid = validateRawC(barcodeData);
      } else {
        throw new Error('Unrecognized Code128 RAW start code');
      }
    } else {
      switch (detected) {
        case 'EAN-13':
        case 'EAN-8':
        case 'UPC-A': {
          valid = computeEanUpcMod10(barcodeData) === Number(barcodeData.slice(-1));
          break;
        }
        case 'UPC-E': {
          const expanded = expandUpcEtoUpcA(barcodeData);
          valid = computeEanUpcMod10(expanded) === Number(expanded.slice(-1));
          break;
        }
        case 'Code128-A':
          valid = validateKeyboardSet(barcodeData, 'A');
          break;
        case 'Code128-B':
          valid = validateKeyboardSet(barcodeData, 'B');
          break;
        case 'Code128-C':
          valid = validateKeyboardSet(barcodeData, 'C');
          break;
        default:
          throw new Error('Unsupported barcode format');
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    valid = false;
  }

  barCodeEmitter.emit('code:validated', {
    barcode: barcodeData,
    simbology: detected,
    valid,
    ts: new Date().toLocaleString('es-ES'),
    error,
  });
}
