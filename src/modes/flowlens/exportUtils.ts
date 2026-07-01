import {
  eventsCsvBlob,
  markdownSummaryBlob,
  metricsCsvBlob,
} from '@platform/features/flowTracer/exportBlobs'
import { SessionDb } from '@platform/features/flowTracer/sessionDb'
import type { SessionExport } from '@platform/features/flowTracer/types'

// ─── JSON import ───────────────────────────────────────────────────────────────

export async function importSessionFromFile(file: File): Promise<void> {
  const text = await file.text()
  const raw = JSON.parse(text)
  // Support both a single SessionExport and a bundle (SessionExport[])
  const list: SessionExport[] = Array.isArray(raw) ? raw : [raw]
  for (const parsed of list) {
    if (!parsed?.meta?.id || !Array.isArray(parsed.events)) {
      throw new Error('Invalid session file — missing meta.id or events array.')
    }
    await SessionDb.saveMeta(parsed.meta)
    for (const event of parsed.events) await SessionDb.saveEvent(event)
    for (const snap of parsed.snapshots ?? []) await SessionDb.saveSnapshot(snap)
    for (const sample of parsed.cursorSamples ?? []) await SessionDb.saveCursorSample(sample)
  }
}

// ─── JSON re-export ────────────────────────────────────────────────────────────

export function exportSessionJson(session: SessionExport): void {
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
  triggerDownload(blob, `${slugify(session.meta.name)}.flowkit-session.json`)
}

// ─── Re-exports (blob builders live in features/flowTracer/exportBlobs) ───────

export { eventsCsvBlob, markdownSummaryBlob, metricsCsvBlob }

// ─── CSV — metrics (download) ─────────────────────────────────────────────────

export function exportMetricsCsv(sessions: SessionExport[]): void {
  triggerDownload(metricsCsvBlob(sessions), 'flowlens-metrics.csv')
}

// ─── CSV — raw events (download) ─────────────────────────────────────────────

export function exportEventsCsv(session: SessionExport): void {
  triggerDownload(eventsCsvBlob(session), `${slugify(session.meta.name)}-events.csv`)
}

// ─── Markdown summary (download) ─────────────────────────────────────────────

export function exportMarkdownSummary(sessions: SessionExport[]): void {
  triggerDownload(markdownSummaryBlob(sessions), 'flowlens-report.md')
}

// ─── PNG chart export (canvas → PNG) ─────────────────────────────────────────

export function exportCanvasPng(canvas: HTMLCanvasElement, name = 'flowlens-chart'): void {
  canvas.toBlob(blob => {
    if (blob) triggerDownload(blob, `${name}.png`)
  }, 'image/png')
}

// ─── SVG export ───────────────────────────────────────────────────────────────

export function exportSvg(svgEl: SVGSVGElement, name = 'flowlens-chart'): void {
  const serializer = new XMLSerializer()
  const src = serializer.serializeToString(svgEl)
  const blob = new Blob([src], { type: 'image/svg+xml' })
  triggerDownload(blob, `${name}.svg`)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── Save to committed library (dev only) ────────────────────────────────────

export async function saveToLibrary(
  session: SessionExport
): Promise<{ studyId: string; filename: string }> {
  const res = await fetch('/__flowlens/save-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Save failed (HTTP ${res.status})`)
  }
  return res.json()
}
