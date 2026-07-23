import { useTheme } from '@flowkit-shared/contexts/ThemeContext'
import { ArrowRight, ChevronDown, ChevronRight, MonitorX } from 'lucide-react'
import React, { useState } from 'react'

interface CommentGroupProps {
  pageId: string
  pageLabel: string
  pageExists: boolean
  isCurrentScreen: boolean
  isFirst?: boolean
  onNavigate: (id: string) => void
  children: React.ReactNode
}

export default function CommentGroup({
  pageId,
  pageLabel,
  pageExists,
  isCurrentScreen,
  isFirst,
  onNavigate,
  children,
}: CommentGroupProps) {
  const { theme, scale } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex flex-col">
      {/* Lightweight section separator — not a container */}
      <div
        className="flex items-center justify-between gap-2 w-full"
        style={{
          padding: `6px ${scale.space.sm}`,
          borderTop: isFirst
            ? 'none'
            : `1px solid ${pageExists ? theme.bg.border : theme.accent.amber + '44'}`,
          backgroundColor: 'transparent',
          cursor: 'pointer',
        }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span style={{ color: theme.text.disabled, flexShrink: 0 }}>
            {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
          </span>

          {!pageExists && (
            <MonitorX size={11} style={{ color: theme.accent.amber, flexShrink: 0 }} />
          )}

          <span
            className="font-semibold truncate"
            style={{
              fontSize: scale.text.xxs,
              color: pageExists ? theme.text.muted : theme.accent.amber,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {pageLabel || pageId}
          </span>

          {!pageExists && (
            <span
              className="font-bold uppercase tracking-widest shrink-0"
              style={{
                fontSize: scale.text.xxs,
                color: theme.accent.amber,
                background: theme.accent.amber + '20',
                padding: '1px 5px',
                borderRadius: scale.radius.sm,
              }}
            >
              removed
            </span>
          )}
        </div>

        {pageExists && !isCurrentScreen && (
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onNavigate(pageId)
            }}
            title={`Navigate to ${pageLabel}`}
            className="flex items-center gap-1 shrink-0"
            style={{
              fontSize: scale.text.xxs,
              fontWeight: 500,
              color: theme.text.disabled,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: scale.radius.sm,
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = theme.text.secondary)}
            onMouseLeave={e => (e.currentTarget.style.color = theme.text.disabled)}
          >
            view <ArrowRight size={9} />
          </button>
        )}
      </div>

      {/* Cards — flat, no surrounding box */}
      {!collapsed && (
        <div className="flex flex-col gap-1.5" style={{ padding: `2px ${scale.space.sm} 8px` }}>
          {children}
        </div>
      )}
    </div>
  )
}
