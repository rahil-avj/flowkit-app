import { ShieldOff } from 'lucide-react'

import { useTheme } from '../../contexts/ThemeContext'
import Button from '../ui/Button'

interface ForbiddenProps {
  onAction?: () => void
}

export default function Forbidden({ onAction }: ForbiddenProps) {
  const { theme } = useTheme()

  return (
    <div className="flex flex-col items-center justify-center bg-theme-base text-theme-text-primary font-[Inter,system-ui,sans-serif] p-8 box-border size-full">
      <div className="flex flex-col items-center max-w-[400px] text-center gap-4">
        <div className="text-[72px] font-black text-theme-amber leading-none tracking-[-0.04em]">
          403
        </div>

        <div
          className="flex items-center justify-center w-[180px] h-[120px] rounded-lg"
          style={{ background: theme.bg.surface, border: `2px solid ${theme.bg.border}` }}
        >
          <ShieldOff size={48} strokeWidth={1.5} color={theme.accent.amber} />
        </div>

        <div className="flex flex-col gap-[6px]">
          <h1 className="text-[20px] font-extrabold m-0">Access Forbidden</h1>
          <p className="text-ui-sm text-theme-text-secondary m-0 leading-normal">
            You do not have permission to access this screen. Please sign in or check your access
            credentials.
          </p>
        </div>

        <Button variant="primary" onClick={onAction || (() => window.history.back())}>
          Go Back
        </Button>
      </div>
    </div>
  )
}
