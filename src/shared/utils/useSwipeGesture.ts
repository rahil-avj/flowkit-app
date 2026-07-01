import { useEffect, useLayoutEffect, useRef } from 'react'

type SwipeDirection = 'left' | 'right' | 'up' | 'down'

interface UseSwipeGestureOptions {
  threshold?: number
  enabled?: boolean
}

/**
 * Attaches touch-swipe detection to a ref'd element.
 * Routes all swipe events through a single onSwipe callback so callers
 * (FlowMaster, T2 bottom sheets) don't duplicate touch logic.
 */
export function useSwipeGesture(
  ref: React.RefObject<HTMLElement | null>,
  onSwipe: (direction: SwipeDirection) => void,
  opts: UseSwipeGestureOptions = {}
): void {
  const { threshold = 40, enabled = true } = opts

  const startX = useRef(0)
  const startY = useRef(0)
  const onSwipeRef = useRef(onSwipe)
  useLayoutEffect(() => {
    onSwipeRef.current = onSwipe
  })

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    function onTouchStart(e: TouchEvent) {
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
    }

    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX.current
      const dy = e.changedTouches[0].clientY - startY.current
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (Math.max(absDx, absDy) < threshold) return

      let direction: SwipeDirection
      if (absDx >= absDy) {
        direction = dx < 0 ? 'left' : 'right'
      } else {
        direction = dy < 0 ? 'up' : 'down'
      }
      onSwipeRef.current(direction)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [ref, enabled, threshold])
}
