import { isPlainObject, type Obj, UNSAFE_KEYS } from './applyDotPathPatch'

// ── db.* helper suite ────────────────────────────────────────────────────────
//
// A `grep`-based sweep of this codebase found FIVE independent, hand-rolled
// dot-path implementations touching `db`, each with different (and in two
// cases actively broken) safety behavior:
//
//   1. applyDotPathPatch.ts's setAtPath   — guarded, auto-creates, deep-merges.
//   2. simulator/controls/helpers.ts's
//      getNestedValue/updateNestedDbValue — separately-guarded, auto-creates.
//   3. SimArrayEditor.tsx's inline walkers — NO guard, NO auto-create (throws).
//   4. flow-debugger/dbInspectorHelpers.ts's
//      setAtPath (same name, different fn) — NO guard, SILENTLY NO-OPS on a
//      missing intermediate (the one DbInspector.tsx actually uses).
//   5. flowplan/compileFlowplan.ts's readDotPath — read-only, its own walker.
//
// This file is the one canonical implementation all five now route through.
// Six one-word, Map-like verbs — get/set/has/remove/update mirror Map's own
// method names; reset is a thin pass-through to the existing resetDb() (see
// useDb.ts for that one — the React-hook wrapper around this file).
//
// Deliberately ZERO React/context imports here (unlike useDb.ts) — this file
// is pure logic taking `db`/`updateDb` as plain arguments, importable from a
// unit test (scripts/tests/dbHelpers.test.ts) without pulling in
// DashboardContext's virtual-module dependencies, and directly callable from
// code that already holds a `ctx` from its own `useDashboard()` call (the
// simulator-controls system this suite also consolidates) without a second,
// redundant hook call.
//
// Paths never include a leading "db." prefix (they operate directly on the
// `db` object itself) — callers that receive a `"db.foo.bar"`-style bind
// string (e.g. a SimulatorControl's `path` field prefixed for display) must
// strip that prefix before calling in, same as the pre-existing call sites
// already did.

function assertSafePath(dotPath: string): string[] {
  const parts = dotPath.split('.')
  if (parts.some(key => UNSAFE_KEYS.has(key))) {
    throw new Error(`db helpers: unsafe key in path "${dotPath}"`)
  }
  return parts
}

/** Read a value at `dotPath`. Returns `fallback` (default `undefined`) the
 * moment any intermediate segment is missing or non-object — never throws on
 * a missing path (unsafe keys in the path are simply absent from any real
 * object, so a read never needs to guard against them the way a write does). */
export function get<T = unknown>(db: Obj, dotPath: string, fallback?: T): T | undefined {
  const parts = dotPath.split('.')
  let cursor: unknown = db
  for (const part of parts) {
    if (cursor === null || typeof cursor !== 'object') return fallback
    cursor = (cursor as Record<string, unknown>)[part]
  }
  return cursor === undefined ? fallback : (cursor as T)
}

/** True if `dotPath` resolves to a defined value — distinguishes "exists with
 * value `undefined`" from "never existed" via `in` checks at each segment, so
 * `has()` correctly returns `true` for a value of `0`/`false`/`null`. */
export function has(db: Obj, dotPath: string): boolean {
  const parts = dotPath.split('.')
  let cursor: unknown = db
  for (const part of parts) {
    if (cursor === null || typeof cursor !== 'object' || !(part in (cursor as object))) {
      return false
    }
    cursor = (cursor as Record<string, unknown>)[part]
  }
  return true
}

/**
 * Set `value` at `dotPath` on `draft` (mutates in place — always called from
 * inside an `updateDb` callback, same contract as the underlying primitive).
 * Auto-creates missing intermediate objects. Unlike `applyDotPathPatch.ts`'s
 * own `setAtPath`, this OVERWRITES the leaf outright rather than deep-merging
 * — that function's merge behavior is specific to flowplan patch semantics;
 * a plain `db.set()` call should behave like `Map.set` (replace, don't merge).
 */
function setAtPathOverwrite(draft: Obj, dotPath: string, value: unknown): void {
  const parts = assertSafePath(dotPath)
  let cursor: Obj = draft
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    if (!isPlainObject(cursor[key])) cursor[key] = {}
    cursor = cursor[key]
  }
  cursor[parts[parts.length - 1]] = value
}

/** Delete the key at `dotPath` on `draft` (mutates in place). No-ops safely if
 * any intermediate segment (or the leaf itself) doesn't exist — deleting a
 * key that was never there is not an error, same as plain JS `delete`. */
function removeAtPath(draft: Obj, dotPath: string): void {
  const parts = assertSafePath(dotPath)
  let cursor: Obj = draft
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cursor[parts[i]]
    if (!isPlainObject(next)) return
    cursor = next
  }
  delete cursor[parts[parts.length - 1]]
}

/** Structural match for `DashboardContextValue['updateDb']` — kept local (not
 * imported from DashboardContext) so this file stays free of React/context
 * dependencies. See the file-header comment for why that matters. */
export type UpdateDbFn = (updater: (db: Record<string, unknown>) => void) => void

/** Create-or-overwrite a value at `dotPath`. Rejects `__proto__`/`prototype`/
 * `constructor` anywhere in the path (throws, does not silently corrupt),
 * and creates any missing intermediate object on the way to the target. */
export function set(updateDb: UpdateDbFn, dotPath: string, value: unknown): void {
  updateDb(draft => setAtPathOverwrite(draft as Obj, dotPath, value))
}

/** Delete the value at `dotPath`. Safe no-op if the path doesn't exist. */
export function remove(updateDb: UpdateDbFn, dotPath: string): void {
  updateDb(draft => removeAtPath(draft as Obj, dotPath))
}

/**
 * Read-modify-write in one call: `fn` receives the current value at
 * `dotPath` (via the same safe read as `get()`, `undefined` if missing) and
 * its return value is written back via the same guarded path as `set()`.
 * Covers increment/append/keep-max/array-splice without a separate verb:
 *   db.update(updateDb, 'score', (v = 0) => v + 10)
 *   db.update(updateDb, 'items', (arr = []) => { arr.splice(i, 1); return arr })
 */
export function update<T = unknown>(
  updateDb: UpdateDbFn,
  dotPath: string,
  fn: (current: T | undefined) => T
): void {
  updateDb(draft => {
    const current = get<T>(draft as Obj, dotPath)
    setAtPathOverwrite(draft as Obj, dotPath, fn(current))
  })
}
