import { type Card, handValue, isBust } from './deck'

export type BlackjackResult = 'player-blackjack' | 'player-win' | 'dealer-win' | 'push' | null

/** Dealer hits until a hard 17+ (or any soft total >= 17 — dealer never hits a soft 17+). */
export function dealerShouldHit(hand: Card[]): boolean {
  return handValue(hand).value < 17
}

/** Resolves a finished hand (both player and dealer done acting). */
export function resolveHand(playerHand: Card[], dealerHand: Card[]): BlackjackResult {
  const playerBust = isBust(playerHand)
  const dealerBust = isBust(dealerHand)
  const playerBJ = playerHand.length === 2 && handValue(playerHand).value === 21
  const dealerBJ = dealerHand.length === 2 && handValue(dealerHand).value === 21

  if (playerBust) return 'dealer-win'
  if (dealerBust) return 'player-win'
  if (playerBJ && dealerBJ) return 'push'
  if (playerBJ) return 'player-blackjack'
  if (dealerBJ) return 'dealer-win'

  const playerValue = handValue(playerHand).value
  const dealerValue = handValue(dealerHand).value
  if (playerValue > dealerValue) return 'player-win'
  if (playerValue < dealerValue) return 'dealer-win'
  return 'push'
}

/** Net bankroll delta for a resolved hand given the bet — blackjack pays 3:2, push returns the bet. */
export function payout(result: BlackjackResult, bet: number): number {
  switch (result) {
    case 'player-blackjack':
      return Math.floor(bet * 1.5)
    case 'player-win':
      return bet
    case 'dealer-win':
      return -bet
    case 'push':
    default:
      return 0
  }
}
