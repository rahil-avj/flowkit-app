import type { SessionExport } from './types'

// ─── Core metric types ────────────────────────────────────────────────────────

export interface ScreenMetrics {
  pageId: string
  visitCount: number
  totalDwellMs: number
  avgDwellMs: number
  tapCount: number
  frustratedClickCount: number
  entryCount: number
}

export interface FlowMetrics {
  flowId: string
  entryCount: number
  completionCount: number
  blockedCount: number
  completionRate: number // 0–1
  avgDuration: number // ms from flow.entered to flow.completed
}

export interface SessionMetrics {
  totalDuration: number
  eventCount: number
  uniqueScreensVisited: number
  flowsEntered: string[]
  flowsCompleted: string[]
  navigationBreakdown: Record<string, number>
  interactionBreakdown: Record<string, number>
  remarksCount: number
  screenMetrics: ScreenMetrics[]
  flowMetrics: FlowMetrics[]
  qualityScore: number
}

// ─── Single-session metrics ───────────────────────────────────────────────────

export function computeSessionMetrics(session: SessionExport): SessionMetrics {
  const { meta, events } = session
  const totalDuration = meta.endTime ? meta.endTime - meta.startTime : 0

  const screenVisits: Record<string, number[]> = {}
  const screenDwells: Record<string, number> = {}
  const screenTaps: Record<string, number> = {}
  const screenFrustrated: Record<string, number> = {}
  const flowsEntered = new Set<string>()
  const flowsCompleted = new Set<string>()
  const flowEntryTimes: Record<string, number[]> = {}
  const flowCompletionTimes: Record<string, number[]> = {}
  const flowBlockedSet = new Set<string>()
  const navBreakdown: Record<string, number> = {}
  const interactionBreakdown: Record<string, number> = {}

  let currentPageId = ''
  let currentScreenEnterTime = 0

  for (const ev of events) {
    if (ev.type === 'screen.visited') {
      if (currentPageId && currentScreenEnterTime > 0) {
        screenDwells[currentPageId] =
          (screenDwells[currentPageId] ?? 0) + (ev.timestamp - currentScreenEnterTime)
      }
      const sid = ev.payload.pageId as string
      currentPageId = sid
      currentScreenEnterTime = ev.timestamp
      screenVisits[sid] = screenVisits[sid] ?? []
      screenVisits[sid].push(ev.timestamp)
    } else if (ev.type === 'screen.dwell-end') {
      const sid = ev.payload.pageId as string
      const dwell = (ev.payload.dwellMs as number) ?? 0
      screenDwells[sid] = (screenDwells[sid] ?? 0) + dwell
    } else if (ev.type === 'interaction.tap' || ev.type === 'interaction.double-tap') {
      const sid = ev.payload.pageId as string
      if (sid) screenTaps[sid] = (screenTaps[sid] ?? 0) + 1
      interactionBreakdown[ev.type] = (interactionBreakdown[ev.type] ?? 0) + 1
    } else if (ev.type === 'interaction.frustrated-click') {
      const sid = ev.payload.pageId as string
      if (sid) screenFrustrated[sid] = (screenFrustrated[sid] ?? 0) + 1
      interactionBreakdown[ev.type] = (interactionBreakdown[ev.type] ?? 0) + 1
    } else if (ev.type.startsWith('interaction.')) {
      interactionBreakdown[ev.type] = (interactionBreakdown[ev.type] ?? 0) + 1
    } else if (ev.type === 'flow.entered') {
      const fid = ev.payload.flowId as string
      flowsEntered.add(fid)
      flowEntryTimes[fid] = flowEntryTimes[fid] ?? []
      flowEntryTimes[fid].push(ev.timestamp)
    } else if (ev.type === 'flow.completed') {
      const fid = ev.payload.flowId as string
      flowsCompleted.add(fid)
      flowCompletionTimes[fid] = flowCompletionTimes[fid] ?? []
      flowCompletionTimes[fid].push(ev.timestamp)
    } else if (ev.type === 'flow.blocked') {
      const fid = ev.payload.flowId as string
      flowBlockedSet.add(fid)
    } else if (ev.type.startsWith('navigation.')) {
      navBreakdown[ev.type] = (navBreakdown[ev.type] ?? 0) + 1
    }
  }

  if (currentPageId && currentScreenEnterTime > 0 && meta.endTime) {
    screenDwells[currentPageId] =
      (screenDwells[currentPageId] ?? 0) + (meta.endTime - currentScreenEnterTime)
  }

  const screenMetrics: ScreenMetrics[] = Object.keys(screenVisits).map(sid => {
    const visits = screenVisits[sid].length
    const total = screenDwells[sid] ?? 0
    return {
      pageId: sid,
      visitCount: visits,
      totalDwellMs: total,
      avgDwellMs: visits > 0 ? Math.round(total / visits) : 0,
      tapCount: screenTaps[sid] ?? 0,
      frustratedClickCount: screenFrustrated[sid] ?? 0,
      entryCount: 0,
    }
  })

  const flowMetrics: FlowMetrics[] = Array.from(flowsEntered).map(fid => {
    const entries = (flowEntryTimes[fid] ?? []).length
    const completions = (flowCompletionTimes[fid] ?? []).length
    const avgDuration = computeAvgFlowDuration(
      flowEntryTimes[fid] ?? [],
      flowCompletionTimes[fid] ?? []
    )
    return {
      flowId: fid,
      entryCount: entries,
      completionCount: completions,
      blockedCount: flowBlockedSet.has(fid) ? 1 : 0,
      completionRate: entries > 0 ? completions / entries : 0,
      avgDuration,
    }
  })

  return {
    totalDuration,
    eventCount: events.length,
    uniqueScreensVisited: Object.keys(screenVisits).length,
    flowsEntered: Array.from(flowsEntered),
    flowsCompleted: Array.from(flowsCompleted),
    navigationBreakdown: navBreakdown,
    interactionBreakdown,
    remarksCount: meta.remarks.length,
    screenMetrics,
    flowMetrics,
    qualityScore: meta.qualityScore,
  }
}

function computeAvgFlowDuration(entries: number[], completions: number[]): number {
  if (entries.length === 0 || completions.length === 0) return 0
  const pairs = Math.min(entries.length, completions.length)
  let total = 0
  for (let i = 0; i < pairs; i++) {
    total += completions[i] - entries[i]
  }
  return Math.round(total / pairs)
}
