# FlowMaster — Decision Log

Append-only. Most recent at top.

---

## 2026-06-26 — Flowplan format adopted as primary; old kept behind kill-switch

**Decision:** `defineFlow()` / `projects/**/flowplans/*.ts` is the current authoring format. Old `_playFlow.ts` stays functional behind `removed` and is CLI-scaffolded under `flowkit arch <cmd>`.
**Reason:** Flowplans are pure TypeScript data, compile to the same runtime `FlowConfig`, and support forks, db patches, and step-level simulator overrides that `_playFlow.ts` cannot express. The compiler boundary (Principle 3) means the runtime needed zero changes to support it.
**Source:** `src/features/flow-library/compileFlowplan.ts`; `src/types/index.ts:571–700`

---

## 2026-06-26 — `InteractionCtx` has 8 fields, not 3

**Decision:** `InteractionCtx` type is `{ activeScreenId, history, flowState, get, set, db, updateDb, effect }`. The `goTo` resolver and `do` handler both receive the full ctx.
**Reason:** `get`/`set` provide ergonomic sandbox access without exposing the full state mutation API; `effect()` gives a named hook for side-effects visible in the Flow Debugger without coupling to db; `activeScreenId` and `history` enable conditional navigation without external state.
**Source:** `src/types/index.ts:237–262`

---

## 2026-06-26 — `on:` shorthand is preferred over `interactions:` verbose form

**Decision:** Both compile to the same shape via `normalizeOnMap()`. `on:` is the documented preferred form. `interactions:` remains valid for explicit control.
**Reason:** `on:` is more concise and readable for the common case (tap → next). `interactions:` is kept for edge cases requiring full field control. Both must remain supported — runtime reads normalized form only.
**Source:** `FLOWMASTER.md`; `src/core/layout/FlowMaster.tsx`

---

## 2026-06-26 — Flowplan visual editor seam reserved for Phase 2

**Decision:** `FlowPlaybackContext` is intentionally left open for Phase 2 extension. Comment in `src/shared/contexts/FlowPlaybackContext.tsx`: "Phase 2 (visual editor) keep extending."
**Reason:** The compiled flowplan steps are already available at runtime — a visual editor that reads and modifies those steps is a natural Phase 2. The seam is reserved so Phase 2 doesn't require runtime changes (Principle 2).
**Source:** `src/shared/contexts/FlowPlaybackContext.tsx`; grep for "Phase 2"

---

## 2026-06-26 — Old CLI flow commands moved under `flowkit arch`

**Decision:** `flowkit nf`, `flowkit ns`, `flowkit rs`, `flowkit rn`, `flowkit dup`, `flowkit order`, `flowkit build:flows` are all dispatched only under `flowkit arch <cmd>`. Top-level `flowkit nf` hits the unknown-command error.
**Reason:** These commands scaffold old `_playFlow.ts` flows. Exposing them at top-level implies they are the primary workflow, which they are not. Namespacing under `arch` signals old status clearly.
**Source:** `scripts/flowkit.js:548+`; confirmed in CLI.md doc audit

---

## 2026-06-26 — Multi-session Reports land in Phase 3

**Decision:** `src/modes/flowlens/components/FlowLensAnalyticsOverlays.tsx` contains the comment: "Multi-session Reports land in Phase 3." The revamp of `ReportsOverlay.tsx` is active work within Phase 3.
**Reason:** Phase 1 shipped single-session replay and analytics. Multi-session aggregation requires additional data infrastructure (cohort filtering, date ranges, aggregate heatmaps) that was scoped separately.
**Source:** Comment in `FlowLensAnalyticsOverlays.tsx`; `Documentation/project-plans/FlowLens_ReportsOverlay.md`
