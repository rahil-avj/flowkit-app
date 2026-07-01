import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  onClose: () => void
  width?: number
  height?: number | string
  children: React.ReactNode
}

export default function OverlayShell({ onClose, width = 560, height, children }: Props) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-100000 flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
      />
      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-w-[90vw] flex flex-col bg-theme-surface border border-theme-border rounded-[12px] shadow-[0_24px_64px_rgba(0,0,0,0.4)] overflow-hidden"
        style={{
          width,
          height: height ?? undefined,
          maxHeight: height ? undefined : '70vh',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
