import OverlayShell from '@platform/shared/components/overlays/OverlayShell'
import EmptyState from '@platform/shared/components/ui/EmptyState'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import type { LucideIcon } from 'lucide-react'
import { Search, SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import PaletteCard from './PaletteCard'

// ── Accent colors ─────────────────────────────────────────────────────────────

export const PALETTE_ACCENT_COLORS = [
  'var(--color-theme-blue)',
  'var(--color-theme-green)',
  'var(--color-theme-purple)',
  'var(--color-theme-text-muted)',
] as const

export type PaletteAccentColor = (typeof PALETTE_ACCENT_COLORS)[number]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaletteBadge {
  label: string
  style?: 'default' | 'green' | 'blue'
}

export interface PaletteAction {
  id: string
  icon: LucideIcon
  label: string
  onClick: (item: PaletteItem, e: React.MouseEvent) => void
}

export type PaletteCardVariant = 'default' | 'compact' | 'rich'

export interface PaletteItem {
  id: string
  label: string
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  /** Rendered as <kbd> — replaces the old 'mono' badge hack */
  shortcut?: string
  badges?: PaletteBadge[]
  tags?: string[]
  /** 1–2 = inline icon buttons on hover; 3+ = auto-collapses to kebab */
  actions?: PaletteAction[]
  /** Overrides palette-level cardVariant for this item */
  variant?: PaletteCardVariant
  meta?: Record<string, unknown>
}

export interface PaletteGroup {
  id: string
  label: string
  items: PaletteItem[]
  color?: string
}

export type PaletteGroupingMode = 'flat' | 'divided' | 'headers'

export interface PaletteFilterConfig {
  kinds?: boolean
  tags?: boolean
}

export interface CommandPaletteProps {
  source: PaletteItem[] | PaletteGroup[]
  onSelect: (item: PaletteItem) => void
  onClose: () => void
  headerIcon?: LucideIcon
  placeholder?: string
  grouping?: PaletteGroupingMode
  cardVariant?: PaletteCardVariant
  filters?: PaletteFilterConfig
  /** false = bare content for BottomSheet / sidebar embedding (default: true) */
  modal?: boolean
  width?: number
  onHighlight?: (item: PaletteItem | null) => void
  onQueryChange?: (query: string) => void
  /** Last-resort custom row renderer. Palette still owns keyboard nav + click. */
  renderItem?: (item: PaletteItem, isActive: boolean) => ReactNode
}

// ── Normalise source ──────────────────────────────────────────────────────────

function toGroups(source: PaletteItem[] | PaletteGroup[]): PaletteGroup[] {
  if (source.length === 0) return []
  if ('items' in source[0]) return source as PaletteGroup[]
  return [{ id: 'default', label: '', items: source as PaletteItem[] }]
}

// ── usePaletteKeyNav ──────────────────────────────────────────────────────────

interface KeyNavOptions {
  items: PaletteItem[]
  onSelect: (item: PaletteItem) => void
  onClose: () => void
  onHighlight?: (item: PaletteItem | null) => void
  suppressEscape?: boolean
}

function usePaletteKeyNav({
  items,
  onSelect,
  onClose,
  onHighlight,
  suppressEscape,
}: KeyNavOptions) {
  const [activeIdx, setActiveIdx] = useState(0)
  const clamped = Math.min(activeIdx, Math.max(0, items.length - 1))

  const prevIdsRef = useRef('')
  useEffect(() => {
    const ids = items.map(i => i.id).join('\0')
    if (ids !== prevIdsRef.current) {
      setActiveIdx(0)
      prevIdsRef.current = ids
    }
  }, [items])

  const onHighlightRef = useRef(onHighlight)
  useEffect(() => {
    onHighlightRef.current = onHighlight
  })
  useEffect(() => {
    onHighlightRef.current?.(items[clamped] ?? null)
  }, [clamped, items])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, items.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        const item = items[clamped]
        if (item) onSelect(item)
      } else if (e.key === 'Escape' && !suppressEscape) {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items, clamped, suppressEscape, onSelect, onClose])

  return { activeIdx: clamped, setActiveIdx }
}

// ── CommandPaletteContent (bare, no shell) ────────────────────────────────────

export function CommandPaletteContent({
  source,
  onSelect,
  onClose,
  headerIcon: HeaderIcon = Search,
  placeholder = 'Search…',
  grouping = 'flat',
  cardVariant = 'default',
  filters,
  onHighlight,
  onQueryChange,
  renderItem,
}: Omit<CommandPaletteProps, 'modal' | 'width'>) {
  const { scale } = useTheme()
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeKinds, setActiveKinds] = useState<Set<string>>(new Set())
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const groups = useMemo(() => toGroups(source), [source])
  const hasFilterConfig = filters?.kinds || filters?.tags
  const hasActiveFilters = activeKinds.size > 0 || activeTags.size > 0

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return groups.map(group => {
      if (filters?.kinds && activeKinds.size > 0 && !activeKinds.has(group.id))
        return { ...group, items: [] }
      let items =
        activeTags.size === 0
          ? group.items
          : group.items.filter(item => item.tags?.some(t => activeTags.has(t)))
      if (q) {
        items = items.filter(
          item =>
            item.label.toLowerCase().includes(q) ||
            (item.subtitle?.toLowerCase().includes(q) ?? false)
        )
      }
      return { ...group, items }
    })
  }, [groups, filters, activeKinds, activeTags, query])

  const allItems = useMemo(() => filteredGroups.flatMap(g => g.items), [filteredGroups])

  const { activeIdx, setActiveIdx } = usePaletteKeyNav({
    items: allItems,
    onSelect,
    onClose,
    onHighlight,
    suppressEscape: query.length > 0,
  })

  useEffect(() => {
    const item = allItems[activeIdx]
    if (item) itemRefs.current.get(item.id)?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, allItems])

  function handleQueryChange(value: string) {
    setQuery(value)
    onQueryChange?.(value)
  }

  const allTags = useMemo(() => {
    const set = new Set<string>()
    groups.forEach(g => g.items.forEach(item => item.tags?.forEach(t => set.add(t))))
    return [...set].sort()
  }, [groups])

  function renderRow(item: PaletteItem) {
    const globalIdx = allItems.indexOf(item)
    const isActive = globalIdx === activeIdx
    const handleClick = () => {
      onSelect(item)
      onClose()
    }
    const handleEnter = () => setActiveIdx(globalIdx)

    if (renderItem) {
      return (
        <div
          key={item.id}
          ref={el => {
            if (el) itemRefs.current.set(item.id, el)
            else itemRefs.current.delete(item.id)
          }}
          onMouseEnter={handleEnter}
          onClick={handleClick}
        >
          {renderItem(item, isActive)}
        </div>
      )
    }

    return (
      <PaletteCard
        key={item.id}
        ref={el => {
          if (el) itemRefs.current.set(item.id, el)
          else itemRefs.current.delete(item.id)
        }}
        item={item}
        isActive={isActive}
        variant={cardVariant}
        onMouseEnter={handleEnter}
        onClick={handleClick}
      />
    )
  }

  const nonEmptyGroups = filteredGroups.filter(g => g.items.length > 0)

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden size-full">
      {/* Search row */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-theme-border shrink-0">
        <HeaderIcon size={15} className="text-theme-text-muted shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape' && query.length > 0) {
              e.stopPropagation()
              handleQueryChange('')
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-theme-text-primary"
        />
        {hasFilterConfig && (
          <button
            onClick={() => setFilterOpen(v => !v)}
            className="shrink-0 relative flex items-center justify-center rounded transition-colors size-6"
            style={{
              color: hasActiveFilters
                ? 'var(--color-theme-blue)'
                : filterOpen
                  ? 'var(--color-theme-text-secondary)'
                  : 'var(--color-theme-text-disabled)',
              background:
                filterOpen || hasActiveFilters ? 'var(--color-theme-hover)' : 'transparent',
            }}
            title="Filters"
          >
            <SlidersHorizontal size={13} />
            {hasActiveFilters && (
              <span
                className="absolute -top-1 -right-1 flex items-center justify-center rounded-full font-bold leading-none size-3.5"
                style={{ fontSize: 9, background: 'var(--color-theme-blue)', color: 'white' }}
              >
                {activeKinds.size + activeTags.size}
              </span>
            )}
          </button>
        )}
        <span
          className="shrink-0 px-1.5 py-0.5 rounded font-mono text-theme-text-disabled bg-theme-elevated border border-theme-border"
          style={{ fontSize: scale.text.xxs }}
          title={query.length > 0 ? 'Clear search' : 'Close'}
        >
          {query.length > 0 ? 'esc · clear' : 'esc'}
        </span>
      </div>

      {/* Filter panel */}
      {hasFilterConfig && filterOpen && (
        <div
          className="shrink-0 flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-theme-border"
          style={{ background: 'var(--color-theme-elevated)' }}
        >
          {filters?.kinds &&
            groups.map((group, i) => {
              const color = group.color ?? PALETTE_ACCENT_COLORS[i % PALETTE_ACCENT_COLORS.length]
              const isOn = activeKinds.has(group.id)
              return (
                <button
                  key={group.id}
                  onClick={() =>
                    setActiveKinds(prev => {
                      const next = new Set(prev)
                      if (next.has(group.id)) next.delete(group.id)
                      else next.add(group.id)
                      return next
                    })
                  }
                  className="flex items-center gap-1 px-2 py-1 rounded-full font-semibold transition-all"
                  style={{
                    fontSize: scale.text.xxs,
                    color: isOn ? color : 'var(--color-theme-text-muted)',
                    background: isOn
                      ? `color-mix(in srgb, ${color} 15%, transparent)`
                      : 'transparent',
                    border: `1px solid ${isOn ? color : 'var(--color-theme-border)'}`,
                  }}
                >
                  <span className="rounded-full shrink-0 size-1.5" style={{ background: color }} />
                  {group.label}
                </button>
              )
            })}
          {filters?.kinds && filters?.tags && allTags.length > 0 && (
            <span
              className="self-stretch w-px mx-0.5"
              style={{ background: 'var(--color-theme-border)' }}
            />
          )}
          {filters?.tags &&
            allTags.map(tag => {
              const isOn = activeTags.has(tag)
              return (
                <button
                  key={tag}
                  onClick={() =>
                    setActiveTags(prev => {
                      const next = new Set(prev)
                      if (next.has(tag)) next.delete(tag)
                      else next.add(tag)
                      return next
                    })
                  }
                  className="px-2 py-1 rounded-full font-mono transition-all"
                  style={{
                    fontSize: scale.text.xxs,
                    color: isOn
                      ? 'var(--color-theme-text-primary)'
                      : 'var(--color-theme-text-muted)',
                    background: isOn ? 'var(--color-theme-hover)' : 'transparent',
                    border: `1px solid ${isOn ? 'var(--color-theme-text-muted)' : 'var(--color-theme-border)'}`,
                  }}
                >
                  {tag}
                </button>
              )
            })}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setActiveKinds(new Set())
                setActiveTags(new Set())
              }}
              className="ml-auto px-2 py-1 rounded-full transition-colors"
              style={{
                fontSize: scale.text.xxs,
                color: 'var(--color-theme-text-disabled)',
                border: '1px solid var(--color-theme-border)',
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto" role="listbox">
        {allItems.length === 0 && (
          <EmptyState
            variant="panel"
            icon={<Search size={18} />}
            title="No results"
            subtitle={query.trim() ? `Nothing matched "${query.trim()}"` : undefined}
          />
        )}
        {nonEmptyGroups.map((group, i) => (
          <div key={group.id}>
            {grouping === 'headers' && (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-theme-elevated">
                <span
                  className="font-black tracking-widest uppercase text-theme-text-disabled"
                  style={{ fontSize: scale.text.xxs }}
                >
                  {group.label}
                </span>
              </div>
            )}
            {grouping === 'divided' && i > 0 && (
              <div className="mx-4 my-1 border-t border-theme-border" />
            )}
            {group.items.map(renderRow)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── CommandPalette (default export) ───────────────────────────────────────────

export default function CommandPalette({
  modal = true,
  width = 520,
  ...props
}: CommandPaletteProps) {
  if (!modal) return <CommandPaletteContent {...props} />
  return (
    <OverlayShell onClose={props.onClose} width={width}>
      <CommandPaletteContent {...props} />
    </OverlayShell>
  )
}
