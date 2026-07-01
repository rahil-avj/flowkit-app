# flowTracer Code Review

**Date:** 2026-06-25
**Scope:** `src/features/flowTracer/` — all files including context, components, sessionDb, types, and public index.

---

## Bugs / Logic Errors

### 1. `context/index.tsx:223` — `logEvent` guards recording state via stale closure

`logEvent` is a `useCallback` that closes over React state `recState`. Between a `stopRecording()` call and the next render, `sessionIdRef.current` is `null` but `recState` still reads as `'recording'` — or vice versa. The guard on line 219 (`if (!sessionIdRef.current) return`) is correct; the guard on line 222 (`if (recState === 'paused'…`) is not — it reads stale state. Should use a `recStateRef` kept in sync via a `useEffect`, or derive paused state from a ref.

### 2. `context/index.tsx:301–307` — debounced `recentFlushRef` fires after `resetLiveState`

`resetLiveState` (called by both `stopRecording` and the inactivity timeout) clears `recentEventsRef.current` and calls `setRecentEvents([])`. But if a `recentFlushRef` timeout is already pending, it fires 150ms later and calls `setRecentEvents([...recentEventsRef.current])` — which at that point is the last snapshot before the clear, effectively un-clearing the live feed briefly. `resetLiveState` should also `clearTimeout(recentFlushRef.current)`.

### 3. `sessionDb.ts:143–147` — `getSnapshots` full-table scan

`getSnapshots` calls `getAllFromStore` (loads every snapshot from IndexedDB) then `.filter(s => s.sessionId === sessionId)` in JS. The `snapshots` store already has a `sessionId_sequenceId` compound index — it should query by index like the events and cursor_samples stores do. For any real usage this is a silent O(N) perf bug proportional to total stored sessions.

### 4. `panel.tsx:231` — `startRecording` called with 1 arg; tags and testMode silently dropped

`recorder.startRecording(resolvedName(s))` — the recorder's `startRecording(name, tags, testMode)` signature takes 3 args. Tags and test mode from settings are never passed. Test sessions cannot be initiated from the UI.

### 5. `SessionInspect.tsx:265–289` — remarks double-rendered with fragile dedup

Remarks appear in both `events.filter(e => e.type === 'session.remark')` (with timestamps) and `meta.remarks` (plain strings). The dedup at line 280 filters `meta.remarks` by exact string equality against `ev.payload.text`. Any whitespace difference causes a duplicate. Since `remarksRef` feeds both the event log and `meta.remarks` at save time, every remark is guaranteed to appear in both lists. Pick one source of truth: either events (preferred, has timestamps) or meta.remarks.

---

## Inconsistencies

### 6. `CATEGORY_COLORS` duplicated across `panel.tsx` and `SessionInspect.tsx`

Both files define the same 9-entry `Record<string, string>` at module scope with identical values. `panel.tsx` also has a parallel `CATEGORY_TAG_COLORS` map. All three should live in a single `src/features/flowTracer/constants.ts` and be imported where needed.

### 7. Mixed styling approach in `panel.tsx` — Tailwind in idle view, inline styles in recording view

The idle view (sessions list, CTA row, footer) mixes Tailwind classes and `theme.*` inline styles. The recording view (live header, remarks section, event feed) is entirely inline `style={{}}` with `theme.*` tokens. The sessions list header (line 685) uses a Tailwind `className` for layout but inline style for every text property. These should be unified — either Tailwind theme classes throughout or inline styles throughout for each section.

### 8. `SessionSettingsOverlay`, `SessionExportOverlay`, `SessionInspect` — still use raw `<input>`/`<button>`

After the `panel.tsx` and `SessionCard.tsx` migration to shared UI components, these three files remain entirely on raw HTML elements. `SettingToggle` and `ChannelRow` in `SessionSettingsOverlay` replicate the `Toggle` component. The close `<button><X/></button>` in both overlays replicates `IconButton`. Form inputs replicate `Input`. This is the biggest remaining consistency gap.

### 9. `panel.tsx:134–135` — stray double blank line

Left over from the `CountdownOverlay` extraction. Minor but inconsistent with the single-blank-line convention elsewhere.

---

## Dead / Loose Code

### 10. `context/useSessionRecorder.ts` — entire file is a pointless re-export shim

Re-exports `useSessionRecorder`, `useSessionRecorderOptional`, and 3 types from `./index`. Nothing in the codebase imports from `context/useSessionRecorder.ts` directly — everything imports from `./context` (the index). This file exists but serves no purpose and should be deleted.

### 11. `context/index.tsx:37` — `activeSessionId` is a redundant alias for `sessionId`

Both are set to the same `sessionId` state on line 516. Every consumer that reads `activeSessionId` could read `sessionId` instead. The alias doubles the surface without adding meaning.

### 12. `context/index.tsx:68` — `isTestModeRef` exposed in context value

A mutable ref is included in the `useMemo` value object and typed as part of `SessionRecorderValue`. Refs in context values don't trigger re-renders and aren't observable. The `isTestMode: isTestModeState` boolean on the same context is the right thing to consume. The ref is an internal recorder concern and shouldn't be on the public interface.

### 13. `types.ts:150` + `buildSessionExport.ts` — `SessionExport.filters` never populated

`SessionExport` has `filters?: Partial<ChannelConfig>`. `buildSessionExport` never sets it. Nothing reads it anywhere in the codebase. Either populate it from the active channel config at export time, or remove the field from the type.

### 14. `sessionDb.ts:263` — `sessionWriteBatcher` exported unnecessarily

Only consumed internally by `context/index.tsx`. It's re-exported through the feature barrel indirectly. Should be module-private. `SessionDb` could expose a `flush()` method instead, keeping the write strategy an implementation detail.

### 15. `index.ts:3` — `buildSessionExport` on the public feature API with no external callers

Only used within the feature itself (`panel.tsx` for merge, `SessionExportOverlay`). It doesn't need to be part of the public barrel export.

---

## What's Clean (Post-Refactor)

- **`panel.tsx`** — all buttons, inputs, empty state, and category pills correctly use shared UI components (`Button`, `IconButton`, `Input`, `EmptyState`, `Tag`). ✓
- **`SessionCard.tsx`** — `ActionBtn` removed; all action icons use `IconButton` with correct variants (`ghost`/`danger`). ✓
- **`CountdownOverlay`** — properly extracted to its own file with `PUN_CLOSERS` co-located. ✓
- **`CATEGORY_TAG_COLORS`** — lookup added to `panel.tsx` to drive `Tag` color mapping. ✓

---

## Priority Order

| Priority | #   | File                                 | Issue                                                      |
| -------- | --- | ------------------------------------ | ---------------------------------------------------------- |
| Fix now  | 1   | `context/index.tsx`                  | Stale `recState` closure in `logEvent`                     |
| Fix now  | 2   | `context/index.tsx`                  | `recentFlushRef` not cancelled in `resetLiveState`         |
| Fix now  | 3   | `sessionDb.ts`                       | `getSnapshots` full-table scan — use index                 |
| Fix now  | 4   | `panel.tsx`                          | `startRecording` called with 1 arg — tags/testMode dropped |
| Fix now  | 5   | `SessionInspect.tsx`                 | Remarks double-render with fragile dedup                   |
| Clean up | 6   | `panel.tsx` + `SessionInspect.tsx`   | Extract shared `CATEGORY_COLORS` constant                  |
| Clean up | 7   | `panel.tsx`                          | Unify styling approach in recording view                   |
| Clean up | 8   | Overlays + `SessionInspect`          | Migrate to shared UI components                            |
| Remove   | 10  | `context/useSessionRecorder.ts`      | Delete pointless re-export shim                            |
| Remove   | 11  | `context/index.tsx`                  | Remove `activeSessionId` alias                             |
| Remove   | 12  | `context/index.tsx`                  | Remove `isTestModeRef` from context value interface        |
| Remove   | 13  | `types.ts` + `buildSessionExport.ts` | Remove or populate `SessionExport.filters`                 |
| Remove   | 14  | `sessionDb.ts`                       | Make `sessionWriteBatcher` private                         |
| Remove   | 15  | `index.ts`                           | Remove `buildSessionExport` from public barrel             |
