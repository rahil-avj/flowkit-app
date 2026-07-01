#!/usr/bin/env node
// ── flowkit promote: extract a fork → its own Flowplan ──────────────────────────
//
// Phase-1 "merge/slice" pipeline (cuttable, dev-only). Takes a flowplan file and a
// fork label; writes a NEW flowplan whose steps are the fork's steps, and prints
// the exact one-line ref edit to apply in the source. It does NOT rewrite the
// hand-authored source in place (safe by design — see the plan).
//
// Usage:
//   node scripts/flowkit-promote.mjs <flowplanFile> "<Fork label>" [newId]
//   e.g. node scripts/flowkit-promote.mjs \
//          workspaces/flowtest/projects/shop/flowplans/Checkout.ts "Empty cart"
//
// Limitations (documented, not hidden):
//   • Matches the fork by its `label:` string and extracts the balanced `steps: [..]`
//     that follows within that fork object. Author applies the ref replacement.
//   • For deeply nested / unusual formatting, review the generated file before use.

import fs from 'fs'
import path from 'path'

const r = s => `\x1b[31m${s}\x1b[0m`
const g = s => `\x1b[32m${s}\x1b[0m`
const c = s => `\x1b[36m${s}\x1b[0m`

function die(msg) {
  console.error(r(`✗ ${msg}`))
  process.exit(1)
}

const [, , fileArg, forkLabel, newIdArg] = process.argv
if (!fileArg || !forkLabel) {
  die('Usage: node scripts/flowkit-promote.mjs <flowplanFile> "<Fork label>" [newId]')
}

const filePath = path.resolve(process.cwd(), fileArg)
if (!fs.existsSync(filePath)) die(`File not found: ${fileArg}`)
const src = fs.readFileSync(filePath, 'utf8')

// ── Locate the fork object by its label, then the balanced steps:[ … ] array ────

const labelMarker = `label: "${forkLabel}"`
const labelIdx = src.indexOf(labelMarker)
if (labelIdx === -1) die(`No fork with label: "${forkLabel}" found in ${fileArg}`)

// Find "steps:" after the label, then capture the balanced [ … ].
const stepsKwIdx = src.indexOf('steps:', labelIdx)
if (stepsKwIdx === -1) die(`Fork "${forkLabel}" has no steps: array`)
const openBracket = src.indexOf('[', stepsKwIdx)
if (openBracket === -1) die(`Could not find steps array opening for "${forkLabel}"`)

let depth = 0
let end = -1
for (let i = openBracket; i < src.length; i++) {
  const ch = src[i]
  if (ch === '[') depth++
  else if (ch === ']') {
    depth--
    if (depth === 0) {
      end = i
      break
    }
  }
}
if (end === -1) die(`Unbalanced steps array for fork "${forkLabel}"`)

const stepsBody = src.slice(openBracket + 1, end).trim()

// ── Derive the new flowplan id + file name ──────────────────────────────────────

const slug = (newIdArg || forkLabel)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
const newId = newIdArg || `${slug}-flow`
const pascal = slug
  .split('-')
  .filter(Boolean)
  .map(w => w[0].toUpperCase() + w.slice(1))
  .join('')
const newFileName = `${pascal}.ts`
const newFilePath = path.join(path.dirname(filePath), newFileName)

if (fs.existsSync(newFilePath))
  die(`Target already exists: ${path.relative(process.cwd(), newFilePath)}`)

// ── Write the new flowplan ──────────────────────────────────────────────────────

const newFlow = `import { defineFlow } from "@platform/core/config";

// Promoted from "${forkLabel}" fork in ${path.basename(filePath)} via flowkit-promote.
export default defineFlow({
  id: "${newId}",
  name: "${forkLabel}",
  steps: [
${stepsBody
  .split('\n')
  .map(l => (l.trim() ? `    ${l.trim()}` : ''))
  .join('\n')}
  ],
});
`

fs.writeFileSync(newFilePath, newFlow, 'utf8')

// ── Report + print the ref edit for the author to apply ─────────────────────────

console.log(g(`✓ wrote ${path.relative(process.cwd(), newFilePath)}  (id: ${newId})`))
console.log('')
console.log(
  c(`Next — in ${path.basename(filePath)}, replace the "${forkLabel}" fork with a reference:`)
)
console.log(`
  forks: [
    {
      label: "${forkLabel}",
      // ...keep the fork's db condition if any...
      steps: [{ ref: "${newId}" }],
    },
  ],
`)
console.log(c('Or, to inline it as a plain step instead of a fork, use:  { ref: "' + newId + '" }'))
console.log('')
console.log('Then verify:  npx tsc -b  &&  npx vitest run')
