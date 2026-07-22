export type Difficulty = 'easy' | 'medium' | 'hard'
export type Operator = '+' | '-' | '×' | '÷'

export interface Equation {
  text: string
  correctAnswer: number
}

const OPERATORS_BY_DIFFICULTY: Record<Difficulty, Operator[]> = {
  easy: ['+', '-'],
  medium: ['+', '-', '×'],
  hard: ['+', '-', '×', '÷'],
}

const OPERAND_COUNT: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function applyOp(a: number, op: Operator, b: number): number {
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '×':
      return a * b
    case '÷':
      return a / b
  }
}

/** Generates an equation whose length/operator mix scales with difficulty. */
export function generateEquation(difficulty: Difficulty): Equation {
  const operatorCount = OPERAND_COUNT[difficulty]
  const availableOps = OPERATORS_BY_DIFFICULTY[difficulty]
  const maxOperand = difficulty === 'easy' ? 12 : difficulty === 'medium' ? 15 : 20

  let value = randomInt(2, maxOperand)
  let text = String(value)

  for (let i = 0; i < operatorCount; i++) {
    const op = availableOps[randomInt(0, availableOps.length - 1)]
    let operand = randomInt(2, maxOperand)

    // Clean division only: pick an operand that evenly divides the running value.
    if (op === '÷') {
      const divisors = divisorsOf(value)
      if (divisors.length === 0) {
        // no clean divisor available — fall back to addition for this step
        text += ` + ${operand}`
        value += operand
        continue
      }
      operand = divisors[randomInt(0, divisors.length - 1)]
    }

    text += ` ${op} ${operand}`
    value = applyOp(value, op, operand)
  }

  return { text, correctAnswer: value }
}

function divisorsOf(n: number): number[] {
  const divisors: number[] = []
  for (let d = 2; d <= Math.abs(n); d++) {
    if (n % d === 0) divisors.push(d)
  }
  return divisors
}

/**
 * Generates `count` wrong answers as round(correct * (1 + offsetPct)) for
 * varied offsets, with a dedupe/collision guard (reject a candidate equal to
 * the correct answer or an already-chosen wrong answer, retry with a new
 * offset) and a zero-guard (percentage offsets degenerate to 0 when
 * correctAnswer === 0 — fall back to fixed additive offsets in that case).
 */
export function generateWrongAnswers(correctAnswer: number, count: number): number[] {
  const wrongAnswers = new Set<number>()
  const percentOffsets = [-0.5, -0.3, -0.15, 0.15, 0.3, 0.5, 0.75, -0.75]
  // Additive fallback — needed whenever correctAnswer is small enough (including
  // 0) that percentage offsets round back to the same value or collide with
  // each other, not just the exact correctAnswer === 0 case.
  const additiveOffsets = [-3, -2, -1, 1, 2, 3, 4, -4, 5, -5, 6, -6]

  let percentIndex = 0
  while (wrongAnswers.size < count && percentIndex < percentOffsets.length) {
    const candidate = Math.round(correctAnswer * (1 + percentOffsets[percentIndex]))
    percentIndex++
    if (candidate === correctAnswer || wrongAnswers.has(candidate)) continue
    wrongAnswers.add(candidate)
  }

  let additiveIndex = 0
  while (wrongAnswers.size < count && additiveIndex < additiveOffsets.length) {
    const candidate = correctAnswer + additiveOffsets[additiveIndex]
    additiveIndex++
    if (candidate === correctAnswer || wrongAnswers.has(candidate)) continue
    wrongAnswers.add(candidate)
  }

  return [...wrongAnswers]
}

/** Full set of options (correct + wrong answers) in randomized order. */
export function generateOptions(correctAnswer: number): number[] {
  const wrong = generateWrongAnswers(correctAnswer, 3)
  const options = [correctAnswer, ...wrong]
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return options
}
