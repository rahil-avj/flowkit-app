# FlowKit — Master Feature & Task Tracker

Condensed 2026-07-02 from `FEATURES.md`, all 4 subsystem trackers, `execution/npm-publish-checklist.md`,
`execution/pre-launch-remediation-runbook.md`, and `execution/flat-mode-export-command.md`.
Status corrected against live code where checked — see `verification-log.md`.

**Status values:** `done` · `active` · `planned` · `broken` (implemented but a known bug makes it
incorrect/unsafe) · `blocked` (waiting on an external decision or another item)

**Subsystems:** `FlowMaster` (execution engine) · `FlowLens` (recording/replay/analytics) ·
`FlowKit-Core` (canvas/workspace/CLI/kit/simulator/feedback) · `Workspace-Setup` (CLI lifecycle,
agent bootstrap) · `Package-Publish` (npm distribution) · `Product` (vision/UX, non-code)

---

## Legend for columns

| Column | Meaning |
|---|---|
| ID | Stable id, carried from the original `FEATURES.md` # where one existed; new ids `T-*` for items condensed from execution docs that didn't have a registry number |
| Verified | Date this row's status was checked against live code; blank = carried from source doc as-is |

---

## FlowMaster — execution engine

| ID | Feature | Status | Verified | Notes |
|---|---|---|---|---|
| 1 | Flow execution engine (`useFlowEngine`) | done | | Guards, animations, `InteractionCtx` |
| 2 | Old flow format (`_playFlow.ts`) | done | | Kill-switched behind `removed`; CLI under `flowkit arch` |
| 3 | Flowplan format (`defineFlow`) | done | | `projects/**/flowplans/*.ts`; compiled by `compileFlowplan.ts` |
| 4 | Flow Debugger panel | done | | Journey/rules/state/logs sub-tabs |
| 5 | Entry guards (flow + screen level) | done | | `canEnter`/`canNotEnter`/`canEnterFallback` |
| 6 | Auto-play per screen | done | | `autoAdvanceDelay` on screen def |
| 7 | Hotspot regions | done | | `{x,y,w,h}` in % of screen |
| 8 | Visual flow editor | planned | | Phase 2. `FlowPlaybackContext` has an intentional seam reserved for it — no runtime change needed when built |

---

## FlowLens — recording, replay, analytics

| ID | Feature | Status | Verified | Notes |
|---|---|---|---|---|
| 9 | FlowTracer session recorder | done | | `SessionRecorderProvider`; IndexedDB via `WriteBatcher(300ms)` |
| 10 | Quality scoring + auto-pruning | done | | `computeQuality`; prunes >200 sessions; crash recovery on mount |
| 11 | Cursor tracking (rAF sampled) | done | | Throttled 50ms; stored as % of container |
| 12 | Toggleable recording channels | done | | 13 channels total |
| 13 | Session merge | done | | Re-sequences events/snapshots/cursors monotonically |
| 14 | FlowLens replay mode | done | | Build-gated (`VITE_ENABLE_FLOWLENS`); lazy chunk |
| 15 | Single-session analytics (Metrics/Paths/Funnel/Heatmap) | done | | `AnalyticsOverlay` |
| 16 | Cursor heatmap | done | | `HeatmapView.tsx` |
| 17 | Multi-session Reports two-pane revamp | **planned** | 2026-07-02 | ⚠️ Downgraded from `active` — spec is fully written (`specs/flowlens-reports-overlay.md`) but **zero implementation exists**. Current `ReportsOverlay.tsx` is still the old single-column/flat-filter layout. Treat as not-started, full spec ready to build from. |
| 18 | Committed session library | done | | `src/modes/flowlens/library/<ws>/*.json`, glob-loaded, zero-cost when FlowLens off |
| T-1 | ~~Bug: stale `recState` closure in `logEvent`~~ | **stale claim — not a bug** | 2026-07-03 | Re-verified and found false: `recState` is a proper `useCallback` dependency in the current `logEvent` (deps array includes it), so the guard always reads current state. No ref-based guard exists anywhere in the file — the original claim's premise doesn't match this file's architecture. Recommend removing this row; kept here struck through for traceability. |
| T-2 | Bug: `recentFlushRef` not cancelled in `resetLiveState` | **done** | 2026-07-03 | Fixed, then generalized after code review. `resetLiveState` now `clearTimeout`s and nulls both `recentFlushRef` AND `inactivityTimerRef` before clearing `recentEventsRef`/`recentEvents` — the review caught that the first fix patched only the reported symptom while leaving `inactivityTimerRef` (same class of "pending timer outlives reset" hazard, rearmed on every `logEvent`) uncovered. Closes the fast-restart race where a stale timer from the previous session could fire against already-reset state. Runbook Task 8. |
| T-3 | Bug: `getSnapshots`/`deleteSession` full-table scan | **done** | 2026-07-03 | Fixed without a schema migration, then deduped after code review. Both now query the existing compound `sessionId_sequenceId` index via `IDBKeyRange.bound([sessionId, -Infinity], [sessionId, Infinity])` — a prefix-bound range scoped to one session, instead of `getAll()`/full-cursor-scan + JS `.filter()`. Initial fix added two new near-duplicate helpers (`getAllByCompoundPrefix`/`deleteByCompoundPrefix`); code review flagged the duplication against the pre-existing `getAll`/`deleteByIndex`, so those were widened to accept `IDBValidKey \| IDBKeyRange` and the duplicates were deleted — call sites now pass `sessionIdPrefixRange(sessionId)` directly into the original helpers. No `DB_VERSION` bump needed — IndexedDB compound indexes support open-ended prefix ranges natively. `npx tsc --noEmit` clean, full `vitest run` (134 tests) passes. Runbook Task 2. |
| T-4 | Bug: `startRecording` called with 1 arg, drops tags/testMode | **done** | 2026-07-03 | **Fixed, scope narrower than originally claimed.** `SessionSettings` has no `tags`/`testMode` fields and `SessionSettingsOverlay.tsx` has no UI for either — so `panel.tsx:240`'s 1-arg call was not silently dropping user input, there was nothing to drop; it correctly starts with defaults (`tags: []`, `testMode: false`). The only real bug was the public TS interface declaring `(name?, tags?)` — missing `testMode` entirely — lying about the actual 3-arg implementation. Fixed by syncing the type at `context/index.tsx:46`. Call site left unchanged (correct as-is). Adding a real tags/testMode UI is a separate, larger follow-up if wanted — not done here. |
| T-5 | Bug: remarks double-rendered with fragile dedup | **done** | 2026-07-03 | Fixed at the root cause, not just the dedup check. `SessionInspect.tsx` now renders remarks from `meta.remarks` only — matching `exportBlobs.ts`, `sessionMetrics.ts`, and session-merge (`panel.tsx:319`), which already treated `meta.remarks` as the sole source of truth. Removed the `events`-derived `remarks` list and the whitespace-fragile string-equality dedup entirely (dead code, not patched). Confirmed the live-recording remarks panel (`panel.tsx:348`, reads `recorder.recentEvents`) is a separate, correct data source for the in-progress view and was left untouched — only the post-hoc review component had the divergent dual-read. **Follow-up (code review):** this fix cost per-remark timestamps, since `meta.remarks` was a plain `string[]` — see T-30. `npx tsc --noEmit` clean, full `vitest run` (134 tests) passes. Runbook Task 10. |
| T-6 | Cleanup: duplicated `CATEGORY_COLORS` constant | planned | | Across `panel.tsx` and `SessionInspect.tsx` — not a bug, quality-only. Not task-numbered in the runbook, noted as a follow-up. |
| T-7 | Cleanup: mixed Tailwind/inline-style approach in `panel.tsx` | planned | | Quality-only, no task number assigned. |
| T-8 | Cleanup: dead code (`useSessionRecorder.ts` re-export shim, `activeSessionId` alias, `isTestModeRef` on public context, unpopulated `SessionExport.filters`, over-exposed `sessionWriteBatcher`/`buildSessionExport`) | planned | | Batch of 5 small removals, quality-only, no task numbers assigned. |
| T-30 | Schema: `SessionMeta.remarks` widened from `string[]` to `SessionRemark[]` (`{text, timestamp}`) | **done** | 2026-07-03 | Code-review follow-up to T-5. Restores per-remark timestamps that T-5's fix had dropped, without reintroducing the `events`-vs-`meta.remarks` divergence T-5 fixed. `timestamp` is wall-clock (`Date.now()`), deliberately independent of `SessionEvent.timestamp` (`performance.now()`, page-load-relative) — the two epochs aren't comparable. Migrated all consumers: live `logEvent` push (`context/index.tsx`), `recoverCrash` (converts intra-session `performance.now()` deltas to wall-clock via `crashSession.startTime + (e.timestamp - firstTs)`, since crash-recovered events only have the monotonic clock), `SessionInspect.tsx`'s post-hoc `addRemark` + render (shows elapsed-since-start again via `formatMs(r.timestamp - meta.startTime)`), `exportBlobs.ts` markdown export (`r.text`), `LensSideInspector.tsx`'s FlowLens remarks panel (`r.text`), and session-merge in `panel.tsx` (`flatMap` unaffected by the shape change). `npx tsc --noEmit` clean, `eslint` clean, full `vitest run` (134 tests) passes. |

---

## FlowKit-Core — canvas, workspace, kit, simulator, feedback

| ID | Feature | Status | Verified | Notes |
|---|---|---|---|---|
| 19 | Multi-workspace runtime selection | done | | `workspaces.json` registry; localStorage; URL `?workspace=` param |
| 20 | Canvas (pan, zoom, keepFit) — Viewer Mode | done | 2026-07-02 | Viewer Mode shipped and default. See `specs/canvas-viewer-mode.md` — but re-check the spec's exact mechanism description (`PREVIEW_MODE` constant no longer greppable in source; likely refactored since the spec was written). |
| 20b | Canvas Mode (tiled multi-flow overview) | planned | | Design-only per the FRD — fixed-layout flow cards, pan/zoom surface, no freeform placement (explicitly ruled out — "not a Figma clone"). Open question: build fresh or evolve existing `FigmaExportGrid.tsx`/`FigmaExportView` (already does something architecturally similar for Figma handoff). |
| 21 | Device mockups (phone/tablet/desktop/wearable) | done | | `DEVICE_PRESETS` |
| 22 | Mobile canvas (BottomSheet) | done | | Full feature parity with desktop |
| 23 | Kit system (theme tokens) | done | | `src/kits/shared/`; `--kit-*` CSS vars; `data-kit` attribute |
| 24 | JavaScript workspace support | done | | `allowJs: true`; `.jsx`/`.js` screens |
| 25 | Simulator controls (built-in) | done | | Connection, network, CVD filters, blur |
| 26 | Custom simulator controls | done | | `data/simulator.tsx`; `SimControl`, `ControlAccordion`, etc. |
| 27 | In-canvas feedback wall | done | | Per-screen comments, tag filtering, screenshot attach |
| 28 | Feedback cloud sync (JSONBin) | done | 2026-07-03 | Master-key path removed (see T-9). Fully contained in `src/features/feedback/cloud-sync/`, verified via a real deletion dry-run — deleting the folder surfaces exactly 3 importing files, nothing else. |
| 29 | Feedback import (JSON + Markdown) | done | | Drag-drop, file picker, clipboard; auto-detect format |
| 36 | Feature management system (registry → entitlement resolver → gate) | planned | 2026-07-02 | Confirmed not started — `src/core/features/` does not exist. 3-layer design: Registry → Entitlement Resolver → Feature Gate; `useFeature()` hook + `<FeatureGate>`. 7 features slated for v1 registration: flowlens, flowplans, feedback, flowTracer, flowDebugger, flowLibrary, simulator. Current ad-hoc flags (`FLOWLENS_AVAILABLE`, `LS_SESSIONS_ENABLED`) are the pre-cursors to replace. |
| T-9 | ✅ Security: JSONBin master key not blocked at build/export | done | 2026-07-03 | Fixed — master-key support removed outright (not just gated) on both push and pull. Also found and deleted a second, previously-undiscovered master-key path (`src/shared/utils/useJsonBinKeyValidation.ts`, dead code, zero consumers). Fixed the pre-existing `shared/` → `features/` layering violation this touched along the way (`ExportModal`/`ImportModal` relocated into `features/feedback/`). Entire JSONBin surface now contained in `src/features/feedback/cloud-sync/`. |
| T-10 | Prototype pollution: dot-path writers have no `__proto__` guard | broken | | `applyDotPathPatch.ts` and `DbInspector.tsx`'s local `setAtPath` both walk into arbitrary keys with no `__proto__`/`constructor`/`prototype` check. Not exploitable today (author-controlled input only) but a footgun the moment imported/untrusted JSON routes through these writers. Runbook Task 5. |
| T-11 | Unvalidated imported screenshot data-URIs | broken | | `FeedbackContext.tsx` interpolates an imported comment's `screenshot` field raw into markdown export (`![…](screenshot)`) — a crafted string can inject markup. Runbook Task 6. |

---

## Workspace-Setup — CLI, agent bootstrap

| ID | Feature | Status | Verified | Notes |
|---|---|---|---|---|
| 30 | Workspace CLI (`nw`, `rw`, `export`, `handoff`) | done | | |
| 31 | Old flow CLI (`arch nf/ns/rs/rn/dup/order`) | done | | Namespaced under `flowkit arch` |
| 32 | Flowplan CLI (`plan:ls`, `plan:check`) | done | | `plan:check` wired into `prebuild` |
| 33 | Sessions CLI (`sessions:ls/import/check/stats/sample/rm/brief`) | done | | |
| 34 | Agent sync (`agent:sync`, `agent:check`) | done | | Single source of truth: `scripts/lib/agentSpec.js` |
| 35 | CLI redesign (long aliases, help rewrite, subcommand parser) | done | | |
| 37 | Kit drift check (`kit:check`) | done | | |
| 38 | Old migration guards (`migrate:nav`, `migrate:router`) | done | | Block on flat-flowplan workspaces with a clear error |
| 39 | CLI contract smoke tests | done | | `scripts/tests/plan-contract-cli.test.js`, 6 assertions, `npm run test:workspace` |
| T-12 | `flowkit sw`/`switch`/`switch-workspace` removed | done | 2026-07-02 | Confirmed removed from `scripts/cli/router.js`. Workspace switching is browser-UI-only, per the original 2026-06-26 decision. |
| T-13 | Gap: `project.md` unfilled in all workspaces | **broken** | | Agents get zero product context on cold-start — the vision loop's "brief → agent builds" step doesn't survive between sessions. Two-part fix: fill existing files now, add an interactive brief prompt to `flowkit nw`. Agent-onboarding-audit Gap 1 & 9 (CRITICAL for vision-loop integrity). |
| T-14 | Gap: `platform.md` CLI table malformed (`sessions:*` row) | broken | | `agentSpec.js` `cliRows()` emits `|`-separated values inside a markdown table cell, breaking the table. One-line fix + `agent:sync`. Audit Gap 2. |
| T-15 | Gap: import path inconsistency (`@platform/` vs `@shared/`) in generated `platform.md` | broken | | `agentSpec.js` `platformSurfaces()` hardcodes the old `@platform/` alias for two rows. Two-line fix + `agent:sync`. Audit Gap 3. |
| T-16 | Gap: no analytics → agent brief bridge | **broken** | | CRITICAL for vision-loop integrity. `sessions.js` already aggregates session data (`cmdLensReport`) but only emits machine JSON, not an agent-actionable markdown brief. Fix: add `--md` flag or wire into `.agent/project.md`. Audit Gap 10. |
| T-17 | Gap: `DevelopmentValues.md` principles not connected to concrete rules | planned | | Abstract philosophy doc has no mapping to the enforced rules in `rules.md`. Audit Gap 4 (MEDIUM). |
| T-18 | Gap: `rules.md` states rules without consequences | planned | | Only 6 of 40+ rules have a "why" explained. Audit Gap 5 (MEDIUM). |
| T-19 | Gap: screen component contract underdocumented | planned | | No narrative walkthrough of `FlowScreenProps` lifecycle for workspace authors. Audit Gap 6 (MEDIUM). |
| T-20 | Gap: hotspot coordinate units undocumented | planned | | One-line fix: state x/y/w/h are percentages, not pixels. Audit Gap 7 (MEDIUM). |
| T-21 | Gap: no FlowPlan authoring entry-point doc | planned | | Scattered across CLI.md, type comments, examples. Needs a `FLOWPLANS.md` or major FLOWMASTER.md section. Audit Gap 8 (LOW–MEDIUM). |
| T-22 | Flat-mode export command (new, separate from `export`/`export:full`) | planned | | Active to-do, not yet started. Explicit constraints: do NOT touch existing `export`/`export:full`; make a new, separately-named command; `watch` does not need flat-mode support (dropped from scope). See `specs.md` for the open decision list. |

---

## Package-Publish — npm distribution

| ID | Feature | Status | Verified | Notes |
|---|---|---|---|---|
| 40 | Flowaid onboarding persona (`create-flowkit-app`) | done | | Replaces removed `--kit:` picker. Full spec in `specs.md`. |
| 41 | Package foundation (`files`/`exports`/lib build) | done | | `npm run build:lib` produces working `dist/lib/` + `dist/types/` |
| 42 | `create-flowkit-app` scaffolder | done | | Not yet published — see T-23 |
| 43 | Vite plugin (`flowkit/vite`) — virtual modules, HMR | done | | `virtual:flowkit/screens\|config\|workspace\|flowplans` |
| 44 | CLI flat-mode detection (`isRepoMode()`) | done | | Marker-file based, two prior broken heuristics in history |
| T-23 | 🔴 Blocker: neither package published to npm | blocked | 2026-07-02 | Confirmed: `package.json` has `"private": true`. `npm create flowkit-app@latest` 404s. No `deployment` branch on origin. |
| T-24 | Blocker: no LICENSE file in repo root | blocked | 2026-07-02 | Confirmed absent. Required before Phase 6/7 of the publish checklist. |
| T-25 | Blocker: no CI / `.github/workflows/` | blocked | 2026-07-02 | Confirmed absent. No automated publish pipeline exists. |
| T-26 | Bug: `npm run build` (`tsc -b`) fails | broken | | Missing declarations for `scripts/vite-plugin.js` / `scripts/lib/flowlens-session.js`. Does not block `build:lib` (the real publish build) but is an open correctness bug in the full app build. |
| T-27 | Bug: `flowkit export`'s ESLint check hardcodes `workspaces/${wsName}` | broken | | Breaks under flat mode; `export.js:123`. |
| T-28 | Untested: local consumer smoke tests | planned | | Publish checklist Phase 5 — no `file:` install test, no scaffold-then-flat-mode-dev-server test has been run yet. |
| T-29 | Open decision: `workspaces/nClarity` deleted vs. migrated | blocked | | Unclear whether this was intentional; recoverable from git history if not. Noted in `FEATURES.md` #44. |

---

## Product — vision, UX (non-code)

| ID | Feature | Status | Verified | Notes |
|---|---|---|---|---|
| P-1 | Product vision & north star | done | | Condensed in `vision.md` |
| P-2 | Feature-by-persona mapping (U1–U5) | done | | `product/features-by-persona.md` — frozen June 2026 snapshot, not auto-synced with this tracker |
| P-3 | User stories | done | | `product/user-stories.md` |

---

## Priority rollup (for whoever builds the tracker app's default view)

~~T-9 (JSONBin master key)~~ done · ~~T-4 (startRecording args)~~ done, type-only fix · ~~T-1 (stale
recState closure)~~ removed, false positive · ~~T-2 (recentFlushRef leak)~~ done, generalized to
cover `inactivityTimerRef` too · ~~T-3 (getSnapshots full scan)~~ done, no migration needed, helpers
deduped · ~~T-5 (remarks dedup)~~ done, fixed at root cause · ~~T-30 (remarks timestamp restore)~~
done

**All 🔴-tier FlowLens bugs are now closed**, including the code-review follow-ups (T-30, and the
T-2/T-3 hardening) that came out of a full-diff review of the T-2/T-3/T-4/T-5 fix set.

**🟡 Fix before any public launch/publish:**
T-24 (LICENSE), T-25 (CI), T-23 (npm publish itself, gated on the above), T-10 (prototype
pollution guard), T-11 (screenshot URI validation)

**🟢 High-value, not urgent:**
#36 (feature management system), #17 (Reports two-pane revamp — spec is ready to build from),
T-13/T-16 (the two CRITICAL vision-loop gaps: project.md brief + analytics→agent bridge)

**⚪ Backlog / low priority:**
T-6 through T-8 (flowTracer cleanup), T-14/T-15 (agent doc drift, one-liners), T-17 through T-21
(agent doc depth gaps), #8 (visual flow editor, Phase 2), #20b (Canvas Mode, explicitly deferred)
