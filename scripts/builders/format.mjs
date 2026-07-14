#!/usr/bin/env node
// Runs prettier --write and reports per-file line changes + a summary.
import { execSync, spawnSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// Snapshot all tracked file contents before formatting
const trackedFiles = execSync('git ls-files', { cwd: root })
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean)

const before = new Map()
for (const rel of trackedFiles) {
  const abs = resolve(root, rel)
  if (existsSync(abs)) {
    before.set(rel, readFileSync(abs, 'utf8'))
  }
}

// Run prettier
const result = spawnSync('npx', ['prettier', '--write', '.'], {
  cwd: root,
  stdio: ['inherit', 'pipe', 'inherit'],
  encoding: 'utf8',
})
if (result.status !== 0) process.exit(result.status)

// Diff each file and collect stats
const changed = []
for (const [rel, beforeContent] of before) {
  const abs = resolve(root, rel)
  if (!existsSync(abs)) continue
  const afterContent = readFileSync(abs, 'utf8')
  if (beforeContent === afterContent) continue

  const beforeLines = beforeContent.split('\n').length
  const afterLines = afterContent.split('\n').length
  const delta = afterLines - beforeLines
  changed.push({ rel, beforeLines, afterLines, delta })
}

if (changed.length === 0) {
  console.log('\n✓ All files already formatted — nothing changed.')
  process.exit(0)
}

// Sort by absolute line change descending
changed.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

// Cap file column at 72 chars; truncate paths with an ellipsis if needed
const MAX_FILE_COL = 72
const rawColW = Math.max(...changed.map(f => f.rel.length)) + 2
const colW = Math.min(MAX_FILE_COL, rawColW)

const truncate = str => (str.length > colW - 1 ? '…' + str.slice(-(colW - 2)) : str)

// Column widths derived from widest possible value so header and data always agree
const COL_BEFORE = Math.max(8, String(Math.max(...changed.map(f => f.beforeLines))).length + 2)
const COL_AFTER = Math.max(7, String(Math.max(...changed.map(f => f.afterLines))).length + 2)
const COL_CHANGE = Math.max(
  7,
  Math.max(...changed.map(f => String(f.delta > 0 ? '+' + f.delta : f.delta).length)) + 2
)
const totalW = colW + COL_BEFORE + COL_AFTER + COL_CHANGE

console.log()
console.log(
  'File'.padEnd(colW) +
    'Before'.padStart(COL_BEFORE) +
    'After'.padStart(COL_AFTER) +
    'Change'.padStart(COL_CHANGE)
)
console.log('─'.repeat(totalW))

let totalBefore = 0
let totalAfter = 0

for (const { rel, beforeLines, afterLines, delta } of changed) {
  totalBefore += beforeLines
  totalAfter += afterLines
  const sign = delta > 0 ? '+' : ''
  const deltaStr = delta === 0 ? '—' : `${sign}${delta}`
  console.log(
    truncate(rel).padEnd(colW) +
      String(beforeLines).padStart(COL_BEFORE) +
      String(afterLines).padStart(COL_AFTER) +
      deltaStr.padStart(COL_CHANGE)
  )
}

const totalDelta = totalAfter - totalBefore
const sign = totalDelta > 0 ? '+' : ''
const deltaLabel =
  totalDelta === 0
    ? 'no line count change'
    : totalDelta > 0
      ? `${totalDelta} line${totalDelta === 1 ? '' : 's'} added`
      : `${Math.abs(totalDelta)} line${Math.abs(totalDelta) === 1 ? '' : 's'} removed`

console.log('─'.repeat(totalW))
console.log(
  `${changed.length} file${changed.length === 1 ? '' : 's'} changed`.padEnd(colW) +
    String(totalBefore).padStart(COL_BEFORE) +
    String(totalAfter).padStart(COL_AFTER) +
    `${sign}${totalDelta}`.padStart(COL_CHANGE)
)
console.log(`\n  ${deltaLabel}`)
console.log()
