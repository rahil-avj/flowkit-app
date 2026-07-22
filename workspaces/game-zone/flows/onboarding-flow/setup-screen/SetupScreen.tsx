import type { ScreenMeta } from '@flowkit/types'
import { useDashboard } from '@flowkit-shared/contexts'
import { useAppNav } from '@flowkit-shared/utils'

export default function SetupScreen() {
  const { db } = useDashboard()
  const { navigateTo } = useAppNav()

  return (
    <div className="flex flex-col h-full bg-theme-base">
      <div className="flex items-center px-4 h-12 border-b border-theme-border-subtle">
        <span className="text-ui-md font-medium text-theme-text-primary">Your Profile</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-[10px] bg-theme-surface shadow-theme-card p-3 flex items-center gap-3">
          <div className="size-10 rounded-full bg-theme-blue-dim flex items-center justify-center text-ui-sm font-bold text-theme-blue">
            {db?.user?.name?.[0] ?? 'U'}
          </div>
          <div>
            <p className="text-ui-sm font-medium text-theme-text-primary">{db?.user?.name ?? 'User'}</p>
            <p className="text-ui-xs text-theme-text-muted">{db?.user?.email ?? ''}</p>
          </div>
        </div>
        <div className="rounded-[10px] bg-theme-surface shadow-theme-card divide-y divide-theme-border-subtle">
          {['Notifications', 'Privacy', 'Display'].map((item) => (
            <div key={item} className="flex items-center justify-between px-3 py-2.5">
              <span className="text-ui-sm text-theme-text-primary">{item}</span>
              <span className="text-ui-xs text-theme-text-muted">›</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto p-4 pb-8">
        <button
          id="continue"
          onClick={() => navigateTo('ready-screen')}
          className="w-full px-3 py-2.5 rounded-md bg-theme-blue-dim text-theme-blue text-ui-sm font-medium"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

export const screenMeta: ScreenMeta = {
  label: 'Setup Screen',
  desc: 'Shows user profile read from db and setup options.',
}
