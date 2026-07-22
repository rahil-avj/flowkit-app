# flowkit CLI

Command-line interface for managing workspaces, flows, screens, FlowPlans, sessions, and workspace data.

**This CLI runs in three modes**, and most of this doc's examples use repo-mode paths (`workspaces/<ws>/...`). Where a command behaves differently or isn't available in a mode, it's called out explicitly.

| Mode                     | Where it applies                                                                                    | Layout                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Repo mode**            | This monorepo checkout                                                                              | `workspaces/<name>/` — multiple workspaces, switched via browser UI                                                        |
| **Flat mode**            | A project scaffolded by `create-flowkit-app`                                                        | Project root IS the one workspace — no `workspaces/` dir                                                                   |
| **Multi-workspace mode** | A project scaffolded by `create-flowkit-workspace`, or a flat project after `flowkit convert:multi` | Sibling workspace folders at project root (`workspace-1/`, `app-b/`, …), declared in `package.json`'s `flowkit.workspaces` |

Flat and multi-workspace mode are collectively "consumer mode" below. See [Workspaces (flat/multi-workspace consumer mode)](#workspaces-flatmulti-workspace-consumer-mode) for the commands specific to those two.

## Setup

**Repo mode:**

```bash
npm install
npm link          # makes `flowkit` available globally in your shell
```

Or run without linking:

```bash
node scripts/flowkit.js <command>
```

**Consumer mode** — `flowkit` is a `devDependency` installed by the scaffolder, already on your `PATH` via `node_modules/.bin`:

```bash
npx create-flowkit-app@latest my-app          # flat mode
npx create-flowkit-workspace@latest my-project # multi-workspace mode
cd my-app  # or my-project
flowkit <command>
```

---

## Syntax

Every command has a **short alias** and a **long-form name** — both always work:

```bash
flowkit nw              # short alias, guided
flowkit new-workspace   # long form, guided
flowkit nw:<name>       # express: value after colon, guided fallback for missing flags
flowkit new-workspace:<name> --kit:apple --lang:ts   # fully express
```

`--agent:` and per-tool memory-file targets (Claude/Cursor/etc.) previously existed here and were removed — every workspace now gets one agent-agnostic `AGENTS.md`, matching the consumer-mode scaffolders (`create-flowkit-app`/`create-flowkit-workspace`), which never offered a per-tool choice.

**Flags** follow the same `:` pattern: `--kit:apple`, `--lang:ts`.

**Help** — any of these work:

```bash
flowkit
flowkit -h
flowkit help
```

**Version:**

```bash
flowkit -v
flowkit --version
flowkit version
```

---

## Workspaces (repo mode)

> **`nw`/`rw`/`watch` are repo-mode only** — they manage `workspaces/<name>/` directories inside this monorepo checkout and exit with an error pointing at the consumer-mode equivalents if run elsewhere. `status` (bottom of this section) is the exception — confirmed working in all three modes, included here because it's a workspace-lifecycle command, not because it's repo-mode-specific. See [Workspaces (flat/multi-workspace consumer mode)](#workspaces-flatmulti-workspace-consumer-mode) for the consumer-mode equivalents of `nw`/`rw`.

### `nw` / `new-workspace` — Create workspace

```bash
flowkit nw
flowkit nw:<name>
flowkit nw:<name> --kit:<name> --lang:ts
```

Creates a new workspace under `workspaces/<name>/` with the full folder structure, mock db, design tokens, and a demo flow. Switches the active workspace immediately and builds the router.

**Scaffolded structure:**

```
workspaces/<name>/
  flows/                  ← demo flow + screen (flat format)
  components/
    ui/
    layout/
    navigation/
    forms/
    feedback/
  data/db.ts
  data/simulator.tsx
  design-system/tokens.css
  lib/
  hooks/
  assets/
  .agent/
    INDEX.md
    rules.md
    platform.md
    project.md             ← hand-owned; never regenerated
    .agent-meta.json
  AGENTS.md                ← agent memory file (one agent-agnostic file, no per-tool choice)
  workspace.ts
  index.ts

workspaces/<name>/lib/flowLens/       ← committed session library + studies.json (created alongside workspace)
```

**Optional flags:**

| Flag                  | Description                                                                         |
| --------------------- | ----------------------------------------------------------------------------------- |
| `--kit:apple`         | iOS HIG style — system blue, SF Pro, soft surfaces, generous radii                  |
| `--kit:material`      | Material Design 3 — purple brand, Roboto, tonal surfaces                            |
| `--kit:neo-brutalism` | Sharp edges, black borders, hard offset shadows                                     |
| `--kit:none`          | No kit — base structural styles only (default)                                      |
| `--lang:js`           | Scaffold screen files as `.jsx` / flowplan files as `.js` instead of `.tsx` / `.ts` |

Kits are applied via the `@flowkit-kit` CSS alias — no files are copied into the workspace. The selected kit is stored in `src/workspaces.ts` and applied as a `data-kit` attribute on the preview canvas at runtime.

### `workspace.ts` anatomy

The workspace manifest is authored with `defineConfig()` — imported from `@flowkit-core/config` in repo mode, or from `'flowkit'` in consumer mode (flat/multi-workspace):

```typescript
// repo mode
import { defineConfig } from '@flowkit-core/config'
// consumer mode (flat/multi-workspace)
import { defineConfig } from 'flowkit'

export default defineConfig({
  workspace: { name: 'MyApp', description: 'What this prototype is.' }, // optional

  // Screen loaded by default — cold load, device home button, reset-to-first —
  // when no flowplan is active. Optional; falls back to the first declared screen when unset.
  startScreen: 'welcome-screen',

  // Default device shell/mockup shown on load. Must match a DevicePreset.label
  // from src/shared/components/devices (e.g. "iPhone 16 Pro", "iPad Mini", "Compact").
  // Optional; falls back to the platform default (DEVICE_PRESETS[0]) when unset or unrecognized.
  defaultDevice: 'iPhone 16 Pro',

  // Default orientation on load. Optional; falls back to "portrait". Ignored if the
  // resolved device preset doesn't support landscape (DevicePreset.supportsLandscape).
  defaultOrientation: 'portrait',

  // Explicit flow ordering for the Screens tab and Flow Library.
  // Unlisted flows are appended after declared ones in discovery order.
  flows: ['onboarding-flow', 'home-flow'],

  // Explicit screen ordering within each flow for the Screens tab sidebar.
  // Unlisted screens are appended after declared ones, alphabetically.
  screenOrder: {
    'onboarding-flow': ['welcome-screen', 'setup-screen', 'ready-screen'],
    'home-flow': ['home-screen', 'detail-screen'],
  },
})
```

**Field summary:**

| Field                | Purpose                                                                           |
| -------------------- | --------------------------------------------------------------------------------- |
| `workspace`          | Display `name` / `description` shown in the workspace picker                      |
| `startScreen`        | Default screen id — cold load, device home button, reset-to-first (optional)      |
| `defaultDevice`      | Default device shell/mockup label, must match a `DevicePreset.label` (optional)   |
| `defaultOrientation` | Default orientation, `"portrait"` or `"landscape"` (optional)                     |
| `flows`              | Explicit flow ordering (flat-layout workspaces — see note below)                  |
| `screenOrder`        | Explicit per-flow screen ordering, keyed by flow id                               |
| `projects`           | Nested-layout only — per-project `flows`/`screenOrder` (skip for flat workspaces) |

> **"Flat-layout" here is unrelated to flat _mode_.** `flows`/`screenOrder` vs. `projects` describes whether a single workspace has a `projects/` subdivision layer inside it — a repo-mode-and-consumer-mode-agnostic authoring choice. It has nothing to do with flat mode (one implicit workspace, no `workspaces/` dir) vs. multi-workspace mode (sibling workspace folders) described elsewhere in this doc. Both `flat-layout` and `nested-layout` workspaces exist identically in repo mode, flat mode, and multi-workspace mode.

Per-flowplan playback can override the home-button target for the duration of that flow via `homeScreen` — see [FlowPlan anatomy](#flowplan-anatomy) below.

Workspace switching happens in the browser UI — open `http://localhost:5173` and select a workspace. Your selection is saved automatically in `localStorage`.

### `rw` / `remove-workspace` — Remove workspace

```bash
flowkit rw
flowkit rw:<name>
flowkit remove-workspace:<name>
```

Removes `workspaces/<name>/` entirely. Requires `y` confirmation. If the removed workspace was active, prompts to switch to another.

### `watch` / `watch:flows` — Watch mode

```bash
flowkit watch
flowkit watch:<name>
flowkit watch:flows:<name>   # same — the "flows:" prefix is stripped
```

Switches to the workspace, starts the dev server (`npm run dev`), then watches `workspaces/<name>/flows/` for `.ts`/`.tsx` changes. Press `Ctrl+C` to stop.

> This is the CLI-level watcher (Node.js `fs.watch`). The Vite plugin watcher (`VITE_ENABLE_FLOWKIT_WATCH=true`) is a separate mechanism that runs inside the dev server.

### `status` — Workspace health snapshot

Works in all three modes — confirmed via live test in flat and multi-workspace mode. Takes the workspace name via colon-suffix only (`status:<name>`), not the `--workspace:<name>` flag the Authoring family uses.

```bash
flowkit status
flowkit status:<name>
```

Prints a compact health report for the active workspace:

- Flow count + total screen count (counts `flows/<flow>/<screen>/` subfolders)
- FlowPlan count (from `flowplans/*.ts`)
- Session library: count + whether FlowLens module is present
- Feedback: committed comment count (from `.flowkit-feedback.json`)
- Agent: agent type + spec version (from `.agent/.agent-meta.json`)

---

## Workspaces (flat/multi-workspace consumer mode)

Consumer-mode equivalent of the repo-mode `nw`/`rw`/`watch` commands above. Mode and workspace list are declared explicitly in the consumer project's `package.json` under a `flowkit` key — never inferred from folder shape:

```json
{
  "flowkit": {
    "mode": "multi",
    "workspaces": ["workspace-1", "app-b"]
  }
}
```

Absent `flowkit` key (or `mode` omitted) means flat mode — the project root itself is the one implicit workspace.

### `convert:multi` — Convert flat mode to multi-workspace mode

```bash
flowkit convert:multi
flowkit convert:multi --name:my-workspace
```

Wraps the project root's `workspace.ts`/`index.ts`/`flows/`/`flowplans/`/`lib/` (plus `.flowkit/`, `.agent/`, `.flowkit-feedback.json` if present) into a new folder — `workspace-1/` by default, or `--name:<id>`. Rewrites `vite.config.ts` to the multi-workspace template and sets `package.json`'s `flowkit.mode`/`flowkit.workspaces` accordingly. Staged move with rollback — a failure partway through leaves the project exactly as it was before running the command, confirmed via induced-failure test.

Prints a hint for adding another workspace afterward; does **not** scaffold a second workspace itself.

### `convert:flat` — Collapse multi-workspace mode back to flat

```bash
flowkit convert:flat                    # only valid with exactly one workspace left
flowkit convert:flat --from:app-b       # pick which workspace survives (others must not exist, or pass --all)
flowkit convert:flat --from:app-b --all # delete every other workspace first, then collapse app-b to root
```

Moves the chosen workspace's content back up to project root, rewrites `vite.config.ts` to the flat template, and clears `package.json`'s `flowkit` key entirely. Refuses (rather than guessing) if multiple workspaces exist and neither `--from` nor `--all` disambiguates which one survives. `--all` requires typed confirmation before deleting the non-surviving workspaces.

### `create:workspace` — Add a workspace

```bash
flowkit create:workspace --name:app-b --lang:ts
flowkit create:workspace          # prompts for name and language interactively
```

Multi-workspace mode only. Scaffolds a new sibling folder with the same demo content as `create-flowkit-workspace`'s own initial workspace, and appends it to `package.json`'s `flowkit.workspaces`. This is the primary way to add a workspace — hand-creating a folder and manually editing `flowkit.workspaces` works too, but there's no discovery: an unlisted folder is not a workspace no matter what's inside it.

### `remove:workspace` — Remove a workspace

```bash
flowkit remove:workspace --name:app-b
flowkit remove:workspace          # prompts to select from the list
```

Multi-workspace mode only. Requires typed confirmation (the workspace name, not just `y`/`n`) before deleting — same pattern as repo-mode's `rw`. Removes the folder and its entry in `flowkit.workspaces`.

### `rename:workspace` — Rename a workspace

```bash
flowkit rename:workspace app-b app-c
```

Multi-workspace mode only. Renames the folder and updates `flowkit.workspaces` in place; the workspace's own `workspace.ts` `workspace.name` field is not required to match and isn't auto-updated.

---

## FlowPlans

FlowPlans are TypeScript files that define scripted journeys with conditional forks, db patches, and action notes. They are compiled at runtime by `compileFlowplan.ts`.

**Storage location:** `workspaces/<ws>/flowplans/<Name>.ts` (repo mode) or `flowplans/<Name>.ts` at the workspace root (consumer mode — flat: project root; multi-workspace: inside the workspace's own folder).

### FlowPlan anatomy

A FlowPlan is authored with `defineFlow()` — imported from `@flowkit-core/config` in repo mode, or from `'flowkit'` in consumer mode:

```typescript
// repo mode
import { defineFlow } from '@flowkit-core/config'
// consumer mode (flat/multi-workspace)
import { defineFlow } from 'flowkit'

export default defineFlow({
  id: 'checkout-flow', // required — unique plan id
  name: 'Checkout', // required — display name
  description: 'Happy path.', // optional
  tags: ['buyer', 'status:approved'], // optional — prefixes: role: type: state: status:

  // Screen the device home button targets while this plan is playing.
  // Optional — falls back to the workspace's `startScreen` (see workspace.ts) when unset.
  homeScreen: 'product-detail',

  // Flow-level db baseline — deep-copied on play, restored on exit.
  // Keys are dot-paths; objects deep-merge, arrays replace entirely.
  db: {
    user: { id: 'u1', verified: true },
    cart: { count: 1 },
  },

  // Flow-level simulator controls shown during playback.
  simulator: {
    controls: [
      { label: 'Cart items', path: 'cart.count', type: 'count', min: 0, max: 10 },
      { label: 'Online', path: 'local.isOnline', type: 'boolean', default: true },
    ],
  },

  steps: [
    {
      screenId: 'product-detail', // required — id of the screen to show
      on: 'add-to-cart', // element id whose tap advances this step (omit = tap-anywhere)
      actionNote: 'Taps Add to Cart', // what the user does (shown during playback)
      decisionNote: 'Entry point.', // narrative context (shown in step list)
      annotation: 'Free-text sticky note shown on the canvas node.',
      db: { 'cart.count': 1 }, // step-level db patch applied when this step activates
    },
    {
      screenId: 'cart',
      on: 'checkout',
      actionNote: 'Reviews cart, taps Checkout',
      // Conditional branch — forks are evaluated using the db at this step
      forks: [
        {
          label: 'Empty cart',
          db: { 'cart.count': 0 }, // db condition that takes this branch
          steps: [{ screenId: 'cart-empty', actionNote: 'Sees empty state' }],
          // mergesTo: "next",  // rejoin the main flow after the fork; omit = terminal branch
        },
      ],
    },
    {
      screenId: 'order-confirmation',
      actionNote: 'Sees confirmation',
      decisionNote: 'End of happy path.',
    },

    // Inline another plan's steps (screen ids namespaced as "other-plan-id::screen-id"):
    // { ref: "quick-reorder-flow" },
  ],
})
```

**Step fields summary:**

| Field          | Purpose                                                        |
| -------------- | -------------------------------------------------------------- |
| `screenId`     | Id of the screen to show (required)                            |
| `on`           | Element id whose tap advances this step; omit for tap-anywhere |
| `actionNote`   | What the user does — shown as caption during playback          |
| `decisionNote` | Narrative note shown in the step list                          |
| `annotation`   | Free-text sticky note shown on canvas node and step list       |
| `db`           | Dot-path patch applied to the flow db when this step activates |
| `forks`        | Inline conditional branches                                    |

**Fork fields:** `label`, `db` (condition patch), `steps`, `mergesTo: "next"` (rejoin) or omit (terminal).

**Plan composition:** `{ ref: "plan-id" }` inlines another plan's steps at that position. The referenced plan's screen ids are namespaced as `plan-id::screen-id` to avoid collisions.

### `plan:ls` / `fp:ls` — List flowplans

```bash
flowkit plan:ls
flowkit fp:ls
```

Lists all flowplans in the workspace. Shows: name, file path.

---

## Check

```bash
flowkit check
flowkit check:<domain>
```

Domain-specific linter for authored content — validates flowkit's own structural conventions (screen export shape, flowplan step references, workspace config consistency, component registry/barrel exports, mock db exports) that generic tools like `tsc`/`eslint` can't see. Works in every mode (repo, flat, multi-workspace).

`flowkit check` with no domain runs all 5 domains against one workspace and prints one combined report. `flowkit check:<domain>` runs just that domain:

| Domain     | Command            | Checks                                                                                       |
| ---------- | ------------------ | -------------------------------------------------------------------------------------------- |
| Screens    | `check:screens`    | Default export shape, `screenMeta` presence/shape, id/directory match                        |
| Config     | `check:config`     | `workspace.ts`'s `flows[]`/`screenOrder` consistency against `flows/` on disk                |
| Components | `check:components` | `.flowkit/components.json` registry vs. files on disk, barrel export consistency             |
| DB         | `check:db`         | `lib/data/db.ts`/`db.js` has at least one export                                             |
| FlowPlans  | `check:flowplans`  | Parseable, `id` matches filename, non-empty `steps[]`, step `screenId`s exist, step guidance |

Target a non-active workspace: `flowkit check:screens:<workspace-name>` for a single domain (workspace as the second colon segment, same convention as `sessions:ls:<ws>`), or `flowkit check --workspace:<workspace-name>` for the all-domains form.

Flags:

- `--json` — machine-readable output (`{ workspace, errors, warnings, results }`) instead of the human-readable report
- `--workspace:<name>` — target a non-active workspace when running all domains (`check` with no domain)

Exit code 0 if clean or only warnings, 1 if any error-severity finding. `check:flowplans` is wired into `npm run prebuild` — a broken or missing flowplan blocks the production build (including an empty-but-existing `flowplans/` directory, which is treated as suspicious rather than silently passing).

Findings include a `ruleId` (e.g. `screen/missing-meta`, `flowplan/invalid-screen`), `severity` (`error`/`warning`), the offending `file`, a `message`, and where possible a `fix` (manual instructions) or `clifix` (an exact CLI command to run).

---

## Authoring

CRUD commands for editing the content inside a workspace — flows, screens, flowplan steps, and shared components. Every command accepts `--workspace:<name>` (optional; defaults to the active workspace) and exits 1 with a red `✗` message on any validation failure. IDs must be kebab-case (`^[a-z][a-z0-9-]*$`) unless noted otherwise.

Work identically across all three modes. "Active workspace" (the default when `--workspace` is omitted) resolves differently per mode:

- **Repo mode** — `src/workspaces.json`'s `active` field, set by the browser UI or CLI.
- **Flat mode** — the one implicit workspace (project root); `--workspace` has nothing else to target.
- **Multi-workspace mode** — the first entry (by key order) in `package.json`'s `flowkit.workspaces` object. Pass `--workspace:<name>` to target a different one (e.g. `flowkit create:flow --name:checkout --workspace:app-b`).

### Flows

#### `create:flow` — Add a flow

```bash
flowkit create:flow --name:<flow-id>
```

Creates `flows/<flow-id>/` and registers it in `workspace.ts` (`flows[]` + an empty `screenOrder[flow-id]`). If `--name` is omitted, prompts interactively. Rolls back the created directory if registration fails.

Prints `Next: flowkit create:screen --flow:<flow-id> --name:<first-screen> --label:"Screen Name"` on success.

#### `remove:flow` — Remove a flow

```bash
flowkit remove:flow --name:<flow-id> [--force]
```

Unregisters the flow from `workspace.ts` and deletes `flows/<flow-id>/`. Refuses if the flow directory contains any screens unless `--force` is passed.

#### `list:flows` — List flows

```bash
flowkit list:flows
```

Read-only. Lists every flow with its screen count and a total.

### Screens

Screen ids are **unique across the whole workspace**, not just within their flow — `create:screen`/`rename:screen` both check this.

#### `create:screen` — Add a screen to a flow

```bash
flowkit create:screen --flow:<flow-id> --name:<screen-id> [--label:"Display Label"]
```

Creates `flows/<flow-id>/<screen-id>/<PascalName>Screen.tsx` from a template and registers it in `workspace.ts` (`screenOrder.<flow-id>[]`). The flow must already exist. `--label` defaults to a Title Case version of the screen id if omitted.

Prints `Next: flowkit add:step --flowplan:<flow-id> --screen:<screen-id> --action:"..."` on success.

#### `remove:screen` — Remove a screen

```bash
flowkit remove:screen --flow:<flow-id> --name:<screen-id>
```

Unregisters the screen and deletes its directory. If any flowplan still references the screen id, prints a warning listing the affected flowplans but does not block the removal or edit them for you.

#### `rename:screen` — Rename a screen

```bash
flowkit rename:screen --flow:<flow-id> --name:<old-id> --to:<new-id>
```

Renames the directory and the `.tsx` file (including the exported component function name), and updates `screenOrder`. The new id must not already exist anywhere in the workspace. Like `remove:screen`, warns about but does not update flowplan references to the old id.

#### `move:screen` — Move a screen to a different flow

```bash
flowkit move:screen --name:<screen-id> --from-flow:<flow-id> --to-flow:<flow-id>
```

Moves the screen's directory and updates `screenOrder` on both flows. The destination flow must already exist.

#### `list:screens` — List screens

```bash
flowkit list:screens [--flow:<flow-id>]
```

Read-only. Lists screens grouped by flow, or just the one flow if `--flow` is given.

#### `screen:info` — Show screen metadata

```bash
flowkit screen:info --flow:<flow-id> --name:<screen-id>
```

Read-only. Prints the screen's `label`/`desc` (from `screenMeta`) and its import list, read directly from the `.tsx` file.

### FlowPlan steps

#### `add:step` — Append a step to a flowplan

```bash
flowkit add:step --flowplan:<flowplan-id> --screen:<screen-id> [--on:<element-id>] [--action:"..."] [--position:<n>]
```

Appends `{ screenId, on?, actionNote? }` to the flowplan's `steps[]`. `screen-id` must already be registered somewhere in the workspace (across any flow) — on failure, prints a "did you mean" suggestion plus the full list of known screens. `--position` inserts at that 0-based index instead of the end; an unparseable or omitted `--position` appends to the end.

⚠️ Rewrites the `steps: [...]` block with a non-greedy regex — on a flowplan whose first step array contains a nested `forks[].steps[...]`, this can match the wrong closing bracket. Review the file after running this on a flowplan with forks.

#### `remove:step` — Remove a step by index

```bash
flowkit remove:step --flowplan:<flowplan-id> --index:<n>
```

Removes the step at the given 0-based index. ⚠️ **`--index` is required in practice but not enforced** — if omitted, the command does not error; it silently removes step **0** instead (via `steps.splice(NaN, 1)`, and `NaN` coerces to `0`) and still prints a "✓ Removed" confirmation naming whatever step actually sat at index 0. Always pass `--index` explicitly and double check with `list:steps` afterward.

#### `list:steps` — List a flowplan's steps

```bash
flowkit list:steps --flowplan:<flowplan-id>
```

Read-only. Prints each step's index, screen id, `on`, and `actionNote`.

#### `flowplan:info` — Show flowplan summary

```bash
flowkit flowplan:info --name:<flowplan-id>
```

Read-only. Prints id, name, description, step count, and the first 5 steps.

### Components

#### `create:component` — Add a shared component

```bash
flowkit create:component --name:<PascalName> --path:<lib/components/...> [--desc:"..."]
```

`--name` must be PascalCase (`^[A-Z][A-Za-z0-9]+$`, 2+ characters), e.g. `StatusBadge`. Writes `<path>/<Name>.tsx` from a template, registers it in `.flowkit/components.json`, and — if a barrel `index.ts` exists at or above `--path` — appends `export { default as <Name> } from './...'` to it (skipped if already exported). If no barrel is found, prints a reminder to add the export manually or run `add:export`.

#### `remove:component` — Remove a shared component

```bash
flowkit remove:component --name:<ComponentName> [--path:<lib/components/...>]
```

Deletes the `.tsx` file (if present — does not error if it's already gone) and removes both the barrel export and the `.flowkit/components.json` entry. Looks up the path from the registry unless `--path` is given explicitly.

#### `components:find` — Look up a component

```bash
flowkit components:find --name:<ComponentName>
```

Read-only. Checks the registry first, then falls back to scanning `lib/components/` on disk if not registered. Suggests `create:component` if found nowhere, or `components:scan` if found on disk but unregistered.

#### `components:ls` — List registered components

```bash
flowkit components:ls [--path:<prefix>]
```

Read-only. Lists every registered component, marking whether its file actually exists on disk, optionally filtered to a path prefix.

#### `components:scan` — Sync the registry from disk

```bash
flowkit components:scan
```

Walks `lib/components/` for any `.tsx` file starting with an uppercase letter (excluding `index.*`) and registers any not already known. Use after manually adding component files outside `create:component`.

#### `add:export` — Add a barrel export

```bash
flowkit add:export --barrel:<path/to/index.ts> --name:<ExportName>
```

Appends `export { default as <Name> } from './<Name>'` to the given barrel file. The source file (`<Name>.tsx` or `.ts`) must already exist next to the barrel. No-ops (not an error) if the export already exists.

#### `list:exports` — List a barrel's exports

```bash
flowkit list:exports --barrel:<path/to/index.ts>
```

Read-only. Lists every `export { ... } from '...'` line in the barrel file.

### `promote:flow` — Extract a fork into its own flowplan

```bash
flowkit promote:flow --flowplan:<path> --fork:"Fork label" [--as:<new-id>]
```

Finds the fork by an exact match on `label: "Fork label"` **(double-quoted only** — a single-quoted label in the source, like the ones in this doc's own [FlowPlan anatomy](#flowplan-anatomy) example, will not match) and writes its `steps[]` into a brand-new flowplan file. Does **not** edit the source file — it prints the exact `{ ref: "<new-id>" }` snippet to paste in by hand, replacing the fork. `--as` sets the new flowplan's id explicitly; otherwise it's derived by slugifying the fork label.

---

## Export

> **Works in every mode** (repo, flat, multi-workspace) as of 2026-07-12. `handoff` remains repo-mode only — it zips the dev repo for developer handoff, a different feature from the standalone export.

### `export` — Export as standalone HTML

```bash
flowkit export
flowkit export --workspace:<name>
flowkit export --profile:<name>
```

A single guided flow, identical in every mode:

1. **Workspace step** — only asked when there's more than one candidate: repo mode with 2+ workspaces in `workspaces/`, or multi-workspace consumer mode with 2+ entries in `flowkit.workspaces`. Flat mode never asks (one implicit workspace). Repo mode / multi-workspace mode with exactly one workspace also skips it. Pass `--workspace:<name>` to skip the prompt explicitly.
2. **Profile step** — always asked unless `--profile:<name>` is given. Lists "Default (full export)" plus any named profiles declared in `flowkit.json`'s `exportProfiles` (see [Export profiles](#export-profiles) below).

Runs two pre-flight checks before building. Export is blocked if either fails:

| Check                       | What it catches                                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript (`tsc --noEmit`) | Type errors, missing imports                                                                                                           |
| ESLint                      | Unused vars, hook violations, bad patterns — **skipped** (with a notice) if the project has no ESLint config, rather than hard-failing |

Every export always ships the full codebase — there's no FlowLens include/exclude distinction right now (removed 2026-07-12 pending a proper feature-gating design; see `temp-docs/flowkit-configs-plans.md` for why).

**Output location:** defaults to `dist-standalone/` in repo mode, `dist/` in consumer mode — both already gitignored. Override per-profile via `flowkit.json`'s `exportPath` (see below).

### Export profiles

Optional `flowkit.json` at the project root (repo `ROOT`, or the consumer project root in flat/multi-workspace mode) — plain JSON, not authored via `defineConfig()`:

```json
{
  "exportDefaults": {
    "exportPath": "./dist"
  },
  "exportProfiles": {
    "client-demo": {
      "exportPath": "./output",
      "exportName": "{workspace}-{profile}-{timestamp}"
    }
  }
}
```

- `exportProfiles.<name>.exportPath` / `exportName` override `exportDefaults`, which falls back to the built-in default output location (see above) and filename template `{workspace}-{profile}-{timestamp}`.
- `exportName` tokens: `{workspace}`, `{profile}`, `{date}`, `{time}`, `{timestamp}`.
- Missing `flowkit.json` entirely → treated as empty (`exportDefaults: {}`, `exportProfiles: {}`), not an error — the profile prompt just shows "Default (full export)" with nothing else to pick.
- In multi-workspace mode, profiles are shared across all workspaces (one flat set, not per-workspace).

**Consumer mode also needs `vite-plugin-singlefile`** — auto-installed on first export if missing from the project's own `node_modules` (prints a one-line notice first).

---

## Sessions (FlowTracer / FlowLens)

Works in all three modes — confirmed via `sessions:ls` in a scaffolded flat-mode project. FlowTracer records prototype sessions to the browser's IndexedDB; FlowLens replays them. These commands manage the **committed session library** on disk — `workspaces/<ws>/lib/flowLens/sessions/<study>/` (repo mode) or `lib/flowLens/sessions/<study>/` at the workspace root (consumer mode).

> **Browser → disk bridge:** The CLI cannot read IndexedDB directly. Export a session from the app's Export overlay to get a `.json` file, then import it with `sessions:import`. Alternatively, in dev mode, use the Archive icon in the FlowLens Recorded tab to promote a session to the library without leaving the browser.

All commands default to the **active** workspace (see [Authoring](#authoring) above for how "active" resolves per mode); append `:<name>` to target another workspace (e.g. `sessions:ls:other`) — note this is a different convention from Authoring's `--workspace:<name>` flag.

---

### Studies

Sessions are organised into named **study rounds** (e.g. "Initial Study", "Round 2 — Post Revision"). Each study maps to a subdirectory under `sessions/`. The `activeStudyId` in `studies.json` determines where the next import or in-browser Save lands.

### `sessions:study:ls` — List studies

```bash
flowkit sessions:study:ls
flowkit sessions:study:ls:<ws>
```

Lists all studies with session count, active marker (●), and archive status.

### `sessions:study:new` — Create a study

```bash
flowkit sessions:study:new:<ws> "Round 2 — Post Revision"
flowkit sessions:study:new:<ws> "Round 2" --desc "After home screen redesign"
```

Slugifies the name to an id (`round-2-post-revision`), creates the directory, and sets it as the active study.

### `sessions:study:active` — Get or set the active study

```bash
flowkit sessions:study:active:<ws>              # print current
flowkit sessions:study:active:<ws> "Round 2"    # set by name or id
```

### `sessions:study:archive` — Archive a study

```bash
flowkit sessions:study:archive:<ws> "Initial Study"
flowkit sessions:study:archive:<ws> "initial-study" --force   # skip confirm
```

Sets `status: archived` and clears `activeStudyId` if it pointed here. Sessions are preserved on disk.

---

### `sessions:ls` — List committed sessions

```bash
flowkit sessions:ls            # active workspace, all studies
flowkit sessions:ls:other      # specific workspace
flowkit sessions:ls --study "Round 2"   # filter to one study
flowkit sessions:ls --json     # machine-readable output
```

Shows name, study, date, event count, screen count, and quality% per session.

### `sessions:import` — Import an exported session

```bash
flowkit sessions:import ~/Downloads/run.flowkit-session.json
flowkit sessions:import run.json --study "Round 2"   # target specific study
flowkit sessions:import run.json --force             # override workspaceId mismatch
```

Validates the file is a `SessionExport`, checks `meta.workspaceId` matches the target, warns if the session's screen ids don't exist in the workspace (replay disabled — analytics still work), dedupes by `meta.id`, and files it into the active study (or `--study` override).

### `sessions:export` / `se` — Export a committed session back to disk

The colon segment (if present) is the **workspace**, not the session — the session id/name/filename is always a separate argument:

```bash
flowkit sessions:export <id|name|file>              # active workspace
flowkit sessions:export:<ws> <id|name|file>          # specific workspace
flowkit sessions:export:<ws> <id|name|file> --dest ./handoffs/
flowkit se:<ws> <id|name|file>                       # short alias, same rule
```

Reads a session from the committed library by id, name, or filename and writes it to `--dest` (default: `./<slug>-<id>.flowkit-session.json`).

### `sessions:check` — Validate the library

```bash
flowkit sessions:check
```

Flags malformed JSON, wrong `workspaceId`, duplicate ids, and cross-workspace screen mismatches. Exits non-zero on errors.

| Check        | What it catches                                          |
| ------------ | -------------------------------------------------------- |
| JSON / shape | Unparseable files, missing `meta.id`, non-array `events` |
| Workspace    | `meta.workspaceId` ≠ the target workspace                |
| Duplicates   | Two files sharing a `meta.id`                            |
| Screens      | No recorded screen id exists in the workspace            |

### `sessions:stats` — Library roll-up

```bash
flowkit sessions:stats
```

Terminal summary: session count, total events, avg quality, completion rate, and top frustrated screens.

### `sessions:sample` — Generate a synthetic session

```bash
flowkit sessions:sample
```

Writes a valid `SessionExport` (screens pulled from the workspace's flows, marked `[test]`) into the active study. Remove it with `sessions:rm`.

### `sessions:rm` — Remove a committed session

```bash
flowkit sessions:rm <id | name | file.json>
```

### `sessions:purge` / `sp` — Bulk remove sessions

```bash
flowkit sessions:purge --test-only
flowkit sessions:purge --older-than:30
flowkit sessions:purge --test-only --older-than:30 --study "Initial Study"
flowkit sp --test-only
```

Removes sessions matching the filter criteria. Shows a count of what will be deleted and asks `[y/N]` before proceeding.

- `--test-only` — remove sessions where `meta.isTestMode: true`
- `--older-than:<N>` — remove sessions older than N days
- `--study <name|id>` — scope the purge to one study
- Flags combine (AND'd)

### `sessions:report` — Generate analytics report

```bash
flowkit sessions:report
flowkit sessions:report:<ws>
flowkit sessions:report:<ws> --format both          # JSON + Markdown
flowkit sessions:report:<ws> --study "Round 2"      # scope to one study
flowkit sessions:report:<ws> --format md --agent    # append MD to .agent/project.md
flowkit sessions:report:<ws> --dest ./custom-dir/
```

Aggregates committed (non-test) sessions into a report. Output lands in `workspaces/<ws>/lib/flowLens/reports/` (gitignored) unless `--dest` overrides.

Flags:

| Flag                      | Description                                                            |
| ------------------------- | ---------------------------------------------------------------------- |
| `--format json\|md\|both` | Output format. Default: `json`                                         |
| `--study <name\|id>`      | Scope to sessions from one study                                       |
| `--agent`                 | Append Markdown brief to `.agent/project.md` instead of writing a file |
| `--dest <path>`           | Override output directory                                              |

JSON report shape:

```json
{
  "workspace": "my-app",
  "study": "round-2",
  "sessionCount": 12,
  "avgQuality": 74,
  "completionRate": 0.67,
  "topFrustratedScreens": [
    ["cart-screen", 5],
    ["checkout-screen", 3]
  ],
  "sessionList": [{ "id": "...", "name": "...", "startTime": "..." }]
}
```

**Aliases (backward compat):**

```bash
flowkit lens:report:<ws>              # same as --format json
flowkit lr:<ws>
flowkit sessions:brief:<ws>          # same as --format md
flowkit sessions:brief:<ws> --append # same as --agent
```

---

## Feedback

Works in all three modes — confirmed via `feedback:ls` in a scaffolded flat-mode project. Feedback comments live in the browser's local storage during active sessions. These commands let you commit a snapshot to disk (`workspaces/<ws>/.flowkit-feedback.json` in repo mode, `.flowkit-feedback.json` at the workspace root in consumer mode) so it travels with the workspace and can be reviewed without opening the app.

> **UI bridge:** The feedback panel's "Export" button writes a JSON file and can emit the corresponding `flowkit feedback:import <file>` command — paste it to commit the snapshot.

### `feedback:import` / `fi` — Commit feedback from a file

```bash
flowkit feedback:import ./feedback-export.json
flowkit fi ./feedback-2024-01-15.json
```

Reads a feedback JSON file (exported from the feedback panel), validates its shape (`{ comments: FeedbackComment[] }`), and writes it to `workspaces/<ws>/.flowkit-feedback.json` as the committed snapshot.

### `feedback:dump` / `fd` — Export committed feedback to disk

```bash
flowkit feedback:dump
flowkit feedback:dump --dest ./handoffs/
flowkit fd
```

Reads the committed snapshot at `workspaces/<ws>/.flowkit-feedback.json` and writes it to `--dest` (default: `./feedback-<ws>-<date>.json`). Use this to hand off a feedback archive or re-import into another workspace.

### `feedback:ls` — List committed comments

```bash
flowkit feedback:ls
```

Lists comments from the committed snapshot: reviewer, screen, status, short text, date.

---

## Agent onboarding

Every workspace ships an **agent-ready** file set so a coding agent can start building immediately without reading the whole codebase. All files are generated from a single platform spec (`scripts/platform/agent-spec.js`).

> ⚠️ **Known gap (as of 2026-07-10, alias names updated 2026-07-12): `agent:sync` generates repo-mode-only content even in consumer mode.** Confirmed live in a scaffolded flat-mode project — `.agent/platform.md` points at `Documentation/*.md` files that don't ship to consumer projects at all, and references `@flowkit-shared`/`@flowkit` path aliases that don't exist outside this repo (consumer-mode screens import from `'flowkit'` instead — see [Writing a screen](../README.md#writing-a-screen)). The command itself runs successfully and produces valid files (`INDEX.md`, `rules.md`, `platform.md`, memory file) — the _content_ of `platform.md` just assumes repo mode unconditionally. Treat its pointers/import-path examples as reference-only in consumer mode until this is fixed.

**Read order for a cold agent:**

1. **`AGENTS.md`** — auto-ingested by most coding-agent tools; identity, read-order, hardest directives. One agent-agnostic file — there is no per-tool choice (`CLAUDE.md`/`.cursor/rules` targets were removed; a workspace scaffolded before this change may still have a leftover `CLAUDE.md` on disk from the old system, but new/resynced workspaces only ever get `AGENTS.md`)
2. **`.agent/INDEX.md`** — the map: `Task → Action → Detail`
3. **`.agent/rules.md`** — full directive set (`NEVER` / `ALWAYS` / `TO <task> → <action>`)
4. **`.agent/platform.md`** — terse platform reference, rows pointing to `Documentation/*.md`
5. **`.agent/project.md`** — hand-owned product brief; **never** regenerated

### `agent:sync` — Regenerate from the spec

```bash
flowkit agent:sync                       # active workspace
flowkit agent:sync:<name>                # specific workspace
```

Re-emits `.agent/INDEX.md`, `rules.md`, `platform.md`, and `AGENTS.md`. Never touches `project.md`. Run after platform changes.

---

## Build (developer handoff)

> **Repo mode only** — see the note at the top of [Export](#export).

### `handoff` — Generate developer handoff zip

```bash
flowkit handoff
flowkit handoff:<name>
```

Builds the selected workspace into a self-contained React app with no Flowkit dependency.

Output: `<name>-handoff-<date>.zip` at the project root.

---

## Import aliases

**Repo mode:**

| Alias                | Resolves to            |
| -------------------- | ---------------------- |
| `@flowkit/`          | `src/`                 |
| `@flowkit-core/`     | `src/core/`            |
| `@flowkit-features/` | `src/features/`        |
| `@flowkit-shared/`   | `src/shared/`          |
| `@flowkit-kit/`      | `src/kits/shared/`     |
| `@flowlens/`         | `src/modes/flowlens/`  |
| `@workspace/`        | `workspaces/<active>/` |

(Renamed from `@flowkit`/`@core`/`@features`/`@shared`/`@kit` on 2026-07-12; `@flowlens` and `@workspace` unchanged.)

**Consumer mode (flat/multi-workspace):** no `@flowkit*`/`@workspace` aliases — screens and `workspace.ts` import directly from the `'flowkit'` package instead (`import { defineConfig } from 'flowkit'`, `import type { FlowScreenProps } from 'flowkit'`). The `flowkit/vite` plugin (`scripts/helpers/vite-plugin.js`) generates equivalent virtual modules (`virtual:flowkit/config|screens|flowplans|workspace`) from `workspace.ts` + filesystem globs, resolved relative to the active workspace folder in multi-workspace mode (the first entry in `flowkit.workspaces` by default) or project root in flat mode.

---

## State

**Repo mode:** flowkit tracks the active workspace in `src/workspaces.json`/`src/workspaces.ts`. CLI state is stored in `scripts/.flowkit-state.json` — local only, not committed.

**Consumer mode:** mode and workspace list live in the project's own `package.json` under the `flowkit` key (see [Workspaces (flat/multi-workspace consumer mode)](#workspaces-flatmulti-workspace-consumer-mode)) — committed, not local state. `flowkit.workspaces` is an object keyed by workspace name with an explicit `path` (e.g. `{ "workspace-1": { "path": "workspace-1" } }`), not just a name list — folder location is declared, not assumed. There is no separate active-workspace pointer yet; the first entry (by key order) is always what `npm run dev`/`npm run build` serve.

---

## Quick reference

Commands grouped by item type. Click the heading to jump to the full section.

### Meta

| Command   | Alias               | Description                    |
| --------- | ------------------- | ------------------------------ |
| `help`    | `h`, `-h`, `--help` | Show CLI usage help            |
| `version` | `-v`, `--version`   | Show installed flowkit version |

### [Workspaces (repo mode)](#workspaces-repo-mode)

| Command                     | Alias | Description                             |
| --------------------------- | ----- | --------------------------------------- |
| `new-workspace[:<name>]`    | `nw`  | Create workspace (repo mode only)       |
| `remove-workspace[:<name>]` | `rw`  | Remove workspace (repo mode only)       |
| `watch[:<name>]`            | —     | Watch for file changes (repo mode only) |
| `status[:<name>]`           | —     | Workspace health snapshot (all modes)   |

### [Workspaces (flat/multi-workspace consumer mode)](#workspaces-flatmulti-workspace-consumer-mode)

| Command                              | Alias | Description                                    |
| ------------------------------------ | ----- | ---------------------------------------------- |
| `convert:multi [--name:<id>]`        | —     | Convert flat mode to multi-workspace mode      |
| `convert:flat [--from:<id>] [--all]` | —     | Collapse multi-workspace mode back to flat     |
| `create:workspace [--name:<id>]`     | —     | Add a workspace (multi-workspace mode only)    |
| `remove:workspace [--name:<id>]`     | —     | Remove a workspace (multi-workspace mode only) |
| `rename:workspace <old> <new>`       | —     | Rename a workspace (multi-workspace mode only) |

### [FlowPlans](#flowplans)

| Command   | Alias   | Description    |
| --------- | ------- | -------------- |
| `plan:ls` | `fp:ls` | List flowplans |

### [Check](#check)

| Command            | Description                                |
| ------------------ | ------------------------------------------ |
| `check`            | Run all 5 domain checkers, combined report |
| `check:screens`    | Screen export shape / `screenMeta`         |
| `check:config`     | Workspace config vs. `flows/` on disk      |
| `check:components` | Component registry / barrel exports        |
| `check:db`         | Mock db exports                            |
| `check:flowplans`  | FlowPlan structure / step references       |

### [Authoring](#authoring)

| Command            | Alias | Description                            |
| ------------------ | ----- | -------------------------------------- |
| `create:flow`      | —     | Add a flow                             |
| `remove:flow`      | —     | Remove a flow (`--force` if non-empty) |
| `list:flows`       | —     | List flows                             |
| `create:screen`    | —     | Add a screen to a flow                 |
| `remove:screen`    | —     | Remove a screen                        |
| `rename:screen`    | —     | Rename a screen                        |
| `move:screen`      | —     | Move a screen to a different flow      |
| `list:screens`     | —     | List screens                           |
| `screen:info`      | —     | Show screen metadata                   |
| `add:step`         | —     | Append a step to a flowplan            |
| `remove:step`      | —     | Remove a step by index                 |
| `list:steps`       | —     | List a flowplan's steps                |
| `flowplan:info`    | —     | Show flowplan summary                  |
| `create:component` | —     | Add a shared component                 |
| `remove:component` | —     | Remove a shared component              |
| `components:find`  | —     | Look up a component                    |
| `components:ls`    | —     | List registered components             |
| `components:scan`  | —     | Sync the registry from disk            |
| `add:export`       | —     | Add a barrel export                    |
| `list:exports`     | —     | List a barrel's exports                |
| `promote:flow`     | —     | Extract a fork into its own flowplan   |

### [Sessions](#sessions-flowtracer--flowlens)

| Command                                   | Alias | Description                                                                            |
| ----------------------------------------- | ----- | -------------------------------------------------------------------------------------- |
| `sessions:ls`                             | —     | List committed sessions                                                                |
| `sessions:import <file>`                  | —     | Import a session into committed library                                                |
| `sessions:export[:<ws>] <id\|name\|file>` | `se`  | Export a committed session to disk (workspace via colon, target always a separate arg) |
| `sessions:check`                          | —     | Validate the session library                                                           |
| `sessions:stats`                          | —     | Library roll-up stats                                                                  |
| `sessions:sample`                         | —     | Generate a synthetic test session                                                      |
| `sessions:rm <id\|name>`                  | —     | Remove a committed session                                                             |
| `sessions:purge`                          | `sp`  | Bulk remove sessions by filter                                                         |
| `sessions:report`                         | —     | Generate JSON/MD analytics report                                                      |
| `sessions:brief`                          | —     | _(alias)_ sessions:report --format md                                                  |
| `lens:report`                             | `lr`  | _(alias)_ sessions:report --format json                                                |
| `sessions:study:ls`                       | —     | List studies                                                                           |
| `sessions:study:new`                      | —     | Create a new study                                                                     |
| `sessions:study:active`                   | —     | Get or set the active study                                                            |
| `sessions:study:archive`                  | —     | Archive a study                                                                        |

### [Feedback](#feedback)

| Command                  | Alias | Description                       |
| ------------------------ | ----- | --------------------------------- |
| `feedback:import <file>` | `fi`  | Commit feedback from a JSON file  |
| `feedback:dump`          | `fd`  | Export committed feedback to disk |
| `feedback:ls`            | —     | List committed comments           |

### [Export & Handoff](#export)

| Command                                          | Alias | Description                                               |
| ------------------------------------------------ | ----- | --------------------------------------------------------- |
| `export [--workspace:<name>] [--profile:<name>]` | —     | Standalone HTML export — guided flow, works in every mode |
| `handoff[:<name>]`                               | —     | Developer handoff zip — **repo mode only**                |

### [Agent](#agent-onboarding)

| Command               | Alias | Description                      |
| --------------------- | ----- | -------------------------------- |
| `agent:sync[:<name>]` | —     | Regenerate agent files from spec |
