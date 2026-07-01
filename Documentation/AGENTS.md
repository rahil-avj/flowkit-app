# Agent Workflows

How a coding agent works inside a FlowKit workspace — the cold-start sequence, the
recipes for common tasks, and the system that keeps the agent's instructions accurate.

This is the _workflow_ companion to the reference docs (FLOWKIT / FLOWMASTER / FLOWLENS /
CLI). Those describe the platform; this describes how to operate it.

---

## The agent file system

Every workspace ships a generated, layered file set so an agent can start building without
reading the codebase. All of it is rendered from a **single source of truth**
(`scripts/lib/agentSpec.js`) by `scripts/lib/agent.js`, so it never drifts from the platform.

| Layer     | File                                                    | Role                                                                                                               |
| --------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Memory    | `CLAUDE.md` / `AGENTS.md` / `.cursor/rules/flowkit.mdc` | Auto-ingested by the agent's tool. Identity, read-order, the hardest directives. Chosen at `flowkit nw --agent:…`. |
| Map       | `.agent/INDEX.md`                                       | `Task → Action → Detail`. The fast lookup — every task in one hop.                                                 |
| Rules     | `.agent/rules.md`                                       | The full directive set (`NEVER` / `ALWAYS` / `TO … → …`).                                                          |
| Reference | `.agent/platform.md`                                    | Terse surface map; each row points to the full doc here.                                                           |
| Product   | `.agent/project.md`                                     | Hand-owned brief: what the product is. **Never regenerated.**                                                      |
| State     | `.agent/.agent-meta.json`                               | `{ agent, kit, language, specVersion }` for sync/check.                                                            |

### Cold-start sequence (what an agent reads, in order)

1. **memory file** — already in context; gives identity + the non-negotiables + the read order.
2. **`.agent/rules.md`** — the directives it operates under.
3. **`.agent/INDEX.md`** — the map; from here, jump straight to the task.
4. **`.agent/platform.md`** — terse surface map; each row points to the full doc. Read only when a rules/INDEX row points there.
5. **`.agent/project.md`** — what _this_ product is (flows, data model, decisions).
6. Full docs (`Documentation/*`) **only when a rules/INDEX row points there.**

The point: the agent never blind-searches and never reads a book. It looks a task up in the
INDEX and goes straight to the action.

---

## The directive grammar

Rules are written as machine-unambiguous directives, not prose to interpret:

- **`NEVER <x>`** — a hard stop. Doing `x` breaks the platform.
- **`ALWAYS <y>`** — the default behavior.
- **`TO <task> → <action>`** — the one right way to do `task`.

Example (from a generated `rules.md`):

```
NEVER reference flows/router.tsx or _playFlow.ts — flat-flowplan workspaces don't have them
ALWAYS read/mutate data via const { db, updateDb } = useDashboard()
TO add a screen → create flows/<flow>/<screen-slug>/<ScreenName>.tsx, then add a step in flowplans/<flow>.ts
```

The few hardest rules are inlined into the memory file so they're loaded before any file read.

---

## The non-negotiables (why they exist)

| Rule                                                 | Why                                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Never `navigateTo` from `useDashboard()` in a screen | Navigation must go through `useFlowNav()` or id-wiring, or FlowMaster's guards, animations, and the recorded `flow.transition` won't fire. |
| Never hand-write flow/screen files from scratch      | Copy an existing screen's boilerplate — the structure and exports must be consistent.                                                      |
| Never edit outside `workspaces/<ws>/`                | `src/` is shared platform code. (Requires the secret-phrase confirmation, every time.)                                                     |
| Never hardcode hex colors                            | Use `design-system/tokens.css` vars or `useTheme()` tokens so kit/theme switching works.                                                   |
| Always use `@platform/` / `@workspace/` aliases      | Relative `../../` paths break across the workspace boundary.                                                                               |

---

## Workspace format

Workspaces use the **flat flowplan format**: `flows/<flow>/<screen>/<Screen>.tsx` + `flowplans/*.ts`. There is no `_playFlow.ts`, no `router.tsx`, no `projects/` directory.

---

## Task recipes

The canonical way to do each common thing. (The INDEX routes here; the reference docs have full detail.)

### Add a screen (flat flowplan format — nClarity)

1. Create the screen folder and component:

```
flows/<flow>/<screen-slug>/<ScreenName>.tsx
```

Boilerplate (copy from an existing screen, then fill the body):

```tsx
import type { FlowScreenProps } from '@platform/types'

export const screenMeta = {
  desc: 'Short description of what this screen does',
}

export default function <ScreenName>Screen({ db }: FlowScreenProps) {
  return (
    <div className="flex flex-col h-full">
      {/* screen content */}
      <button id="primary-cta">Continue</button>
    </div>
  )
}
```

2. Add a step to `flowplans/<flow>.ts`:

```ts
{ screenId: '<screen-slug>', on: 'primary-cta', actionNote: 'Taps Continue' },
```

> **To remove a screen:** `rm -rf workspaces/<ws>/flows/<flow>/<screen-slug>/`

### Add a flowplan

Drop a `.ts` file into `workspaces/<ws>/flowplans/` using `defineFlow()`. Run `flowkit plan:ls` to confirm it's discovered, `flowkit plan:check` to validate.

### Add a flowplan step with a conditional fork

```ts
{
  screenId: 'cart',
  on: 'checkout',
  actionNote: 'Taps Checkout',
  forks: [
    {
      label: 'Empty cart',
      db: { 'cart.count': 0 },
      steps: [{ screenId: 'cart-empty', actionNote: 'Sees empty state' }],
      // mergesTo: 'next',  // rejoin the main flow; omit = terminal branch
    },
  ],
},
```

### Navigate from screen logic (state / async)

```ts
const { navigateTo, goNext, goBack } = useFlowNav()
const submit = async () => {
  if (await ok()) navigateTo('confirmation')
}
```

### Read / mutate data

```ts
const { db, updateDb } = useDashboard() // db is injected — do NOT import it directly
updateDb(d => {
  d.cart.count += 1
})
```

Seed data lives in `data/db.ts`. → FLOWKIT.md (Mock database)

### Gate access (entry guards)

```ts
// in screenMeta:
canEnter:    ({ db }) => db.auth.isLoggedIn,
canNotEnter: ({ db }) => db.auth.isGuestUser,
```

### Style

Tailwind for static values; `style={{}}` only for dynamic/computed values; colors from tokens / `useTheme()`. The active kit's tokens are wired at workspace creation. → FLOWKIT.md (Kit system, Theming)

### Add a reviewer toggle

Edit `data/simulator.tsx` (a default-exported JSX component):

```tsx
<ControlAccordion label="Auth" defaultOpen>
  <SimToggle label="Logged in" bind="db.auth.isLoggedIn" />
</ControlAccordion>
```

Components: `ControlAccordion`, `SimToggle`, `SimSegmented`, `SimSelect`, `SimAction`, `SimTextInput`, `SimNumberInput`, `SimControl`. → FLOWKIT.md (Simulator controls authoring)

### Work with recorded sessions

Recording is always on (the user drives it in-app). The committed library is CLI-managed:

```bash
flowkit sessions:ls                  # list committed sessions
flowkit sessions:import <file.json>  # import a session export
flowkit sessions:check               # validate session integrity
flowkit sessions:stats               # aggregate stats across sessions
flowkit sessions:sample              # generate a synthetic test session
flowkit sessions:rm <id>             # remove a session
flowkit sessions:brief               # analytics brief (--append writes to .agent/project.md)
flowkit lens:report                  # export FlowLens analytics JSON
flowkit lens:report:<ws>             # same, specific workspace (colon form)
flowkit lr                           # alias for lens:report
```

→ FLOWLENS.md

### Check workspace health

```bash
flowkit status          # flows, screens, flowplans, sessions, feedback, agent
flowkit plan:check      # validate all flowplans (static lint) — exits 1 on error
flowkit plan:ls         # list all flowplans with file paths
```

---

## Keeping the files accurate (the anti-drift system)

The agent files are generated, not hand-maintained. When the platform changes, regenerate:

```bash
flowkit agent:sync                 # active workspace, keep its agent
flowkit agent:sync:<ws>            # a specific workspace
flowkit agent:sync --agent:cursor  # switch agent target (removes the old memory file)
flowkit agent:check                # warn (and exit non-zero) if files are stale vs the spec
```

- `agent:sync` re-emits `INDEX.md`, `rules.md`, `platform.md`, and the memory file. It **never**
  touches `project.md`.
- `agent:check` runs warn-only inside `flowkit export` pre-flight, so a stale workspace is surfaced.
- To change platform facts, edit **`scripts/lib/agentSpec.js`** (the single source), bump
  `AGENT_SPEC_VERSION`, then `agent:sync` every workspace. Never hand-edit a generated `.agent/*` file.

### Supported agent targets

| `--agent:`         | Emits                       | Tool                |
| ------------------ | --------------------------- | ------------------- |
| `claude`           | `CLAUDE.md`                 | Claude Code         |
| `agents` (default) | `AGENTS.md`                 | Cross-tool standard |
| `cursor`           | `.cursor/rules/flowkit.mdc` | Cursor              |
| `none`             | `.agent/*` docs only        | (no memory file)    |

---

## What the agent owns vs. what's generated

- **Owns / edits freely:** everything in `workspaces/<ws>/` — screens, flowplans, `data/`,
  `components/`, and `.agent/project.md` (the product brief).
- **Generated (don't hand-edit):** `.agent/INDEX.md`, `.agent/rules.md`, `.agent/platform.md`,
  the memory file. Regenerate via `agent:sync`.
- **Off-limits:** anything in `src/` (platform code) — requires explicit confirmation.
