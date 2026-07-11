import { Z } from '@flowkit-shared/constants/zIndex'
import { Menu } from 'lucide-react'

interface MobileFABProps {
  onClick: () => void
}

export default function MobileFAB({ onClick }: MobileFABProps) {
  return (
    <button
      onClick={onClick}
      style={{ zIndex: Z.modal }}
      className="fixed bottom-6 right-5 rounded-full bg-neutral-950 border-0 cursor-pointer flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-transform duration-150 size-14"
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.06)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
      aria-label="Open panel"
    >
      <Menu size={22} color="#fff" />
    </button>
  )
}

// Top-level drawer tabs
export type MobileTab = 'explore' | 'goto' | 'inspect' | 'feedback' | 'settings' | 'actions'
