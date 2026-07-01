import React from 'react'

import Button from './Button'

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  actionLabel?: string
  onActionClick?: () => void
  /** Arbitrary action content — used instead of actionLabel/onActionClick when you need multiple buttons or custom layout. */
  cta?: React.ReactNode
  /**
   * "card"  — dashed border, surface bg, inline card context (default legacy behaviour)
   * "panel" — no border, full panel fill, centered icon box (feedback tab style)
   */
  variant?: 'card' | 'panel'
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onActionClick,
  cta,
  variant = 'card',
  className,
  ...props
}: EmptyStateProps) {
  if (variant === 'panel') {
    return (
      <div
        className={`flex flex-1 flex-col items-center justify-center text-center w-full min-w-0 gap-3 py-10 px-4 overflow-hidden ${className ?? ''}`}
        {...props}
      >
        {icon && (
          <div className="flex items-center justify-center rounded-2xl shrink-0 p-2.5 bg-theme-elevated border border-theme-border text-theme-text-disabled">
            {icon}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <p className="text-ui-xs font-semibold text-theme-text-primary">{title}</p>
          {subtitle && (
            <p className="text-ui-2xs text-theme-text-muted w-full max-w-50">{subtitle}</p>
          )}
        </div>
        {cta && <div className="mt-1">{cta}</div>}
        {!cta && actionLabel && onActionClick && (
          <div className="mt-1">
            <Button variant="primary" size="sm" onClick={onActionClick}>
              {actionLabel}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // card variant
  return (
    <div
      className={`flex flex-col items-center justify-center px-4 py-8 text-center bg-theme-surface border border-dashed border-theme-border rounded-lg ${className ?? ''}`}
      {...props}
    >
      {icon && <div className="text-theme-text-muted mb-3 inline-flex">{icon}</div>}
      <h3 className="text-ui-base font-bold text-theme-text-primary mt-0 mb-1">{title}</h3>
      {subtitle && (
        <p className="text-ui-xs text-theme-text-muted mt-0 mb-4 max-w-[280px] leading-[1.4]">
          {subtitle}
        </p>
      )}
      {actionLabel && onActionClick && (
        <Button variant="primary" size="sm" onClick={onActionClick}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
