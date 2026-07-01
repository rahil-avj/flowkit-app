import { cn } from '@kit/lib/utils'
import React from 'react'

import Spinner from './Spinner'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon: React.ReactNode
  loading?: boolean
}

const variantClasses: Record<string, string> = {
  primary: [
    'bg-theme-blue text-white border-theme-blue shadow-card',
    'hover:opacity-90',
    'focus-visible:ring-2 focus-visible:ring-theme-blue',
  ].join(' '),
  secondary: [
    'bg-theme-elevated text-theme-text-primary border-theme-border shadow-card',
    'hover:bg-theme-hover',
    'focus-visible:ring-2 focus-visible:ring-theme-blue',
  ].join(' '),
  ghost: [
    'bg-transparent text-theme-text-secondary border-transparent',
    'hover:bg-theme-hover hover:text-theme-text-primary',
    'focus-visible:ring-2 focus-visible:ring-theme-blue',
  ].join(' '),
  danger: [
    'bg-theme-red text-white border-theme-red shadow-card',
    'hover:opacity-90',
    'focus-visible:ring-2 focus-visible:ring-theme-red',
  ].join(' '),
}

const sizeClasses: Record<string, string> = {
  sm: 'size-[26px]',
  md: 'size-8',
  lg: 'size-10',
}

export default function IconButton({
  variant = 'secondary',
  size = 'md',
  icon,
  loading,
  className,
  style,
  disabled,
  ...props
}: IconButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-[6px] border shrink-0',
        'transition-[background,opacity] duration-150 ease-out',
        'outline-none focus-visible:ring-offset-1',
        disabled || loading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      style={style}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
    </button>
  )
}
