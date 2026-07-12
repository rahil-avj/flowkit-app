import type { SessionExport } from '@flowkit-features/flowTracer/types'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  session: SessionExport
  currentSequenceId: number
  activeScreenId: string
  accent: string
}

/**
 * A ghost cursor showing where the user's pointer was at the current event,
 * positioned over the live device mockup (#mockup-container in PreviewCanvas).
 * Renders via portal into the mockup so it tracks the real, zoomed screen.
 */
export default function CursorGhost({ session, currentSequenceId, activeScreenId, accent }: Props) {
  const [host, setHost] = useState<HTMLElement | null>(null)

  // The mockup container is owned by PreviewCanvas; find the screen surface to
  // overlay. Re-query on screen change (device changes remount the mockup) and
  // null the host on cleanup so we never portal into a detached node.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHost(document.querySelector<HTMLElement>('#mockup-container'))
    return () => setHost(null)
  }, [activeScreenId])

  const cursor = useMemo(() => {
    const samples = session.cursorSamples ?? []
    if (samples.length === 0) return null
    const before = samples.filter(s => s.sequenceId <= currentSequenceId)
    const sample = before.length ? before[before.length - 1] : samples[0]
    if (sample.screenId !== activeScreenId) return null
    return { x: sample.x / sample.screenW, y: sample.y / sample.screenH }
  }, [session.cursorSamples, currentSequenceId, activeScreenId])

  if (!host || !cursor) return null

  return createPortal(
    <div
      className="absolute ml-[-9px] mt-[-9px] rounded-full pointer-events-none z-5 size-[18px]"
      style={{
        left: `${cursor.x * 100}%`,
        top: `${cursor.y * 100}%`,
        background: `${accent}59`,
        border: `2px solid ${accent}`,
        boxShadow: `0 0 12px 4px ${accent}73`,
        transition: 'left 0.18s ease, top 0.18s ease',
      }}
    />,
    host
  )
}
