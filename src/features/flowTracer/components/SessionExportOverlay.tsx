import { buildSessionExport } from '@flowkit-features/flowTracer/buildSessionExport'
import type { SessionExport, SessionMeta } from '@flowkit-features/flowTracer/types'
import OverlayShell from '@flowkit-shared/components/overlays/OverlayShell'
import { CheckCircle, Download, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { eventsCsvBlob, markdownSummaryBlob, metricsCsvBlob } from '../exportBlobs'

interface Props {
  sessions: SessionMeta[]
  onClose: () => void
}

type ExportState = 'form' | 'exporting' | 'done'
type ExportFormat = 'json' | 'events-csv' | 'metrics-csv' | 'markdown'

const FORMATS: { id: ExportFormat; label: string; multi: boolean }[] = [
  { id: 'json', label: 'JSON (re-import)', multi: true },
  { id: 'events-csv', label: 'Events CSV', multi: false },
  { id: 'metrics-csv', label: 'Metrics CSV', multi: true },
  { id: 'markdown', label: 'Markdown summary', multi: true },
]

async function buildExportBlob(
  metas: SessionMeta[],
  format: ExportFormat
): Promise<{ blob: Blob; ext: string }> {
  const exports: SessionExport[] = []
  for (const m of metas) exports.push(await buildSessionExport(m))

  switch (format) {
    case 'events-csv':
      return { blob: eventsCsvBlob(exports[0]), ext: '-events.csv' }
    case 'metrics-csv':
      return { blob: metricsCsvBlob(exports), ext: '-metrics.csv' }
    case 'markdown':
      return { blob: markdownSummaryBlob(exports), ext: '-report.md' }
    case 'json':
    default:
      if (exports.length === 1) {
        return {
          blob: new Blob([JSON.stringify(exports[0], null, 2)], { type: 'application/json' }),
          ext: '.flowkit-session.json',
        }
      }
      // Bundle: plain SessionExport[] — no inner stringify (avoids double-encoding)
      return {
        blob: new Blob([JSON.stringify(exports, null, 2)], { type: 'application/json' }),
        ext: '.bundle.flowkit-session.json',
      }
  }
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'session'
  )
}

export default function SessionExportOverlay({ sessions, onClose }: Props) {
  const [fileName, setFileName] = useState(
    sessions.length === 1 ? slugify(sessions[0].name) : 'flowkit-sessions-export'
  )
  const [author, setAuthor] = useState('')
  const [format, setFormat] = useState<ExportFormat>('json')
  const [minQuality, setMinQuality] = useState(0)
  const [excludeTestMode, setExcludeTestMode] = useState(false)
  const [exportState, setExportState] = useState<ExportState>('form')
  const [exportError, setExportError] = useState<string | null>(null)

  const filtered = useMemo(
    () => sessions.filter(s => s.qualityScore >= minQuality && (!excludeTestMode || !s.isTestMode)),
    [sessions, minQuality, excludeTestMode]
  )
  const availableFormats = filtered.length === 1 ? FORMATS : FORMATS.filter(f => f.multi)
  const effectiveFormat = availableFormats.some(f => f.id === format) ? format : 'json'

  const handleExport = async () => {
    if (filtered.length === 0) return
    setExportState('exporting')
    try {
      const metas = filtered.map(s => ({
        ...s,
        author: author.trim() || undefined,
      })) as SessionMeta[]
      const { blob, ext } = await buildExportBlob(metas, effectiveFormat)
      const base = slugify(
        fileName.trim() || (filtered.length === 1 ? filtered[0].name : 'flowkit-sessions-export')
      )
      const url = URL.createObjectURL(blob)
      try {
        const a = document.createElement('a')
        a.href = url
        a.download = `${base}${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } finally {
        URL.revokeObjectURL(url)
      }
      setExportState('done')
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed. Try again.')
      setExportState('form')
    }
  }

  return (
    <OverlayShell onClose={onClose} width={640}>
      {/* Header */}
      <div className="flex items-center px-3.5 pt-3 pb-2.5 border-b border-theme-border">
        <span className="flex-1 font-bold text-ui-sm text-theme-text-primary">
          Export {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onClose}
          className="bg-transparent border-none text-theme-text-muted cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-3.5 flex flex-col gap-3.5">
        {exportState === 'done' ? (
          <div className="flex flex-col items-center gap-2.5 py-3">
            <CheckCircle size={32} className="text-theme-green" />
            <span className="text-ui-sm text-theme-text-primary font-semibold">
              Export complete
            </span>
            <span className="text-ui-xs text-theme-text-muted">Your file has been downloaded</span>
            <button
              onClick={onClose}
              className="mt-1 px-4 py-1.5 rounded-md bg-theme-elevated border border-theme-border text-theme-text-secondary text-ui-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : exportState === 'exporting' ? (
          <div className="flex flex-col items-center gap-2.5 py-3">
            <span className="text-ui-sm text-theme-text-muted">Exporting…</span>
            <div className="w-full h-1 rounded-full bg-theme-elevated overflow-hidden">
              <div className="h-full bg-theme-blue rounded-full w-[40%] animate-[progress-indeterminate_1.2s_ease_infinite]" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-ui-xs text-theme-text-muted font-bold tracking-[0.06em] uppercase">
                File name
              </span>
              <input
                className="w-full bg-theme-elevated border border-theme-border rounded-md text-theme-text-primary text-ui-sm px-2.5 py-1.5 outline-none"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                placeholder="export-name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-ui-xs text-theme-text-muted font-bold tracking-[0.06em] uppercase">
                Author / recorded by
              </span>
              <input
                className="w-full bg-theme-elevated border border-theme-border rounded-md text-theme-text-primary text-ui-sm px-2.5 py-1.5 outline-none"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="Your name (optional)"
              />
            </div>

            {/* Format */}
            <div className="flex flex-col gap-1.5">
              <span className="text-ui-xs text-theme-text-muted font-bold tracking-[0.06em] uppercase">
                Format
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {availableFormats.map(f => {
                  const active = effectiveFormat === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className={[
                        'text-ui-xs px-2.5 py-1 rounded-md cursor-pointer border',
                        active
                          ? 'bg-theme-blue border-theme-blue text-white font-bold'
                          : 'bg-transparent border-theme-border text-theme-text-secondary font-medium',
                      ].join(' ')}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Filter */}
            {sessions.length > 1 && (
              <div className="flex flex-col gap-2 px-3 py-2.5 bg-theme-elevated rounded-lg">
                <span className="text-ui-xs text-theme-text-muted font-bold tracking-[0.06em] uppercase">
                  Filter
                </span>
                <label className="flex items-center gap-2 text-ui-xs text-theme-text-secondary">
                  Min quality
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={minQuality}
                    onChange={e => setMinQuality(Number(e.target.value))}
                    className="flex-1"
                    style={{ accentColor: 'var(--color-theme-blue)' }}
                  />
                  <span className="min-w-[30px] text-right tabular-nums">{minQuality}%</span>
                </label>
                <label className="flex items-center gap-1.5 text-ui-xs text-theme-text-secondary">
                  <input
                    type="checkbox"
                    checked={excludeTestMode}
                    onChange={e => setExcludeTestMode(e.target.checked)}
                    style={{ accentColor: 'var(--color-theme-blue)' }}
                  />
                  Exclude test-mode sessions
                </label>
              </div>
            )}

            {exportError && <span className="text-ui-xs text-theme-red">{exportError}</span>}
            <span
              className={`text-ui-xs ${filtered.length === 0 ? 'text-theme-red' : 'text-theme-text-muted'}`}
            >
              {filtered.length === 0
                ? 'No sessions match the filter.'
                : `${filtered.length} of ${sessions.length} session${sessions.length !== 1 ? 's' : ''} will be exported.`}
            </span>
          </>
        )}
      </div>

      {exportState === 'form' && (
        <div className="flex gap-2 justify-end px-3.5 py-2.5 border-t border-theme-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-transparent border border-theme-border text-theme-text-muted text-ui-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-theme-blue border-none text-white text-ui-xs font-bold cursor-pointer"
          >
            <Download size={12} /> Export
          </button>
        </div>
      )}
    </OverlayShell>
  )
}
