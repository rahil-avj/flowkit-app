import { defineFlow } from '@flowkit-core/config'

export default defineFlow({
  id: 'journey-check-memory-high-score',
  name: 'Check High Score in Memory Match',
  description: 'Open Memory Match and view the best-moves/best-time high scores screen.',

  steps: [
    { screenId: 'hub-screen', on: 'game-memory-match', actionNote: 'Taps the Memory Match card' },
    {
      screenId: 'memory-match-game-screen',
      on: 'view-high-scores',
      actionNote: 'Opens the high scores screen',
    },
    { screenId: 'memory-match-high-scores-screen', actionNote: 'Reviews best moves and best time' },
  ],
})
