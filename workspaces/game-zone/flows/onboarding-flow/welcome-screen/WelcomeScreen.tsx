import type { ScreenMeta } from '@flowkit/types'
import { useAppNav } from '@flowkit-shared/utils'

// Two independent ways this screen is reachable/interactive:
// 1. Flow playback (F4) — the flowplan step matches this button by its id
//    ('get-started'), so FlowMaster advances the flow on tap with no extra code.
// 2. Screens tab (free exploration, no flow active) — onClick calls
//    navigateTo() via useAppNav(), so the button also works standalone.
//    useAppNav() picks the flow-aware navigateTo automatically when rendered
//    inside a flow, so calling it unconditionally here never desyncs
//    DashboardContext's view history from FlowEngine's step index.
export default function WelcomeScreen() {
  const { navigateTo } = useAppNav()

  return (
    <div className="flex flex-col h-full bg-theme-base">
      <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6">
        <div className="size-16 rounded-full bg-theme-blue-dim flex items-center justify-center">
          <span className="text-2xl">👋</span>
        </div>
        <h1 className="text-ui-xl font-bold text-theme-text-primary text-center">
          Welcome to FlowKit
        </h1>
        <p className="text-ui-sm text-theme-text-secondary text-center max-w-xs">
          This workspace shows how screens read from db, use theme tokens, and wire interactions via
          flowplan steps.
        </p>
      </div>
      <div className="p-4 pb-8">
        <button
          id="get-started"
          onClick={() => navigateTo('setup-screen')}
          className="w-full px-3 py-2.5 rounded-md bg-theme-blue-dim text-theme-blue text-ui-sm font-medium"
        >
          Get Started
        </button>
      </div>
    </div>
  )
}

export const screenMeta: ScreenMeta = {
  label: 'Welcome Screen',
  desc: 'Entry point — introduces the workspace and prompts user to begin.',
}
