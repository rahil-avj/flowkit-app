// Lightweight per-flow run history persisted to localStorage. Phase 1 keeps only
// the most recent run per flow (full history deferred). Mirrors the load/save
// pattern in features/flowTracer/components/useSessionSettings.ts.

export interface FlowRunRecord {
  /** ISO timestamp of the run. */
  at: string
  /** Total steps in the flowStory. */
  totalSteps: number
  /** Steps reached during the run. */
  stepsReached: number
  /** Whether the flow completed. */
  completed: boolean
}

import { LS_RUN_HISTORY_PREFIX as KEY_PREFIX } from '@flowkit-shared/constants/storageKeys'

export function readLastRun(flowId: string): FlowRunRecord | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + flowId)
    if (!raw) return null
    return JSON.parse(raw) as FlowRunRecord
  } catch {
    return null
  }
}

export function writeLastRun(flowId: string, record: FlowRunRecord): void {
  try {
    localStorage.setItem(KEY_PREFIX + flowId, JSON.stringify(record))
  } catch {
    /* quota — ignore */
  }
}
