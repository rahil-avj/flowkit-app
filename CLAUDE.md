# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FlowKit — Project Reference

Browser-based UI prototyping platform (React 19 + Vite 8 + Tailwind v4) for multi-screen, flow-based interactive previews with session recording and analytics replay.

---

## Folder Structure

```
.
├── scripts/                  CLI entry point + domain modules (Node ESM)
│   ├── flowkit.js            bin entry — dispatches all CLI subcommands
│   ├── install.js            post-install setup (shell env, global config)
│   ├── lib/                  shared utilities (config, registry, sessions, args, colors, dates, fs-copy, json, paths, prompt, scaffold, strings, workspace-resolve)
│   ├── cli/
│   │   ├── router.js         CLI dispatcher — single dispatch table for all subcommands
│   │   ├── workspace.js      nw/rw commands; scaffold rollback on failure
│   │   ├── plans.js          plan:check prebuild gate + plan CRUD
│   │   ├── sessions/         session subcommands split across crud/analytics/validate/sample
│   │   ├── export.js         export / export:full commands
│   │   ├── dump.js           dump command
│   │   ├── feedback.js       feedback commands
│   │   ├── handoff.js        handoff command
│   │   ├── status.js         status command
│   │   └── help.js           help command
│   ├── build/
│   │   ├── inline.js         standalone HTML post-processor (used by build:standalone)
│   │   ├── format.mjs        output formatter
│   │   └── kit-check.js      pre-build kit validation
│   ├── deploy/
│   │   ├── release.js        checkpoint + release commands
│   │   ├── sync.js           sync:deployment — strips dev files, pushes deployment branch
│   │   ├── manifest.js       STRIP_DIRS/LOCK_DIRS — single source of truth for what gets removed
│   │   └── lock.js           filesystem locking for deployment branch switches
│   ├── flows/
│   │   └── promote.mjs       extract a flowplan fork into its own standalone flowplan
│   └── agent/
│       ├── render.js         agent:sync; generates CLAUDE.md / AGENTS.md / .cursor rules
│       └── spec.js           agent spec context definitions
├── src/
│   ├── App.tsx               Provider hierarchy + mode switch (interactive ↔ FlowLens)
│   ├── main.tsx              Vite entry
│   ├── workspaces.json       Active workspace registry (runtime read by Vite plugin)
│   ├── workspaces.ts         Runtime workspace loader + localStorage helpers
│   ├── index.css             Tailwind v4 @theme tokens + global styles
│   ├── theme.ts              UIScale constants (space, radius, minTap) injected by ThemeContext
│   ├── types/index.ts        All domain interfaces (WireframeView, FlowNode, FlowplanDef, etc.)
│   ├── core/
│   │   ├── canvas/
│   │   │   ├── PreviewCanvas.tsx   ⚠️ 1158 LOC — main interactive canvas; pan/zoom/mode switch
│   │   │   ├── CanvasView.tsx      Multi-screen grid (Figma export mode)
│   │   │   ├── canvasConfig.ts     CANVAS_W/H, ZOOM_MIN/MAX, panel width defaults
│   │   │   └── canvasReducer.ts    Canvas pan/zoom/mode state reducer; unit-tested
│   │   ├── layout/
│   │   │   ├── FlowEngine.ts       ⚠️ 716 LOC — useFlowEngine() interaction state machine
│   │   │   ├── FlowMaster.tsx      Single-flow renderer; swipe + hotspot + off-script toasts
│   │   │   ├── KitSideExplorer.tsx Left sidebar — screen/flow tree
│   │   │   ├── KitSideInspector.tsx Right sidebar — Simulator/Debug/Sessions/Feedback tabs
│   │   │   ├── inspectorTabs.ts    Tab metadata + visibility guards
│   │   │   ├── hooks/
│   │   │   │   ├── usePanelLayout.ts  Resize state machine; reads/writes localStorage
│   │   │   │   └── usePanelDrag.ts    Single-side drag handle primitive
│   │   │   └── index.ts            Public barrel
│   │   ├── config/defineConfig.ts  defineConfig() + defineFlow() identity helpers for workspace authors
│   │   └── shortcuts/              Global keyboard shortcuts (Cmd+Alt+Shift+P canvas toggle); useKeyboardShortcuts.ts is unit-tested
│   ├── features/
│   │   ├── command-palette/        Global quick-action overlay (PaletteItem, PaletteGroup)
│   │   ├── feedback/
│   │   │   └── context/FeedbackContext.tsx  🔴 JSONBIN_CONFIG master key bundled client-side
│   │   ├── figma-export/           Figma handoff sidebar
│   │   ├── flow-debugger/
│   │   │   └── DbInspector.tsx     Live DB view/edit
│   │   ├── flow-library/
│   │   │   └── compileFlowplan.ts  Pure compiler: FlowplanDef → FlowConfig + CompiledStep[]
│   │   ├── flowTracer/
│   │   │   ├── sessionDb.ts        ⚠️ IndexedDB schema; getSnapshots() does full-store scan
│   │   │   └── context/index.tsx   SessionRecorderProvider; writes must go via WriteBatcher
│   │   ├── go-to-overlay/          Quick-jump dialog (flows/screens/flowplans)
│   │   ├── manage/                 Workspace management UI
│   │   ├── script-patch/           Copy-to-clipboard code patch generation
│   │   └── simulator/
│   │       ├── accessibility/      CVD filter picker
│   │       ├── devices/            Device settings panel
│   │       └── controls/           Simulator primitive components (see inventory below)
│   ├── shared/
│   │   ├── constants/
│   │   │   ├── storageKeys.ts      All localStorage key constants (LS_LEFT_PANEL_W, etc.)
│   │   │   └── zIndex.ts           Z object: dropdown/overlay/tooltip=99999, modal=100000
│   │   ├── contexts/               All React contexts + barrel index.ts
│   │   ├── components/
│   │   │   ├── ui/                 35+ shared components (Button, Modal, Badge, etc.)
│   │   │   ├── devices/            Device mockup shells (phone/tablet/desktop/wearable)
│   │   │   └── overlays/           ActionCenter, HelpModal, Settings
│   │   └── utils/
│   │       ├── applyDotPathPatch.ts  ⚠️ Prototype pollution footgun — no __proto__ guard
│   │       └── useWorkspaceHierarchy.ts  Loads projects/**/flowplans/ hierarchy tree
│   ├── modes/flowlens/             Optional analytics/replay mode (lazy chunk)
│   └── kits/shared/               Radix UI primitives (shadcn-style); barrel: shared/index.ts
└── workspaces/
    └── <name>/
        ├── flowkit.config.ts       defineConfig({ workspace, flows, screenOrder })
        ├── index.ts                Workspace barrel (optional shared exports)
        ├── flowplans/<name>.ts     defineFlow({ id, name, steps }) — playback scripts
        ├── flows/<flow>/<screen>/  Screen components (PascalCase.tsx + screenMeta)
        └── lib/
            ├── data/db.ts          Mock database initial state
            └── components/         Workspace-specific shared components
```

---

## simulator/controls/ Inventory

Barrel at `src/features/simulator/controls/index.ts`. Use these inside the Simulator inspector tab — do not recreate them.

| Component          | Purpose                              |
| ------------------ | ------------------------------------ |
| `ControlAccordion` | Collapsible section wrapper          |
| `SimControl`       | Labelled row wrapper for any control |
| `SimToggle`        | Boolean on/off switch                |
| `SimTextInput`     | Text input with label                |
| `SimNumberInput`   | Numeric input with label             |
| `SimSelect`        | Dropdown select                      |
| `SimSegmented`     | Segmented button group               |
| `SimAction`        | Trigger button                       |

> `SimArrayEditor` and `SimObjectEditor` exist as files but are **not exported** from the barrel.

---

## Context Provider Table

| Context                  | Hook(s)                                             | Provides                                                                                                                                                                              |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DashboardContext`       | `useDashboard()`                                    | orientation, navigateTo/goBack/goHome/resetToFirst, activeVariantByView, setVariantForView, simulatorEnabled, connectionMode, networkSpeed, colorBlindMode, blurryVision, firstViewId |
| `NavigationContext`      | `useNavigation()`                                   | activeViewId, firstViewId, canGoBack, navigateTo, goBack, goHome, resetToFirst, orientation, toggleOrientation, setVariantForView                                                     |
| `SimulatorContext`       | `useSimulator()`                                    | devicePreset, connectionMode, networkSpeed, colorBlindMode, blurryVision, simulatorEnabled, flowAutoPlay\* settings                                                                   |
| `ThemeContext`           | `useTheme()`                                        | `theme` (Theme), `scale` (UIScale), `mode` ('light'\|'dark'), `setMode`                                                                                                               |
| `FlowPlaybackContext`    | `useFlowPlayback()` / `useFlowPlaybackOptional()`   | activeFlowplan, currentStepIndex, currentStep, isGating, canPlay, enter/exit/restart/applyStep                                                                                        |
| `FlowNavContext`         | hook in `utils/useFlowNav.ts` consumes `FlowNavCtx` | navigateTo, goNext, goBack, isFlow, flowState                                                                                                                                         |
| `FlowLensModeContext`    | `useFlowLensMode()` / `useFlowLensModeOptional()`   | FlowLens toggle, FLOWLENS_AVAILABLE flag, accent constants                                                                                                                            |
| `DevModeContext`         | `useDevMode()`                                      | devMode, toggleDevMode, pendingEdits, setEdit, clearEdits                                                                                                                             |
| `ActiveWorkspaceContext` | `useActiveWorkspace()`                              | active workspace name (string)                                                                                                                                                        |
| `FeedbackContext`        | `useFeedback()`                                     | comment wall state, cloud sync, IndexedDB image store                                                                                                                                 |

> Optional hooks return `null` outside provider. Non-optional hooks throw.

---

## Design System

### Theme Token Architecture

Two tiers — never skip a tier.

**Tier 1 — Runtime vars** (injected onto `document.documentElement` by `ThemeContext`):
`--theme-bg-base/surface/elevated/hover/border/border-subtle`, `--theme-text-primary/secondary/muted/disabled`, `--theme-accent-blue/green/red/amber/purple` (+ `-dim` variants), `--theme-shadow-card/float`

**Tier 2 — Tailwind aliases** (declared in `src/index.css @theme`, bridge tier-1 into utility classes):
`bg-theme-base`, `bg-theme-surface`, `bg-theme-elevated`, `bg-theme-hover`, `border-theme-border`, `border-theme-border-subtle`, `text-theme-text-primary/secondary/muted/disabled`, `text-theme-blue/green/red/amber/purple`, `bg-theme-blue-dim` etc., `shadow-theme-card`, `shadow-theme-float`

Always use Tailwind class form. When a raw CSS var is unavoidable (SVG fill, `color-mix()`), use `var(--color-theme-*)` — never `var(--theme-*)` directly.

### Static Color Scale

| Token                      | Value               | Use                       |
| -------------------------- | ------------------- | ------------------------- |
| `neutral-50`–`neutral-950` | `#fafafa`–`#09090b` | Gray ramp                 |
| `neutral-850`              | `#1e1e21`           | Extra dark step           |
| `primary-50`–`primary-900` | `#eff6ff`–`#1e3a8a` | Blue brand ramp           |
| `warning-400/500/600`      | orange range        | Warning states            |
| `success-400/500/600`      | green range         | Success states            |
| `g4`                       | `#6d758f`           | Muted body text / icons   |
| `g5`                       | `#b4b9c9`           | Icon placeholder fill     |
| `g6`                       | `#e1e4ed`           | Borders / dividers        |
| `g7`                       | `#f1f3f7`           | Surface / card background |
| `g8`                       | `#f8faff`           | Page background           |

Static scale is for illustrations and non-theme-sensitive graphics only. Use `theme-*` classes for all UI surfaces.

### Typography

Use `text-ui-*` for all app UI. `text-h1`–`text-h4` for in-prototype content screens only.

| Token         | Size | Use                                |
| ------------- | ---- | ---------------------------------- |
| `text-ui-2xs` | 11px | Timestamps, badge labels, metadata |
| `text-ui-xs`  | 12px | Secondary labels, captions         |
| `text-ui-sm`  | 13px | Primary body, buttons, inputs      |
| `text-ui-md`  | 14px | Section headers, tab labels        |
| `text-ui-lg`  | 15px | Panel titles, card headings        |
| `text-ui-xl`  | 17px | Modal titles, page headings        |

Section labels: `text-ui-2xs font-bold uppercase tracking-[0.04em]`

### Shadows

| Token                           | Use                                 |
| ------------------------------- | ----------------------------------- |
| `shadow-theme-card`             | Cards, inline panels                |
| `shadow-theme-float`            | Dropdowns, popovers, floating menus |
| `shadow-[var(--shadow-device)]` | Device mockup frame only            |

### Border Radius

| Value            | Use                                    |
| ---------------- | -------------------------------------- |
| `rounded-[6px]`  | Buttons, inputs, chips, icon buttons   |
| `rounded-[10px]` | Cards, dropdowns, overlays             |
| `rounded-[12px]` | Panels, large containers               |
| `rounded-full`   | Dots, circular badges, scrollbar thumb |

### Z-Index (`src/shared/constants/zIndex.ts` → `Z`)

| Key                                      | Value    | Use                       |
| ---------------------------------------- | -------- | ------------------------- |
| `Z.dropdown` / `Z.overlay` / `Z.tooltip` | `99999`  | Menus, popovers, tooltips |
| `Z.modal`                                | `100000` | Modal backdrops           |

### Spacing Anchors

| Context            | Value           |
| ------------------ | --------------- |
| Icon + label gap   | `gap-1` (4px)   |
| List item row gap  | `gap-1.5` (6px) |
| Card padding       | `p-3` (12px)    |
| Modal body padding | `p-4` (16px)    |
| Button sm          | `px-2 py-1`     |
| Button md          | `px-3 py-[6px]` |
| Badge / chip       | `px-1.5 py-0.5` |

### Transitions

| Tier | Duration | Use                         |
| ---- | -------- | --------------------------- |
| fast | `120ms`  | Hover fills, focus rings    |
| base | `150ms`  | Toggles, expand/collapse    |
| slow | `200ms`  | Panel entrance/exit, modals |

`ANIM_DURATION = 280ms` in `FlowEngine.ts` is for screen transitions only — do not replicate in UI components.

---

## Initial Setup

```bash
npm install
npm link   # registers the `flowkit` bin globally; required before any CLI commands
npm run dev
```

---

## Critical Commands

**Dev**

- `npm run dev` — Vite dev server at http://localhost:5173
- `npm run preview` — preview production build locally

**Build**

- `npm run build` — tsc + vite build (runs `plan:check` prebuild gate automatically)
- `npm run build:standalone` — single-file HTML via `vite.config.standalone.ts` (requires `FLOWKIT_WORKSPACE` env var) + `inline.js` post-process
- `npm run build:lib` — builds the publishable `flowkit` npm package (`tsc -p tsconfig.build.json && vite build --config vite.lib.config.ts`) — see Package/Publish Mode below
- `VITE_ENABLE_FLOWLENS=true npm run build` — includes FlowLens analytics chunk

**Test**

- `npm test` — vitest run (⚠️ covers `scripts/tests/` only — `src/` logic untested)
- `npm run test:watch` — vitest watch
- `npm run test:coverage` — vitest with v8 coverage report
- `npm run test:workspace` — Node test runner, 4 CLI integration test files (always runs all 4, concurrency 1)
- `node --test scripts/tests/<file>.test.js` — run a single CLI integration test file directly
- `npx vitest run <pattern>` — single file/pattern

**Lint / Format**

- `npm run lint` / `npm run lint:fix`
- `npm run format` / `npm run format:check`
- `npm run setup-hooks` — installs Husky git hooks (`husky`)

**CLI (flowkit)**

- `flowkit nw <name>` — scaffold new workspace ✅ (rollback on failure)
- `flowkit rw <name>` — remove workspace
- `flowkit status` — health snapshot: flows, sessions, feedback, agent
- `flowkit watch` — watch workspace for file changes (help shows `watch:flows`; dispatcher matches `watch`)
- `flowkit export` — standalone HTML viewer (no FlowLens)
- `flowkit export:full` — standalone HTML viewer + FlowLens included
- `flowkit handoff` — developer handoff zip
- `flowkit dump [--sessions] [--feedback] [--report] [--dest <dir>]` — export all workspace data
- `flowkit sessions:ls/import/export/check/stats/sample/rm/brief/purge` — session management
- `flowkit lens:report` — export FlowLens analytics JSON
- `flowkit plan:ls/check` — flowplan discovery and validation (short alias `fp:*`)
- `flowkit project:ls` — list projects (short alias `pj:ls`)
- `flowkit feedback:ls/import/dump` — feedback management
- `flowkit agent:sync/check` — agent spec sync
- `flowkit checkpoint` — tag a pre-release checkpoint
- `flowkit release` — cut a release (wraps checkpoint + git tagging)
- `flowkit sync:deployment` — strip dev files and sync to the deployment branch
- `flowkit kit:check` — pre-build kit validation (`scripts/build/kit-check.js`)
- `flowkit create/remove/list/rename/move/add/screen/flowplan/components` — lower-level scaffolding sub-verbs used internally by `nw`/other commands (router.js) — prefer the higher-level commands above unless you need fine-grained control

---

## Environment Flags

Set in `.env.local` (not committed).

| Flag                             | Effect                                             |
| -------------------------------- | -------------------------------------------------- |
| `VITE_ENABLE_FLOWLENS=true`      | Includes FlowLens analytics chunk in build and dev |
| `VITE_ENABLE_FLOWKIT_WATCH=true` | Starts the file-watcher plugin in dev              |

---

## Canvas Keyboard Shortcuts

| Shortcut              | Action                       |
| --------------------- | ---------------------------- |
| `F4`                  | Enter flowplan playback mode |
| `F5`                  | Restart flowplan             |
| `Cmd +` / `Cmd -`     | Zoom in / out                |
| `Cmd 0`               | Reset to 100% zoom           |
| `Cmd Shift 0`         | Fit device to screen         |
| `←` / `→`             | Navigate screens             |
| `Shift ←` / `Shift →` | Navigate flows               |
| `Shift 1–4`           | Switch right panel tabs      |
| `Shift S`             | Toggle Screens ↔ Flow Map    |
| `Shift G`             | Go-To overlay                |
| `Cmd /`               | Action Center                |

---

## Architecture Patterns

- **State**: React Context only — no Redux/Zustand. Each context exports a typed `use<Name>()` hook that throws outside provider; optional variants return `null`.
- **HMR safety**: All contexts guard identity with `import.meta.hot.data.<ContextName>` pattern.
- **Styling**: Tailwind v4 in `src/index.css` (`@theme` block); no `tailwind.config.js`. Always use `bg-theme-*` / `text-theme-*` classes. Only reach for `style={{}}` when Tailwind cannot (runtime-computed colors, `color-mix()`).
- **Component variants**: CVA (`class-variance-authority`) in `src/kits/`; merge via `cn()` from `@kit/lib/utils`.
- **Layer order** (ESLint `boundaries` enforced): `shared → core → features → modes → App`
- **Workspace active state**: `src/workspaces.json` is the runtime source of truth; Vite plugin reconciles on dev start. Keep in sync via CLI, not manual edits.
- **Flowplan compile**: `FlowplanDef` → `compileFlowplan.ts` → runtime `FlowConfig`. Never mutate runtime from authoring format directly.
- **Session writes**: must go through `WriteBatcher` in `sessionDb.ts` — never write to IndexedDB directly.
- **Barrel rule**: import from `@features/<name>` barrel only; never reach past `index.ts` into feature internals.
- **Workspace screens**: should only import from `@platform/core/layout/FlowMaster` and standard React. The platform injects everything else (db, navigation, simulator) via `FlowScreenProps`.
- **`import.meta.glob` patterns**: must be string literals — Vite resolves at build time, no dynamic variables.
- **One `SessionRecorderProvider`**: multiple providers create duplicate IndexedDB connections.
- **FlowLens is always lazy**: import `@flowlens` only from inside `modes/` to keep the base bundle lean.
- **New feature structure**: every feature needs an `index.ts` barrel (public API) and a `panel.tsx` root component. Add `export * from './<name>/index'` to `src/features/index.ts`. Shared state between features belongs in `@shared/contexts`.
- **New mode structure**: export a single default component from `src/modes/<name>/index.ts`, lazy-import from `PreviewCanvas` behind a `VITE_ENABLE_*` env flag.
- **Workspace reconciliation**: `reconcileWorkspacesPlugin()` in `vite.config.ts` auto-syncs `src/workspaces.json` with disk on every dev start — removes stale entries and orphaned FlowLens folders. Manual edits to `src/workspaces.json` will be overwritten; use the CLI or browser UI.
- **Agent spec system**: `scripts/agent/spec.js` + `render.js` generate `CLAUDE.md`, `Documentation/AGENTS.md`, and `.cursor/rules/flowkit.mdc` from a single spec. Run `flowkit agent:sync` to regenerate all three. See [Documentation/AGENTS.md](Documentation/AGENTS.md).

---

## Package / Publish Mode

> The dual-mode **source code** (`isRepoMode()`, `assertScopedWorkspaceDir()`, lib build `exports`/`files`, `packages/create-flowkit-app/`) is present on `main`. **No consumer-facing install path is live as of 2026-07-01**: `create-flowkit-app` has never been published to npm (`npm create flowkit-app@latest` 404s), and `origin` (`rahil-avj/flowkit-app`) has no `deployment` branch — only `main` exists remotely, so a git dependency has nothing valid to point at either. Don't tell a user to run `npm create flowkit-app@latest` or add a `github:...#deployment` git dependency until one of these is actually published/pushed.

FlowKit ships two ways from one repo — every path in `scripts/lib/` and `scripts/cli/` must work under both:

- **Repo mode** (this checkout) — `workspaces/<name>/` holds author content; multiple workspaces coexist, switched via browser UI.
- **Flat/author mode** — `npm create flowkit-app@latest` installs `flowkit` into `node_modules/`; there is no `workspaces/` dir, just one implicit workspace at the project root. (Not yet live — see note above.)

- **Mode detection**: `scripts/lib/paths.js` → `isRepoMode()` checks for a `.flowkit-repo-root` marker file at `ROOT` (computed from `paths.js`'s own file location, not `cwd()`) — deliberately excluded from `package.json`'s `files[]` allowlist so it never ships to any real install. Earlier detection heuristics (workspace-dir contents, then `node_modules`-in-path) both caused real incidents — see `Documentation/PACKAGE-ARCHITECTURE.md` section 2 for the history. `assertScopedWorkspaceDir()` is the defense-in-depth backstop before any recursive workspace delete — call it in any new code path that deletes a workspace-scoped directory.
- **`package.json` `"files"` is an allowlist**: only listed paths ship via `npm pack`/`publish`/git-dep. Verify what actually ships with `npm pack --dry-run --json` — glob entries like `"scripts/"` pull in more than expected, hence the `!scripts/tests/` etc. negations.
- **Public API surface** (`src/core/config/index.ts` and anything it re-exports) must use **relative imports only** for its own types — never `@platform/*`/`@shared/*`/etc. path aliases. TS declaration emit writes path-mapped specifiers as-is into `.d.ts`, which a consumer's TypeScript can't resolve. Check after any `build:lib` change: `grep -rn "from '@\(platform\|shared\|core\|features\|kit\|workspace\|flowlens\)" dist/types/` should return nothing.
- **`scripts/vite-plugin.js`** (exported as `flowkit/vite`) is what makes flat mode work at dev-server time — it generates virtual modules (`virtual:flowkit/config|screens|flowplans|workspace`) that replace `import.meta.glob` patterns hardcoding `workspaces/<name>/...`, reconstructing the same data from `flowkit.config.ts` + filesystem globs from `cwd()` instead.
- See [Documentation/PACKAGE-ARCHITECTURE.md](Documentation/PACKAGE-ARCHITECTURE.md) for the full technical mechanism, [Documentation/PACKAGE-AUTHOR-GUIDE.md](Documentation/PACKAGE-AUTHOR-GUIDE.md) for the consumer-facing guide, and [Documentation/project-plans/VISION.md](Documentation/project-plans/VISION.md) / [FEATURES.md](Documentation/project-plans/FEATURES.md) for the distribution-model rationale and current status.

---

## Known Gotchas

- **`sessionDb.ts` `getSnapshots()`** — full IndexedDB store scan; degrades with large session counts ⚠️
- **`FeedbackContext.tsx`** — `JSONBIN_CONFIG` master key is bundled into the client build 🔴
- **`applyDotPathPatch.ts`** — dot-path setter has no `__proto__` guard; prototype pollution possible on untrusted input ⚠️
- **vitest scope** — `vitest.config.ts` only includes `scripts/tests/**/*.test.ts` (4 files as of this writing: `applyDotPathPatch`, `canvasReducer`, `compileFlowplan`, `useKeyboardShortcuts`), but those files import and test `src/` modules directly — despite the directory name, this is where `src/` unit coverage lives. Coverage thresholds (91/86/95/93 stmts/branches/funcs/lines) apply only to what those 4 files exercise; most `src/` logic (UI components, contexts, most of `core/`) has no coverage ⚠️
- **playwright** — installed as devDependency, no tests exist; ignore 🔴
- **`prebuild` gate** — `npm run build` always runs `flowkit plan:check`; exits non-zero on blocking plan issues
- **`@workspace` alias** — resolves to the active workspace at build/dev start; switching workspace requires dev server restart

---

## Common Tasks

**Create a new workspace**

```bash
flowkit nw <name>   # scaffolds workspaces/<name>/ with flows/, flowplans/, lib/
```

Switch active workspace from the browser UI.

**Add a screen to a flow**

1. Create `workspaces/<ws>/flows/<flow>/<screen-id>/`
2. Add `<ScreenName>.tsx` — default export + optional `export const screenMeta`
3. Register screen id in `flowkit.config.ts` → `screenOrder.<flow>[]`

**Add a flowplan step**

1. Open `workspaces/<ws>/flowplans/<flow>.ts`
2. Add `{ screenId, on, actionNote }` to `steps[]` in `defineFlow({...})`

**Write a workspace screen**

Screens receive props automatically — no context imports needed:

```tsx
import type { FlowScreenProps } from '@platform/types'

export default function WelcomeScreen({ onNext, db }: FlowScreenProps) {
  return <button onClick={onNext}>Hello {db?.user?.name}</button>
}

// eslint-disable-next-line react-refresh/only-export-components
export const screenMeta = { id: 'welcome', label: 'Welcome' }
```

**Add a simulator control to the inspector**

1. Use primitives from `@features/simulator/controls` (`SimToggle`, `SimSelect`, etc.)
2. Wrap in `SimControl` for label alignment, `ControlAccordion` for grouping
3. Wire state into `SimulatorContext` if it needs to persist across tab switches

**Add a feature panel tab**

1. Create `src/features/<name>/` with component + `index.ts` barrel
2. Add tab entry to `src/core/layout/inspectorTabs.ts`
3. Wire into `KitSideInspector.tsx`; import only via `@features/<name>`

---

## Path Aliases

| Alias        | Resolves to            | Notes                                                           |
| ------------ | ---------------------- | --------------------------------------------------------------- |
| `@shared`    | `src/shared/`          | bare + `/*` in tsconfig                                         |
| `@core`      | `src/core/`            | bare + `/*` in tsconfig                                         |
| `@features`  | `src/features/`        | bare + `/*` in tsconfig                                         |
| `@flowlens`  | `src/modes/flowlens/`  | bare + `/*` in tsconfig                                         |
| `@kit`       | `src/kits/shared/`     | `/*` only in tsconfig; always used as `@kit/<path>`             |
| `@platform`  | `src/`                 | prefer scoped aliases above                                     |
| `@workspace` | `workspaces/<active>/` | falls back to `src/workspace-stub/` when no workspace is active |

> `vite.config.ts` also declares a bare `flowkit` alias → `src/core/config/index.ts`, used only for internal self-reference (mirrors the published package name); not for general app code.

All 7 aliases are declared in `vite.config.ts` and mirrored in `tsconfig.app.json`. `vitest.config.ts` mirrors all except `@workspace` (not needed for CLI tests).

---

## Key Dependencies

| Package                                  | Purpose                                               |
| ---------------------------------------- | ----------------------------------------------------- |
| `react@19` / `react-dom@19`              | UI runtime                                            |
| `vite@8` + `@vitejs/plugin-react`        | Dev server + build                                    |
| `tailwindcss@4` + `@tailwindcss/postcss` | Utility CSS (CSS-only config)                         |
| `@radix-ui/*`                            | Headless primitives (accordion, dialog, select, etc.) |
| `class-variance-authority`               | Component variant system                              |
| `clsx` + `tailwind-merge` → `cn()`       | Class merging utility                                 |
| `lucide-react`                           | Icon library                                          |
| `vite-plugin-singlefile`                 | Standalone HTML export                                |
| `eslint-plugin-boundaries`               | Layer import enforcement                              |
| `playwright`                             | Installed, no tests — ignore                          |

---

## Documentation

Two directories with different audiences — `docs/` ships to clients (survives `sync:deployment`); `Documentation/` is dev-only (stripped on deployment sync).

**`docs/`** — client-deliverable:

- [docs/CLI.md](docs/CLI.md) — Full CLI command reference
- [docs/FLOWKIT.md](docs/FLOWKIT.md) — Platform architecture
- [docs/FLOWLENS.md](docs/FLOWLENS.md) — FlowLens analytics reference
- [docs/FLOWMASTER.md](docs/FLOWMASTER.md) — Flow engine reference
- [docs/AGENTS.md](docs/AGENTS.md) — AI agent spec; source of truth for `flowkit agent:sync` output

**`Documentation/`** — dev-only:

- [Documentation/DevelopmentValues.md](Documentation/DevelopmentValues.md) — Engineering philosophy
- [Documentation/FlowKit-Features-List.md](Documentation/FlowKit-Features-List.md) — Feature inventory and status
