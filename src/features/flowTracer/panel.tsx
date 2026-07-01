import { Button, EmptyState, IconButton, Input, Tag } from '@platform/shared/components/ui'
import {
  FLOWLENS_AVAILABLE,
  useFlowLensModeOptional,
} from '@platform/shared/contexts/FlowLensModeContext'
import {
  Download,
  GitMerge,
  MessageSquare,
  Pause,
  Play,
  Settings,
  Square,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { buildSessionExport } from './buildSessionExport'
import CountdownOverlay from './components/CountdownOverlay'
import SessionCard from './components/SessionCard'
import SessionExportOverlay from './components/SessionExportOverlay'
import SessionInspect from './components/SessionInspect'
import SessionSettingsOverlay from './components/SessionSettingsOverlay'
import { useSessionSettings } from './components/useSessionSettings'
import { useSessionRecorder } from './context'
import { SessionDb } from './sessionDb'
import type { SessionMeta } from './types'

type TabView = 'idle' | 'inspect'

const PUNS = [
  'Happy bug hunting 🐛',
  'May the focus be with you',
  "Don't forget to breathe",
  'Padding: 0; anxiety: 0',
  'May your clicks be intentional',
  'Type fast, tap faster',
  '404: excuses not found',
  'Ctrl+Z is not a strategy',
  'Your UX is showing 💅',
  'Ship it before you regret it',
  'Keep calm and iterate',
  'The pixels are watching',
  'No lorem ipsum was harmed',
  'Flex your layout muscles',
  'Grid gang rise up',
  'May your margins align',
  'Avoid div soup. Good luck.',
  'This session is not a test. Or is it?',
  'Z-index issues incoming',
  'Click things. Break things. Learn things.',
  'Accessibility? Always.',
  'One more sprint, they said',
  "Prototype or it didn't happen",
  'Stakeholders have entered the chat',
  'Design system loading…',
  'Your components are immaculate',
  'May your hover states hover',
  "Remember: the user is always right. They're just often confused.",
  'Deploy on a Friday, they said',
  'It worked in Figma',
  "Has it blended? Let's find out.",
  'Pixel perfection is a myth. Chase it anyway.',
  'Responsive by default. Panicked by exception.',
  'Make it pop — but tastefully',
  'The cursor is mightier than the stylus',
  'Kerning crimes are being logged',
  'Is that font licensed? Asking for a friend.',
  'Double-click energy only',
  'Stay hydrated, ship faster',
  'May your loading states be brief',
  'The backlog feared you today',
  'One component at a time',
  'Mobile first. Desktop surprised.',
  "Let's see what the users actually do",
  'Feedback loop initiated 🔁',
  'Your empathy map led you here',
  "Dark mode or light mode, you're valid either way",
  'Journey mapping? More like journey running',
  'Test early. Test often. Test now.',
  'May your session be full of insights',
]

function getRandomPun() {
  return PUNS[Math.floor(Math.random() * PUNS.length)]
}

// Runtime CSS vars — used only for the per-row dot color, which can't be a static Tailwind class.
const CATEGORY_COLORS: Record<string, string> = {
  flow: 'var(--color-theme-green)',
  screen: 'var(--color-theme-green)',
  interaction: 'var(--color-theme-blue)',
  navigation: 'var(--color-theme-purple)',
  state: 'var(--color-theme-amber)',
  simulator: 'var(--color-theme-text-muted)',
  session: 'var(--color-theme-blue)',
  panel: 'var(--color-theme-text-muted)',
  sidebar: 'var(--color-theme-text-muted)',
}

const CATEGORY_TAG_COLORS: Record<
  string,
  'blue' | 'green' | 'red' | 'amber' | 'purple' | 'neutral'
> = {
  flow: 'green',
  screen: 'green',
  interaction: 'blue',
  navigation: 'purple',
  state: 'amber',
  simulator: 'neutral',
  session: 'blue',
  panel: 'neutral',
  sidebar: 'neutral',
}

function eventColor(type: string) {
  return CATEGORY_COLORS[type.split('.')[0]] ?? 'var(--color-theme-text-muted)'
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function collapseEvents(events: { id: string; type: string }[]) {
  const rows: { type: string; count: number }[] = []
  for (const ev of events) {
    const last = rows[rows.length - 1]
    if (last && last.type === ev.type) last.count++
    else rows.push({ type: ev.type, count: 1 })
  }
  return rows
}

export default function SessionsPanel({
  onExportRequest,
}: {
  onExportRequest?: (trigger: () => void) => void
}) {
  const recorder = useSessionRecorder()
  const { settings, saveSettings, resolvedName } = useSessionSettings()
  const flowLensCtx = useFlowLensModeOptional()
  const flowLens = {
    available: FLOWLENS_AVAILABLE && !!flowLensCtx,
    enter: (opts?: { sessionId?: string }) => flowLensCtx?.enter(opts),
  }

  const [view, setView] = useState<TabView>('idle')
  const [inspectId, setInspectId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [settingsOverlay, setSettingsOverlay] = useState<'start' | 'settings' | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!onExportRequest) return
    let cancelled = false
    onExportRequest(() => {
      if (!cancelled) setSelectMode(true)
    })
    return () => {
      cancelled = true
    }
  }, [onExportRequest])

  const [exportSessions, setExportSessions] = useState<SessionMeta[] | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [remarkInput, setRemarkInput] = useState('')
  const [showRemarkInput, setShowRemarkInput] = useState(false)
  const [countdown, setCountdown] = useState<{ pun: string; startFn: () => void } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  const loadSessions = useCallback(async () => {
    const all = await SessionDb.getAllMeta()
    setSessions(all.filter(s => s.endTime).sort((a, b) => b.startTime - a.startTime))
  }, [])

  useEffect(() => {
    SessionDb.getAllMeta().then(all => {
      setSessions(all.filter(s => s.endTime).sort((a, b) => b.startTime - a.startTime))
    })
  }, [])

  // Keep recorder config in sync with persisted settings (covers mount + live changes from Settings overlay).
  useEffect(() => {
    recorder.setAutoStartOnFlow(settings.autoStartOnFlow)
    recorder.setQualityThreshold(settings.qualityThreshold)
    recorder.setCursorSamplingRateMs(settings.cursorSamplingRateMs)
    recorder.setChannels({
      effects: settings.effects,
      stateChanges: settings.stateChanges,
      simulatorChanges: settings.simulatorChanges,
      panelActivity: settings.panelActivity,
      sidebarActivity: settings.sidebarActivity,
      frustratedClicks: settings.frustratedClicks,
      hoverEvents: settings.hoverEvents,
      cursorTracking: settings.cursorTracking,
    })
  }, [settings, recorder])

  // Reload sessions list when recording stops
  const prevState = useRef(recorder.state)
  useEffect(() => {
    if (prevState.current !== 'idle' && recorder.state === 'idle') {
      loadSessions()
    }
    prevState.current = recorder.state
  }, [recorder.state, loadSessions])

  // Auto-scroll live feed
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [recorder.recentEvents, autoScroll])

  const handleStart = (s: typeof settings, remember: boolean) => {
    if (remember) saveSettings(s)
    recorder.setAutoStartOnFlow(s.autoStartOnFlow)
    recorder.setQualityThreshold(s.qualityThreshold)
    recorder.setCursorSamplingRateMs(s.cursorSamplingRateMs)
    recorder.setChannels({
      effects: s.effects,
      stateChanges: s.stateChanges,
      simulatorChanges: s.simulatorChanges,
      panelActivity: s.panelActivity,
      sidebarActivity: s.sidebarActivity,
      frustratedClicks: s.frustratedClicks,
      hoverEvents: s.hoverEvents,
      cursorTracking: s.cursorTracking,
    })
    setSettingsOverlay(null)
    setCountdown({
      pun: getRandomPun(),
      startFn: () => {
        recorder.startRecording(resolvedName(s))
        setCountdown(null)
      },
    })
  }

  const handleDelete = async (id: string) => {
    try {
      await SessionDb.deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      setSelected(prev => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
      setDeleteError(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete session.')
    }
  }

  const handleExportSingle = (id: string) => {
    const s = sessions.find(s => s.id === id)
    if (s) setExportSessions([s])
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const cancelSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
  }

  // Merge 2+ selected sessions into one new session (events + cursor samples concatenated,
  // re-sequenced). The originals are left intact.
  const handleMerge = async () => {
    const ids = [...selected]
    if (ids.length < 2) return
    const parts = (
      await Promise.all(
        ids.map(id => {
          const m = sessions.find(s => s.id === id)
          return m ? buildSessionExport(m) : null
        })
      )
    ).filter(Boolean) as Awaited<ReturnType<typeof buildSessionExport>>[]
    if (parts.length < 2) return

    const newId = crypto.randomUUID()
    let seq = 0
    const mergedEvents = parts
      .flatMap(p => p.events)
      .map(e => ({ ...e, sessionId: newId, sequenceId: ++seq }))
    // Re-sequence snapshots using the same monotonic counter (interleaved by original sequenceId)
    const mergedSnapshots = parts
      .flatMap(p => p.snapshots ?? [])
      .sort((a, b) => a.sequenceId - b.sequenceId)
      .map(s => ({ ...s, sessionId: newId, sequenceId: ++seq }))
    const mergedCursor = parts
      .flatMap(p => p.cursorSamples ?? [])
      .map(c => ({ ...c, sessionId: newId, sequenceId: ++seq }))
    const startTime = Math.min(...parts.map(p => p.meta.startTime))
    const endTime = Math.max(...parts.map(p => p.meta.endTime ?? p.meta.startTime))
    const mergedMeta: SessionMeta = {
      id: newId,
      name: `Merged · ${parts.length} sessions`,
      workspaceId: parts[0].meta.workspaceId,
      startTime,
      endTime,
      tags: [...new Set(parts.flatMap(p => p.meta.tags))],
      eventCount: mergedEvents.length,
      cursorSampleCount: mergedCursor.length,
      remarks: parts.flatMap(p => p.meta.remarks),
      qualityScore: Math.round(parts.reduce((a, p) => a + p.meta.qualityScore, 0) / parts.length),
      isTestMode: parts.every(p => p.meta.isTestMode),
      capturedScreenW: parts[0].meta.capturedScreenW,
      capturedScreenH: parts[0].meta.capturedScreenH,
    }
    await SessionDb.saveMerged(mergedMeta, mergedEvents, mergedSnapshots, mergedCursor)
    cancelSelectMode()
    loadSessions()
  }

  const submitRemark = () => {
    if (!remarkInput.trim()) return
    recorder.addRemark(remarkInput.trim())
    setRemarkInput('')
    setShowRemarkInput(false)
  }

  // ── Live recording view ───────────────────────────────────────────────────────
  if (recorder.state !== 'idle') {
    const eventCountByCategory = recorder.recentEvents.reduce(
      (acc, ev) => {
        const cat = ev.type.split('.')[0]
        acc[cat] = (acc[cat] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const remarks = recorder.recentEvents.filter(e => e.type === 'session.remark')

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Live header */}
        <div className="px-3 py-[10px] border-b border-theme-border shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="size-2 rounded-full shrink-0"
              style={{
                background:
                  recorder.state === 'recording'
                    ? 'var(--color-theme-red)'
                    : 'var(--color-theme-amber)',
                boxShadow:
                  recorder.state === 'recording'
                    ? '0 0 0 3px color-mix(in srgb, var(--color-theme-red) 20%, transparent)'
                    : 'none',
              }}
            />
            <span className="text-ui-xs text-theme-text-muted flex-1">
              {recorder.state === 'paused' ? 'Paused' : 'Recording'}
            </span>
            <span className="text-ui-sm font-bold text-theme-text-primary tabular-nums">
              {formatElapsed(recorder.elapsedMs)}
            </span>
          </div>

          {/* Current screen */}
          {recorder.currentScreenId && (
            <div className="text-ui-xs text-theme-text-muted mb-1.5">
              Screen: <span className="text-theme-text-secondary">{recorder.currentScreenId}</span>
            </div>
          )}

          {/* Event category pills */}
          <div className="flex gap-1 flex-wrap">
            {Object.entries(eventCountByCategory).map(([cat, count]) => (
              <Tag key={cat} color={CATEGORY_TAG_COLORS[cat] ?? 'neutral'}>
                {cat} {count}
              </Tag>
            ))}
          </div>
        </div>

        {/* Remarks */}
        {remarks.length > 0 && (
          <div className="px-3 py-1.5 border-b border-theme-border shrink-0">
            <span className="text-ui-xs text-theme-text-muted font-bold uppercase tracking-[0.06em]">
              Remarks
            </span>
            {remarks.map((ev, i) => (
              <div key={i} className="text-ui-xs text-theme-text-secondary mt-[3px]">
                — {ev.payload.text as string}
              </div>
            ))}
          </div>
        )}

        {/* Add remark */}
        <div className="px-3 py-1.5 border-b border-theme-border shrink-0">
          {showRemarkInput ? (
            <div className="flex gap-1.5">
              <Input
                autoFocus
                value={remarkInput}
                onChange={e => setRemarkInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitRemark()
                  if (e.key === 'Escape') {
                    setShowRemarkInput(false)
                    setRemarkInput('')
                  }
                }}
                placeholder="Add a remark…"
                containerStyle={{ flex: 1 }}
              />
              <Button variant="primary" size="xs" onClick={submitRemark}>
                Add
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="xs"
              icon={<MessageSquare size={11} />}
              onClick={() => setShowRemarkInput(true)}
            >
              Add remark
            </Button>
          )}
        </div>

        {/* Pause / Stop controls */}
        <div className="px-3 py-1.5 border-b border-theme-border shrink-0 flex gap-1.5">
          <Button
            variant="secondary"
            size="xs"
            className="flex-1"
            icon={
              recorder.state === 'paused' ? (
                <Play size={11} fill="currentColor" />
              ) : (
                <Pause size={11} />
              )
            }
            onClick={() =>
              recorder.state === 'paused' ? recorder.resumeRecording() : recorder.pauseRecording()
            }
          >
            {recorder.state === 'paused' ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="danger"
            size="xs"
            className="flex-1"
            icon={<Square size={11} fill="currentColor" />}
            onClick={() => recorder.stopRecording().catch(console.error)}
          >
            Stop & save
          </Button>
        </div>

        {/* Live event feed */}
        <div
          ref={feedRef}
          onScroll={e => {
            const el = e.currentTarget
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
            setAutoScroll(atBottom)
          }}
          className="flex-1 overflow-y-auto px-3 py-1.5"
        >
          {!autoScroll && (
            <Button
              variant="primary"
              size="xs"
              className="sticky top-1 w-full mb-1"
              onClick={() => {
                setAutoScroll(true)
                feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
              }}
            >
              ↓ Resume auto-scroll
            </Button>
          )}
          {recorder.recentEvents.length === 0 ? (
            <span className="text-ui-xs text-theme-text-muted">Waiting for events…</span>
          ) : (
            collapseEvents(recorder.recentEvents).map((row, i) => (
              <div key={i} className="flex items-center gap-[7px] py-[2px]">
                <div
                  className="size-[5px] rounded-full shrink-0"
                  style={{ background: eventColor(row.type) }}
                />
                <span className="text-ui-xs text-theme-text-secondary flex-1">{row.type}</span>
                {row.count > 1 && (
                  <span className="text-ui-2xs text-theme-text-muted bg-theme-elevated rounded px-[5px] py-px font-semibold">
                    ×{row.count}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // ── Inspect view ──────────────────────────────────────────────────────────────
  if (view === 'inspect' && inspectId) {
    return (
      <SessionInspect
        sessionId={inspectId}
        onBack={() => {
          setView('idle')
          setInspectId(null)
        }}
      />
    )
  }

  // ── Countdown overlay ─────────────────────────────────────────────────────────
  if (countdown) {
    return <CountdownOverlay pun={countdown.pun} onDone={countdown.startFn} />
  }

  // ── Idle view ─────────────────────────────────────────────────────────────────
  const selectedSessions = sessions.filter(s => selected.has(s.id))

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Settings overlay */}
      {settingsOverlay && (
        <SessionSettingsOverlay
          settings={settings}
          mode={settingsOverlay}
          onClose={() => setSettingsOverlay(null)}
          onSave={saveSettings}
          onStart={handleStart}
        />
      )}

      {/* Export overlay */}
      {exportSessions && (
        <SessionExportOverlay
          sessions={exportSessions}
          onClose={() => {
            setExportSessions(null)
            cancelSelectMode()
          }}
        />
      )}

      {/* CTA row */}
      <div className="px-3 py-[10px] border-b border-theme-border shrink-0 flex gap-2">
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          icon={<Play size={13} fill="currentColor" />}
          onClick={() => setSettingsOverlay('start')}
        >
          Start a session
        </Button>
        {sessions.length > 0 && (
          <IconButton
            variant="secondary"
            size="md"
            icon={<Upload size={14} />}
            title="Export sessions"
            onClick={() => setSelectMode(true)}
          />
        )}
        <IconButton
          variant="secondary"
          size="md"
          icon={<Settings size={14} />}
          title="Session settings"
          onClick={() => setSettingsOverlay('settings')}
        />
      </div>

      {/* Sessions list header */}
      <div className="flex items-center px-2 py-1 shrink-0">
        <span className="flex-1 text-ui-xs font-bold text-theme-text-muted uppercase tracking-[0.06em]">
          Your sessions
        </span>
      </div>

      {deleteError && (
        <div className="mx-3 mb-1.5 px-2.5 py-1.5 rounded-[6px] flex items-center gap-1.5 bg-[color-mix(in_srgb,var(--color-theme-red)_12%,transparent)] border border-[color-mix(in_srgb,var(--color-theme-red)_30%,transparent)]">
          <span className="flex-1 text-ui-xs text-theme-red">{deleteError}</span>
          <IconButton
            variant="danger"
            size="sm"
            icon={<X size={11} />}
            onClick={() => setDeleteError(null)}
          />
        </div>
      )}

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-3 pt-1 pb-3">
        {sessions.length === 0 ? (
          <EmptyState
            variant="panel"
            icon={<Play size={28} />}
            title="No sessions yet"
            subtitle="Your recorded sessions will appear here"
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {sessions.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                onOpen={id => {
                  setInspectId(id)
                  setView('inspect')
                }}
                onDelete={handleDelete}
                onExportSingle={handleExportSingle}
                selectMode={selectMode}
                selected={selected.has(s.id)}
                onToggleSelect={toggleSelect}
                onReplayInFlowLens={
                  flowLens.available ? id => flowLens.enter({ sessionId: id }) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Select mode footer */}
      {selectMode && (
        <div className="shrink-0 px-3 py-2 border-t border-theme-border flex items-center gap-2 bg-theme-surface">
          <span className="flex-1 text-ui-xs text-theme-text-muted">{selected.size} selected</span>
          <Button variant="secondary" size="xs" onClick={cancelSelectMode}>
            Cancel
          </Button>
          <Button
            variant="ghost"
            size="xs"
            icon={<GitMerge size={11} />}
            disabled={selected.size < 2}
            title="Merge selected sessions into one"
            onClick={handleMerge}
          >
            Merge
          </Button>
          <Button
            variant="primary"
            size="xs"
            icon={<Download size={11} />}
            disabled={selected.size === 0}
            onClick={() => selected.size > 0 && setExportSessions(selectedSessions)}
          >
            Export {selected.size > 0 ? selected.size : ''}
          </Button>
        </div>
      )}
    </div>
  )
}
