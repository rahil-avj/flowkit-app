# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FlowKit — Project Reference

Browser-based UI prototyping platform (React 19 + Vite 8 + Tailwind v4) for multi-screen, flow-based interactive previews with session recording and analytics replay.

---

## Folder Structure

```
.
├── scripts/                  CLI entry point + domain modules (Node ESM), organized by nature not domain
│   ├── flowkit.js            npm bin entry — bootstraps platform/router.js
│   ├── authoring/            CRUD commands on workspace CONTENT (flows/screens/flowplans/components)
│   │   ├── flows.js          create:flow / remove:flow / list:flows
│   │   ├── screens.js        create:screen / remove:screen / rename:screen / move:screen / list:screens / screen:info
│   │   ├── flowplans.js      create:flowplan / remove:flowplan / add:step / remove:step / list:steps / flowplan:info
│   │   ├── components.js     create:component / remove:component / components:find/ls/scan / add:export / list:exports
│   │   └── promote-flow.js   promote:flow — extracts a flowplan fork into its own standalone flowplan
│   ├── authoring-support/    domain-specific mutation logic used only by authoring/ commands (never dispatched itself)
│   │   ├── config-patch.js   surgical read/modify/write helpers for workspace.ts (flowExists, screenExists, listScreens, addFlow, etc.)
│   │   └── agent-state.js    .flowkit/ per-workspace state files (component registry)
│   ├── checks/                self-contained `flowkit check`/`check:<domain>` feature — rules + reporter + dispatcher, all in one directory
│   │   ├── index.js          dispatchCheck() — CLI-facing entry point, imported directly by flowkit.js
│   │   ├── reporter.js       createReport()/printReport()/printReportJson() — shared Finding shape + output formatting
│   │   ├── ts-parse.js       AST-walk helpers (@typescript-eslint/parser) shared by screens.js/db.js
│   │   ├── screens.js        check:screens — default export shape, screenMeta presence/shape, id/directory match
│   │   ├── config.js         check:config — workspace.ts flows[]/screenOrder vs. flows/ on disk; also the shared esbuild-based TS module reader flowplans.js reuses
│   │   ├── components.js     check:components — .flowkit/components.json registry vs. disk, barrel export consistency
│   │   ├── db.js             check:db — lib/data/db.ts|js has at least one export
│   │   └── flowplans.js      check:flowplans — parseable, id/filename match, non-empty steps[], step screenIds exist, step guidance; wired into npm run prebuild
│   ├── platform/             commands about the CLI/tool's own lifecycle and built-in subsystems
│   │   ├── router.js         CLI dispatcher — single dispatch table for all subcommands
│   │   ├── workspace.js      nw/rw/watch commands; scaffold rollback on failure — repo mode only
│   │   ├── workspace-flat.js convert:multi/convert:flat + create/remove/rename:workspace — flat/multi consumer mode only
│   │   ├── plans.js          plan:ls (read-only discovery) / project:ls — flowplan validation lives in checks/
│   │   ├── feedback.js       feedback:import/dump/ls
│   │   ├── sessions/         sessions:* + lens:report + sessions:study:* — split across crud/analytics/validate/sample/study
│   │   ├── agent-sync.js     agent:sync — generates CLAUDE.md / AGENTS.md / .cursor rules
│   │   ├── agent-spec.js     single-source-of-truth spec data rendered by agent-sync.js
│   │   ├── status.js         status command
│   │   ├── help.js           help command
│   │   └── install.js        prints shell alias setup instructions; users paste manually (manual/agent-invoked)
│   ├── helpers/               domain-agnostic support machinery, never a direct CLI command
│   │   ├── paths.js          root/mode resolution, workspace path safety, repo/flat/multi-workspace-mode-aware resolution
│   │   ├── flowkit-manifest.js  reads/writes consumer package.json's flowkit.mode/flowkit.workspaces (object keyed by name, `{ path }`)
│   │   ├── config-filenames.js  WORKSPACE_CONFIG_FILENAME ('workspace.ts') / PROJECT_CONFIG_FILENAME ('flowkit.json') constants
│   │   ├── registry.js       workspace registry read/write/sync — repo mode only
│   │   ├── args.js           CLI flag parsing
│   │   ├── colors.js         terminal ANSI formatting
│   │   ├── dates.js          date formatting
│   │   ├── fs-copy.js        recursive directory copy
│   │   ├── json.js           safe JSON file read/write
│   │   ├── prompt.js         interactive CLI prompts
│   │   ├── scaffold.js       new-workspace scaffold content generator — repo mode only
│   │   ├── workspace-template.js  shared per-workspace content generator — flat/multi consumer mode + create-flowkit-app/create-flowkit-workspace scaffolders
│   │   ├── strings.js        casing/slug utilities
│   │   ├── workspace-resolve.js  resolves a workspace name from a CLI value or the active one
│   │   ├── flowlens-session.js  shared /__flowlens/save-session dev-server middleware
│   │   └── vite-plugin.js    flowkit/vite — virtual modules (config/screens/flowplans/workspace); workspaceRoot + standalone options
│   └── builders/             export/build/run pipelines
│       ├── export.js         export command — CLI prompting/arg-parsing only (workspace + profile guided flow)
│       ├── run-export.js     mode-agnostic standalone-build execution, called by export.js
│       ├── handoff.js        handoff command
│       ├── format.mjs        output formatter (npm run format)
│       └── inline.js         standalone HTML post-processor (used by build:standalone)
├── src/
│   ├── App.tsx               Provider hierarchy + mode switch (interactive ↔ FlowLens)
│   ├── main.tsx              Vite entry
│   ├── workspaces.json       Active workspace registry (runtime read by Vite plugin)
│   ├── workspaces.ts         Runtime workspace loader + localStorage helpers
│   ├── index.css             Tailwind v4 @theme tokens + global styles
│   ├── theme.ts              UIScale constants (space, radius, minTap) injected by ThemeContext
│   ├── types/index.ts        All domain interfaces (WireframeView, FlowNode, FlowplanDef, etc.)
│   ├── workspace-stub/       Fallback module for `@workspace` alias when no workspace is active
│   ├── core/
│   │   ├── canvas/
│   │   │   ├── PreviewCanvas.tsx   ⚠️ ~1280 LOC — main interactive canvas; pan/zoom/mode switch
│   │   │   ├── CanvasView.tsx      Multi-screen grid (Figma export mode)
│   │   │   ├── canvasConfig.ts     CANVAS_W/H, ZOOM_MIN/MAX, panel width defaults
│   │   │   └── canvasReducer.ts    Canvas pan/zoom/mode state reducer; unit-tested
│   │   ├── layout/
│   │   │   ├── FlowEngine.ts       ⚠️ ~820 LOC — useFlowEngine() interaction state machine
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
│   │   │   ├── context/FeedbackContext.tsx  Comment wall state, IndexedDB image store
│   │   │   └── cloud-sync/          Export/import to JSONBin; no master-key rejection — users are responsible for supplying a scoped Access Key
│   │   ├── figma-export/           Figma handoff sidebar
│   │   ├── flow-debugger/
│   │   │   └── DbInspector.tsx     Live DB view/edit
│   │   ├── flow-library/
│   │   │   └── compileFlowplan.ts  Pure compiler: FlowplanDef → FlowConfig + CompiledStep[]
│   │   ├── flowplan/
│   │   │   ├── FlowPlaybackContext.tsx      Flowplan playback state (see Context Provider Table)
│   │   │   └── FlowplanSettingsContext.tsx  Flowplan authoring/settings state
│   │   ├── flowTracer/
│   │   │   ├── sessionDb.ts        IndexedDB schema; snapshot/cursor queries use indexed ranges
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
│   │       ├── applyDotPathPatch.ts  ⚠️ Prototype pollution footgun — `setAtPath()` has no `__proto__`/`constructor` guard
│   │       └── useWorkspaceHierarchy.ts  Loads projects/**/flowplans/ hierarchy tree
│   ├── modes/flowlens/             Optional analytics/replay mode (lazy chunk)
│   └── kits/shared/               Radix UI primitives (shadcn-style); barrel: shared/index.ts
├── flowkit.json               Project-root export settings — exportProfiles/exportDefaults (plain JSON, all modes); optional, absent = built-in defaults
└── workspaces/
    └── <name>/
        ├── workspace.ts            defineConfig({ workspace, flows, screenOrder }) — renamed from flowkit.config.ts
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
| `FeedbackContext`        | `useFeedback()`                                     | comment wall state, cloud sync, IndexedDB image store (context lives in `@flowkit-features/feedback`, cloud sync logic in `@flowkit-features/feedback/cloud-sync`)                    |

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

- `npm run build` — tsc + vite build (runs `flowkit check:flowplans` prebuild gate automatically)
- `npm run build:standalone` — plain `tsc -b && vite build` (default `vite.config.ts`) + `inline.js` post-process; NOT the real standalone export path
- `flowkit export` — the actual standalone HTML export; a single guided flow in every mode (prompts for workspace only when 2+ exist, always prompts for an export profile unless `--profile:<name>` is given). Repo mode runs `npx vite build --config vite.config.standalone.ts` (requires `FLOWKIT_WORKSPACE` env var, uses `vite-plugin-singlefile`, outputs to `dist-standalone/` by default) via `scripts/builders/export.js` + `run-export.js`
- `npm run build:lib` — builds the publishable `flowkit` npm package (`tsc -p tsconfig.build.json && vite build --config vite.lib.config.ts`) — see Package/Publish Mode below
- `npm run docs:api` — regenerates `docs/api/` (TypeDoc HTML) from `src/core/config/index.ts`'s re-exports; run after changing any public type's shape or TSDoc comments. Zero warnings expected — a warning means a re-exported type references something not itself re-exported (add it to `core/config/index.ts`'s export list)

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

**CLI (flowkit)**

- `flowkit nw:<name>` — scaffold new workspace ✅ (rollback on failure) — **repo mode only**
- `flowkit rw:<name>` — remove workspace — **repo mode only**
- `flowkit status` — health snapshot: flows, sessions, feedback, agent
- `flowkit watch` — watch workspace for file changes (help shows `watch:flows`; dispatcher matches `watch`) — **repo mode only**
- `flowkit export [--workspace:<name>] [--profile:<name>]` — standalone HTML export, guided flow in every mode (repo, flat, multi-workspace). Ships the full codebase always — no FlowLens on/off distinction currently (feature-gating deferred). Reads named export profiles from `flowkit.json` if present
- `flowkit handoff` — developer handoff zip
- `flowkit sessions:ls/import/export/check/stats/sample/rm/brief/purge` — session management
- `flowkit lens:report` — export FlowLens analytics JSON
- `flowkit plan:ls` — flowplan discovery (short alias `fp:ls`); validation is `flowkit check:flowplans` (see below)
- `flowkit check` / `flowkit check:<domain>` — domain-specific linter for authored content (screens/config/components/db/flowplans); `--json` flag; `check:flowplans` is the prebuild gate; works in every mode
- `flowkit project:ls` — list projects (short alias `pj:ls`)
- `flowkit feedback:ls/import/dump` — feedback management
- `flowkit agent:sync` — agent spec sync
- `flowkit create/remove/list/rename/move/add/screen/flowplan/components/promote:flow` — lower-level scaffolding sub-verbs used internally by `nw`/other commands (router.js) — prefer the higher-level commands above unless you need fine-grained control. Work correctly in repo, flat, and multi-workspace consumer mode; accept `--workspace:<name>` to target a non-default workspace in multi-workspace mode (default: the first entry, by key order, in `flowkit.workspaces`)
- `flowkit convert:multi [--name:<id>]` — convert a flat-mode consumer project to multi-workspace mode — **flat/multi consumer mode only**
- `flowkit convert:flat [--from:<id>] [--all]` — collapse a multi-workspace consumer project back to flat mode — **flat/multi consumer mode only**
- `flowkit create:workspace [--name:<id>] [--lang:ts|js]` / `remove:workspace [--name:<id>]` / `rename:workspace <old> <new>` — add/remove/rename a workspace in a multi-workspace consumer project (`scripts/platform/workspace-flat.js`) — **flat/multi consumer mode only**, distinct from repo-mode's `nw`/`rw`

---

## Environment Flags

Set in `.env.local` (not committed).

| Flag                             | Effect                                |
| -------------------------------- | ------------------------------------- |
| `VITE_ENABLE_FLOWKIT_WATCH=true` | Starts the file-watcher plugin in dev |

FlowLens inclusion is **not** env-flag-gated — it's presence-based (see
`docs/FLOWLENS.md`'s Build gating section): included whenever
`src/modes/flowlens/index.ts` exists, stripped via Rollup DCE if that folder is
removed. `flowkit export` no longer has a FlowLens on/off distinction — every
export, in every mode, always ships the full codebase; proper feature-gating
is a future task, not currently implemented.

---

## Canvas Keyboard Shortcuts

| Shortcut              | Action                                        |
| --------------------- | --------------------------------------------- |
| `F4`                  | Enter flowplan playback mode                  |
| `F5`                  | Restart flowplan                              |
| `Cmd +` / `Cmd -`     | Zoom in / out                                 |
| `Cmd 0`               | Reset to 100% zoom                            |
| `Cmd Shift 0`         | Fit device to screen                          |
| `←` / `→`             | Navigate screens                              |
| `Shift ←` / `Shift →` | Navigate flows                                |
| `Shift 1–4`           | Switch right panel tabs                       |
| `Shift ,` / `Shift .` | Prev / next sub-tab of active right panel tab |
| `Alt 1–N`             | Jump to left-panel tab by position            |
| `Shift F`             | Focus screen search                           |
| `Shift S`             | Toggle Screens ↔ Flow Map                     |
| `Shift G`             | Go-To overlay                                 |
| `Cmd /`               | Action Center                                 |
| `Cmd Shift /`         | Help                                          |
| `Cmd Alt Shift P`     | Toggle canvas ↔ preview mode                  |

---

## Architecture Patterns

- **State**: React Context only — no Redux/Zustand. Each context exports a typed `use<Name>()` hook that throws outside provider; optional variants return `null`.
- **HMR safety**: All contexts guard identity with `import.meta.hot.data.<ContextName>` pattern.
- **Styling**: Tailwind v4 in `src/index.css` (`@theme` block); no `tailwind.config.js`. Always use `bg-theme-*` / `text-theme-*` classes. Only reach for `style={{}}` when Tailwind cannot (runtime-computed colors, `color-mix()`).
- **Component variants**: CVA (`class-variance-authority`) in `src/kits/`; merge via `cn()` from `@flowkit-kit/lib/utils`.
- **Layer order** (ESLint `boundaries` enforced): `shared → core → features → modes → App`
- **Workspace active state**: `src/workspaces.json` is the runtime source of truth; Vite plugin reconciles on dev start. Keep in sync via CLI, not manual edits.
- **Flowplan compile**: `FlowplanDef` → `compileFlowplan.ts` → runtime `FlowConfig`. Never mutate runtime from authoring format directly.
- **Session writes**: must go through `WriteBatcher` in `sessionDb.ts` — never write to IndexedDB directly.
- **Barrel rule**: import from `@flowkit-features/<name>` barrel only; never reach past `index.ts` into feature internals.
- **Workspace screens**: should only import from `@flowkit-core/layout/FlowMaster` and standard React. The platform injects everything else (db, navigation, simulator) via `FlowScreenProps`.
- **`import.meta.glob` patterns**: must be string literals — Vite resolves at build time, no dynamic variables.
- **One `SessionRecorderProvider`**: multiple providers create duplicate IndexedDB connections.
- **FlowLens is always lazy**: import `@flowlens` only from inside `modes/` to keep the base bundle lean.
- **New feature structure**: every feature needs an `index.ts` barrel (public API) and a `panel.tsx` root component. Add `export * from './<name>/index'` to `src/features/index.ts`. Shared state between features belongs in `@flowkit-shared/contexts`.
- **New mode structure**: export a single default component from `src/modes/<name>/index.ts`, lazy-import from `PreviewCanvas` behind a `VITE_ENABLE_*` env flag.
- **Workspace reconciliation**: `reconcileWorkspacesPlugin()` in `vite.config.ts` auto-syncs `src/workspaces.json` with disk on every dev start — removes stale entries and orphaned FlowLens folders. Manual edits to `src/workspaces.json` will be overwritten; use the CLI or browser UI.
- **Agent spec system**: `scripts/platform/agent-spec.js` + `agent-sync.js` generate `CLAUDE.md`, `Documentation/AGENTS.md`, and `.cursor/rules/flowkit.mdc` from a single spec. Run `flowkit agent:sync` to regenerate all three. See [Documentation/AGENTS.md](Documentation/AGENTS.md).

---

## Package / Publish Mode

> **This repo's end goal is to ship as three published npm packages**: `flowkit` (the library), `create-flowkit-app` (flat-mode scaffolder), `create-flowkit-workspace` (multi-workspace scaffolder). The dual-mode source (`isRepoMode()`, `assertScopedWorkspaceDir()`, lib build `exports`/`files`, `packages/create-flowkit-app/`, `packages/create-flowkit-workspace/`) is built and present on this branch. **As of 2026-07-10, npm login is confirmed (`rahil316`) and all three packages' unscoped names are still unclaimed, but nothing has been published under them yet** — `flowkit/package.json` still has `"private": true` as a deliberate failsafe, removed only as the last step before the actual `npm publish`. Don't tell a user to run `npm create flowkit-app@latest`/`npm create flowkit-workspace@latest` or add a git dependency on the unscoped names until that real publish actually happens. **Separately**, a scoped canary rehearsal (`@rahil316/flowkit`, `@rahil316/create-flowkit-app`, `@rahil316/create-flowkit-workspace`) is live on the real npm registry right now as an ongoing pre-release channel — the version bumps on every rehearsal publish (already past `0.0.0-canary.0` as of 2026-07-12; check `npm view @rahil316/flowkit dist-tags` for the current one rather than trusting any hardcoded number here) — these scoped packages are safe to point a user at today for a real end-to-end test (`npx @rahil316/create-flowkit-app@latest`), but make clear to them it's a canary/rehearsal artifact, not the eventual real package name. Full step-by-step status: [temp-docs/npm-checklist.md](temp-docs/npm-checklist.md) — this is the live, dated tracking doc; the older [Documentation/project-plans/execution/npm-publish-checklist.md](Documentation/project-plans/execution/npm-publish-checklist.md) predates it and is stale (still describes only two packages).

FlowKit ships three ways from one repo — every path in `scripts/helpers/` and `scripts/platform/` must work under all three:

- **Repo mode** (this checkout) — `workspaces/<name>/` holds author content; multiple workspaces coexist, switched via browser UI.
- **Flat mode** — consumer scaffolds via `create-flowkit-app`, gets `flowkit` installed into `node_modules/`; no `workspaces/` dir, one implicit workspace at the project root.
- **Multi-workspace (standalone) mode** — consumer scaffolds via `create-flowkit-workspace`, gets multiple sibling workspace folders at project root (not nested under `workspaces/`). Mode and workspace list are declared explicitly in the consumer's `package.json` under a `flowkit` key (`{ mode: "multi", workspaces: [...] }`) — see `scripts/helpers/flowkit-manifest.js`. Convert between flat and multi via `flowkit convert:multi` / `flowkit convert:flat`; add/remove/rename workspaces via `flowkit create:workspace` / `remove:workspace` / `rename:workspace` (all in `scripts/platform/workspace-flat.js`, distinct from the repo-mode-only `nw`/`rw`/`watch` in `scripts/platform/workspace.js`).

Rationale for flat/multi-workspace mode generally (per `PACKAGE-ARCHITECTURE.md`): `node_modules/` gives universal, convention-based blindness so AI coding agents/editors don't wander into platform internals (`src/core`, `src/features`, `src/shared`) unprompted.

- **Mode detection**: `scripts/helpers/paths.js` → `isRepoMode()` checks for a `.flowkit-repo-root` marker file at `ROOT` (computed from `paths.js`'s own file location, not `cwd()`) — deliberately excluded from `package.json`'s `files[]` allowlist so it never ships to any real install. Earlier detection heuristics (workspace-dir contents, then `node_modules`-in-path) both caused real incidents, including a full repo-delete bug — see `Documentation/PACKAGE-ARCHITECTURE.md` section 2 for the history. `assertScopedWorkspaceDir()` is the defense-in-depth backstop before any recursive workspace delete in repo mode; `scripts/helpers/flowkit-manifest.js`'s `assertScopedConsumerWorkspaceDir()` is the equivalent for flat/multi-workspace mode. **Both guards must treat `process.cwd()` as unsafe only conditionally** — in repo mode a named workspace should never legitimately resolve to `cwd`, but in flat mode it always correctly does (the project root IS the one implicit workspace). Getting this backwards silently blocks every authoring command in flat mode — confirmed as a real regression, fixed 2026-07-10.
- **`package.json` `"files"` is an allowlist**: currently `scripts/`, `src/`, `dist/lib/`, `dist/types/`, `docs/`, `./index.html` (minus `!scripts/tests/`, `!scripts/builders/format.mjs`, `!scripts/dev/`). Only listed paths ship via `npm pack`/`publish`/git-dep. Verify what actually ships with `npm pack --dry-run --json` — glob entries like `"scripts/"` pull in more than expected, hence the negations; `dist/` is scoped to `lib/`+`types/` specifically (not the whole directory) since `dist/assets/`+`dist/index.html` are this monorepo's own compiled demo app, not part of the published API — confirmed via a real `npm publish` rehearsal that they were shipping unnecessarily (fixed 2026-07-11, dropped tarball size from ~730KB to ~445KB). `scripts/dev/` (canary-publish tooling, agent-DX study scaffolding) is excluded the same way. Note: `PACKAGE-ARCHITECTURE.md`'s example `files[]` includes `"packages/"` — the real `package.json` does not; `packages/create-flowkit-app/` and `packages/create-flowkit-workspace/` each publish as their own separate package, not bundled into `flowkit`'s tarball.
- **Public API surface** (`src/core/config/index.ts` and anything it re-exports) must use **relative imports only** for its own types — never `@flowkit/*`/`@flowkit-shared/*`/etc. path aliases. TS declaration emit writes path-mapped specifiers as-is into `.d.ts`, which a consumer's TypeScript can't resolve. Check after any `build:lib` change: `grep -rn "from '@flowkit\(-core\|-features\|-shared\|-kit\)\?\b\|from '@workspace\|from '@flowlens" dist/types/` should return nothing.
- **`scripts/helpers/vite-plugin.js`** (exported as `flowkit/vite`) is what makes flat/multi-workspace mode work at dev-server time — it generates virtual modules (`virtual:flowkit/config|screens|flowplans|workspace`) that replace `import.meta.glob` patterns hardcoding `workspaces/<name>/...`, reconstructing the same data from `flowkit.config.ts` (bundled via esbuild) + filesystem globs from `cwd()` instead. Handles HMR via full-reload. The plugin takes two independent options: `workspaceRoot` (which folder to read `flowkit.config.ts`/`flows`/`flowplans`/`lib` from) and `standalone` (whether the plugin itself must supply `@flowkit`/`@core`/etc. aliases, vs. a host `vite.config.ts` already supplying them). Repo mode passes `workspaceRoot` only (its own `vite.config.ts` supplies aliases); multi-workspace standalone mode passes both `workspaceRoot` **and** `standalone: true` (no host config exists to supply aliases). Conflating these two options into one flag was a real bug — fixed 2026-07-10 — see `scripts/helpers/vite-plugin.js`'s `config()` for the current split.
- **`scripts/authoring-support/config-patch.js`'s `writeConfig()` must preserve the existing `flowkit.config.ts` import line, not hardcode one.** Repo mode imports `defineConfig` from `@platform/core/config`; flat/standalone mode imports it from the published `flowkit` package. Hardcoding either breaks the other mode's build the next time any authoring command (`create:flow`, `create:screen`, etc.) mutates the file. Fixed 2026-07-10 by capturing the import line into `config._importLine` on read and reusing it on write.
- **`scripts/helpers/paths.js`'s `workspacePath()`/`getActiveWorkspaceName()` must resolve against `flowkit.workspaces` in multi-workspace mode**, not just branch on repo-mode-vs-not. Without this, every authoring command run from a multi-workspace project's root silently resolved to root itself, never a named workspace subfolder. Fixed 2026-07-10 — both functions now consult `scripts/helpers/flowkit-manifest.js`'s `readFlowkitManifest()`/`isMultiMode()` and default to `flowkit.workspaces[0]` when no `--workspace:<name>` flag is given (matching the same "first entry" convention the generated `vite.config.ts` uses).
- **`flowkit convert:multi`/`convert:flat` must rewrite `vite.config.ts`, not just move files.** The two templates (flat: bare `flowkit()`; multi: `flowkit({ workspaceRoot, standalone: true })` reading `package.json`'s `flowkit.workspaces[0]`) are written by `writeFlatViteConfig()`/`writeMultiViteConfig()` in `scripts/platform/workspace-flat.js` — keep in sync with the literal templates in `packages/create-flowkit-app/index.js` and `packages/create-flowkit-workspace/index.js` if either changes. Omitting this step was a real bug — the build succeeded but silently produced an empty bundle (no workspace content) — fixed 2026-07-10.
- **`packages/create-flowkit-app/`** and **`packages/create-flowkit-workspace/`** are real, working scaffolders (not stubs). Both import their shared per-workspace content generator (`scripts/helpers/workspace-template.js` — the one shared source of truth also used by `flowkit create:workspace`) dynamically from their own `flowkit` devDependency, **after** `npm install` completes, not at their own top level — neither scaffolder package may depend on the monorepo directly (`scripts/` isn't part of either scaffolder's own tarball). Both also support `--local-dev` / `FLOWKIT_LOCAL_DEV=1`, gated on the repo marker, for testing against this checkout instead of a published version.

### What's actually done vs. not, toward publish

**Done**: `build:lib` produces working `dist/lib/` + `dist/types/`; peer-dep split (React/Radix); mode detection + safety guards (repo-mode and consumer-mode); flat/multi-workspace vite plugin incl. FlowLens session middleware; `create-flowkit-app` and `create-flowkit-workspace` scaffolders; path-alias leak fix in public `.d.ts`; `scripts/deploy/` removed entirely; `LICENSE` (MIT) added at repo root + both scaffolder packages, `license`/`author`/`repository`/`keywords`/`engines` added to all three `package.json`s; npm login confirmed (`rahil316`); full authoring CRUD family (create/remove/rename/move flow/screen/flowplan/component, list/info commands) verified working end-to-end in both flat and multi-workspace consumer mode, including workspace isolation; a full scoped-canary publish rehearsal (`@rahil316/*`) completed against the real npm registry 2026-07-11 — real `npm publish`/`npm create`/`npm install` exercised end-to-end for the first time (previously only `file:`/`--local-dev` installs had been tested); this is a live, ongoing pre-release channel, not a one-time snapshot — the counter in `scripts/dev/.canary-version.json` advances on every rehearsal publish (at `n=3` as of 2026-07-12; the registry's `latest` dist-tag was already at `0.0.0-canary.2` by that point, not `.0`). **Don't hardcode a specific canary version here or anywhere else** — check `npm view @rahil316/flowkit dist-tags` for the current one before referencing it. Installable today via `npx @rahil316/create-flowkit-app@latest` / `npx @rahil316/create-flowkit-workspace@latest`, see [temp-docs/scoped-canary-publish-plan.md](temp-docs/scoped-canary-publish-plan.md); `flowkit export`'s consumer-mode support (guided workspace/profile flow, works in flat and multi-workspace mode) built and verified 2026-07-12.

**Not done** — concrete blockers before actual publish (see [temp-docs/npm-checklist.md](temp-docs/npm-checklist.md) for the live, itemized state):

- No `.github/workflows/` — zero CI, zero automated publish.
- `npm run build` (full app build) fails at the `vite build` step in a workspace-less checkout — Rolldown can't resolve `virtual:flowkit/config` imported unconditionally from `src/shared/utils/workspaceModules.ts`. Root cause: `vite.config.ts` only includes the `flowkit()` plugin (which supplies that virtual module) when `getActiveWorkspace()` finds an active entry in `src/workspaces.json` — with no `workspaces/` dir and `active: null` (this checkout's current state, confirmed 2026-07-12), the plugin is silently omitted. Not a build bug — scaffold a workspace via `flowkit nw:<name>` first, or run `npm run build` against a checkout that already has one. `tsc -b` alone passes clean either way. Doesn't block `build:lib` (the real publish build), which doesn't depend on any workspace content.
- Scaffolded consumer projects ship no `eslint.config.js` — `flowkit export`'s ESLint pre-flight check now skips gracefully when absent (fixed 2026-07-12) rather than hard-failing, but neither scaffolder generates a working lint config yet.

See [Documentation/PACKAGE-ARCHITECTURE.md](Documentation/PACKAGE-ARCHITECTURE.md) for the full technical mechanism, [Documentation/PACKAGE-AUTHOR-GUIDE.md](Documentation/PACKAGE-AUTHOR-GUIDE.md) for the consumer-facing guide (written ahead of implementation — describes target end-state, not current reality), [Documentation/product/vision/VISION.md](Documentation/product/vision/VISION.md) / [FEATURES.md](Documentation/product/vision/FEATURES.md) for the distribution-model rationale, and [temp-docs/npm-checklist.md](temp-docs/npm-checklist.md) for the exact remaining steps in order.

---

## Known Gotchas

- **`applyDotPathPatch.ts`** — dot-path setter has no `__proto__`/`constructor` guard; prototype pollution possible on untrusted input ⚠️
- **vitest scope** — `vitest.config.ts` only includes `scripts/tests/**/*.test.ts` (4 files as of this writing: `applyDotPathPatch`, `canvasReducer`, `compileFlowplan`, `useKeyboardShortcuts`), but those files import and test `src/` modules directly — despite the directory name, this is where `src/` unit coverage lives. Coverage thresholds (91/86/95/93 stmts/branches/funcs/lines) apply only to what those 4 files exercise; most `src/` logic (UI components, contexts, most of `core/`) has no coverage ⚠️. Separately, `npm run test:workspace` runs 4 `.test.js` CLI integration files (`scaffold-consistency`, `stub-fallback`, `workspace-cli`, `workspace-registry`) — these are plain Node tests, not part of the vitest run above.
- **`prebuild` gate** — `npm run build` always runs `flowkit check:flowplans`; exits non-zero on blocking plan issues
- **`@workspace` alias** — resolves to the active workspace at build/dev start; switching workspace requires dev server restart
- **Two independent screen-navigation conventions — don't conflate them.** (1) `useDashboard().navigateTo(id)`, called directly by the screen, guarded on the `isFlow` prop FlowMaster injects (`onClick={() => !isFlow && navigateTo(id)}`) — works everywhere, Screens tab or Flow, no FlowMaster/flowplan dependency; this is what real, freely-explorable screens (e.g. a login/home screen with a tab bar) use, and what `scripts/helpers/scaffold.js`'s demo screens now do. The `isFlow` guard matters: without it, the click also fires during flow playback and desyncs `DashboardContext`'s view history from `FlowEngine`'s own step index. (2) `FlowScreenProps`'s `onAction`/`onNext`/`onBack` (`src/types/index.ts`) — injected only by `FlowMaster` during active flowplan playback (see its own JSDoc: "automatically injected... by FlowMaster"); `FlowMaster.tsx`'s `handleContainerClick` also does DOM-`id`-based event delegation for the older/scaffold convention (button `id` matches a flowplan step's `on` field, no `onClick` needed on the button at all). Both halves of (2) are **correctly, by-design inert** outside flow playback — not a bug. `scripts/helpers/workspace-template.js`'s demo screens (flat/multi-workspace scaffolder) only demonstrate convention (2) — see its NOTE comment. The **"Interactive Screens Preview" setting that used to gate a third, settings-based variant of convention (1)/(2) has been removed** — screens needing Screens-tab interactivity now wire it directly per the pattern above, unconditionally, no setting required.

---

## Common Tasks

**Create a new workspace**

```bash
flowkit nw:<name>   # scaffolds workspaces/<name>/ with flows/, flowplans/, lib/
```

Switch active workspace from the browser UI.

**Add a screen to a flow**

1. Create `workspaces/<ws>/flows/<flow>/<screen-id>/`
2. Add `<ScreenName>.tsx` — default export + optional `export const screenMeta`
3. Register screen id in `workspace.ts` → `screenOrder.<flow>[]`

**Add a flowplan step**

1. Open `workspaces/<ws>/flowplans/<flow>.ts`
2. Add `{ screenId, on, actionNote }` to `steps[]` in `defineFlow({...})`

**Write a workspace screen**

Screens receive props automatically — no context imports needed:

```tsx
import type { FlowScreenProps } from '@flowkit/types'

export default function WelcomeScreen({ onNext, db }: FlowScreenProps) {
  return <button onClick={onNext}>Hello {db?.user?.name}</button>
}

// eslint-disable-next-line react-refresh/only-export-components
export const screenMeta = { id: 'welcome', label: 'Welcome' }
```

**Add a simulator control to the inspector**

1. Use primitives from `@flowkit-features/simulator/controls` (`SimToggle`, `SimSelect`, etc.)
2. Wrap in `SimControl` for label alignment, `ControlAccordion` for grouping
3. Wire state into `SimulatorContext` if it needs to persist across tab switches

**Add a feature panel tab**

1. Create `src/features/<name>/` with component + `index.ts` barrel
2. Add tab entry to `src/core/layout/inspectorTabs.ts`
3. Wire into `KitSideInspector.tsx`; import only via `@flowkit-features/<name>`

---

## Path Aliases

| Alias               | Resolves to            | Notes                                                                     |
| ------------------- | ---------------------- | ------------------------------------------------------------------------- |
| `@flowkit-shared`   | `src/shared/`          | bare + `/*` in tsconfig                                                   |
| `@flowkit-core`     | `src/core/`            | bare + `/*` in tsconfig                                                   |
| `@flowkit-features` | `src/features/`        | bare + `/*` in tsconfig                                                   |
| `@flowlens`         | `src/modes/flowlens/`  | bare + `/*` in tsconfig — untouched by the 2026-07-12 `@flowkit-*` rename |
| `@flowkit-kit`      | `src/kits/shared/`     | `/*` only in tsconfig; always used as `@flowkit-kit/<path>`               |
| `@flowkit`          | `src/`                 | prefer scoped aliases above (renamed from `@platform` 2026-07-12)         |
| `@workspace`        | `workspaces/<active>/` | falls back to `src/workspace-stub/` when no workspace is active           |

> `vite.config.ts` also declares a bare `flowkit` alias (no `@`) → `src/core/config/index.ts`, used only for internal self-reference (mirrors the published package name); not for general app code. Deliberately kept distinct from the broad `@flowkit` alias above despite the similar name — the two coexist and serve different purposes.

All 7 aliases are declared in `vite.config.ts` and mirrored in `tsconfig.app.json`. `vitest.config.ts` mirrors all except `@workspace` (not needed for CLI tests).

---

## Key Dependencies

| Package                                  | Purpose                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `react@19` / `react-dom@19`              | UI runtime                                                                              |
| `vite@8` + `@vitejs/plugin-react`        | Dev server + build                                                                      |
| `tailwindcss@4` + `@tailwindcss/postcss` | Utility CSS (CSS-only config)                                                           |
| `@radix-ui/*`                            | Headless primitives (accordion, dialog, select, etc.)                                   |
| `class-variance-authority`               | Component variant system                                                                |
| `clsx` + `tailwind-merge` → `cn()`       | Class merging utility                                                                   |
| `lucide-react`                           | Icon library                                                                            |
| `vite-plugin-singlefile`                 | Standalone HTML export                                                                  |
| `eslint-plugin-boundaries`               | Layer import enforcement                                                                |
| `typedoc`                                | Generates `docs/api/` from `src/core/config/index.ts`'s public API (`npm run docs:api`) |

---

## Documentation

Two directories with different audiences — `docs/` ships to clients (included in `package.json`'s `files[]` allowlist); `Documentation/` is dev-only (not in `files[]`, never ships in the npm tarball).

**`docs/`** — client-deliverable:

- [docs/CLI.md](docs/CLI.md) — Full CLI command reference
- [docs/FLOWKIT.md](docs/FLOWKIT.md) — Platform architecture
- [docs/FLOWLENS.md](docs/FLOWLENS.md) — FlowLens analytics reference
- [docs/FLOWLENS-GUIDE.md](docs/FLOWLENS-GUIDE.md) — FlowLens usage guide
- [docs/FLOWMASTER.md](docs/FLOWMASTER.md) — Flow engine reference
- [docs/AGENTS.md](docs/AGENTS.md) — AI agent spec; source of truth for `flowkit agent:sync` output

**`Documentation/`** — dev-only:

- [Documentation/DevelopmentValues.md](Documentation/DevelopmentValues.md) — Engineering philosophy
- [Documentation/product/vision/FEATURES.md](Documentation/product/vision/FEATURES.md) — Feature inventory and status (engineering-facing, actively maintained)
