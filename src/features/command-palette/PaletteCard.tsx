import { useTheme } from '@platform/shared/contexts/ThemeContext'
import { MoreHorizontal } from 'lucide-react'
import { forwardRef, useState } from 'react'

import type { PaletteBadge, PaletteCardVariant, PaletteItem } from './CommandPalette'

// ── Badge styles ──────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<NonNullable<PaletteBadge['style']>, React.CSSProperties> = {
  default: {
    color: 'var(--color-theme-text-muted)',
    background: 'var(--color-theme-elevated)',
    border: '1px solid var(--color-theme-border)',
  },
  green: {
    color: 'var(--color-theme-green)',
    background: 'var(--color-theme-green-dim)',
    border: '1px solid var(--color-theme-green)',
  },
  blue: {
    color: 'var(--color-theme-blue)',
    background: 'var(--color-theme-blue-dim)',
    border: '1px solid var(--color-theme-blue)',
  },
}

const ACTIVE_STYLE = {
  background: 'var(--color-theme-hover)',
  boxShadow: 'inset 2px 0 0 var(--color-theme-green)',
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PaletteCardProps {
  item: PaletteItem
  isActive: boolean
  variant: PaletteCardVariant
  onClick: () => void
  onMouseEnter: () => void
}

// ── Right slot (shared across all variants) ───────────────────────────────────

function RightSlot({
  item,
  isActive,
  scale,
}: {
  item: PaletteItem
  isActive: boolean
  scale: ReturnType<typeof useTheme>['scale']
}) {
  const [kebabOpen, setKebabOpen] = useState(false)
  const hasKebab = (item.actions ?? []).length >= 3
  const inlineActions = hasKebab ? [] : (item.actions ?? []).slice(0, 2)

  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Inline action buttons — visible on hover, max 2 */}
      {isActive &&
        inlineActions.map(action => {
          const ActionIcon = action.icon
          return (
            <button
              key={action.id}
              title={action.label}
              className="flex items-center justify-center rounded transition-colors text-theme-text-disabled hover:text-theme-text-secondary hover:bg-theme-hover size-5"
              onClick={e => {
                e.stopPropagation()
                action.onClick(item, e)
              }}
            >
              <ActionIcon size={11} />
            </button>
          )
        })}

      {/* Kebab — auto when actions ≥ 3 */}
      {isActive && hasKebab && (
        <div className="relative">
          <button
            title="More actions"
            className="flex items-center justify-center rounded transition-colors text-theme-text-disabled hover:text-theme-text-secondary hover:bg-theme-hover size-5"
            onClick={e => {
              e.stopPropagation()
              setKebabOpen(v => !v)
            }}
          >
            <MoreHorizontal size={11} />
          </button>
          {kebabOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded border border-theme-border bg-theme-surface shadow-lg overflow-hidden"
              onMouseLeave={() => setKebabOpen(false)}
            >
              {(item.actions ?? []).map(action => {
                const ActionIcon = action.icon
                return (
                  <button
                    key={action.id}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm text-theme-text-secondary hover:bg-theme-hover transition-colors"
                    onClick={e => {
                      e.stopPropagation()
                      action.onClick(item, e)
                      setKebabOpen(false)
                    }}
                  >
                    <ActionIcon size={12} />
                    {action.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Shortcut hint */}
      {item.shortcut && (
        <kbd
          className="px-1.5 py-0.5 rounded font-mono text-theme-text-disabled bg-theme-elevated border border-theme-border"
          style={{ fontSize: scale.text.xxs }}
        >
          {item.shortcut}
        </kbd>
      )}

      {/* Badges */}
      {item.badges?.map((badge, i) => (
        <span
          key={i}
          className="font-bold px-1.5 py-0.5 rounded"
          style={{ fontSize: scale.text.xxs, ...BADGE_STYLES[badge.style ?? 'default'] }}
        >
          {badge.label}
        </span>
      ))}
    </div>
  )
}

// ── PaletteCard ───────────────────────────────────────────────────────────────

const PaletteCard = forwardRef<HTMLDivElement, PaletteCardProps>(function PaletteCard(
  { item, isActive, variant, onClick, onMouseEnter },
  ref
) {
  const { scale } = useTheme()
  const Icon = item.icon
  const iconColor = item.iconColor ?? 'var(--color-theme-text-muted)'
  const resolvedVariant = item.variant ?? variant
  const rowStyle = isActive ? ACTIVE_STYLE : undefined
  const labelClass = `text-sm flex-1 truncate ${isActive ? 'text-theme-text-primary' : 'text-theme-text-secondary'}`
  const rightSlot = <RightSlot item={item} isActive={isActive} scale={scale} />

  const iconSlot = (
    <span className="shrink-0 w-4 flex items-center justify-center">
      {Icon && <Icon size={12} style={{ color: iconColor }} />}
    </span>
  )

  // compact: single line, no subtitle
  if (resolvedVariant === 'compact') {
    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isActive}
        className="flex items-center gap-3 px-4 py-1.5 cursor-pointer"
        style={rowStyle}
        onMouseEnter={onMouseEnter}
        onClick={onClick}
      >
        {iconSlot}
        <span className={labelClass}>{item.label}</span>
        {rightSlot}
      </div>
    )
  }

  // rich: two lines — label + right slot on line 1, subtitle + tags on line 2
  if (resolvedVariant === 'rich') {
    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isActive}
        className="flex items-start gap-3 px-4 py-2 cursor-pointer"
        style={rowStyle}
        onMouseEnter={onMouseEnter}
        onClick={onClick}
      >
        <span className="shrink-0 w-4 flex items-center justify-center mt-0.5">
          {Icon && <Icon size={12} style={{ color: iconColor }} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={labelClass}>{item.label}</span>
            {rightSlot}
          </div>
          {item.subtitle && (
            <p className="text-theme-text-disabled mt-0.5" style={{ fontSize: scale.text.xxs }}>
              {item.subtitle}
            </p>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.tags.map(tag => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded font-mono text-theme-text-disabled bg-theme-elevated border border-theme-border"
                  style={{ fontSize: scale.text.xxs }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // default: icon + label + subtitle + right slot, single row
  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isActive}
      className="flex items-center gap-3 px-4 py-2 cursor-pointer"
      style={rowStyle}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {iconSlot}
      <span className={labelClass}>{item.label}</span>
      {item.subtitle && (
        <span
          className="shrink-0 text-theme-text-disabled truncate max-w-[140px]"
          style={{ fontSize: scale.text.xxs }}
        >
          {item.subtitle}
        </span>
      )}
      {rightSlot}
    </div>
  )
})

export default PaletteCard
