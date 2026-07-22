export interface MemoryCard {
  id: number
  symbol: string
  matched: boolean
}

const SYMBOLS = ['🍎', '🍋', '🍇', '🍉', '🍓', '🍒', '🍑', '🥝']

/** 4x4 board: 8 symbol pairs, shuffled. */
export function newBoard(): MemoryCard[] {
  const pairs = SYMBOLS.flatMap((symbol, i) => [
    { id: i * 2, symbol, matched: false },
    { id: i * 2 + 1, symbol, matched: false },
  ])
  return shuffle(pairs)
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function isMatch(cards: MemoryCard[], a: number, b: number): boolean {
  return cards[a].symbol === cards[b].symbol
}

export function isComplete(cards: MemoryCard[]): boolean {
  return cards.every(c => c.matched)
}
