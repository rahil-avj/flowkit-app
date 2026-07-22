import type { SessionMeta } from '@flowkit-features/flowTracer/types'
import { IconButton } from '@flowkit-shared/components/ui'
import { FLOWLENS_ACCENT } from '@flowkit-shared/contexts/FlowLensModeContext'
import { Download, ScanEye, Trash2 } from 'lucide-react'
import React from 'react'

interface Props {
  session: SessionMeta
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onExportSingle: (id: string) => void
  selectMode: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
  onReplayInFlowLens?: (id: string) => void
}

function qualityDotClass(score: number) {
  if (score >= 70) return 'bg-theme-green'
  if (score >= 40) return 'bg-theme-amber'
  return 'bg-theme-red'
}

function qualityTextClass(score: number) {
  if (score >= 70) return 'text-theme-green'
  if (score >= 40) return 'text-theme-amber'
  return 'text-theme-red'
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r > 0 ? `${m}m ${r}s` : `${m}m`
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SessionCard({
  session,
  onOpen,
  onDelete,
  onExportSingle,
  selectMode,
  selected,
  onToggleSelect,
  onReplayInFlowLens,
}: Props) {
  const duration = session.endTime ? session.endTime - session.startTime : null

  return (
    <div
      onClick={() => (selectMode ? onToggleSelect(session.id) : onOpen(session.id))}
      className={[
        'px-3 py-2.5 rounded-lg bg-theme-elevated border cursor-pointer flex flex-col gap-1 transition-colors duration-120',
        selected ? 'border-theme-blue' : 'border-theme-border',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        {selectMode && (
          <input
            type="checkbox"
            readOnly
            checked={selected}
            onClick={e => {
              e.stopPropagation()
              onToggleSelect(session.id)
            }}
            className="shrink-0 cursor-pointer size-3"
            style={{ accentColor: 'var(--color-theme-blue)' }}
          />
        )}
        <div
          className={`rounded-full shrink-0 size-1.5 ${qualityDotClass(session.qualityScore)}`}
        />
        <span className="flex-1 text-ui-sm font-semibold text-theme-text-primary truncate">
          {session.name}
        </span>
        {session.isTestMode && (
          <span className="text-ui-2xs px-1.5 py-px rounded bg-theme-base text-theme-text-muted shrink-0">
            test
          </span>
        )}
        {!selectMode && (
          <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
            {onReplayInFlowLens && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<ScanEye size={11} />}
                title="Replay in FlowLens"
                onClick={() => onReplayInFlowLens(session.id)}
                style={
                  FLOWLENS_ACCENT ? ({ color: FLOWLENS_ACCENT } as React.CSSProperties) : undefined
                }
              />
            )}
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Download size={11} />}
              title="Export JSON"
              onClick={() => onExportSingle(session.id)}
            />
            <IconButton
              variant="danger"
              size="sm"
              icon={<Trash2 size={11} />}
              title="Delete"
              onClick={() => onDelete(session.id)}
            />
          </div>
        )}
      </div>

      <div className={`flex items-center gap-2.5 flex-wrap ${selectMode ? 'pl-5.25' : 'pl-3.75'}`}>
        <span className="text-ui-xs text-theme-text-muted">{formatDate(session.startTime)}</span>
        {duration !== null && (
          <span className="text-ui-xs text-theme-text-muted">{formatDuration(duration)}</span>
        )}
        <span className="text-ui-xs text-theme-text-muted">{session.eventCount} events</span>
        <span className={`text-ui-xs font-bold ${qualityTextClass(session.qualityScore)}`}>
          {session.qualityScore}%
        </span>
      </div>
    </div>
  )
}
