import { Z } from '@platform/shared/constants/zIndex'
import { SlidersHorizontal, X } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import Button from './Button'
import Checkbox from './Checkbox'
import Radio from './Radio'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FilterOption {
  value: string
  label: string
  description?: string
}

export interface FilterGroupMulti {
  key: string
  label: string
  type: 'multi'
  options: FilterOption[]
}

export interface FilterGroupSingle {
  key: string
  label: string
  type: 'single'
  /** One of the option values can be the "no filter" sentinel — set via `noneValue`. */
  noneValue?: string
  options: FilterOption[]
}

export type FilterGroup = FilterGroupMulti | FilterGroupSingle

/** The full filter state: for multi → Set<string>; for single → string | null */
export type FilterValue = Set<string> | string | null

export type FilterState = Record<string, FilterValue>

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Count how many groups have an active (non-empty / non-null) selection. */
export function countActiveGroups(state: FilterState, groups: FilterGroup[]): number {
  return groups.reduce((n, g) => {
    const v = state[g.key]
    if (g.type === 'multi') return n + (v instanceof Set && v.size > 0 ? 1 : 0)
    // single: active when value is set and ≠ noneValue
    const noneVal = (g as FilterGroupSingle).noneValue ?? null
    return n + (v && v !== noneVal ? 1 : 0)
  }, 0)
}

/** Build a default (empty) FilterState from a group list. */
export function buildDefaultFilterState(groups: FilterGroup[]): FilterState {
  const state: FilterState = {}
  for (const g of groups) {
    if (g.type === 'multi') state[g.key] = new Set<string>()
    else state[g.key] = (g as FilterGroupSingle).noneValue ?? null
  }
  return state
}

// ── FilterPanel ───────────────────────────────────────────────────────────────

interface FilterPanelProps {
  groups: FilterGroup[]
  value: FilterState
  onChange: (next: FilterState) => void
  /** Label shown on the trigger button. Defaults to "Filter". */
  label?: string
  /** Disable the trigger (e.g. no options available). */
  disabled?: boolean
  /** Width of the panel. Defaults to 220. */
  panelWidth?: number
}

export default function FilterPanel({
  groups,
  value,
  onChange,
  label = 'Filter',
  disabled,
  panelWidth = 220,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const activeCount = countActiveGroups(value, groups)

  const computeCoords = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    // Right-align the panel to the trigger button.
    setCoords({
      top: rect.bottom + window.scrollY + 6,
      left: rect.right + window.scrollX - panelWidth,
    })
  }, [panelWidth])

  function handleTrigger(e: React.MouseEvent) {
    e.stopPropagation()
    if (disabled) return
    if (!open) computeCoords()
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      )
        setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', computeCoords)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', computeCoords)
    }
  }, [open, computeCoords])

  function clearAll() {
    const next: FilterState = {}
    for (const g of groups) {
      if (g.type === 'multi') next[g.key] = new Set<string>()
      else next[g.key] = (g as FilterGroupSingle).noneValue ?? null
    }
    onChange(next)
  }

  function toggleMulti(groupKey: string, optionValue: string) {
    const current = (value[groupKey] as Set<string>) ?? new Set<string>()
    const next = new Set(current)
    if (next.has(optionValue)) next.delete(optionValue)
    else next.add(optionValue)
    onChange({ ...value, [groupKey]: next })
  }

  function setSingle(groupKey: string, optionValue: string) {
    onChange({ ...value, [groupKey]: optionValue })
  }

  const isActive = activeCount > 0

  return (
    <>
      {/* Trigger */}
      <div ref={triggerRef} className="shrink-0">
        <Button
          onClick={handleTrigger}
          disabled={disabled}
          variant={isActive ? 'accent' : 'secondary'}
          size="sm"
          title={label}
          className="whitespace-nowrap"
        >
          <SlidersHorizontal size={12} />
          {isActive && (
            <span className="flex items-center justify-center font-black rounded-full bg-theme-blue text-black ml-0.5 min-w-4 h-4 text-[10px]">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {/* Panel portal */}
      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            className="absolute bg-theme-surface border border-theme-border rounded-[10px] shadow-theme-float overflow-hidden"
            style={{
              top: coords.top,
              left: coords.left,
              width: panelWidth,
              zIndex: Z.overlay,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-theme-border">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal size={12} className="text-theme-text-muted" />
                <span className="text-ui-2xs font-black tracking-widest uppercase text-theme-text-muted">
                  Filters
                </span>
              </div>
              {isActive && (
                <Button variant="ghost" size="xs" onClick={clearAll} className="text-theme-blue">
                  <X size={10} />
                  Clear all
                </Button>
              )}
            </div>

            {/* Groups */}
            <div className="overflow-y-auto max-h-[360px]">
              {groups.map((group, gi) => (
                <div key={group.key}>
                  {gi > 0 && <div className="h-px bg-theme-border mx-3" />}
                  <div className="px-3 py-2.5 flex flex-col gap-2">
                    {/* Group heading */}
                    <span className="text-ui-2xs font-black tracking-widest uppercase text-theme-text-muted">
                      {group.label}
                    </span>

                    {/* Options */}
                    {group.type === 'multi' && (
                      <div className="flex flex-col gap-2">
                        {group.options.map(opt => {
                          const checked = ((value[group.key] as Set<string>) ?? new Set()).has(
                            opt.value
                          )
                          return (
                            <Checkbox
                              key={opt.value}
                              label={opt.label}
                              description={opt.description}
                              checked={checked}
                              onChange={() => toggleMulti(group.key, opt.value)}
                            />
                          )
                        })}
                      </div>
                    )}

                    {group.type === 'single' && (
                      <div className="flex flex-col gap-2">
                        {group.options.map(opt => {
                          const checked =
                            (value[group.key] ?? group.noneValue ?? null) === opt.value
                          return (
                            <Radio
                              key={opt.value}
                              name={group.key}
                              value={opt.value}
                              label={opt.label}
                              description={opt.description}
                              checked={checked}
                              onChange={() => setSingle(group.key, opt.value)}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
