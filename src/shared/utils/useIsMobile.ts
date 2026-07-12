import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 768

function isMobileWidth() {
  return Math.min(window.innerWidth, window.innerHeight) < MOBILE_BREAKPOINT
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(isMobileWidth)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    function onResize() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setIsMobile(isMobileWidth()), 100)
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (timer) clearTimeout(timer)
    }
  }, [])

  return isMobile
}
