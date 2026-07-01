import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface PopoverProps {
  children: React.ReactElement
  content: React.ReactNode
  disabled?: boolean
}

export default function Popover({ children, content, disabled }: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const updateCoords = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({
      top: rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
    })
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    if (!isOpen) {
      updateCoords()
    }
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('resize', updateCoords)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', updateCoords)
    }
  }, [isOpen])

  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onClick: (e: React.MouseEvent) => {
      handleToggle(e)
      const onClick = (children.props as Record<string, unknown>).onClick
      if (typeof onClick === 'function') {
        onClick(e)
      }
    },
  } as React.HTMLAttributes<HTMLElement> & { ref: React.Ref<HTMLElement> })

  return (
    <>
      {trigger}
      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              top: coords.top,
              left: coords.left,
            }}
            className="absolute z-99999"
          >
            <div className="bg-theme-surface border border-theme-border rounded-lg shadow-theme-float p-3 min-w-[200px] text-theme-text-primary">
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
