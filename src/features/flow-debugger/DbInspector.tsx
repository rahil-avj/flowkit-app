/**
 * DbInspector — interactive tree view of the global mock database.
 *
 * Features:
 *   - Click any primitive value to edit it inline — writes back through updateDb
 *   - Click any key name to copy its `db.*` bind path to the clipboard
 *   - Search filters the tree to matching keys and values
 *   - Expand / collapse all toggle
 *   - Two view modes: Styled (colour-coded by type) and Raw (JSON)
 */

import EmptyState from '@flowkit-shared/components/ui/EmptyState'
import IconButton from '@flowkit-shared/components/ui/IconButton'
import Tooltip from '@flowkit-shared/components/ui/Tooltip'
import { useDashboard } from '@flowkit-shared/contexts/DashboardContext'
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  Code2,
  Copy,
  Layers,
  RefreshCw,
  Search,
  ServerOff,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useDbHighlightSettings } from './DbHighlightSettingsContext'
import { countMatches, nodeMatches, setAtPath, typeOf, useCopyPath } from './dbInspectorHelpers'

// ─── Highlighted text ─────────────────────────────────────────────────────────

/** Converts a #rrggbb hex + 0-100 opacity into an rgba() string. */
function hexToRgba(hex: string, opacityPct: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacityPct / 100})`
}

/** Renders `text` with every case-insensitive occurrence of `query` wrapped in a <mark>. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  const { highlightBg, highlightText, highlightOpacity, highlightRadius } = useDbHighlightSettings()

  if (!query) return <>{text}</>

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{
              background: hexToRgba(highlightBg, highlightOpacity),
              color: highlightText,
              borderRadius: highlightRadius,
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ val }: { val: unknown }) {
  const t = typeOf(val)
  const configs = {
    boolean: { label: 'bool', className: 'bg-theme-amber-dim text-theme-amber' },
    number: { label: 'num', className: 'bg-theme-blue-dim text-theme-blue' },
    string: { label: 'str', className: 'bg-theme-green-dim text-theme-green' },
    null: { label: 'null', className: 'bg-theme-hover text-theme-text-disabled' },
    array: { label: '[ ]', className: 'bg-theme-purple-dim text-theme-purple' },
    object: { label: '{ }', className: 'bg-theme-hover text-theme-text-muted' },
  }
  const { label, className } = configs[t]
  return (
    <span className={`shrink-0 font-black px-1 py-0.5 rounded font-mono text-ui-2xs ${className}`}>
      {label}
    </span>
  )
}

// ─── Inline value editor ──────────────────────────────────────────────────────

interface InlineEditorProps {
  val: unknown
  dotPath: string // path without "db." prefix, e.g. "user.plan"
  updateDb: (updater: (db: unknown) => void) => void
}

function InlineEditor({ val, dotPath, updateDb }: InlineEditorProps) {
  const t = typeOf(val)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = useCallback(
    (raw: string) => {
      let next: unknown = raw
      if (t === 'number') next = parseFloat(raw)
      if (t === 'null') next = null
      updateDb(db => setAtPath(db as Record<string, unknown>, dotPath, next))
      setEditing(false)
    },
    [t, dotPath, updateDb]
  )

  const cancel = () => setEditing(false)

  // Boolean — just a toggle, no text input needed
  if (t === 'boolean') {
    return (
      <button
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-semibold text-ui-xs border transition-colors ${
          val
            ? 'bg-theme-amber-dim text-theme-amber border-theme-amber/25'
            : 'bg-theme-hover text-theme-text-muted border-theme-border'
        }`}
        onClick={e => {
          e.stopPropagation()
          updateDb(db => setAtPath(db as Record<string, unknown>, dotPath, !val))
        }}
        title="Click to toggle"
      >
        {String(val)}
      </button>
    )
  }

  // null — promote to string
  if (t === 'null') {
    if (editing) {
      return (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={e => {
            if (e.key === 'Enter') commit(draft)
            if (e.key === 'Escape') cancel()
          }}
          onClick={e => e.stopPropagation()}
          placeholder="set value…"
          className="font-mono px-1.5 rounded outline-none h-5 w-25 text-ui-xs bg-theme-elevated text-theme-text-primary border border-theme-blue"
        />
      )
    }
    return (
      <span
        className="font-mono italic cursor-text px-1 rounded text-ui-xs text-theme-text-disabled"
        onClick={e => {
          e.stopPropagation()
          setDraft('')
          setEditing(true)
        }}
        title="Click to set value"
      >
        null
      </span>
    )
  }

  // String or number — inline text/number input
  const displayVal = t === 'string' ? `"${val as string}"` : String(val)
  const colorClass = t === 'string' ? 'text-theme-green' : 'text-theme-blue'

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={t === 'number' ? 'number' : 'text'}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit(draft)
          if (e.key === 'Escape') cancel()
        }}
        onClick={e => e.stopPropagation()}
        className={`font-mono px-1.5 rounded outline-none h-5 text-ui-xs bg-theme-elevated border border-theme-blue ${colorClass}`}
        style={{ width: Math.max(60, draft.length * 7 + 16) }}
      />
    )
  }

  return (
    <span
      className={`font-mono font-semibold truncate max-w-40 cursor-text rounded px-0.5 hover:underline text-ui-xs ${colorClass}`}
      title={`${displayVal} — click to edit`}
      onClick={e => {
        e.stopPropagation()
        setDraft(t === 'string' ? (val as string) : String(val))
        setEditing(true)
      }}
    >
      {displayVal}
    </span>
  )
}

// ─── Tree node ────────────────────────────────────────────────────────────────

interface NodeProps {
  nodeKey: string
  val: unknown
  bindPath: string // full bind path, e.g. "db.user.plan"
  dotPath: string // path without "db." prefix, for setAtPath writes
  depth: number
  query: string
  initialOpen: boolean
  copy: (path: string) => void
  copiedPath: string | null
  updateDb: (updater: (db: unknown) => void) => void
}

function TreeNode({
  nodeKey,
  val,
  bindPath,
  dotPath,
  depth,
  query,
  initialOpen,
  copy,
  copiedPath,
  updateDb,
}: NodeProps) {
  const t = typeOf(val)
  const isExpandable = t === 'object' || t === 'array'
  const [open, setOpen] = useState(initialOpen)
  const isCopied = copiedPath === bindPath

  const isExpanded = open

  if (query && !nodeMatches(nodeKey, val, query)) return null

  const children = isExpandable ? Object.entries(val as object) : []
  const childCount = children.length

  return (
    <div style={{ paddingLeft: depth === 0 ? 0 : 12 }}>
      <div className="group flex items-center gap-1.5 py-0.75 px-1.5 rounded-md min-h-6 transition-colors hover:bg-theme-hover">
        {/* Expand chevron */}
        <span
          className="shrink-0 w-3 flex items-center justify-center cursor-pointer"
          onClick={() => isExpandable && setOpen(o => !o)}
        >
          {isExpandable ? (
            <ChevronRight
              size={10}
              className={`text-theme-text-muted transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <span className="w-2.5" />
          )}
        </span>

        {/* Key — click to copy path */}
        <span
          className="font-mono font-bold shrink-0 cursor-pointer hover:underline text-ui-xs text-theme-text-secondary"
          onClick={() => copy(bindPath)}
          title={`Copy bind path: ${bindPath}`}
        >
          {nodeKey}
        </span>

        {/* Type badge */}
        <TypeBadge val={val} />

        {/* Inline editor for primitives / null */}
        {!isExpandable && <InlineEditor val={val} dotPath={dotPath} updateDb={updateDb} />}

        {/* Summary for collapsed expandables */}
        {isExpandable && !isExpanded && (
          <span className="italic text-ui-xs text-theme-text-disabled">
            {t === 'array'
              ? `${childCount} item${childCount !== 1 ? 's' : ''}`
              : `${childCount} key${childCount !== 1 ? 's' : ''}`}
          </span>
        )}

        {/* Copy icon — appears on key hover */}
        <span
          className={`ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${isCopied ? 'text-theme-green' : 'text-theme-text-muted'}`}
          onClick={() => copy(bindPath)}
          title={`Copy: ${bindPath}`}
        >
          {isCopied ? <Check size={9} /> : <Copy size={9} />}
        </span>
      </div>

      {/* Children */}
      {isExpandable && isExpanded && (
        <div className="border-l border-theme-border ml-1.75">
          {children.map(([k, v]) => (
            <TreeNode
              key={k}
              nodeKey={k}
              val={v}
              bindPath={`${bindPath}.${k}`}
              dotPath={`${dotPath}.${k}`}
              depth={depth + 1}
              query={query}
              initialOpen={initialOpen}
              copy={copy}
              copiedPath={copiedPath}
              updateDb={updateDb}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export type DbViewMode = 'styled' | 'raw'

interface DbInspectorProps {
  db: Record<string, unknown>
  viewMode: DbViewMode
  setViewMode: (m: DbViewMode) => void
  forceExpand: boolean
  setForceExpand: (fn: (prev: boolean) => boolean) => void
  onReset: () => void
}

export default function DbInspector({
  db,
  viewMode,
  setViewMode,
  forceExpand,
  setForceExpand,
  onReset,
}: DbInspectorProps) {
  const { updateDb } = useDashboard()
  const { copiedPath, copy } = useCopyPath()

  const [query, setQuery] = useState('')

  const rootEntries = useMemo(() => Object.entries(db), [db])
  const rawJson = useMemo(() => JSON.stringify(db, null, 2), [db])
  const matchCount = useMemo(() => countMatches(rawJson, query), [rawJson, query])

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Search + controls */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-theme-border">
        <Search size={14} className="shrink-0 text-theme-text-muted" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          className="flex-1 bg-transparent outline-none min-w-0 text-ui-xs text-theme-text-primary"
        />
        {query && (
          <span className="shrink-0 text-ui-2xs font-semibold text-theme-text-disabled">
            {matchCount} match{matchCount !== 1 ? 'es' : ''}
          </span>
        )}
        {query && (
          <button
            onClick={() => setQuery('')}
            className="shrink-0 text-ui-2xs text-theme-text-muted"
          >
            ✕
          </button>
        )}
        <div className="shrink-0 flex items-center gap-0.5 border-l border-theme-border pl-1.5 ml-0.5">
          {viewMode === 'styled' && (
            <Tooltip content={forceExpand ? 'Collapse all' : 'Expand all'} placement="bottom">
              <IconButton
                onClick={() => setForceExpand(v => !v)}
                variant="ghost"
                size="sm"
                className={forceExpand ? 'text-theme-blue hover:text-theme-blue' : ''}
                icon={<ChevronsUpDown size={11} />}
              />
            </Tooltip>
          )}
          <Tooltip content="Reset database" placement="bottom">
            <IconButton
              onClick={onReset}
              variant="ghost"
              size="sm"
              className="hover:text-theme-red"
              icon={<RefreshCw size={11} />}
            />
          </Tooltip>
          <Tooltip content={viewMode === 'styled' ? 'Raw JSON' : 'Tree view'} placement="bottom">
            <IconButton
              onClick={() => setViewMode(viewMode === 'styled' ? 'raw' : 'styled')}
              variant="ghost"
              size="sm"
              className={viewMode === 'raw' ? 'text-theme-blue hover:text-theme-blue' : ''}
              icon={viewMode === 'styled' ? <Code2 size={11} /> : <Layers size={11} />}
            />
          </Tooltip>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto h-full">
        {viewMode === 'raw' ? (
          <pre className="p-3 m-0 font-mono leading-relaxed select-text whitespace-pre-wrap text-ui-xs text-theme-text-secondary">
            <HighlightedText text={rawJson} query={query} />
          </pre>
        ) : (
          <div key={String(forceExpand)} className="p-2 flex flex-col gap-0.5">
            {rootEntries.length === 0 && (
              <EmptyState
                variant="panel"
                icon={<ServerOff size={28} />}
                title="Database is empty"
              />
            )}
            {rootEntries.map(([k, v]) => (
              <TreeNode
                key={k}
                nodeKey={k}
                val={v}
                bindPath={`db.${k}`}
                dotPath={k}
                depth={0}
                query={query}
                initialOpen={forceExpand}
                copy={copy}
                copiedPath={copiedPath}
                updateDb={updateDb}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {viewMode === 'styled' && (
        <div className="px-3 py-1.5 flex gap-3 text-ui-2xs text-theme-text-disabled border-t border-theme-border bg-theme-elevated">
          <span>Click key → copy path</span>
          <span>Click value → edit</span>
          <span>Bool → toggle</span>
        </div>
      )}
    </div>
  )
}
