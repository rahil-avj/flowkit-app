import type { ScreenMeta } from '@flowkit/types'
import { useDashboard } from '@flowkit-shared/contexts'
import { useAppNav } from '@flowkit-shared/utils'

export default function HomeScreen() {
  const { db } = useDashboard()
  const { navigateTo } = useAppNav()
  const items: Array<{ id: number; title: string; desc: string; status: string }> = db?.items ?? []

  return (
    <div className="flex flex-col h-full bg-theme-base">
      <div className="flex items-center justify-between px-4 h-12 border-b border-theme-border-subtle">
        <span className="text-ui-md font-medium text-theme-text-primary">Home</span>
        <span className="text-ui-xs text-theme-text-muted">{items.length} items</span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {items.map((item) => {
          const badgeClass = item.status === 'active'
            ? 'bg-theme-green-dim text-theme-green'
            : 'bg-theme-amber-dim text-theme-amber'
          return (
            <div
              key={item.id}
              id={'item-' + item.id}
              onClick={() => navigateTo('detail-screen')}
              className="rounded-[10px] bg-theme-surface shadow-theme-card p-3 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-ui-sm font-medium text-theme-text-primary truncate">{item.title}</p>
                <p className="text-ui-xs text-theme-text-muted truncate">{item.desc}</p>
              </div>
              <span className={'text-ui-2xs font-bold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-full shrink-0 ' + badgeClass}>
                {item.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const screenMeta: ScreenMeta = {
  label: 'Home Screen',
  desc: 'Dashboard listing items from db.items with status badges.',
}
