import { cn } from '@flowkit-kit/lib/utils'

export interface Card {
  rank: string
  suit: '♠' | '♥' | '♦' | '♣'
}

interface PlayingCardProps {
  card: Card
  faceDown?: boolean
}

export default function PlayingCard({ card, faceDown }: PlayingCardProps) {
  if (faceDown) {
    return (
      <div
        className="w-12 h-16 rounded-[6px] shadow-theme-card"
        style={{ background: 'var(--card-back)' }}
      />
    )
  }

  const isRed = card.suit === '♥' || card.suit === '♦'

  return (
    <div
      className="w-12 h-16 rounded-[6px] shadow-theme-card flex flex-col items-center justify-center gap-0.5"
      style={{ background: 'var(--card-face-bg)' }}
    >
      <span
        className={cn('text-ui-sm font-bold')}
        style={{ color: isRed ? 'var(--card-suit-red)' : 'var(--card-suit-black)' }}
      >
        {card.rank}
      </span>
      <span style={{ color: isRed ? 'var(--card-suit-red)' : 'var(--card-suit-black)' }}>
        {card.suit}
      </span>
    </div>
  )
}
