import { get, has, remove, set, update } from '@flowkit-shared/utils/dbHelpers'
import { describe, expect, it } from 'vitest'

// Minimal stand-in for DashboardContextValue['updateDb'] — same clone-and-
// mutate contract as the real one, without pulling in React/DashboardContext.
function makeUpdateDb(initial: Record<string, unknown>) {
  let db = initial
  const updateDb = (updater: (draft: Record<string, unknown>) => void) => {
    const clone = JSON.parse(JSON.stringify(db))
    updater(clone)
    db = clone
  }
  return { updateDb, getDb: () => db }
}

describe('dbHelpers — get', () => {
  it('1. reads a nested value', () => {
    const db = { user: { plan: 'free' } }
    expect(get(db, 'user.plan')).toBe('free')
  })

  it('2. returns undefined for a missing path, never throws', () => {
    const db = { user: {} }
    expect(() => get(db, 'user.profile.name')).not.toThrow()
    expect(get(db, 'user.profile.name')).toBeUndefined()
  })

  it('3. returns the fallback for a missing path when provided', () => {
    const db = {}
    expect(get(db, 'missing.path', 'fallback')).toBe('fallback')
  })

  it('4. returns real falsy values (0, false, null) rather than the fallback', () => {
    const db = { a: { zero: 0, bool: false, nil: null } }
    expect(get(db, 'a.zero', 99)).toBe(0)
    expect(get(db, 'a.bool', true)).toBe(false)
    expect(get(db, 'a.nil', 'fallback')).toBeNull()
  })

  it('5. reads array elements via numeric-looking segments', () => {
    const db = { items: [{ title: 'first' }, { title: 'second' }] }
    expect(get(db, 'items.0.title')).toBe('first')
    expect(get(db, 'items.1.title')).toBe('second')
  })

  it('6. stops safely at a null intermediate instead of throwing', () => {
    const db = { a: null }
    expect(() => get(db, 'a.b.c')).not.toThrow()
    expect(get(db, 'a.b.c')).toBeUndefined()
  })
})

describe('dbHelpers — has', () => {
  it('1. true for an existing path', () => {
    expect(has({ user: { plan: 'free' } }, 'user.plan')).toBe(true)
  })

  it('2. false for a missing path', () => {
    expect(has({ user: {} }, 'user.plan')).toBe(false)
  })

  it('3. distinguishes "exists with falsy value" from "never existed"', () => {
    const db = { a: { zero: 0, bool: false, nil: null, undef: undefined } }
    expect(has(db, 'a.zero')).toBe(true)
    expect(has(db, 'a.bool')).toBe(true)
    expect(has(db, 'a.nil')).toBe(true)
    expect(has(db, 'a.missing')).toBe(false)
  })
})

describe('dbHelpers — set', () => {
  it('1. creates a brand-new path that does not exist in the seed', () => {
    const { updateDb, getDb } = makeUpdateDb({})
    set(updateDb, 'highScores.memoryMatch', 4096)
    expect(getDb()).toEqual({ highScores: { memoryMatch: 4096 } })
  })

  it('2. overwrites an existing value at a path (does not deep-merge)', () => {
    const { updateDb, getDb } = makeUpdateDb({ user: { name: 'Alex', plan: 'free' } })
    set(updateDb, 'user', { name: 'Sam' })
    // plain overwrite — plan is gone, unlike applyDotPathPatch's merge semantics
    expect(getDb()).toEqual({ user: { name: 'Sam' } })
  })

  it('3. rejects __proto__ in the path instead of polluting Object.prototype', () => {
    const { updateDb } = makeUpdateDb({})
    expect(() => set(updateDb, '__proto__.polluted', true)).toThrow()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(({} as any).polluted).toBeUndefined()
  })

  it('4. rejects constructor/prototype at any nesting depth', () => {
    const { updateDb } = makeUpdateDb({})
    expect(() => set(updateDb, 'a.constructor.polluted', true)).toThrow()
    expect(() => set(updateDb, 'a.prototype.polluted', true)).toThrow()
  })
})

describe('dbHelpers — remove', () => {
  it('1. deletes an existing key', () => {
    const { updateDb, getDb } = makeUpdateDb({ user: { name: 'Alex', plan: 'free' } })
    remove(updateDb, 'user.plan')
    expect(getDb()).toEqual({ user: { name: 'Alex' } })
  })

  it('2. no-ops safely when the path does not exist', () => {
    const { updateDb, getDb } = makeUpdateDb({ user: { name: 'Alex' } })
    expect(() => remove(updateDb, 'user.missing.deeper')).not.toThrow()
    expect(getDb()).toEqual({ user: { name: 'Alex' } })
  })

  it('3. has() returns false after remove()', () => {
    const { updateDb, getDb } = makeUpdateDb({ a: { b: 1 } })
    remove(updateDb, 'a.b')
    expect(has(getDb(), 'a.b')).toBe(false)
  })
})

describe('dbHelpers — update', () => {
  it('1. increments a counter, defaulting a missing value', () => {
    const { updateDb, getDb } = makeUpdateDb({})
    update<number>(updateDb, 'score', v => (v ?? 0) + 10)
    expect(get(getDb(), 'score')).toBe(10)
    update<number>(updateDb, 'score', v => (v ?? 0) + 5)
    expect(get(getDb(), 'score')).toBe(15)
  })

  it('2. keeps the max of old vs. new (a plausible high-score pattern)', () => {
    const { updateDb, getDb } = makeUpdateDb({ best: 100 })
    update<number>(updateDb, 'best', v => Math.max(v ?? 0, 50))
    expect(get(getDb(), 'best')).toBe(100) // unchanged — new value was lower
    update<number>(updateDb, 'best', v => Math.max(v ?? 0, 150))
    expect(get(getDb(), 'best')).toBe(150)
  })

  it('3. splices an array in place via the callback', () => {
    const { updateDb, getDb } = makeUpdateDb({ items: [1, 2, 3] })
    update<number[]>(updateDb, 'items', arr => {
      ;(arr ?? []).splice(1, 1)
      return arr ?? []
    })
    expect(get(getDb(), 'items')).toEqual([1, 3])
  })
})
