import * as React from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Escape-to-close, outside-click-to-close, and a focus trap that returns focus
 * to the trigger on close — the behavior Radix's Dialog/Popover give for free.
 */
export function useDismissableLayer(open: boolean, onOpenChange: (open: boolean) => void) {
  const contentRef = React.useRef<HTMLElement | null>(null)
  const triggerFocusRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    triggerFocusRef.current = document.activeElement as HTMLElement | null

    const node = contentRef.current
    const focusables = node?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    const first = focusables?.[0] ?? node
    first?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onOpenChange(false)
        return
      }
      if (e.key !== 'Tab' || !node) return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault()
        firstItem.focus()
      }
    }

    function handlePointerDown(e: PointerEvent) {
      if (node && !node.contains(e.target as Node)) onOpenChange(false)
    }

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('pointerdown', handlePointerDown, true)
      triggerFocusRef.current?.focus()
    }
  }, [open, onOpenChange])

  return contentRef
}

/** Locks body scroll while `locked` is true; restores the previous value on unmount/unlock. */
export function useScrollLock(locked: boolean) {
  React.useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [locked])
}
