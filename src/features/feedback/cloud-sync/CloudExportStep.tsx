import Button from '@flowkit-shared/components/ui/Button'
import Modal from '@flowkit-shared/components/ui/Modal'
import { useTheme } from '@flowkit-shared/contexts/ThemeContext'
import { Cloud, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'

export interface CloudExportStepProps {
  isOpen: boolean
  onClose: () => void
  title: string
  cloudKey: string
  setCloudKey: (key: string) => void
  providedKey?: string
}

// The key-management sub-screen shown from ExportModal's "Manage Key"/"Add Key"
// button. Rendered as its own Modal (same size/title) rather than nested inside
// ExportModal's JSX, so ExportModal doesn't need to know this step's internals —
// it only needs to know whether to show the entry point at all (see
// ExportModal.tsx's optional `cloudSlot` prop).
export function CloudKeyStepModal({
  isOpen,
  onClose,
  title,
  cloudKey,
  setCloudKey,
  providedKey = '',
}: CloudExportStepProps) {
  const { theme } = useTheme()
  const [draftKey, setDraftKey] = useState(cloudKey)
  const [showKey, setShowKey] = useState(false)
  const keyInputRef = useRef<HTMLInputElement>(null)

  const handleSaveKey = () => {
    setCloudKey(draftKey.trim())
    onClose()
  }
  const handleRemoveKey = () => {
    setCloudKey('')
    setDraftKey('')
    onClose()
  }
  const handleRestoreDefault = () => {
    setDraftKey(providedKey)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footerSlot={
        <>
          <Button size="sm" onClick={onClose}>
            Back
          </Button>
          {cloudKey && (
            <Button
              size="sm"
              onClick={handleRemoveKey}
              style={{ color: theme.accent.red, borderColor: theme.accent.red + '55' }}
            >
              Remove Key
            </Button>
          )}
          {providedKey && draftKey.trim() !== providedKey && (
            <Button size="sm" onClick={handleRestoreDefault}>
              Restore default
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            onClick={handleSaveKey}
            disabled={!draftKey.trim()}
            style={{ backgroundColor: theme.accent.green, borderColor: theme.accent.green }}
          >
            Save Key
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-surface border border-theme-border">
          <div
            className="flex items-center justify-center rounded-lg shrink-0 size-9"
            style={{ background: theme.accent.green + '18' }}
          >
            <KeyRound size={18} style={{ color: theme.accent.green }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-xs text-theme-text-primary">JSONBin Access Key</span>
            <span className="text-ui-2xs text-theme-text-muted">
              Requires <strong>Create Bin</strong> permission. Stored on your device only.
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-theme-surface"
            style={{
              border: `1px solid ${draftKey.trim() ? theme.accent.green + '55' : theme.bg.border}`,
            }}
          >
            <input
              ref={keyInputRef}
              type={showKey ? 'text' : 'password'}
              value={draftKey}
              onChange={e => setDraftKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
              placeholder="Paste access key…"
              className="flex-1 bg-transparent outline-none font-mono text-ui-xs text-theme-text-primary"
              style={{ letterSpacing: showKey ? undefined : '0.08em' }}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={() => setShowKey(v => !v)}
              className="shrink-0 p-0.5 rounded text-theme-text-muted cursor-pointer"
              style={{ background: 'transparent', border: 'none' }}
              tabIndex={-1}
            >
              {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <span className="text-ui-2xs text-theme-text-muted">
            Stored locally. Won't be asked again.
          </span>
        </div>
      </div>
    </Modal>
  )
}

export interface CloudExportFooterProps {
  cloudKey: string
  onManageKey: () => void
  onPushToCloud: () => void
  exportStatus: 'idle' | 'uploading' | 'success' | 'error'
  disabled: boolean
}

// The footer buttons + status hint shown inline in ExportModal's main form when
// cloud sync is enabled — kept separate from the key-step modal above.
export function CloudExportControls({
  cloudKey,
  onManageKey,
  onPushToCloud,
  exportStatus,
  disabled,
}: CloudExportFooterProps) {
  const { theme } = useTheme()
  return (
    <>
      <Button
        size="sm"
        onClick={onManageKey}
        disabled={exportStatus === 'uploading'}
        icon={<KeyRound size={13} />}
      >
        {cloudKey ? 'Manage Key' : 'Add Key'}
      </Button>
      <Button
        size="sm"
        variant="primary"
        onClick={onPushToCloud}
        disabled={disabled || !cloudKey || exportStatus === 'uploading'}
        icon={
          exportStatus === 'uploading' ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Cloud size={13} />
          )
        }
        style={{ backgroundColor: theme.accent.green, borderColor: theme.accent.green }}
      >
        {exportStatus === 'uploading' ? 'Uploading…' : 'Push to Cloud'}
      </Button>
    </>
  )
}

export function CloudExportStatusHint({ cloudKey }: { cloudKey: string }) {
  const { theme } = useTheme()
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-theme-surface border border-theme-border">
      <Cloud
        size={14}
        className="shrink-0"
        style={{ color: cloudKey ? theme.accent.green : theme.text.muted }}
      />
      <span
        className="text-ui-2xs"
        style={{ color: cloudKey ? theme.accent.green : theme.text.muted }}
      >
        {cloudKey
          ? 'Cloud key saved — ready to push.'
          : 'No key set. Use "Manage Key" to configure.'}
      </span>
    </div>
  )
}
