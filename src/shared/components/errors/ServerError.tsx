import { XCircle } from 'lucide-react'

import Button from '../ui/Button'

interface ServerErrorProps {
  message?: string
  onRetry?: () => void
}

export default function ServerError({ message, onRetry }: ServerErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center bg-theme-base text-theme-text-primary font-[Inter,system-ui,sans-serif] p-8 box-border size-full">
      <div className="flex flex-col items-center max-w-110 text-center gap-4">
        <div className="text-7xl font-black text-theme-red leading-none tracking-[-0.04em]">
          500
        </div>

        <div
          className="flex items-center justify-center w-45 h-30 rounded-lg"
          style={{
            background: 'var(--color-theme-surface)',
            border: '2px solid var(--color-theme-border)',
          }}
        >
          <XCircle size={48} strokeWidth={1.5} color="var(--color-theme-red)" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-h3 font-extrabold m-0">Internal Server Error</h1>
          <p className="text-ui-sm text-theme-text-secondary m-0 leading-normal">
            {message ||
              'The application encountered an unexpected error and crashed. Try reloading the page.'}
          </p>
        </div>

        <Button variant="danger" onClick={onRetry || (() => window.location.reload())}>
          Reload Application
        </Button>
      </div>
    </div>
  )
}
