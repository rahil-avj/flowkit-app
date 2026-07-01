import type { PanelDragHandle } from '@platform/core/layout/hooks/usePanelDrag'
import PanelFrame from '@platform/core/layout/PanelFrame'
import { useFlowLensPanelShortcuts } from '@platform/core/shortcuts/useKeyboardShortcuts'
import type { SessionExport } from '@platform/features/flowTracer/types'
import { useActiveWorkspace } from '@platform/shared/contexts/ActiveWorkspaceContext'
import { useDashboard } from '@platform/shared/contexts/DashboardContext'
import { useFlowLensMode } from '@platform/shared/contexts/FlowLensModeContext'
import type { WireframeView } from '@platform/types/index'
import { workspaces } from '@platform/workspaces'
import { ChevronDown, FileText } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FLOWLENS_ACCENT } from '../flowLensTheme'
import { replayFromSnapshot } from '../replayState'
import { type LibraryEntry, useSessionLibrary } from '../useSessionLibrary'
import CursorGhost from './CursorGhost'
import FlowLensAnalyticsOverlays, { type FlowLensOverlay } from './FlowLensAnalyticsOverlays'
import LensSideExplorer from './LensSideExplorer'
import LensSideInspector, { type SessionTab } from './LensSideInspector'
import PlaybackBar from './PlaybackBar'
import ReplayController from './ReplayController'
import ReportsOverlay from './reports/ReportsOverlay'

interface Props {
  views: WireframeView[]
  effectiveLeftW: number
  effectiveRightW: number
  leftOpen: boolean
  rightOpen: boolean
  setLeftOpen: (v: boolean) => void
  setRightOpen: (v: boolean) => void
  leftHandle: PanelDragHandle
  rightHandle: PanelDragHandle
}

/**
 * Lazy default export — the entire FlowLens mode UI: sessions list (left),
 * the live canvas (middle), tabbed session info (right), playback (bottom).
 * Drives the SHARED DashboardContext via ReplayController so replay reuses the
 * real screens. Space-hungry analytics open full-screen from each tab's "View all".
 */
export default function FlowLensMode({
  views,
  effectiveLeftW,
  effectiveRightW,
  leftOpen,
  rightOpen,
  setLeftOpen,
  setRightOpen,
  leftHandle,
  rightHandle,
}: Props) {
  const { selectedSession, selectSession, pendingSessionId, consumePendingSessionId } =
    useFlowLensMode()
  const activeWorkspaceForLib = useActiveWorkspace()
  const { entries, loading, reload } = useSessionLibrary(activeWorkspaceForLib)

  const [currentSequenceId, setCurrentSequenceId] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [overlay, setOverlay] = useState<FlowLensOverlay>(null)
  const [reportsOpen, setReportsOpen] = useState(false)
  const [tab, setTab] = useState<SessionTab>('overview')

  useFlowLensPanelShortcuts({
    tab,
    setTab: t => setTab(t as SessionTab),
    setOpen: setRightOpen,
    hasCursorSamples: (selectedSession?.cursorSamples?.length ?? 0) > 0,
  })

  const [reportsSummary, setReportsSummary] = useState<{
    sessions: number
    completionRate: number
    avgQuality: number
  } | null>(null)

  // ── Pre-select a session from a SessionCard ("Replay in FlowLens") ───────────
  useEffect(() => {
    if (!pendingSessionId) return
    const entry = entries.find(e => e.meta.id === pendingSessionId)
    if (!entry) return // not loaded yet
    consumePendingSessionId()
    let cancelled = false
    entry
      .load()
      .then(s => {
        if (!cancelled) {
          setCurrentSequenceId(s.events[0]?.sequenceId ?? 0)
          selectSession(s)
          setTab('overview')
        }
      })
      .catch(err => {
        console.error('Failed to load pending session in FlowLens:', err)
      })
    return () => {
      cancelled = true
    }
  }, [entries, pendingSessionId, consumePendingSessionId, selectSession])

  // ── Lightweight reports summary for the right panel (no session selected) ────
  useEffect(() => {
    if (selectedSession) return // only needed for the reports quick view
    let cancelled = false
    Promise.all(entries.map(e => e.load()))
      .then(sessions => {
        if (cancelled) return
        const n = sessions.length
        const done = sessions.filter(s => s.events.some(e => e.type === 'flow.completed')).length
        const avgQ = n
          ? Math.round(sessions.reduce((sum, s) => sum + s.meta.qualityScore, 0) / n)
          : 0
        setReportsSummary({ sessions: n, completionRate: n ? done / n : 0, avgQuality: avgQ })
      })
      .catch(err => {
        console.error('Failed to load reports summary sessions:', err)
      })
    return () => {
      cancelled = true
    }
  }, [entries, selectedSession])

  const handleSelect = useCallback(
    async (entry: LibraryEntry) => {
      try {
        const session = await entry.load()
        setCurrentSequenceId(session.events[0]?.sequenceId ?? 0)
        setIsPlaying(false)
        setOverlay(null)
        setTab('overview')
        selectSession(session)
      } catch (err) {
        console.error('Failed to select session in FlowLens:', err)
      }
    },
    [selectSession]
  )

  // Tag edits etc. — update the in-memory selected session + refresh the list.
  const handleSessionMetaChanged = useCallback(
    (s: SessionExport) => {
      selectSession(s)
      reload()
    },
    [selectSession, reload]
  )

  const seek = useCallback((seq: number) => {
    setIsPlaying(false)
    setCurrentSequenceId(seq)
  }, [])
  const advance = useCallback((seq: number) => {
    setCurrentSequenceId(seq)
  }, [])

  // ── Cross-workspace validation ───────────────────────────────────────────────
  const validScreenIds = useMemo(() => new Set(views.map(v => v.id)), [views])
  const replayDisabledReason = useMemo(() => {
    if (!selectedSession) return null
    const screenIds = selectedSession.events
      .map(e => (e.payload.screenId ?? e.payload.to) as string | undefined)
      .filter((x): x is string => typeof x === 'string')
    if (screenIds.length === 0) return null
    const known = screenIds.filter(id => validScreenIds.has(id))
    if (known.length === 0)
      return 'Recorded against a different workspace — replay is disabled, but analytics are available.'
    return null
  }, [selectedSession, validScreenIds])

  const replayEnabled = !!selectedSession && !replayDisabledReason
  const activeScreenId = useMemo(
    () =>
      selectedSession ? replayFromSnapshot(selectedSession, currentSequenceId).activeScreenId : '',
    [selectedSession, currentSequenceId]
  )
  const hasCursor = (selectedSession?.cursorSamples?.length ?? 0) > 0

  return (
    <>
      {/* Drive the shared DashboardContext (only when replay is valid). */}
      {replayEnabled && (
        <ReplayController
          key={selectedSession!.meta.id}
          session={selectedSession!}
          currentSequenceId={currentSequenceId}
        />
      )}
      {replayEnabled && hasCursor && (
        <CursorGhost
          session={selectedSession!}
          currentSequenceId={currentSequenceId}
          activeScreenId={activeScreenId}
          accent={FLOWLENS_ACCENT}
        />
      )}

      {/* ── Left panel: rail + sessions list ── */}
      <PanelFrame
        side="left"
        width={effectiveLeftW}
        handle={leftHandle}
        isOpen={leftOpen}
        accentColor={FLOWLENS_ACCENT}
        className="z-30 shadow-theme-float pointer-events-auto"
      >
        <WorkspaceBar />
        <div className="flex flex-1 min-h-0">
          <LensSideExplorer
            entries={entries}
            loading={loading}
            selectedId={selectedSession?.meta.id ?? null}
            onSelect={handleSelect}
            onImported={reload}
            onSaved={reload}
            isOpen={leftOpen}
            onOpenChange={setLeftOpen}
          />
        </div>
      </PanelFrame>

      {/* ── Right panel: rail + tabbed session info / reports ── */}
      <PanelFrame
        side="right"
        width={effectiveRightW}
        handle={rightHandle}
        accentColor={FLOWLENS_ACCENT}
        className="z-30 shadow-theme-float pointer-events-auto"
      >
        <LensSideInspector
          selectedSession={selectedSession}
          currentSequenceId={currentSequenceId}
          tab={tab}
          setTab={setTab}
          onSeek={seek}
          onViewAll={(o: Exclude<typeof overlay, null>) => setOverlay(o)}
          onOpenReports={() => setReportsOpen(true)}
          replayDisabledReason={replayDisabledReason}
          onSessionMetaChanged={handleSessionMetaChanged}
          reportsSummary={reportsSummary}
          isOpen={rightOpen}
          onOpenChange={setRightOpen}
        />
      </PanelFrame>

      {/* ── Playback bar (between the panels, only when replay drives the canvas) ── */}
      {replayEnabled && (
        <div
          className="absolute bottom-[76px] z-25 pointer-events-auto"
          style={{
            left: effectiveLeftW,
            right: effectiveRightW,
          }}
        >
          <PlaybackBar
            session={selectedSession!}
            currentSequenceId={currentSequenceId}
            onSeek={seek}
            onAdvance={advance}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            speed={speed}
            setSpeed={setSpeed}
          />
        </div>
      )}

      {/* ── Full-screen overlays (opened via "View all") ── */}
      {selectedSession && (
        <FlowLensAnalyticsOverlays
          session={selectedSession}
          views={views}
          overlay={overlay}
          currentSequenceId={currentSequenceId}
          onClose={() => setOverlay(null)}
          onSeek={seek}
        />
      )}
      {reportsOpen && (
        <ReportsOverlay entries={entries} views={views} onClose={() => setReportsOpen(false)} />
      )}
    </>
  )
}

// ── WorkspaceBar ──────────────────────────────────────────────────────────────

function WorkspaceBar() {
  const activeWorkspace = useActiveWorkspace()
  const { switchWorkspace } = useDashboard()
  const current = workspaces.find(w => w.name === activeWorkspace) ?? workspaces[0] ?? null
  const others = workspaces.filter(w => w.name !== activeWorkspace)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  if (!current) return null

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom, left: rect.left, width: Math.max(rect.width, 180) })
    }
    setOpen(v => !v)
  }

  return (
    <div className="h-8 relative shrink-0 flex items-center border-b border-theme-border bg-theme-elevated">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="flex-1 h-full flex items-center gap-2 px-3 transition-colors hover:bg-white/3 min-w-0 text-theme-text-primary"
      >
        <FileText size={14} strokeWidth={1.5} className="shrink-0 text-theme-text-muted" />
        <span className="text-xs font-semibold truncate">{current?.label ?? activeWorkspace}</span>
        {others.length > 0 && (
          <ChevronDown
            size={11}
            className={`shrink-0 transition-transform ml-auto text-theme-text-muted ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 py-1 bg-theme-elevated border border-theme-border border-t-0 shadow-theme-float"
            style={{ top: dropdownPos!.top, left: dropdownPos!.left, width: dropdownPos!.width }}
          >
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="rounded-full bg-blue-400 shrink-0 size-1.5" />
              <span className="text-xs font-semibold truncate flex-1 text-theme-text-primary">
                {current?.label ?? activeWorkspace}
              </span>
              <span className="px-1.5 py-0.5 rounded text-ui-2xs bg-theme-blue-dim text-theme-blue">
                active
              </span>
            </div>
            {others.length > 0 && (
              <>
                <div className="h-px bg-theme-border my-1" />
                {others.map(w => (
                  <WorkspaceSwitchRow
                    key={w.name}
                    workspace={w}
                    onClose={() => setOpen(false)}
                    onSwitch={switchWorkspace}
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function WorkspaceSwitchRow({
  workspace,
  onClose,
  onSwitch,
}: {
  workspace: { name: string; label: string }
  onClose: () => void
  onSwitch: (name: string) => void
}) {
  const [switching, setSwitching] = useState(false)
  return (
    <button
      onClick={() => {
        setSwitching(true)
        onClose()
        onSwitch(workspace.name)
      }}
      disabled={switching}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/4 text-theme-text-secondary ${switching ? 'opacity-60' : ''}`}
    >
      <div className="rounded-full shrink-0 bg-theme-text-muted size-1.5" />
      <span className="text-xs truncate flex-1">{workspace.label}</span>
      <span className="text-ui-2xs text-theme-text-disabled">
        {switching ? 'switching…' : 'switch'}
      </span>
    </button>
  )
}
