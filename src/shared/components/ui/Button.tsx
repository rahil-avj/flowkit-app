import { cn } from '@flowkit-kit/lib/utils'
import React from 'react'

import Spinner from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Icon node. Rendered left or right of label; sole content when size="icon". */
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  /** Replaces content with a spinner and disables the button. */
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-theme-blue text-white border-theme-blue',
    'hover:opacity-90',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-blue focus-visible:ring-offset-1',
    'shadow-card',
  ].join(' '),
  secondary: [
    'bg-theme-elevated text-theme-text-primary border-theme-border',
    'hover:bg-theme-hover',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-blue focus-visible:ring-offset-1',
    'shadow-card',
  ].join(' '),
  ghost: [
    'bg-transparent text-theme-text-secondary border-transparent',
    'hover:bg-theme-hover hover:text-theme-text-primary',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-blue focus-visible:ring-offset-1',
  ].join(' '),
  danger: [
    'bg-theme-red text-white border-theme-red',
    'hover:opacity-90',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-red focus-visible:ring-offset-1',
    'shadow-card',
  ].join(' '),
  accent: [
    'bg-theme-blue-dim text-theme-blue border-theme-blue/30',
    'hover:bg-theme-blue/[0.16] hover:border-theme-blue/50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-blue focus-visible:ring-offset-1',
  ].join(' '),
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-[22px] px-2 py-[3px] text-[11px] gap-[3px] rounded',
  sm: 'h-7 px-[10px] py-[5px] text-ui-xs gap-1 rounded-[6px]',
  md: 'h-[34px] px-[14px] py-[7px] text-ui-sm gap-1.5 rounded-[6px]',
  lg: 'h-[42px] px-[18px] py-[10px] text-ui-md gap-2 rounded-[8px]',
  icon: 'h-8 w-8 p-0 rounded-[6px]',
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  children,
  className,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  const showLeftIcon = !loading && icon && iconPosition === 'left' && size !== 'icon'
  const showRightIcon = !loading && icon && iconPosition === 'right' && size !== 'icon'
  const showIconOnly = !loading && icon && size === 'icon'

  return (
    <button
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-semibold border shrink-0 whitespace-nowrap select-none',
        'transition-[background,border-color,opacity,box-shadow] duration-120 ease-out',
        isDisabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      style={style}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {showLeftIcon && icon}
      {size !== 'icon' && children}
      {showRightIcon && icon}
      {showIconOnly && icon}
    </button>
  )
}
