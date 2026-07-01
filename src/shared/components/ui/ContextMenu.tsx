import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { DropdownMenuItemType } from './DropdownMenu'

interface ContextMenuProps {
  children: React.ReactElement
  items: DropdownMenuItemType[]
  disabled?: boolean
}

export default function ContextMenu({ children, items, disabled }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    setCoords({
      top: e.clientY + window.scrollY,
      left: e.clientX + window.scrollX,
    })
    setIsOpen(true)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onContextMenu: (e: React.MouseEvent) => {
      handleContextMenu(e)
      ;(children.props as React.HTMLAttributes<HTMLElement>).onContextMenu?.(
        e as React.MouseEvent<HTMLElement>
      )
    },
  } as React.HTMLAttributes<HTMLElement> & { ref: React.Ref<HTMLElement> })

  return (
    <>
      {trigger}
      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            className="absolute z-99999"
            style={{
              top: coords.top,
              left: coords.left,
            }}
          >
            <div className="bg-theme-surface border border-theme-border rounded-[6px] shadow-theme-float py-1 min-w-[160px] text-theme-text-primary">
              {items.map((item, idx) => {
                if (item.divider) {
                  return <div key={idx} className="h-px bg-theme-border my-1" />
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      item.onClick?.()
                      setIsOpen(false)
                    }}
                    className={`w-full px-3 py-[6px] text-ui-sm border-none bg-transparent text-left cursor-pointer flex items-center gap-2 font-medium ${item.destructive ? 'text-theme-red' : 'text-theme-text-primary'}`}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'var(--color-theme-hover)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {item.icon && <span className="inline-flex w-[14px]">{item.icon}</span>}
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-ui-2xs px-1 py-px rounded-[3px] bg-theme-elevated text-theme-text-muted font-semibold">
                        {item.badge}
                      </span>
                    )}
                    {item.shortcut && (
                      <span className="text-ui-2xs font-mono text-theme-text-muted">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
