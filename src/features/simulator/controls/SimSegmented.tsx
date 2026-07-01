import SegmentedControl from '@platform/shared/components/ui/SegmentedControl'
import { useDashboard } from '@platform/shared/contexts/DashboardContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'

import { getNestedValue, updateNestedDbValue } from './helpers'

interface SegmentedProps {
  label: string
  bind: string
  options: readonly string[] | string[]
}

export function SimSegmented({ label, bind, options }: SegmentedProps) {
  const ctx = useDashboard()
  const { theme, scale } = useTheme()

  const isDbPath = bind.startsWith('db.')
  const ctxRecord = ctx as unknown as Record<string, unknown>
  const val = isDbPath ? getNestedValue(ctx, bind) : ctxRecord[bind]

  const handleChange = (opt: string) => {
    if (isDbPath) {
      updateNestedDbValue(ctx, bind, opt)
    } else {
      const setKey = `set${bind.charAt(0).toUpperCase()}${bind.slice(1)}`
      const setter = ctxRecord[setKey] as ((v: string) => void) | undefined
      setter?.(opt)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-1" style={{ fontSize: scale.text.xs, color: theme.text.muted }}>
        {label}
      </span>
      <SegmentedControl options={options} value={(val as string) || ''} onChange={handleChange} />
    </div>
  )
}
