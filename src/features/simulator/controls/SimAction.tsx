import { useDashboard } from '@platform/shared/contexts/DashboardContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Eye,
  RefreshCw,
  Trash2,
  Wrench,
} from 'lucide-react'
import type React from 'react'

import type { Ctx } from './helpers'

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; style?: React.CSSProperties }>
> = {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Eye,
  RefreshCw,
  Trash2,
  Wrench,
}

interface ActionProps {
  label: string
  description?: string
  badge?: string
  badgeColor?: 'red' | 'amber' | 'emerald' | 'blue'
  icon?: string
  onClick: (ctx: Ctx) => void
}

export function SimAction({
  label,
  description,
  badge,
  badgeColor = 'emerald',
  icon,
  onClick,
}: ActionProps) {
  const ctx = useDashboard()
  const { theme, scale } = useTheme()

  const badgeColors = {
    red: { bg: theme.accent.redDim, text: theme.accent.red },
    amber: { bg: theme.accent.amberDim, text: theme.accent.amber },
    emerald: { bg: theme.accent.greenDim, text: theme.accent.green },
    blue: { bg: theme.accent.blueDim, text: theme.accent.blue },
  }[badgeColor]

  const iconColors = {
    red: theme.accent.red,
    amber: theme.accent.amber,
    emerald: theme.accent.green,
    blue: theme.accent.blue,
  }
  const iconColor = iconColors[badgeColor]

  const IconComp = icon ? ICON_MAP[icon] : null

  return (
    <button
      onClick={() => onClick(ctx)}
      className="flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all w-full text-left"
      style={{
        border: `1px solid ${theme.bg.border}`,
        backgroundColor: theme.bg.elevated,
        color: theme.text.secondary,
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = theme.bg.hover
        e.currentTarget.style.color = theme.text.primary
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = theme.bg.elevated
        e.currentTarget.style.color = theme.text.secondary
      }}
    >
      <div className="flex items-center gap-2">
        {IconComp && <IconComp size={13} style={{ color: iconColor }} />}
        <div className="flex flex-col items-start gap-0.5">
          <span>{label}</span>
          {description && (
            <span
              className="font-normal"
              style={{ fontSize: scale.text.xxs, color: theme.text.muted }}
            >
              {description}
            </span>
          )}
        </div>
      </div>
      {badge && (
        <span
          className="px-1.5 py-0.5 rounded font-extrabold"
          style={{
            fontSize: scale.text.xxs,
            backgroundColor: badgeColors.bg,
            color: badgeColors.text,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
