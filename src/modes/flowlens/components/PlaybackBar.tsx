import type { SessionExport } from '@flowkit-features/flowTracer/types'
import { ChevronLeft, ChevronRight, Pause, Play, SkipBack } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

import { FLOWLENS_ACCENT } from '../flowLensTheme'

interface Props {
  session: SessionExport
  currentSequenceId: number
  /** User scrub — pauses playback. */
  onSeek: (sequenceId: number) => void
  /** Autoplay advance — does NOT pause playback. */
  onAdvance: (sequenceId: number) => void
  isPlaying: boolean
  setIsPlaying: (v: boolean) => void
  speed: number
  setSpeed: (v: number) => void
}

export default function PlaybackBar({
  session,
  currentSequenceId,
  onSeek,
  onAdvance,
  isPlaying,
  setIsPlaying,
  speed,
  setSpeed,
}: Props) {
  const btnClass =
    'bg-transparent border border-theme-border rounded-md text-theme-text-secondary cursor-pointer py-0.75 px-1.5 flex items-center justify-center disabled:opacity-50'
  const { events, snapshots } = session
  const lastIdx = Math.max(0, events.length - 1)
  const currentIdx = Math.max(
    0,
    events.findIndex(e => e.sequenceId === currentSequenceId)
  )
  // Progress is index-space (matches the scrubber click + the "N / M" counter).
  const progressPct = lastIdx > 0 ? (currentIdx / lastIdx) * 100 : 0
  const idxOf = useCallback((seq: number) => events.findIndex(e => e.sequenceId === seq), [events])

  const stepBack = useCallback(() => {
    if (currentIdx > 0) onSeek(events[currentIdx - 1].sequenceId)
  }, [currentIdx, events, onSeek])
  const stepForward = useCallback(() => {
    if (currentIdx < events.length - 1) onSeek(events[currentIdx + 1].sequenceId)
  }, [currentIdx, events, onSeek])
  const seekStart = useCallback(() => {
    if (events.length) onSeek(events[0].sequenceId)
  }, [events, onSeek])

  // ── Auto-play timer ──────────────────────────────────────────────────────────
  // Uses onAdvance (NOT onSeek) so it preserves isPlaying — onSeek is the *user*
  // scrub action and intentionally pauses playback.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    if (currentIdx >= events.length - 1) {
      setIsPlaying(false)
      return
    }
    const cur = events[currentIdx]
    const next = events[currentIdx + 1]
    const rawGap = next && cur ? next.timestamp - cur.timestamp : 600
    const gap = Number.isFinite(rawGap) ? Math.max(120, Math.min(2000, rawGap)) : 600
    timerRef.current = setTimeout(() => onAdvance(next.sequenceId), gap / speed)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, currentIdx, events, speed, onAdvance, setIsPlaying])

  return (
    <div className="shrink-0 border-t border-theme-border py-2 px-3.5 flex flex-col gap-2 bg-theme-surface">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Replay position"
        aria-valuemin={1}
        aria-valuemax={events.length}
        aria-valuenow={currentIdx + 1}
        className="h-1 bg-border rounded-sm cursor-pointer relative outline-none"
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          const pct = (e.clientX - rect.left) / rect.width
          const idx = Math.max(0, Math.min(events.length - 1, Math.round(pct * lastIdx)))
          if (events[idx]) onSeek(events[idx].sequenceId)
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            stepBack()
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            stepForward()
          }
        }}
      >
        <div
          className="h-full rounded-sm transition-[width] duration-120"
          style={{
            width: `${progressPct}%`,
            background: FLOWLENS_ACCENT,
          }}
        />
        {snapshots.map(s => {
          const sIdx = idxOf(s.sequenceId)
          if (sIdx < 0) return null
          return (
            <div
              key={s.sequenceId}
              className="absolute top-[-2px] w-[2px] h-2 opacity-60 rounded-[1px]"
              style={{
                background: FLOWLENS_ACCENT,
                width: 2,
                left: `${lastIdx > 0 ? (sIdx / lastIdx) * 100 : 0}%`,
              }}
            />
          )
        })}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={seekStart}
          className={btnClass}
          title="Rewind"
          aria-label="Rewind to start"
        >
          <SkipBack size={13} />
        </button>
        <button
          onClick={stepBack}
          disabled={currentIdx <= 0}
          className={btnClass}
          title="Step back"
          aria-label="Step back one event"
        >
          <ChevronLeft size={13} />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: FLOWLENS_ACCENT,
            borderColor: FLOWLENS_ACCENT,
          }}
          className={`${btnClass} text-white`}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button
          onClick={stepForward}
          disabled={currentIdx >= events.length - 1}
          className={btnClass}
          title="Step forward"
          aria-label="Step forward one event"
        >
          <ChevronRight size={13} />
        </button>

        <div className="flex-1" />

        <select
          value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          aria-label="Playback speed"
          className="bg-theme-elevated border border-theme-border rounded text-theme-text-secondary text-ui-2xs py-0.5 px-1.5 cursor-pointer outline-none"
        >
          {[0.5, 1, 2, 4].map(s => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
        <span className="text-theme-text-disabled text-ui-2xs tabular-nums min-w-[56px] text-right">
          {currentIdx + 1} / {events.length}
        </span>
      </div>
    </div>
  )
}
