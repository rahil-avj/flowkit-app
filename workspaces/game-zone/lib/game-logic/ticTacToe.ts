export type Player = 'X' | 'O'
export type Cell = Player | null
export type Board = Cell[]

export const WIN_LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diagonals
]

export function emptyBoard(): Board {
  return Array(9).fill(null)
}

export function getWinner(board: Board): Player | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }
  return null
}

export function isDraw(board: Board): boolean {
  return board.every(cell => cell !== null) && getWinner(board) === null
}
