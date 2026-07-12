import Toggle from '@flowkit-shared/components/ui/Toggle'
import { useDashboard } from '@flowkit-shared/contexts/DashboardContext'
import { useTheme } from '@flowkit-shared/contexts/ThemeContext'

import { getNestedValue, updateNestedDbValue } from './helpers'

interface ToggleProps {
  label: string
  description?: string
  bind: string
}

export function SimToggle({ label, description, bind }: ToggleProps) {
  const ctx = useDashboard()
  const { theme, scale } = useTheme()

  const isDbPath = bind.startsWith('db.')
  const ctxRecord = ctx as unknown as Record<string, unknown>
  const val = isDbPath ? getNestedValue(ctx, bind) : ctxRecord[bind]

  const handleChange = (checked: boolean) => {
    if (isDbPath) {
      updateNestedDbValue(ctx, bind, checked)
    } else {
      const setKey = `set${bind.charAt(0).toUpperCase()}${bind.slice(1)}`
      const setter = ctxRecord[setKey] as ((v: boolean) => void) | undefined
      setter?.(checked)
    }
  }

  return (
    <div
      className="flex items-center justify-between p-2.5 rounded-lg"
      style={{ border: `1px solid ${theme.bg.border}`, backgroundColor: theme.bg.elevated }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-bold" style={{ color: theme.text.primary }}>
          {label}
        </span>
        {description && (
          <span style={{ fontSize: scale.text.xxs, color: theme.text.muted }}>{description}</span>
        )}
      </div>
      <Toggle checked={!!val} onChange={e => handleChange(e.target.checked)} />
    </div>
  )
}
