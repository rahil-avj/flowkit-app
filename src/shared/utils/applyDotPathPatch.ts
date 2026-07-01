import type { DotPathPatch } from '@platform/types/index'

// ── applyDotPathPatch ───────────────────────────────────────────────────────────
//
// Applies a dot-path patch onto a db object and returns a NEW object — the input
// is never mutated (important: the Flowplan playback setter replaces db state, so
// callers must pass a fresh, fully-merged object).
//
// Rules (per the Flowplan spec):
//   • Dot-path keys: "local.cart" → db.local.cart, "user.profile.name" → nested.
//   • Missing intermediate paths are created automatically (null-safe).
//   • Object values DEEP-MERGE into the existing object at that path.
//   • Array values REPLACE entirely — the author declares the exact array state.
//   • Primitive / null values overwrite.
//
// This generalizes the private `setAtPath` in features/mock-db/DbInspector.tsx,
// which bails on a null intermediate and mutates in place — neither of which is
// safe for flow playback.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = Record<string, any>

function isPlainObject(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Structured deep clone with a JSON fallback (db values are JSON-serializable). */
function clone<T>(v: T): T {
  // structuredClone is available in all supported runtimes; JSON fallback keeps
  // unit tests runnable in any environment.
  try {
    return structuredClone(v)
  } catch {
    return JSON.parse(JSON.stringify(v))
  }
}

/** Deep-merge `patch` into `base`, returning a new object. Arrays replace. */
function deepMerge(base: unknown, patch: unknown): unknown {
  if (isPlainObject(base) && isPlainObject(patch)) {
    const out: Obj = { ...base }
    for (const key of Object.keys(patch)) {
      out[key] = deepMerge(base[key], patch[key])
    }
    return out
  }
  // Arrays, primitives, null → patch wins (clone so callers can't mutate source).
  return clone(patch)
}

/** Set `value` at a dot-path on `target` (mutates target), creating intermediates. */
function setAtPath(target: Obj, dotPath: string, value: unknown): void {
  const parts = dotPath.split('.')
  let cursor: Obj = target
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    if (!isPlainObject(cursor[key])) {
      // Create (or overwrite a non-object intermediate with) a fresh object.
      cursor[key] = {}
    }
    cursor = cursor[key]
  }
  const leaf = parts[parts.length - 1]
  // Merge objects, replace arrays/primitives.
  cursor[leaf] = deepMerge(cursor[leaf], value)
}

/**
 * Apply a dot-path patch onto `db`, returning a new object. Does not mutate `db`.
 *
 * @example
 *   applyDotPathPatch({ user: { plan: "free" } }, { "user.plan": "pro" })
 *   // → { user: { plan: "pro" } }
 *   applyDotPathPatch({}, { "a.b.c": 1 })
 *   // → { a: { b: { c: 1 } } }
 *   applyDotPathPatch({ items: [1, 2, 3] }, { items: [9] })
 *   // → { items: [9] }   (arrays replace)
 */
export function applyDotPathPatch(db: Obj, patch: DotPathPatch | undefined | null): Obj {
  if (!patch || Object.keys(patch).length === 0) return clone(db)
  const next = clone(db)
  for (const path of Object.keys(patch)) {
    setAtPath(next, path, patch[path])
  }
  return next
}
