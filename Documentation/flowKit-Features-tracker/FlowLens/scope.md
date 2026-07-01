# FlowLens — Scope

FlowLens covers two tightly related subsystems: **FlowTracer** (the recorder, always available) and **FlowLens mode** (the replay and analytics surface, build-gated). Together they close the feedback loop: prototype → record → analyze → iterate.

---

## In scope

### FlowTracer (recording — always on)

- `SessionRecorderProvider` — state machine: `idle → recording ⇄ paused → idle`
- Records: `SessionEvent` (taps, navigations, state changes), `CursorSample` (throttled 50ms, stored as % of container), `SessionMeta`, `SessionSnapshot`
- **13 toggleable channels:** interactions, navigation, effects, stateChanges, simulatorChanges, panelActivity, sidebarActivity, cursorTracking, frustratedClicks, hoverEvents (+ 3 always-on)
- **WriteBatcher(300ms)** — queues writes; single IndexedDB transaction per store per 300ms; reduces overhead from ~60/s to ~2/s
- Quality scoring: `computeQuality()` — flow-entry (+40), ≥3 screens (+30), ≥30s (+30); sessions below threshold auto-deleted
- Auto-pruning: `SessionDb.pruneOldSessions(200)` — fires after every `startRecording`
- Crash recovery: detects incomplete sessions on mount; recomputes meta from persisted events
- Inactivity auto-stop: 5 min idle finalizes with quality gate
- Gated by `flowkit:sessions:enabled` localStorage toggle (independent of FlowLens build flag)

### Session export/import

- Single session: `SessionExport` object, `.flowkit-session.json`
- Bundle: `SessionExport[]` array, `.bundle.flowkit-session.json`; import auto-detects array vs object
- Session merge: `handleMerge` re-sequences all events/snapshots/cursor samples with single monotonic counter

### FlowLens mode (replay + analytics — build-gated)

- Gated: `VITE_ENABLE_FLOWLENS=true` required for standalone build; in dev, available if `src/modes/flowlens/index.ts` exists
- Lazy-loaded chunk — zero bytes in standalone when flag is off (Rollup DCE via `import.meta.env` inlining)
- Toggle: canvas toolbar ScanEye button, Action Center, per-session card "Replay in FlowLens"
- `FlowLensModeContext` sits above `DashboardProvider` so `replayActive` is readable by the dashboard

### Replay engine

- `replayFromSnapshot(session, seq)` — folds events ≤ seq into full dashboard state
- `ReplayController` pushes state into shared `DashboardContext` via imperative setters, guarded by `replayActive` — replayed setters never re-record
- Cross-workspace guard: sessions whose screen ids don't intersect current workspace views disable replay (analytics still available)
- Snapshot/restore: pre-replay db/device/orientation/accessibility snapshotted at mount, restored on unmount

### Single-session analytics

- Metrics, Paths, Funnel, Heatmap — via `AnalyticsOverlay`
- Heatmap: real recorded screen behind cursor density; independent Screen/Heatmap toggles + legend

### Multi-session Reports (Phase 3 — active)

- `ReportsOverlay.tsx` revamp: two-pane layout (collapsible filter sidebar + tabbed main)
- Tabs: Overview, Funnel, Heatmap, Sessions
- All filters exposed: screen, device, connection, quality range, tags, date range, outcome, source
- Sortable sessions table
- Loading skeletons and empty states
- `reports/aggregate.ts`, `reports/sessionFilters.ts` — aggregation and filter logic (unchanged by revamp)

### Committed session library

- `src/modes/flowlens/library/<workspace>/*.json` — hand-managed, committed to git
- Glob-loaded inside the lazy chunk — zero cost when FlowLens is off
- Library wins de-dupe on id when merged with recorded IndexedDB sessions
- CLI-managed: `sessions:import`, `sessions:ls`, `sessions:check`, `sessions:rm`, `sessions:brief`

### `sessions:brief` (CLI)

- Reads committed library; aggregates dwell time, frustrated clicks, drop-off data
- `--append` writes to `.agent/project.md` for agent consumption

---

## Out of scope

- Influencing flow execution — FlowTracer/FlowLens are pure observers (Principle 11: Observers Never Influence Execution)
- Replacing `IndexedDB` with a server-side store — the recording engine is browser-only by design
- Real-time multi-user session streaming
- A/B testing infrastructure
- A/B variant assignment or cohort management
- Video screen recording (cursor + events only; no pixel capture)
- Exporting analytics to third-party platforms (Amplitude, Mixpanel, etc.)

---

## Key constraints

- **Build gate is enforced via `import.meta.env`** — not a runtime check. Vite inlines the value; Rollup DCEs the import. Never reference the env flag in a runtime conditional that could survive tree-shaking.
- **Recording is workspace-scoped.** `SessionRecorderProvider` receives `workspaceId`; all sessions are tagged to it. Cross-workspace replay is blocked.
- **`WriteBatcher` is module-level singleton.** Never write events directly to IndexedDB — go through `sessionWriteBatcher` in `sessionDb.ts`.
- **Observers never re-record.** All imperative setters called during replay are guarded by `replayActive` flag. This preserves determinism.
