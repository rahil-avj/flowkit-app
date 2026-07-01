import Tooltip from '@platform/shared/components/ui/Tooltip'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import { ChevronsLeft, ChevronsRight, Moon, Settings, Sun } from 'lucide-react'
import React from 'react'

import { SidebarContext } from './SidebarButton'
import { RAIL_W } from './sidebarConfig'

interface PanelRailProps {
  side: 'left' | 'right'
  isOpen: boolean
  onToggle: () => void
  onOpenSettings?: () => void
  children?: React.ReactNode
  hideFooter?: boolean
  footerSlot?: React.ReactNode
}

export default function Sidebar({
  side,
  isOpen,
  onToggle,
  onOpenSettings,
  children,
  hideFooter = false,
  footerSlot,
}: PanelRailProps) {
  const { theme, mode, setMode } = useTheme()

  const CollapseIcon =
    side === 'left'
      ? isOpen
        ? ChevronsLeft
        : ChevronsRight
      : isOpen
        ? ChevronsRight
        : ChevronsLeft

  const borderSide = side === 'left' ? 'borderRight' : 'borderLeft'

  // Tooltips on rail chrome open away from the rail, same as RailButtons.
  const tooltipPlacement = side === 'left' ? 'right' : 'left'

  return (
    <SidebarContext.Provider value={side}>
      <div
        className="flex flex-col items-center shrink-0 h-full"
        style={{
          width: RAIL_W,
          background: theme.bg.elevated,
          [borderSide]: `1px solid ${theme.bg.border}`,
        }}
      >
        <Tooltip
          content={isOpen ? 'Collapse' : 'Expand'}
          placement={tooltipPlacement}
          showDelay={1500}
        >
          <button
            onClick={onToggle}
            aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}
            aria-expanded={isOpen}
            className="flex items-center justify-center w-full transition-colors"
            style={{ height: 44, color: theme.text.disabled }}
            onMouseEnter={e => {
              e.currentTarget.style.color = theme.text.muted
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = theme.text.disabled
            }}
          >
            <CollapseIcon size={18} />
          </button>
        </Tooltip>

        <div style={{ height: 1, width: 28, background: theme.bg.border, marginBottom: 4 }} />

        {children}

        {footerSlot && (
          <div className="mt-auto mb-1 flex flex-col items-center w-full">{footerSlot}</div>
        )}

        {side === 'left' && !hideFooter && (
          <div className={`${footerSlot ? '' : 'mt-auto'} mb-2 flex flex-col items-center gap-1`}>
            <Tooltip
              content={mode === 'dark' ? 'Light mode' : 'Dark mode'}
              placement={tooltipPlacement}
              showDelay={1500}
            >
              <button
                onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
                aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="flex items-center justify-center rounded-[8px] transition-colors"
                style={{ width: 32, height: 32, color: theme.text.disabled }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = theme.text.muted
                  e.currentTarget.style.background = theme.bg.hover
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = theme.text.disabled
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {mode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </Tooltip>
            {onOpenSettings && (
              <Tooltip content="Settings" placement={tooltipPlacement} showDelay={1500}>
                <button
                  onClick={onOpenSettings}
                  aria-label="Open settings"
                  className="flex items-center justify-center rounded-[8px] transition-colors"
                  style={{ width: 32, height: 32, color: theme.text.disabled }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = theme.text.muted
                    e.currentTarget.style.background = theme.bg.hover
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = theme.text.disabled
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <Settings size={15} />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </SidebarContext.Provider>
  )
}
