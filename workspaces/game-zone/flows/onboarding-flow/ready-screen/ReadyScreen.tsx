import type { ScreenMeta } from '@flowkit/types'
import { useDashboard } from '@flowkit-shared/contexts'
import { useAppNav } from '@flowkit-shared/utils'

export default function ReadyScreen() {
  const { db } = useDashboard()
  const { navigateTo } = useAppNav()

  return (
    <div className="flex flex-col h-full bg-theme-base items-center justify-center gap-6 p-6">
      <div className="size-16 rounded-full bg-theme-green-dim flex items-center justify-center">
        <span className="text-2xl">✓</span>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-ui-xl font-bold text-theme-text-primary">You're all set</h1>
        <p className="text-ui-sm text-theme-text-secondary">
          {db?.user?.name ?? 'User'}, your workspace is ready.
        </p>
      </div>
      <button
        id="go-to-home"
        onClick={() => navigateTo('home-screen')}
        className="px-4 py-2.5 rounded-md bg-theme-blue-dim text-theme-blue text-ui-sm font-medium"
      >
        Go to Home
      </button>
    </div>
  )
}

export const screenMeta: ScreenMeta = {
  label: 'Ready Screen',
  desc: 'Onboarding complete — reads user name from db, prompts user to proceed.',
}
