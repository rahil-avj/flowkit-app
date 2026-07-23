import { type FlowNavContextValue, FlowNavCtx } from '@flowkit-shared/contexts/FlowNavContext'
import { useContext } from 'react'

/**
 * Access FlowMaster's navigation from inside a flow screen.
 *
 * Navigation called through this hook goes through FlowMaster's
 * commitNavigation — guards, animations, and the debugger all fire.
 *
 * Use this when navigation depends on internal screen state or async results:
 *   const { navigateTo } = useNav();
 *   const handleSubmit = async () => {
 *     await save();
 *     navigateTo("next");
 *   };
 *
 * For db access, use useDashboard() — NOT this hook:
 *   const { db, updateDb } = useDashboard();
 *
 * @throws If called outside a FlowMaster-rendered screen.
 */
export function useNav(): FlowNavContextValue {
  const ctx = useContext(FlowNavCtx)
  if (!ctx) {
    throw new Error(
      'useNav() was called outside a FlowMaster. ' +
        'This hook only works inside screens rendered by a flow. ' +
        'For data access use useDashboard() instead.'
    )
  }
  return ctx
}
