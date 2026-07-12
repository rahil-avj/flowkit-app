# Workspace-Setup

Workspace-Setup covers everything that makes a workspace ready for a developer or AI agent to use: the CLI, the agent bootstrap system, the workspace format spec, and the anti-drift infrastructure. It is the "last mile" between platform capabilities and productive workspace authoring.

---

## Scope

### In scope

#### CLI — workspace lifecycle

- `flowkit nw[:<name>]` — create workspace (guided or express); accepts `--kit:`, `--lang:`, `--agent:` flags
- `flowkit rw[:<name>]` — remove workspace
- `flowkit export` — standalone HTML export (`dist-standalone/`)
- `flowkit handoff` — developer handoff zip (`handoff/`)
- `flowkit status` — health snapshot: flows, projects, router freshness, sessions, feedback, agent staleness

#### CLI — old flow scaffolding (under `arch`)

All under `flowkit arch <cmd>`:

- `nf:<Flow>` — create flow + screens
- `ns:<Flow> ScreenName` — add screen to flow
- `rs:<Flow> ScreenName` — remove screen
- `rn:<Flow> OldName NewName` — rename screen
- `dup:<Flow> NewName` — duplicate flow
- `order` — reorder flows or screens
- `build:flows` — rebuild `router.tsx` after manual `_playFlow.ts` edits
- `ls` — list flows and screens

#### CLI — sessions (committed library)

- `sessions:ls`, `sessions:import`, `sessions:check`, `sessions:stats`, `sessions:sample`, `sessions:rm`, `sessions:purge`, `sessions:brief`
- `lens:report` — aggregate JSON analytics report
- `sessions:brief --append` — writes analytics brief to `.agent/project.md`

#### CLI — planned additions

- `plan:ls`, `plan:check` — Flowplan discovery and validation (no separate spec doc exists; see `trackers/flowkit-tracker.md` § Feature management system for the closest related design)
- Long-form aliases for all commands (`new-workspace`, `remove-flow`, etc.) — spec § A
- `isTTY` guard in `selectFromList` for VS Code / non-TTY terminals — spec § D
- Array-literal syntax for `order flows [auth, onboarding, home]` — spec § E
- `feedback:import`, `feedback:dump`, `feedback:ls` — feedback committed snapshot — spec § J

#### Agent bootstrap system

- **Single source of truth:** `scripts/lib/agentSpec.js` holds all platform facts; `scripts/lib/agent.js` formats them
- **Generated files per workspace:** `.agent/INDEX.md`, `.agent/rules.md`, `.agent/platform.md`, memory file (`CLAUDE.md` / `AGENTS.md` / `.cursor/rules/flowkit.mdc`)
- **Hand-owned:** `.agent/project.md` — never regenerated; the product brief the agent reads cold
- **Anti-drift:** `flowkit agent:sync` regenerates all generated files; `flowkit agent:check` warns on staleness; `flowkit export` pre-flight runs `agent:check`
- **Supported targets:** `claude` (CLAUDE.md), `agents` (AGENTS.md, default), `cursor` (.cursor/rules/flowkit.mdc), `none` (.agent docs only)
- **Spec version:** `AGENT_SPEC_VERSION` in `agent.js`; bump + sync all workspaces on every platform-facts change

#### Workspace format spec

- `workspaces.json` — registry: name, label, kit (CLI-readable source of truth)
- `workspaces.ts` — runtime loader (derives `path`, typed `config`); exports `workspaces[]`, `LS_ACTIVE_WORKSPACE`, `getStoredWorkspace`, `storeWorkspace`, `clearStoredWorkspace`
- Flowplan workspace structure: `projects/<proj>/flowplans/*.ts` + `projects/<proj>/flows/<Flow>/<Screen>/index.tsx`
- Old workspace structure: `flows/<Flow>/_playFlow.ts` + `flows/router.tsx` (auto-generated)

### Out of scope

- The content of `.agent/INDEX.md`, `rules.md`, `platform.md` — those are outputs of `agentSpec.js`, not authored here
- The content of `.agent/project.md` — hand-owned by the workspace author, not the platform
- The FlowKit platform docs (`Documentation/*.md`) — those are the source material; this subsystem generates the terse agent-facing summaries of them
- The session recording engine — that is FlowLens/FlowTracer
- CI/CD pipeline setup for workspace repos

### Key constraints

- **`agent:sync` never touches `project.md`.** It creates the file once (from template) and never overwrites it.
- **Hand-edited `.agent/*` files drift.** Never hand-edit `INDEX.md`, `rules.md`, `platform.md`, or the memory file — edit `agentSpec.js` and re-sync.
- **`agentSpec.js` is the single source.** Any platform fact that should reach agents must go through `agentSpec.js`. Duplicating facts in hand-written docs creates drift.
- **The `platform.md` pipe-separator bug.** The `sessions:*` CLI row uses `|` separators inside a markdown table cell, breaking the table. Fix in `agentSpec.js` `cliRows()` — use `/` instead. Tracked in `Agent_Onboarding.md` Gap 2.

---

## Decision Log

Append-only. Most recent at top.

---

## 2026-06-26 — `agentSpec.js` as single source for all agent-facing facts

**Decision:** All platform facts that reach agents (hooks, types, CLI commands, directives) are authored once in `scripts/lib/agentSpec.js`. `agent.js` formats them into whichever target agent's files. Hand-editing `.agent/INDEX.md`, `rules.md`, or `platform.md` is forbidden.
**Reason:** Three workspaces with hand-maintained agent docs drifted within one refactor cycle. Single-source + regeneration is the only sustainable model. Matches `DevelopmentValues.md` Principle 12 (Minimize Surface Area).
**Source:** `Documentation/project-plans/audits/agent-onboarding-audit.md`; `scripts/lib/agentSpec.js`

---

## 2026-06-26 — Cold-start read order: memory → rules → INDEX → platform → project → depth

**Decision:** The generated memory file and INDEX both encode the same read order: memory file (already in context) → `.agent/rules.md` → `.agent/INDEX.md` → `.agent/platform.md` (only when an INDEX row points there) → `.agent/project.md` → `Documentation/*` (depth on demand).
**Reason:** The INDEX is the fast-lookup layer — the agent should read it before `platform.md` so it can jump directly to the relevant doc rather than scanning the surface reference. `project.md` comes after `platform.md` because it is product-specific, not platform-specific.
**Source:** `scripts/lib/agent.js:77` (INDEX read-order line); `AGENTS.md` cold-start section

---

## 2026-06-26 — `project.md` is hand-owned and never regenerated

**Decision:** `agent:sync` creates `project.md` once from a template and never overwrites it. It is the workspace author's responsibility to fill it in.
**Reason:** The product brief is the one thing the platform cannot generate — it requires product knowledge. Making it hand-owned prevents the sync cycle from destroying hand-written content.
**Source:** `scripts/lib/agent.js:243–248`

---

## 2026-06-26 — Four agent targets supported: `claude`, `agents`, `cursor`, `none`

**Decision:** `--agent:claude` emits `CLAUDE.md` (workspace root); `--agent:agents` emits `AGENTS.md` (default); `--agent:cursor` emits `.cursor/rules/flowkit.mdc`; `--agent:none` emits only `.agent/*` docs with no memory file.
**Reason:** Different coding tools ingest memory files differently. Supporting all three major tools (Claude Code, standard AGENTS.md, Cursor) without changing the generated content — only the target file — maximizes reach with minimum maintenance cost.
**Source:** `scripts/lib/agent.js:26–29`; `AGENTS.md` agent targets table

---

## 2026-06-26 — Workspace consolidation: `test1`/`test123`/`flowtest` removed; `nClarity` is the active workspace

**Decision:** The three development test workspaces were removed. `nClarity` is the single active workspace for development and agent testing.
**Reason:** Multiple near-identical test workspaces fragmented the committed session library and made `agent:check` outputs noisy. One real workspace with real flows gives better signal.
**Source:** `CHANGELOG` — "Workspace consolidation"

---

## 2026-06-26 — Old CLI commands isolated under `flowkit arch`

**Decision:** `nf`, `ns`, `rs`, `rn`, `dup`, `order`, `build:flows` are dispatched only under `flowkit arch <cmd>`. They import from `scripts/lib/old/flows.js`. No old command is top-level.
**Reason:** Namespacing under `arch` makes old status explicit at the call site. Isolating into `old/` keeps the main `scripts/lib/` clean and enforces the backward-compatibility-through-isolation principle (DevelopmentValues.md Principle 16).
**Source:** `scripts/flowkit.js:548+`; `scripts/lib/old/`

---

## 2026-06-26 — Three known gaps in agent readiness (not yet fixed)

**Decision:** Tracked in full in `Documentation/project-plans/audits/agent-onboarding-audit.md` Gaps 1–3 (unfilled `project.md`, malformed `platform.md` CLI table, `@platform/` vs `@shared/` import inconsistency) — see that doc for details, don't duplicate here.
**Reason:** All three are low-effort, high-impact fixes but require `agent:sync` to propagate.
**Source:** `Documentation/project-plans/audits/agent-onboarding-audit.md` Gaps 1–3
