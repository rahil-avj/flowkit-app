import { createContext, useContext } from 'react'

// Minimal interface — only the surface that shared-layer contexts (Dashboard,
// FlowPlayback, FlowLensMode) need to reach. The full SessionRecorderValue with
// all lifecycle methods lives in @features/flowTracer and is only used there.
export interface SessionEventLogger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logEvent: (type: any, payload?: Record<string, unknown>) => void
  state: string
  isRecording: boolean
  autoStartSession: () => void
}

export const SessionRecorderCtx = createContext<SessionEventLogger | null>(null)

export function useSessionRecorderShared(): SessionEventLogger | null {
  return useContext(SessionRecorderCtx)
}
