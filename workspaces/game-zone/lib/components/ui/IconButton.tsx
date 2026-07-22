import { cn } from '@flowkit-kit/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
}

export default function IconButton({ icon, label, className, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        'size-8 rounded-[6px] flex items-center justify-center text-theme-text-secondary',
        'hover:bg-theme-hover transition-colors duration-[120ms]',
        className
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
