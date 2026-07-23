// Authoring command: extracts a flowStory fork into its own standalone flowStory file.
import fs from 'fs'
import path from 'path'
import { parseStringFlag } from '../helpers/args.js'
import { resolveWorkspace } from '../helpers/workspace-resolve.js'
import { workspacePath, assertScopedWorkspaceDir, resolveDefineImport } from '../helpers/paths.js'
import {
  assertKebab,
  assertWithinWorkspace,
  asJsStringLiteral,
  ValidationError,
} from '../helpers/validate.js'
import { g, r, c, d } from '../helpers/colors.js'

// Phase-1 "merge/slice" pipeline. Takes a flowStory file and a fork label; writes a
// NEW flowStory whose steps are the fork's steps, and prints the exact one-line ref
// edit to apply in the source. It does NOT rewrite the hand-authored source in place
// (safe by design — see the plan).
//
// Limitations (documented, not hidden):
//   • Matches the fork by its `label:` string and extracts the balanced `steps: [..]`
//     that follows within that fork object. Author applies the ref replacement.
//   • For deeply nested / unusual formatting, review the generated file before use.

export async function cmdPromoteChapter(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)

  const fileArg = parseStringFlag(args, 'flowStory')
  const forkLabel = parseStringFlag(args, 'fork')
  const newIdArg = parseStringFlag(args, 'as')

  if (!fileArg || !forkLabel) {
    console.error(r('✗ --flowStory:<path> and --fork:"<Fork label>" are required'))
    console.error(
      d(
        '  Example: flowkit promote:chapter --flowStory:flowStories/Checkout.ts --fork:"Empty cart" --as:empty-cart-flow'
      )
    )
    process.exit(1)
  }

  // assertWithinWorkspace rejects both `../`-style traversal AND absolute
  // paths outside the workspace — path.resolve(wsDir, absolutePath) ignores
  // wsDir entirely for an absolute second argument, so the same check covers
  // both branches of the ternary below without needing to special-case either.
  try {
    assertWithinWorkspace(wsDir, fileArg, '--flowStory')
  } catch (e) {
    if (e instanceof ValidationError) {
      console.error(r(`✗ ${e.message}`))
      process.exit(1)
    }
    throw e
  }

  const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(wsDir, fileArg)
  if (!fs.existsSync(filePath)) {
    console.error(r(`✗ File not found: ${fileArg}`))
    process.exit(1)
  }
  const src = fs.readFileSync(filePath, 'utf8')

  // ── Locate the fork object by its label, then the balanced steps:[ … ] array ──

  // Tolerate single, double, or backtick quotes and flexible spacing around
  // the colon — hand-authored flowStories aren't guaranteed to use one style.
  const escapedLabel = forkLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const labelRe = new RegExp(`label\\s*:\\s*['"\`]${escapedLabel}['"\`]`)
  const labelMatch = src.match(labelRe)
  if (!labelMatch) {
    console.error(r(`✗ No fork with label: "${forkLabel}" found in ${fileArg}`))
    process.exit(1)
  }
  const labelIdx = labelMatch.index

  const stepsKwIdx = src.indexOf('steps:', labelIdx)
  if (stepsKwIdx === -1) {
    console.error(r(`✗ Fork "${forkLabel}" has no steps: array`))
    process.exit(1)
  }
  const openBracket = src.indexOf('[', stepsKwIdx)
  if (openBracket === -1) {
    console.error(r(`✗ Could not find steps array opening for "${forkLabel}"`))
    process.exit(1)
  }

  // Bracket-depth scan, skipping over string/template literals and comments
  // so a `[`/`]` character quoted inside a step's text (e.g. an actionNote
  // like "Tap [Continue]") doesn't throw off the balance count.
  let depth = 0
  let end = -1
  let quote = null // active string/template delimiter, or null
  for (let i = openBracket; i < src.length; i++) {
    const ch = src[i]
    const next = src[i + 1]

    if (quote) {
      if (ch === '\\')
        i++ // skip escaped char inside the string
      else if (ch === quote) quote = null
      continue
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      continue
    }
    if (ch === '/' && next === '/') {
      i = src.indexOf('\n', i)
      if (i === -1) break
      continue
    }
    if (ch === '/' && next === '*') {
      const close = src.indexOf('*/', i + 2)
      if (close === -1) break
      i = close + 1
      continue
    }

    if (ch === '[') depth++
    else if (ch === ']') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) {
    console.error(r(`✗ Unbalanced steps array for fork "${forkLabel}"`))
    process.exit(1)
  }

  const stepsBody = src.slice(openBracket + 1, end).trim()

  // ── Derive the new flowStory id + file name ──────────────────────────────────

  const slug = (newIdArg || forkLabel)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  let newId = newIdArg || `${slug}-flow`
  try {
    newId = assertKebab(newId, '--as')
  } catch (e) {
    if (e instanceof ValidationError) {
      console.error(r(`✗ ${e.message}`))
      process.exit(1)
    }
    throw e
  }
  const pascal = slug
    .split('-')
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join('')
  const newFileName = `${pascal}.ts`
  const newFilePath = path.join(path.dirname(filePath), newFileName)

  if (fs.existsSync(newFilePath)) {
    console.error(r(`✗ Target already exists: ${path.relative(wsDir, newFilePath)}`))
    process.exit(1)
  }

  // ── Write the new flowStory ────────────────────────────────────────────────────

  const forkLabelLiteral = asJsStringLiteral(forkLabel)
  const newFlow = `${resolveDefineImport('defineFlow')};

// Promoted from ${forkLabelLiteral} fork in ${path.basename(filePath)} via promote:chapter.
export default defineFlow({
  id: ${asJsStringLiteral(newId)},
  name: ${forkLabelLiteral},
  steps: [
${stepsBody
  .split('\n')
  .map(l => (l.trim() ? `    ${l.trim()}` : ''))
  .join('\n')}
  ],
});
`

  fs.writeFileSync(newFilePath, newFlow, 'utf8')

  // ── Report + print the ref edit for the author to apply ──────────────────────

  console.log(g(`✓ wrote ${path.relative(wsDir, newFilePath)}  (id: ${newId})`))
  console.log('')
  console.log(
    c(`Next — in ${path.basename(filePath)}, replace the "${forkLabel}" fork with a reference:`)
  )
  console.log(`
  forks: [
    {
      label: ${forkLabelLiteral},
      // ...keep the fork's db condition if any...
      steps: [{ ref: ${asJsStringLiteral(newId)} }],
    },
  ],
`)
  console.log(
    c(
      'Or, to inline it as a plain step instead of a fork, use:  { ref: ' +
        asJsStringLiteral(newId) +
        ' }'
    )
  )
  console.log('')
  console.log('Then verify:  npx tsc -b  &&  npx vitest run')
}
