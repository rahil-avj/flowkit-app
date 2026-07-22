import type { ScreenMeta } from '@flowkit/types'
import { useDashboard } from '@flowkit-shared/contexts'
import { useAppNav } from '@flowkit-shared/utils'

export default function DetailScreen() {
  const { db } = useDashboard()
  const { navigateTo } = useAppNav()
  const item = db?.items?.[0]

  const badgeClass = item?.status === 'active'
    ? 'bg-theme-green-dim text-theme-green'
    : 'bg-theme-amber-dim text-theme-amber'

  return (
    <div className="flex flex-col h-full bg-theme-base">
      <div className="flex items-center gap-2 px-4 h-12 border-b border-theme-border-subtle">
        <button id="back" onClick={() => navigateTo('home-screen')} className="text-ui-sm text-theme-blue">← Back</button>
        <span className="flex-1 text-center text-ui-sm font-medium text-theme-text-primary">Detail</span>
        <div className="w-12" />
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-xl bg-theme-surface shadow-theme-card p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-ui-lg font-bold text-theme-text-primary">{item?.title ?? 'Item'}</h2>
            <span className={'text-ui-2xs font-bold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-full shrink-0 ' + badgeClass}>
              {item?.status}
            </span>
          </div>
          <p className="text-ui-sm text-theme-text-secondary">{item?.desc ?? ''}</p>
          <div className="pt-2 border-t border-theme-border-subtle">
            <p className="text-ui-2xs font-bold uppercase tracking-[0.04em] text-theme-text-muted mb-1">Item ID</p>
            <p className="text-ui-sm text-theme-text-primary">{item?.id ?? '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export const screenMeta: ScreenMeta = {
  label: 'Detail Screen',
  desc: 'Detail view for a single item — reads from db.items[0] for demo.',
}
