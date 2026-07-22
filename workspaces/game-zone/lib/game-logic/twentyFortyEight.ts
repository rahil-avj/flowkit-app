export type Grid = number[][] // 0 = empty
export type Direction = 'up' | 'down' | 'left' | 'right'

const SIZE = 4

export function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function emptyCells(grid: Grid): [number, number][] {
  const cells: [number, number][] = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) cells.push([r, c])
    }
  }
  return cells
}

/** Spawns a 2 (90%) or 4 (10%) in a random empty cell. Returns a new grid. */
export function spawnTile(grid: Grid): Grid {
  const cells = emptyCells(grid)
  if (cells.length === 0) return grid
  const [r, c] = cells[Math.floor(Math.random() * cells.length)]
  const next = grid.map(row => [...row])
  next[r][c] = Math.random() < 0.9 ? 2 : 4
  return next
}

function rotateCW(grid: Grid): Grid {
  const next = emptyGrid()
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      next[c][SIZE - 1 - r] = grid[r][c]
    }
  }
  return next
}

function rotateCCW(grid: Grid): Grid {
  const next = emptyGrid()
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      next[SIZE - 1 - c][r] = grid[r][c]
    }
  }
  return next
}

/** Slides+merges one row toward index 0 (left). Each tile merges at most once. */
function slideRowLeft(row: number[]): { row: number[]; gained: number } {
  const values = row.filter(v => v !== 0)
  const result: number[] = []
  let gained = 0
  for (let i = 0; i < values.length; i++) {
    if (values[i] === values[i + 1]) {
      const merged = values[i] * 2
      result.push(merged)
      gained += merged
      i++
    } else {
      result.push(values[i])
    }
  }
  while (result.length < SIZE) result.push(0)
  return { row: result, gained }
}

/**
 * Applies a move in the given direction. "up"/"down" rotate the grid so the
 * target direction becomes "slide left" along rows, slide, then rotate back —
 * up rotates CCW (top edge becomes the left edge), down rotates CW.
 */
export function move(
  grid: Grid,
  direction: Direction
): { grid: Grid; gained: number; moved: boolean } {
  let rows: number[][]
  if (direction === 'left') {
    rows = grid
  } else if (direction === 'right') {
    rows = grid.map(row => [...row].reverse())
  } else if (direction === 'up') {
    rows = rotateCCW(grid)
  } else {
    rows = rotateCW(grid)
  }

  let gained = 0
  const slidRows = rows.map(row => {
    const { row: newRow, gained: rowGained } = slideRowLeft(row)
    gained += rowGained
    return newRow
  })

  let result: Grid
  if (direction === 'left') {
    result = slidRows
  } else if (direction === 'right') {
    result = slidRows.map(row => [...row].reverse())
  } else if (direction === 'up') {
    result = rotateCW(slidRows)
  } else {
    result = rotateCCW(slidRows)
  }

  const moved = result.some((row, r) => row.some((v, c) => v !== grid[r][c]))
  return { grid: result, gained, moved }
}

export function hasWon(grid: Grid): boolean {
  return grid.some(row => row.some(v => v >= 2048))
}

export function hasMovesLeft(grid: Grid): boolean {
  if (emptyCells(grid).length > 0) return true
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c]
      if (c + 1 < SIZE && grid[r][c + 1] === v) return true
      if (r + 1 < SIZE && grid[r + 1][c] === v) return true
    }
  }
  return false
}
