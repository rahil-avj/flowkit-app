# Plan: Scaffold Commands — create:screen, create:flow, create:flowplan, create:component

> **Status note (2026-07-15): this plan already shipped, but under different paths/APIs than described below.**
> Real implementation lives in `scripts/authoring/{flows,screens,flowplans,components}.js` +
> `scripts/authoring-support/config-patch.js` (not `scripts/cli/agent/*.js` + `scripts/lib/*.js` —
> those paths predate the `scripts/platform/` / `scripts/authoring/` / `scripts/helpers/` reorg).
> Known divergences worth knowing before reading further as if it were current behavior:
>
> - The workspace config file is `workspace.ts` (`WORKSPACE_CONFIG_FILENAME`), not `flowkit.config.ts`.
> - `defineConfig`/`defineFlow` import from `@flowkit-core/config` (repo mode) or `'flowkit'` (consumer
>   mode) via `resolveDefineImport()`/`resolveTypeImport()` in `scripts/helpers/paths.js` — not the
>   hardcoded `@platform/core/config` shown in this doc's templates.
> - Screen files land at `flows/<flow>/<screen-id>/<PascalName>Screen.tsx` (one directory per screen,
>   `Screen`-suffixed filename) — matches what this doc describes, but the screen template itself
>   imports `useDashboard` from `@flowkit-shared/contexts` and `PageMeta`/`PageProps` from
>   `@flowkit/types`, not `@platform/shared/contexts`/`@platform/types`.
> - `add:step`/`remove:step` now refuse (exit 1, file untouched) on a flowplan containing `forks` —
>   the non-greedy regex rewrite this doc describes can't safely serialize nested fork structures.
>   See CLAUDE.md's Known Gotchas for the fix (2026-07-15) and `scripts/tests/flowplan-steps-cli.test.js`.
> - Router dispatch lives in `scripts/platform/router.js`, not `scripts/cli/router.js`.
>
> The `flowkit-author` skill (`.claude/skills/flowkit-author/SKILL.md`) is the source-verified
> reference for exact current flags/paths/types — check there or the real source before relying on
> anything below as fact. This plan is kept as historical design context, not current documentation.

## Context

FlowKit prototype authors (human and agent) need reliable, instructional scaffolds for the four most common authoring actions. Without these, authors either create files manually (wrong structure, missing exports, missed config registration) or waste time studying existing files to infer patterns.

These four scaffold commands are the practical foundation of the agent workflow system — they encode all structural invariants into the tool itself, making correct output the default. Templates are designed to teach the platform, not just stub files: they include the correct imports, the correct patterns, and inline guidance for what to fill in.

This plan covers the scaffold commands only. Disk ops, workspace queries, and session continuity are a subsequent sprint.

---

## Existing Infrastructure to Reuse

| Utility                          | File                                | Used for                                   |
| -------------------------------- | ----------------------------------- | ------------------------------------------ |
| `workspaceScaffold()`            | `scripts/lib/scaffold.js`           | Reference for template style; not modified |
| `parseStringFlag(args, name)`    | `scripts/lib/args.js`               | Flag parsing in all new commands           |
| `resolveWorkspace(val)`          | `scripts/lib/workspace-resolve.js`  | Active workspace resolution                |
| `toSlug / toTitle / toId`        | `scripts/lib/strings.js`            | Name → slug → PascalCase transforms        |
| `selectFromList(items)`          | `scripts/lib/prompt.js`             | Interactive selection for human users      |
| `prompt(rl, question)`           | `scripts/lib/prompt.js`             | Text input prompts                         |
| `g / r / b / d / c`              | `scripts/lib/colors.js`             | All colored output                         |
| `ROOT, WORKSPACES_DIR`           | `scripts/lib/paths.js`              | Path resolution                            |
| `specContext / renderAgentFiles` | `scripts/agent/render.js + spec.js` | Not modified; context only                 |

---

## New Files

```
scripts/
├── lib/
│   ├── config-patch.js         NEW — flowkit.config.ts surgical read/write
│   └── agent-state.js          NEW — .flowkit/ persistence (component registry)
└── cli/
    └── agent/                  NEW directory
        ├── screens.js          create:screen + remove:screen + list:screens + screen:info
        ├── flows.js            create:flow + remove:flow + list:flows
        ├── flowplans.js        create:flowplan + remove:flowplan + add:step + list:steps + flowplan:info
        └── components.js       create:component + remove:component + components:find + components:ls + components:scan + add:export + list:exports

scripts/cli/router.js           MODIFY — add imports + dispatch blocks
```

---

## 1. `scripts/lib/config-patch.js`

The foundation for all scaffold commands that touch `flowkit.config.ts`. The config format is stable (always machine-written via `defineConfig()`) so targeted string manipulation is sufficient — no AST library needed.

**Exports:**

```js
readConfig(wsDir)
// Returns parsed { workspace, flows: string[], pageOrder: Record<string, string[]> }
// Uses dynamic import via jiti/eval on the .ts file

addFlow(configPath, flowId)
// Inserts flowId into flows[] array
// Adds flowId: [] entry into pageOrder
// Writes back; preserves formatting

removeFlow(configPath, flowId)
// Removes flowId from flows[]
// Removes flowId: [...] from pageOrder
// Writes back

addScreen(configPath, flowId, pageId, position)
// Appends pageId to pageOrder[flowId][]
// Optionally inserts at position N instead of end

removeScreen(configPath, flowId, pageId)
// Removes pageId from pageOrder[flowId][]

renameScreen(configPath, flowId, oldId, newId)
// Replaces pageId string in pageOrder[flowId][]

moveScreen(configPath, pageId, fromFlowId, toFlowId)
// Removes from one flow's pageOrder, appends to other
```

**Implementation approach — regex-based patching on stable format:**

```js
// Example: addScreen
function addScreen(configPath, flowId, pageId) {
  let src = fs.readFileSync(configPath, 'utf8')
  // Find the flow's array and append before its closing ]
  const flowPattern = new RegExp(`(${flowId}:\\s*\\[)([^\\]]*)(\\])`, 's')
  src = src.replace(flowPattern, (_, open, inner, close) => {
    const trimmed = inner.trimEnd()
    const sep = trimmed.length ? ',\n    ' : '\n    '
    return `${open}${inner.trimEnd()}${sep}'${pageId}',\n  ${close}`
  })
  fs.writeFileSync(configPath, src)
}
```

`readConfig` uses Node's `vm.runInNewContext` after stripping the TypeScript import (which is always the same single line) and replacing `defineConfig(` with `module.exports = (` — clean, fast, no external deps.

---

## 2. `scripts/lib/agent-state.js`

Manages `workspaces/<name>/.flowkit/` state files. Auto-creates the directory on first write. Scope is component registry only — future sprints add their own functions to this file without restructuring.

```js
// .flowkit/components.json schema:
// [{ name, path, desc, createdAt }]

ensureFlowkitDir(wsDir) // mkdirSync if missing
readComponents(wsDir) // → ComponentEntry[]
writeComponents(wsDir, entries)
registerComponent(wsDir, { name, path, desc }) // append + dedup by name+path
unregisterComponent(wsDir, name, path)
findComponent(wsDir, name) // → ComponentEntry | null
```

---

## 3. `scripts/cli/agent/flows.js`

### `create:flow`

```
flowkit create:flow --name:<flow-id> [--workspace:<ws>]
```

**Interactive (human):** Prompts for flow name if `--name` omitted.

**Steps (atomic, rollback on any failure):**

1. Validate flow ID is kebab-case, not already in config
2. `mkdir workspaces/<ws>/flows/<flow-id>/`
3. `config-patch.addFlow(configPath, flowId)`
4. Print success + hint: `flowkit create:screen --flow:<id> --name:<first-screen>`

**Output:**

```
✓ Flow created: flows/auth/
✓ Registered in flowkit.config.ts

Next: flowkit create:screen --flow:auth --name:sign-in --label:"Sign In"
```

### `remove:flow`

```
flowkit remove:flow --name:<flow-id> [--force] [--workspace:<ws>]
```

Requires `--force` if the flow directory contains screen subdirectories. Removes dir + config entries.

### `list:flows`

```
flowkit list:flows [--workspace:<ws>]
```

Reads `flowkit.config.ts` via `readConfig()`, prints flow names + screen count each.

---

## 4. `scripts/cli/agent/screens.js`

### `create:screen`

```
flowkit create:screen --flow:<flow> --name:<screen-id> [--label:"Display Name"] [--workspace:<ws>]
```

**Interactive (human):** Prompts for flow (select from list), name, and label if omitted. Defaults label to `toTitle(name)`.

**Steps (atomic, rollback on any failure):**

1. Validate flow exists in config, screen ID doesn't already exist
2. `mkdir workspaces/<ws>/flows/<flow>/<screen-id>/`
3. Write `<PascalName>Screen.tsx` (template below)
4. `config-patch.addScreen(configPath, flow, pageId)`
5. Print success + file path

**Screen TSX template:**

```tsx
import { useDashboard } from '@platform/shared/contexts'
import type { PageMeta } from '@platform/types'

export default function ${PascalName}Screen() {
  // useDashboard gives you: navigateTo, db, and simulator state
  // For flow-only props (onNext / onBack / flowState) also destructure from useDashboard
  const { navigateTo, db } = useDashboard()

  return (
    <div className="flex flex-col h-full bg-theme-base">
      {/* Build your screen here */}
      {/* Import workspace components: import { Button } from '@workspace/lib/components' */}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const pageMeta: PageMeta = {
  label: '${label}',
  desc: '',   // one-sentence description of what this screen does
}
```

**Output:**

```
✓ Directory:  flows/auth/sign-in/
✓ Screen:     flows/auth/sign-in/SignInScreen.tsx
✓ Registered: flowkit.config.ts → pageOrder.auth[]

Next: flowkit create:flowplan --name:auth  (to script this flow)
```

### `remove:screen`

```
flowkit remove:screen --flow:<flow> --name:<screen-id> [--workspace:<ws>]
```

Removes directory + unregisters from config. Warns if any flowplan step references this pageId (does not block, just warns).

### `rename:screen`

```
flowkit rename:screen --flow:<flow> --name:<screen-id> --to:<new-id> [--workspace:<ws>]
```

Renames directory, renames TSX file, renames component function name inside the file, updates config. Warns about flowplan references.

### `move:screen`

```
flowkit move:screen --name:<screen-id> --from-flow:<flow> --to-flow:<flow> [--workspace:<ws>]
```

Moves directory, updates both flows in config.

### `list:screens`

```
flowkit list:screens [--flow:<flow>] [--workspace:<ws>]
```

Reads config, prints pageId list per flow (or for one flow).

### `screen:info`

```
flowkit screen:info --flow:<flow> --name:<screen-id> [--workspace:<ws>]
```

Reads the screen file, extracts and prints: component name, pageMeta fields, imports used.

---

## 5. `scripts/cli/agent/flowplans.js`

### `create:flowplan`

```
flowkit create:flowplan --name:<id> [--workspace:<ws>]
```

**Interactive (human):** Prompts for name and optionally description.

**Steps:**

1. Validate `flowplans/<id>.ts` doesn't already exist
2. Write `flowplans/<id>.ts` (template below)
3. Print success + hint for `add:step`

**Flowplan TS template:**

```ts
import { defineFlow } from '@platform/core/config'

// Flowplan: ${name}
// This script sequences screens in the '${id}' flow for guided playback.
// Add steps with: flowkit add:step --flowplan:${id} --screen:<pageId> --action:"description"

export default defineFlow({
  id: '${id}',
  name: '${displayName}',
  description: '',

  steps: [
    // { pageId: 'screen-id', on: 'button-element-id', actionNote: 'What the user does' },
  ],
})
```

**Output:**

```
✓ Flowplan: flowplans/auth.ts

Next: flowkit add:step --flowplan:auth --screen:sign-in --action:"User enters credentials"
      flowkit add:step --flowplan:auth --screen:two-fa-verification --on:submit-btn --action:"Taps verify"
```

### `remove:flowplan`

```
flowkit remove:flowplan --name:<id> [--force] [--workspace:<ws>]
```

Requires `--force` to confirm deletion. No config update needed (flowplans are auto-discovered).

### `add:step`

```
flowkit add:step --flowplan:<id> --screen:<pageId> [--on:<element-id>] [--action:"note"] [--position:<n>] [--workspace:<ws>]
```

**Validation:** Checks that `pageId` exists in the workspace before writing. This is the first piece of flowlint-style checking built into the CLI.

Reads current flowplan file, finds `steps: [` array, appends (or inserts at position N):

```ts
{ pageId: 'sign-in', on: 'submit-btn', actionNote: 'User taps Sign In' },
```

### `remove:step`

```
flowkit remove:step --flowplan:<id> --index:<n> [--workspace:<ws>]
```

### `list:steps`

```
flowkit list:steps --flowplan:<id> [--workspace:<ws>]
```

Imports/evaluates the flowplan file, prints each step as a numbered list with pageId + actionNote.

### `flowplan:info`

```
flowkit flowplan:info --name:<id> [--workspace:<ws>]
```

Prints id, name, description, step count, and first 5 steps.

---

## 6. `scripts/cli/agent/components.js`

### `create:component`

```
flowkit create:component --name:<PascalName> --path:<lib/components/...> [--desc:"purpose"] [--workspace:<ws>]
```

**Interactive (human):** Prompts for name (validates PascalCase), selects path from list of existing component subdirectories, prompts for description.

**Steps (atomic):**

1. Check `.flowkit/components.json` for existing component with same name — error if found
2. Write `<path>/<Name>.tsx` (template below)
3. Add `export { default as <Name> } from './<Name>'` to nearest `index.ts`
4. Register in `.flowkit/components.json`
5. Print success

**Component TSX template:**

```tsx
// ${name}${desc ? ` — ${desc}` : ''}
// Usage: import { ${name} } from '@workspace/lib/components'

interface Props {
  // Define your props here
  className?: string
  children?: React.ReactNode
}

export default function ${name}({ className = '', children }: Props) {
  return (
    <div className={`${className}`}>
      {children}
    </div>
  )
}
```

**Output:**

```
✓ Component:  lib/components/ui/StatusBadge.tsx
✓ Exported:   lib/components/index.ts → export { default as StatusBadge }
✓ Registered: .flowkit/components.json

Usage: import { StatusBadge } from '@workspace/lib/components'
```

### `remove:component`

```
flowkit remove:component --name:<Name> --path:<...> [--workspace:<ws>]
```

Removes file, removes export from barrel, removes from `.flowkit/components.json`.

### `components:find`

```
flowkit components:find --name:<Name> [--workspace:<ws>]
```

Checks `.flowkit/components.json`. If not found, also checks disk as fallback.

```
✓ Found: StatusBadge
   Path: lib/components/ui/StatusBadge.tsx
   Desc: Shows status with color-coded badge
   Registered: yes
```

Or:

```
✗ Not found: StatusBadge
  No component named StatusBadge exists in this workspace.
  Create it: flowkit create:component --name:StatusBadge --path:lib/components/ui
```

### `components:ls`

```
flowkit components:ls [--path:<subpath>] [--workspace:<ws>]
```

Lists all registered components, optionally filtered by path prefix.

### `components:scan`

```
flowkit components:scan [--workspace:<ws>]
```

Walks `lib/components/` on disk, rebuilds `.flowkit/components.json` from actual files. Useful on first use or after manual file edits.

### `add:export`

```
flowkit add:export --barrel:<relative/path/to/index.ts> --name:<ExportName> [--workspace:<ws>]
```

Reads the barrel file, appends `export { default as <Name> } from './<Name>'` in the appropriate section. Validates the source file exists.

### `list:exports`

```
flowkit list:exports --barrel:<relative/path/to/index.ts> [--workspace:<ws>]
```

Reads and prints all named exports from the barrel file.

---

## 7. Router Registration — `scripts/cli/router.js`

Add at top of file (after existing imports):

```js
import { cmdCreateFlow, cmdRemoveFlow, cmdListFlows } from './agent/flows.js'
import {
  cmdCreatePage,
  cmdRemovePage,
  cmdRenameScreen,
  cmdMoveScreen,
  cmdListScreens,
  cmdScreenInfo,
} from './agent/screens.js'
import {
  cmdCreateFlowplan,
  cmdRemoveFlowplan,
  cmdAddStep,
  cmdRemoveStep,
  cmdListSteps,
  cmdFlowplanInfo,
} from './agent/flowplans.js'
import {
  cmdCreateComponent,
  cmdRemoveComponent,
  cmdComponentsFind,
  cmdComponentsLs,
  cmdComponentsScan,
  cmdAddExport,
  cmdListExports,
} from './agent/components.js'
```

Add dispatch blocks (after existing commands, before the final `else` unknown command):

```js
} else if (p.cmd === 'create') {
  const sub = p.val
  if (sub === 'flow' || sub === 'flow') await cmdCreateFlow('', rest)
  else if (sub === 'screen') await cmdCreatePage('', rest)
  else if (sub === 'flowplan') await cmdCreateFlowplan('', rest)
  else if (sub === 'component') await cmdCreateComponent('', rest)
  else { console.error(r(`✗ Unknown: create:${sub}`)); process.exit(1) }

} else if (p.cmd === 'remove') {
  const sub = p.val
  if (sub === 'flow') await cmdRemoveFlow('', rest)
  else if (sub === 'screen') await cmdRemovePage('', rest)
  else if (sub === 'flowplan') await cmdRemoveFlowplan('', rest)
  else if (sub === 'component') await cmdRemoveComponent('', rest)
  else { console.error(r(`✗ Unknown: remove:${sub}`)); process.exit(1) }

} else if (p.cmd === 'list') {
  const sub = p.val
  if (sub === 'flows') await cmdListFlows('', rest)
  else if (sub === 'screens') await cmdListScreens('', rest)
  else if (sub === 'steps') await cmdListSteps('', rest)
  else if (sub === 'exports') await cmdListExports('', rest)

} else if (p.cmd === 'rename') {
  if (p.val === 'screen') await cmdRenameScreen('', rest)

} else if (p.cmd === 'move') {
  if (p.val === 'screen') await cmdMoveScreen('', rest)

} else if (p.cmd === 'add') {
  if (p.val === 'step') await cmdAddStep('', rest)
  else if (p.val === 'export') await cmdAddExport('', rest)

} else if (p.cmd === 'screen') {
  if (p.val === 'info') await cmdScreenInfo('', rest)

} else if (p.cmd === 'flowplan') {
  if (p.val === 'info') await cmdFlowplanInfo('', rest)

} else if (p.cmd === 'components') {
  const sub = p.val
  if (sub === 'find') await cmdComponentsFind('', rest)
  else if (sub === 'ls' || sub === 'list') await cmdComponentsLs('', rest)
  else if (sub === 'scan') await cmdComponentsScan('', rest)
```

---

## Implementation Order

Build in dependency order — each step can be tested before starting the next:

1. `scripts/lib/config-patch.js` — foundation; test with `readConfig()`
2. `scripts/lib/agent-state.js` — foundation; test with `ensureFlowkitDir()`
3. `scripts/cli/agent/flows.js` + router registration for `create:flow / list:flows`
4. `scripts/cli/agent/screens.js` + router registration for `create:screen / list:screens`
5. `scripts/cli/agent/flowplans.js` + router registration for `create:flowplan / add:step / list:steps`
6. `scripts/cli/agent/components.js` + router registration for `create:component / components:find / components:ls`

---

## Verification

```bash
# 1. Flow scaffold
flowkit create:flow --name:test-flow
# → creates workspaces/<active>/flows/test-flow/
# → flowkit.config.ts has 'test-flow' in flows[] and pageOrder.test-flow: []

# 2. Screen scaffold
flowkit create:screen --flow:test-flow --name:home --label:"Home Screen"
# → creates flows/test-flow/home/HomeScreen.tsx with correct template
# → flowkit.config.ts pageOrder.test-flow: ['home']

# 3. Second screen
flowkit create:screen --flow:test-flow --name:detail --label:"Detail"
# → creates flows/test-flow/detail/DetailScreen.tsx
# → pageOrder.test-flow: ['home', 'detail']

# 4. List
flowkit list:screens --flow:test-flow
# → home, detail

# 5. Flowplan
flowkit create:flowplan --name:test-flow
# → creates flowplans/test-flow.ts with correct template

# 6. Add steps (with validation)
flowkit add:step --flowplan:test-flow --screen:nonexistent
# → ✗ Error: pageId 'nonexistent' not found in workspace flows

flowkit add:step --flowplan:test-flow --screen:home --action:"User views home"
flowkit add:step --flowplan:test-flow --screen:detail --on:card --action:"Taps a card"
flowkit list:steps --flowplan:test-flow
# → [1] home — "User views home"
# → [2] detail (on: card) — "Taps a card"

# 7. Component
flowkit components:find --name:TestCard
# → ✗ Not found

flowkit create:component --name:TestCard --path:lib/components/ui --desc:"Test card"
# → creates file, updates barrel, registers in .flowkit/

flowkit components:find --name:TestCard
# → ✓ Found: lib/components/ui/TestCard.tsx

# 8. Rollback test — create screen in non-existent flow
flowkit create:screen --flow:no-such-flow --name:test
# → ✗ Error: flow 'no-such-flow' not found. Run: flowkit create:flow --name:no-such-flow

# 9. Cleanup
flowkit remove:screen --flow:test-flow --name:home
flowkit remove:screen --flow:test-flow --name:detail
flowkit remove:flow --name:test-flow --force
flowkit remove:flowplan --name:test-flow --force
```

---

## Save Location

After approval, also save this plan to:
`agent-workflow-plans/scaffold-commands.md`
