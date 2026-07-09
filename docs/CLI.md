# flowkit CLI

Command-line interface for managing workspaces, flows, screens, FlowPlans, sessions, and workspace data.

## Setup

```bash
npm install
npm link          # makes `flowkit` available globally in your shell
```

Or run without linking:

```bash
node scripts/flowkit.js <command>
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

**Flags** follow the same `:` pattern: `--kit:apple`, `--lang:ts`, `--agent:claude`.

**Help** — any of these work:

```bash
flowkit
flowkit -h
flowkit help
```

---

## Workspaces

### `nw` / `new-workspace` — Create workspace

```bash
flowkit nw
flowkit nw:<name>
flowkit nw:<name> --kit:<name> --lang:ts --agent:claude
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
  CLAUDE.md / AGENTS.md    ← agent memory file (per --agent flag)
  flowkit.config.ts
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
| `--agent:claude`      | Write agent memory to `CLAUDE.md`                                                   |
| `--agent:agents`      | Write agent memory to `AGENTS.md` (cross-tool, default)                             |
| `--agent:cursor`      | Write agent memory to `.cursor/rules/flowkit.mdc`                                   |
| `--agent:none`        | `.agent/` docs only — no memory file                                                |

Kits are applied via the `@kit` CSS alias — no files are copied into the workspace. The selected kit is stored in `src/workspaces.ts` and applied as a `data-kit` attribute on the preview canvas at runtime.

### `flowkit.config.ts` anatomy

The workspace manifest is authored with `defineConfig()` from `@platform/core/config`:

```typescript
import { defineConfig } from '@platform/core/config'

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
| `flows`              | Explicit flow ordering (flat-layout workspaces)                                   |
| `screenOrder`        | Explicit per-flow screen ordering, keyed by flow id                               |
| `projects`           | Nested-layout only — per-project `flows`/`screenOrder` (skip for flat workspaces) |

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

## FlowPlans

FlowPlans are TypeScript files that define scripted journeys with conditional forks, db patches, and action notes. They are compiled at runtime by `compileFlowplan.ts`.

**Storage location:** `workspaces/<ws>/flowplans/<Name>.ts`

### FlowPlan anatomy

A FlowPlan is authored with `defineFlow()` from `@platform/core/config`:

```typescript
import { defineFlow } from '@platform/core/config'

export default defineFlow({
  id: 'checkout-flow', // required — unique plan id
  name: 'Checkout', // required — display name
  description: 'Happy path.', // optional
  tags: ['buyer', 'status:approved'], // optional — prefixes: role: type: state: status:

  // Screen the device home button targets while this plan is playing.
  // Optional — falls back to the workspace's `startScreen` (see flowkit.config.ts) when unset.
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

### `plan:check` / `fp:check` — Validate flowplans

```bash
flowkit plan:check
flowkit fp:check
```

Static lint — validates that each flowplan file exports a valid object with `id`, `name`, and `steps[]`. Does not run the compiler. Exit code 0 = clean, 1 = errors.

- Exits 1 if the `flowplans/` directory exists but contains no plan files (prevents a silent green gate)
- This command is wired into `npm run prebuild` — a broken or missing plan blocks the production build

---

## Authoring

CRUD commands for editing the content inside a workspace — flows, screens, flowplan steps, and shared components. Every command accepts `--workspace:<name>` (optional; defaults to the active workspace) and exits 1 with a red `✗` message on any validation failure. IDs must be kebab-case (`^[a-z][a-z0-9-]*$`) unless noted otherwise.

### Flows

#### `create:flow` — Add a flow

```bash
flowkit create:flow --name:<flow-id>
```

Creates `flows/<flow-id>/` and registers it in `flowkit.config.ts` (`flows[]` + an empty `screenOrder[flow-id]`). If `--name` is omitted, prompts interactively. Rolls back the created directory if registration fails.

Prints `Next: flowkit create:screen --flow:<flow-id> --name:<first-screen> --label:"Screen Name"` on success.

#### `remove:flow` — Remove a flow

```bash
flowkit remove:flow --name:<flow-id> [--force]
```

Unregisters the flow from `flowkit.config.ts` and deletes `flows/<flow-id>/`. Refuses if the flow directory contains any screens unless `--force` is passed.

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

Creates `flows/<flow-id>/<screen-id>/<PascalName>Screen.tsx` from a template and registers it in `flowkit.config.ts` (`screenOrder.<flow-id>[]`). The flow must already exist. `--label` defaults to a Title Case version of the screen id if omitted.

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

### `export` — Export workspace as standalone HTML viewer

```bash
flowkit export
flowkit export:<name>
flowkit export:all
```

Prompts with a single list — all workspace names plus "All workspaces" at the bottom. Select one to export that workspace; select "All workspaces" to generate one file per workspace.

Runs three pre-flight checks before building. Export is blocked if any fail:

| Check                       | What it catches                            |
| --------------------------- | ------------------------------------------ |
| TypeScript (`tsc --noEmit`) | Type errors, missing imports               |
| ESLint                      | Unused vars, hook violations, bad patterns |
| FlowPlan check              | Invalid or missing flowplan files          |

By default the standalone export strips FlowLens (replay mode) so the bundle stays small — session recording still works, but there's no in-app replay UI. Use `export:full` to include the FlowLens replay/analytics mode.

**Output location:** `dist-standalone/<outDir>/` as configured in `vite.config.standalone.ts`.

---

## Sessions (FlowTracer / FlowLens)

FlowTracer records prototype sessions to the browser's IndexedDB; FlowLens replays them. These commands manage the **committed session library** on disk — `workspaces/<ws>/lib/flowLens/sessions/<study>/`.

> **Browser → disk bridge:** The CLI cannot read IndexedDB directly. Export a session from the app's Export overlay to get a `.json` file, then import it with `sessions:import`. Alternatively, in dev mode, use the Archive icon in the FlowLens Recorded tab to promote a session to the library without leaving the browser.

All commands default to the **active** workspace; append `:<name>` to target another (e.g. `sessions:ls:other`).

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

```bash
flowkit sessions:export:<id|name>
flowkit sessions:export:<id|name> --dest ./handoffs/
flowkit se:<name>
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

Feedback comments live in the browser's local storage during active sessions. These commands let you commit a snapshot to disk (`workspaces/<ws>/.flowkit-feedback.json`) so it travels with the workspace and can be reviewed without opening the app.

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

**Read order for a cold agent:**

1. **memory file** (`CLAUDE.md` / `AGENTS.md` / `.cursor/rules/flowkit.mdc`) — auto-ingested; identity, read-order, hardest directives
2. **`.agent/INDEX.md`** — the map: `Task → Action → Detail`
3. **`.agent/rules.md`** — full directive set (`NEVER` / `ALWAYS` / `TO <task> → <action>`)
4. **`.agent/platform.md`** — terse platform reference, rows pointing to `Documentation/*.md`
5. **`.agent/project.md`** — hand-owned product brief; **never** regenerated

### `agent:sync` — Regenerate from the spec

```bash
flowkit agent:sync                       # active workspace, keep current agent
flowkit agent:sync:<name>                # specific workspace
flowkit agent:sync --agent:cursor        # switch agent (removes old memory file)
```

Re-emits `.agent/INDEX.md`, `rules.md`, `platform.md`, and the memory file. Never touches `project.md`. Run after platform changes.

---

## Build (developer handoff)

### `handoff` — Generate developer handoff zip

```bash
flowkit handoff
flowkit handoff:<name>
```

Builds the selected workspace into a self-contained React app with no Flowkit dependency.

Output: `<name>-handoff-<date>.zip` at the project root.

---

## Import aliases

| Alias         | Resolves to            |
| ------------- | ---------------------- |
| `@platform/`  | `src/`                 |
| `@workspace/` | `workspaces/<active>/` |

---

## State

flowkit tracks the active workspace in `src/workspaces.ts`. CLI state is stored in `scripts/.flowkit-state.json` — local only, not committed.

---

## Quick reference

Commands grouped by item type. Click the heading to jump to the full section.

### [Workspaces](#workspaces)

| Command                     | Alias | Description               |
| --------------------------- | ----- | ------------------------- |
| `new-workspace[:<name>]`    | `nw`  | Create workspace          |
| `remove-workspace[:<name>]` | `rw`  | Remove workspace          |
| `watch[:<name>]`            | —     | Watch for file changes    |
| `status[:<name>]`           | —     | Workspace health snapshot |

### [FlowPlans](#flowplans)

| Command      | Alias      | Description                      |
| ------------ | ---------- | -------------------------------- |
| `plan:ls`    | `fp:ls`    | List flowplans                   |
| `plan:check` | `fp:check` | Validate flowplans (static lint) |

### [Authoring](#authoring)

| Command             | Alias | Description                            |
| -------------------- | ----- | --------------------------------------- |
| `create:flow`        | —     | Add a flow                              |
| `remove:flow`        | —     | Remove a flow (`--force` if non-empty)  |
| `list:flows`         | —     | List flows                              |
| `create:screen`      | —     | Add a screen to a flow                  |
| `remove:screen`      | —     | Remove a screen                         |
| `rename:screen`      | —     | Rename a screen                         |
| `move:screen`        | —     | Move a screen to a different flow       |
| `list:screens`       | —     | List screens                            |
| `screen:info`        | —     | Show screen metadata                    |
| `add:step`           | —     | Append a step to a flowplan             |
| `remove:step`        | —     | Remove a step by index                  |
| `list:steps`         | —     | List a flowplan's steps                 |
| `flowplan:info`      | —     | Show flowplan summary                   |
| `create:component`   | —     | Add a shared component                  |
| `remove:component`   | —     | Remove a shared component               |
| `components:find`    | —     | Look up a component                     |
| `components:ls`      | —     | List registered components              |
| `components:scan`    | —     | Sync the registry from disk             |
| `add:export`         | —     | Add a barrel export                     |
| `list:exports`       | —     | List a barrel's exports                 |
| `promote:flow`       | —     | Extract a fork into its own flowplan    |

### [Sessions](#sessions-flowtracer--flowlens)

| Command                      | Alias | Description                             |
| ---------------------------- | ----- | --------------------------------------- |
| `sessions:ls`                | —     | List committed sessions                 |
| `sessions:import <file>`     | —     | Import a session into committed library |
| `sessions:export:<id\|name>` | `se`  | Export a committed session to disk      |
| `sessions:check`             | —     | Validate the session library            |
| `sessions:stats`             | —     | Library roll-up stats                   |
| `sessions:sample`            | —     | Generate a synthetic test session       |
| `sessions:rm <id\|name>`     | —     | Remove a committed session              |
| `sessions:purge`             | `sp`  | Bulk remove sessions by filter          |
| `sessions:report`            | —     | Generate JSON/MD analytics report       |
| `sessions:brief`             | —     | _(alias)_ sessions:report --format md   |
| `lens:report`                | `lr`  | _(alias)_ sessions:report --format json |
| `sessions:study:ls`          | —     | List studies                            |
| `sessions:study:new`         | —     | Create a new study                      |
| `sessions:study:active`      | —     | Get or set the active study             |
| `sessions:study:archive`     | —     | Archive a study                         |

### [Feedback](#feedback)

| Command                  | Alias | Description                       |
| ------------------------ | ----- | --------------------------------- |
| `feedback:import <file>` | `fi`  | Commit feedback from a JSON file  |
| `feedback:dump`          | `fd`  | Export committed feedback to disk |
| `feedback:ls`            | —     | List committed comments           |

### [Export & Handoff](#export)

| Command                | Alias | Description                       |
| ---------------------- | ----- | --------------------------------- |
| `export[:<name>]`      | —     | Standalone HTML viewer            |
| `export:full[:<name>]` | —     | Standalone HTML + FlowLens replay |
| `handoff[:<name>]`     | —     | Developer handoff zip             |

### [Agent](#agent-onboarding)

| Command               | Alias | Description                      |
| --------------------- | ----- | -------------------------------- |
| `agent:sync[:<name>]` | —     | Regenerate agent files from spec |

