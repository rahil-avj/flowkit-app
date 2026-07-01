# Feature Management System — Architecture Plan

## Context

Flowkit is approaching v1. Until now every feature has been unconditionally available — no kill switches, no beta labels, no access tiers. Before v1 ships, we need a system that lets us:

- Hide a feature entirely (from the bundle or just the UI) by flipping one value
- Mark features as beta with a visible badge
- Express plan requirements per feature, even though everyone is on "free" right now
- Swap in a real entitlement backend later without touching feature call sites

This plan is intentionally **code-agnostic** — it describes the architecture and contracts, not the implementation. It should be used as the reference when the v1 feature list is locked and implementation begins.

---

## The Three Layers

The system has exactly three layers. Each has one job. They never bleed into each other.

```
┌──────────────────────────────────────────────┐
│  LAYER 1 — FEATURE REGISTRY                  │
│  One file. One entry per feature.            │
│  Edited by hand before each release.         │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│  LAYER 2 — ENTITLEMENT RESOLVER              │
│  "Does this user have access to X?"          │
│  Stub today. Swappable later.                │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│  LAYER 3 — FEATURE GATE                      │
│  Hook + component used at every call site.   │
│  The only thing features ever talk to.       │
└──────────────────────────────────────────────┘
```

---

## Layer 1 — Feature Registry

**What it is:** A single static config file listing every feature in the product. This is the file a developer edits before a release.

**Fields per feature:**

| Field     | Type                              | Purpose                                                    |
| --------- | --------------------------------- | ---------------------------------------------------------- |
| `id`      | string key                        | Stable identifier, never changes                           |
| `label`   | string                            | Human-readable name for badges/UI                          |
| `build`   | boolean                           | `false` = strip from bundle entirely (zero bytes shipped)  |
| `enabled` | boolean                           | `false` = in bundle but all entry points hidden at runtime |
| `beta`    | boolean                           | `true` = show beta badge; no access restriction            |
| `plan`    | `"free" \| "pro" \| "enterprise"` | Minimum plan required to access                            |

**Rules:**

- `build: false` takes precedence over everything — the feature simply does not exist
- `enabled: false` means the feature is dormant but present — useful for soft-disabling without a rebuild
- `beta: true` is purely cosmetic for now — no gating, just a badge
- `plan` is enforced by Layer 2, not here — this layer only declares the requirement

**Features to register at v1** _(fill in when list is locked):_

- `flowlens` — FlowLens replay & analytics mode
- `flowplans` — FlowPlan scripted journeys
- `feedback` — In-canvas feedback panel
- `flowTracer` — Session recording engine
- `flowDebugger` — Flow debug overlay
- `flowLibrary` — Flow library browser
- `simulator` — Device simulator controls

---

## Layer 2 — Entitlement Resolver

**What it is:** An interface (contract) with a stub implementation today and a real one later.

**The interface defines two questions:**

1. `getUserPlan()` → what plan does the current user have?
2. `canAccess(featureId)` → can this user access this feature right now?

**Today (stub):** Everyone is on `"free"`, everyone can access everything. The stub answers `true` to every access check. Wired in at app startup — the gate calls it internally, never called directly by features.

**Later (real implementation):** Write a new resolver that fetches the user's plan from your auth/billing backend. Swap it in at the single wiring point. Nothing else in the codebase changes.

**The bridge between features:** Features never import each other. If Feature A needs to know whether Feature B is available, it asks the gate (`useFeature("b")`), not Feature B directly. The resolver is the contract that makes this safe.

---

## Layer 3 — Feature Gate

**What it is:** The only interface features ever use. Two forms:

**Hook form** — for logic and conditional rendering:

```
const lens = useFeature("flowlens")
lens.available  → show/hide entry points
lens.beta       → show beta badge
lens.locked     → feature exists but user's plan doesn't cover it
```

**Component form** — for declarative wrapping:

```
<FeatureGate feature="flowlens">
  ...children only render when available...
</FeatureGate>
```

**What the gate does internally:**

1. Looks up the feature in the registry
2. Checks `build` and `enabled` — if either false, returns `available: false` immediately
3. Asks the resolver `canAccess()` — if false, sets `locked: true`
4. Returns the result

**What the gate does NOT do:** It does not render lock icons, upgrade prompts, or paywalls. That is the call site's responsibility. The gate only answers the question.

---

## Plan Tier Architecture (future-ready, not implemented now)

When auth and billing are added, the resolver plugs into this shape:

```
User record  →  plan: "free" | "pro" | "enterprise"
Feature def  →  plan: minimum required tier
Resolver     →  compares user.plan >= feature.plan
Gate         →  surfaces result as locked: true/false
```

Tiers are **ordered**: `enterprise > pro > free`. The registry's `plan` field is set today even though it has no runtime effect yet — the moment a real resolver is wired in, gating activates automatically with no feature-level changes needed.

---

## What Does NOT Belong Here

- A/B testing — different system entirely
- Analytics/event tracking per feature — belongs inside the feature
- A UI dashboard for managing flags — this is a dev-edited config file
- Remote runtime flags (LaunchDarkly-style) — out of scope for v1; `enabled` covers soft-disabling without a rebuild

---

## Files to Create at Implementation Time

| File                                | Layer | Contents                                                   |
| ----------------------------------- | ----- | ---------------------------------------------------------- |
| `src/core/features/registry.ts`     | 1     | Feature definitions, `FeatureId` type, `Plan` type         |
| `src/core/features/entitlements.ts` | 2     | `EntitlementProvider` interface + stub                     |
| `src/core/features/useFeature.ts`   | 3     | Hook — reads registry, calls resolver, returns gate result |
| `src/core/features/FeatureGate.tsx` | 3     | Component wrapper around the hook                          |
| `src/core/features/index.ts`        | —     | Barrel export                                              |

---

## Retrofit Pattern (when implementing)

For each existing feature:

1. Add an entry to the registry
2. Find the feature's top-level entry points — toolbar buttons, sidebar tabs, action center actions
3. Wrap each with `useFeature()` / `<FeatureGate>`
4. Remove any ad-hoc flags now covered by the registry (e.g. `FLOWLENS_AVAILABLE`, `LS_SESSIONS_ENABLED`)

Do **not** touch the feature's internal code. The gate lives at the boundary, not inside.

---

## Verification (at implementation time)

1. `enabled: false` on any feature → entry points disappear, no errors
2. `build: false` on any feature → feature code absent from bundle (`vite build --report`)
3. `beta: true` → beta badge appears at every entry point for that feature
4. `plan: "pro"` while stub returns `"free"` → `locked: true` from hook
5. Mock resolver returning `"pro"` → previously locked feature becomes accessible

---

# Flowkit CLI Redesign Plan

## Context

The current CLI has three problems:

1. **Commands only have shorthand aliases** (`nw`, `sw`, `rf`…) — no long-form (`new-workspace`, `switch`, `remove-flow`). Users can't guess commands.
2. **`-h` / `flowkit help` output is flat** — no grouping, examples are buried, no flag docs.
3. **The `selectFromList` guided picker crashes** (`process.stdin.setRawMode` not a function) in VS Code terminal, piped contexts, and Node 24 non-TTY environments — breaking every guided command.
4. **Reordering is awkward** — `co 3-1` syntax is opaque. User wants an array-literal syntax: `flowkit order flows [auth, onboarding, home]` or a way to receive an order from the UI and apply it to disk.
5. **Two stale migrations** (`migrate:nav`, `migrate:router`) clutter the help with dead weight.
6. **Several proposed commands** from the audit are worth adding: `status`, `dup`, `sessions:export`, `sessions:purge`.

---

## Design Decisions

### A — Dual alias system (short + long, everywhere)

Every command gets both forms. The parser already strips leading `-` and splits on `:` — extend it to also match long-form words.

| Short     | Long                            |
| --------- | ------------------------------- |
| `nw`      | `new-workspace`                 |
| `sw`      | `switch` / `switch-workspace`   |
| `rw`      | `remove-workspace`              |
| `nf`      | `new-flow`                      |
| `rf`      | `remove-flow`                   |
| `ns`      | `new-screen`                    |
| `rs`      | `remove-screen`                 |
| `rn`      | `rename` / `rename-screen`      |
| `ls`      | `list`                          |
| `co`      | `order` / `reorder`             |
| `export`  | `export` (already descriptive)  |
| `handoff` | `handoff` (already descriptive) |

Implementation: expand the `if/else` dispatch chain in `flowkit.js` to match both aliases per branch. No new abstraction needed.

### B — `-h` and `flowkit help` parity

Both `flowkit -h` and `flowkit help` call `cmdHelp()`. Currently `--help` works but `-h` doesn't parse correctly (the `cmd()` function strips one leading `-`, so `-h` becomes `cmd=h` which falls through to the unknown-command error).

Fix: add `p.cmd === "h"` to the help dispatch check in `flowkit.js` line 330.

### C — Help redesign

Rewrite `cmdHelp()` with:

- Grouped sections with clear headers
- Both aliases shown: `nw` / `new-workspace`
- Flag docs inline per command
- A "Quick start" examples block at the top, not the bottom
- Active workspace shown at top

### D — Fix `selectFromList` for non-TTY environments

**File:** `scripts/lib/ui.js`

Guard `setRawMode` with `process.stdin.isTTY`. When not a TTY, fall back to a numbered readline list:

```js
export function selectFromList(items, _onSelect) {
  if (process.stdin.isTTY) {
    // existing arrow-key implementation (unchanged)
    return new Promise((resolve) => { ... });
  }
  // Non-TTY fallback: numbered list via readline
  return new Promise((resolve) => {
    items.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Select (1–${items.length}): `, (ans) => {
      rl.close();
      const n = parseInt(ans.trim()) - 1;
      resolve(items[Math.max(0, Math.min(n, items.length - 1))]);
    });
  });
}
```

### E — Reorder command redesign

Replace the cryptic `3-1` move-pair syntax with an **array literal** syntax that's readable and matches how a UI would send orders.

**New syntax:**

```bash
flowkit order flows [auth, onboarding, home, settings]
flowkit order screens:auth [LoginScreen, SignUpScreen, ForgotPasswordScreen]
```

- `flowkit order flows [...]` — reorders flows by name (label or id), rebuilds router
- `flowkit order screens:<FlowName> [...]` — reorders screens within a flow in FLOW_ORDER, rebuilds router
- `flowkit order` (no args) — prints current order of flows + screens, no interactive picker

This also enables the UI bridge the user mentioned: the UI can emit `flowkit order flows [...]` as a bash command with the new order from a drag-and-drop interface.

Keep `co` as a hidden alias for `order flows` so existing scripts don't break. Remove `co` from the help output.

**Parser for array literal:**

```js
// Extract content between [ and ] from args
function parseOrderArray(rawArgs) {
  const joined = rawArgs.join(' ')
  const m = joined.match(/\[([^\]]+)\]/)
  if (!m) return null
  return m[1]
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}
```

### F — New commands to add

**`flowkit status`** — health snapshot for active workspace:

- Active workspace name
- Flow count + screen count
- Whether router is up to date (check mtime of `_playFlow.ts` vs `router.tsx`)
- Agent file staleness (reuse logic from `cmdAgentCheck`)
- Session count + avg quality (reuse logic from `cmdSessionsStats`)
- Whether `VITE_ENABLE_FLOWLENS` is set

**`flowkit dup:<FlowName> <NewName>`** / **`flowkit duplicate:<FlowName> <NewName>`**:

- Copy `flows/<slug>/` → `flows/<newslug>/`
- In the copied `_playFlow.ts`: update `id` and `label` to new name
- Register in FLOW_ORDER, rebuild router

**`flowkit sessions:export <id> [--dest <path>]`**:

- Read `src/modes/flowlens/library/<ws>/<file>.json`
- Write to `--dest` path or `./<id>.flowkit-session.json` by default
- Already have the file path from `cmdSessionsLs` logic

**`flowkit sessions:purge [--test-only] [--older-than <days>]`**:

- `--test-only`: remove all sessions where `isTestMode: true`
- `--older-than <N>`: remove sessions older than N days (compare `meta.startTime`)
- Both flags can combine
- Shows count + asks `[y/N]` before deleting

### G — Stale commands

- Hide `migrate:nav` and `migrate:router` from `cmdHelp()` — keep them functional but undocumented (escape hatches). They still work if called directly.
- `kit:check` — keep in help but move to bottom as a "Dev/internal" section, with a note about what "no override" means.

### H — FlowPlan CLI

FlowPlans are TypeScript files that live in `workspaces/<name>/projects/<project>/flowplans/`. They define scripted journeys with forks, db patches, and action notes. Currently they're managed entirely by hand. These commands give CLI scaffolding:

**`flowkit plan:new:<name> [--project:<slug>] [--flow:<flowId>]`** / **`fp:new`**

- Scaffold a new `<name>.ts` in `workspaces/<ws>/projects/<project>/flowplans/`
- If `--project` is omitted, guided list of existing projects (or offer to create one)
- If `--flow` is provided, pre-populate `steps[]` with the flow's screens (reads `_playFlow.ts`)
- Writes a commented template — the user fills in forks, db, notes

**`flowkit plan:ls [--project:<slug>]`** / **`fp:ls`**

- List all flowplans in the workspace (or filtered to a project)
- Shows: id, name, step count, file path

**`flowkit plan:check [--project:<slug>]`** / **`fp:check`**

- Validates flowplan files parse as valid TypeScript exports (using Node `--input-type=module` import check)
- Warns on missing `id`, `name`, `steps[]`, circular refs (static lint only — no runtime compilation)
- Exit code 0 = clean, 1 = errors

**`flowkit plan:rm:<name> [--project:<slug>]`** / **`fp:rm`**

- Remove a flowplan file after `[y/N]` confirmation

**Implementation note:** These are file operations only — no registry needed. The compile step happens at runtime in the browser via `compileFlowplan.ts`.

---

### I — FlowLens & FlowTracer CLI

**Architecture note:** FlowTracer sessions are captured in the browser's IndexedDB (`flowkit-sessions`) — the CLI cannot read them directly. The `SessionExportOverlay` UI exports them to JSON. The CLI side picks up from that JSON. The existing `sessions:import` → `sessions:ls/check/stats` pipeline already covers the full committed-library workflow. The new commands here fill the remaining gaps:

**`flowkit sessions:export:<id|name> [--dest <path>]`** / **`se`**

- Read from committed library (`src/modes/flowlens/library/<ws>/`) by id, name, or filename
- Write to `--dest` path or `./<slug>-<id>.flowkit-session.json` by default
- Use case: retrieve a session file you previously committed, hand it to a colleague, or re-import elsewhere

**`flowkit sessions:purge [--test-only] [--older-than <days>]`** / **`sp`**

- `--test-only`: remove all sessions where `meta.isTestMode: true`
- `--older-than <N>`: remove where `meta.startTime` is older than N days
- Flags combine (both conditions AND'd)
- Shows count of what will be deleted, asks `[y/N]` before proceeding
- Exit without deleting if count = 0

**`flowkit lens:report [--dest <path>]`** / **`lr`**

- Aggregate all committed sessions for the active workspace into a single JSON report
- Report shape: `{ workspace, sessionCount, avgQuality, completionRate, topFrustratedScreens[], sessionList[] }`
- Reuses `cmdSessionsStats` logic from `sessions.js`, but writes JSON to `--dest` instead of printing
- Destination defaults to `./flowlens-report-<ws>-<date>.json`
- Use case: hand off analytics data to a stakeholder, paste into a design document, feed into another tool

**`flowkit tracer:status`** / **`ts`** (note: not `ts` — conflicts; use `tracer:status` only)

- Reports what the FlowTracer engine knows from the committed library:
  - Session count, date range, avg quality
  - Whether `VITE_ENABLE_FLOWLENS=true` is set
  - Whether the library directory exists
- This is already mostly covered by `flowkit status` (which calls `cmdSessionsStats`) — **merge this into `flowkit status`** rather than a separate command

---

### J — Workspace dumps (hand-populatable + UI-generatable)

These commands create/manage disk files that serve as the source of truth for data that lives outside the workspace code: feedback comments, session exports, and FlowLens reports. The pattern is: **the UI can emit a `flowkit <cmd>` bash command** that the user pastes into the terminal, OR the user can edit the files by hand.

**`flowkit feedback:dump [--dest <path>]`** / **`fd`**

- Reads feedback from the JSON embedded in `workspaces/<ws>/.flowkit-feedback.json` if present (a committed snapshot), OR prints the shape of the expected format
- Writes to `--dest` or `./feedback-<ws>-<date>.json`
- **Key design:** the UI's "Export Feedback" button should emit `flowkit feedback:import <file>` (or just show the file it wrote), so the user can paste a one-liner to commit it

**`flowkit feedback:import <file>`** / **`fi`**

- Read a JSON file (exported from the feedback panel's "Export" function)
- Validate shape: `{ comments: FeedbackComment[] }` (mirror `FeedbackContext`'s `STORAGE_KEY` structure)
- Write to `workspaces/<ws>/.flowkit-feedback.json` as a committed snapshot
- This is the "paste the bash from the UI" entry point — the UI exports a file, emits `flowkit feedback:import ./feedback-2024-01-15.json`, the user pastes it

**`flowkit feedback:ls`** / **`fl`** (note: `fl` conflicts with future flow-library short; use `fb:ls`)

- List comments in `workspaces/<ws>/.flowkit-feedback.json`
- Shows: reviewer, screen, status, short text, date

**`flowkit dump [--sessions] [--feedback] [--report] [--dest <dir>]`** / full workspace dump

- All-in-one: runs sessions:export (all), feedback:dump, and lens:report in one shot
- Writes everything to `--dest` dir (default: `./flowkit-dump-<ws>-<date>/`)
- Useful before archiving a workspace or handing off to a client

---

## Files to Change

| File                      | Change                                                                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/flowkit.js`      | Add long-form aliases in dispatch; add `p.cmd === "h"` to help check; add `status`, `dup`, `order`, `plan:*`, `sessions:export`, `sessions:purge`, `lens:report`, `feedback:*`, `dump` dispatch; hide migrations from help; rewrite `cmdHelp()` |
| `scripts/lib/ui.js`       | Add `isTTY` guard + numbered fallback to `selectFromList`                                                                                                                                                                                       |
| `scripts/lib/flows.js`    | Add `cmdDuplicate(val, args)`; add `cmdOrder(val, args)` replacing `cmdChangeOrder`; keep `cmdChangeOrder` as alias                                                                                                                             |
| `scripts/lib/sessions.js` | Add `cmdSessionsExport(val, args)`; add `cmdSessionsPurge(val, args)`                                                                                                                                                                           |
| `scripts/lib/plans.js`    | **New file** — `cmdPlanNew`, `cmdPlanLs`, `cmdPlanCheck`, `cmdPlanRm`                                                                                                                                                                           |
| `scripts/lib/feedback.js` | **New file** — `cmdFeedbackDump`, `cmdFeedbackImport`, `cmdFeedbackLs`                                                                                                                                                                          |
| `scripts/flowkit.js`      | Add `cmdStatus()` and `cmdDump()` inline (small, read from other modules)                                                                                                                                                                       |

---

## Implementation Order

1. **Fix `ui.js`** — `isTTY` guard (one change, fixes all guided commands immediately)
2. **`flowkit.js` dispatch** — add long-form aliases + `-h` fix + rewrite `cmdHelp()`
3. **`cmdOrder` in `flows.js`** — replace `cmdChangeOrder` with array-literal parser; keep `co` as alias
4. **`cmdStatus`** in `flowkit.js` — inline, reads from existing module functions
5. **`cmdDuplicate`** in `flows.js` — new command
6. **`cmdSessionsExport` + `cmdSessionsPurge`** in `sessions.js` — new commands
7. **`scripts/lib/plans.js`** — new file: `plan:new`, `plan:ls`, `plan:check`, `plan:rm`
8. **`scripts/lib/feedback.js`** — new file: `feedback:import`, `feedback:dump`, `feedback:ls`
9. **`cmdLensReport`** in `sessions.js` — new export function; dispatched as `lens:report`
10. **`cmdDump`** in `flowkit.js` — inline, calls across modules

---

## Verification

```bash
# Fix B: -h works
flowkit -h

# Fix A: long-form aliases work
flowkit new-workspace:my-app --kit:none --lang:ts --agent:none
flowkit list
flowkit switch:my-app
flowkit remove-workspace:my-app

# Fix D: guided commands work in VS Code terminal
flowkit nw        # should show numbered list fallback, not crash

# Fix E: new order syntax
flowkit nf:Auth --screens:LoginScreen,SignUpScreen
flowkit nf:Home --screens:HomeScreen
flowkit order flows [Home, Auth]     # Home first
flowkit ls                           # confirm new order
flowkit order screens:Auth [SignUpScreen, LoginScreen]
flowkit ls                           # confirm screen order flipped

# Fix F: new core commands
flowkit status
flowkit dup:Auth AuthV2
flowkit sessions:sample
flowkit sessions:purge --test-only   # removes the sample
flowkit sessions:export <id>

# Fix H: FlowPlan CLI
flowkit plan:new:QuickCheckout --project:shop --flow:checkout-flow
flowkit plan:ls
flowkit plan:check
flowkit plan:rm:QuickCheckout

# Fix I: FlowLens report
flowkit lens:report --dest ./reports/

# Fix J: Feedback dumps
flowkit feedback:import ./feedback-export.json
flowkit feedback:ls
flowkit feedback:dump

# Full dump
flowkit dump --sessions --feedback --report --dest ./handoff/
```
