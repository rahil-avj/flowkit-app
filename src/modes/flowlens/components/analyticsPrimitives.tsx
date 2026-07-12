import { ArrowUpRight, ChevronDown, Download } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { FLOWLENS_ACCENT } from '../flowLensTheme'

export interface ExportItem {
  label: string
  onClick: () => void
}

/** A compact "Export ▾" dropdown — used by the right panel + reports. */
export function ExportMenu({ items, label = 'Export' }: { items: ExportItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 text-ui-2xs font-semibold text-theme-text-secondary bg-transparent border border-theme-border rounded-md py-1 px-2 cursor-pointer"
      >
        <Download size={12} /> {label} <ChevronDown size={11} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-80 min-w-45 bg-theme-elevated border border-theme-border rounded-lg py-1 shadow-theme-float"
        >
          {items.map(item => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className="block w-full text-left py-1.5 px-3 bg-transparent border-none text-theme-text-primary text-xs cursor-pointer hover:bg-theme-hover"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** A compact stat tile used across all right-panel tabs. */
export function QuickStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="bg-theme-elevated border border-theme-border rounded-lg p-[8px_10px] min-w-0">
      <div
        className="text-ui-xl font-bold tabular-nums truncate"
        style={{
          color: accent ? FLOWLENS_ACCENT : undefined,
        }}
      >
        {value}
      </div>
      <div className="text-[10px] text-theme-text-muted mt-0.5">{label}</div>
    </div>
  )
}

export function QuickStatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}

/**
 * Consistent tab body: a titled section, optional quick content, and a single
 * "View all" affordance that opens the full-screen modal. Used by every
 * right-panel tab so they share one format.
 */
export function TabBody({
  title,
  hint,
  onViewAll,
  viewAllLabel = 'View all',
  children,
}: {
  title: string
  hint?: string
  onViewAll?: () => void
  viewAllLabel?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-start gap-2 p-[12px_14px_10px] shrink-0">
        <div className="min-w-0 flex-1">
          <div className="text-ui-sm font-semibold text-theme-text-primary">{title}</div>
          {hint && <div className="text-ui-2xs text-theme-text-muted mt-0.5">{hint}</div>}
        </div>
        {onViewAll && <ViewAllButton onClick={onViewAll} label={viewAllLabel} />}
      </div>
      <div className="flex-1 overflow-auto p-[0_14px_14px] flex flex-col gap-3">{children}</div>
    </div>
  )
}

export function ViewAllButton({
  onClick,
  label = 'View all',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 shrink-0 text-ui-2xs font-semibold bg-transparent rounded-md py-1 px-2 cursor-pointer transition-colors"
      style={{
        color: FLOWLENS_ACCENT,
        border: `1px solid ${FLOWLENS_ACCENT}`,
      }}
    >
      {label} <ArrowUpRight size={12} />
    </button>
  )
}

export function MiniBarRow({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color?: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-ui-2xs">
      <span className="w-24 text-theme-text-secondary shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-theme-elevated rounded-[3px] overflow-hidden">
        <div
          className="h-full rounded-[3px]"
          style={{
            width: `${pct}%`,
            background: color ?? FLOWLENS_ACCENT,
            minWidth: value > 0 ? 2 : 0,
          }}
        />
      </div>
      <span className="w-7 text-right text-theme-text-muted tabular-nums shrink-0">{value}</span>
    </div>
  )
}

export function EmptyHint({ label }: { label: string }) {
  return <div className="text-theme-text-disabled text-ui-xs py-3 text-center">{label}</div>
}
