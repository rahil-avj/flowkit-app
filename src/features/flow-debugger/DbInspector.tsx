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

import EmptyState from '@platform/shared/components/ui/EmptyState'
import Tooltip from '@platform/shared/components/ui/Tooltip'
import { useDashboard } from '@platform/shared/contexts/DashboardContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeOf(val: unknown): 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object' {
  if (val === null) return 'null'
  if (Array.isArray(val)) return 'array'
  return typeof val as 'boolean' | 'number' | 'string' | 'object'
}

function nodeMatches(key: string, val: unknown, query: string): boolean {
  const q = query.toLowerCase()
  if (key.toLowerCase().includes(q)) return true
  if (typeof val === 'string' && val.toLowerCase().includes(q)) return true
  if (typeof val === 'number' && String(val).includes(q)) return true
  if (typeof val === 'boolean' && String(val).includes(q)) return true
  if (val !== null && typeof val === 'object') {
    return Object.entries(val as object).some(([k, v]) => nodeMatches(k, v, query))
  }
  return false
}

/** Walk a dot-path like "user.plan" and set the value on the draft. */
function setAtPath(draft: Record<string, unknown>, dotPath: string, value: unknown) {
  const parts = dotPath.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursor: any = draft
  for (let i = 0; i < parts.length - 1; i++) {
    cursor = cursor[parts[i]]
    if (cursor == null) return
  }
  cursor[parts[parts.length - 1]] = value
}

// ─── Copy hook ────────────────────────────────────────────────────────────────

function useCopyPath() {
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const copy = useCallback((path: string) => {
    navigator.clipboard.writeText(path).catch(() => {})
    setCopiedPath(path)
    setTimeout(() => setCopiedPath(null), 1500)
  }, [])
  return { copiedPath, copy }
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ val, theme }: { val: unknown; theme: ReturnType<typeof useTheme>['theme'] }) {
  const { scale } = useTheme()
  const t = typeOf(val)
  const configs = {
    boolean: { label: 'bool', bg: theme.accent.amberDim, color: theme.accent.amber },
    number: { label: 'num', bg: theme.accent.blueDim, color: theme.accent.blue },
    string: { label: 'str', bg: theme.accent.greenDim, color: theme.accent.green },
    null: { label: 'null', bg: theme.bg.hover, color: theme.text.disabled },
    array: { label: '[ ]', bg: theme.accent.purpleDim, color: theme.accent.purple },
    object: { label: '{ }', bg: theme.bg.hover, color: theme.text.muted },
  }
  const { label, bg, color } = configs[t]
  return (
    <span
      className="shrink-0 font-black px-1 py-0.5 rounded font-mono"
      style={{ fontSize: scale.text.xxs, background: bg, color }}
    >
      {label}
    </span>
  )
}

// ─── Inline value editor ──────────────────────────────────────────────────────

interface InlineEditorProps {
  val: unknown
  dotPath: string // path without "db." prefix, e.g. "user.plan"
  theme: ReturnType<typeof useTheme>['theme']
  updateDb: (updater: (db: unknown) => void) => void
}

function InlineEditor({ val, dotPath, theme, updateDb }: InlineEditorProps) {
  const { scale } = useTheme()
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
        className="flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-semibold transition-colors"
        style={{
          fontSize: scale.text.xs,
          background: val ? theme.accent.amberDim : theme.bg.hover,
          color: val ? theme.accent.amber : theme.text.muted,
          border: `1px solid ${val ? theme.accent.amber + '40' : theme.bg.border}`,
        }}
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
          className="font-mono px-1.5 rounded outline-none"
          style={{
            fontSize: scale.text.xs,
            height: 20,
            width: 100,
            background: theme.bg.elevated,
            color: theme.text.primary,
            border: `1px solid ${theme.accent.blue}`,
          }}
        />
      )
    }
    return (
      <span
        className="font-mono italic cursor-text px-1 rounded"
        style={{ fontSize: scale.text.xs, color: theme.text.disabled }}
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
  const colorVal = t === 'string' ? theme.accent.green : theme.accent.blue

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
        className="font-mono px-1.5 rounded outline-none"
        style={{
          fontSize: scale.text.xs,
          height: 20,
          width: Math.max(60, draft.length * 7 + 16),
          background: theme.bg.elevated,
          color: colorVal,
          border: `1px solid ${theme.accent.blue}`,
        }}
      />
    )
  }

  return (
    <span
      className="font-mono font-semibold truncate max-w-[160px] cursor-text rounded px-0.5 hover:underline"
      style={{ fontSize: scale.text.xs, color: colorVal }}
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
  theme: ReturnType<typeof useTheme>['theme']
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
  theme,
  copy,
  copiedPath,
  updateDb,
}: NodeProps) {
  const { scale } = useTheme()
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
      <div
        className="group flex items-center gap-1.5 py-[3px] px-1.5 rounded-md transition-colors"
        style={{ minHeight: 24 }}
        onMouseEnter={e => {
          e.currentTarget.style.background = theme.bg.hover
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        {/* Expand chevron */}
        <span
          className="shrink-0 w-3 flex items-center justify-center cursor-pointer"
          onClick={() => isExpandable && setOpen(o => !o)}
        >
          {isExpandable ? (
            <ChevronRight
              size={10}
              style={{
                color: theme.text.muted,
                transform: isExpanded ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.15s',
              }}
            />
          ) : (
            <span className="w-[10px]" />
          )}
        </span>

        {/* Key — click to copy path */}
        <span
          className="font-mono font-bold shrink-0 cursor-pointer hover:underline"
          style={{ fontSize: scale.text.xs, color: theme.text.secondary }}
          onClick={() => copy(bindPath)}
          title={`Copy bind path: ${bindPath}`}
        >
          {nodeKey}
        </span>

        {/* Type badge */}
        <TypeBadge val={val} theme={theme} />

        {/* Inline editor for primitives / null */}
        {!isExpandable && (
          <InlineEditor val={val} dotPath={dotPath} theme={theme} updateDb={updateDb} />
        )}

        {/* Summary for collapsed expandables */}
        {isExpandable && !isExpanded && (
          <span className="italic" style={{ fontSize: scale.text.xs, color: theme.text.disabled }}>
            {t === 'array'
              ? `${childCount} item${childCount !== 1 ? 's' : ''}`
              : `${childCount} key${childCount !== 1 ? 's' : ''}`}
          </span>
        )}

        {/* Copy icon — appears on key hover */}
        <span
          className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          style={{ color: isCopied ? theme.accent.green : theme.text.muted }}
          onClick={() => copy(bindPath)}
          title={`Copy: ${bindPath}`}
        >
          {isCopied ? <Check size={9} /> : <Copy size={9} />}
        </span>
      </div>

      {/* Children */}
      {isExpandable && isExpanded && (
        <div style={{ borderLeft: `1px solid ${theme.bg.border}`, marginLeft: 7 }}>
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
              theme={theme}
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
  const { theme, scale } = useTheme()
  const { updateDb } = useDashboard()
  const { copiedPath, copy } = useCopyPath()

  const [query, setQuery] = useState('')

  const rootEntries = useMemo(() => Object.entries(db), [db])

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Search + controls */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5"
        style={{ borderBottom: `1px solid ${theme.bg.border}` }}
      >
        <Search size={10} style={{ color: theme.text.muted, flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          className="flex-1 bg-transparent outline-none min-w-0"
          style={{ fontSize: scale.text.xs, color: theme.text.primary }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="shrink-0"
            style={{ fontSize: scale.text.xxs, color: theme.text.muted }}
          >
            ✕
          </button>
        )}
        <div
          className="shrink-0 flex items-center gap-0.5"
          style={{ borderLeft: `1px solid ${theme.bg.border}`, paddingLeft: 6, marginLeft: 2 }}
        >
          <Tooltip content={viewMode === 'styled' ? 'Raw JSON' : 'Tree view'} placement="left">
            <button
              onClick={() => setViewMode(viewMode === 'styled' ? 'raw' : 'styled')}
              className="p-1 rounded transition-colors"
              style={{ color: viewMode === 'raw' ? theme.accent.blue : theme.text.muted }}
              onMouseEnter={e => {
                e.currentTarget.style.color = theme.text.primary
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color =
                  viewMode === 'raw' ? theme.accent.blue : theme.text.muted
              }}
            >
              {viewMode === 'styled' ? <Code2 size={11} /> : <Layers size={11} />}
            </button>
          </Tooltip>
          {viewMode === 'styled' && (
            <Tooltip content={forceExpand ? 'Collapse all' : 'Expand all'} placement="left">
              <button
                onClick={() => setForceExpand(v => !v)}
                className="p-1 rounded transition-colors"
                style={{ color: forceExpand ? theme.accent.blue : theme.text.muted }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = theme.text.primary
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = forceExpand ? theme.accent.blue : theme.text.muted
                }}
              >
                <ChevronsUpDown size={11} />
              </button>
            </Tooltip>
          )}
          <Tooltip content="Reset database" placement="left">
            <button
              onClick={onReset}
              className="p-1 rounded transition-colors"
              style={{ color: theme.text.muted }}
              onMouseEnter={e => {
                e.currentTarget.style.color = theme.accent.red
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = theme.text.muted
              }}
            >
              <RefreshCw size={11} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto h-full">
        {viewMode === 'raw' ? (
          <pre
            className="p-3 font-mono leading-relaxed select-all whitespace-pre-wrap"
            style={{ fontSize: scale.text.xs, color: theme.text.secondary, margin: 0 }}
          >
            {JSON.stringify(db, null, 2)}
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
                theme={theme}
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
        <div
          className="px-3 py-1.5 flex gap-3"
          style={{
            fontSize: scale.text.xxs,
            color: theme.text.disabled,
            borderTop: `1px solid ${theme.bg.border}`,
            background: theme.bg.elevated,
          }}
        >
          <span>Click key → copy path</span>
          <span>Click value → edit</span>
          <span>Bool → toggle</span>
        </div>
      )}
    </div>
  )
}
