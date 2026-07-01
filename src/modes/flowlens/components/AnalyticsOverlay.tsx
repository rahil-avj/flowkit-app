import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

interface Props {
  title: string
  subtitle?: string
  onClose: () => void
  /** Optional control rendered in the header, before the Close button (e.g. an export menu). */
  headerAction?: ReactNode
  children: ReactNode
}

/**
 * Full-screen overlay that floats above the FlowLens canvas — for space-hungry
 * analytics (heatmap, funnel) per the FlowKit "overlay with full screens" model.
 */
export default function AnalyticsOverlay({
  title,
  subtitle,
  onClose,
  headerAction,
  children,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-60 bg-theme-base flex flex-col pointer-events-auto animate-[flowlens-overlay-in_0.18s_ease]"
    >
      <div className="h-12 shrink-0 border-b border-theme-border flex items-center px-4 gap-2.5">
        <div className="flex flex-col">
          <span className="text-ui-sm font-semibold text-theme-text-primary">{title}</span>
          {subtitle && <span className="text-ui-2xs text-theme-text-muted">{subtitle}</span>}
        </div>
        <div className="flex-1" />
        {headerAction}
        <button
          onClick={onClose}
          className="bg-theme-elevated border border-theme-border rounded-[6px] text-theme-text-secondary cursor-pointer py-1.5 px-2.5 flex items-center gap-1.5 text-ui-xs"
        >
          <X size={13} /> Close
        </button>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
