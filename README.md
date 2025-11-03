# code-scanner-poc

**Proof of Concept** para escaneo de códigos de barras y QR mediante dispositivos HID en **Node.js con TypeScript**.

> [!IMPORTANT]
> Consulta [GUIDELINES.md](./docs/GUIDELINES.md) para conocer los objetivos del proyecto, estándares de calidad de código y flujo de trabajo recomendado.

## Características

- **Node.js v24.11.0** — Versión fijada mediante `.nvmrc`
- **Yarn Berry (v4.10.3)** — Gestor de paquetes moderno con soporte _zero-installs_ (deshabilitado)
- **TypeScript** — Configuración robusta con verificación de tipos estricta
- **ESLint** — Configuración _flat_ moderna (`eslint.config.js`) con soporte TypeScript
- **Prettier** — Formateo de código con reglas estándar de la industria
- **Git Hooks con Husky** — Comprobaciones automáticas de calidad antes de los commits
- **Conventional Commits** — Formato de mensajes de commit obligatorio con `commitlint`
- **Scripts completos** — Desarrollo, construcción, linting, formateo y verificación de tipos

## Requisitos previos

- **Node.js**: `v24.11.0`, usa un **gestor de versiones de Node.js** (ej. `nvm`, `fnm`, `asdf`, `volta`)
- **Corepack**: Habilitado (incluido en Node.js ≥16.10)

## Instalación

El proyecto utiliza **Yarn Berry v4.10.3** como gestor de paquetes, bloqueado mediante el campo `packageManager` en `package.json`. Esto **garantiza consistencia absoluta** entre todos los colaboradores.

```bash
# Corepack selecciona automáticamente Yarn v4.10.3
yarn install
```

> Si Corepack no está habilitado:

```bash
corepack enable
yarn install
```

## Scripts disponibles

Todo el **ciclo de vida del software** (desarrollo, construcción, verificación y ejecución) se gestiona mediante **scripts definidos en `package.json`**, ejecutables con **Yarn Berry**.

| Script                       | Comando             | Descripción                                                                      |
| ---------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| **Desarrollo**               | `yarn dev`          | Ejecuta la aplicación en modo _watch_ con `tsx`. Reinicio automático en cambios. |
| **Construcción**             | `yarn build`        | Compila TypeScript a JavaScript en el directorio `dist/`.                        |
| **Ejecución**                | `yarn start`        | Ejecuta la aplicación compilada desde `dist/`. Requiere `yarn build` previo.     |
| **Linting**                  | `yarn lint`         | Ejecuta ESLint con **tolerancia cero a advertencias**.                           |
| **Linting (autocorrección)** | `yarn lint:fix`     | Corrige automáticamente problemas de linting cuando sea posible.                 |
| **Formateo**                 | `yarn format`       | Aplica Prettier a todos los archivos TS/JS/JSON.                                 |
| **Verificación de formato**  | `yarn format:check` | Verifica que todos los archivos estén correctamente formateados.                 |
| **Verificación de tipos**    | `yarn typecheck`    | Ejecuta `tsc --noEmit` para validar tipos sin generar salida.                    |

## Estructura del proyecto

```text
.
├── src/                    # Código fuente TypeScript
│   └── index.ts            # Punto de entrada principal
├── dist/                   # → Salida de compilación (generada)
├── .yarn/                  # Caché local de Yarn Berry (gitignored)
├── .yarnrc.yml             # Configuración de Yarn
├── yarn.lock               # Lockfile de dependencias
├── .nvmrc                  # Versión fija de Node.js
├── tsconfig.json           # Configuración de TypeScript
├── eslint.config.js        # Configuración flat de ESLint
├── .prettierrc             # Reglas de formato Prettier
└── package.json            # Metadatos, dependencias y scripts
```

## Configuración técnica

### Gestor de paquetes: Yarn Berry v4.10.3 (LTS)

Archivo: [`.yarnrc.yml`](./.yarnrc.yml)

> Usa `node-modules` linker, caché local y bloqueo estricto de versión vía `packageManager` en `package.json`. Instalaciones inmutables deshabilitadas para desarrollo flexible.

---

### Compilador: TypeScript

Archivo: [`tsconfig.json`](./tsconfig.json)

> Configuración en modo estricto, con target `ES2022`, resolución `NodeNext`, generación de source maps y declaraciones. Verificación exhaustiva de tipos habilitada.

---

### Linter: ESLint

Archivo: [`eslint.config.js`](./eslint.config.js)

> Configuración _flat_ moderna con soporte completo para TypeScript, linting con conciencia de tipos, integración con Prettier y tolerancia cero a advertencias.

---

### Formateador: Prettier

Archivo: [`.prettierrc`](./.prettierrc)

> Reglas estándar: ancho 100, comillas simples, punto y coma, indentación de 2 espacios y comas finales (ES5).

## Desarrollo

### Flujo de trabajo recomendado

```bash
# 1. Configura Node.js v24.11.0
# → Usa tu gestor de versiones preferido:
#     nvm use
#     fnm use
#     asdf local nodejs 24.11.0
#     volta pin node@24.11.0
#     ...

# 2. Habilita Corepack (si no está activo)
corepack enable

# 3. Instala dependencias
yarn install

# 4. Desarrollo en vivo
yarn dev

# 5. Verifica calidad antes de commit
yarn lint
yarn format:check
yarn typecheck

# 6. Construye para producción
yarn build

# 7. Ejecuta versión compilada
yarn start
```

## Git Hooks (Husky)

### `pre-commit`

Ejecutado automáticamente en archivos modificados:

```bash
→ eslint --fix
→ prettier --write
```

> [!WARNING]
> El commit **se aborta** si persisten errores no corregibles.

---

### `commit-msg`

Valida formato **[Conventional Commits](https://www.conventionalcommits.org/)**:

```text
<type>(<scope>): <descripción>

[cuerpo opcional]

[pie opcional]
```

#### Tipos permitidos

| Tipo       | Descripción                    |
| ---------- | ------------------------------ |
| `feat`     | Nueva funcionalidad            |
| `fix`      | Corrección de errores          |
| `docs`     | Cambios en documentación       |
| `style`    | Formateo sin impacto semántico |
| `refactor` | Reestructuración de código     |
| `perf`     | Mejoras de rendimiento         |
| `test`     | Pruebas nuevas o corregidas    |
| `build`    | Cambios en sistema de build    |
| `ci`       | Configuración de CI/CD         |
| `chore`    | Mantenimiento general          |
| `revert`   | Reversión de commit            |

#### Ejemplos

```bash
git commit -m "feat: add barcode scanner support"
git commit -m "fix: resolve USB reconnection issue"
git commit -m "refactor: improve HID device discovery logic"
```

> [!WARNING]
> Mensajes inválidos **se rechazan automáticamente**.
