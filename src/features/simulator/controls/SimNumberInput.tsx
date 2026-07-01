import Input from '@platform/shared/components/ui/Input'
import { useDashboard } from '@platform/shared/contexts/DashboardContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'

import { getNestedValue, updateNestedDbValue } from './helpers'

interface NumberInputProps {
  label: string
  description?: string
  bind: string
  min?: number
  max?: number
  step?: number
}

export function SimNumberInput({ label, description, bind, min, max, step }: NumberInputProps) {
  const ctx = useDashboard()
  const { theme, scale } = useTheme()
  const isDbPath = bind.startsWith('db.')
  const ctxRecord = ctx as unknown as Record<string, unknown>
  const val = isDbPath ? getNestedValue(ctx, bind) : ctxRecord[bind]

  const handleChange = (raw: string) => {
    const parsed = parseFloat(raw)
    const value = isNaN(parsed) ? 0 : parsed
    if (isDbPath) {
      updateNestedDbValue(ctx, bind, value)
    } else {
      const setKey = `set${bind.charAt(0).toUpperCase()}${bind.slice(1)}`
      ;(ctxRecord[setKey] as ((v: number) => void) | undefined)?.(value)
    }
  }

  return (
    <div
      className="flex flex-col gap-1 p-2.5 rounded-lg"
      style={{ border: `1px solid ${theme.bg.border}`, backgroundColor: theme.bg.elevated }}
    >
      <span className="text-xs font-bold" style={{ color: theme.text.primary }}>
        {label}
      </span>
      {description && (
        <span style={{ fontSize: scale.text.xxs, color: theme.text.muted }}>{description}</span>
      )}
      <Input
        type="number"
        value={val !== undefined && val !== null ? String(val) : '0'}
        onChange={e => handleChange(e.target.value)}
        min={min}
        max={max}
        step={step ?? 1}
        placeholder="0"
      />
    </div>
  )
}
