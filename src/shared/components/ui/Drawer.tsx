import { X } from 'lucide-react'
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

import IconButton from './IconButton'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  side?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
  footerSlot?: React.ReactNode
  children: React.ReactNode
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  side = 'right',
  size = 'md',
  footerSlot,
  children,
}: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClass = {
    sm: 'w-[320px]',
    md: 'w-[480px]',
    lg: 'w-[640px]',
  }[size]

  const sideClass =
    side === 'left'
      ? 'left-0 right-auto border-r border-theme-border'
      : 'right-0 left-auto border-l border-theme-border'

  return createPortal(
    <div
      className={`fixed inset-0 z-100000 flex ${side === 'left' ? 'justify-start' : 'justify-end'}`}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex flex-col bg-theme-surface shadow-theme-float h-full overflow-hidden transition-all duration-200 text-theme-text-primary ${sizeClass} ${sideClass}`}
      >
        {(title || onClose !== undefined) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border bg-theme-elevated">
            {title ? <span className="text-ui-sm font-bold">{title}</span> : <div />}
            <IconButton variant="ghost" size="sm" icon={<X size={14} />} onClick={onClose} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footerSlot && (
          <div className="px-4 py-3 border-t border-theme-border bg-theme-elevated flex justify-end gap-2">
            {footerSlot}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
