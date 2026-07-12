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

export class ValidationError extends Error {}

const KEBAB_RE = /^[a-z][a-z0-9-]*$/
const PASCAL_RE = /^[A-Z][A-Za-z0-9]+$/

export function assertKebab(value, label = 'name') {
  if (!value || !KEBAB_RE.test(value)) {
    throw new ValidationError(`${label} '${value}' must be kebab-case (e.g. sign-in)`)
  }
  return value
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
