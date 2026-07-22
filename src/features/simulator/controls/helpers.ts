import type { DashboardContextValue } from '@flowkit-shared/contexts/DashboardContext'
import type { FlowDebugInfo } from '@flowkit-shared/contexts/DashboardContext'
import { set } from '@flowkit-shared/utils/dbHelpers'

export type Ctx = DashboardContextValue

/**
 * Read a value at `path` off of `obj` (dot-path, e.g. "db.user.plan" reads
 * `obj.db.user.plan`). Kept as a thin, unguarded structural walk — NOT routed
 * through the `db.*` helper suite's `get()` — because callers here pass the
 * whole `ctx` (or a plain record) as `obj`, not `db` itself; the leading
 * segment is often "db" (walking INTO ctx.db) or another top-level ctx field
 * entirely (e.g. a non-"db."-prefixed `bind`). `get()`'s contract is
 * specifically "walk `db` itself" — reusing it here would require re-deriving
 * whether the first segment means "enter db" or not, which is exactly the
 * kind of subtle divergence this consolidation is trying to eliminate, not
 * reintroduce. Safe as-is: reads can't corrupt anything.
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc !== null && typeof acc === 'object') return (acc as Record<string, unknown>)[part]
    return undefined
  }, obj)
}

/**
 * Write `value` at `path` (a "db."-prefixed bind, e.g. "db.user.plan") into
 * `ctx`'s live db. Delegates to the canonical, guarded `db.set()` from
 * `dbHelpers.ts` — this function used to be its own, separately hand-written
 * dot-path walker with its own inline `__proto__`/`constructor`/`prototype`
 * check; it's now a thin wrapper so that guard (and the auto-create-missing-
 * intermediates behavior) can never drift from the one canonical
 * implementation.
 */
export function updateNestedDbValue(ctx: Ctx, path: string, value: unknown) {
  const dbPath = path.replace(/^db\./, '')
  set(ctx.updateDb, dbPath, value)
}

export function shouldShowControl(
  activeViewId: string | undefined,
  activeFlowDebugInfo: FlowDebugInfo | null,
  onlyForFlow?: string | string[],
  onlyForScreen?: string | string[]
): boolean {
  if (onlyForFlow) {
    const currentFlowId = activeViewId?.endsWith('-play') ? activeViewId.replace('-play', '') : null
    const flows = Array.isArray(onlyForFlow) ? onlyForFlow : [onlyForFlow]
    if (!currentFlowId || !flows.includes(currentFlowId)) {
      return false
    }
  }

  if (onlyForScreen) {
    const currentScreenId =
      activeFlowDebugInfo && activeFlowDebugInfo.history.length > 0
        ? activeFlowDebugInfo.history[activeFlowDebugInfo.history.length - 1]
        : activeViewId
    const screens = Array.isArray(onlyForScreen) ? onlyForScreen : [onlyForScreen]
    const normalize = (s: string) => s.toLowerCase().replace(/[\s-_]/g, '')
    const normalizedCurrent = normalize(currentScreenId || '')
    const match = screens.some(s => {
      const norm = normalize(s)
      return norm === normalizedCurrent || s === currentScreenId
    })
    if (!match) {
      return false
    }
  }

  return true
}
