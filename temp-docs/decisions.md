# Architectural decision log (condensed)

Merged from the "Decision Log" sections of `trackers/flowkit-tracker.md`,
`trackers/flowlens-tracker.md`, `trackers/flowmaster-tracker.md`,
`trackers/workspace-setup-tracker.md`. De-duplicated — the workspace-setup tracker's own
"Three known gaps" entry was a verbatim restatement of the agent-onboarding-audit Gaps 1–3 and
is represented once, under Workspace-Setup, pointing at the audit rather than repeated.

All entries dated 2026-06-26 unless noted. Most recent update noted inline where a later change
superseded an earlier decision.

---

## FlowKit-Core

**Feature management system designed but not implemented.** Three-layer architecture planned
(Registry → Entitlement Resolver → Feature Gate) with 7 features to register at v1: `flowlens`,
`flowplans`, `feedback`, `flowTracer`, `flowDebugger`, `flowLibrary`, `simulator`. Reason:
approaching v1 — need kill switches, beta labels, plan gating before ship; current flags
(`FLOWLENS_AVAILABLE`, `LS_SESSIONS_ENABLED`) are ad-hoc. **Status per verification-log.md:
still not implemented as of 2026-07-02** — `src/core/features/` does not exist.

**`workspaces.json` split from `workspaces.ts`.** `workspaces.json` holds the registry (name,
label, kit) as CLI-readable source of truth. `workspaces.ts` is the runtime loader deriving
`path`/`config` from the JSON — does NOT export an `active` field. Reason: CLI needs to read
workspace metadata without importing TypeScript; active-workspace selection lives in
`localStorage`, not either file.

**`flowkit sw` deprecated; workspace switching moved to browser UI.** Originally
`cmdSwitchWorkspace` printed a deprecation notice and exited. Reason: CLI switching required a
dev-server restart and didn't work reliably everywhere; the browser UI switcher is faster and
always in sync. **Update (2026-07-01, confirmed 2026-07-02): `sw`/`switch`/`switch-workspace`
removed entirely** — the deprecation stub had zero remaining function. No replacement needed.

**`kit` field in `WorkspaceConfig` is `string`, not a union type.** Any value accepted, no union
to extend per new theme. Reason: union types require a code change per new kit — friction. The
canvas sets `data-kit="<value>"` dynamically at runtime, not type-checked.

**Tailwind v4, CSS-only configuration.** No `tailwind.config.js`; all tokens in
`src/index.css @theme {}`. Two-tier var architecture: raw `--theme-*` vars set by `ThemeContext`,
aliased as `--color-theme-*` for Tailwind utility generation. Reason: Tailwind v4's CSS-native
config eliminates the JS config file; runtime theme injection gives dark/light switching without
class toggling or rebuild.

**Old workspace format kill-switched.** Old `_playFlow.ts`/`flows/router.tsx` format disabled by
default, enabled only via `removed` env flag; old CLI commands moved under `flowkit arch <cmd>`.
Reason: Flowplan format is the path forward; old support stays isolated per the
"Backward Compatibility Through Isolation" principle.

**Multi-session Reports revamp scoped to `ReportsOverlay.tsx` only.** No changes to
`AnalyticsOverlay.tsx`, `analyticsPrimitives.tsx`, `aggregate.ts`, `sessionFilters.ts`, or
`HeatmapView.tsx`. Reason: containment — the layout problem is UI-only; the aggregation/filter
logic already supports date ranges and quality-range filters the old UI never exposed.

---

## FlowLens

**Multi-session Reports scoped to Phase 3.** Phase 1 = single-session replay + analytics.
Phase 2 = visual flow editor. Multi-session aggregation (cohort filtering, merged heatmaps,
session-list infra) added scope beyond the core replay mission — shipping Phase 1 independently
validated the recording pipeline first.

**`LensSideExplorer`/`LensSideInspector` are the FlowLens panel component names.** Left = sessions
list, right = tabbed session info/reports quick view. (Earlier docs referenced non-existent
`FlowLensLeftPanel.tsx`/`FlowLensRailPanel.tsx` — corrected.) Named to match the main canvas's
`KitSideExplorer`/`KitSideInspector` convention.

**Session library committed to `src/modes/flowlens/library/<ws>/`.** Glob-loaded, co-located with
the lazy FlowLens chunk so the glob is only evaluated when the chunk loads — placing library files
outside the chunk would require a separate glob that couldn't be dead-code-eliminated.

**FlowTracer gated by localStorage toggle, independent of the build flag.** Recording is always in
the bundle regardless of `VITE_ENABLE_FLOWLENS`; whether it's active in-session is controlled by
`flowkit:sessions:enabled`. Reason: lets teams ship the standalone export with recording on but
replay off — sessions accumulate for later analysis without shipping the full analytics UI.

**`WriteBatcher(300ms)` as module-level singleton.** Events/cursor samples queue through
`sessionWriteBatcher` in `sessionDb.ts`, not written directly to IndexedDB. Reason: at 60fps
cursor tracking, individual writes would be ~60 IndexedDB transactions/sec; batching reduces to
~2/sec with no data loss (`stopRecording` awaits a final flush).

**`snapshots` per-session queries reuse the existing compound `sessionId_sequenceId` index via an
open-ended `IDBKeyRange.bound` prefix, instead of adding a plain `sessionId` index.** (2026-07-03,
fixing T-3.) `events`/`cursor_samples` both have a plain `sessionId` index; `snapshots` only has the
compound one. Reason: `IDBKeyRange.bound([sessionId, -Infinity], [sessionId, Infinity])` scopes the
existing index to one session with no `DB_VERSION` bump/migration — the more conservative choice
for a client-side store with potentially open connections in other tabs. The `snapshots`/`events`
schema asymmetry this preserves is cosmetic, not a correctness issue.

**`SessionMeta.remarks` is `SessionRemark[]` (`{text, timestamp}`), not `string[]`.** (2026-07-03,
fixing a regression introduced while fixing T-5.) `timestamp` is wall-clock (`Date.now()`),
deliberately a different epoch from `SessionEvent.timestamp` (`performance.now()`, page-load-relative
— see the `recoverCrash` comment in `context/index.tsx`). Reason: `meta.remarks` is the single
source of truth for remarks (per the T-5 fix, replacing a dual-read from `events` + `meta.remarks`),
so it needs to carry its own timing data rather than relying on the `events` store, which uses an
incompatible clock. `recoverCrash` converts recovered events' `performance.now()` deltas to
wall-clock via `crashSession.startTime` when reconstructing remarks after a crash.

---

## FlowMaster

**Flowplan format adopted as primary; old kept behind kill-switch.** `defineFlow()`/
`projects/**/flowplans/*.ts` is current; old `_playFlow.ts` stays functional behind `removed`,
CLI-scaffolded under `flowkit arch`. Reason: flowplans are pure TS data, compile to the same
runtime `FlowConfig`, and support forks/db-patches/step-level simulator overrides the old format
can't express — the compiler boundary meant zero runtime changes were needed to add it.

**`InteractionCtx` has 8 fields, not 3.** `{ activeScreenId, history, flowState, get, set, db,
updateDb, effect }`. `get`/`set` give ergonomic sandbox access without exposing the full mutation
API; `effect()` gives a named debugger-visible hook without coupling to db.

**`on:` shorthand preferred over `interactions:` verbose form.** Both compile to the same shape
via `normalizeOnMap()`. `on:` is documented as preferred (concise, common case); `interactions:`
stays valid for explicit edge-case control. Runtime reads only the normalized form.

**Flowplan visual editor seam reserved for Phase 2.** `FlowPlaybackContext` intentionally left
open — compiled flowplan steps are already available at runtime, so a Phase 2 visual editor that
reads/modifies those steps needs no runtime changes.

**Old CLI flow commands moved under `flowkit arch`.** `nf`, `ns`, `rs`, `rn`, `dup`, `order`,
`build:flows` dispatch only under `arch <cmd>` — namespacing signals old status explicitly rather
than implying they're the primary workflow.

---

## Workspace-Setup

**`agentSpec.js` as single source for all agent-facing facts.** All platform facts reaching agents
(hooks, types, CLI commands, directives) are authored once in `scripts/lib/agentSpec.js`;
`agent.js` formats them per target. Hand-editing `.agent/INDEX.md`, `rules.md`, or `platform.md`
is forbidden. Reason: three workspaces with hand-maintained agent docs drifted within one refactor
cycle — single-source + regeneration is the only sustainable model.

**Cold-start read order: memory → rules → INDEX → platform → project → depth.** The generated
memory file and INDEX both encode this order. Reason: INDEX is the fast-lookup layer, read before
`platform.md` so the agent can jump directly to relevant docs; `project.md` comes after
`platform.md` because it's product-specific, not platform-specific.

**`project.md` is hand-owned and never regenerated.** `agent:sync` creates it once from a template,
never overwrites it. Reason: the product brief is the one thing the platform can't generate —
making it hand-owned prevents sync from destroying hand-written content. **Known unresolved
consequence: it's still unfilled in all real workspaces as of the last agent-onboarding audit —
see `features.md` T-13.**

**Four agent targets supported: `claude`, `agents`, `cursor`, `none`.** `--agent:claude` emits
`CLAUDE.md`; `--agent:agents` emits `AGENTS.md` (default); `--agent:cursor` emits
`.cursor/rules/flowkit.mdc`; `--agent:none` emits only `.agent/*` docs. Reason: maximize reach
across major coding tools without changing generated content, only the target file.

**Workspace consolidation: `test1`/`test123`/`flowtest` removed; `nClarity` is the active
workspace.** Reason: multiple near-identical test workspaces fragmented the committed session
library and made `agent:check` noisy; one real workspace gives better signal.

**Old CLI commands isolated under `flowkit arch`; imports moved to `scripts/lib/old/`.** Reason:
namespacing makes old status explicit at the call site; isolating into `old/` keeps
`scripts/lib/` clean per the backward-compatibility-through-isolation principle.

**Three known agent-readiness gaps (superseded — see `agent-onboarding-audit.md` directly).**
The workspace-setup tracker's own decision-log entry for these has been reduced to a pointer
rather than restating them — see `features.md` T-13, T-14, T-15 for the condensed versions, or
the full audit for complete detail.
