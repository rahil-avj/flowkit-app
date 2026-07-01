# FlowKit Package Vision — Strategy & Implementation Plan

## Context

FlowKit currently operates as a monorepo where the platform (`src/`) and author workspaces (`workspaces/<name>/`) are fully entangled in one repo. This causes two concrete problems:

1. **Agent noise**: AI agents read `src/core/`, `src/features/`, `src/shared/` unprompted and waste context on platform internals the author should never touch.
2. **Deployment complexity**: The `sync:deployment` dance exists only because source and deliverable live in the same branch.

**The goal**: Ship FlowKit as an npm package (git dep initially, registry later). Author installs it, gets CLI + engine in `node_modules`. Their repo is just their work: `flows/`, `flowplans/`, `lib/`, `flowkit.config.ts`. Platform is invisible by universal convention.

**Author DX target**:

```bash
npm create flowkit-app@latest my-project
cd my-project && npm install && npm run dev
```

> **Update (post-Phase-2 build):** the original target command was `npm create flowkit@latest`, which resolves to the npm registry package `create-flowkit`. That exact name is already registered to an unrelated, unaffiliated package — so the scaffolder ships as `create-flowkit-app` instead and the real command is `npm create flowkit-app@latest`. See the "🔴 create-flowkit name collision" note and the updated Step 2.1/2.2 below. Not yet published to npm — currently runs via `node packages/create-flowkit-app/index.js <name>` for local testing.

---

## Flagged Issues — Read Before Building

### 🔴 CRITICAL: import.meta.glob String Literal Constraint

Vite resolves `import.meta.glob` patterns at build time — they must be string literals. The engine currently globs `workspaces/<name>/flows/**/*.tsx`. When the engine lives in `node_modules`, those paths don't exist in the author's project.

**Fix required**: Replace all hardcoded glob patterns in the engine with a virtual module (`virtual:flowkit/screens`) that the Vite plugin generates dynamically at dev/build time by reading the author's `flowkit.config.ts` and globbing `./flows/**` from CWD.

**Audit target**: grep `import.meta.glob` in `src/` — every hit is a migration candidate.

---

### 🔴 CRITICAL: Vite Does Not Process node_modules by Default

If FlowKit ships source (TSX/TS), the author's Vite instance will not transform it. The FlowKit Vite plugin must explicitly add `node_modules/flowkit/src` to `server.fs.allow` and `optimizeDeps.include`. Must also set `optimizeDeps.exclude: ['flowkit']` — if Vite pre-bundles the package, source maps and HMR break.

---

### 🔴 CRITICAL: Deployment Branch is the Git Dep Source

`sync:deployment` pushes `src/` as-is. Once the engine imports `virtual:flowkit/screens`, that import is unresolvable without the FlowKit Vite plugin. Any consumer who installs the git dep and uses a plain `vite.config.ts` gets a broken build.

**Fix required**: The existing `workspaces/<name>/` setup (repo mode) must be migrated to use `flowkit/vite` plugin before Phase 3 ships. This repo's own `vite.config.ts` must consume the plugin it ships. No consumer can use a naked Vite config after Phase 3.

**Migration gate**: All existing workspaces in this repo must be migrated to the plugin before the Phase 3 commit lands on `deployment`.

---

### 🔴 CRITICAL: reconcileWorkspacesPlugin Writes to node_modules

`reconcileWorkspacesPlugin()` in `vite.config.ts` writes to `src/workspaces.json` on every dev start. In flat mode, that file is inside `node_modules/flowkit/src/` — a write to `node_modules` at dev start. This silently corrupts the package for any consumer using pnpm hard links or a shared npm cache.

**Fix required**: Gate `reconcileWorkspacesPlugin` — skip entirely when `VITE_SINGLE_WORKSPACE=true`. The plugin must never run in author (flat) mode.

---

### ⚠️ HIGH: exports Field — Node vs Vite Conflict

Pointing `"."` at a `.ts` file works in Vite but breaks in Node (`require`). The CLI runs in Node. Two separate exports keys required:

```json
"exports": {
  ".": {
    "types": "./dist/types/index.d.ts",
    "import": "./dist/lib/index.js"   ← pre-built JS for Node consumption
  },
  "./vite": "./scripts/vite-plugin.js"
}
```

The library entry (`defineConfig`, `defineFlow`, `tag`, types) must be pre-built to JS, not shipped as raw TS.

---

### ⚠️ HIGH: Config Injection Cannot Use import.meta.env String

`flowkit.config.ts` can contain functions (guard functions, etc.). You cannot serialize arbitrary TS exports into a Vite `define` string. `import.meta.env.VITE_FLOWKIT_CONFIG` injection will break on any non-JSON-safe config value.

**Fix required**: Use a second virtual module `virtual:flowkit/config` instead. Plugin reads and re-exports the parsed config object at build time. Engine imports from `virtual:flowkit/config` — no serialization needed.

---

### ⚠️ HIGH: HMR Invalidation for Virtual Module

When an author adds a new screen file, the virtual module `virtual:flowkit/screens` must invalidate — otherwise dev server requires a full restart on every screen add.

**Fix required**: Plugin must implement `configureServer` and `handleHotUpdate` hooks to watch `./flows/**` and invalidate `\0virtual:flowkit/screens` on any change.

---

### ⚠️ HIGH: CLI Path Assumptions

Most CLI commands (`sessions`, `feedback`, `dump`, `export`, `handoff`, `status`) resolve paths as `workspaces/<name>/lib/...`. In flat mode, the equivalent is `./lib/...` from CWD.

**Fix required**: CLI path resolution must detect mode (`isRepoMode()`) and route accordingly.

---

### ⚠️ MEDIUM: flowLensSaveSessionPlugin Hardcodes Session Path

Currently saves to `workspaces/<name>/lib/flowLens/sessions/`. In flat mode this path doesn't exist.

**Fix required**: Plugin reads session path from config — defaults to `./lib/flowLens/sessions/` relative to CWD.

---

### ⚠️ MEDIUM: sync:deployment Strips packages/

`manifest.js` controls what `sync:deployment` removes. `packages/create-flowkit-app/` does not exist yet — there is no guarantee it survives deployment sync. Must be explicitly whitelisted in `manifest.js` before the directory is created.

**Fix required**: Add `packages/` to `manifest.js` preserved paths before Phase 2 work begins.

---

### 🔴 CRITICAL (discovered during build): `create-flowkit` Name Collision on npm

`npm create flowkit@latest` is npm shorthand for `npx create-flowkit@latest`, which always resolves against the **public npm registry** for a package literally named `create-flowkit` — never a local or git-dep package. That exact name is already published by an unrelated maintainer (unrelated abandoned package, last published ~1 year prior to this plan). We cannot publish to it.

**Fix applied**: Renamed the scaffolder package to `create-flowkit-app`. Real author command is `npm create flowkit-app@latest <name>` (resolves to `npx create-flowkit-app@latest`), not `npm create flowkit@latest`. Updated everywhere: `packages/create-flowkit-app/package.json` (`name`, `bin`), `index.js` usage text, `scripts/cli/workspace.js` flat-mode deprecation message, and the author guide.

**Not yet published** — `npm publish` is a separate, deliberate decision (registry names can't be fully reclaimed after publish). Until then, test locally via `node packages/create-flowkit-app/index.js <name>`.

---

### ⚠️ MEDIUM: CLAUDE.md Will Drift

A static `CLAUDE.md` baked into the scaffold template becomes a stale lie when CLI commands change. It won't auto-update when authors run `npm update flowkit`.

**Fix required**: `CLAUDE.md` must be thin — a pointer to `docs/` rather than duplicating content. Or: generated from `node_modules/flowkit/docs/` at scaffold time, same as `docs/`. Either way it must not contain content that can drift silently.

---

### ⚠️ MEDIUM: No Migration Path for Existing Workspaces

`workspaces/nClarity/flowkit.config.ts` imports from `@platform/core/config`. After Phase 1 ships the `exports` field, authors should import from `'flowkit'`. Existing workspaces in this repo need a documented one-time migration.

---

### ⚠️ LOW: Separate tsconfig.build.json Required

`tsc --declaration --emitDeclarationOnly` targeting only the public API requires a separate `tsconfig.build.json` — the main `tsconfig.app.json` includes all of `src/` which would emit declarations for everything. Not doing this ships internal types to authors.

---

## Implementation Plan

### Phase 1 — Package Foundation (Effort: S | ~1-2 days)

Goal: Make FlowKit installable as a git dep. Zero author-facing functionality changes yet.

**Step 1.1 — Whitelist `packages/` in manifest.js**
Add `packages/` to preserved paths in `scripts/deploy/manifest.js` before any other work. Prevents `sync:deployment` from stripping the scaffolder once it's created.

**Step 1.2 — Add `files` field to `package.json`**

```json
"files": ["scripts/", "src/", "dist/", "packages/", "docs/"]
```

**Step 1.3 — Add `exports` field with separate Node and Vite entries**

```json
"exports": {
  ".": {
    "types": "./dist/types/index.d.ts",
    "import": "./dist/lib/index.js"
  },
  "./vite": "./scripts/vite-plugin.js"
}
```

**Step 1.4 — Create tsconfig.build.json targeting public API only**
Targets: `src/core/config/defineConfig.ts`, `src/types/index.ts`.
Output: `dist/lib/index.js` + `dist/types/index.d.ts`.

**Step 1.5 — Create vite.lib.config.ts and add build:lib script**
Create `vite.lib.config.ts` at repo root — Vite lib mode config targeting the public API entry:

```ts
import { defineConfig } from 'vite'
export default defineConfig({
  build: {
    lib: {
      entry: 'src/core/config/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist/lib',
    rollupOptions: {
      external: ['react', 'react-dom'], // peerDeps — not bundled
    },
  },
})
```

Add script:

```json
"build:lib": "tsc -p tsconfig.build.json && vite build --config vite.lib.config.ts"
```

**Step 1.6 — Separate React as peerDependency**
Move React 19, react-dom, Radix UI from `dependencies` → `peerDependencies` AND `devDependencies`. Both entries required: `peerDependencies` tells consumers what to provide; `devDependencies` keeps `npm run dev` working in this repo.

**Verification**: `npm pack --dry-run` — confirm only whitelisted files appear. `node -e "require('.')"` — confirm Node can import without error.

---

### Phase 2 — create-flowkit-app Scaffolder (Effort: S | ~1 day)

Goal: Author bootstraps with one command. Validate the DX manually before writing the scaffolder.

**Step 2.0 — Manual validation gate (do this first)**
Before writing any scaffolder code, prove the virtual module architecture works in Vite. `scripts/vite-plugin.js` does not exist yet — use an inline local stub in the test project's `vite.config.ts` that hardcodes what the real plugin will do:

```ts
// test-project/vite.config.ts — inline stub, not the real plugin
import { defineConfig } from 'vite'

const flowkitStub = () => ({
  name: 'flowkit-stub',
  resolveId(id) {
    if (id === 'virtual:flowkit/screens') return '\0virtual:flowkit/screens'
  },
  load(id) {
    if (id === '\0virtual:flowkit/screens')
      return `
      export const screens = {
        'onboarding/welcome': () => import('/abs/path/to/flows/onboarding/welcome/WelcomeScreen.tsx')
      }
    `
  },
})

export default defineConfig({ plugins: [flowkitStub()] })
```

Run `npm run dev` with this stub. Confirm:

- Screens load from the virtual module
- HMR triggers on screen file edits
- Vite processes `node_modules/flowkit/src` TSX without errors

This validates the architecture is sound before committing to Phase 3. If this stub fails, diagnose before proceeding.

**Step 2.1 — New package at `packages/create-flowkit-app/`**
Tiny package invoked via `npm create flowkit-app@latest <name>` (renamed from `create-flowkit` — see the npm name-collision note above). Scaffolds:

```
<name>/
├── flows/
│   └── onboarding/
│       └── welcome/
│           └── WelcomeScreen.tsx
├── flowplans/
│   └── onboarding.ts
├── lib/
│   ├── data/db.ts
│   └── components/
├── docs/                    ← copied from node_modules/flowkit/docs/ at scaffold time
├── CLAUDE.md                ← thin: describes project structure, points to docs/ for CLI ref
├── flowkit.config.ts        ← imports from 'flowkit'
├── vite.config.ts           ← imports from 'flowkit/vite'
├── tsconfig.json
└── package.json             ← devDep: "flowkit": "github:rahil-avj/flowkit-app"
```

**CLAUDE.md content rule**: Thin. No duplicated CLI reference. Must include:

- One paragraph: what FlowKit is
- Where author files live (flows/, flowplans/, lib/)
- `See docs/CLI.md for all commands`
- `Do not edit node_modules/flowkit`

**docs/ population**: Copy from `node_modules/flowkit/docs/` at scaffold time — docs always match installed version.

**Step 2.2 — Scaffold templates**
`flowkit.config.ts`:

```ts
import { defineConfig } from 'flowkit'
export default defineConfig({
  flows: ['onboarding'],
  screenOrder: { onboarding: ['welcome'] },
})
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import { flowkit } from 'flowkit/vite'
export default defineConfig({ plugins: [flowkit()] })
```

**Verification**: Scaffold a test project, `npm install`, `npm run dev` — confirm screens load.

> ✅ Verified locally: `node packages/create-flowkit-app/index.js test-project` scaffolds, `npm install` resolves the `file:` devDep against this repo's `dist/lib` (built via `npm run build:lib`), and `npm run dev` serves `HTTP 200`. Not yet published to npm — `npm create flowkit-app@latest` will work only after a deliberate `npm publish`.

---

### Phase 3 — Vite Plugin (Effort: M | ~3-4 days)

Goal: Engine finds author's screens without hardcoded paths. This is the hardest phase.

**Pre-condition**: Phase 2 manual validation gate must pass before starting this phase.

**Step 3.1 — Audit all import.meta.glob calls in src/**
`grep -rn "import.meta.glob" src/` — catalogue every hit, what it loads, and what replaces it. Do not write plugin code until this list is complete.

**Step 3.2 — Create `scripts/vite-plugin.js` exported as `flowkit/vite`**
Responsibilities:

- Read `flowkit.config.ts` from `process.cwd()` by **bundling via esbuild directly** (always present as a Vite peer dep) to a temp `.mjs`, then `import()`-ing it. Do not use `loadConfigFromFile()` — that utility is designed for Vite's own config files and requires `{ command, mode }` args; using it on `flowkit.config.ts` is an API abuse that may mangle output on future Vite versions.

```js
import esbuild from 'esbuild'
import { tmpdir } from 'os'
import { join } from 'path'

const out = join(tmpdir(), 'flowkit-config.mjs')
await esbuild.build({
  entryPoints: [configPath],
  bundle: true,
  format: 'esm',
  outfile: out,
  external: ['flowkit'],
})
const { default: config } = await import(out)
```

- Set `resolve.alias['@workspace']` to `process.cwd()`
- Add `node_modules/flowkit/src` to `server.fs.allow` and `optimizeDeps.include`
- Set `optimizeDeps.exclude: ['flowkit']` — prevents pre-bundling
- Set `VITE_SINGLE_WORKSPACE=true` in `define`
- Gate `reconcileWorkspacesPlugin` — must not run when `VITE_SINGLE_WORKSPACE=true`
- Generate virtual modules (3.3 and 3.4)
- Watch `./flows/**` via `configureServer` + `handleHotUpdate` for HMR invalidation

**Step 3.3 — Virtual module: `virtual:flowkit/screens`**
Plugin reads `screenOrder` from config, generates lazy imports for each screen:

```ts
export const screens = {
  'onboarding/welcome': () => import('/abs/cwd/flows/onboarding/welcome/WelcomeScreen.tsx'),
}
```

HMR: plugin invalidates this module when any file under `./flows/**` changes.

**Step 3.4 — Virtual module: `virtual:flowkit/config`**
Plugin re-exports the parsed `flowkit.config.ts` as a plain object. Engine imports from here — no `import.meta.env` string serialization.

```ts
// virtual:flowkit/config
export const config = { flows: [...], screenOrder: {...}, workspace: {...} }
```

**Step 3.5 — Update engine screen loader**
Replace every `import.meta.glob` hit (from 3.1 audit) with imports from virtual modules. Add TS declarations for both virtual modules in `src/vite-env.d.ts`.

**Step 3.6 — Gate reconcileWorkspacesPlugin**
In `vite.config.ts` (this repo): wrap `reconcileWorkspacesPlugin()` so it only runs when `VITE_SINGLE_WORKSPACE` is not set.

**Step 3.7 — Migrate this repo to use flowkit/vite plugin**
`vite.config.ts` in this repo must use the plugin it ships. This is the migration gate — must complete before Phase 3 lands on `deployment`.

**Verification**:

1. `npm run dev` in this repo — confirm screens load, HMR works, no regression
2. Scaffold test author project — `npm run dev`, add a screen, confirm HMR triggers without restart
3. `npm run build` in author project — confirm standalone HTML includes author screens

---

### Phase 4 — CLI Flat Mode (Effort: M | ~2-3 days)

Goal: CLI commands work from an author's flat project root.

**Step 4.1 — Mode detection utility**
New function in `scripts/lib/paths.js`:

```js
export function isRepoMode() {
  return fs.existsSync(path.join(process.cwd(), 'workspaces'))
}
export function workspacePath(name) {
  return isRepoMode() ? path.join(process.cwd(), 'workspaces', name) : process.cwd()
}
```

**Step 4.2 — Thread through affected commands**
`sessions/`, `feedback.js`, `dump.js`, `export.js`, `handoff.js`, `status.js` — replace hardcoded `workspaces/<name>/` path construction with `workspacePath(name)`.

**Step 4.3 — Gate flowLensSaveSessionPlugin path**
Read session save path from config. Default: `./lib/flowLens/sessions/` relative to CWD.

**Step 4.4 — Deprecate `flowkit nw` in flat mode**
In flat mode: print message directing to `npm create flowkit-app@latest`. In repo mode: unchanged.

> ✅ Implemented in `scripts/cli/workspace.js` `cmdNewWorkspace()`.

**Verification**:

```bash
cd test-author-project
flowkit status          # resolves to ./lib/flowLens etc.
flowkit sessions:ls     # finds sessions in ./lib/flowLens/sessions/
```

---

## What Does NOT Change

- `src/` internals — no refactor of contexts, canvas, features, FlowEngine
- FlowLens — stays lazy, still behind `VITE_ENABLE_FLOWLENS`
- Session/IndexedDB logic — unchanged
- Your dev workflow — you still work in this repo with `workspaces/nClarity/`

---

## Delivery Order

```
Phase 1 → Phase 2 (manual gate first) → Phase 3 → Phase 4

Critical sequencing rules:
- Phase 1 Step 1.1 (manifest.js) MUST happen before any other step
- Phase 2 manual validation MUST pass before Phase 3 starts
- Phase 3 Step 3.7 (migrate this repo to plugin) MUST land before deployment branch push
- Phase 4 can run in parallel with Phase 3 after Step 3.2 is done
```

---

## Decisions (locked)

| Question                                          | Decision                                                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace: { name, description }` in flat config | Keep — optional. Engine uses it for UI title bar. Not required.                                                                                   |
| Workspace switcher in author project              | Hidden via `VITE_SINGLE_WORKSPACE=true` — not removed. Multi-workspace stays for repo (dev) mode.                                                 |
| `create-flowkit-app` location                     | Inside this repo at `packages/create-flowkit-app/` (renamed from `create-flowkit` due to npm name collision). One repo ships engine + scaffolder. |
| Config injection method                           | `virtual:flowkit/config` virtual module — no env string serialization                                                                             |
| CLAUDE.md strategy                                | Thin pointer to `docs/` — no duplicated CLI content that can drift                                                                                |
