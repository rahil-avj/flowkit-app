# Plan: Agent-Exclusive CLI Library + New AGENTS.md

## Context

FlowKit is distributed as a deployment repo to prototype authors who use AI agents (Claude Code, Cursor, Copilot, etc.). The current platform has no systematic way to ensure agents work within its structure — they explore the filesystem, create files manually, and produce workspaces that deviate from the standards the platform depends on.

This plan builds two things:

1. **A comprehensive agent-exclusive CLI library** — every disk action, scaffold operation, and workspace query an agent needs, so it never has to touch files directly. The CLI encodes all invariants (folder layout, file templates, config registration, barrel management) making correctness the path of least resistance.
2. **A new `docs/AGENTS.md`** — the single injection point for every AI agent, rewritten as an author-facing orientation document (not a developer reference). It trains the agent to use the CLI before touching anything.

Flowlint is out of scope for this sprint — noted as **COMING SOON** in AGENTS.md.

---

## Existing Patterns to Reuse

All new command files follow the established pattern from `scripts/cli/workspace.js` and `scripts/cli/sessions/crud.js`:

- **Handler signature**: `export async function cmdName(val, args = [])`
- **Flag parsing**: `parseStringFlag(args, 'flagname')` from `scripts/lib/args.js`; `.includes('--flag')` for booleans
- **Workspace resolution**: `resolveWorkspace(val)` from `scripts/lib/workspace-resolve.js`
- **Output**: `g/r/b/d/c` color aliases from `scripts/lib/colors.js`
- **Error exit**: `console.error(r('✗ message')); process.exit(1)`
- **Paths**: `ROOT`, `WORKSPACES_DIR` from `scripts/lib/paths.js`
- **Strings**: `toSlug()`, `toId()` from `scripts/lib/strings.js`
- **Router dispatch**: `scripts/cli/router.js` — simple `if/else` blocks in `route(argv)`

---

## New File Structure

```
scripts/
├── lib/
│   └── agent-state.js          NEW — .flowkit/ read/write helpers
└── cli/
    └── agent/                  NEW directory — all agent-exclusive commands
        ├── disk.js             file/dir operations
        ├── screens.js          screen scaffold + config registration
        ├── flows.js            flow CRUD
        ├── flowplans.js        flowplan + step management
        ├── components.js       component registry + barrel management
        ├── config.js           flowkit.config.ts read/write operations
        ├── db.js               mock db read/write
        ├── workspace-query.js  ws:* read-only queries
        └── continuity.js       todo, notes, agent:start

docs/
└── AGENTS.md                   REWRITE — author-facing, ~120 lines

workspaces/<name>/
└── .flowkit/                   NEW (auto-created per workspace)
    ├── components.json         component registry
    ├── todo.json               todo items
    └── notes.md                session context note
```

---

## 1. New Persistence Layer — `scripts/lib/agent-state.js`

Central helper for all `.flowkit/` state. All agent command files import from here.

```js
// Key exports:
readComponents(wsDir) // → { name, path, desc, createdAt }[]
writeComponents(wsDir, arr)
readTodos(wsDir) // → { id, task, priority, status, createdAt }[]
writeTodos(wsDir, arr)
readNotes(wsDir) // → string
writeNotes(wsDir, str)
ensureFlowkitDir(wsDir) // creates .flowkit/ if missing
```

State files are committed with the workspace (valuable for continuity and handoff).

---

## 2. Command Domains

### `scripts/cli/agent/disk.js`

Raw filesystem operations. All paths are validated to stay within `workspaces/<active>/` — operations that attempt to escape are rejected with a clear error.

| Command       | Syntax                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------- |
| `file:read`   | `flowkit file:read --path:<rel-path>`                                                        |
| `file:create` | `flowkit file:create --path:<rel-path> [--template:blank\|tsx\|ts]`                          |
| `file:remove` | `flowkit file:remove --path:<rel-path> [--force]`                                            |
| `file:move`   | `flowkit file:move --from:<path> --to:<path>`                                                |
| `file:copy`   | `flowkit file:copy --from:<path> --to:<path>`                                                |
| `file:rename` | `flowkit file:rename --path:<path> --name:<new-filename>`                                    |
| `file:exists` | `flowkit file:exists --path:<rel-path>`                                                      |
| `file:find`   | `flowkit file:find --name:<pattern> [--workspace:<ws>] [--type:screen\|component\|flowplan]` |
| `dir:list`    | `flowkit dir:list --path:<rel-path>`                                                         |
| `dir:create`  | `flowkit dir:create --path:<rel-path>`                                                       |
| `dir:remove`  | `flowkit dir:remove --path:<rel-path> [--force]`                                             |

---

### `scripts/cli/agent/screens.js`

Atomic operations: create handles dir + TSX template + `flowkit.config.ts` registration in one command. Remove handles the reverse. Rename updates the directory name, filename, component name, and config entry.

| Command         | Syntax                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `create:screen` | `flowkit create:screen --flow:<flow> --name:<screen-id> [--label:"Display Name"] [--workspace:<ws>]` |
| `remove:screen` | `flowkit remove:screen --flow:<flow> --name:<screen-id> [--workspace:<ws>]`                          |
| `rename:screen` | `flowkit rename:screen --flow:<flow> --name:<screen-id> --to:<new-id> [--workspace:<ws>]`            |
| `move:screen`   | `flowkit move:screen --name:<screen-id> --from-flow:<flow> --to-flow:<flow> [--workspace:<ws>]`      |
| `list:screens`  | `flowkit list:screens [--flow:<flow>] [--workspace:<ws>]`                                            |
| `screen:info`   | `flowkit screen:info --flow:<flow> --name:<screen-id> [--workspace:<ws>]`                            |

**TSX template generated by `create:screen`:**

```tsx
import type { FlowScreenProps } from '@flowkit/types'

export default function <PascalName>Screen({ onNext, onBack, db }: FlowScreenProps) {
  return (
    <div className="flex flex-col h-full bg-theme-base">
      {/* Screen content */}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const screenMeta = {
  label: '<Display Name>',
  desc: '',
}
```

---

### `scripts/cli/agent/flows.js`

| Command       | Syntax                                                                  |
| ------------- | ----------------------------------------------------------------------- |
| `create:flow` | `flowkit create:flow --name:<flow-id> [--workspace:<ws>]`               |
| `remove:flow` | `flowkit remove:flow --name:<flow-id> [--force] [--workspace:<ws>]`     |
| `rename:flow` | `flowkit rename:flow --name:<flow-id> --to:<new-id> [--workspace:<ws>]` |
| `list:flows`  | `flowkit list:flows [--workspace:<ws>]`                                 |

`create:flow` creates the directory AND adds the flow to `flowkit.config.ts` flows array + empty `screenOrder` key. `remove:flow` requires `--force` if screens exist.

---

### `scripts/cli/agent/flowplans.js`

The `--subfolder` flag is locked: flowplans can only live in `workspaces/<name>/flowplans/`. The flag only controls nested subdirectory within that path.

| Command           | Syntax                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `create:flowplan` | `flowkit create:flowplan --name:<id> [--workspace:<ws>]`                                                                         |
| `remove:flowplan` | `flowkit remove:flowplan --name:<id> [--force] [--workspace:<ws>]`                                                               |
| `rename:flowplan` | `flowkit rename:flowplan --name:<id> --to:<new-id> [--workspace:<ws>]`                                                           |
| `add:step`        | `flowkit add:step --flowplan:<id> --screen:<screenId> [--on:<element-id>] [--action:"note"] [--position:<n>] [--workspace:<ws>]` |
| `remove:step`     | `flowkit remove:step --flowplan:<id> --index:<n> [--workspace:<ws>]`                                                             |
| `reorder:steps`   | `flowkit reorder:steps --flowplan:<id> --order:<s1,s2,s3> [--workspace:<ws>]`                                                    |
| `list:steps`      | `flowkit list:steps --flowplan:<id> [--workspace:<ws>]`                                                                          |
| `flowplan:info`   | `flowkit flowplan:info --name:<id> [--workspace:<ws>]`                                                                           |

`add:step` validates that `--screen` references a screenId that exists in the workspace before writing. This is the first layer of flowlint-style checking.

---

### `scripts/cli/agent/components.js`

Component registry is the anti-duplication system. `components:find` must be called before `create:component` — AGENTS.md enforces this as a hard rule.

| Command               | Syntax                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `create:component`    | `flowkit create:component --name:<Name> --path:<lib/components/...> [--desc:"purpose"] [--workspace:<ws>]` |
| `remove:component`    | `flowkit remove:component --name:<Name> --path:<lib/components/...> [--workspace:<ws>]`                    |
| `rename:component`    | `flowkit rename:component --name:<Name> --path:<...> --to:<NewName> [--workspace:<ws>]`                    |
| `components:find`     | `flowkit components:find --name:<Name> [--workspace:<ws>]`                                                 |
| `components:ls`       | `flowkit components:ls [--path:<lib/components/...>] [--workspace:<ws>]`                                   |
| `components:register` | `flowkit components:register --name:<Name> --path:<...> --desc:"purpose" [--workspace:<ws>]`               |
| `components:scan`     | `flowkit components:scan [--workspace:<ws>]` — rebuild registry from disk                                  |
| `add:export`          | `flowkit add:export --barrel:<path/to/index.ts> --name:<ExportName> [--workspace:<ws>]`                    |
| `remove:export`       | `flowkit remove:export --barrel:<path/to/index.ts> --name:<ExportName> [--workspace:<ws>]`                 |
| `list:exports`        | `flowkit list:exports --barrel:<path/to/index.ts> [--workspace:<ws>]`                                      |

`create:component` generates a `.tsx` stub, adds the export to the nearest `index.ts` barrel, and registers in `components.json`. All three steps are atomic — if any fail, none are applied.

---

### `scripts/cli/agent/config.js`

No agent should ever open `flowkit.config.ts` directly. These commands are the only sanctioned way to modify it.

| Command                | Syntax                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `config:add-screen`    | `flowkit config:add-screen --flow:<flow> --screen:<screenId> [--position:<n>] [--workspace:<ws>]` |
| `config:remove-screen` | `flowkit config:remove-screen --flow:<flow> --screen:<screenId> [--workspace:<ws>]`               |
| `config:reorder`       | `flowkit config:reorder --flow:<flow> --order:<s1,s2,s3> [--workspace:<ws>]`                      |
| `config:add-flow`      | `flowkit config:add-flow --name:<flow-id> [--workspace:<ws>]`                                     |
| `config:remove-flow`   | `flowkit config:remove-flow --name:<flow-id> [--force] [--workspace:<ws>]`                        |
| `config:ls`            | `flowkit config:ls [--workspace:<ws>]`                                                            |

Config read/write is done by reading the `.ts` file as text, finding the `defineConfig({...})` call, and surgically patching the relevant array. No full TypeScript compilation needed — the config format is stable and known.

---

### `scripts/cli/agent/db.js`

Agents read and patch the mock db without opening `lib/data/db.ts`.

| Command    | Syntax                                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| `db:read`  | `flowkit db:read [--path:<dot.path>] [--workspace:<ws>]`                     |
| `db:set`   | `flowkit db:set --path:<dot.path> --value:<json-value> [--workspace:<ws>]`   |
| `db:keys`  | `flowkit db:keys [--path:<dot.path>] [--workspace:<ws>]` — list keys at path |
| `db:reset` | `flowkit db:reset [--workspace:<ws>]` — resets to original exported default  |

`db:read` imports and evaluates `lib/data/db.ts` at runtime, applies optional dot-path, returns JSON. `db:set` reads, applies `applyDotPathPatch`, writes back.

---

### `scripts/cli/agent/workspace-query.js`

Read-only workspace introspection. Agents use these instead of `find`/`ls` shell commands.

| Command         | Syntax                                                        |
| --------------- | ------------------------------------------------------------- |
| `ws:info`       | `flowkit ws:info [--workspace:<ws>]`                          |
| `ws:screens`    | `flowkit ws:screens [--flow:<flow>] [--workspace:<ws>]`       |
| `ws:flows`      | `flowkit ws:flows [--workspace:<ws>]`                         |
| `ws:flowplans`  | `flowkit ws:flowplans [--workspace:<ws>]`                     |
| `ws:components` | `flowkit ws:components [--path:<subpath>] [--workspace:<ws>]` |
| `ws:ls`         | `flowkit ws:ls` — list all workspaces                         |

---

### `scripts/cli/agent/continuity.js`

Session continuity across agent sessions. State lives in `workspaces/<name>/.flowkit/`.

| Command        | Syntax                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------- |
| `todo:add`     | `flowkit todo:add --task:"description" [--priority:high\|normal\|low] [--workspace:<ws>]` |
| `todo:done`    | `flowkit todo:done --id:<n> [--workspace:<ws>]`                                           |
| `todo:remove`  | `flowkit todo:remove --id:<n> [--workspace:<ws>]`                                         |
| `todo:ls`      | `flowkit todo:ls [--all] [--workspace:<ws>]` — omits completed unless --all               |
| `todo:clear`   | `flowkit todo:clear [--workspace:<ws>]`                                                   |
| `notes:set`    | `flowkit notes:set --note:"current context" [--workspace:<ws>]`                           |
| `notes:append` | `flowkit notes:append --note:"addition" [--workspace:<ws>]`                               |
| `notes:get`    | `flowkit notes:get [--workspace:<ws>]`                                                    |
| `notes:clear`  | `flowkit notes:clear [--workspace:<ws>]`                                                  |
| `agent:start`  | `flowkit agent:start [--workspace:<ws>]` — full orientation dump                          |

**`agent:start` output format:**

```
WORKSPACE: demo  (active)

FLOWS (8):  auth · diagnostics · home · tools · insights · onboarding · setup · settings
SCREENS:    50 total
FLOWPLANS:  8 total

OPEN TODOS:
  [1] high  Build forgot-password screen
  [2] norm  Wire auth flowplan steps 3-5

NOTES:
  Working on auth flow. SignInScreen done. BiometricPromptScreen needs db wiring.

FLOWLENS: COMING SOON
```

---

## 3. Router Registration — `scripts/cli/router.js`

Add imports and dispatch blocks for all new command groups. Pattern matches existing style:

```js
import { cmdFileRead, cmdFileCreate, ... } from './agent/disk.js'
import { cmdCreateScreen, cmdRemoveScreen, ... } from './agent/screens.js'
// ... etc

// In route():
} else if (p.cmd === 'file') {
  const sub = p.val.split(':')[0]
  const subVal = p.val.includes(':') ? p.val.slice(p.val.indexOf(':') + 1) : ''
  if (sub === 'read')   await cmdFileRead(subVal, rest)
  else if (sub === 'create') await cmdFileCreate(subVal, rest)
  // ...
} else if (p.cmd === 'create') {
  const sub = p.val.split(':')[0]
  if (sub === 'screen') await cmdCreateScreen('', rest)  // passes --name, --flow from rest
  // ...
```

---

## 4. New `docs/AGENTS.md`

Full rewrite. Current file is a 284-line developer architectural reference. New file is author-facing, ~120 lines, structured to be read in 2 minutes.

**Structure:**

```
## STOP — Read This First
  Run: flowkit agent:start
  This shows your current workspace state, open todos, and session notes.
  Do this before touching any file.

## What FlowKit Is  (~8 lines)
  Platform for building interactive multi-screen prototypes.
  Mental model: Workspace → Flows → Screens → Flowplans

## Hard Rules  (numbered, 10 rules)
  1. Never edit flowkit.config.ts directly → use flowkit config:* commands
  2. Never create screen files manually → use flowkit create:screen
  3. Never edit src/workspaces.json
  4. Run flowkit components:find before creating any component
  5. Never create flowplan files manually → use flowkit create:flowplan
  6. All import/export changes → flowkit add:export / remove:export
  7. In screen files: import only from @workspace/lib/... (not @shared/@core/@features)
  8. Update todos and notes before ending every session
  9. Use flowkit db:set to update mock db values, not direct file edits
  10. All file creation inside workspaces/ must go through CLI commands

## Authoring API  (~20 lines)
  FlowScreenProps shape
  screenMeta shape
  db access pattern

## CLI Quick Reference  (~40 lines)
  Grouped by task: orient / scaffold / manage / continuity

## Design Tokens  (~25 lines)
  bg-theme-* / text-theme-* / text-ui-* / spacing / radius

## FlowLens Analytics
  COMING SOON — flowkit lens:report and flowlint will be available in a future release.
```

---

## 5. `.flowkit/` Gitignore

`.flowkit/` should be **tracked** (not gitignored). The component registry and todo list are project artifacts valuable for handoff and continuity.

Add to `.gitignore` only the lock/temp files if any are created.

---

## Verification

```bash
# After implementation:

# 1. Smoke test scaffold chain
flowkit create:flow --name:test-flow
flowkit create:screen --flow:test-flow --name:test-screen --label:"Test"
flowkit list:screens --flow:test-flow
# → Should show test-screen

# 2. Verify config was updated
flowkit config:ls
# → test-flow with test-screen registered

# 3. Test step validation
flowkit create:flowplan --name:test-plan
flowkit add:step --flowplan:test-plan --screen:nonexistent
# → Should error: screenId 'nonexistent' not found in workspace

flowkit add:step --flowplan:test-plan --screen:test-screen --action:"Tap next"
flowkit list:steps --flowplan:test-plan
# → Shows step 1

# 4. Component registry
flowkit create:component --name:TestCard --path:lib/components/ui --desc:"Test"
flowkit components:find --name:TestCard
# → Found: lib/components/ui/TestCard.tsx

# 5. Session continuity
flowkit todo:add --task:"Finish auth flow" --priority:high
flowkit notes:set --note:"Working on auth, login done"
flowkit agent:start
# → Shows todos and notes in output

# 6. Cleanup
flowkit remove:screen --flow:test-flow --name:test-screen
flowkit remove:flow --name:test-flow --force
flowkit remove:flowplan --name:test-plan --force
```
