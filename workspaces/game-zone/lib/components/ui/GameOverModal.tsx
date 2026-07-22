import { Z } from '@flowkit-shared/constants/zIndex'

import PrimaryButton from './PrimaryButton'

interface GameOverModalProps {
  open: boolean
  title: string
  message: string
  onPlayAgain?: () => void
  /** Label for the primary action button. Default: "Play Again". */
  primaryLabel?: string
  onBackToHub?: () => void
}

export default function GameOverModal({
  open,
  title,
  message,
  onPlayAgain,
  primaryLabel = 'Play Again',
  onBackToHub,
}: GameOverModalProps) {
  if (!open) return null

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black/50 p-4"
      style={{ zIndex: Z.modal }}
    >
      <div className="w-full max-w-xs rounded-xl bg-theme-elevated shadow-theme-float p-4 flex flex-col gap-3">
        <h2 className="text-ui-xl font-bold text-theme-text-primary text-center">{title}</h2>
        <p className="text-ui-sm text-theme-text-secondary text-center">{message}</p>
        <div className="flex flex-col gap-2 mt-1">
          {onPlayAgain && (
            <PrimaryButton id="play-again" onClick={onPlayAgain}>
              {primaryLabel}
            </PrimaryButton>
          )}
          {onBackToHub && (
            <PrimaryButton id="back-to-hub" variant="danger" onClick={onBackToHub}>
              Back to Hub
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  )
}
