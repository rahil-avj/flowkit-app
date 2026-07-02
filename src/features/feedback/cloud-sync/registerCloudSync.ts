import type { UseCloudSyncResult } from './useCloudSync'

// Generic descriptor shape that shared/ code (Settings, Action Center) can render
// without knowing anything about "cloud sync" or "JSONBin" — it just sees a toggle
// with a label. Mirrors the ActionCtx type declared in
// shared/components/overlays/appActions.ts; kept in sync manually since shared/
// must not import from this feature (see that file for the canonical type).
export interface CloudSyncSlot {
  actionId: string
  group: string
  label: string
  hint?: string
  beta?: boolean
  enabled: boolean
  toggle: () => void
  stayOpen?: boolean
}

export function buildCloudSyncSlot(cloudSync: UseCloudSyncResult): CloudSyncSlot {
  return {
    actionId: 'toggle-cloud-export',
    group: 'Feedback',
    label: 'Toggle cloud push for feedback',
    hint: 'Automatically syncs new comments to the configured cloud endpoint.',
    beta: true,
    enabled: cloudSync.cloudExportEnabled,
    toggle: cloudSync.toggleCloudExport,
    stayOpen: true,
  }
}
