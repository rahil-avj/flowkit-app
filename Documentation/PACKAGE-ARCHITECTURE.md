# FlowKit as a Package — Developer Architecture Reference

> Audience: whoever picks up development on the git-dep/npm-package effort next. This is a technical reference for _how the system works and why_, not a plan or a status report. The original implementation plan and its gap-analysis audit have been compressed into `Documentation/product/vision/VISION.md` (Distribution model) and `Documentation/product/vision/FEATURES.md` (Package-Publish rows) — see those for status and open items. For the consumer-facing guide, see [PACKAGE-AUTHOR-GUIDE.md](./PACKAGE-AUTHOR-GUIDE.md).
>
> Dual-mode source code (`isRepoMode()`, `assertScopedWorkspaceDir()`, lib build `exports`/`files`, `packages/create-flowkit-app/`) is present on `main`. No consumer-facing install path is live yet — `create-flowkit-app` has not been published to npm, and no `deployment` branch exists on `origin` for a git dependency to target.

---

## 1. The core idea

FlowKit ships two ways from one repo:

- **Repo mode** — this repo, checked out normally. `workspaces/<name>/` holds author content, platform code lives in `src/`, multiple workspaces can coexist, switched via a browser UI.
- **Flat / author mode** — someone runs `npm create flowkit-app@latest my-project`, gets a project with just `flows/`, `flowplans/`, `lib/`, `flowkit.config.ts`, plus `flowkit` installed in `node_modules/`. There is no `workspaces/` directory. There is exactly one implicit workspace: the whole project.

The two modes share **all** the same platform source (`src/`) and CLI code (`scripts/platform/`, `scripts/helpers/`). The only difference is _where things resolve from_ — a workspace-shaped subdirectory of this repo, vs. the author's own project root. Almost every bug found this session was a place where that distinction leaked: code written assuming repo-mode's directory shape broke silently (or destructively) when run in flat mode.

---

## 2. Mode detection — `scripts/helpers/paths.js`

```js
export const ROOT = path.resolve(__dirname, '../..') // wherever paths.js physically lives
const REPO_ROOT_MARKER = path.join(ROOT, '.flowkit-repo-root')

export function isRepoMode() {
  return fs.existsSync(REPO_ROOT_MARKER)
}

export function workspacePath(name) {
  if (isRepoMode()) return path.join(ROOT, 'workspaces', name)
  return process.cwd()
}
```

`ROOT` is computed from `paths.js`'s own file location, not `process.cwd()`. That's the load-bearing fact: in repo mode, `paths.js` lives in _this_ repo's `scripts/helpers/`, so `ROOT` is this repo's root regardless of what directory you ran a command from. In flat mode, `flowkit` is installed at `<project>/node_modules/flowkit/`, so `paths.js` lives at `.../node_modules/flowkit/scripts/helpers/paths.js`.

**This check has broken twice, for two different reasons — third time's the marker file:**

1. **Originally** checked `fs.existsSync(path.join(process.cwd(), 'workspaces'))`. Wrong — this repo can legitimately have zero workspaces (the last one, `nClarity`, was intentionally decommissioned) while still being repo mode. With that check, running any `flowkit` command from this repo's root misdetected as flat mode, and `workspacePath(name)` fell through to `return process.cwd()` — the entire repo root. `flowkit rw` then deleted the whole repository.
2. **Fixed** by checking whether `ROOT` contains a `node_modules` path segment (`.../node_modules/flowkit` in flat mode always does; this repo's own root never does) — a structural fact of _how flowkit was installed_, not a snapshot of directory contents. This held until a `file:` dependency entered the picture: `npm install` on a `file:` spec creates a **symlink**, not a copy, under `node_modules`. `import.meta.url` resolves through that symlink to `ROOT`'s realpath, which has no `node_modules` segment at all — so a flat-mode project depending on flowkit via `file:` (or `npm link`) was misdetected as repo mode, pointing every workspace-scoped path at the real monorepo on the developer's machine instead of the flat project. Confirmed live by scaffolding via `create-flowkit-app --local-dev` and running `flowkit status` from inside the result — it printed a path into the real monorepo, not the scaffolded project.
3. **Current fix:** a marker file, `.flowkit-repo-root`, tracked in git at this repo's actual root and deliberately excluded from `package.json`'s `"files"` allowlist. Its presence is the one signal immune to both directory-contents drift and symlink-realpath resolution, since it's a deliberate marker rather than something inferred from install mechanics — and its absence fails toward the safe direction (repo-only commands wrongly blocked, never wrongly allowed against the wrong `ROOT`). ⚠️ **Regression risk, currently unguarded:** the automated check that used to fail loudly if a future `files[]` change ever widened to catch this marker (`scripts/tests/manifest-consistency.test.js`'s `M4`) was deleted along with the rest of `scripts/deploy/` when the repo moved off the deployment-branch mechanism — there is no test today that would catch `.flowkit-repo-root` accidentally shipping in a real `npm pack`. Worth a standalone replacement test before publish.

**Defense in depth**, added after that incident — every code path that recursively deletes a named workspace directory calls this first:

```js
export function assertScopedWorkspaceDir(wsDir, name) {
  const resolved = path.resolve(wsDir)
  const unsafe = [ROOT, path.dirname(ROOT), process.cwd(), path.parse(resolved).root]
  if (!name || unsafe.some(p => path.resolve(p) === resolved)) {
    throw new Error(`Refusing to delete unsafe path "${resolved}" for workspace "${name}". ...`)
  }
}
```

Call sites: `scripts/platform/workspace.js` (`cmdNewWorkspace`'s rollback-on-failure, `cmdRemoveWorkspace`), `scripts/authoring/screens.js`, `scripts/authoring/flows.js`. If you add a new place that deletes a workspace-scoped directory, call this first — it's cheap and it's the only thing standing between a bug like the one above and another repo wipe.

**Commands that only make sense in repo mode** (`flowkit nw`, `flowkit rw`, `flowkit watch`, `flowkit export`, `flowkit handoff`) call a shared guard at the top instead of hand-copying the message each time:

```js
export async function cmdRemoveWorkspace(val) {
  requireRepoMode('flowkit rw', 'An author project is a single workspace — there is nothing to remove this way.')
  ...
```

If you add a new CLI command that assumes `workspaces/<name>/` exists, add this guard. If a command _should_ work in both modes, thread everything through `workspacePath()`/`isRepoMode()` rather than constructing `workspaces/...` paths by hand — see `scripts/platform/status.js` for the reference-correct pattern (uses `getActiveWorkspaceName()` + `workspacePath()`, never checks `listWorkspaceDirs().length` as a gate, so it degrades gracefully to "the one implicit flat-mode workspace" instead of hard-failing).

---

## 3. The npm package surface — `package.json`

```json
{
  "name": "flowkit",
  "files": [
    "scripts/",
    "src/",
    "dist/",
    "packages/",
    "docs/",
    "index.html",
    "!scripts/tests/",
    "!scripts/builders/format.mjs"
  ],
  "exports": {
    ".": {
      "types": "./dist/types/core/config/index.d.ts",
      "import": "./dist/lib/index.js"
    },
    "./vite": "./scripts/helpers/vite-plugin.js"
  }
}
```

- **`"files"` is an allowlist**, not a denylist — only these paths (and their contents) end up in what npm packs, whether via `npm publish`, a `file:` dependency, or a git dependency. Anything not listed (`.husky/`, `eslint.config.js`, `.prettierrc`, `vitest.config.ts`, etc.) is excluded _by omission_ — no negation needed.
- The two `!`-negations exist because `"scripts/"` is broad and swept in real dev-only files: `scripts/tests/**` (vitest specs), `scripts/builders/format.mjs` (the Prettier wrapper script). Verify with `npm pack --dry-run --json` — that's the only way to know for sure what actually ships; reading the "files" field alone doesn't tell you what glob patterns like `"scripts/"` pull in. (`scripts/deploy/` — this repo's former release-tagging/deployment-branch tooling — was removed entirely once the repo committed to npm publish as the distribution path; there's no longer a `deployment` git branch mechanism to maintain.)
- **`"exports"` has two separate entries** because Node (running the CLI) and Vite (running in a browser/dev-server context) resolve differently. `"."` is the Node-facing, pre-built JS entry (`defineConfig`, `defineFlow`, `tag`, types) — it must be built output, not raw TypeScript, because Node can't strip types itself. `"./vite"` points straight at `scripts/helpers/vite-plugin.js`, which is already plain JS and needs no build step.
- **The `dist/lib` build**: `npm run build:lib` runs `tsc -p tsconfig.build.json && vite build --config vite.lib.config.ts`. `tsconfig.build.json` is deliberately scoped to only 4 files (`src/core/config/{index,defineConfig}.ts`, `src/types/index.ts`, `src/shared/contexts/FlowNavContext.tsx`) — not all of `src/` — so internal implementation types don't leak into the public `.d.ts` output.

### The alias-leak gotcha (already fixed, but the pattern will recur)

The public API source files used to import types via `@platform/types/index` — a path alias that only exists in _this repo's own_ `tsconfig.json`/`vite.config.ts`. TypeScript's declaration emit does **not** rewrite path-mapped imports to relative paths; it just writes the specifier as-is into the `.d.ts`. A consumer's TypeScript has no idea what `@platform` means, so `import { defineConfig } from 'flowkit'` would fail to resolve `AnnotationTag`/`FlowkitConfig`/etc. — but only for consumers who don't set `skipLibCheck`, which made it easy to miss.

The fix, everywhere it recurs: **any file reachable from the public entry point (`src/core/config/index.ts`) must use relative imports for its own type dependencies, never `@platform/*` or any other alias.** Fixed so far in `src/core/config/index.ts`, `src/core/config/defineConfig.ts`, `src/types/index.ts`. If you add a new file to `tsconfig.build.json`'s `include`, or make the public entry re-export something new, grep it for `@flowkit`/`@shared`/`@core`/etc. before assuming it's fine — `grep -rn "from '@\(platform\|shared\|core\|features\|kit\|workspace\|flowlens\)" dist/types/` after a build is the fastest way to catch it (should return nothing).

---

## 4. The Vite plugin — `scripts/helpers/vite-plugin.js` (exported as `flowkit/vite`)

This is the part that makes flat mode actually work at dev-server time. Header comment says it best:

```js
/**
 * Generates virtual modules that replace all import.meta.glob patterns
 * which hardcode workspaces/<name>/... paths. In flat-layout author projects
 * the workspaces/ directory does not exist — the plugin reconstructs the same
 * data from flowkit.config.ts + direct filesystem globs from CWD.
 *
 * Virtual modules produced:
 *   virtual:flowkit/config      — parsed FlowkitConfig object
 *   virtual:flowkit/screens     — lazy screen import map
 *   virtual:flowkit/flowplans   — eager flowplan import map
 *   virtual:flowkit/workspace   — db, simulator, tokens, logos, tags, sessions
 */
```

### 4.1 Reading `flowkit.config.ts`

`flowkit.config.ts` can contain arbitrary JS (guard functions, etc.) — you can't just `JSON.parse` it, and you can't `import()` a `.ts` file directly from a plain Node script. The plugin bundles it with esbuild into a temp file, then dynamically imports that:

```js
async function readFlowkitConfig(cwd) {
  const configPath = path.join(cwd, 'flowkit.config.ts')
  // shim 'flowkit' -> identity functions, since defineConfig/defineFlow/tag
  // just need to exist, not do anything special, for THIS purpose
  const shimFile = ... // writes defineConfig = c => c, etc.
  await esbuild.build({ entryPoints: [configPath], bundle: true, format: 'esm',
    outfile, alias: { flowkit: shimFile }, external: ['react', 'react-dom'] })
  const mod = await import(`file://${outfile}?t=${Date.now()}`)
  return mod.default ?? mod
}
```

Deliberately **not** using Vite's own `loadConfigFromFile()` — that utility is designed for Vite's own config files, expects `{ command, mode }` arguments, and using it here would be relying on undocumented behavior that could change on a Vite upgrade.

### 4.2 Virtual modules

Each is generated as a **string of JS source code**, then handed to Vite via the standard `resolveId`/`load` plugin hooks:

```js
resolveId(id) {
  if (Object.values(VIRTUALS).includes(id)) return '\0' + id  // \0 prefix = "don't let other plugins touch this"
},
async load(id) {
  if (!id.startsWith('\0virtual:flowkit/')) return
  return generateVirtual(id.slice(1))
},
```

- **`virtual:flowkit/config`** — trivial: `export const config = ${JSON.stringify(config)}`.
- **`virtual:flowkit/screens`** — globs `flows/<flow>/**/*.tsx` per flow in `screenOrder`, generates a lazy-import map keyed by `"flow/screenId"`, plus a parallel `screenMeta` map (imports each screen's named `screenMeta` export) and a `lazyScreens` map wrapping each loader in `React.lazy()`.
- **`virtual:flowkit/flowplans`** — globs `flowplans/*.ts`, eagerly imports each (flowplans are small, no need for lazy-loading).
- **`virtual:flowkit/workspace`** — the catch-all: `db`, `loadSimulator`, `loadTokens`, `logo`, `tags`, `sessions`. Each is independently optional (checks `fs.existsSync` on a small list of candidate paths per feature before deciding whether to generate a real loader or a stub).

**`db` resolution — named exports win over default:**

```js
if (dbFile) {
  parts.push(
    `import * as _dbAll from ${JSON.stringify(dbFile)}\n` +
      `const { default: _dbDefault, ..._dbNamed } = _dbAll\n` +
      `export const db = Object.keys(_dbNamed).length ? _dbNamed : (_dbDefault ?? {})`
  )
}
```

Author `db.ts` files are expected to use **named exports** (`export const user = {...}`, `export const items = [...]`) — matching repo-mode's own convention exactly. A single `export default {...}` is supported as a fallback, but named exports is the documented, primary path (both `create-flowkit-app`'s scaffold and `scripts/helpers/scaffold.js`'s repo-mode scaffold use named exports).

**`loadTokens` — the `?inline` gotcha:**

```js
parts.push(
  `export const loadTokens = () => import(${JSON.stringify(tokenFile + '?inline')}).then(m => m.default)`
)
```

The `.then(m => m.default)` is load-bearing. `src/vite-env.d.ts` declares `loadTokens: (() => Promise<string>) | null` — but a Vite `?inline` CSS import resolves to a **module namespace object** (`{ default: "css text" }`), not the raw string. Without unwrapping `.default` here, every consumer of `loadTokens()` (there's exactly one: `workspaceModules.ts`'s `loadWorkspaceTokens`, which does `tag.textContent = css`) gets a `TypeError: Cannot convert object to primitive value` — this broke on literally every flat-mode project load until fixed. If you add a new virtual export that wraps a dynamic `import()`, check what shape that import specifier actually resolves to (plain module vs. `?inline`/`?raw`/`?url` query variants all differ) before trusting the type declaration.

### 4.3 Vite config injection — the `config()` hook

```js
config() {
  const engineSrc = options.workspaceRoot ? ENGINE_SRC : path.join(cwd, 'node_modules/flowkit/src')
  const flatAliases = options.workspaceRoot ? {} : {
    '@platform': engineSrc, '@core': ..., '@features': ..., '@shared': ..., '@flowlens': ..., '@kit': ...,
    flowkit: path.join(engineSrc, 'core/config/index.ts'),
  }
  return {
    define: options.workspaceRoot ? {} : { 'import.meta.env.VITE_SINGLE_WORKSPACE': JSON.stringify('true') },
    resolve: {
      alias: { '@workspace': cwd, ...flatAliases },
      dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
      preserveSymlinks: !options.workspaceRoot,
    },
    optimizeDeps: {
      exclude: options.workspaceRoot ? [] : ['flowkit', '@platform', '@core', '@features', '@shared', '@kit', '@flowlens'],
    },
    server: { fs: { allow: [cwd, path.join(cwd, 'node_modules/flowkit/src')] } },
  }
},
```

Same `flowkit()` function call serves **both** modes — `options.workspaceRoot` is only ever passed by this repo's own `vite.config.ts` (repo mode, pointing at the active workspace); flat-mode author projects call `flowkit()` with no arguments at all.

Each piece exists for a specific reason:

- **`optimizeDeps.exclude`** — Vite's dependency pre-bundling would otherwise create a _second_, separately-bundled copy of the platform's internal modules. Concretely: `App.tsx` importing `FeedbackContext` via a relative path gets the raw ESM version; `KitSideInspector` importing the same file via `@platform` alias would get the pre-bundled chunk — two separate `createContext()` calls, so the Provider and the consuming hook silently stop matching (React context becomes `undefined` where you'd expect a value, with no error).
- **`preserveSymlinks: true`** (flat mode only) — `node_modules/flowkit` for a `file:`-dependency install is a _symlink_ to the actual source directory (confirmed directly: `ls -la node_modules/flowkit` shows `-> ../../..` for a local dev install). Without `preserveSymlinks`, Vite/Node resolve through the symlink to its real path, which breaks `react`/`react-dom` resolution — they'd resolve relative to wherever the symlink target lives, not the author project's own `node_modules`.
- **`server.fs.allow`** — Vite refuses to serve files outside the project root by default; this explicitly allows reading from `node_modules/flowkit/src` so the browser can load `.tsx` engine source directly (see `index.html`'s `<script src="/node_modules/flowkit/src/main.tsx">` — this is a literal, working precedent for reaching into the installed package by raw path, not resolved via the "exports" field at all).

### 4.4 HMR

```js
configureServer(server) {
  const watchDirs = [path.join(cwd, 'flows'), path.join(cwd, 'flowplans'), path.join(cwd, 'lib'), path.join(cwd, 'flowkit.config.ts')]
  server.watcher.add(watchDirs)
  server.watcher.on('all', (event, file) => {
    if (watchDirs.some(d => file.startsWith(d))) invalidate(server)
  })
  ...
},
async handleHotUpdate({ file, server }) {
  if (/* file is under a watched dir */) {
    invalidate(server)
    server.ws.send({ type: 'full-reload' })  // virtual module consumers need to re-execute, not just hot-swap
    return []
  }
},
```

Virtual modules are cached in a `Map` (`cache`) keyed by module ID, cleared on any relevant file change via `invalidate()`. A `full-reload` is sent rather than trying to hot-swap — the virtual modules bake filesystem paths and content directly into generated source, so a partial HMR update would leave stale references.

---

## 5. FlowLens session saving — two separate middlewares, same shape

There is **no shared code** between repo-mode and flat-mode session saving — they're two independent implementations of the same `POST /__flowlens/save-session` endpoint, because they live in two different files that are never loaded together:

- **Repo mode**: `flowLensSaveSessionPlugin()` in this repo's own `vite.config.ts` — looks up the active workspace from `src/workspaces.json`, saves to `workspaces/<ws>/lib/flowLens/`.
- **Flat mode**: the same middleware, ported into `scripts/helpers/vite-plugin.js`'s `configureServer`, saving to `<cwd>/lib/flowLens/` instead — added this session, because it didn't exist at all before (an author project only ever loads `flowkit/vite`'s plugin, never this repo's `vite.config.ts`, so there was no way to save a session in flat mode whatsoever).

Both write the same shape: `studies.json` (auto-created with an `initial-study` if missing) + `sessions/<studyId>/<slug>-<id8>.json`. The flat-mode read side (`genWorkspace`'s `sessionFiles = await globFiles('lib/flowLens/sessions/**/*.json', cwd)`) expects exactly this layout — if you change one side's path convention, change the other, or sessions saved via one path silently stop being readable.

If you ever unify these two plugins into one shared function, the parameter to abstract over is just "what's the flowLens base directory" (`workspaces/<ws>/lib/flowLens` vs `<cwd>/lib/flowLens`) — everything downstream of that is identical.

---

## 6. `create-flowkit-app` — the scaffolder

Lives at `packages/create-flowkit-app/`, published (once you run `npm publish` there — not done yet) as its own separate npm package, invoked via `npm create flowkit-app@latest <name>`.

**Why not `npm create flowkit@latest`, matching the original plan?** `npm create <x>` is shorthand for `npx create-<x>@latest` — it always resolves against the public npm registry for a package named exactly `create-<x>`. `create-flowkit` is already registered to an unrelated, abandoned package (confirmed: `npm view create-flowkit` returns a real, unrelated package whose entire source is `console.log("Yo")`). There is no way to make `npm create flowkit@latest` resolve to our code without owning that exact registry name, which we don't and can't dispute our way into short-term. Renamed to `create-flowkit-app` — an unclaimed name — everywhere: the package's own `name`/`bin` fields, its usage text, and `scripts/platform/workspace.js`'s flat-mode redirect message.

### 6.1 How it finds `flowkit`

```js
const FLOWKIT_PUBLISHED_RANGE = '^1.0.0' // bump alongside flowkit's package.json "version"

function resolveFlowkitDependency() {
  const wantsLocalDev = args.includes('--local-dev') || process.env.FLOWKIT_LOCAL_DEV === '1'
  if (!wantsLocalDev) return FLOWKIT_PUBLISHED_RANGE

  const monorepoRoot = path.resolve(__dirname, '..', '..')
  const markerPath = path.join(monorepoRoot, '.flowkit-repo-root')
  if (!fs.existsSync(markerPath)) {
    console.error(
      '✗ --local-dev requires this script to run from inside a flowkit monorepo checkout.'
    )
    process.exit(1)
  }
  return `file:${monorepoRoot}`
}
```

**This used to be unconditionally `file:${path.resolve(__dirname, '..', '..')}`** — a hardcoded local path with no way to produce a working project once this package was actually installed from anywhere but a sibling checkout. That was found and fixed this session, alongside the `isRepoMode()` symlink bug above (they're related — testing this exact `file:` dependency locally is what surfaced the symlink issue in the first place). The default is now the real published semver range; local testing against unreleased platform changes is an explicit, guarded opt-in (`--local-dev` / `FLOWKIT_LOCAL_DEV=1`), gated on the same `.flowkit-repo-root` marker `isRepoMode()` uses, so a stray env var can't silently redirect a real user's scaffold at an unrelated local path. Still don't forget this exists — `FLOWKIT_PUBLISHED_RANGE` needs a manual bump on release, since there's no monorepo `package.json` to read a version from once this is actually installed standalone.

### 6.2 Structure

```
packages/create-flowkit-app/
├── package.json          # name: create-flowkit-app, bin, files: [index.js, templates/]
├── index.js               # everything — prompts, template generation, npm install, docs copy
└── templates/
    └── index.html          # the ONLY static template file left — language-agnostic
```

Everything else (screens, flowplans, `db.ts`, `flowkit.config.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, `CLAUDE.md`, `.gitignore`, `postcss.config.js`, `lib/design-system/tokens.css`) is **generated inline** as template-literal strings inside `index.js`, not copied from static files — because content needs to vary by the author's chosen language (TS/JS) and kit, and string templates are easier to parameterize than a directory of static files with find-and-replace.

### 6.3 Prompts — matching `flowkit nw`'s UX

`index.js` implements its own **self-contained** `selectFromList`/`prompt` (arrow-key terminal UI, non-TTY numbered fallback) — a near-duplicate of `scripts/helpers/prompt.js`, deliberately not imported from there, because this package is meant to be independently installable/publishable and shouldn't depend on the rest of the monorepo at runtime.

Two prompts, both skippable via flags for non-interactive use:

```bash
npm create flowkit-app@latest my-app                       # interactive
npm create flowkit-app@latest my-app -- --lang:js --kit:none  # flags
```

- **Language** (`ts`/`js`) — affects file extensions (`.tsx`/`.jsx`) and `package.json` devDependencies (drops `typescript`/`@types/*` for JS, skips writing `tsconfig.json` entirely). Config/flowplan files stay `.ts` regardless of choice — Vite strips TS syntax from any `.ts`/`.tsx` file whether or not the project declares itself as JS, and this matches repo-mode's own scaffold convention (`scripts/helpers/scaffold.js` never varies `flowkit.config.ts`/flowplan extensions by language either).
- **Kit** (`apple`/`material`/`neo-brutalism`/`mobile-wireframe`/`none`) — a small **hardcoded** list, not read from this repo's `src/kits/` at scaffold time. Once `create-flowkit-app` is published standalone it won't have a sibling `src/` tree to read from at all, so this has to be static. If kits are added/removed from `src/kits/{shared,standalone}/`, update `SHARED_KITS`/`STANDALONE_KITS` in `index.js` by hand.

If `kit !== 'none'`, the generated `lib/design-system/tokens.css` contains a direct-path `@import`:

```css
@import '/node_modules/flowkit/src/kits/shared/tokens/themes/apple.css';
```

Same precedent as `index.html`'s `<script src="/node_modules/flowkit/src/main.tsx">` — reaching into the installed package by raw filesystem path rather than through the `"exports"` field (which doesn't expose `src/kits/*` as a subpath at all). Verified end-to-end with Playwright: the kit CSS text is actually present in the live `<style id="ws-tokens">` tag at runtime, not just that the HTTP request for it succeeds.

### 6.4 The 2-flow/5-screen starter

Ported from `scripts/helpers/scaffold.js`'s repo-mode `workspaceScaffold()` — same content (onboarding: welcome → setup → ready; home: home → detail), adapted from repo mode's `useDashboard()` hook to flat mode's documented `FlowScreenProps` convention:

```tsx
// repo mode (scripts/helpers/scaffold.js)
export default function WelcomeScreen() {
  const { db } = useDashboard()
  return <button id="get-started">Get Started</button> // DOM id matched against flowplan step's `on` field
}

// flat mode (packages/create-flowkit-app/index.js)
export default function WelcomeScreen({ onAction }: FlowScreenProps) {
  return <button onClick={() => onAction?.('get-started')}>Get Started</button> // explicit call
}
```

Repo mode's screens rely on the platform's internal id-based hotspot matching (a button's DOM `id` is matched against the active flowplan step's `on` field automatically — no click handler needed in the JSX at all). Flat mode's screens use the explicit `onAction(actionName)` call instead, since that's the documented public API surface in `FlowScreenProps`'s JSDoc (`src/types/index.ts`). Don't mix the two conventions when porting more repo-mode content — pick `onAction`/`onNext`/`onBack` explicit calls for anything author-facing.

---

## 7. A gap you'll hit immediately if you don't know about it: the Screens-tab preview passes zero props

`src/core/canvas/PreviewCanvas.tsx`'s default "Screens" tab (browsing screens outside of actual flowplan playback) used to render:

```tsx
{ActiveComponent ? <ActiveComponent /> : ...}
```

No props at all. Repo-mode screens never noticed because they read `db` via the `useDashboard()` context hook, which works regardless of what rendered them. Flat-mode screens — which use `FlowScreenProps` (`db` as a _prop_) — saw `db` as permanently `undefined` in this view, only becoming real once you entered actual flowplan playback (which routes through `FlowMaster.tsx`, a completely different component that _does_ pass real props).

Fixed by threading `db` through: `DesktopCanvas` (owns `useDashboard()`) → `CanvasContentProps` → `CanvasContent` (owns the actual `<ActiveComponent>` render) → `<ActiveComponent db={db} />`. If you add more `FlowScreenProps` fields that should be visible in the static preview (not just during playback), thread them the same way — through `CanvasContentProps`, not by trying to reach `useDashboard()` from inside `CanvasContent` directly (it's a different component; the hook call itself would work, but the _value_ the outer `DesktopCanvas` already computed wouldn't be reused, and you'd end up with two independent reads of the same context for no reason).

---

## 8. How to actually test a change to any of this

Reading the code is not enough — several of the bugs above (`loadTokens`'s `?inline` shape, the zero-props Screens-tab render, `db.ts`'s named-vs-default export resolution) were invisible from source inspection and only surfaced by actually running a scaffolded project. The workflow that found them:

```bash
# 1. Scaffold into a scratch directory (gitignored: /test is in .gitignore)
cd <repo-root>/test
node <repo-root>/packages/create-flowkit-app/index.js demo -- --lang:ts --kit:apple --local-dev

# 2. Boot the real dev server
cd demo && npx vite --port 5995 &

# 3. Drive it with Playwright — check console/page errors, failed network requests,
#    actual computed styles, and actual rendered text content, not just "did it 200"
node -e "
import('playwright').then(async ({ chromium }) => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('http://localhost:5995', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  console.log('errors:', errors.length ? errors : 'none')
  await browser.close()
})
"
```

Playwright must be run from _inside this repo_ (`node <script>.mjs` from the repo root, not from a scratch/tmp directory) for its ESM `import 'playwright'` to resolve — Node's module resolution walks up from the script's own location, not `cwd`.

`node_modules/flowkit` in a scaffolded test project is a **symlink straight back to this repo** (for a `file:` dependency) — meaning you can add temporary `console.log` debug probes directly into real `src/` files, reload, and inspect them via Playwright's console capture, then revert. This is how the `db.user.name` prop-threading bug (section 7) was actually traced — a debug probe in `DashboardContext.tsx` confirmed the data layer was correct, ruling that out, before probing `FlowMaster.tsx` and finally `PreviewCanvas.tsx` to find the actual gap.

Always clean up afterward: `rm -rf test/demo`, kill the background vite process, remove any temporary debug `console.log`s, and check `git status` before considering a change done — scratch scaffolding can leave stray files inside the real repo if you forget to `cd` into `test/` first (this happened once this session; `test/` is now gitignored specifically because of it).

---

## 9. `package.json`'s `files[]` — now the only "what ships" mechanism

This repo used to maintain **two** independent lists controlling "what doesn't ship": `package.json`'s `files[]` (filtering what npm itself packs) and `scripts/deploy/manifest.js`'s `STRIP_DIRS`/`STRIP_FILES` (stripped from a separate `deployment` git branch via `sync:deployment`, for git-dependency installs). `scripts/deploy/` — and the whole deployment-branch mechanism, including `manifest-consistency.test.js`, the test that kept the two lists in sync — was removed once the repo committed to npm publish as the sole distribution path. There is no `deployment` branch to maintain and no second list to reconcile.

`package.json`'s `files[]` is now the single source of truth for what ships, for every install path (`npm publish`, `file:`, or git dep). Verify what actually ships with `npm pack --dry-run --json` — reading the `files[]` field alone doesn't tell you what a broad positive pattern like `"scripts/"` actually pulls in; that's still true today, it just isn't cross-checked by an automated test anymore. If a new dev-only script is added anywhere under `scripts/`, `src/`, `packages/`, or `docs/`, nothing will fail loudly if you forget to add a `!`-negation for it — that's a manual discipline now, not an enforced one.

---

## 10. What's committed, what isn't, what's left

Everything described above is committed on `flowkit/Package` (not merged into `r/deployBuild` — holding until full testing per explicit instruction). Remaining, in the order they'll probably matter:

1. `npm run build` (the main platform/app build, not `build:lib`) currently fails at the `tsc -b` step — `Could not find a declaration file for module './scripts/helpers/vite-plugin.js'` (and now also `./scripts/helpers/flowlens-session.js`; paths updated after the `scripts/` restructure moved both files under `scripts/helpers/`). Confirmed pre-existing via `git stash` — not caused by any of the fixes below, but still unresolved. `build:lib` (the actual publishable package build) works and was verified.
2. Move Radix UI packages to `peerDependencies` + `devDependencies` (React already is; Radix still isn't) — see section 3's `"exports"`/`"files"` discussion for why this matters for a real consumer install.
3. ~~Change `FLOWKIT_GIT_DEP`...~~ **Done this session** — see section 6.1. Default is now the real `FLOWKIT_PUBLISHED_RANGE` semver spec; local testing against an unpublished checkout is the explicit, guarded `--local-dev` opt-in. This also fixed a second bug it surfaced: `isRepoMode()` misdetected flat mode as repo mode under a symlinked `file:` dependency (see section 2) — fixed via the `.flowkit-repo-root` marker file.
4. Decide `npm publish` timing for `flowkit` and `create-flowkit-app` — both names are confirmed unclaimed on the registry as of this session (`npm view flowkit` / `npm view create-flowkit-app` both 404, re-confirmed in the follow-up session that fixed item 3).
5. ~~`esbuild` runtime dependency missing~~ **Found and fixed this session, only by running the full flow end-to-end** — not visible from reading code alone. `scripts/helpers/vite-plugin.js` does `import esbuild from 'esbuild'` at module load, but `esbuild` was in `devDependencies`, which npm does not install for consumers of a package. Every flat-mode `npm run dev` failed with `ERR_MODULE_NOT_FOUND: Cannot find package 'esbuild'` until this was moved to `dependencies`. Caught while verifying the item-3 fix: the scaffold, the dependency resolution, and `isRepoMode()` all passed their own checks, then the actual `vite` dev server still wouldn't boot — a reminder that "the pieces I can unit-test are correct" isn't the same bar as "the thing actually runs."
