import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  actionSlot?: React.ReactNode
  padding?: string | number
}

export default function Card({
  title,
  actionSlot,
  padding = 12,
  children,
  style,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-theme-surface border border-theme-border rounded-lg shadow-theme-card flex flex-col overflow-hidden${className ? ` ${className}` : ''}`}
      style={style}
      {...props}
    >
      {(title || actionSlot) && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-theme-border bg-theme-elevated">
          {title && (
            <span className="text-ui-2xs font-bold text-theme-text-primary uppercase tracking-[0.04em]">
              {title}
            </span>
          )}
          {actionSlot && <div className="ml-auto">{actionSlot}</div>}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  )
}
