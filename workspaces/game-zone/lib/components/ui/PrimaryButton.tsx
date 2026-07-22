import { cn } from '@flowkit-kit/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'danger'
}

export default function PrimaryButton({
  variant = 'default',
  className,
  children,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={cn(
        'w-full px-3 py-2.5 rounded-md text-ui-sm font-medium transition-colors duration-150',
        variant === 'default' && 'bg-theme-blue-dim text-theme-blue',
        variant === 'danger' && 'bg-theme-red-dim text-theme-red',
        'disabled:opacity-50 disabled:pointer-events-none',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
