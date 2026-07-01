import { computeSessionMetrics } from './sessionMetrics'
import type { SessionExport } from './types'

// ─── Blob builders (no download side-effect) ─────────────────────────────────
// Used by SessionExportOverlay (features layer) and re-used by exportUtils (modes layer).

export function metricsCsvBlob(sessions: SessionExport[]): Blob {
  const rows: string[][] = [
    [
      'name',
      'date',
      'duration_ms',
      'screens_visited',
      'flows_entered',
      'flows_completed',
      'interactions',
      'frustrated_clicks',
      'remarks',
      'quality_score',
      'is_test_mode',
      'tags',
    ],
  ]

  for (const s of sessions) {
    const m = computeSessionMetrics(s)
    const date = new Date(s.meta.startTime).toISOString()
    const interactionCount = Object.values(m.interactionBreakdown).reduce((a, b) => a + b, 0)
    const frustratedClickCount = m.interactionBreakdown['interaction.frustrated-click'] ?? 0
    rows.push([
      q(s.meta.name),
      date,
      String(m.totalDuration),
      String(m.uniqueScreensVisited),
      String(m.flowsEntered.length),
      String(m.flowsCompleted.length),
      String(interactionCount),
      String(frustratedClickCount),
      String(s.meta.remarks.length),
      String(s.meta.qualityScore),
      String(s.meta.isTestMode),
      q(s.meta.tags.join(';')),
    ])
  }
  return new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
}

export function eventsCsvBlob(session: SessionExport): Blob {
  const rows: string[][] = [['sequenceId', 'type', 'timestamp', 'payload']]
  for (const ev of session.events) {
    rows.push([String(ev.sequenceId), ev.type, String(ev.timestamp), q(JSON.stringify(ev.payload))])
  }
  return new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
}

export function markdownSummaryBlob(sessions: SessionExport[]): Blob {
  const lines: string[] = [
    '# FlowLens Session Report',
    '',
    `Generated: ${new Date().toLocaleString()}`,
    `Sessions: ${sessions.length}`,
    '',
    '---',
    '',
  ]

  for (const s of sessions) {
    const m = computeSessionMetrics(s)
    const durationSec = Math.round(m.totalDuration / 1000)
    const interactionCount = Object.values(m.interactionBreakdown).reduce((a, b) => a + b, 0)
    const frustratedClickCount = m.interactionBreakdown['interaction.frustrated-click'] ?? 0
    lines.push(`## ${s.meta.name}`)
    lines.push('')
    lines.push(`- **Date:** ${new Date(s.meta.startTime).toLocaleString()}`)
    lines.push(`- **Duration:** ${durationSec}s`)
    lines.push(`- **Quality score:** ${s.meta.qualityScore}/100`)
    lines.push(`- **Screens visited:** ${m.uniqueScreensVisited}`)
    lines.push(
      `- **Flows entered/completed:** ${m.flowsEntered.length} / ${m.flowsCompleted.length}`
    )
    lines.push(`- **Interactions:** ${interactionCount} (${frustratedClickCount} frustrated)`)
    if (s.meta.tags.length) lines.push(`- **Tags:** ${s.meta.tags.join(', ')}`)
    if (s.meta.remarks.length) {
      lines.push('- **Remarks:**')
      s.meta.remarks.forEach(r => lines.push(`  - ${r}`))
    }
    lines.push('')

    const topScreens = [...m.screenMetrics].sort((a, b) => b.avgDwellMs - a.avgDwellMs).slice(0, 5)
    if (topScreens.length) {
      lines.push('### Top screens by avg dwell')
      lines.push('')
      for (const sm of topScreens) {
        lines.push(
          `- **${sm.screenId}**: ${Math.round(sm.avgDwellMs)}ms avg (${sm.visitCount} visit${sm.visitCount !== 1 ? 's' : ''})`
        )
      }
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  }

  return new Blob([lines.join('\n')], { type: 'text/markdown' })
}

function q(s: string): string {
  return `"${s.replace(/"/g, '""')}"`
}
