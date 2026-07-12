# FlowKit — Pre-Launch Remediation Runbook

> A literal, step-by-step execution plan. Every task names the **exact file and line**, shows the **before/after code** to copy, and ends with a **verification checklist**. Work top to bottom. You do not need to understand the whole codebase — only the file in front of you.

|                  |                                                   |
| ---------------- | ------------------------------------------------- |
| **Tasks**        | 6 (2 ship-blockers · 2 fast-follow · 2 hardening) |
| **Total effort** | ~1.5 days                                         |
| **Branch**       | `fix/pre-launch-audit`                            |
| **Prereq**       | `npm install` done · `npm run dev` works          |

> [!IMPORTANT]
> **Before you touch anything.** FlowKit is a browser-only prototyping tool — there is no server, database, or deployed production. "Shipping" means publishing a new build / standalone HTML export. So none of these fixes require migrations, downtime, or coordination.
>
> This runbook covers code-level fixes only. If "shipping" means an actual npm publish of the `flowkit`/`create-flowkit-app` packages, see [`npm-publish-checklist.md`](./npm-publish-checklist.md) for the registry/packaging steps — its Phase 6 security sweep overlaps with Task 1 below (same JSONBin master-key issue).
>
> Make a branch first: `git checkout -b fix/pre-launch-audit`. Commit after **each** task with the message shown in that task. If `npm run build` or `npm test` fails after a change, stop and re-read the step — do not push.
>
> If a step's "before" code doesn't match what you see in the file, the line numbers have drifted. Search for the surrounding code shown here rather than trusting the line number, and flag it in the PR.

---

## Order of work

| #   | Task                                                                                                                      | Severity | Phase            |
| --- | ------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------- |
| 1   | [Block JSONBin master keys from the build & export](#task-1--block-jsonbin-master-keys-from-the-build--export)            | 🟡 High  | A — ship-blocker |
| 2   | [Index the IndexedDB snapshot queries](#task-2--index-the-indexeddb-snapshot-queries)                                     | 🟡 High  | A — ship-blocker |
| 3   | [Make the coverage gate tell the truth](#task-3--make-the-coverage-gate-tell-the-truth)                                   | 🟡 High  | B — fast-follow  |
| 4   | [Add a Playwright smoke suite (or drop the dep)](#task-4--add-a-playwright-smoke-suite-or-drop-the-dep)                   | 🟡 High  | B — fast-follow  |
| 5   | [Guard the dot-path writers against prototype pollution](#task-5--guard-the-dot-path-writers-against-prototype-pollution) | 🔵 Low   | C — hardening    |
| 6   | [Validate imported screenshot URIs](#task-6--validate-imported-screenshot-uris)                                           | 🔵 Low   | C — hardening    |
| 7   | [Fix stale `recState` closure in `logEvent`](#task-7--fix-stale-recstate-closure-in-logevent)                             | 🟡 High  | D — flowTracer   |
| 8   | [Cancel pending `recentFlushRef` in `resetLiveState`](#task-8--cancel-pending-recentflushref-in-resetlivestate)           | 🟡 High  | D — flowTracer   |
| 9   | [Pass tags/testMode through `startRecording`](#task-9--pass-tagstestmode-through-startrecording)                         | 🟡 High  | D — flowTracer   |
| 10  | [De-duplicate remarks rendering in `SessionInspect`](#task-10--de-duplicate-remarks-rendering-in-sessioninspect)          | 🟡 High  | D — flowTracer   |

> Task 2 (above, Phase A) already covers the `getSnapshots`/`deleteSession` full-scan bug — it was also flagged independently in the flowTracer review folded in here. Not duplicated as a separate task.

---

# Phase A — Ship-blockers (do these before launch)

Tasks 1 and 2. Both are Small. Together < 1 hour of editing plus verification.

---

## Task 1 — Block JSONBin master keys from the build & export

|                     |                                                                   |
| ------------------- | ----------------------------------------------------------------- |
| **Severity**        | 🟡 High · Security                                                |
| **Files**           | `src/features/feedback/context/FeedbackContext.tsx` · `inline.js` |
| **Effort**          | Small (~20 min)                                                   |
| **Risk if skipped** | Leaked credential in shared prototype                             |

### Why

A JSONBin **master key** (any key starting with `$2a$`) grants full account access. The code supports embedding a key at build time, and the standalone HTML export inlines it verbatim — so a master key would be readable by anyone the prototype is shared with. Today the only guard is a warning that **does not stop the build**. We make it impossible to ship one.

### Step 1 — Reject master keys at the network call

Open `src/features/feedback/context/FeedbackContext.tsx`. Find `pushToJsonBin` (around line 21). Add a guard as the very first line of the function body.

**Before** (line 21–22):

```ts
async function pushToJsonBin(filename: string, content: string, key: string): Promise<string> {
  const isMaster = key.startsWith('$2a$')
```

**After:**

```ts
async function pushToJsonBin(filename: string, content: string, key: string): Promise<string> {
  // Master keys ($2a$…) grant full account access and must never be used here.
  // Only scoped Access Keys are permitted from client code.
  if (key.startsWith('$2a$')) {
    throw new Error(
      'Refusing to use a JSONBin master key. Create a scoped Access Key instead.'
    )
  }
  const isMaster = false // master keys are rejected above; always use X-Access-Key
```

> **Note:** leaving `isMaster` defined (as `false`) means you do **not** have to edit the `[isMaster ? 'X-Master-Key' : 'X-Access-Key']` line below it — it keeps compiling and now always sends the safe `X-Access-Key` header.

### Step 2 — Make the export build hard-fail

Open `inline.js` at the repo root. Find the block near line 64 that starts with `// Warn if a JSONBin master key…`. Replace the whole `if` block.

**Before** (line 64–71):

```js
// Warn if a JSONBin master key was bundled into the output
if (html.includes('X-Master-Key') || /\$2a\$\d+\$/.test(html)) {
  console.warn(
    '\n⚠️  WARNING: A JSONBin master key may be embedded…' +
      '   This key grants full account access…' +
      '   Remove the key from JSONBIN_CONFIG.providedKey before sharing.\n'
  )
}
```

**After:**

```js
// HARD-FAIL if a JSONBin master key leaked into the standalone output.
if (html.includes('X-Master-Key') || /\$2a\$\d+\$/.test(html)) {
  console.error(
    '\n✗ BUILD ABORTED: a JSONBin master key is embedded in the output.\n' +
      '   This grants full account access to anyone who opens the HTML.\n' +
      '   Clear JSONBIN_CONFIG.providedKey (or use a scoped Access Key) and rebuild.\n'
  )
  process.exit(1)
}
```

### ✓ Verify

- [ ] Run `npm run build` — it still succeeds (default `providedKey` is empty).
- [ ] **Negative test:** temporarily set `providedKey: '$2a$10$test'` in `FeedbackContext.tsx`, run `npm run build:standalone` — it must **exit with an error**, not a warning. Then revert the key back to `''`.
- [ ] `npm run lint` passes; no TypeScript errors.
- [ ] Commit: `git commit -am "fix(feedback): reject JSONBin master keys; hard-fail export on leak"`

---

## Task 2 — Index the IndexedDB snapshot queries

|              |                                        |
| ------------ | -------------------------------------- |
| **Severity** | 🟡 High · Performance                  |
| **File**     | `src/features/flowTracer/sessionDb.ts` |
| **Effort**   | Small (~35 min)                        |
| **Lines**    | 144–147 · 221–238                      |

### Why

`getSnapshots` loads **every snapshot from every session** into memory, then filters in JavaScript. `deleteSession` opens a cursor over **all** snapshots, and `pruneOldSessions(200)` calls it once per pruned session — so cost grows with total stored data. The store already has a compound index `sessionId_sequenceId`; we query through it with a key range. **No schema change, no version bump.**

### Step 1 — Add two range helpers

In `src/features/flowTracer/sessionDb.ts`, just below the existing `deleteByIndex` function (ends around line 103), paste these helpers. They reuse the compound index by matching every key whose first element is the `sessionId`.

```ts
// Range over a compound [sessionId, *] index → all rows for one session.
function sessionRange(sessionId: string): IDBKeyRange {
  return IDBKeyRange.bound([sessionId], [sessionId, []])
}

function getAllByRange<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  range: IDBKeyRange
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).index(indexName).getAll(range)
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function deleteByRange(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  range: IDBKeyRange
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).index(indexName).openCursor(range)
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else resolve()
    }
    req.onerror = () => reject(req.error)
  })
}
```

### Step 2 — Use the index in `getSnapshots`

**Before** (line 144–147):

```ts
  async getSnapshots(sessionId: string): Promise<SessionSnapshot[]> {
    const db = await openDb()
    const all = await getAllFromStore<SessionSnapshot>(db, 'snapshots')
    return all.filter(s => s.sessionId === sessionId).sort((a, b) => a.sequenceId - b.sequenceId)
  }
```

**After:**

```ts
  async getSnapshots(sessionId: string): Promise<SessionSnapshot[]> {
    const db = await openDb()
    const rows = await getAllByRange<SessionSnapshot>(
      db,
      'snapshots',
      'sessionId_sequenceId',
      sessionRange(sessionId)
    )
    return rows.sort((a, b) => a.sequenceId - b.sequenceId)
  }
```

### Step 3 — Use the index when deleting

In `deleteSession` (around line 221), replace the hand-written snapshot cursor (the `(async () => { … })()` block that opens `openCursor()` with no range) with a single call.

**Before** (line 221–238, the snapshots branch):

```ts
      // snapshots use autoIncrement keys — cursor by sessionId
      (async () => {
        const tx = db.transaction('snapshots', 'readwrite')
        const store = tx.objectStore('snapshots')
        const req = store.openCursor()
        // …walks the whole store, filtering snap.sessionId in JS…
      })(),
```

**After:**

```ts
      // snapshots: delete via the compound index range (no full scan)
      deleteByRange(db, 'snapshots', 'sessionId_sequenceId', sessionRange(sessionId)),
```

> **Watch the comma.** This branch sits inside a `Promise.all([ … ])` array. Keep the trailing comma so the array stays valid — the next item is `deleteByIndex(db, 'cursor_samples', …)`.

### ✓ Verify

- [ ] `npm run build` and `npm run lint` pass — no unused-variable warning for the old helpers.
- [ ] Manual: `npm run dev`, record a session, reload, open it in FlowLens replay — snapshots still load and the screen state replays correctly.
- [ ] Manual: delete a session from the sessions list — it disappears and its data is gone (re-record and confirm counts don't grow stale).
- [ ] Commit: `git commit -am "perf(flowTracer): query/delete snapshots via index, not full scan"`

---

# Phase B — Fast-follow (within the first week after launch)

Tasks 3 and 4. These protect team velocity; they don't block the launch itself.

---

## Task 3 — Make the coverage gate tell the truth

|              |                    |
| ------------ | ------------------ |
| **Severity** | 🟡 High · Testing  |
| **File**     | `vitest.config.ts` |
| **Effort**   | Small (~25 min)    |
| **Lines**    | ~20–30             |

### Why

The coverage gate reports ~91–95% — but vitest only includes `scripts/tests/**`, which import just 4 pure-logic files. The number measures those 4 files, **not** the ~44k lines of app code. A green report reads as "well tested" when the engine, recording, and analytics have zero coverage. We make the metric honest by scoping `coverage.include` to exactly what is actually exercised, so the percentage describes a real, named surface.

### Step — Pin coverage to the tested files only

Open `vitest.config.ts`. Inside the `coverage` object, add an explicit `include` array listing the four modules under test. If `all: true` is set, set it to `false` so untested files aren't counted as 0% (which would mislead in the other direction).

```ts
coverage: {
  provider: 'v8',
  all: false,
  // HONEST SCOPE: these thresholds describe ONLY the pure-logic core
  // that scripts/tests/** exercise — NOT the React/runtime tree.
  include: [
    'src/core/canvas/canvasReducer.ts',
    'src/features/flow-library/compileFlowplan.ts',
    'src/shared/utils/applyDotPathPatch.ts',
    'src/core/shortcuts/useKeyboardShortcuts.ts',
  ],
  thresholds: { statements: 91, branches: 86, functions: 95, lines: 93 },
}
```

> **Then tell the team.** Add one line to the project README or test docs:
> _"Coverage thresholds cover the pure-logic core only. The React UI, FlowEngine, IndexedDB layer, and analytics are not yet under automated test — see Task 4."_
>
> The fix is half config, half communication.

### ✓ Verify

- [ ] `npm run test:coverage` runs and the report now lists **only** the four files above.
- [ ] Thresholds still pass (this is a scoping change, not a behavior change).
- [ ] The README/test-doc note is added.
- [ ] Commit: `git commit -am "test: scope coverage gate to the pure-logic core it actually measures"`

---

## Task 4 — Add a Playwright smoke suite (or drop the dep)

> **RESOLVED — drop path taken.** `playwright` has been removed from `package.json`'s devDependencies. There is still **zero** end-to-end/component test coverage — that gap is unaddressed, only the stale-dependency half of this task is closed. Re-open this task (adopt path, steps below) if E2E coverage becomes a priority; the steps are unaffected by the dep removal since they start from a fresh `npm i -D @playwright/test`.

|              |                                 |
| ------------ | ------------------------------- |
| **Severity** | 🟡 High · Testing               |
| **Files**    | `playwright.config.ts` · `e2e/` |
| **Effort**   | Medium (~4–6 hrs)               |
| **Decision** | Adopt (recommended) or drop — **dropped** |

### Why

There are **zero** end-to-end or component tests. `playwright` is installed but never imported and has no config. Either use it for a few happy-path smoke tests (covers the most-risky untested seams per test), or remove it so the dependency list reflects reality. **Adopting is recommended** — it's the single highest-leverage thing for the untested runtime.

### Step 1 — Install the runner & browsers

```bash
# The 'playwright' lib is present; add the test runner + browser binaries
npm i -D @playwright/test
npx playwright install chromium
```

### Step 2 — Create `playwright.config.ts` at the repo root

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
})
```

### Step 3 — Write the first smoke test: `e2e/smoke.spec.ts`

Start with the one test that proves the app boots and a flow runs. Add the record→replay and export→import journeys as follow-ups once this is green.

```ts
import { test, expect } from '@playwright/test'

test('app boots and renders the canvas', async ({ page }) => {
  await page.goto('/')
  // The device mockup / canvas shell should mount without a crash.
  await expect(page.locator('body')).toBeVisible()
  // No React error-boundary fallback on screen.
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0)
})
```

> **Selector caveat:** the exact locators depend on the live DOM. Run `npx playwright codegen http://localhost:5173` to click through the app and let Playwright generate real selectors for the record/replay/export journeys — don't guess them.

### Step 4 — Wire it into `package.json` scripts

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

### ✓ Verify

- [ ] `npm run test:e2e` starts the dev server and the boot test passes.
- [ ] Add `e2e/` artifacts (`test-results/`, `playwright-report/`) to `.gitignore`.
- [ ] **If dropping instead:** `npm uninstall playwright` and confirm nothing references it.
- [ ] Commit: `git commit -am "test: add Playwright smoke suite for app boot + core flow"`

---

# Phase C — Hardening (opportunistic, low risk)

Tasks 5 and 6. Not exploitable today; close them while you're in the files.

---

## Task 5 — Guard the dot-path writers against prototype pollution

|                     |                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Severity**        | 🔵 Low · Security                                                                      |
| **Files**           | `src/shared/utils/applyDotPathPatch.ts` · `src/features/flow-debugger/DbInspector.tsx` |
| **Effort**          | Small (~20 min)                                                                        |
| **Reachable today** | No (latent footgun)                                                                    |

### Why

Both `setAtPath` functions split a key on `.` and walk into the object with no guard. A key like `__proto__.x` would write onto `Object.prototype`, corrupting every object in the app. Inputs are author-controlled today so it isn't exploitable — but it's a one-line-per-site footgun to close now, before any future code routes imported JSON keys through these writers.

### File 1 — `src/shared/utils/applyDotPathPatch.ts`

Add a constant near the top, then guard both the `deepMerge` loop (line ~42) and the `setAtPath` loop (line ~55).

**Add below the imports:**

```ts
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
```

**`deepMerge` loop (line 42):**

```ts
for (const key of Object.keys(patch)) {
  if (UNSAFE_KEYS.has(key)) continue
  out[key] = deepMerge(base[key], patch[key])
}
```

**`setAtPath` loop (line 55):**

```ts
for (let i = 0; i < parts.length - 1; i++) {
  const key = parts[i]
  if (UNSAFE_KEYS.has(key)) return // refuse to walk into a prototype key
  if (!isPlainObject(cursor[key])) cursor[key] = {}
  cursor = cursor[key]
}
if (UNSAFE_KEYS.has(parts[parts.length - 1])) return // refuse the leaf too
```

### File 2 — `src/features/flow-debugger/DbInspector.tsx`

Same idea in the local `setAtPath` (line ~50). Add the guard inside the loop.

```ts
for (let i = 0; i < parts.length - 1; i++) {
  if (parts[i] === '__proto__' || parts[i] === 'constructor' || parts[i] === 'prototype') return
  cursor = cursor[parts[i]]
  if (cursor == null) return
}
```

### ✓ Verify

- [ ] Existing test passes: `npx vitest run applyDotPathPatch` (all current cases still green).
- [ ] Add one case to `scripts/tests/applyDotPathPatch.test.ts`: `applyDotPathPatch({}, {'__proto__.x': 1})` must **not** set `({}).x` — assert `({} as any).x` is `undefined` afterward.
- [ ] `npm run lint` + `npm run build` pass.
- [ ] Commit: `git commit -am "fix(security): block __proto__/constructor in dot-path writers"`

---

## Task 6 — Validate imported screenshot URIs

|              |                                                     |
| ------------ | --------------------------------------------------- |
| **Severity** | 🔵 Low · Security                                   |
| **File**     | `src/features/feedback/context/FeedbackContext.tsx` |
| **Effort**   | Small (~20 min)                                     |
| **Lines**    | ~284 · ~483                                         |

### Why

An imported feedback comment carries an arbitrary `screenshot` string. On markdown export it is interpolated raw into `![…](screenshot)` — a crafted value can break out and inject markup into the exported `.md`. We validate that the string is a real image data-URI on import, and drop anything else.

### Step 1 — Add a validator

Near the top of `FeedbackContext.tsx` (below `JSONBIN_CONFIG`), add:

```ts
const DATA_URI_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+=*$/
function isValidScreenshot(s: unknown): s is string {
  return typeof s === 'string' && DATA_URI_RE.test(s)
}
```

### Step 2 — Filter on import

In `importCommentsFromText` (the loop near line 483 that does `if (c.screenshot) { … FeedbackImageStore.set … }`), gate on the validator.

**Before** (~line 483):

```ts
for (const c of newComments) {
  if (c.screenshot) {
    await FeedbackImageStore.set(c.id, c.screenshot).catch(() => {})
    delete c.screenshot
  }
}
```

**After:**

```ts
for (const c of newComments) {
  if (isValidScreenshot(c.screenshot)) {
    await FeedbackImageStore.set(c.id, c.screenshot).catch(() => {})
  }
  delete c.screenshot // always strip from the comment object
}
```

### ✓ Verify

- [ ] Import a normal feedback JSON with a real screenshot — it still attaches and renders.
- [ ] Import a doctored JSON with `"screenshot": "x)![pwn](javascript:alert(1))"` — it is dropped, not stored or exported.
- [ ] `npm run lint` + `npm run build` pass.
- [ ] Commit: `git commit -am "fix(feedback): validate imported screenshot data-URIs"`

---

# Phase D — flowTracer bug backlog (folded in from a subsystem code review, 2026-06-25)

Tasks 7–10. Scope: `src/features/flowTracer/` — the session recorder. None of these are exploitable/user-visible today; all are real logic bugs.

---

## Task 7 — Fix stale `recState` closure in `logEvent`

|              |                                        |
| ------------ | -------------------------------------- |
| **Severity** | 🟡 High · Logic bug                    |
| **File**     | `src/features/flowTracer/context/index.tsx` |
| **Lines**    | 219–223                                |

### Why

`logEvent` is a `useCallback` that closes over React state `recState`. Between a `stopRecording()` call and the next render, `sessionIdRef.current` is `null` but `recState` still reads as `'recording'` (or vice versa). The guard on line 219 (`if (!sessionIdRef.current) return`) is correct; the guard on line 222 (`if (recState === 'paused' …`) reads stale state.

### Fix

Track pause/recording state via a ref kept in sync with a `useEffect`, and read the ref (not the closed-over state) inside `logEvent`.

### ✓ Verify

- [ ] Manual: start recording, pause immediately, fire an interaction — confirm it's not logged.
- [ ] `npm run lint` + `npm run build` pass.
- [ ] Commit: `git commit -am "fix(flowTracer): read recState via ref to avoid stale-closure logging bug"`

---

## Task 8 — Cancel pending `recentFlushRef` in `resetLiveState`

|              |                                        |
| ------------ | -------------------------------------- |
| **Severity** | 🟡 High · Logic bug                    |
| **File**     | `src/features/flowTracer/context/index.tsx` |
| **Lines**    | 301–307                                |

### Why

`resetLiveState` (called by both `stopRecording` and the inactivity timeout) clears `recentEventsRef.current` and calls `setRecentEvents([])`. If a `recentFlushRef` timeout is already pending, it fires ~150ms later and calls `setRecentEvents([...recentEventsRef.current])` — the last snapshot before the clear — briefly un-clearing the live feed.

### Fix

`resetLiveState` must also `clearTimeout(recentFlushRef.current)` before clearing state.

### ✓ Verify

- [ ] Manual: stop recording right after a burst of interactions — live feed stays empty, doesn't flicker back.
- [ ] `npm run lint` + `npm run build` pass.
- [ ] Commit: `git commit -am "fix(flowTracer): cancel pending flush timer in resetLiveState"`

---

## Task 9 — Pass tags/testMode through `startRecording`

|              |                       |
| ------------ | --------------------- |
| **Severity** | 🟡 High · Logic bug    |
| **File**     | `src/features/flowTracer/components/panel.tsx` |
| **Lines**    | 231                    |

### Why

`recorder.startRecording(resolvedName(s))` is called with 1 argument, but the recorder's `startRecording(name, tags, testMode)` signature takes 3. Tags and test mode from the settings panel are silently dropped — test sessions can't be initiated from the UI.

### Fix

Thread the settings-panel `tags` and `testMode` values through to the `startRecording` call at `panel.tsx:231`.

### ✓ Verify

- [ ] Manual: set tags + enable test mode in Session Settings, start a recording, stop it — exported session has the tags and `testMode: true`.
- [ ] `npm run lint` + `npm run build` pass.
- [ ] Commit: `git commit -am "fix(flowTracer): pass tags/testMode from panel into startRecording"`

---

## Task 10 — De-duplicate remarks rendering in `SessionInspect`

|              |                                  |
| ------------ | -------------------------------- |
| **Severity** | 🟡 High · Logic bug               |
| **File**     | `src/features/flowTracer/components/SessionInspect.tsx` |
| **Lines**    | 265–289                          |

### Why

Remarks render from both `events.filter(e => e.type === 'session.remark')` (has timestamps) and `meta.remarks` (plain strings), de-duplicated by exact string equality. Any whitespace difference between the two produces a visible duplicate remark.

### Fix

Pick one source of truth — prefer the timestamped `events` list — and stop rendering from `meta.remarks` directly.

### ✓ Verify

- [ ] Manual: record a session, add 2–3 remarks, stop, open in Session Inspect — each remark appears exactly once.
- [ ] `npm run lint` + `npm run build` pass.
- [ ] Commit: `git commit -am "fix(flowTracer): render remarks from a single source, drop fragile dedup"`

---

# Sequencing & sign-off

### Suggested schedule

| When         | Tasks    | Gate before moving on                                                                         |
| ------------ | -------- | --------------------------------------------------------------------------------------------- |
| Day 1 AM     | 1 · 2    | Both committed; `npm run build` + `build:standalone` green; manual record/replay/delete works |
| Day 1 PM     | 5 · 6    | New pollution + screenshot tests pass; lint clean                                             |
| → **Launch** | —        | Tasks 1, 2, 5, 6 merged to main. **This clears the ship-blockers.**                           |
| Week 1       | 3 · 4    | Coverage gate honest; first Playwright smoke test green in CI                                 |
| Week 1–2     | 7 · 8 · 9 · 10 | flowTracer logic bugs closed — not ship-blocking, but real correctness bugs in the recorder |

### Definition of done for the whole runbook

- All ten tasks committed on `fix/pre-launch-audit` (or a follow-up branch for Phase D).
- `npm run lint && npm test && npm run build` all pass from a clean checkout.
- The negative tests in Tasks 1 and 6 were actually run once and observed to fail-safe.
- PR opened against `main` with this runbook linked.

---

## Appendix — Audit provenance & caveats

This runbook is derived from the pre-launch codebase audit (2026-06-27) plus a `flowTracer`-scoped code review (2026-06-25, folded in as Phase D). Every Phase A–C fix site was verified against live source before writing; Phase D sites were verified during the original flowTracer review.

**The audit was cut short** — the org hit its monthly spend limit partway through verification, so the `reliability-bugs`, `architecture`, and `deps-ops` reviewers did not complete Phase A–C. This runbook covers only what was **confirmed**.

**Not folded in from the flowTracer review** (quality/consistency cleanup, not bugs — lower priority, no task numbers assigned): duplicated `CATEGORY_COLORS` across `panel.tsx`/`SessionInspect.tsx`; mixed Tailwind/inline-style approach in `panel.tsx`; `SessionSettingsOverlay`/`SessionExportOverlay`/`SessionInspect` still using raw HTML elements instead of shared UI components; a handful of dead exports (`context/useSessionRecorder.ts` re-export shim, redundant `activeSessionId` alias, `isTestModeRef` on the public context value, unpopulated `SessionExport.filters`, unnecessarily-public `sessionWriteBatcher` and `buildSessionExport`). Revisit as a separate cleanup pass if/when touching those files.

**Re-framing note:** FlowKit's own `VISION.md` states it is not a production host, has no backend, persistence, auth, or API. Classic "production outage / load testing / DB migration / incident runbook" concerns do not apply. Severity throughout is calibrated to real client-side risks: app crashes, IndexedDB data loss, broken builds, secrets in the shared HTML export, and injection via untrusted import.
