import { DEVICE_PRESETS } from '@platform/shared/components/devices'
import SegmentedControl from '@platform/shared/components/ui/SegmentedControl'
import Select from '@platform/shared/components/ui/Select'
import Toggle from '@platform/shared/components/ui/Toggle'
import type { DevicePreset } from '@platform/types/index'
import { ChevronDown, Search, X } from 'lucide-react'
import { useState } from 'react'

export type CanvasBg = 'theme' | 'dark' | 'light' | 'white'
export type GroupBy = 'flat' | 'flow' | 'tag' | 'project'
export type LabelField = 'label' | 'id' | 'description'

export interface FigmaExportSidebarProps {
  open: boolean

  preset: DevicePreset
  onPresetChange: (p: DevicePreset) => void

  scale: number
  onScaleChange: (v: number) => void

  canvasBg: CanvasBg
  onCanvasBgChange: (v: CanvasBg) => void

  showBorder: boolean
  onShowBorderChange: (v: boolean) => void
  showShadow: boolean
  onShowShadowChange: (v: boolean) => void
  cornerRadiusOverride: number | null
  onCornerRadiusOverrideChange: (v: number | null) => void

  showLabels: boolean
  onShowLabelsChange: (v: boolean) => void
  labelFields: LabelField[]
  onLabelFieldsChange: (v: LabelField[]) => void

  groupBy: GroupBy
  onGroupByChange: (v: GroupBy) => void

  searchQuery: string
  onSearchQueryChange: (v: string) => void
  filterFlow: string | null
  onFilterFlowChange: (v: string | null) => void
  filterTags: Set<string>
  onFilterTagsChange: (v: Set<string>) => void
  allFlows: string[]
  allTags: string[]

  onFigmaExport: () => void
}

// ─── SidebarSection ───────────────────────────────────────────────────────────

function SidebarSection({
  label,
  children,
  defaultOpen = true,
}: {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-theme-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-3 py-2 hover:bg-theme-hover transition-colors duration-120"
      >
        <span className="text-ui-2xs font-black uppercase tracking-[0.06em] text-theme-text-muted">
          {label}
        </span>
        <ChevronDown
          size={11}
          className="text-theme-text-muted transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && <div className="px-3 pb-3 pt-1 flex flex-col gap-2.5">{children}</div>}
    </div>
  )
}

// ─── SettingRow ───────────────────────────────────────────────────────────────

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-ui-xs text-theme-text-secondary font-medium shrink-0">{label}</span>
      {children}
    </div>
  )
}

// ─── FigmaIcon ────────────────────────────────────────────────────────────────

function FigmaIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 38 57"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19 28.5A9.5 9.5 0 1 1 28.5 19 9.5 9.5 0 0 1 19 28.5z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M9.5 57A9.5 9.5 0 0 0 19 47.5V38H9.5a9.5 9.5 0 0 0 0 19z"
        fill="currentColor"
        opacity="0.6"
      />
      <path d="M9.5 19H19V0H9.5a9.5 9.5 0 0 0 0 19z" fill="currentColor" opacity="0.6" />
      <path d="M19 0h9.5a9.5 9.5 0 0 1 0 19H19z" fill="currentColor" opacity="0.8" />
      <path
        d="M28.5 19A9.5 9.5 0 0 1 19 28.5V38h9.5a9.5 9.5 0 0 0 0-19z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  )
}

const PRESET_GROUPS = [
  { type: 'phone', label: 'Phones' },
  { type: 'tablet', label: 'Tablets' },
  { type: 'desktop', label: 'Desktops' },
  { type: 'wearable', label: 'Wearables' },
] as const

const BG_OPTIONS: { value: CanvasBg; label: string }[] = [
  { value: 'theme', label: 'Theme' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'white', label: 'White' },
]

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'flat', label: 'None' },
  { value: 'flow', label: 'Flow' },
  { value: 'tag', label: 'Tag' },
  { value: 'project', label: 'Project' },
]

const LABEL_FIELD_OPTIONS: { value: LabelField; label: string }[] = [
  { value: 'label', label: 'Name' },
  { value: 'id', label: 'ID' },
  { value: 'description', label: 'Description' },
]

const SIDEBAR_W = 240

export default function FigmaExportSidebar({
  open,
  preset,
  onPresetChange,
  scale,
  onScaleChange,
  canvasBg,
  onCanvasBgChange,
  showBorder,
  onShowBorderChange,
  showShadow,
  onShowShadowChange,
  cornerRadiusOverride,
  onCornerRadiusOverrideChange,
  showLabels,
  onShowLabelsChange,
  labelFields,
  onLabelFieldsChange,
  groupBy,
  onGroupByChange,
  searchQuery,
  onSearchQueryChange,
  filterFlow,
  onFilterFlowChange,
  filterTags,
  onFilterTagsChange,
  allFlows,
  allTags,
  onFigmaExport,
}: FigmaExportSidebarProps) {
  const anyFilterActive =
    searchQuery.trim().length > 0 || filterFlow !== null || filterTags.size > 0

  function toggleTag(tag: string) {
    const next = new Set(filterTags)
    if (next.has(tag)) next.delete(tag)
    else next.add(tag)
    onFilterTagsChange(next)
  }

  function toggleLabelField(field: LabelField) {
    if (labelFields.includes(field)) {
      onLabelFieldsChange(labelFields.filter(f => f !== field))
    } else {
      onLabelFieldsChange([...labelFields, field])
    }
  }

  function clearAllFilters() {
    onSearchQueryChange('')
    onFilterFlowChange(null)
    onFilterTagsChange(new Set())
  }

  if (!open) return null

  return (
    <aside
      className="flex flex-col h-full border-r border-theme-border bg-theme-elevated shrink-0 overflow-hidden"
      style={{ width: SIDEBAR_W }}
    >
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* ── Device ─────────────────────────────────────────────────────────── */}
        <SidebarSection label="Device">
          <Select
            value={preset.label}
            onChange={e => {
              const found = DEVICE_PRESETS.find(p => p.label === e.target.value)
              if (found) onPresetChange(found)
            }}
          >
            {PRESET_GROUPS.map(group => {
              const options = DEVICE_PRESETS.filter(p => p.type === group.type)
              return options.length ? (
                <optgroup key={group.type} label={group.label}>
                  {options.map(p => (
                    <option key={p.label} value={p.label}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              ) : null
            })}
          </Select>
          <p className="text-ui-2xs text-theme-text-muted font-medium">
            {preset.width} × {preset.height}px
          </p>
        </SidebarSection>

        {/* ── Scale ──────────────────────────────────────────────────────────── */}
        <SidebarSection label="Scale">
          <div className="flex items-center gap-2">
            <span className="text-ui-2xs font-bold text-theme-text-secondary min-w-[30px] text-right">
              {Math.round(scale * 100)}%
            </span>
            <input
              type="range"
              min={0.15}
              max={1}
              step={0.05}
              value={scale}
              onChange={e => onScaleChange(parseFloat(e.target.value))}
              className="flex-1"
              style={{ accentColor: 'var(--color-theme-blue)', cursor: 'pointer' }}
            />
          </div>
          <div className="flex gap-1">
            {([0.25, 0.5, 0.75, 1] as const).map(v => (
              <button
                key={v}
                onClick={() => onScaleChange(v)}
                className={[
                  'flex-1 text-[9px] font-bold py-[3px] rounded-[5px] cursor-pointer border transition-colors duration-120',
                  scale === v
                    ? 'bg-theme-blue text-white border-theme-blue'
                    : 'bg-theme-base text-theme-text-muted border-theme-border hover:text-theme-text-secondary hover:bg-theme-hover',
                ].join(' ')}
              >
                {v === 1 ? '1:1' : `${v * 100}%`}
              </button>
            ))}
          </div>
        </SidebarSection>

        {/* ── Canvas ─────────────────────────────────────────────────────────── */}
        <SidebarSection label="Canvas">
          <SegmentedControl
            value={canvasBg}
            onChange={v => onCanvasBgChange(v as CanvasBg)}
            activeColor="blue"
            options={BG_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          />
        </SidebarSection>

        {/* ── Frame ──────────────────────────────────────────────────────────── */}
        <SidebarSection label="Frame">
          <SettingRow label="Border">
            <Toggle
              size="sm"
              checked={showBorder}
              onChange={e => onShowBorderChange(e.target.checked)}
            />
          </SettingRow>
          <SettingRow label="Shadow">
            <Toggle
              size="sm"
              checked={showShadow}
              onChange={e => onShowShadowChange(e.target.checked)}
            />
          </SettingRow>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-ui-xs text-theme-text-secondary font-medium">
                Corner radius
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-ui-2xs text-theme-text-muted font-semibold w-5 text-right">
                  {cornerRadiusOverride ?? preset.cornerRadius}
                </span>
                {cornerRadiusOverride !== null && (
                  <button
                    onClick={() => onCornerRadiusOverrideChange(null)}
                    className="text-ui-2xs text-theme-blue hover:underline font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={cornerRadiusOverride ?? preset.cornerRadius}
              onChange={e => onCornerRadiusOverrideChange(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--color-theme-blue)', cursor: 'pointer' }}
            />
          </div>
        </SidebarSection>

        {/* ── Labels ─────────────────────────────────────────────────────────── */}
        <SidebarSection label="Labels">
          <SettingRow label="Show labels">
            <Toggle
              size="sm"
              checked={showLabels}
              onChange={e => onShowLabelsChange(e.target.checked)}
            />
          </SettingRow>
          {showLabels && (
            <div className="flex flex-col gap-1.5 pl-1">
              {LABEL_FIELD_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={labelFields.includes(value)}
                    onChange={() => toggleLabelField(value)}
                    className="accent-theme-blue cursor-pointer size-3"
                    style={{ accentColor: 'var(--color-theme-blue)' }}
                  />
                  <span className="text-ui-xs text-theme-text-secondary font-medium">{label}</span>
                </label>
              ))}
            </div>
          )}
        </SidebarSection>

        {/* ── Group by ───────────────────────────────────────────────────────── */}
        <SidebarSection label="Group by">
          <SegmentedControl
            value={groupBy}
            onChange={v => onGroupByChange(v as GroupBy)}
            activeColor="blue"
            options={GROUP_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          />
        </SidebarSection>

        {/* ── Filter ─────────────────────────────────────────────────────────── */}
        <SidebarSection label="Filter" defaultOpen={false}>
          {/* Search */}
          <div className="relative flex items-center">
            <Search
              size={12}
              className="absolute left-2.5 text-theme-text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search screens…"
              value={searchQuery}
              onChange={e => onSearchQueryChange(e.target.value)}
              className="w-full h-8 text-ui-sm bg-theme-base border border-theme-border rounded-[6px] text-theme-text-primary placeholder:text-theme-text-muted outline-none focus:border-theme-blue transition-[border-color] duration-150 px-7"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchQueryChange('')}
                className="absolute right-2 text-theme-text-muted hover:text-theme-text-secondary transition-colors duration-120"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Flow filter */}
          {allFlows.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-ui-2xs font-bold text-theme-text-muted uppercase tracking-wider">
                Flow
              </span>
              <Select
                value={filterFlow ?? ''}
                onChange={e => onFilterFlowChange(e.target.value || null)}
              >
                <option value="">All flows</option>
                {allFlows.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-ui-2xs font-bold text-theme-text-muted uppercase tracking-wider">
                Tags
              </span>
              <div className="flex flex-wrap gap-1">
                {allTags.map(tag => {
                  const active = filterTags.has(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={[
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors duration-120',
                        active
                          ? 'bg-theme-blue-dim text-theme-blue border-theme-blue/30'
                          : 'bg-theme-base text-theme-text-muted border-theme-border hover:border-theme-blue/30 hover:text-theme-text-secondary',
                      ].join(' ')}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Clear all */}
          {anyFilterActive && (
            <button
              onClick={clearAllFilters}
              className="text-ui-xs font-semibold text-theme-blue hover:underline text-left"
            >
              Clear all filters
            </button>
          )}
        </SidebarSection>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="mt-auto p-3 border-t border-theme-border">
          <button
            onClick={onFigmaExport}
            className="flex items-center justify-center gap-1.5 w-full text-ui-xs font-bold px-3 py-[5px] rounded-[6px] cursor-pointer bg-theme-blue-dim border border-theme-blue/25 text-theme-blue hover:bg-theme-blue/15 transition-colors duration-150"
          >
            <FigmaIcon size={12} />
            Export to Figma
          </button>
        </div>
      </div>
    </aside>
  )
}

export { SIDEBAR_W }
