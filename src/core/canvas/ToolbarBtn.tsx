import Tooltip from '@flowkit-shared/components/ui/Tooltip'
import { useTheme } from '@flowkit-shared/contexts/ThemeContext'
import { useMemo, useState } from 'react'

// ─── ToolbarTooltipContent ────────────────────────────────────────────────────

export function ToolbarTooltipContent({
  label,
  shortcut,
  hint,
}: {
  label: string
  shortcut?: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-ui-2xs text-theme-text-primary whitespace-nowrap">
          {label}
        </span>
        {shortcut && (
          <span className="text-[10px] font-semibold text-theme-text-disabled bg-theme-hover border border-theme-border rounded px-1.25 py-px tracking-wide whitespace-nowrap">
            {shortcut}
          </span>
        )}
      </div>
      {hint && (
        <span className="text-[10px] text-theme-text-secondary whitespace-nowrap font-normal">
          {hint}
        </span>
      )}
    </div>
  )
}

// ─── ToolbarBtn ───────────────────────────────────────────────────────────────

export type ToolbarBtnTint = 'default' | 'green' | 'warning' | 'amber' | 'red' | 'violet'

interface ToolbarBtnProps {
  onClick: () => void
  title: string
  tooltip?: { label: string; shortcut?: string; hint?: string }
  children: React.ReactNode
  tint?: ToolbarBtnTint
  active?: boolean
}

export function ToolbarBtn({
  onClick,
  title,
  tooltip,
  children,
  tint = 'default',
  active = false,
}: ToolbarBtnProps) {
  const { theme } = useTheme()
  const [hovered, setHovered] = useState(false)

  // Flat lookup — one entry per tint. bg/hoverBg are background when inactive;
  // activeBg overrides when active=true. color applies at all times for tinted btns.
  const TINTS = useMemo(
    (): Record<
      ToolbarBtnTint,
      { bg: string; hoverBg: string; activeBg: string; color: string; activeColor: string }
    > => ({
      default: {
        bg: 'transparent',
        hoverBg: theme.bg.hover,
        activeBg: theme.accent.blue + '20',
        color: theme.text.secondary,
        activeColor: theme.accent.blue,
      },
      green: {
        bg: 'rgba(34,197,94,0.12)',
        hoverBg: 'rgba(34,197,94,0.22)',
        activeBg: 'rgba(34,197,94,0.22)',
        color: theme.accent.green,
        activeColor: theme.accent.green,
      },
      warning: {
        bg: 'rgba(251,146,60,0.15)',
        hoverBg: 'rgba(251,146,60,0.25)',
        activeBg: 'rgba(251,146,60,0.25)',
        color: '#fb923c',
        activeColor: '#fb923c',
      },
      amber: {
        bg: 'rgba(251,191,36,0.15)',
        hoverBg: 'rgba(251,191,36,0.25)',
        activeBg: 'rgba(251,191,36,0.25)',
        color: '#fbbf24',
        activeColor: '#fbbf24',
      },
      red: {
        bg: 'rgba(239,68,68,0.12)',
        hoverBg: 'rgba(239,68,68,0.22)',
        activeBg: 'rgba(239,68,68,0.22)',
        color: '#ef4444',
        activeColor: '#ef4444',
      },
      violet: {
        bg: 'rgba(139,92,246,0.12)',
        hoverBg: 'rgba(139,92,246,0.24)',
        activeBg: 'rgb(139,92,246)',
        color: 'rgb(139,92,246)',
        activeColor: '#fff',
      },
    }),
    [theme]
  )

  const t = TINTS[tint]
  const resolvedBg = active ? t.activeBg : hovered ? t.hoverBg : t.bg
  const resolvedColor = active
    ? t.activeColor
    : hovered
      ? tint === 'default'
        ? theme.text.primary
        : t.color
      : t.color

  const btn = (
    <button
      onClick={onClick}
      title={tooltip ? undefined : title}
      style={{
        minWidth: 28,
        height: 26,
        borderRadius: 6,
        border: 'none',
        background: resolvedBg,
        color: resolvedColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s',
        padding: tint === 'green' ? '0 6px' : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  )

  if (tooltip) {
    return (
      <Tooltip content={<ToolbarTooltipContent {...tooltip} />} placement="top" showDelay={1500}>
        {btn}
      </Tooltip>
    )
  }
  return btn
}

// ─── ModeSegmentedToggle ──────────────────────────────────────────────────────

interface ModeSegmentedToggleOption {
  key: string
  icon: React.ReactNode
  tooltip: { label: string; hint?: string }
  /** Accent color applied to the icon + soft background when this segment is active. */
  accent: string
}

interface ModeSegmentedToggleProps {
  options: [ModeSegmentedToggleOption, ModeSegmentedToggleOption]
  active: string
  onChange: (key: string) => void
}

// Fixed per-segment box (width + gap) so the sliding indicator's transform can
// be computed from the active index alone — no ref measurement needed.
const SEGMENT_W = 30
const SEGMENT_GAP = 2

/**
 * Two-option segmented control for mutually-exclusive modes (e.g. FlowKit ↔
 * FlowLens). Unlike ToolbarBtn's on/off `active` toggle, both segments are
 * always visible so the current mode and the alternative are both legible at
 * a glance. A solid pill slides between segments on toggle, tinted with the
 * newly-active mode's own accent color.
 */
export function ModeSegmentedToggle({ options, active, onChange }: ModeSegmentedToggleProps) {
  const { theme } = useTheme()
  const activeIndex = Math.max(
    0,
    options.findIndex(o => o.key === active)
  )
  const activeOpt = options[activeIndex]

  return (
    <div
      className="relative flex items-center p-0.5"
      style={{ borderRadius: 8, background: theme.bg.hover, gap: SEGMENT_GAP }}
    >
      <div
        className="absolute top-0.5 left-0.5"
        style={{
          width: SEGMENT_W,
          height: 24,
          borderRadius: 6,
          background: activeOpt.accent,
          transform: `translateX(${activeIndex * (SEGMENT_W + SEGMENT_GAP)}px)`,
          transition: 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), background 0.18s',
        }}
      />
      {options.map(opt => {
        const isActive = opt.key === active
        return (
          <Tooltip
            key={opt.key}
            content={<ToolbarTooltipContent {...opt.tooltip} />}
            placement="top"
            showDelay={1500}
          >
            <button
              onClick={() => onChange(opt.key)}
              style={{
                position: 'relative',
                width: SEGMENT_W,
                height: 24,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'color 0.18s',
                color: isActive ? '#fff' : theme.text.secondary,
              }}
            >
              {opt.icon}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
