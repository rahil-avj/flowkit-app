import { createContext } from 'react'

/**
 * Context provided by FlowMaster to all screens rendered inside a flow.
 *
 * Screens access this via `useFlowNav()` from "@flowkit-shared/utils/useFlowNav".
 *
 * Navigation called through this context goes through FlowMaster's
 * commitNavigation — guards, animations, and the debugger all fire.
 */
export interface FlowNavContextValue {
  /** Navigate to a screen id, "next", "back", or "__complete__". */
  navigateTo: (target: string) => void
  /** Advance to the next screen in the flow. */
  goNext: () => void
  /** Go back to the previous screen. */
  goBack: () => void
  /** True when this screen is rendered inside a FlowMaster. */
  isFlow: boolean
  /** Flow-local sandbox state. */
  flowState: Record<string, unknown>
}

export const FlowNavCtx = createContext<FlowNavContextValue | null>(null)
