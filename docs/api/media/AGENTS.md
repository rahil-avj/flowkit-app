# Agent Workflows

How a coding agent works inside a FlowKit workspace — the cold-start sequence, the
recipes for common tasks, and the system that keeps the agent's instructions accurate.

This is the _workflow_ companion to the reference docs (FLOWKIT / FLOWMASTER / FLOWLENS /
CLI). Those describe the platform; this describes how to operate it.

Works the same across repo mode, flat mode, and multi-workspace mode — see [CLI.md](CLI.md) for what differs per mode. Examples below use repo-mode paths (`workspaces/<ws>/...`); in consumer mode, drop that prefix — the same files sit at the workspace's own root.

---

## The agent file system

Every workspace ships a generated, layered file set so an agent can start building without
reading the codebase. All of it is rendered from a **single source of truth**
(`scripts/platform/agent-spec.js`) by `scripts/platform/agent-sync.js`, so it never drifts from the platform.

| Layer     | File                                                    | Role                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Memory    | `CLAUDE.md` / `AGENTS.md` / `.cursor/rules/flowkit.mdc` | Auto-ingested by the agent's tool. Identity, read-order, the hardest directives. Chosen at `flowkit nw --agent:…` (repo mode) or `--agent:` on the create-flowkit-app/create-flowkit-workspace scaffolder (consumer mode). |
| Map       | `.agent/INDEX.md`                                       | `Task → Action → Detail`. The fast lookup — every task in one hop.                                                                                                                                                         |
| Rules     | `.agent/rules.md`                                       | The full directive set (`NEVER` / `ALWAYS` / `TO … → …`).                                                                                                                                                                  |
| Reference | `.agent/platform.md`                                    | Terse surface map; each row points to further detail.                                                                                                                                                                      |
| Product   | `.agent/project.md`                                     | Hand-owned brief: what the product is. **Never regenerated.**                                                                                                                                                              |
| State     | `.agent/.agent-meta.json`                               | `{ agent, kit, language, specVersion }` written by `agent:sync`.                                                                                                                                                           |

> ⚠️ **Known gap in consumer mode (flat/multi-workspace), confirmed live 2026-07-10:** `.agent/platform.md`'s rows currently point at `Documentation/*.md` files and `@flowkit`/`@shared` path aliases that only exist inside this monorepo — neither ships to a scaffolded consumer project. `agent:sync` itself runs successfully and produces valid files in consumer mode; only `platform.md`'s _content_ assumes repo mode unconditionally. Treat its pointers/import-path examples as reference-only in consumer mode until fixed — see [CLI.md](CLI.md#agent-onboarding).

### Cold-start sequence (what an agent reads, in order)

1. **memory file** — already in context; gives identity + the non-negotiables + the read order.
2. **`.agent/rules.md`** — the directives it operates under.
3. **`.agent/INDEX.md`** — the map; from here, jump straight to the task.
4. **`.agent/platform.md`** — terse surface map; each row points to the full doc. Read only when a rules/INDEX row points there.
5. **`.agent/project.md`** — what _this_ product is (flows, data model, decisions).
6. Full reference docs (this `docs/` folder) **only when a rules/INDEX row points there.**

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

| Rule                                                                                       | Why                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Never call `useDashboard()`'s `navigateTo` unguarded during flow playback                  | Use `useFlowNav()` (or id-wiring) inside a flow so FlowMaster's guards, animations, and recorded `flow.transition` fire. `useDashboard().navigateTo`, guarded on the `isFlow` prop FlowMaster injects, is the correct way to make a screen _also_ navigable standalone from the Screens tab — see "Navigation" below. |
| Never hand-write flow/screen files from scratch                                            | Copy an existing screen's boilerplate — the structure and exports must be consistent.                                                                                                                                                                                                                                 |
| Never edit platform source (`src/` in repo mode, `node_modules/flowkit/` in consumer mode) | That's the shared platform engine, not workspace content.                                                                                                                                                                                                                                                             |
| Never hardcode hex colors                                                                  | Use `lib/design-system/tokens.css` vars or `useTheme()` tokens so kit/theme switching works.                                                                                                                                                                                                                          |
| Always use the right import for the mode you're in                                         | Repo mode: `@flowkit/`/`@workspace/` aliases (renamed from `@platform` 2026-07-12). Consumer mode: import directly from `'flowkit'` — the `@flowkit*`/`@workspace` aliases only exist inside this monorepo, not in a scaffolded project. Relative `../../` paths break across the workspace boundary in either mode.  |

---

## Workspace format

Workspaces use the **flat flowplan format**: `flows/<flow>/<screen>/<Screen>.tsx` + `flowplans/*.ts`. There is no `_playFlow.ts`, no `router.tsx`, no `projects/` directory (unless you've deliberately opted into the nested-layout `projects` field in `workspace.ts` — see CLI.md).

---

## Task recipes

The canonical way to do each common thing. (The INDEX routes here; the reference docs have full detail.)

### Add a screen (flat flowplan format)

1. Create the screen folder and component:

```
flows/<flow>/<screen-slug>/<ScreenName>.tsx
```

Boilerplate (copy from an existing screen, then fill the body):

```tsx
// repo mode
import type { FlowScreenProps } from '@flowkit/types'
// consumer mode (flat/multi-workspace)
import type { FlowScreenProps } from 'flowkit'

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

Or use the CLI, which handles both steps and works in all three modes: `flowkit create:screen --flow:<flow-id> --name:<screen-slug>` then `flowkit add:step --flowplan:<flow-id> --screen:<screen-slug> --action:"..."`.

> **To remove a screen:** `flowkit remove:screen --flow:<flow-id> --name:<screen-slug>` (unregisters it and deletes the directory — safer than a manual `rm -rf`, since it also updates `workspace.ts`).

### Add a flowplan

Drop a `.ts` file into `flowplans/` using `defineFlow()`, or run `flowkit create:flowplan --name:<flow-id>`. Run `flowkit plan:ls` to confirm it's discovered, `flowkit check:flowplans` to validate.

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

`useFlowNav()` throws if the screen has no `FlowMaster` ancestor — flow playback only.

### Make a screen also navigable from the Screens tab (no flow active)

```ts
export default function HomeScreen({ isFlow }: FlowScreenProps) {
  const { navigateTo } = useDashboard()
  return <button onClick={() => !isFlow && navigateTo('detail')}>Open</button>
}
```

The `isFlow` guard is required — without it the click also fires during flow
playback and desyncs `DashboardContext`'s view history from `FlowEngine`'s own
step index.

### Read / mutate data

```ts
const { db, updateDb } = useDashboard() // db is injected — do NOT import it directly
updateDb(d => {
  d.cart.count += 1
})
```

Seed data lives in `lib/data/db.ts`. → FLOWKIT.md (Mock database)

### Gate access (entry guards)

```ts
// in screenMeta:
canEnter:    ({ db }) => db.auth.isLoggedIn,
canNotEnter: ({ db }) => db.auth.isGuestUser,
```

### Style

Tailwind for static values; `style={{}}` only for dynamic/computed values; colors from tokens / `useTheme()`. The active kit's tokens are wired at workspace creation (repo mode) or scaffold time (consumer mode). → FLOWKIT.md (Kit system, Theming)

### Add a reviewer toggle

Edit `lib/data/simulator.tsx` (a default-exported JSX component):

```tsx
<ControlAccordion label="Auth" defaultOpen>
  <SimToggle label="Logged in" bind="db.auth.isLoggedIn" />
</ControlAccordion>
```

Components: `ControlAccordion`, `SimToggle`, `SimSegmented`, `SimSelect`, `SimAction`, `SimTextInput`, `SimNumberInput`, `SimControl` — from `@features/simulator/controls` (repo mode) or `'flowkit'` (consumer mode). → FLOWKIT.md (Simulator controls authoring)

### Work with recorded sessions

Recording is always on (the user drives it in-app). The committed library is CLI-managed and works in all three modes:

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
flowkit check           # validate all authored content (screens/config/components/db/flowplans) — exits 1 on error
flowkit check:<domain>  # validate just one domain — screens/config/components/db/flowplans
flowkit plan:ls         # list all flowplans with file paths
```

All four work in every mode (repo, flat, multi-workspace).

---

## Keeping the files accurate (the anti-drift system)

The agent files are generated, not hand-maintained. When the platform changes, regenerate:

```bash
flowkit agent:sync                 # active workspace, keep its agent
flowkit agent:sync:<ws>            # a specific workspace (repo mode)
flowkit agent:sync --agent:cursor  # switch agent target (removes the old memory file)
```

- `agent:sync` re-emits `INDEX.md`, `rules.md`, `platform.md`, and the memory file. It **never**
  touches `project.md`.
- There is no separate staleness-check command as of this writing — `agent:check` doesn't exist,
  and `flowkit export`'s pre-flight checks (TypeScript, ESLint) don't cover agent-file staleness
  either. Re-run `agent:sync` yourself after any platform change.
- To change platform facts, edit **`scripts/platform/agent-spec.js`** (the single source), bump
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

- **Owns / edits freely:** everything at the workspace's own root — `flows/`, `flowplans/`,
  `lib/`, and `.agent/project.md` (the product brief).
- **Generated (don't hand-edit):** `.agent/INDEX.md`, `.agent/rules.md`, `.agent/platform.md`,
  the memory file. Regenerate via `agent:sync`.
- **Off-limits:** platform source — `src/`/`scripts/` in repo mode, `node_modules/flowkit/` in
  consumer mode. Requires explicit confirmation before touching either.
