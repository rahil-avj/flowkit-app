import { cn } from '@flowkit-kit/lib/utils'

export interface Card {
  rank: string
  suit: '♠' | '♥' | '♦' | '♣'
}

interface PlayingCardProps {
  card: Card
  faceDown?: boolean
  /** Staggers the deal-in animation — index of this card within its hand. */
  dealIndex?: number
}

export default function PlayingCard({ card, faceDown, dealIndex = 0 }: PlayingCardProps) {
  const isRed = card.suit === '♥' || card.suit === '♦'
  const dealStyle = {
    animation: 'card-deal-in 220ms ease-out backwards',
    animationDelay: `${dealIndex * 90}ms`,
  }

  return (
    <div className="w-12 h-16 perspective-[400px]" style={dealStyle}>
      <div
        className="relative w-full h-full transition-transform duration-300 transform-3d"
        style={{ transform: faceDown ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
      >
        <div
          className="absolute inset-0 rounded-md shadow-theme-card backface-hidden"
          style={{ background: 'var(--card-back)' }}
        />
        <div
          className="absolute inset-0 rounded-md shadow-theme-card flex flex-col items-center justify-center gap-0.5 backface-hidden"
          style={{ background: 'var(--card-face-bg)', transform: 'rotateY(180deg)' }}
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
      </div>
    </div>
  )
}
