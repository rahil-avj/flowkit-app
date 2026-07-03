# Verification log — 2026-07-02

Claims from the docs, checked directly against `flowkit-app` source before condensing into
`features.md`. Only claims that affect a status/priority decision were checked — this is not a
full codebase audit.

| # | Claim (source doc) | Result | Detail |
|---|---|---|---|
| 1 | Feature management system (registry+gate) is `planned`, not implemented — `FEATURES.md` #36 | **Confirmed accurate** | `src/core/features/` does not exist. Still not started. |
| 2 | Multi-session Reports (`ReportsOverlay.tsx`) revamp is `active`, two-pane layout in progress — `FEATURES.md` #17, `specs/flowlens-reports-overlay.md` | **Stale — not started** | Current `ReportsOverlay.tsx` is still the old single-column/flat-filter-bar layout. No `FilterSidebar`, no tabs, no two-pane structure exists yet. The spec is fully unbuilt, not "active." |
| 3 | Viewer Mode shipped, Canvas Mode not started, `PREVIEW_MODE` hardcoded constant — `specs/canvas-viewer-mode.md` | **Mostly accurate, one detail stale** | Viewer-only behavior appears intact, but no `PREVIEW_MODE` constant exists in source anymore (zero grep matches) — the spec's specific implementation description has drifted from the code even if the high-level claim (viewer shipped / canvas not built) still holds. Needs a fresh look at `PreviewCanvas.tsx` before trusting the mechanism description in the spec. |
| 4 | JSONBin master keys are NOT blocked at build/export time — `execution/pre-launch-remediation-runbook.md` Task 1 | **Confirmed still broken** | `FeedbackContext.tsx` still branches on `isMaster` and actively sends `X-Master-Key` when a master key is provided. `scripts/build/inline.js` only `console.warn`s on a detected master key in the standalone export — no `process.exit(1)`, build does not hard-fail. Task 1 is still open exactly as described. |
| 5 | `getSnapshots` does a full-table scan instead of using the `sessionId_sequenceId` index — `execution/pre-launch-remediation-runbook.md` Task 2 | **Confirmed still broken** | `sessionDb.ts:144-148` still calls `getAllFromStore` then `.filter()`/`.sort()` in JS. The compound index exists on the store but `getSnapshots` doesn't query through it. Task 2 is still open. |
| 6 | `startRecording` called with 1 arg in `panel.tsx`, dropping `tags`/`testMode` — runbook Task 9 (flowTracer Phase D) | **Confirmed still broken** | `panel.tsx:240` calls `recorder.startRecording(resolvedName(s))` — exactly 1 argument against a 3-arg signature. Still open. |
| 7 | `flowkit`/`create-flowkit-app` never published to npm; no LICENSE; no CI — `execution/npm-publish-checklist.md`, `CLAUDE.md` | **Confirmed accurate** | `package.json` has `"private": true`. No `LICENSE*` file in repo root. No `.github/workflows/` directory. All three publish blockers still open. |
| 8 | `flowkit sw`/`switch`/`switch-workspace` CLI commands removed entirely — `trackers/workspace-setup-tracker.md` decision log, 2026-07-01 | **Confirmed accurate** | No matches for `sw`, `switch`, or `switch-workspace` in `scripts/cli/router.js`. Removed as documented. |

## What this means for `features.md`

- Item 2 (Multi-session Reports revamp) status is downgraded from `active` to `planned` in the
  condensed tracker — the spec exists in full detail but zero implementation has landed.
- Items 4, 5, 6 (pre-launch runbook Tasks 1, 2, 9) are carried through as still-open with high
  confidence — these are real, currently-reachable issues, not stale audit findings.
- Item 3 (canvas viewer/mode split) is flagged for a fresh look — the spec's mechanism section
  may describe an intermediate implementation state that has since been refactored again.
- Items 1, 7, 8 needed no correction — condensed as-is from source docs.

---

## Verification pass — 2026-07-03 (T-9 fix follow-up + FlowLens 🔴 tier)

Two rounds. First: T-9 (JSONBin master key) was fixed. Second: the 5 remaining FlowLens 🔴-tier
bugs (T-1 through T-5) were independently re-verified against live code before starting work,
since T-9 had just shown the tracker's "not yet applied" framing understated what the real fix
required (a full containment restructure, not a one-line guard).

| # | Claim | Result | Detail |
|---|---|---|---|
| 9 | T-9 — JSONBin master key not blocked | **Fixed** | Master-key support removed outright (not just gated) on both push and pull, in both `FeedbackContext.tsx`'s `pushToJsonBin`-equivalent and a second, previously-undiscovered master-key path in `src/shared/utils/useJsonBinKeyValidation.ts` (dead code, zero consumers, deleted). Also fixed the pre-existing `shared/` → `features/` layering violation this touched (`ExportModal`/`ImportModal` relocated into `features/feedback/`). Full JSONBin surface now contained in `src/features/feedback/cloud-sync/` — verified via a real deletion dry-run (delete the folder, typecheck flags exactly 3 importing files, nothing else). |
| T-1 | Stale `recState` closure in `logEvent` — `context/index.tsx:219-223` (original claim) | **STALE — false positive** | Not a real bug. `recState` is a proper dependency in `logEvent`'s `useCallback` deps array (confirmed at the current `logEvent` definition, lines 224-317, deps line 316) — React recreates the callback whenever `recState` changes, so the guard always reads current state. There is no ref-based guard anywhere in the file; the claim's premise ("reads a stale ref instead of state") doesn't match this file's architecture at all. **Recommend removing T-1 from `features.md` rather than carrying it as `broken`.** |
| T-2 | `recentFlushRef` not cancelled in `resetLiveState` | **Confirmed, impact narrower than described** | `resetLiveState` (lines 179-185) clears `recentEventsRef`/`recentEvents`/etc. but never calls `clearTimeout` on `recentFlushRef` (only the unmount cleanup effect does, line 172). In the current code this is mostly a harmless no-op (the stale timeout re-sets `recentEvents` to `[]`, which it already is) — the real risk is a fast restart within the 150ms window, where the stale timeout could clobber freshly-logged events with the old (empty) batch. Still worth fixing; the original "briefly un-clears the live feed" framing overstated the common case. |
| T-3 | `getSnapshots`/`deleteSession` full-table scan | **Confirmed, index detail corrected** | `getSnapshots` (`sessionDb.ts:144-148`) and `deleteSession`'s snapshot branch (`:221-238`) both do full-table `getAll`/cursor scans, ignoring the existing `sessionId_sequenceId` index. Correction: that index is **compound** (`[sessionId, sequenceId]`), not a plain single-key `sessionId` index like `events`/`cursor_samples` have — so the fix isn't a one-line "query through the existing index," it needs either an `IDBKeyRange.bound` compound-key query or a new plain `sessionId` index (the latter requires a `DB_VERSION` bump + migration). |
| T-4 | `startRecording` called with 1 arg, drops tags/testMode | **Confirmed exactly as described** | `panel.tsx:240` passes only `name` to a `(name, tags, testMode)` signature (`context/index.tsx:348-349`). Bonus finding: the public TS interface (`context/index.tsx:46`) only declares `(name?, tags?)` — doesn't even list `testMode` as a param — so the type signature was already out of sync with the implementation before considering the call-site bug. |
| T-5 | Remarks double-rendered with fragile dedup | **Confirmed, root cause is deeper than described** | `SessionInspect.tsx` renders remarks from both `events` (filtered `type === 'session.remark'`, lines ~100, 266-275) and `meta.remarks` (lines 262, 276-285), deduped by exact string equality (line 277) that breaks on whitespace differences — as described. Root cause found: these are two genuinely divergent write paths (live recording logs to `events` via `logEvent`; `addRemark` in this component writes only to `meta.remarks`), not just a redundant read of the same data twice. A whitespace-normalizing dedup patches the symptom; picking one source of truth (recommend `meta.remarks`, since `logEvent`'s finalize path already folds live remarks into `SessionMeta.remarks` before save) fixes the actual cause. |

### Net result for `features.md`
- **T-9 → done.** Update status from `broken` to `done`, verified 2026-07-03.
- **T-1 → remove or reclassify.** Not a real bug; recommend deleting the row rather than leaving it as `broken` or `planned`.
- **T-2, T-3, T-4, T-5 → remain `broken`, confirmed real**, with corrected detail text per above (T-2's impact is narrower than stated, T-3's fix needs an index migration not just a query change, T-5's fix should target the root cause — divergent write paths — not just the dedup check).
