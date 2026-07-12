import { useDashboard } from '@flowkit-shared/contexts/DashboardContext'
import { useTheme } from '@flowkit-shared/contexts/ThemeContext'

import type { Ctx } from './helpers'
import { getNestedValue, shouldShowControl } from './helpers'
import { SimAction } from './SimAction'
import { SimArrayEditor } from './SimArrayEditor'
import { SimNumberInput } from './SimNumberInput'
import { SimObjectEditor } from './SimObjectEditor'
import { SimSegmented } from './SimSegmented'
import { SimSelect } from './SimSelect'
import { SimTextInput } from './SimTextInput'
import { SimToggle } from './SimToggle'

interface SimControlProps {
  label: string
  bind?: string
  options?: readonly string[] | string[]
  description?: string
  badge?: string
  badgeColor?: 'red' | 'amber' | 'emerald' | 'blue'
  icon?: string
  onClick?: (ctx: Ctx) => void
  onlyForFlow?: string | string[]
  onlyForScreen?: string | string[]
}

export function SimControl({
  label,
  bind,
  options,
  description,
  badge,
  badgeColor,
  icon,
  onClick,
  onlyForFlow,
  onlyForScreen,
}: SimControlProps) {
  const ctx = useDashboard()
  const { theme } = useTheme()

  if (!shouldShowControl(ctx.activeViewId, ctx.activeFlowDebugInfo, onlyForFlow, onlyForScreen)) {
    return null
  }

  if (onClick) {
    return (
      <SimAction
        label={label}
        description={description}
        badge={badge}
        badgeColor={badgeColor}
        icon={icon}
        onClick={onClick}
      />
    )
  }

  if (bind) {
    const isDbPath = bind.startsWith('db.')
    const ctxRecord = ctx as unknown as Record<string, unknown>
    const val = isDbPath ? getNestedValue(ctx, bind) : ctxRecord[bind]

    if (Array.isArray(val)) {
      return <SimArrayEditor label={label} bind={bind} val={val} theme={theme} ctx={ctx} />
    }

    if (typeof val === 'object' && val !== null) {
      return (
        <SimObjectEditor
          label={label}
          bind={bind}
          val={val as Record<string, unknown>}
          theme={theme}
          ctx={ctx}
        />
      )
    }

    if (options && options.length > 0) {
      return options.length > 4 ? (
        <SimSelect label={label} bind={bind} options={options} description={description} />
      ) : (
        <SimSegmented label={label} bind={bind} options={options} />
      )
    }

    if (typeof val === 'boolean' || val === undefined || val === null) {
      return <SimToggle label={label} description={description} bind={bind} />
    }

    if (typeof val === 'number') {
      return <SimNumberInput label={label} description={description} bind={bind} />
    }

    if (typeof val === 'string') {
      return <SimTextInput label={label} description={description} bind={bind} />
    }

    return <SimSegmented label={label} bind={bind} options={[]} />
  }

  return null
}
