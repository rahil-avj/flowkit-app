export type DicePhase = 'come-out' | 'point' | 'resolved'
export type DiceResult = 'win' | 'lose' | null

export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1
}

export function rollTwo(forced?: number): [number, number, number] {
  if (forced !== undefined && forced >= 2 && forced <= 12) {
    return splitTotal(forced)
  }
  const a = rollDie()
  const b = rollDie()
  return [a, b, a + b]
}

// Splits a forced total into two plausible dice faces (1-6 each).
function splitTotal(total: number): [number, number, number] {
  const lo = Math.max(1, total - 6)
  const hi = Math.min(6, total - 1)
  const first = lo + Math.floor(Math.random() * (hi - lo + 1))
  return [first, total - first, total]
}

/** Come-out roll resolution: 7/11 = instant win, 2/3/12 = instant loss, else establish a point. */
export function resolveComeOut(total: number): { result: DiceResult; establishesPoint: boolean } {
  if (total === 7 || total === 11) return { result: 'win', establishesPoint: false }
  if (total === 2 || total === 3 || total === 12) return { result: 'lose', establishesPoint: false }
  return { result: null, establishesPoint: true }
}

/** Point-phase resolution: matching the point wins, a 7 ("seven-out") loses, else re-roll. */
export function resolvePoint(total: number, point: number): DiceResult {
  if (total === point) return 'win'
  if (total === 7) return 'lose'
  return null
}
