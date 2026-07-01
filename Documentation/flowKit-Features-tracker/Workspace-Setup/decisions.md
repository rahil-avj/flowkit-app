# Workspace-Setup — Decision Log

Append-only. Most recent at top.

---

## 2026-06-26 — `agentSpec.js` as single source for all agent-facing facts

**Decision:** All platform facts that reach agents (hooks, types, CLI commands, directives) are authored once in `scripts/lib/agentSpec.js`. `agent.js` formats them into whichever target agent's files. Hand-editing `.agent/INDEX.md`, `rules.md`, or `platform.md` is forbidden.
**Reason:** Three workspaces with hand-maintained agent docs drifted within one refactor cycle. Single-source + regeneration is the only sustainable model. Matches `DevelopmentValues.md` Principle 12 (Minimize Surface Area).
**Source:** `Documentation/project-plans/Agent_Onboarding.md`; `scripts/lib/agentSpec.js`

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

**Decision:** Three gaps are documented but not yet resolved:

1. `project.md` is unfilled in all workspaces — agents have zero product context on cold-start
2. `platform.md` CLI table broken by `|` separators in the `sessions:*` row — fix is one line in `agentSpec.js` `cliRows()`
3. Import paths inconsistency — `platform.md` uses `@platform/contexts/DashboardContext` but `@shared/` is the preferred alias

**Reason:** All three are low-effort, high-impact fixes but require `agent:sync` to propagate. Tracked here to ensure they don't get lost.
**Source:** `Documentation/project-plans/Agent_Onboarding.md` Gaps 1–3
