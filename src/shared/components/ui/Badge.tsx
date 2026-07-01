import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'neutral'
  dot?: boolean
}

const colorClasses: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  blue: {
    bg: 'bg-theme-blue-dim',
    text: 'text-theme-blue',
    dot: 'bg-theme-blue',
    border: 'border-transparent',
  },
  green: {
    bg: 'bg-theme-green-dim',
    text: 'text-theme-green',
    dot: 'bg-theme-green',
    border: 'border-transparent',
  },
  red: {
    bg: 'bg-theme-red-dim',
    text: 'text-theme-red',
    dot: 'bg-theme-red',
    border: 'border-transparent',
  },
  amber: {
    bg: 'bg-theme-amber-dim',
    text: 'text-theme-amber',
    dot: 'bg-theme-amber',
    border: 'border-transparent',
  },
  purple: {
    bg: 'bg-theme-purple-dim',
    text: 'text-theme-purple',
    dot: 'bg-theme-purple',
    border: 'border-transparent',
  },
  neutral: {
    bg: 'bg-theme-elevated',
    text: 'text-theme-text-secondary',
    dot: 'bg-theme-text-muted',
    border: 'border-theme-border',
  },
}

export default function Badge({
  color = 'neutral',
  dot = false,
  children,
  style,
  className,
  ...props
}: BadgeProps) {
  const c = colorClasses[color]

  return (
    <span
      className={`inline-flex items-center gap-[5px] px-[6px] py-[2px] rounded-[4px] text-[10px] font-bold leading-none tracking-[0.02em] border ${c.bg} ${c.text} ${c.border}${className ? ` ${className}` : ''}`}
      style={style}
      {...props}
    >
      {dot && <span className={`inline-block rounded-full size-[5px] ${c.dot}`} />}
      {children}
    </span>
  )
}
