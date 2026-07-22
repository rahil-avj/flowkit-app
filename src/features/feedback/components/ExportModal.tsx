import Button from '@flowkit-shared/components/ui/Button'
import Checkbox from '@flowkit-shared/components/ui/Checkbox'
import Modal from '@flowkit-shared/components/ui/Modal'
import { useTheme } from '@flowkit-shared/contexts/ThemeContext'
import { AlertCircle, Check, CheckCircle2, Copy, Database, FileText } from 'lucide-react'
import { useRef, useState } from 'react'

import { CloudExportControls, CloudExportStatusHint, CloudKeyStepModal } from '../cloud-sync'
import AuthorAvatar from './AuthorAvatar'
import { TEAM_MEMBERS } from './teamMembers'

// Optional cloud-push affordance. Only present when the cloud-sync feature is
// enabled — see FeedbackContext.tsx/context/index.tsx for how this is populated.
// If absent, this modal is a pure local-export tool with no cloud UI at all.
export interface ExportModalCloudSlot {
  cloudKey: string
  setCloudKey: (key: string) => void
  providedKey?: string
  exportStatus: 'idle' | 'uploading' | 'success' | 'error'
  exportError: string
  exportShareUrl: string
  onPushToCloud: () => void
}

export interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  reviewerName: string
  setReviewerName: (name: string) => void
  includeScreenshots: boolean
  setIncludeScreenshots: (include: boolean) => void
  onDownload: (format: 'md' | 'json') => void
  cloudSlot?: ExportModalCloudSlot
  title?: string
}

export default function ExportModal({
  isOpen,
  onClose,
  reviewerName,
  setReviewerName,
  includeScreenshots,
  setIncludeScreenshots,
  onDownload,
  cloudSlot,
  title = 'Export Feedback',
}: ExportModalProps) {
  const { theme } = useTheme()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showKeyStep, setShowKeyStep] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = TEAM_MEMBERS.filter(
    m => m.name.toLowerCase().includes(reviewerName.toLowerCase()) && reviewerName.length > 0
  )
  const isKnown = TEAM_MEMBERS.some(m => m.name.toLowerCase() === reviewerName.trim().toLowerCase())
  const isUnlisted = reviewerName.trim().length > 0 && !isKnown

  const handleClose = () => {
    setShowKeyStep(false)
    setCopied(false)
    onClose()
  }

  const handleCopyUrl = async () => {
    if (!cloudSlot) return
    await navigator.clipboard.writeText(cloudSlot.exportShareUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Success (cloud push only — local downloads just trigger a browser download) ──
  if (cloudSlot?.exportStatus === 'success') {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div
            className="rounded-full flex items-center justify-center size-11"
            style={{ backgroundColor: theme.accent.green + '1a', color: theme.accent.green }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-theme-text-primary">Uploaded Successfully</span>
            <span className="text-ui-2xs text-theme-text-secondary">
              Share the link below with the project owner to import your feedback.
            </span>
          </div>
          <div className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 border border-theme-border bg-theme-base">
            <span
              className="flex-1 truncate font-mono select-all text-ui-2xs text-theme-text-secondary"
              title={cloudSlot.exportShareUrl}
            >
              {cloudSlot.exportShareUrl}
            </span>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1 shrink-0 rounded px-2 py-1 transition-colors text-ui-2xs"
              style={{
                color: copied ? theme.accent.green : theme.text.muted,
                background: copied ? theme.accent.green + '15' : theme.bg.hover,
                border: `1px solid ${copied ? theme.accent.green + '44' : theme.bg.border}`,
              }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <Button
            variant="primary"
            onClick={handleClose}
            className="w-full"
            style={{ backgroundColor: theme.accent.green, borderColor: theme.accent.green }}
          >
            Done
          </Button>
        </div>
      </Modal>
    )
  }

  // ── Key step (cloud mode) ──────────────────────────────────────────────────
  if (showKeyStep && cloudSlot) {
    return (
      <CloudKeyStepModal
        isOpen={isOpen}
        onClose={() => setShowKeyStep(false)}
        title={title}
        cloudKey={cloudSlot.cloudKey}
        setCloudKey={cloudSlot.setCloudKey}
        providedKey={cloudSlot.providedKey}
      />
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  const footerCloud = cloudSlot ? (
    <>
      <Button size="sm" onClick={handleClose} disabled={cloudSlot.exportStatus === 'uploading'}>
        Cancel
      </Button>
      <CloudExportControls
        cloudKey={cloudSlot.cloudKey}
        onManageKey={() => setShowKeyStep(true)}
        onPushToCloud={cloudSlot.onPushToCloud}
        exportStatus={cloudSlot.exportStatus}
        disabled={!reviewerName.trim()}
      />
    </>
  ) : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      footerSlot={footerCloud ?? undefined}
    >
      <div className="flex flex-col gap-4">
        {/* Error banner */}
        {cloudSlot?.exportStatus === 'error' && (
          <div
            className="flex items-start gap-2 p-2.5 rounded-lg"
            style={{
              background: theme.accent.red + '12',
              border: `1px solid ${theme.accent.red + '33'}`,
            }}
          >
            <AlertCircle size={14} className="shrink-0 mt-px" style={{ color: theme.accent.red }} />
            <span className="text-ui-2xs" style={{ color: theme.accent.red }}>
              {cloudSlot.exportError}
            </span>
          </div>
        )}

        {/* Author */}
        <div className="flex flex-col gap-1 relative">
          <span className="font-bold uppercase tracking-widest text-ui-2xs text-theme-text-muted">
            Author
          </span>
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-md"
            style={{
              border: `1px solid ${isUnlisted ? theme.accent.amber + '66' : theme.bg.border}`,
              background: isUnlisted ? theme.accent.amber + '08' : theme.bg.surface,
            }}
          >
            {reviewerName.trim() && <AuthorAvatar name={reviewerName.trim()} size={20} />}
            <input
              ref={inputRef}
              value={reviewerName}
              onChange={e => {
                setReviewerName(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
              placeholder="Your name…"
              className="flex-1 bg-transparent outline-none text-xs text-theme-text-primary"
            />
            {isUnlisted && (
              <span
                className="font-bold px-1.5 py-0.5 rounded shrink-0 text-ui-2xs"
                style={{
                  background: theme.accent.amber + '22',
                  color: theme.accent.amber,
                  border: `1px solid ${theme.accent.amber + '44'}`,
                }}
              >
                Guest
              </span>
            )}
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full mt-1 rounded-md overflow-hidden z-50 shadow-theme-float bg-theme-elevated border border-theme-border inset-x-0">
              {suggestions.map(m => (
                <button
                  key={m.name}
                  onMouseDown={() => {
                    setReviewerName(m.name)
                    setShowSuggestions(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors text-ui-sm cursor-pointer text-theme-text-secondary"
                  style={{ background: 'transparent', border: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = theme.bg.hover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <AuthorAvatar name={m.name} size={20} />
                  <span className="font-semibold text-theme-text-primary">{m.name}</span>
                  {m.role && <span className="text-ui-2xs text-theme-text-muted">{m.role}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Format tiles — always shown, each tile IS a direct download action */}
        <div className="flex flex-col gap-1.5">
          <span className="font-bold uppercase tracking-widest text-ui-2xs text-theme-text-muted">
            Download as
          </span>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                id: 'md' as const,
                icon: FileText,
                label: 'Shareable Report',
                sub: 'Markdown — share with anyone',
              },
              {
                id: 'json' as const,
                icon: Database,
                label: 'Backup File',
                sub: 'JSON — re-import into Flowkit',
              },
            ].map(({ id, icon: Icon, label, sub }) => (
              <button
                key={id}
                onClick={() => reviewerName.trim() && onDownload(id)}
                disabled={!reviewerName.trim()}
                className="flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all bg-theme-surface border-[1.5px] border-theme-border"
                style={{
                  cursor: reviewerName.trim() ? 'pointer' : 'not-allowed',
                  opacity: reviewerName.trim() ? 1 : 0.45,
                }}
                onMouseEnter={e => {
                  if (reviewerName.trim())
                    e.currentTarget.style.borderColor = theme.accent.green + '88'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = theme.bg.border
                }}
              >
                <div className="flex items-center justify-center rounded-lg bg-theme-elevated size-9">
                  <Icon size={18} className="text-theme-text-muted" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold leading-tight text-ui-xs text-theme-text-primary">
                    {label}
                  </span>
                  <span className="leading-tight text-ui-2xs text-theme-text-muted">{sub}</span>
                </div>
              </button>
            ))}
          </div>
          {!reviewerName.trim() && (
            <span className="text-ui-2xs text-theme-text-muted">
              Enter your name above to download.
            </span>
          )}
        </div>

        {/* Cloud key status hint */}
        {cloudSlot && <CloudExportStatusHint cloudKey={cloudSlot.cloudKey} />}

        {/* Screenshots toggle */}
        <div className="flex items-center justify-between p-2 rounded-lg border border-theme-border">
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-theme-text-primary">Include screenshots</span>
            <span className="text-ui-2xs text-theme-text-muted">
              Embeds visual captures of mockups
            </span>
          </div>
          <Checkbox
            checked={includeScreenshots}
            onChange={e => setIncludeScreenshots(e.target.checked)}
          />
        </div>
      </div>
    </Modal>
  )
}
