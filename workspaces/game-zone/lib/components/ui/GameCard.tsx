interface GameCardProps {
  id?: string
  title: string
  icon: string
  blurb: string
  onClick?: () => void
}

export default function GameCard({ id, title, icon, blurb, onClick }: GameCardProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      className="flex flex-col items-start gap-1.5 p-3 rounded-[10px] bg-theme-surface shadow-theme-card text-left hover:bg-theme-hover transition-colors duration-150"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-ui-sm font-semibold text-theme-text-primary">{title}</span>
      <span className="text-ui-xs text-theme-text-muted">{blurb}</span>
    </button>
  )
}
