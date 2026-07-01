import type { DashboardContextValue } from '@platform/shared/contexts/DashboardContext'
import type { FlowDebugInfo } from '@platform/shared/contexts/DashboardContext'

export type Ctx = DashboardContextValue

export function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc !== null && typeof acc === 'object') return (acc as Record<string, unknown>)[part]
    return undefined
  }, obj)
}

export function updateNestedDbValue(ctx: Ctx, path: string, value: unknown) {
  const dbPath = path.replace(/^db\./, '')
  const pathParts = dbPath.split('.')
  ctx.updateDb(draft => {
    let parent: Record<string, unknown> = draft as Record<string, unknown>
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i]
      if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
        return
      }
      if (!parent[part]) parent[part] = {}
      parent = parent[part] as Record<string, unknown>
    }
    const lastPart = pathParts[pathParts.length - 1]
    if (lastPart === '__proto__' || lastPart === 'constructor' || lastPart === 'prototype') {
      return
    }
    parent[lastPart] = value
  })
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
