// JSONBin cloud-sync — an archived, gated feature (temp solution from early days).
// Only FeedbackContext.tsx imports from this folder.
//
// To remove this feature entirely:
//   1. Delete this folder (src/features/feedback/cloud-sync/).
//   2. In FeedbackContext.tsx: delete the `useCloudSync`/`buildCloudSyncSlot` import
//      and the few lines that call them and expose their results on the context value.
//   3. TypeScript will then flag every downstream file that read those now-removed
//      context fields (context/index.tsx, panel.tsx, Settings.tsx, appActions.ts,
//      ActionCenter.tsx, PreviewCanvas.tsx, MobileCanvas.tsx) — fix each flagged
//      spot by deleting the reference. No other manual hunting required.
export { CloudExportControls, CloudExportStatusHint, CloudKeyStepModal } from './CloudExportStep'
export { CloudImportTab } from './CloudImportTab'
export { buildCloudSyncSlot, type CloudSyncSlot } from './registerCloudSync'
export { useCloudSync, type UseCloudSyncResult } from './useCloudSync'
