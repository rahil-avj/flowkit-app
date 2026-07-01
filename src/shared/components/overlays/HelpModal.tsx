import { Keyboard } from 'lucide-react'
import { useMemo } from 'react'

import { APP_ACTIONS } from './appActions'
import OverlayShell from './OverlayShell'

interface Props {
  onClose: () => void
}

export default function HelpModal({ onClose }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, typeof APP_ACTIONS>()
    for (const a of APP_ACTIONS) {
      if (!a.shortcut) continue
      if (!map.has(a.group)) map.set(a.group, [])
      map.get(a.group)!.push(a)
    }
    return map
  }, [])

  return (
    <OverlayShell onClose={onClose} width={560}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-theme-border bg-theme-elevated">
        <Keyboard size={15} className="text-theme-green" />
        <span className="text-sm font-bold flex-1 text-theme-text-primary">Keyboard Shortcuts</span>
        <span className="px-1.5 py-0.5 rounded font-mono text-ui-2xs text-theme-text-disabled bg-theme-base border border-theme-border">
          esc
        </span>
      </div>

      {/* Shortcut groups */}
      <div
        className="overflow-y-auto p-4 grid grid-cols-2 gap-x-6 gap-y-5"
        style={{ maxHeight: 'calc(70vh - 52px)' }}
      >
        {[...groups.entries()].map(([group, actions]) => (
          <div key={group} className="flex flex-col gap-1">
            <span className="font-black tracking-widest uppercase mb-1 text-ui-2xs text-theme-text-disabled">
              {group}
            </span>
            {actions.map(action => (
              <div key={action.id} className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-ui-xs text-theme-text-secondary">{action.label}</span>
                <span className="font-mono px-1.5 py-0.5 rounded shrink-0 text-ui-2xs text-theme-text-muted bg-theme-elevated border border-theme-border">
                  {action.shortcut}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </OverlayShell>
  )
}
