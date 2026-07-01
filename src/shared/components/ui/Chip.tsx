import { X } from 'lucide-react'
import React from 'react'

import { useTheme } from '../../contexts/ThemeContext'

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void
}

export default function Chip({ onRemove, children, style, ...props }: ChipProps) {
  const { theme } = useTheme()

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-ui-2xs font-medium bg-theme-hover text-theme-text-primary border border-theme-border"
      style={style}
      {...props}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={e => {
            e.stopPropagation()
            onRemove()
          }}
          className="inline-flex items-center justify-center p-0 border-none bg-transparent text-theme-text-muted cursor-pointer rounded-full transition-[color,background-color] duration-[150ms] size-[14px]"
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = theme.text.primary
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.1)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = theme.text.muted
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
          }}
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}
