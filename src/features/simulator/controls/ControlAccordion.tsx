import { useDashboard } from '@platform/shared/contexts/DashboardContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import { ChevronDown } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'

import { shouldShowControl } from './helpers'

interface AccordionProps {
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
  onlyForFlow?: string | string[]
  onlyForScreen?: string | string[]
}

export function ControlAccordion({
  label,
  defaultOpen = false,
  children,
  onlyForFlow,
  onlyForScreen,
}: AccordionProps) {
  const { activeViewId, activeFlowDebugInfo } = useDashboard()
  const { theme, scale } = useTheme()
  const [open, setOpen] = useState(defaultOpen)

  if (!shouldShowControl(activeViewId, activeFlowDebugInfo, onlyForFlow, onlyForScreen)) {
    return null
  }

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden animate-fade-in min-h-fit"
      style={{ border: `1px solid ${theme.bg.border}` }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex items-center justify-between px-3 py-2.5 transition-colors"
        style={{ backgroundColor: theme.bg.elevated, color: theme.text.muted }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = theme.bg.hover
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = theme.bg.elevated
        }}
      >
        <span className="font-black" style={{ fontSize: scale.text.xxs, color: theme.text.muted }}>
          {label}
        </span>
        <ChevronDown
          size={12}
          className="transition-transform"
          style={{ color: theme.text.muted, transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2.5 p-2" style={{ backgroundColor: theme.bg.base }}>
          {children}
        </div>
      )}
    </div>
  )
}
