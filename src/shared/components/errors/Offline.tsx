import { WifiOff } from 'lucide-react'

import { useTheme } from '../../contexts/ThemeContext'
import Button from '../ui/Button'

interface OfflineProps {
  onRetry?: () => void
}

export default function Offline({ onRetry }: OfflineProps) {
  const { theme } = useTheme()

  return (
    <div className="flex flex-col items-center p-8 justify-center box-border bg-theme-base text-theme-text-primary size-full">
      <div className="flex flex-col items-center max-w-md text-center gap-4">
        <div className="font-18 font-bold tracking-tight text-faded">Offline</div>

        <div
          className="flex items-center justify-center w-[180px] h-[120px] rounded-lg"
          style={{ background: theme.bg.surface, border: `2px solid ${theme.bg.border}` }}
        >
          <WifiOff size={48} strokeWidth={1.5} color={theme.accent.red} />
        </div>

        <div className="flex flex-col gap-[6px]">
          <h1 className="text-[20px] font-extrabold m-0">No Internet Connection</h1>
          <p className="text-ui-sm text-theme-text-secondary m-0 leading-normal">
            It looks like you are offline. Please check your network cables or Wi-Fi status and try
            again.
          </p>
        </div>

        <Button variant="primary" onClick={onRetry || (() => window.location.reload())}>
          Retry Connection
        </Button>
      </div>
    </div>
  )
}
