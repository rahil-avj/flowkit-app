import { Wrench } from 'lucide-react'

import { useTheme } from '../../contexts/ThemeContext'
import Button from '../ui/Button'

interface MaintenanceProps {
  onAction?: () => void
}

export default function Maintenance({ onAction }: MaintenanceProps) {
  const { theme } = useTheme()

  return (
    <div className="flex flex-col items-center justify-center bg-theme-base text-theme-text-primary font-[Inter,system-ui,sans-serif] p-8 box-border size-full">
      <div className="flex flex-col items-center max-w-100 text-center gap-4">
        <div className="text-5xl font-black text-theme-purple leading-none tracking-[-0.02em] uppercase">
          Soon
        </div>

        <div
          className="flex items-center justify-center w-45 h-30 rounded-lg"
          style={{ background: theme.bg.surface, border: `2px solid ${theme.bg.border}` }}
        >
          <Wrench size={48} strokeWidth={1.5} color={theme.accent.purple} />
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-h3 font-extrabold m-0">Under Maintenance</h1>
          <p className="text-ui-sm text-theme-text-secondary m-0 leading-normal">
            This screen is currently undergoing updates or is not yet available in this flow. Please
            check back later.
          </p>
        </div>

        <Button variant="primary" onClick={onAction || (() => window.history.back())}>
          Go Back
        </Button>
      </div>
    </div>
  )
}
