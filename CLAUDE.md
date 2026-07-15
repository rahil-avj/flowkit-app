# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FlowKit — Project Reference

Browser-based UI prototyping platform (React 19 + Vite 8 + Tailwind v4) for multi-screen, flow-based interactive previews with session recording and analytics replay.

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
- `npm run test:workspace` — Node test runner, 7 CLI integration test files (always runs all 7, concurrency 1)
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

| Shortcut              | Action                                          |
| --------------------- | ------------------------------------------------ |
| `Cmd =` / `Cmd -`     | Zoom in / out                                   |
| `Cmd 0`               | Reset to 100% zoom                              |
| `Cmd Shift 0`         | Toggle keep-fit                                 |
| `0`                   | Toggle keep-fit                                 |
| `F`                   | Toggle fullscreen                                |
| `\`                   | Toggle orientation                              |
| `R`                   | Restart flowplan (if gating) else reset to first screen |
| `Escape`              | Exit fullscreen                                 |
| `←` / `→`             | Navigate screens                                |
| `Shift ←` / `Shift →` | Navigate flows                                  |
| `Shift 1–9`           | Switch right panel tabs                         |
| `Shift ,` / `Shift .` | Prev / next sub-tab of active right panel tab   |
| `Alt 1–N`             | Jump to left-panel tab by position              |
| `Shift F`             | Focus screen search                             |
| `Shift S`             | Toggle Screens ↔ Flow Map                       |
| `Shift G`             | Go-To overlay                                   |
| `Cmd /`               | Action Center                                   |
| `Cmd Shift /`         | Help                                             |
| `Cmd Alt Shift P`     | Toggle canvas ↔ preview mode                    |

> Source of truth: `src/core/shortcuts/useKeyboardShortcuts.ts`. There is no dedicated "enter flowplan playback" key — playback starts from the UI.

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

> **This repo's end goal is to ship as three published npm packages**: `flowkit` (the library), `create-flowkit-app` (flat-mode scaffolder), `create-flowkit-workspace` (multi-workspace scaffolder). The dual-mode source (`isRepoMode()`, `assertScopedWorkspaceDir()`, lib build `exports`/`files`, `packages/create-flowkit-app/`, `packages/create-flowkit-workspace/`) is built and present on this branch. **As of 2026-07-10, npm login is confirmed (`rahil316`) and all three packages' unscoped names are still unclaimed, but nothing has been published under them yet** (confirmed 2026-07-15 — `npm view flowkit`/`create-flowkit-app` both 404). ⚠️ **`flowkit/package.json` no longer has `"private": true`** — this was documented as a deliberate failsafe removed only as the last step before `npm publish`, but as of 2026-07-15 the field is already absent from `package.json` while no real publish has happened yet. Treat this as an open gap, not a safety net currently in place: confirm intent before running `npm publish` from this checkout. Don't tell a user to run `npm create flowkit-app@latest`/`npm create flowkit-workspace@latest` or add a git dependency on the unscoped names until that real publish actually happens. **Separately**, a scoped canary rehearsal (`@rahil316/flowkit`, `@rahil316/create-flowkit-app`, `@rahil316/create-flowkit-workspace`) is live on the real npm registry right now as an ongoing pre-release channel — the version bumps on every rehearsal publish (already past `0.0.0-canary.0` as of 2026-07-12; check `npm view @rahil316/flowkit dist-tags` for the current one rather than trusting any hardcoded number here) — these scoped packages are safe to point a user at today for a real end-to-end test (`npx @rahil316/create-flowkit-app@latest`), but make clear to them it's a canary/rehearsal artifact, not the eventual real package name. Full step-by-step status: [temp-docs/npm-checklist.md](temp-docs/npm-checklist.md) — this is the live, dated tracking doc; the older [Documentation/project-plans/execution/npm-publish-checklist.md](Documentation/project-plans/execution/npm-publish-checklist.md) predates it and is stale (still describes only two packages).

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

**Done**: `build:lib` produces working `dist/lib/` + `dist/types/`; peer-dep split (React/Radix); mode detection + safety guards (repo-mode and consumer-mode); flat/multi-workspace vite plugin incl. FlowLens session middleware; `create-flowkit-app` and `create-flowkit-workspace` scaffolders; path-alias leak fix in public `.d.ts`; `scripts/deploy/` removed entirely; `LICENSE` (MIT) added at repo root + both scaffolder packages, `license`/`author`/`repository`/`keywords`/`engines` added to all three `package.json`s; npm login confirmed (`rahil316`); full authoring CRUD family (create/remove/rename/move flow/screen/flowplan/component, list/info commands) verified working end-to-end in both flat and multi-workspace consumer mode, including workspace isolation; a full scoped-canary publish rehearsal (`@rahil316/*`) completed against the real npm registry 2026-07-11 — real `npm publish`/`npm create`/`npm install` exercised end-to-end for the first time (previously only `file:`/`--local-dev` installs had been tested); this is a live, ongoing pre-release channel, not a one-time snapshot — the counter in `scripts/dev/.canary-version.json` advances on every rehearsal publish (at `n=5` as of 2026-07-15; the registry's `canary` dist-tag was at `0.0.0-canary.4` by that point — note the `latest` dist-tag is separately pinned at `0.0.0-canary.0` and is not what advances). **Don't hardcode a specific canary version here or anywhere else** — check `npm view @rahil316/flowkit dist-tags` for the current one before referencing it. Installable today via `npx @rahil316/create-flowkit-app@latest` / `npx @rahil316/create-flowkit-workspace@latest`, see [temp-docs/scoped-canary-publish-plan.md](temp-docs/scoped-canary-publish-plan.md); `flowkit export`'s consumer-mode support (guided workspace/profile flow, works in flat and multi-workspace mode) built and verified 2026-07-12.

**Not done** — concrete blockers before actual publish (see [temp-docs/npm-checklist.md](temp-docs/npm-checklist.md) for the live, itemized state):

- No `.github/workflows/` — zero CI, zero automated publish.
- `npm run build` (full app build) currently fails — confirmed 2026-07-15 against a checkout **with** an active workspace present, contradicting the earlier belief that scaffolding a workspace first was a working fix. It now fails earlier, at the `tsc -b` step itself (`TS2307` on `virtual:flowkit/config`/`virtual:flowkit/workspace` in `src/shared/utils/workspaceModules.ts`), not just at `vite build`. See the corresponding entry in Known Gotchas below — root cause not yet isolated, needs fresh investigation. Doesn't block `build:lib` (the real publish build), which doesn't compile this file.
- Scaffolded consumer projects ship no `eslint.config.js` — `flowkit export`'s ESLint pre-flight check now skips gracefully when absent (fixed 2026-07-12) rather than hard-failing, but neither scaffolder generates a working lint config yet.

See [Documentation/PACKAGE-ARCHITECTURE.md](Documentation/PACKAGE-ARCHITECTURE.md) for the full technical mechanism, [Documentation/PACKAGE-AUTHOR-GUIDE.md](Documentation/PACKAGE-AUTHOR-GUIDE.md) for the consumer-facing guide (written ahead of implementation — describes target end-state, not current reality), [Documentation/product/vision/VISION.md](Documentation/product/vision/VISION.md) / [FEATURES.md](Documentation/product/vision/FEATURES.md) for the distribution-model rationale, and [temp-docs/npm-checklist.md](temp-docs/npm-checklist.md) for the exact remaining steps in order.

---

## Known Gotchas

- **`applyDotPathPatch.ts`** — fixed 2026-07-15: `setAtPath`/`deepMerge` now reject `__proto__`/`prototype`/`constructor` keys (at any nesting depth, both in dot-path segments and in nested object patch values) instead of traversing into them. See `scripts/tests/applyDotPathPatch.test.ts`'s AP5–AP7 for the regression tests.
- **vitest scope** — `vitest.config.ts` only includes `scripts/tests/**/*.test.ts` (4 files as of this writing: `applyDotPathPatch`, `canvasReducer`, `compileFlowplan`, `useKeyboardShortcuts`), but those files import and test `src/` modules directly — despite the directory name, this is where `src/` unit coverage lives. Coverage thresholds (91/86/95/93 stmts/branches/funcs/lines) apply only to what those 4 files exercise; most `src/` logic (UI components, contexts, most of `core/`) has no coverage ⚠️. Separately, `npm run test:workspace` runs 7 `.test.js` CLI integration files (`scaffold-consistency`, `stub-fallback`, `workspace-cli`, `workspace-registry`, `checks-rules`, `check-cli`, `kebab-normalize`) — these are plain Node tests, not part of the vitest run above.
- **`prebuild` gate** — `npm run build` always runs `flowkit check:flowplans`; exits non-zero on blocking plan issues
- **`@workspace` alias** — resolves to the active workspace at build/dev start; switching workspace requires dev server restart
- **Two independent screen-navigation conventions — don't conflate them.** (1) `useDashboard().navigateTo(id)`, called directly by the screen, guarded on the `isFlow` prop FlowMaster injects (`onClick={() => !isFlow && navigateTo(id)}`) — works everywhere, Screens tab or Flow, no FlowMaster/flowplan dependency; this is what real, freely-explorable screens (e.g. a login/home screen with a tab bar) use, and what `scripts/helpers/scaffold.js`'s demo screens now do. The `isFlow` guard matters: without it, the click also fires during flow playback and desyncs `DashboardContext`'s view history from `FlowEngine`'s own step index. (2) `FlowScreenProps`'s `onAction`/`onNext`/`onBack` (`src/types/index.ts`) — injected only by `FlowMaster` during active flowplan playback (see its own JSDoc: "automatically injected... by FlowMaster"); `FlowMaster.tsx`'s `handleContainerClick` also does DOM-`id`-based event delegation for the older/scaffold convention (button `id` matches a flowplan step's `on` field, no `onClick` needed on the button at all). Both halves of (2) are **correctly, by-design inert** outside flow playback — not a bug. `scripts/helpers/workspace-template.js`'s demo screens (flat/multi-workspace scaffolder) only demonstrate convention (2) — see its NOTE comment. The **"Interactive Screens Preview" setting that used to gate a third, settings-based variant of convention (1)/(2) has been removed** — screens needing Screens-tab interactivity now wire it directly per the pattern above, unconditionally, no setting required. This is a discipline convention enforced by author care, not by the CLI/linter — `flowkit check:screens` does not currently catch an unguarded `navigateTo()` call.
- **`npm run build` (`tsc -b` step) — fixed 2026-07-15.** Root cause: `tsconfig.workspace.json` type-checks `src/` files transitively (workspace screens import `@flowkit-shared/contexts`, which chains into `src/shared/utils/workspaceModules.ts`) but its `include` (`["workspaces", "src/workspace-stub"]`) never pulled in `src/vite-env.d.ts` — so that project never saw the ambient `virtual:flowkit/config`/`virtual:flowkit/workspace` module declarations, even though `tsconfig.app.json`'s separate, wider-`include` project resolved them fine in isolation. Fix: added `"src/vite-env.d.ts"` to `tsconfig.workspace.json`'s `include`. Verified: `tsc -b` and `npm run build` both succeed clean against this checkout's existing `test-1`/`test-2` workspaces.
- **`flowkit add:step`/`remove:step` now refuse to rewrite a flowplan containing `forks`** (fixed 2026-07-15) instead of silently corrupting it — `rewriteSteps()` in `scripts/authoring/flowplans.js` checks for `forks` on any step before rewriting and throws with a pointer to hand-editing or `promote:flow`. Previously: `formatStep()` has no serialization path for `forks`, and the non-greedy `steps: [...]` regex only matches to the first `]`, so either would have dropped fork data or written a malformed array with no warning. Regression coverage: `scripts/tests/flowplan-steps-cli.test.js` (Suite F, wired into `npm run test:workspace`).

---

## Common Tasks

Precise, source-verified authoring reference (workspaces, flows, screens, flowplans, steps, forks, components, simulator controls, db patching, exact CLI flags) lives in the `flowkit-author` skill — invoked automatically when performing any of these tasks.

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
