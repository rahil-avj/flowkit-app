import { applyDotPathPatch } from '@flowkit-shared/utils/applyDotPathPatch'
import { describe, expect, it } from 'vitest'

describe('applyDotPathPatch', () => {
  it('1. deep-sets on an existing nested object, leaving siblings intact', () => {
    const db = { user: { plan: 'free', name: 'Ada' }, orders: [] }
    const next = applyDotPathPatch(db, { 'user.plan': 'pro' })
    expect(next.user.plan).toBe('pro')
    expect(next.user.name).toBe('Ada') // sibling untouched
    expect(next.orders).toEqual([])
  })

  it('2. creates missing intermediate objects (null-safe path creation)', () => {
    const next = applyDotPathPatch({}, { 'a.b.c': 1 })
    expect(next).toEqual({ a: { b: { c: 1 } } })
  })

  it('3. deep-merges object values rather than replacing', () => {
    const db = { user: { plan: 'free', name: 'Ada' } }
    const next = applyDotPathPatch(db, { user: { name: 'Grace' } })
    // both keys present — merged, not replaced
    expect(next.user).toEqual({ plan: 'free', name: 'Grace' })
  })

  it('4. replaces arrays entirely (does not merge)', () => {
    const db = { items: [1, 2, 3] }
    const next = applyDotPathPatch(db, { items: [9] })
    expect(next.items).toEqual([9])
  })

  it('5. is null-safe when an intermediate is null (overwrites, no throw)', () => {
    const db = { a: null }
    expect(() => applyDotPathPatch(db, { 'a.b': 1 })).not.toThrow()
    const next = applyDotPathPatch(db, { 'a.b': 1 })
    expect(next).toEqual({ a: { b: 1 } })
  })

  it('6. does not mutate the input db (returns a new object)', () => {
    const db = { user: { plan: 'free' }, items: [1] }
    const next = applyDotPathPatch(db, { 'user.plan': 'pro' })
    expect(db.user.plan).toBe('free') // original untouched
    expect(next).not.toBe(db)
    expect(next.user).not.toBe(db.user)
    // nested array in the result must not be the same reference as input
    const next2 = applyDotPathPatch(db, { other: true })
    expect(next2.items).not.toBe(db.items)
  })

  it('7. distinguishes explicit null from a missing key', () => {
    const db = { user: { address: { city: 'NYC' } } }
    const next = applyDotPathPatch(db, { 'user.address': null })
    expect(next.user.address).toBeNull() // explicitly nulled
  })

  it('returns a clone when patch is empty/undefined (still no mutation)', () => {
    const db = { a: 1 }
    const next = applyDotPathPatch(db, {})
    expect(next).toEqual({ a: 1 })
    expect(next).not.toBe(db)
    expect(applyDotPathPatch(db, undefined)).toEqual({ a: 1 })
  })

  it('applies multiple dot-paths in one patch', () => {
    const db = { user: { plan: 'free' }, local: {} }
    const next = applyDotPathPatch(db, {
      'user.plan': 'pro',
      'local.isOnline': true,
    })
    expect(next.user.plan).toBe('pro')
    expect(next.local.isOnline).toBe(true)
  })

  it('AP1. 4+ nesting levels — all siblings preserved at every level', () => {
    const db = { a: { sibling: 'keep', b: { sibling: 'keep', c: { sibling: 'keep', d: 'old' } } } }
    const next = applyDotPathPatch(db, { 'a.b.c.d': 'new' })
    expect(next.a.sibling).toBe('keep')
    expect(next.a.b.sibling).toBe('keep')
    expect(next.a.b.c.sibling).toBe('keep')
    expect(next.a.b.c.d).toBe('new')
  })

  it('AP2. conflicting keys "a" and "a.b" both applied — no throw, last write wins', () => {
    const db = { a: { b: 'original', c: 'other' } }
    expect(() => applyDotPathPatch(db, { a: { b: 'first' }, 'a.b': 'second' })).not.toThrow()
    const next = applyDotPathPatch(db, { a: { b: 'first' }, 'a.b': 'second' })
    expect(next.a.b).toBe('second')
  })

  it('AP3. empty array [] as patch value replaces existing array (not merged)', () => {
    const db = { items: [1, 2, 3] }
    const next = applyDotPathPatch(db, { items: [] })
    expect(next.items).toEqual([])
  })

  it('AP4. undefined patch is treated the same as an empty patch — returns a clone, no throw', () => {
    const db = { a: 1 }
    expect(() => applyDotPathPatch(db, undefined)).not.toThrow()
    const next = applyDotPathPatch(db, undefined)
    expect(next).toEqual({ a: 1 })
    expect(next).not.toBe(db)
  })
})
