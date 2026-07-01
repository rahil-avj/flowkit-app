import { useTheme } from '@platform/shared/contexts/ThemeContext'
import { Check, Copy } from 'lucide-react'
import { useCallback, useState } from 'react'

import type { PatchScript } from './types'

interface CopyScriptButtonProps {
  patch: PatchScript
  size?: 'sm' | 'md'
  /** Override the primary button label. Defaults to patch.label. */
  label?: string
}

export default function CopyScriptButton({ patch, size = 'md', label }: CopyScriptButtonProps) {
  const { theme, scale } = useTheme()
  const [copied, setCopied] = useState(false)
  const [copiedRestore, setCopiedRestore] = useState(false)

  const fontSize = size === 'sm' ? scale.text.xxs : scale.text.xs
  const py = size === 'sm' ? 'py-1' : 'py-2'
  const iconSize = size === 'sm' ? 10 : 12

  const handleCopy = useCallback(() => {
    if (!patch.script) return
    navigator.clipboard
      .writeText(patch.script)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(err => {
        console.error('Failed to copy patch script to clipboard:', err)
      })
  }, [patch.script])

  const handleCopyRestore = useCallback(() => {
    if (!patch.restoreScript) return
    navigator.clipboard
      .writeText(patch.restoreScript)
      .then(() => {
        setCopiedRestore(true)
        setTimeout(() => setCopiedRestore(false), 2000)
      })
      .catch(err => {
        console.error('Failed to copy restore script to clipboard:', err)
      })
  }, [patch.restoreScript])

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCopy}
        disabled={!patch.script}
        className={`flex items-center justify-center gap-2 w-full ${py} rounded-lg font-bold transition-opacity disabled:opacity-40`}
        style={{ background: theme.accent.green, color: '#000', fontSize }}
        onMouseEnter={e => {
          if (patch.script) e.currentTarget.style.opacity = '0.85'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = '1'
        }}
      >
        {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
        {copied ? 'Copied!' : (label ?? patch.label)}
      </button>

      {patch.restoreScript && (
        <button
          onClick={handleCopyRestore}
          className={`flex items-center justify-center gap-2 w-full ${py} rounded-lg font-bold transition-colors`}
          style={{
            background: theme.bg.hover,
            color: theme.text.secondary,
            fontSize,
            border: `1px solid ${theme.bg.border}`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = theme.text.primary
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = theme.text.secondary
          }}
        >
          {copiedRestore ? <Check size={iconSize} /> : <Copy size={iconSize} />}
          {copiedRestore ? 'Copied!' : 'Copy restore script'}
        </button>
      )}
    </div>
  )
}
