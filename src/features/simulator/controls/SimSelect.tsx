import { useDashboard } from '@platform/shared/contexts/DashboardContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'

import { getNestedValue, updateNestedDbValue } from './helpers'

interface SelectProps {
  label: string
  bind: string
  options: readonly string[] | string[]
  description?: string
}

export function SimSelect({ label, bind, options, description }: SelectProps) {
  const ctx = useDashboard()
  const { theme, scale } = useTheme()

  const isDbPath = bind.startsWith('db.')
  const ctxRecord = ctx as unknown as Record<string, unknown>
  const val = isDbPath ? getNestedValue(ctx, bind) : ctxRecord[bind]

  const handleChange = (v: string) => {
    const coerced: string | number = !isNaN(Number(v)) && v !== '' ? Number(v) : v
    if (isDbPath) {
      updateNestedDbValue(ctx, bind, coerced)
    } else {
      const setKey = `set${bind.charAt(0).toUpperCase()}${bind.slice(1)}`
      const setter = ctxRecord[setKey] as ((v: string | number) => void) | undefined
      setter?.(coerced)
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
      <select
        value={(val as string) ?? ''}
        onChange={e => handleChange(e.target.value)}
        className="rounded outline-none font-semibold"
        style={{
          fontSize: scale.text.xs,
          color: theme.text.primary,
          background: theme.bg.base,
          border: `1px solid ${theme.bg.border}`,
          padding: '3px 6px',
          maxWidth: 130,
        }}
      >
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}
