import { cn } from '@flowkit-kit/lib/utils'

interface ScoreBadgeProps {
  label: string
  value: string | number
  tone?: 'default' | 'green' | 'red' | 'amber'
}

const TONE_CLASSES: Record<NonNullable<ScoreBadgeProps['tone']>, string> = {
  default: 'text-theme-text-primary',
  green: 'text-theme-green',
  red: 'text-theme-red',
  amber: 'text-theme-amber',
}

export default function ScoreBadge({ label, value, tone = 'default' }: ScoreBadgeProps) {
  return (
    <div className="flex flex-col items-center px-2 py-1 rounded-[6px] bg-theme-surface">
      <span className="text-ui-2xs uppercase tracking-[0.04em] text-theme-text-muted">{label}</span>
      <span className={cn('text-ui-md font-bold', TONE_CLASSES[tone])}>{value}</span>
    </div>
  )
}
