import Button from '@flowkit-shared/components/ui/Button'
import { useTheme } from '@flowkit-shared/contexts/ThemeContext'
import { Cloud, Eye, EyeOff, Link } from 'lucide-react'
import { useState } from 'react'

export interface CloudImportTabProps {
  importReadKey: string
  setImportReadKey: (key: string) => void
  onImportFromCloud: (binUrl: string) => Promise<void>
  onError: () => void
}

// The "From Cloud" tab content, composed into ImportModal when cloud sync is
// enabled. Owns its own bin-url/fetching-state; key persistence lives in
// useCloudSync via the props passed down.
export function CloudImportTab({
  importReadKey,
  setImportReadKey,
  onImportFromCloud,
  onError,
}: CloudImportTabProps) {
  const { scale } = useTheme()
  const [binUrl, setBinUrl] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [fetching, setFetching] = useState(false)

  const isValidUrl = binUrl.trim().includes('/b/')
  const canFetch = isValidUrl && importReadKey.trim().length > 0 && !fetching

  const handleFetch = async () => {
    setFetching(true)
    try {
      await onImportFromCloud(binUrl.trim())
    } catch (err: unknown) {
      onError()
      console.error(err)
    } finally {
      setFetching(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span
          className="font-bold uppercase tracking-widest text-theme-text-muted"
          style={{ fontSize: scale.text.xxs }}
        >
          Bin URL
        </span>
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-theme-surface"
          style={{
            border: `1px solid ${binUrl.length > 0 ? (isValidUrl ? 'var(--color-theme-green)' + '55' : 'var(--color-theme-red)' + '55') : 'var(--color-theme-border)'}`,
          }}
        >
          <Link size={13} className="text-theme-text-muted shrink-0" />
          <input
            type="url"
            value={binUrl}
            onChange={e => setBinUrl(e.target.value)}
            placeholder="https://api.jsonbin.io/v3/b/…"
            className="flex-1 bg-transparent outline-none font-mono text-theme-text-primary"
            style={{ fontSize: scale.text.xs }}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {binUrl.length > 0 && !isValidUrl && (
          <span className="text-theme-red" style={{ fontSize: scale.text.xxs }}>
            Paste the full JSONBin link shared by the reviewer.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span
            className="font-bold uppercase tracking-widest text-theme-text-muted"
            style={{ fontSize: scale.text.xxs }}
          >
            Access Key
          </span>
          {importReadKey.trim().length > 0 && (
            <span
              className="flex items-center gap-1 font-bold text-theme-green"
              style={{ fontSize: scale.text.xxs }}
            >
              <span className="rounded-full bg-theme-green inline-block size-1.5" />
              Saved
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-theme-surface"
          style={{
            border: `1px solid ${importReadKey.trim().length > 0 ? 'var(--color-theme-green)' + '55' : 'var(--color-theme-border)'}`,
          }}
        >
          <Cloud
            size={13}
            className={`shrink-0 ${importReadKey.trim().length > 0 ? 'text-theme-green' : 'text-theme-text-muted'}`}
          />
          <input
            type={showKey ? 'text' : 'password'}
            value={importReadKey}
            onChange={e => setImportReadKey(e.target.value)}
            placeholder="Paste access key…"
            className="flex-1 bg-transparent outline-none font-mono text-theme-text-primary"
            style={{ fontSize: scale.text.xs, letterSpacing: showKey ? undefined : '0.08em' }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={() => setShowKey(v => !v)}
            className="shrink-0 p-0.5 rounded text-theme-text-muted bg-transparent border-none cursor-pointer"
            tabIndex={-1}
          >
            {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <span className="text-theme-text-muted" style={{ fontSize: scale.text.xxs }}>
          Scoped access key only. Stored locally on your device.
        </span>
        {importReadKey.trim().startsWith('$2a$') && (
          <span className="text-theme-red" style={{ fontSize: scale.text.xxs }}>
            This is a master key — it will be rejected. Use a collection-scoped access key
            instead.
          </span>
        )}
      </div>

      <Button
        variant="primary"
        onClick={handleFetch}
        disabled={!canFetch}
        icon={
          fetching ? (
            <span
              className="rounded-full border-2 border-t-transparent animate-spin size-3"
              style={{ borderColor: 'white', borderTopColor: 'transparent' }}
            />
          ) : (
            <Cloud size={13} />
          )
        }
        style={{
          backgroundColor: 'var(--color-theme-green)',
          borderColor: 'var(--color-theme-green)',
        }}
      >
        {fetching ? 'Fetching…' : 'Fetch & Import'}
      </Button>
    </div>
  )
}
