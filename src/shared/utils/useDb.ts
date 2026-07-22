import { useDashboard } from '@flowkit-shared/contexts/DashboardContext'

import type { Obj } from './applyDotPathPatch'
import { get, has, remove, set, update } from './dbHelpers'

export interface DbHelpers {
  get: <T = unknown>(dotPath: string, fallback?: T) => T | undefined
  has: (dotPath: string) => boolean
  set: (dotPath: string, value: unknown) => void
  remove: (dotPath: string) => void
  update: <T = unknown>(dotPath: string, fn: (current: T | undefined) => T) => void
  reset: () => void
}

/**
 * The one hook screens use for `db` access — get/set/has/remove/update/reset,
 * bound to the live `db`/`updateDb`/`resetDb` from `useDashboard()`. Matches
 * `useAppNav()`'s zero-argument convention. Code that already holds a `ctx`
 * from its own `useDashboard()` call (the simulator-controls system, which
 * `dbHelpers.ts` also consolidates) should call the plain `get`/`set`/`has`/
 * `remove`/`update` functions from `dbHelpers.ts` directly with
 * `ctx.db`/`ctx.updateDb`, rather than calling this hook a second time.
 */
export function useDb(): DbHelpers {
  const { db, updateDb, resetDb } = useDashboard()
  return {
    get: (dotPath, fallback) => get(db as Obj, dotPath, fallback),
    has: dotPath => has(db as Obj, dotPath),
    set: (dotPath, value) => set(updateDb, dotPath, value),
    remove: dotPath => remove(updateDb, dotPath),
    update: (dotPath, fn) => update(updateDb, dotPath, fn),
    reset: () => resetDb(),
  }
}
