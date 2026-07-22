import IconButton from './IconButton'

interface SectionHeaderProps {
  title: string
  onBack?: () => void
  backId?: string
}

export default function SectionHeader({ title, onBack, backId }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-4 h-12 border-b border-theme-border-subtle shrink-0">
      {onBack && (
        <IconButton
          id={backId}
          icon={<span className="text-ui-md">‹</span>}
          label="Back"
          onClick={onBack}
        />
      )}
      <span className="text-ui-md font-medium text-theme-text-primary">{title}</span>
    </div>
  )
}
