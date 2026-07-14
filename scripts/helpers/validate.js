// Shared validation for CLI-supplied identifiers and free-text that will be
// interpolated into generated file paths or generated source code.
//
// Every authoring/ command pulls raw strings out of parseStringFlag() (args.js),
// which does no validation at all — each command is individually responsible
// for checking what it extracts before using it. In practice that responsibility
// was applied inconsistently: --name flags got kebab/pascal validation, but
// --path, --barrel, --label, --fork, and --as did not, allowing path traversal
// (create:component --path:../../../etc) and generated-source injection
// (create:screen --label:"x'; malicious code; '") via ordinary CLI flags. This
// module is the one shared chokepoint every such flag should go through instead
// of each command re-deriving its own regex or skipping validation entirely.
import path from 'path'
import { toKebab } from './strings.js'
import { d } from './colors.js'

export class ValidationError extends Error {}

const KEBAB_RE = /^[a-z][a-z0-9-]*$/
const PASCAL_RE = /^[A-Z][A-Za-z0-9]+$/

/**
 * Validates a user-supplied identifier is kebab-case, forgiving common
 * near-misses (extra whitespace, mixed case, underscores, stray punctuation)
 * by normalizing via toKebab() first rather than hard-rejecting them. Only
 * throws if the normalized result is still invalid (e.g. empty, or starts
 * with a digit) — that's a genuinely unusable name, not a typo to correct.
 *
 * Always returns the value to use going forward — callers must reassign
 * their variable to the return value (`id = assertKebab(id)`), since the
 * normalized form may differ from what was typed. A one-line notice is
 * printed when the change is structural (case folded, underscore/space
 * turned into a hyphen, punctuation stripped) so it's never silent — but a
 * plain leading/trailing whitespace trim stays quiet, matching how trimming
 * already behaves invisibly everywhere else in this CLI.
 */
export function assertKebab(value, label = 'name') {
  const trimmed = (value ?? '').trim()
  const normalized = toKebab(value)
  if (!KEBAB_RE.test(normalized)) {
    throw new ValidationError(`${label} '${value}' must be kebab-case (e.g. sign-in)`)
  }
  if (normalized !== trimmed) {
    console.log(d(`  i using '${normalized}' (normalized from '${value}')`))
  }
  return normalized
}

export function assertPascal(value, label = 'name') {
  if (!value || !PASCAL_RE.test(value)) {
    throw new ValidationError(`${label} '${value}' must be PascalCase (e.g. StatusBadge)`)
  }
  return value
}

/**
 * Guards any user-supplied relative path segment that will be joined onto a
 * workspace directory before being written to or read from disk. Resolves the
 * join and rejects if the result would land outside wsDir — the only reliable
 * way to stop `../../../etc`-style traversal, since string-level checks for
 * ".." are trivially bypassed by absolute paths or encoded separators.
 */
export function assertWithinWorkspace(wsDir, relPath, label = 'path') {
  if (!relPath) throw new ValidationError(`${label} is required`)
  const wsResolved = path.resolve(wsDir)
  const resolved = path.resolve(wsDir, relPath)
  if (resolved !== wsResolved && !resolved.startsWith(wsResolved + path.sep)) {
    throw new ValidationError(`${label} '${relPath}' resolves outside the workspace`)
  }
  return relPath
}

/**
 * Safely embeds an arbitrary string as a JS string literal in generated source.
 * Use this instead of hand-rolled template-literal interpolation (`'${value}'`)
 * for any value that didn't come from assertKebab/assertPascal — JSON.stringify
 * is the only reliably-correct way to escape quotes, backslashes, and newlines
 * for embedding in JS source.
 */
export function asJsStringLiteral(value) {
  return JSON.stringify(value ?? '')
}
