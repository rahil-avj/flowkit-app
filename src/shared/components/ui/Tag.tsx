import React from 'react'

type TagColor = 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'neutral'

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: TagColor
}

const colorClasses: Record<TagColor, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-theme-blue-dim', text: 'text-theme-blue', border: 'border-theme-blue' },
  green: { bg: 'bg-theme-green-dim', text: 'text-theme-green', border: 'border-theme-green' },
  red: { bg: 'bg-theme-red-dim', text: 'text-theme-red', border: 'border-theme-red' },
  amber: { bg: 'bg-theme-amber-dim', text: 'text-theme-amber', border: 'border-theme-amber' },
  purple: { bg: 'bg-theme-purple-dim', text: 'text-theme-purple', border: 'border-theme-purple' },
  neutral: { bg: 'bg-transparent', text: 'text-theme-text-muted', border: 'border-theme-border' },
}

export default function Tag({ children, color = 'neutral', style, ...props }: TagProps) {
  const c = colorClasses[color]

  return (
    <span
      className={`inline-flex items-center px-[5px] py-px rounded-[3px] text-[9px] font-semibold uppercase tracking-[0.04em] leading-[1.2] border ${c.bg} ${c.text} ${c.border}`}
      style={style}
      {...props}
    >
      {children}
    </span>
  )
}
