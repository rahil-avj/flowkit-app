# Audit: Agent Onboarding, Platform Understanding & Vision Loop Integrity

## Context

This audit covers two related concerns:

1. **Agent readiness** — what gaps prevent an AI agent from working confidently inside Flowkit without guessing or producing fragile output.
2. **Vision loop integrity** — whether the platform as built actually closes the full loop described in the vision: Brief → Agent builds → Share → Feedback → Agent iterates → Real-user testing → Analytics → Developer handoff.

The strategic review found the execution core (FlowEngine, FlowMaster, session recording, FlowLens) is architecturally sound. The loop has two broken links that prevent the vision from working end-to-end.

---

## What Exists (and Works Well)

The current setup is genuinely strong in many areas:

**CLAUDE.md (project root)** — 798 lines of excellent reference:

- Complete module map (every file and its purpose)
- Path alias table (all 7 aliases, what they resolve to)
- Code conventions: TypeScript, React, CVA, context patterns, import ordering
- Full visual design system: tokens, spacing, shadows, z-index, typography scale
- Architecture layers and the ESLint boundary rules
- Anti-patterns section ("What to Avoid")

**Documentation/ folder** — 8 files covering platform depth:

- `FLOWMASTER.md` — flow engine, `_playFlow.ts` config, guards, animations, auto-play
- `FLOWKIT.md` — architecture, kit system, canvas, db, theming, feedback
- `FLOWLENS.md` — session recording, replay, analytics
- `CLI.md` — full command reference
- `AGENTS.md` — cold-start sequence, directive grammar, task recipes, anti-drift system
- `DevelopmentValues.md` — 17 engineering principles (authoritative philosophy)
- `AUDIT.md` — pre-release checklist
- `README.md` — quick start

**Per-workspace `.agent/` layer** — excellent layered structure:

- `rules.md` — NEVER/ALWAYS/TO directives (machine-unambiguous)
- `INDEX.md` — task → action → detail map (fast lookup)
- `platform.md` — terse surface reference with pointers to full docs
- `project.md` — hand-owned product brief (never regenerated)
- `.agent-meta.json` — sync state

**The system's key strengths:**

- The directive grammar (NEVER/ALWAYS/TO) is precise and agent-parseable
- Cold-start sequence is explicit and correct: memory → rules → index → project → depth on demand
- `agentSpec.js` single-source-of-truth model prevents rules drift
- Three working workspaces with real `_playFlow.ts` and flowplan examples

---

## Critical Gaps

### Gap 1 — `project.md` is unfilled in all workspaces (HIGH)

**The problem:** All three workspaces (`test1`, `test123`, `flowtest`) have `project.md` files that are pure templates — empty comment placeholders except one demo-flow row in the flows table. The cold-start sequence says the agent reads `project.md` to understand "what this product is." Right now it learns nothing.

**Impact:** Every agent working in any workspace starts with zero product context. It can scaffold mechanically but can't make product-aware decisions: guard logic, data model shape, what flows exist, what decisions shaped them.

**Fix needed:** Fill in `project.md` for each workspace with actual content: what the product is, target device/OS, real flows table, actual db shape, and key design decisions.

---

### Gap 2 — `platform.md` CLI table is malformed (HIGH)

**The problem:** In all workspaces, the `sessions:*` CLI row in `platform.md` renders broken because the pipe-separated values (`ls|import|check|stats|sample|rm`) inside a markdown table cell are parsed as column separators.

**Root cause confirmed:** `agentSpec.js` `cliRows()` (line 307) emits `flowkit sessions:ls|import|check|stats|sample|rm` as the `cmd` value. The `agent.js` renderer wraps it in backticks inside a table cell, where the `|` chars break the table.

**Fix needed:** In `scripts/lib/agentSpec.js` `cliRows()`, change that row's `cmd` to use a non-pipe separator, e.g. `flowkit sessions:ls / import / check / stats / sample / rm`. One line change, then `flowkit agent:sync`.

---

### Gap 3 — Import path inconsistency between docs (HIGH)

**The problem:** `platform.md` imports from `@platform/contexts/DashboardContext` but `CLAUDE.md` says `@platform/` is a old alias and `@shared/` is preferred. The `platformSurfaces()` function in `agentSpec.js` (line 239) hardcodes `@platform/contexts/DashboardContext` as the `from` field for the Data surface row.

**Fix needed:** In `scripts/lib/agentSpec.js`, change the Data surface `from` field from `@platform/contexts/DashboardContext` to `@shared/contexts/DashboardContext`, and the Navigation surface from `@platform/lib/useNav` to `@shared/utils/useNav`. Then run `flowkit agent:sync` across all workspaces to regenerate. Two lines in one file.

---

### Gap 4 — `DevelopmentValues.md` is not operationalized for agents (MEDIUM)

**The problem:** `DevelopmentValues.md` is an excellent human-facing philosophy document — 17 principles, well-articulated. But it's entirely abstract. An agent cannot act on "Preserve Architectural Invariants" without knowing what the invariants are in concrete code terms.

The principles are never connected back to the rules that enforce them. For example:

- Principle 7 (Explicit Data Flow) → maps to the `NEVER import db directly` rule in `rules.md`
- Principle 11 (Observers Never Influence Execution) → maps to the FlowLens/session recording architecture
- Principle 1 (Single Ownership) → maps to `NEVER navigateTo from useDashboard()` in screens

But these connections aren't made anywhere. An agent reading DevelopmentValues.md in isolation gets no actionable guidance.

**Fix needed:** Either (a) add a short "In practice" section to each principle that names the concrete rule/file/pattern it maps to, or (b) add a "Philosophy ↔ Rules mapping" section to `AGENTS.md` that cross-references them. Option (b) is lower effort.

---

### Gap 5 — `rules.md` states rules without consequences (MEDIUM)

**The problem:** `rules.md` says:

```
NEVER destructure navigateTo from useDashboard()
```

But not _why_. The AGENTS.md non-negotiables table does have a "Why" column — but that table only covers 6 rules, and `rules.md` has 40+.

An agent that understands consequences makes better judgment calls. Without consequences, it either follows rules blindly (fine until edge cases) or breaks them without knowing what it's breaking.

**Fix needed:** For the 6–8 most critical rules (navigation, router, db import, hex colors, workspace isolation), add a single inline comment explaining the consequence:

```
NEVER destructure navigateTo from useDashboard() — guards/animations/session replay won't fire
NEVER edit flows/router.tsx — auto-generated; manual edits are overwritten by build:flows
NEVER import db directly — db must be injected; direct import breaks flowplan db-patching
```

This is a small change to `agentSpec.js` (the generator source) that propagates everywhere.

---

### Gap 6 — Screen props / lifecycle is underdocumented for workspace authors (MEDIUM)

**The problem:** CLAUDE.md and FLOWMASTER.md document screen props (`PageProps`, `onNext`, `onBack`, `db`, `flowState`, `isChapter`) in type tables but no narrative walkthrough exists showing:

- Which props are always injected vs. conditionally present
- When to use `onNext` vs. `goNext()` from `useNav()` vs. id-wiring
- What `flowState` actually is (typed shape? `Record<string, unknown>`?) and when it's populated
- Whether `pageMeta` is required or optional and what breaks without it

**Fix needed:** Add a "Screen component contract" section to `FLOWMASTER.md` (or a new `SCREENS.md`) that walks through a real screen with annotations on every injected prop — when each is present, what it does, and when to prefer it.

---

### Gap 7 — Hotspot coordinates are undocumented (MEDIUM)

**The problem:** `CLAUDE.md` mentions hotspots (`{ id, x, y, w, h }`) and `FLOWMASTER.md` has an example, but nowhere states whether x/y/w/h are percentages of screen dimensions or pixel values. This is a critical authoring detail — if you get it wrong, the hotspot doesn't overlap the element.

**Fix needed:** One line in `FLOWMASTER.md` hotspot section: "x, y, w, h are percentages of the screen container's dimensions (0–100)."

---

### Gap 8 — FlowPlan authoring has no narrative entry point (LOW–MEDIUM)

**The problem:** FlowPlans (the new format, compiled by `compileFlowplan.ts`) are documented in CLI.md but only as command-flag reference. There is no document that says "start here if you're authoring a FlowPlan." The compilation model, fork logic, `mergesTo`, simulator control bindings, and db-patch semantics are scattered across CLI.md, type comments, and example files.

Agents writing complex multi-path flows with forks and db patches have to piece together the authoring model from examples.

**Fix needed:** A `FLOWPLANS.md` document (or major section in FLOWMASTER.md) with:

- When to use a flowplan vs. a old `_playFlow.ts`
- The step/fork/mergesTo model with a real worked example
- How simulator controls bind to compiled state
- How db patches interact with flowplan playback

---

### Gap 9 — Agent starts every session blind: `project.md` is always empty (CRITICAL — vision loop)

**The problem:** The cold-start sequence directs the agent to read `project.md` to understand what product it's building. In all three workspaces the file is a pure template — comment placeholders only. The agent has no product context: no flows, no data model, no design decisions, no target platform.

**Why this breaks the loop:** The vision requires an agent that can receive a brief and build with intent. Without a filled `project.md`, every session starts from zero. The agent can scaffold mechanically but can't make product-aware decisions (guard logic, db shape, navigation structure). The "brief → agent builds" step only works if the brief survives between sessions.

**Fix needed — two parts:**

1. Fill `project.md` for all existing workspaces with real content now.
2. Make it structurally impossible to skip: add an interactive brief prompt to `flowkit nw` that writes `project.md` during workspace creation. Until then, add a hard ALWAYS rule: "ALWAYS fill `.agent/project.md` before starting agent work — it is the agent's only source of product context."

---

### Gap 10 — The loop doesn't close: no analytics → agent brief path (CRITICAL — vision loop)

**The problem:** FlowLens captures real-user sessions with dwell times, frustrated clicks, path deviations, and interaction heatmaps. But there is no mechanism to package that data back into a format the agent can act on. The "analytics → iterate" step in the vision loop is entirely manual: the human must read FlowLens, synthesize insights, and manually retranslate them into a new brief for the agent.

**Why this matters:** The vision's core promise is that iteration is automated. Without this bridge, the loop becomes: build → test → human manually summarizes → human writes new brief → agent iterates. That's still better than Figma, but it's not the autonomous loop that was described.

**Fix needed:** A `flowkit sessions:brief` command — **and the infrastructure for it already exists**. `scripts/lib/sessions.js` already implements `cmdLensReport()` which reads all committed sessions and aggregates: session count, avg quality score, completion rate, and top frustrated screens. It exports JSON. The gap is that it outputs a machine-readable JSON report, not a markdown brief the agent can directly act on.

The fix is either:

- Add a `--md` flag to `lens:report` (or a new `sessions:brief` subcommand in `flowkit.js`) that formats the same data as a markdown agent brief with a "suggested focus" section
- Or wire `lens:report --md` output to append to `.agent/project.md` under an "## Last session analysis" heading

This is a small addition to `sessions.js` + registering the command in `flowkit.js`. The hard part (reading and aggregating sessions) is already done.

---

## What Does NOT Need to Change

- **CLAUDE.md** is comprehensive and well-organized — no structural changes needed
- **AGENTS.md** task recipes are accurate and actionable — the directive grammar works
- **rules.md** directive structure is correct — only the inline consequences are missing
- **DevelopmentValues.md** is correctly scoped as philosophy — it should stay abstract; the fix is connecting it elsewhere
- **INDEX.md** structure is correct — the lookup table works as designed
- **The anti-drift system** (`agentSpec.js` → `agent:sync`) is the right architecture; improvements should go into the spec, not be hand-edited

---

## Verification

After implementing the fixes above, an agent should be able to:

1. Cold-start on any workspace and immediately understand what the product is (project.md filled)
2. Copy any import from platform.md and get the correct, non-old alias
3. Read a NEVER rule and understand what breaks if violated (consequence comments)
4. Look up hotspot coordinates and know they're percentages, not pixels
5. Find a clear entry point for FlowPlan authoring without reading CLI.md end-to-end

**Agent readiness test:** Open a fresh context, give the agent only the cold-start sequence files for one workspace, and ask it to:

- Add a new flow with two screens and a guard that checks `db.auth.isLoggedIn`
- Wire a tap from screen 1 to screen 2
- Add a simulator toggle for `db.auth.isLoggedIn`

If the agent produces correct, idiomatic code without asking clarifying questions about props, navigation method, or import paths — the docs gaps are closed.

**Vision loop test:** Starting from a blank workspace:

1. Fill `project.md` via the `flowkit nw` prompt
2. Run an agent session — verify it builds with product awareness, not just scaffolding
3. Record a real-user session in FlowLens
4. Run `flowkit sessions:brief` — verify it produces actionable markdown the agent can use
5. Feed that brief back to the agent — verify it iterates on the right things

If both tests pass, the loop described in the vision works end-to-end without manual translation steps.

---

## Summary of Changes (Prioritized)

| Priority     | What                                                            | Where                                                   |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------- |
| 0 (CRITICAL) | Fill `project.md` for all workspaces + make it a `nw` prompt    | `workspaces/*/.agent/project.md` + `scripts/flowkit.js` |
| 0 (CRITICAL) | Build `flowkit sessions:brief` — analytics → agent brief export | `scripts/flowkit.js` + `Documentation/CLI.md`           |
| 1 (HIGH)     | Fix malformed sessions row in CLI table                         | `agentSpec.js` → `flowkit agent:sync`                   |
| 2 (HIGH)     | Standardize import paths to `@shared/`                          | `agentSpec.js` → `platform.md` template                 |
| 3 (MEDIUM)   | Add consequence comments to top 8 rules                         | `agentSpec.js` → `rules.md` template                    |
| 4 (MEDIUM)   | Add Philosophy ↔ Rules mapping section                          | `Documentation/AGENTS.md`                               |
| 5 (MEDIUM)   | Add "Screen component contract" walkthrough                     | `Documentation/FLOWMASTER.md`                           |
| 6 (MEDIUM)   | Document hotspot coordinate units                               | `Documentation/FLOWMASTER.md`                           |
| 7 (LOW)      | Write `FLOWPLANS.md` as FlowPlan entry doc                      | `Documentation/FLOWPLANS.md`                            |
