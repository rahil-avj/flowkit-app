import type { SessionExport } from '@platform/features/flowTracer/types'
import type { ComponentType, ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

/**
 * FlowLens "mode" — a Figma-Dev-Mode-style toggle inside the workspace.
 *
 * This provider only holds coordination state (is the mode on, which session is
 * selected). The actual replay is driven into the SHARED DashboardContext by the
 * lazily-loaded FlowLens chunk, so the mode reuses the real workspace canvas and
 * the active screen persists across the toggle.
 *
 * `available` is determined purely by whether src/modes/flowlens/index.ts exists
 * on disk (detected via import.meta.glob at build time). No env flag needed —
 * delete the folder to strip FlowLens, keep it to include it.
 */

export interface FlowLensEnterOpts {
  /** Pre-select a recorded (IndexedDB) session by id once the mode opens. */
  sessionId?: string
}

interface FlowLensModeValue {
  available: boolean
  enabled: boolean
  /** Pending IndexedDB session id to auto-select after entry (consumed once). */
  pendingSessionId: string | null
  /** The session currently being scrubbed, or null when browsing. */
  selectedSession: SessionExport | null
  /** True while a replay is actively driving the shared DashboardContext. */
  replayActive: boolean

  enter: (opts?: FlowLensEnterOpts) => void
  exit: () => void
  selectSession: (session: SessionExport | null) => void
  consumePendingSessionId: () => string | null
}

// Presence-based availability: Vite resolves this glob at build time.
// If src/modes/flowlens/index.ts exists the map has one entry → available.
// If the folder is absent the map is empty → not available. No env flag needed.
// The loader function is exported so PreviewCanvas can use it as the lazy source,
// keeping the dynamic import path inside the glob (Rollup DCEs unused loaders).
const _flowlensGlob = import.meta.glob('../../modes/flowlens/index.ts')
const _flowlensLoader = Object.values(_flowlensGlob)[0] as
  (() => Promise<{ default: ComponentType<unknown> }>) | undefined
export const FLOWLENS_AVAILABLE = _flowlensLoader !== undefined
export { _flowlensLoader as flowlensLoader }

// FlowLens brand accent (violet) — Figma-style mode signal. Defined here (always
// in the base bundle) so the toolbar toggle can tint itself without importing the
// lazy flowlens chunk. The flowlens chunk re-exports these from flowLensTheme.ts.
export const FLOWLENS_ACCENT = '#8b5cf6'
export const FLOWLENS_ACCENT_SOFT = 'rgba(139, 92, 246, 0.14)'

if (import.meta.hot && !import.meta.hot.data.FlowLensModeContext) {
  import.meta.hot.data.FlowLensModeContext = createContext<FlowLensModeValue | null>(null)
}
const FlowLensModeContext =
  (import.meta.hot?.data.FlowLensModeContext as
    ReturnType<typeof createContext<FlowLensModeValue | null>> | undefined) ??
  createContext<FlowLensModeValue | null>(null)

const SS_KEY = 'flowlens:persist'

function readPersistedState(): { enabled: boolean; sessionId: string | null } {
  try {
    const raw = sessionStorage.getItem(SS_KEY)
    if (!raw) return { enabled: false, sessionId: null }
    return JSON.parse(raw)
  } catch {
    return { enabled: false, sessionId: null }
  }
}

function writePersistedState(enabled: boolean, sessionId: string | null) {
  try {
    if (enabled) {
      sessionStorage.setItem(SS_KEY, JSON.stringify({ enabled, sessionId }))
    } else {
      sessionStorage.removeItem(SS_KEY)
    }
  } catch {
    // sessionStorage unavailable — silently skip
  }
}

export function FlowLensModeProvider({ children }: { children: ReactNode }) {
  const persisted = readPersistedState()
  const [enabled, setEnabled] = useState(FLOWLENS_AVAILABLE && persisted.enabled)
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(
    FLOWLENS_AVAILABLE && persisted.enabled ? persisted.sessionId : null
  )
  const [selectedSession, setSelectedSession] = useState<SessionExport | null>(null)
  const pendingRef = useRef<string | null>(
    FLOWLENS_AVAILABLE && persisted.enabled ? persisted.sessionId : null
  )

  const enter = useCallback((opts?: FlowLensEnterOpts) => {
    if (!FLOWLENS_AVAILABLE) return
    // Recording-disruption handling (warning modal + stop) lands in Phase 4.
    const sessionId = opts?.sessionId ?? null
    pendingRef.current = sessionId
    setPendingSessionId(sessionId)
    setEnabled(true)
    writePersistedState(true, sessionId)
  }, [])

  const exit = useCallback(() => {
    setEnabled(false)
    setSelectedSession(null)
    setPendingSessionId(null)
    pendingRef.current = null
    writePersistedState(false, null)
  }, [])

  const selectSession = useCallback(
    (session: SessionExport | null) => {
      setSelectedSession(session)
      writePersistedState(enabled, session?.meta.id ?? null)
    },
    [enabled]
  )

  const consumePendingSessionId = useCallback(() => {
    const id = pendingRef.current
    pendingRef.current = null
    setPendingSessionId(null)
    return id
  }, [])

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    link.href = enabled
      ? '/assets/logos/flowLens/app_icon.png'
      : '/assets/logos/flowKit/app_icon.png'
  }, [enabled])

  const value = useMemo<FlowLensModeValue>(
    () => ({
      available: FLOWLENS_AVAILABLE,
      enabled,
      pendingSessionId,
      selectedSession,
      replayActive: enabled && selectedSession !== null,
      enter,
      exit,
      selectSession,
      consumePendingSessionId,
    }),
    [
      enabled,
      pendingSessionId,
      selectedSession,
      enter,
      exit,
      selectSession,
      consumePendingSessionId,
    ]
  )

  return <FlowLensModeContext.Provider value={value}>{children}</FlowLensModeContext.Provider>
}

export function useFlowLensMode(): FlowLensModeValue {
  const ctx = useContext(FlowLensModeContext)
  if (!ctx) throw new Error('useFlowLensMode must be used within FlowLensModeProvider')
  return ctx
}

/** Non-throwing variant for components that may render outside the provider. */
export function useFlowLensModeOptional(): FlowLensModeValue | null {
  return useContext(FlowLensModeContext)
}
