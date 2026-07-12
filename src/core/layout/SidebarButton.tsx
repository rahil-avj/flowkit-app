import { ToolbarTooltipContent } from '@flowkit-core/canvas/ToolbarBtn'
import Tooltip from '@flowkit-shared/components/ui/Tooltip'
import React, { createContext, useContext } from 'react'

// ─── Rail side context ────────────────────────────────────────────────────────
// Sidebar sets this so SidebarButton can derive tooltip placement and indicator
// position without needing an explicit prop at every call site.

export type SidebarSide = 'left' | 'right'
export const SidebarContext = createContext<SidebarSide>('right')

// ─── SidebarButton ───────────────────────────────────────────────────────────────

export interface SidebarButtonProps {
  label: string
  icon: React.ElementType
  isActive: boolean
  badge?: number
  onClick: () => void
  indent?: boolean
  /** Active accent colour — defaults to theme green. Pass a CSS var or hex for overrides. */
  activeColor?: string
  /** Shortcut hint shown in the rich tooltip. */
  shortcut?: string
}

export default function SidebarButton({
  label,
  icon: Icon,
  isActive,
  badge,
  onClick,
  indent,
  activeColor,
  shortcut,
}: SidebarButtonProps) {
  const side = useContext(SidebarContext)

  // Tooltip opens away from the rail (towards the canvas).
  const tooltipPlacement = side === 'left' ? 'right' : 'left'

  // Active indicator sits on the edge facing the panel content.
  // Left rail  → right edge of the button (border between rail and panel).
  // Right rail → left edge of the button (border between rail and panel).

  const btn = (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center w-full transition-all duration-150 ${indent ? 'h-9' : 'h-14'}`}
      style={{ '--rail-accent': activeColor ?? 'var(--theme-accent-green)' } as React.CSSProperties}
    >
      {/* Active: filled rounded square; inactive: ghost */}
      <span
        className={`relative flex items-center justify-center rounded-lg transition-all duration-150 ${
          indent ? 'size-7' : 'size-10'
        } ${
          isActive
            ? 'bg-(--rail-accent) text-white shadow-theme-float'
            : 'bg-transparent text-theme-text-muted hover:bg-theme-hover hover:text-theme-text-secondary'
        }`}
      >
        <Icon size={indent ? 13 : 17} />
        {!!badge && (
          <span
            className="absolute -top-1 -right-1 min-w-3.5 h-3.5 rounded-full flex items-center justify-center font-black text-ui-2xs text-white"
            style={{ background: 'var(--theme-accent-red)' }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
    </button>
  )

  return (
    <Tooltip
      content={shortcut ? <ToolbarTooltipContent label={label} shortcut={shortcut} /> : label}
      placement={tooltipPlacement}
      showDelay={1500}
    >
      {btn}
    </Tooltip>
  )
}
