// Workspace mock database — all runtime state lives here.
// Named exports are loaded into the platform db object on startup.
// Reset via the simulator's "Reset Database" button.

export const user = {
  id: 'usr_001',
  name: 'Demo Player',
  email: 'demo@example.com',
  plan: 'Free',
}

export const blackjack = {
  bankroll: 500,
}

export const dice = {
  bankroll: 500,
  forcedRoll: 'none',
}

export const ticTacToe = {
  sessionTally: { x: 0, o: 0, draws: 0 },
}

export const mathQuiz = {
  difficulty: 'easy',
}

// twentyFortyEight.best, memoryMatch.bestMoves/bestTimeMs, and mathQuiz.score
// are intentionally NOT seeded here — canEnter guards on the 2048 and Memory
// Match high-scores screens check db.has('highScores.twentyFortyEight') /
// db.has('highScores.memoryMatch.bestMoves'); those paths must be absent
// until the player's first game writes them via db.update().
