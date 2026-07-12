import React from 'react'

import { useTheme } from '../../contexts/ThemeContext'

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveColor = 'green' | 'blue' | 'amber' | 'red' | 'purple'

interface SegmentedControlProps {
  value: string
  onChange: (value: string) => void
  activeColor?: ActiveColor
  disabled?: boolean
  style?: React.CSSProperties
  children?: React.ReactNode
  // Legacy flat-options API — kept for backward compat
  options?: readonly string[] | string[] | SegmentedOption[]
}

// Legacy flat option shape
export interface SegmentedOption {
  value: string
  label: string
  icon?: React.ReactNode
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface SegCtx {
  value: string
  onChange: (v: string) => void
  accent: string
  theme: ReturnType<typeof useTheme>['theme']
}

const SegCtx = React.createContext<SegCtx | null>(null)

function useSegCtx() {
  const ctx = React.useContext(SegCtx)
  if (!ctx) throw new Error('<Segment> must be used inside <SegmentedControl>')
  return ctx
}

// ─── Segment sub-component ────────────────────────────────────────────────────

interface SegmentProps {
  value: string
  children: React.ReactNode
  title?: string
  /** icon stacked above label (default when icon + label both present) */
  iconTop?: boolean
  /** icon to the left of label */
  iconLeft?: boolean
  /** icon to the right of label */
  iconRight?: boolean
}

function Segment({ value, children, title, iconTop, iconLeft, iconRight }: SegmentProps) {
  const { value: activeValue, onChange, accent, theme } = useSegCtx()
  const isActive = activeValue === value

  const kids = React.Children.toArray(children)
  const iconEl = kids.find(
    c => React.isValidElement(c) && (c.type as { __isSegmentIcon?: boolean }).__isSegmentIcon
  )
  const labelEl = kids.find(
    c => React.isValidElement(c) && (c.type as { __isSegmentLabel?: boolean }).__isSegmentLabel
  )
  // If no explicit Icon/Label wrappers, treat all children as label content
  const rawContent = !iconEl && !labelEl ? children : null

  const hasIcon = !!iconEl
  const hasLabel = !!labelEl || !!rawContent

  let flexDir: React.CSSProperties['flexDirection'] = 'row'
  let gap = 4

  if (hasIcon && hasLabel) {
    if (iconLeft) {
      flexDir = 'row'
      gap = 4
    } else if (iconRight) {
      flexDir = 'row-reverse'
      gap = 4
    } else {
      flexDir = 'column'
      gap = 2
    } // default: icon top
    if (iconTop) {
      flexDir = 'column'
      gap = 2
    }
  }

  return (
    <button
      onClick={() => onChange(value)}
      title={title}
      className="flex-1 min-w-0 rounded-md text-[10px] font-bold cursor-pointer border-none transition-all duration-150 ease-[ease] flex items-center justify-center"
      style={{
        padding: hasIcon && !hasLabel ? '6px' : '6px 10px',
        backgroundColor: isActive ? accent : 'transparent',
        color: isActive ? '#ffffff' : theme.text.muted,
        boxShadow: isActive ? theme.shadow.card : 'none',
        flexDirection: flexDir,
        gap,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.color = theme.text.primary
          e.currentTarget.style.backgroundColor = theme.bg.hover
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.color = theme.text.muted
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
    >
      {rawContent ?? (
        <>
          {iconEl}
          {labelEl}
        </>
      )}
    </button>
  )
}

// ─── Icon / Label slot markers ────────────────────────────────────────────────

function SegmentIcon({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
SegmentIcon.__isSegmentIcon = true

function SegmentLabel({ children }: { children: React.ReactNode }) {
  return <span className="truncate min-w-0">{children}</span>
}
SegmentLabel.__isSegmentLabel = true

// ─── Main component ───────────────────────────────────────────────────────────

function SegmentedControl({
  value,
  onChange,
  activeColor = 'green',
  disabled,
  style,
  children,
  options,
}: SegmentedControlProps) {
  const { theme } = useTheme()
  const accent = theme.accent[activeColor]

  // Legacy flat-options API: render Segments automatically
  const resolvedChildren = options
    ? (options as (string | SegmentedOption)[]).map(raw => {
        const {
          value: v,
          label,
          icon,
        } = typeof raw === 'string' ? { value: raw, label: raw, icon: undefined } : raw
        return (
          <Segment key={v} value={v}>
            {icon && <SegmentIcon>{icon}</SegmentIcon>}
            <SegmentLabel>{label}</SegmentLabel>
          </Segment>
        )
      })
    : children

  return (
    <SegCtx.Provider value={{ value, onChange, accent, theme }}>
      <div
        className="flex gap-0.5 p-0.5 bg-theme-surface border border-theme-border rounded-lg"
        style={{
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
          ...style,
        }}
      >
        {resolvedChildren}
      </div>
    </SegCtx.Provider>
  )
}

// Attach sub-components
SegmentedControl.Segment = Segment
SegmentedControl.Icon = SegmentIcon
SegmentedControl.Label = SegmentLabel

export default SegmentedControl
