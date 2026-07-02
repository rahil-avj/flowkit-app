import Button from '@platform/shared/components/ui/Button'
import Modal from '@platform/shared/components/ui/Modal'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import { AlertCircle, CheckCircle2, Clipboard, Cloud, FileJson, Upload } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { CloudImportTab } from '../cloud-sync'

// Optional cloud-pull affordance. Only present when the cloud-sync feature is
// enabled. If absent, this modal is a pure local file/paste import tool with no
// cloud tab at all.
export interface ImportModalCloudSlot {
  importReadKey: string
  setImportReadKey: (key: string) => void
  onImportFromCloud: (binUrl: string) => Promise<void>
}

export interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  importStatus: 'idle' | 'success' | 'error'
  setImportStatus: (status: 'idle' | 'success' | 'error') => void
  importErrorMessage: string
  importedCount: number
  importedReviewer: string
  importedDuplicates: number
  importedTotalAfter: number
  onImportFile: (file: File) => void
  onImportText: (text: string) => Promise<void>
  cloudSlot?: ImportModalCloudSlot
  title?: string
  sourceNameLabel?: string
}

export default function ImportModal({
  isOpen,
  onClose,
  importStatus,
  setImportStatus,
  importErrorMessage,
  importedCount,
  importedReviewer,
  importedDuplicates,
  importedTotalAfter,
  onImportFile,
  onImportText,
  cloudSlot,
  title = 'Import Feedback',
  sourceNameLabel = 'reviewer',
}: ImportModalProps) {
  const { scale } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<'file' | 'cloud'>('file')
  const [isDragging, setIsDragging] = useState(false)
  const [pasting, setPasting] = useState(false)
  const [dropError, setDropError] = useState('')

  const handleClose = () => {
    setIsDragging(false)
    onClose()
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setDropError('')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      setDropError('')
      const file = e.dataTransfer.files?.[0]
      if (!file) return
      if (!file.name.endsWith('.json') && !file.name.endsWith('.md')) {
        setDropError('Only .json or .md feedback files are supported.')
        return
      }
      onImportFile(file)
    },
    [onImportFile]
  )

  const handlePasteFromClipboard = async () => {
    setPasting(true)
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) throw new Error('Clipboard is empty.')
      await onImportText(text)
    } catch (err: unknown) {
      setImportStatus('error')
      console.error(err)
    } finally {
      setPasting(false)
    }
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (importStatus === 'success') {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
        <div className="flex flex-col items-center justify-center text-center p-3 gap-3">
          <div className="rounded-full flex items-center justify-center animate-fade-in bg-theme-green-dim text-theme-green size-10">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-theme-text-primary">Import Successful</span>
            <span
              className="leading-relaxed text-theme-text-secondary"
              style={{ fontSize: scale.text.xxs }}
            >
              Successfully merged feedback from {sourceNameLabel}{' '}
              <strong className="text-theme-text-primary">{importedReviewer}</strong>.
            </span>
          </div>
          <div
            className="flex flex-col gap-1.5 w-full border border-theme-border rounded-lg p-2.5 text-left bg-theme-base"
            style={{ fontSize: scale.text.xxs }}
          >
            <div className="flex justify-between">
              <span className="text-theme-text-muted">New Comments Added:</span>
              <span className="font-bold text-theme-green">+{importedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-theme-text-muted">Duplicate Comments Skipped:</span>
              <span className="font-bold text-theme-text-secondary">{importedDuplicates}</span>
            </div>
            <div className="flex justify-between border-t border-theme-border pt-1.5 mt-1">
              <span className="text-theme-text-muted">Total Comments Now:</span>
              <span className="font-bold text-theme-text-primary">{importedTotalAfter}</span>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={handleClose}
            className="w-full mt-2"
            style={{
              backgroundColor: 'var(--color-theme-green)',
              borderColor: 'var(--color-theme-green)',
            }}
          >
            Done
          </Button>
        </div>
      </Modal>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (importStatus === 'error') {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
        <div className="flex flex-col items-center justify-center text-center p-3 gap-3">
          <div className="rounded-full flex items-center justify-center animate-fade-in bg-theme-red-dim text-theme-red size-10">
            <AlertCircle size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-theme-text-primary">Import Failed</span>
            <span className="text-theme-red" style={{ fontSize: scale.text.xxs }}>
              {importErrorMessage}
            </span>
          </div>
          <Button
            variant="secondary"
            onClick={() => setImportStatus('idle')}
            className="w-full mt-2"
          >
            Try Again
          </Button>
        </div>
      </Modal>
    )
  }

  // ── Idle ───────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="flex flex-col gap-4">
        {/* Tab switcher — only shown when the cloud slot is present */}
        {cloudSlot && (
          <div className="flex rounded-lg p-0.5 gap-0.5 bg-theme-elevated border border-theme-border">
            {(['file', 'cloud'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all font-semibold border-none cursor-pointer ${tab === t ? 'bg-theme-surface text-theme-text-primary shadow-theme-float' : 'bg-transparent text-theme-text-muted'}`}
                style={{ fontSize: scale.text.xs }}
              >
                {t === 'file' ? <FileJson size={13} /> : <Cloud size={13} />}
                {t === 'file' ? 'From File' : 'From Cloud'}
              </button>
            ))}
          </div>
        )}

        {/* From File */}
        {tab === 'file' && (
          <div className="flex flex-col gap-3">
            {/* Drag & drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-5 px-4 ${isDragging ? 'border-theme-green bg-theme-green-dim text-theme-green' : 'border-theme-border bg-theme-elevated text-theme-text-muted'}`}
            >
              <Upload
                size={20}
                className={isDragging ? 'text-theme-green' : 'text-theme-text-muted'}
              />
              <div className="text-center">
                <p
                  className={`font-semibold ${isDragging ? 'text-theme-green' : 'text-theme-text-primary'}`}
                  style={{ fontSize: scale.text.xs }}
                >
                  Drop file here or click to browse
                </p>
                <p className="text-theme-text-muted mt-0.5" style={{ fontSize: scale.text.xxs }}>
                  Accepts <code>.json</code> or <code>.md</code> feedback files
                </p>
              </div>
            </div>
            {dropError && (
              <p className="text-theme-red" style={{ fontSize: scale.text.xxs }}>
                {dropError}
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.md"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) onImportFile(file)
                e.target.value = ''
              }}
              className="hidden"
            />

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-theme-border" />
              <span className="text-theme-text-muted" style={{ fontSize: scale.text.xxs }}>
                or
              </span>
              <div className="flex-1 h-px bg-theme-border" />
            </div>

            {/* Paste from clipboard */}
            <Button
              variant="secondary"
              onClick={handlePasteFromClipboard}
              disabled={pasting}
              icon={
                pasting ? (
                  <span
                    className="rounded-full border-2 border-t-transparent animate-spin border-theme-border size-3"
                    style={{ borderTopColor: 'transparent' }}
                  />
                ) : (
                  <Clipboard size={13} />
                )
              }
            >
              {pasting ? 'Reading clipboard…' : 'Paste from Clipboard'}
            </Button>
          </div>
        )}

        {/* From Cloud */}
        {tab === 'cloud' && cloudSlot && (
          <CloudImportTab
            importReadKey={cloudSlot.importReadKey}
            setImportReadKey={cloudSlot.setImportReadKey}
            onImportFromCloud={cloudSlot.onImportFromCloud}
            onError={() => setImportStatus('error')}
          />
        )}
      </div>
    </Modal>
  )
}
