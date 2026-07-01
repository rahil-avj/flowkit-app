import { X } from 'lucide-react'
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

import IconButton from './IconButton'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'full'
  footerSlot?: React.ReactNode
  children: React.ReactNode
}

export default function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  footerSlot,
  children,
}: ModalProps) {
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

  const sizeClasses = {
    sm: 'max-w-[400px] w-[90%] h-auto rounded-lg',
    md: 'max-w-[600px] w-[90%] h-auto rounded-lg',
    lg: 'max-w-[800px] w-[90%] h-auto rounded-lg',
    full: 'max-w-full w-full h-full rounded-none',
  }[size]

  return createPortal(
    <div className="fixed inset-0 z-100000 flex items-center justify-center">
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex flex-col bg-theme-surface overflow-hidden transition-all duration-200 text-theme-text-primary shadow-theme-float ${sizeClasses}`}
        style={{
          border: size === 'full' ? 'none' : '1px solid var(--color-theme-border)',
          maxHeight: size === 'full' ? '100%' : '90vh',
        }}
      >
        {(title || onClose !== undefined) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border bg-theme-elevated">
            {title ? (
              <span className="text-(length:--font-size-ui-md) font-bold">{title}</span>
            ) : (
              <div />
            )}
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
