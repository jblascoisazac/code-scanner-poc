# Copilot Instructions for code-scanner-poc

## Project Overview

This is a **Proof of Concept** for barcode and QR code scanning using HID devices in Node.js with TypeScript. The application acts as a background service that:

- Reads 1D barcodes (Code 128, Code 39, EAN, UPC) via HID Bar Code Scanner protocol
- Operates in background without requiring UI focus
- Emits JSON events to external services (HTTP/MQTT/AMQP)
- Provides intelligent HID device discovery and automatic reconnection
- Includes basic observability (logging, health checks)

**Key Hardware:** Honeywell Voyager 1202g (1D laser scanner) with CCB00-010BT base, configured in **HID Bar Code Scanner (ASCII)** mode for non-intrusive background operation.

**Future-proof:** Architecture supports 2D scanners (QR/DataMatrix) with minimal code changes when hardware is upgraded.

For complete technical specifications, see [docs/GUIDELINES.md](../docs/GUIDELINES.md).

## Tech Stack & Tooling

- **Runtime:** Node.js v24.11.0 (locked via `.nvmrc` - use `nvm use`)
- **Package Manager:** Yarn Berry v4.10.3 (via `packageManager` in `package.json` - Corepack enabled)
- **Type System:** TypeScript with **extremely strict** type checking
- **Module System:** ESM only (`"type": "module"`, `NodeNext` resolution)
- **Code Quality:** ESLint flat config + Prettier + Husky pre-commit hooks
- **Commit Messages:** Conventional Commits enforced via `commitlint`

## Development Workflow

### Prerequisites

1. **Node.js v24.11.0** - Use a Node version manager (nvm, fnm, asdf, volta):
   ```bash
   nvm use  # or fnm use, etc.
   ```

2. **Corepack enabled** - Required for Yarn Berry:
   ```bash
   corepack enable
   ```

3. **Environment variables** - Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   # Set VENDOR_ID to the HID device vendor ID (required)
   # Set PRODUCT to filter by product name (optional)
   ```

### Common Commands

```bash
# Install dependencies (Corepack automatically uses correct Yarn version)
yarn install

# Run in watch mode during development
yarn dev

# Check types, lint, and format before committing
yarn typecheck
yarn lint
yarn format

# Build for production
yarn build

# Run compiled version
yarn start
```

**Critical:** Always use `yarn dev` for live development - it uses `tsx watch` for instant feedback.

### Running the Application

The application requires a connected HID barcode scanner and proper environment configuration:

1. Connect the barcode scanner via USB
2. Ensure device is in **HID Bar Code Scanner (ASCII)** mode (not keyboard mode)
3. Set `VENDOR_ID` in `.env` (e.g., for Honeywell devices: `0x0C2E` or `3118`)
4. Run `yarn dev` and scan a barcode - you should see connection and scan events in the console

## TypeScript Conventions

This project uses **ultra-strict TypeScript** - respect these settings in `tsconfig.json`:

```typescript
// ✅ Always provide explicit return types for functions
function greet(config: GreetingConfig): string {
  /* ... */
}

// ✅ Use type imports for type-only dependencies
import type { MyType } from './types.js';

// ✅ Handle optional array access (noUncheckedIndexedAccess)
const items = [1, 2, 3];
const first = items[0]; // Type: number | undefined
if (first !== undefined) {
  /* safe to use */
}

// ✅ Always use .js extensions in imports (ESM requirement)
import { helper } from './utils/helper.js';

// ❌ Never use 'any' - it's an error
// ❌ Never use non-null assertions (!) - they're errors
// ❌ Never leave unused variables/parameters (use _prefix if intentional)
```

**Key compiler flags enabled:**

- `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
- `noUnusedLocals` + `noUnusedParameters` + `noImplicitReturns`
- `noPropertyAccessFromIndexSignature` + `noImplicitOverride`

## ESLint Rules

ESLint uses **flat config** (`eslint.config.js`) with type-aware linting:

```typescript
// ✅ Prefer type imports (enforced by @typescript-eslint/consistent-type-imports)
import type { MyType } from './types.js';

// ✅ Console.log is warned - use console.warn/error instead
console.warn('Warning message');
console.error('Error message');

// ✅ Explicit function return types required
export function calculate(value: number): number {
  /* ... */
}

// ✅ Use const for immutable bindings
const result = 42;

// ✅ Use === instead of == (eqeqeq rule)
if (value === null) {
  /* ... */
}
```

**Key rules:**

- `@typescript-eslint/explicit-function-return-type`: warn
- `@typescript-eslint/consistent-type-imports`: error
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/no-non-null-assertion`: error
- `no-console`: warn (allow warn/error)
- `prefer-const`: error
- `eqeqeq`: error

**Max warnings:** Zero tolerance (`--max-warnings 0`). Fix all warnings before committing.

## Code Style (Prettier)

- **Line width:** 100 characters
- **Quotes:** Single quotes
- **Semicolons:** Always
- **Trailing commas:** ES5 style
- **Indentation:** 2 spaces

Prettier runs automatically via `lint-staged` on commit. Format manually with `yarn format`.

## Git Workflow

**Conventional Commits required:**

```bash
# Feature: new functionality
git commit -m "feat: add user authentication"

# Fix: bug fixes
git commit -m "fix: resolve race condition in event handler"

# Docs: documentation only
git commit -m "docs: update API documentation"

# Refactor: code restructuring
git commit -m "refactor: extract validation logic to separate module"

# Chore: maintenance tasks
git commit -m "chore: update dependencies"
```

**Allowed commit types:**

- `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Pre-commit hooks** auto-run ESLint + Prettier on staged files via `lint-staged`. Commits are rejected if:

1. Linting fails or warnings exist
2. Commit message doesn't follow conventional format

## Project Structure

Current structure:

```
src/
├── devices/
│   └── hidDiscovery.ts   # HID device enumeration, discovery, and caching
├── infra/
│   └── logger.ts          # Pino logger configuration
└── index.ts              # Main entry point - event listeners and startup
```

**Architecture principles:**
- **Modular design:** Clear separation between device layer, domain logic, and infrastructure
- **Event-driven:** Uses EventEmitter for device lifecycle (connected, reconnected, disconnected)
- **Type-safe:** Strict TypeScript with comprehensive type checking
- **Observable:** Structured logging with Pino for production debugging

When adding new modules, follow modular architecture principles with clear separation of concerns. See [docs/GUIDELINES.md](../docs/GUIDELINES.md) for detailed architecture documentation.

## Key Dependencies

- **node-hid** (v3.2.0): Native HID device access for barcode scanner communication
- **pino** (v10.1.0): High-performance structured logging
- **tsx**: TypeScript execution and watch mode for development
- **typescript-eslint**: Type-aware linting with strict rules

## Testing Strategy

**Current state:** This is a POC with no formal test suite yet.

**When adding tests:**
- Use a testing framework consistent with Node.js ecosystem (e.g., Vitest, Jest)
- Mock HID devices using `node-hid` test utilities or dependency injection
- Test event emitters, device discovery logic, and error handling
- Add test scripts to `package.json` following the pattern: `"test": "vitest"`
- Update this documentation with testing commands

## Troubleshooting

### Common Issues

**"VENDOR_ID environment variable must be set"**
- Solution: Copy `.env.example` to `.env` and set `VENDOR_ID` to your device's vendor ID
- For Honeywell devices: use `0x0C2E` (3118 decimal)

**"Corepack must be enabled"**
- Solution: Run `corepack enable` before `yarn install`

**"Device not found" or no scan events**
- Verify device is connected via USB
- Check device is in HID Bar Code Scanner mode (not keyboard wedge mode)
- On Linux, may require udev rules for HID device permissions
- Use `yarn dev` with debug logging to inspect device enumeration

**Linting/type errors on commit**
- Pre-commit hooks run automatically via Husky
- Fix errors with `yarn lint:fix` and `yarn format`
- Ensure no unused variables/parameters (use `_` prefix if intentional)

**Import resolution errors**
- ESM modules require `.js` extensions in imports (not `.ts`)
- Example: `import { helper } from './utils/helper.js'` (not `./utils/helper`)
