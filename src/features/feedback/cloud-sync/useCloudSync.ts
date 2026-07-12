import { useState } from 'react'

import { JSONBIN_CONFIG, LS_CLOUD_EXPORT_ENABLED, LS_JSONBIN_KEY, LS_JSONBIN_READ_KEY } from './constants'
import { fetchFromJsonBin, pushToJsonBin } from './jsonbin'

export interface UseCloudSyncResult {
  cloudExportEnabled: boolean
  toggleCloudExport: () => void
  cloudKey: string
  setCloudKey: (key: string) => void
  providedKey: string
  importReadKey: string
  setImportReadKey: (key: string) => void
  pushJson: (filename: string, json: string) => Promise<{ shareUrl: string }>
  pullFromBin: (binUrl: string) => Promise<string>
}

// Single owner of every cloud-sync concern: the enabled flag, both keys, and the
// two network actions. Called exactly once, from FeedbackContext.tsx — do not call
// this hook a second time elsewhere, since it would create a second, independently
// out-of-sync copy of this state (two useState instances don't share updates).
export function useCloudSync(): UseCloudSyncResult {
  const [cloudExportEnabled, setCloudExportEnabled] = useState(
    () => localStorage.getItem(LS_CLOUD_EXPORT_ENABLED) === 'true'
  )
  const toggleCloudExport = () => {
    setCloudExportEnabled(prev => {
      const next = !prev
      localStorage.setItem(LS_CLOUD_EXPORT_ENABLED, String(next))
      return next
    })
  }

  const [cloudKey, setCloudKeyState] = useState(() => {
    const stored = localStorage.getItem(LS_JSONBIN_KEY)
    if (!stored && JSONBIN_CONFIG.providedKey) {
      try {
        localStorage.setItem(LS_JSONBIN_KEY, JSONBIN_CONFIG.providedKey)
      } catch {
        /* quota */
      }
      return JSONBIN_CONFIG.providedKey
    }
    return stored || ''
  })
  const setCloudKey = (key: string) => {
    setCloudKeyState(key)
    try {
      localStorage.setItem(LS_JSONBIN_KEY, key)
    } catch {
      /* quota */
    }
  }

  const [importReadKey, setImportReadKeyState] = useState(
    () => localStorage.getItem(LS_JSONBIN_READ_KEY) || ''
  )
  const setImportReadKey = (key: string) => {
    setImportReadKeyState(key)
    try {
      localStorage.setItem(LS_JSONBIN_READ_KEY, key)
    } catch {
      /* quota */
    }
  }

  const pushJson = async (filename: string, json: string) => {
    if (!cloudKey.trim()) throw new Error('No API key provided.')
    const shareUrl = await pushToJsonBin(filename, json, cloudKey.trim())
    return { shareUrl }
  }

  const pullFromBin = async (binUrl: string) => {
    if (!importReadKey.trim()) throw new Error('No API key provided.')
    return fetchFromJsonBin(binUrl, importReadKey.trim())
  }

  return {
    cloudExportEnabled,
    toggleCloudExport,
    cloudKey,
    setCloudKey,
    providedKey: JSONBIN_CONFIG.providedKey,
    importReadKey,
    setImportReadKey,
    pushJson,
    pullFromBin,
  }
}
