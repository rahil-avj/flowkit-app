export type Suit = '♠' | '♥' | '♦' | '♣'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  rank: Rank
  suit: Suit
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export function freshDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

export function shuffle(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/** Draws `count` cards off the top of `deck`. Returns the drawn cards and the remaining deck. */
export function deal(deck: Card[], count: number): { drawn: Card[]; remaining: Card[] } {
  return { drawn: deck.slice(0, count), remaining: deck.slice(count) }
}

/** Best blackjack value for a hand, treating aces as 11 or 1 (soft/hard). */
export function handValue(hand: Card[]): { value: number; soft: boolean } {
  let value = 0
  let aces = 0
  for (const card of hand) {
    if (card.rank === 'A') {
      aces += 1
      value += 11
    } else if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
      value += 10
    } else {
      value += Number(card.rank)
    }
  }
  let soft = aces > 0
  while (value > 21 && aces > 0) {
    value -= 10
    aces -= 1
  }
  if (aces === 0) soft = false
  return { value, soft }
}

export function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && handValue(hand).value === 21
}

export function isBust(hand: Card[]): boolean {
  return handValue(hand).value > 21
}
