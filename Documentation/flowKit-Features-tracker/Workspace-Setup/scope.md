# Workspace-Setup — Scope

Workspace-Setup covers everything that makes a workspace ready for a developer or AI agent to use: the CLI, the agent bootstrap system, the workspace format spec, and the anti-drift infrastructure. It is the "last mile" between platform capabilities and productive workspace authoring.

---

## In scope

### CLI — workspace lifecycle

- `flowkit nw[:<name>]` — create workspace (guided or express); accepts `--kit:`, `--lang:`, `--agent:` flags
- `flowkit rw[:<name>]` — remove workspace
- `flowkit export` — standalone HTML export (`dist-standalone/`)
- `flowkit handoff` — developer handoff zip (`handoff/`)
- `flowkit status` — health snapshot: flows, projects, router freshness, sessions, feedback, agent staleness
- `flowkit sw` — **deprecated**; prints notice, does nothing; workspace switching is browser UI only

### CLI — old flow scaffolding (under `arch`)

All under `flowkit arch <cmd>`:

- `nf:<Flow>` — create flow + screens
- `ns:<Flow> ScreenName` — add screen to flow
- `rs:<Flow> ScreenName` — remove screen
- `rn:<Flow> OldName NewName` — rename screen
- `dup:<Flow> NewName` — duplicate flow
- `order` — reorder flows or screens
- `build:flows` — rebuild `router.tsx` after manual `_playFlow.ts` edits
- `ls` — list flows and screens

### CLI — sessions (committed library)

- `sessions:ls`, `sessions:import`, `sessions:check`, `sessions:stats`, `sessions:sample`, `sessions:rm`, `sessions:purge`, `sessions:brief`
- `lens:report` — aggregate JSON analytics report
- `sessions:brief --append` — writes analytics brief to `.agent/project.md`

### CLI — planned additions

- `plan:ls`, `plan:check` — Flowplan discovery and validation (spec in `Feature_Management_System.md` § H)
- Long-form aliases for all commands (`new-workspace`, `remove-flow`, etc.) — spec § A
- `isTTY` guard in `selectFromList` for VS Code / non-TTY terminals — spec § D
- Array-literal syntax for `order flows [auth, onboarding, home]` — spec § E
- `feedback:import`, `feedback:dump`, `feedback:ls` — feedback committed snapshot — spec § J

### Agent bootstrap system

- **Single source of truth:** `scripts/lib/agentSpec.js` holds all platform facts; `scripts/lib/agent.js` formats them
- **Generated files per workspace:** `.agent/INDEX.md`, `.agent/rules.md`, `.agent/platform.md`, memory file (`CLAUDE.md` / `AGENTS.md` / `.cursor/rules/flowkit.mdc`)
- **Hand-owned:** `.agent/project.md` — never regenerated; the product brief the agent reads cold
- **Anti-drift:** `flowkit agent:sync` regenerates all generated files; `flowkit agent:check` warns on staleness; `flowkit export` pre-flight runs `agent:check`
- **Supported targets:** `claude` (CLAUDE.md), `agents` (AGENTS.md, default), `cursor` (.cursor/rules/flowkit.mdc), `none` (.agent docs only)
- **Spec version:** `AGENT_SPEC_VERSION` in `agent.js`; bump + sync all workspaces on every platform-facts change

### Workspace format spec

- `workspaces.json` — registry: name, label, kit (CLI-readable source of truth)
- `workspaces.ts` — runtime loader (derives `path`, typed `config`); exports `workspaces[]`, `LS_ACTIVE_WORKSPACE`, `getStoredWorkspace`, `storeWorkspace`, `clearStoredWorkspace`
- Flowplan workspace structure: `projects/<proj>/flowplans/*.ts` + `projects/<proj>/flows/<Flow>/<Screen>/index.tsx`
- Old workspace structure: `flows/<Flow>/_playFlow.ts` + `flows/router.tsx` (auto-generated)

---

## Out of scope

- The content of `.agent/INDEX.md`, `rules.md`, `platform.md` — those are outputs of `agentSpec.js`, not authored here
- The content of `.agent/project.md` — hand-owned by the workspace author, not the platform
- The FlowKit platform docs (`Documentation/*.md`) — those are the source material; this subsystem generates the terse agent-facing summaries of them
- The session recording engine — that is FlowLens/FlowTracer
- CI/CD pipeline setup for workspace repos

---

## Key constraints

- **`agent:sync` never touches `project.md`.** It creates the file once (from template) and never overwrites it.
- **Hand-edited `.agent/*` files drift.** Never hand-edit `INDEX.md`, `rules.md`, `platform.md`, or the memory file — edit `agentSpec.js` and re-sync.
- **`agentSpec.js` is the single source.** Any platform fact that should reach agents must go through `agentSpec.js`. Duplicating facts in hand-written docs creates drift.
- **The `platform.md` pipe-separator bug.** The `sessions:*` CLI row uses `|` separators inside a markdown table cell, breaking the table. Fix in `agentSpec.js` `cliRows()` — use `/` instead. Tracked in `Agent_Onboarding.md` Gap 2.
