// Shared screen/flow path-identity logic, used by both repo mode
// (src/shared/utils/useWorkspaceHierarchy.ts, browser/Vite-glob context) and flat mode
// (scripts/helpers/vite-plugin.js, Node build-time context). Deliberately dependency-free
// (no React, no Vite APIs, no path aliases) so it can be imported directly by both a
// TS/Vite bundle and a plain Node ESM `import()` with no bundling step.
//
// Folder convention (variable depth, 1 or more levels under the flow-designs root):
//   <root>/<flow>/<...cosmetic...>/<screen>/<File>.tsx
//   <root>/<File>.tsx                          → flow = "misc", screen = filename
//
// First path segment after the root = flow id. Last path segment before the file
// (if any) = screen id. Anything in between is cosmetic/organizational only — ignored
// for identity, but callers should preserve it for display purposes.
//
// Screen files no longer require a "Screen" filename suffix — identity is folder-derived,
// never filename-derived (except in the 0-folder "misc" fallback case, where there is no
// folder to derive it from).

export const MISC_FLOW_ID = 'misc'

/** file/folder segments starting with '__' are fully excluded (parsing, checks, everything). */
export function isNonExistent(segment) {
  return segment.startsWith('__')
}

/** file/folder segments starting with a single '_' are hidden from default browsing only. */
export function isHidden(segment) {
  return segment.startsWith('_') && !segment.startsWith('__')
}

/**
 * Resolves visibility for a full list of path segments (folders + filename, in order,
 * as they appear under the flow-designs root). Parent status always dominates: a single
 * '__' anywhere in the chain makes the whole path non-existent regardless of the
 * segments below it; otherwise a single '_' anywhere makes it hidden.
 *
 * Returns 'normal' | 'hidden' | 'non-existent'.
 */
export function resolveVisibility(segments) {
  let sawHidden = false
  for (const seg of segments) {
    if (isNonExistent(seg)) return 'non-existent'
    if (isHidden(seg)) sawHidden = true
  }
  return sawHidden ? 'hidden' : 'normal'
}

/**
 * Strips a .tsx/.jsx extension and returns the bare stem, or null if the file doesn't
 * have a recognized screen-file extension.
 */
function stripExtension(filename) {
  const m = filename.match(/^(.*)\.(tsx|jsx)$/)
  return m ? m[1] : null
}

/**
 * Parses a variant suffix off a component stem. Accepts both the long form
 * (`.variant-<serial>`) and the shorthand (`.v-<serial>`), with a greedy serial capture
 * so a serial itself containing hyphens (e.g. "red-theme") parses correctly.
 *
 * Returns { componentName, variant } — variant is "default" when no suffix is present.
 */
export function parseVariant(stem) {
  const vMatch = stem.match(/^(.*)\.(?:variant|v)-(.+)$/)
  if (!vMatch) return { componentName: stem, variant: 'default' }
  return { componentName: vMatch[1], variant: vMatch[2] }
}

/**
 * Core identity parser. `segments` is the list of path parts AFTER the flow-designs
 * root, in order — e.g. for `flowBook/onboarding/welcome/WelcomeScreen.tsx` this is
 * `['onboarding', 'welcome', 'WelcomeScreen.tsx']`.
 *
 * Returns null if the file doesn't have a recognized screen-file extension (not a
 * screen candidate at all — e.g. a stray .ts/.md file). Otherwise returns:
 *   { flow, screen, variant, componentName, visibility, cosmeticSegments }
 *
 * `cosmeticSegments` is whatever sat between the first and last folder — kept for
 * display purposes (real on-disk nesting), never used for identity.
 */
export function parseScreenSegments(segments) {
  if (segments.length === 0) return null
  const file = segments[segments.length - 1]
  const stem = stripExtension(file)
  if (stem === null) return null

  const folders = segments.slice(0, -1)
  const visibility = resolveVisibility(segments)
  const { componentName, variant } = parseVariant(stem)

  if (folders.length === 0) {
    // flowBook/File.tsx — no flow folder, no screen folder at all.
    return {
      flow: MISC_FLOW_ID,
      screen: componentName,
      variant,
      componentName,
      visibility,
      cosmeticSegments: [],
    }
  }

  const flow = folders[0]
  const screen = folders[folders.length - 1]
  const cosmeticSegments = folders.slice(1, -1)

  return { flow, screen, variant, componentName, visibility, cosmeticSegments }
}

/** Builds the collision-proof screen id: `${flowId}-${screenId}`. */
export function makeScreenId(flow, screen) {
  return `${flow}-${screen}`
}

/**
 * Given a list of candidate filenames (already extension-checked, same folder, same
 * variant tier — i.e. this only resolves the "which file is THE screen" ambiguity, not
 * variants of one screen), picks the real screen file deterministically: alphabetically
 * first. Returns { chosen, ambiguous } — ambiguous is true when there was more than one
 * candidate, signalling callers should raise the screen/ambiguous-folder warning.
 */
export function pickScreenFile(candidateFilenames) {
  if (candidateFilenames.length === 0) return { chosen: null, ambiguous: false }
  const sorted = [...candidateFilenames].sort((a, b) => a.localeCompare(b))
  return { chosen: sorted[0], ambiguous: sorted.length > 1 }
}
