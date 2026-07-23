import type { ColorBlindMode, ConnectionMode, NetworkSpeed } from '@flowkit/types/index'
import type { SessionExport } from '@flowkit-features/flowTracer/types'
import { DEVICE_PRESETS } from '@flowkit-shared/components/devices'
import { useDashboard } from '@flowkit-shared/contexts/DashboardContext'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'

import { replayFromSnapshot } from '../replayState'

interface Props {
  session: SessionExport
  currentSequenceId: number
}

/**
 * Headless component mounted inside DashboardProvider. On every scrub of the
 * replay timeline it reconstructs the recorded workspace state and pushes it
 * into the live DashboardContext, so PreviewCanvas renders the real screen
 * component the user actually saw — in the real device mockup.
 *
 * It writes state directly through the imperative setters rather than the
 * recorded navigateTo() so it never re-fires recorder events.
 */
export default function ReplayController({ session, currentSequenceId }: Props) {
  const dash = useDashboard()
  const {
    navigateTo,
    activeViewId,
    setDevicePreset,
    devicePreset,
    toggleOrientation,
    orientation,
    setColorBlindMode,
    setBlurryVision,
    setConnectionMode,
    connectionMode,
    setNetworkSpeed,
    networkSpeed,
    replaySetDb,
    resetDb,
  } = dash
  const lastDevice = useRef<string>('')

  // ── Snapshot live state at first render → restore on unmount ─────────────────
  // The replay drives the SHARED context; without this, exiting would leave the
  // workspace stuck with the session's db / accessibility / connection / device.
  // The snapshot is captured in a lazy ref initializer (first render, before any
  // replay effect runs) so it holds the true pre-replay state. The active SCREEN
  // is intentionally NOT restored — landing where replay left off is the desired
  // handoff; everything else is restored so the user returns to a clean workspace.
  const dashRef = useRef(dash)
  useLayoutEffect(() => {
    dashRef.current = dash
  })
  const snapRef = useRef<{
    db: Record<string, unknown>
    devicePreset: typeof devicePreset
    orientation: string
    colorBlindMode: ColorBlindMode
    blurryVision: number
    connectionMode: ConnectionMode
    networkSpeed: NetworkSpeed
  } | null>(null)
  if (snapRef.current === null) {
    snapRef.current = {
      db: dash.db,
      devicePreset: dash.devicePreset,
      orientation: dash.orientation,
      colorBlindMode: dash.colorBlindMode,
      blurryVision: dash.blurryVision,
      connectionMode: dash.connectionMode,
      networkSpeed: dash.networkSpeed,
    }
  }
  useEffect(() => {
    return () => {
      const d = dashRef.current
      const snap = snapRef.current!
      d.replaySetDb(snap.db)
      d.setDevicePreset(snap.devicePreset)
      if (d.orientation !== snap.orientation) d.toggleOrientation()
      d.setColorBlindMode(snap.colorBlindMode)
      d.setBlurryVision(snap.blurryVision)
      d.setConnectionMode(snap.connectionMode)
      d.setNetworkSpeed(snap.networkSpeed)
    }
  }, []) // restore on unmount (exit / session change)

  const state = useMemo(
    () => replayFromSnapshot(session, currentSequenceId),
    [session, currentSequenceId]
  )

  // ── Active screen ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.activePageId && state.activePageId !== activeViewId) {
      navigateTo(state.activePageId)
    }
  }, [state.activePageId, activeViewId, navigateTo])

  // ── Device preset (matched by label) ───────────────────────────────────────
  useEffect(() => {
    if (!state.devicePreset || state.devicePreset === lastDevice.current) return
    const match = DEVICE_PRESETS.find(d => d.label === state.devicePreset)
    if (match && match.label !== devicePreset.label) {
      setDevicePreset(match)
      lastDevice.current = state.devicePreset
    }
  }, [state.devicePreset, devicePreset.label, setDevicePreset])

  // ── Orientation ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.orientation && state.orientation !== orientation) toggleOrientation()
  }, [state.orientation, orientation, toggleOrientation])

  // ── Accessibility (equality-guarded so we don't fight the user / churn) ──────
  const colorBlindMode = dash.colorBlindMode
  useEffect(() => {
    const next = state.colorBlindMode ?? 'none'
    if (next !== colorBlindMode) setColorBlindMode(next)
  }, [state.colorBlindMode, colorBlindMode, setColorBlindMode])

  const blurryVision = dash.blurryVision
  useEffect(() => {
    const next = state.blurryVision ?? 0
    if (next !== blurryVision) setBlurryVision(next)
  }, [state.blurryVision, blurryVision, setBlurryVision])

  // ── Connection / network (replay simulated conditions) ──────────────────────
  useEffect(() => {
    if (state.connectionMode && state.connectionMode !== connectionMode) {
      setConnectionMode(state.connectionMode)
    }
  }, [state.connectionMode, connectionMode, setConnectionMode])

  useEffect(() => {
    if (state.networkSpeed && state.networkSpeed !== networkSpeed) {
      setNetworkSpeed(state.networkSpeed)
    }
  }, [state.networkSpeed, networkSpeed, setNetworkSpeed])

  // ── Database (reconstructed; replaySetDb bypasses recording) ─────────────────
  // Only drive db when the session actually recorded db state — otherwise the
  // reconstructed db is {} and we'd wipe the live default db (screens would show
  // empty data instead of the defaults the user actually saw).
  const hasDbData = useMemo(
    () =>
      session.events.some(
        e =>
          e.type === 'state.db-init' || e.type === 'state.db-patch' || e.type === 'state.db-reset'
      ),
    [session.events]
  )
  const lastDbJson = useRef<string>('')
  useEffect(() => {
    if (!hasDbData) return
    const json = JSON.stringify(state.db)
    if (json === lastDbJson.current) return
    lastDbJson.current = json
    // A reset with no recorded db-init reconstructs to {} — that means "back to
    // workspace defaults", NOT an empty db. Use resetDb() so screens render the
    // real default data instead of going blank.
    if (state.initialDb === null && Object.keys(state.db).length === 0) {
      resetDb()
    } else {
      replaySetDb(state.db)
    }
  }, [hasDbData, state.db, state.initialDb, replaySetDb, resetDb])

  return null
}
