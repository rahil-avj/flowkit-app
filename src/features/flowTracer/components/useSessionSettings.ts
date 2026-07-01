import { LS_SESSION_SETTINGS as STORAGE_KEY } from '@platform/shared/constants/storageKeys'
import { useCallback, useState } from 'react'
const SETTINGS_VERSION = 1

export interface SessionSettings {
  nameTemplate: string
  autoStartOnFlow: boolean
  qualityThreshold: number
  cursorTracking: boolean
  cursorSamplingRateMs: number
  // channels
  effects: boolean
  stateChanges: boolean
  simulatorChanges: boolean
  panelActivity: boolean
  sidebarActivity: boolean
  frustratedClicks: boolean
  hoverEvents: boolean
  _version: number
}

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  nameTemplate: 'Session · {date}',
  autoStartOnFlow: true,
  qualityThreshold: 40,
  cursorTracking: false,
  // ~20 samples/sec — dense enough for heatmaps without persisting every rAF
  // frame (0 = unthrottled, which floods the store at 60/sec).
  cursorSamplingRateMs: 50,
  effects: true,
  stateChanges: true,
  simulatorChanges: true,
  panelActivity: false,
  sidebarActivity: false,
  frustratedClicks: true,
  hoverEvents: false,
  _version: SETTINGS_VERSION,
}

function load(): SessionSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SESSION_SETTINGS
    const loaded = JSON.parse(raw) as Partial<SessionSettings>
    // Merge into defaults so any new fields get their default values.
    // _version lets future migrations detect schema gaps.
    return { ...DEFAULT_SESSION_SETTINGS, ...loaded, _version: SETTINGS_VERSION }
  } catch {
    return DEFAULT_SESSION_SETTINGS
  }
}

function save(s: SessionSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* quota */
  }
}

export function useSessionSettings() {
  const [settings, setSettingsState] = useState<SessionSettings>(load)

  const saveSettings = useCallback((s: SessionSettings) => {
    setSettingsState(() => {
      save(s)
      return s
    })
  }, [])

  const resolvedName = useCallback((settings: SessionSettings): string => {
    const date = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    return settings.nameTemplate.replace('{date}', date) || 'Untitled session'
  }, [])

  return { settings, saveSettings, resolvedName }
}
