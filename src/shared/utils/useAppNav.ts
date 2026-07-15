import { useDashboard } from '@flowkit-shared/contexts/DashboardContext'
import { FlowNavCtx } from '@flowkit-shared/contexts/FlowNavContext'
import { useContext } from 'react'

export interface AppNav {
  /**
   * Navigate to a screen id. Safe to call unconditionally — routes through
   * FlowMaster's commitNavigation (guards, animations, debugger, recording)
   * when this screen is rendered inside a flow, DashboardContext otherwise.
   */
  navigateTo: (target: string) => void
  /** True when this screen is currently rendered inside a flowplan. */
  isFlow: boolean
  /** Flow-local sandbox state. Undefined when not in a flow. */
  flowState: Record<string, unknown> | undefined
}

/**
 * The one hook screens use for direct navigation — no isFlow prop, no manual
 * guard. Unlike useFlowNav(), this never throws outside a flow: it reads
 * FlowNavCtx non-throwing and falls back to DashboardContext when absent, so
 * a screen calling navigateTo() here can never accidentally reach the wrong
 * navigation state machine by omission.
 */
export function useAppNav(): AppNav {
  const flowNav = useContext(FlowNavCtx)
  const dashboard = useDashboard()
  if (flowNav) {
    return { navigateTo: flowNav.navigateTo, isFlow: true, flowState: flowNav.flowState }
  }
  return { navigateTo: dashboard.navigateTo, isFlow: false, flowState: undefined }
}
