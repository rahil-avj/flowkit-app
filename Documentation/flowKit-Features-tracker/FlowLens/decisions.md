# FlowLens — Decision Log

Append-only. Most recent at top.

---

## 2026-06-26 — Multi-session Reports revamp scoped to `ReportsOverlay.tsx` only

**Decision:** The revamp changes only `src/modes/flowlens/components/reports/ReportsOverlay.tsx`. No changes to `AnalyticsOverlay.tsx`, `analyticsPrimitives.tsx`, `aggregate.ts`, `sessionFilters.ts`, or `HeatmapView.tsx`.
**Reason:** Containment. The layout problem (flat filter bar, no tabs, no sessions list) is a UI-only issue. The aggregation and filter logic in `aggregate.ts` and `sessionFilters.ts` is correct — the data model already supports date ranges and quality range filters that the old UI just didn't expose.
**Source:** `Documentation/project-plans/FlowLens_ReportsOverlay.md`

---

## 2026-06-26 — Multi-session Reports scoped to Phase 3

**Decision:** Multi-session analytics (`ReportsOverlay`) is Phase 3 work. Phase 1 was single-session replay + analytics. Phase 2 is the visual flow editor.
**Reason:** Multi-session aggregation requires cohort filtering, merged heatmaps, and session list infrastructure that adds scope beyond the core replay mission. Shipping Phase 1 (replay) independently validated the recording pipeline before building on top of it.
**Source:** Comment in `src/modes/flowlens/components/FlowLensAnalyticsOverlays.tsx`: "Multi-session Reports land in Phase 3."

---

## 2026-06-26 — `LensSideExplorer` / `LensSideInspector` are the FlowLens panel component names

**Decision:** The left panel component is `LensSideExplorer.tsx` (sessions list) and the right panel is `LensSideInspector.tsx` (tabbed session info / reports quick view). Earlier doc referred to non-existent `FlowLensLeftPanel.tsx` and `FlowLensRailPanel.tsx`.
**Reason:** Named to match the `KitSideExplorer` / `KitSideInspector` conventions in the main canvas — FlowLens reuses the same structural pattern with its own content.
**Source:** `ls src/modes/flowlens/components/`; doc audit correction

---

## 2026-06-26 — Session library committed to `src/modes/flowlens/library/<ws>/`

**Decision:** Committed sessions live inside the lazy FlowLens chunk at `src/modes/flowlens/library/<workspace>/*.json`. They are glob-loaded and thus cost nothing when `VITE_ENABLE_FLOWLENS` is off.
**Reason:** Co-locating with the chunk means the glob is only evaluated when the chunk is loaded. Placing library files outside the chunk would require a separate glob that could not be dead-code-eliminated.
**Source:** `src/modes/flowlens/useSessionLibrary.ts`; `FLOWLENS.md`

---

## 2026-06-26 — FlowTracer gated by localStorage toggle, independent of build flag

**Decision:** Recording is always available in the bundle regardless of `VITE_ENABLE_FLOWLENS`. Whether recording is active in-session is controlled by `flowkit:sessions:enabled` localStorage toggle.
**Reason:** Separating the build gate (FlowLens replay) from the runtime gate (recording) lets teams ship the standalone export with recording on but replay off — sessions accumulate in IndexedDB and can be extracted for later analysis without the full FlowLens analytics UI in the build.
**Source:** `FLOWLENS.md` Build Gating section

---

## 2026-06-26 — `WriteBatcher(300ms)` as module-level singleton

**Decision:** Events and cursor samples are queued through `sessionWriteBatcher` — a module-level `WriteBatcher(300)` in `sessionDb.ts` — not written directly to IndexedDB.
**Reason:** At 60fps cursor tracking, individual writes would produce ~60 IndexedDB transactions/sec. The batcher reduces this to ~2/sec with no data loss — `stopRecording` calls `await sessionWriteBatcher.flush()` before reading counts.
**Source:** `src/features/flowTracer/sessionDb.ts`; `FLOWLENS.md` Write Batching section
