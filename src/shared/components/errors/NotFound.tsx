import { Info } from 'lucide-react'

import { useTheme } from '../../contexts/ThemeContext'
import Button from '../ui/Button'

interface NotFoundProps {
  onAction?: () => void
}

export default function NotFound({ onAction }: NotFoundProps) {
  const { theme } = useTheme()

  return (
    <div className="flex flex-col items-center justify-center bg-theme-base text-theme-text-primary font-[Inter,system-ui,sans-serif] p-8 box-border size-full">
      <div className="flex flex-col items-center max-w-100 text-center gap-4">
        <div className="text-7xl font-black text-theme-blue leading-none tracking-[-0.04em]">
          404
        </div>

        <div
          className="flex items-center justify-center w-45 h-30 rounded-lg"
          style={{ background: theme.bg.surface, border: `2px solid ${theme.bg.border}` }}
        >
          <Info size={48} strokeWidth={1.5} color={theme.accent.blue} />
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-h3 font-extrabold m-0">Screen Not Found</h1>
          <p className="text-ui-sm text-theme-text-secondary m-0 leading-normal">
            The screen ID you are trying to view does not exist in this workspace. It might have
            been renamed or removed.
          </p>
        </div>

        <Button variant="primary" onClick={onAction || (() => window.history.back())}>
          Go Back
        </Button>
      </div>
    </div>
  )
}
