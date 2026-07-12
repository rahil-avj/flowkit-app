import { Z } from '@flowkit-shared/constants/zIndex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface PanelTab {
  id: string
  label: string
  icon: React.ReactNode
  badge?: number
}

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  tabs: PanelTab[]
  activeTabId?: string
  onTabChange?: (id: string) => void
  children: React.ReactNode
}

export default function BottomSheet({
  isOpen,
  onClose,
  tabs,
  activeTabId,
  onTabChange,
  children,
}: BottomSheetProps) {
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const dragStartY = useRef(0)

  const handleClose = useCallback(() => {
    setDragOffset(0)
    onClose()
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const onDragStart = useCallback((clientY: number) => {
    dragStartY.current = clientY
    setIsDragging(true)
  }, [])

  const onDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return
      const dy = clientY - dragStartY.current
      setDragOffset(Math.max(0, dy))
    },
    [isDragging]
  )

  const onDragEnd = useCallback(
    (clientY: number) => {
      if (!isDragging) return
      setIsDragging(false)
      const dy = clientY - dragStartY.current
      if (dy > 80 || dy > window.innerHeight * 0.25) onClose()
      setDragOffset(0)
    },
    [isDragging, onClose]
  )

  const onTouchStart = (e: React.TouchEvent) => onDragStart(e.touches[0].clientY)
  const onTouchMove = (e: React.TouchEvent) => onDragMove(e.touches[0].clientY)
  const onTouchEnd = (e: React.TouchEvent) => onDragEnd(e.changedTouches[0].clientY)

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    onDragStart(e.clientY)
  }
  const onPointerMove = (e: React.PointerEvent) => onDragMove(e.clientY)
  const onPointerUp = (e: React.PointerEvent) => onDragEnd(e.clientY)

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{ zIndex: Z.modal }}
        className={`fixed inset-0 bg-black/45 transition-opacity duration-250 ease-[ease] ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Sheet — fixed height, slides up from bottom */}
      <div
        className="fixed bottom-0 h-[82vh] flex flex-col bg-theme-base rounded-t-2xl shadow-theme-float will-change-transform overflow-hidden inset-x-0"
        style={{
          zIndex: Z.modal + 1,
          transform: isOpen ? `translateY(${dragOffset}px)` : 'translateY(100%)',
          transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Drag handle */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="pt-2.5 flex justify-center shrink-0 cursor-grab touch-none select-none"
        >
          <div className="w-9 h-1 rounded-sm bg-theme-text-disabled" />
        </div>

        {/* Top-level tab bar */}
        <div className="flex shrink-0 border-b border-theme-border px-1 mt-1.5">
          {tabs.map(tab => {
            const active = tab.id === activeTabId
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.75 pt-2 pb-2.5 px-1 bg-transparent border-x-0 border-t-0 border-b-2 cursor-pointer text-[10px] relative transition-[color,border-color] duration-150 ${active ? 'border-b-theme-blue text-theme-blue font-bold' : 'border-b-transparent text-theme-text-muted font-medium'}`}
              >
                <span className="flex relative">
                  {tab.icon}
                  {(tab.badge ?? 0) > 0 && (
                    <span className="absolute -top-1 -right1.5 bg-theme-red text-white text-[8px] font-extrabold min-w-3.25 h-3.25 rounded-full flex items-center justify-center px-0.5">
                      {(tab.badge ?? 0) > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </span>
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </div>
    </>,
    document.body
  )
}
