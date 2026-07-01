import React from 'react'

interface PanelContentProps {
  side?: 'left' | 'right'
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  children?: React.ReactNode
  className?: string
  scrollable?: boolean
}

export default function PanelBody({
  side,
  toolbar,
  footer,
  children,
  className,
  scrollable = true,
}: PanelContentProps) {
  const border = side === 'left' ? 'border-r border-theme-border' : 'border-l border-theme-border'

  return (
    <div
      className={`flex flex-1 flex-col h-full min-w-0 bg-theme-surface ${border} ${className ?? ''}`}
    >
      {toolbar && <div className="shrink-0 border-b border-theme-border">{toolbar}</div>}

      <div
        className={`flex flex-col min-h-0 h-full ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'} size-full`}
      >
        {children}
      </div>

      {footer && <div className="shrink-0 border-t border-theme-border">{footer}</div>}
    </div>
  )
}
