// flowkit check:screens — screen-domain rules.
//
// Forbidden cross-layer imports are NOT checked here — that's enforced by
// eslint-plugin-boundaries' `workspace` element/policy in eslint.config.js instead (resolved
// decision: reuse existing, already-configured infra rather than duplicate the same concern
// in a second, parallel rule engine). This module only covers what ESLint structurally
// cannot see: the screen's own export shape and screenMeta consistency.
import fs from 'fs'
import path from 'path'
import { parseTopLevel, hasDefaultFunctionExport, findExportedObjectLiteral } from './ts-parse.js'
import { FLOW_BOOK_DIRNAME } from '../helpers/config-filenames.js'
import { isNonExistent, resolveVisibility, parseScreenSegments, makeScreenId, pickScreenFile } from '../../src/shared/utils/screenPathIdentity.js'

const SCREEN_EXTS = ['.tsx', '.jsx']

/**
 * Recursively walks `dir` (relative segment chain tracked in `segments`) collecting every
 * real screen-candidate file found at any depth ≥1. `__`-prefixed folders are pruned
 * entirely (never descended into) rather than filtered post-hoc, matching the "as if it
 * doesn't exist" requirement. Returns a flat list of { segments, fullPath }, where
 * `segments` is the full chain from directly under the flow-designs root down to the
 * filename (suitable for both parseScreenSegments and resolveVisibility).
 */
function walkScreenFiles(dir, segments) {
  const results = []
  for (const entry of fs.readdirSync(dir)) {
    if (isNonExistent(entry)) continue // prune — never read, never AST-parsed, never reported
    const full = path.join(dir, entry)
    const nextSegments = [...segments, entry]
    if (fs.statSync(full).isDirectory()) {
      results.push(...walkScreenFiles(full, nextSegments))
    } else if (SCREEN_EXTS.some(ext => entry.endsWith(ext))) {
      results.push({ segments: nextSegments, fullPath: full })
    }
  }
  return results
}

/** Runs screen-domain rules for one workspace. Appends findings to `report`. */
export function checkScreens(wsDir, report) {
  const flowsDir = path.join(wsDir, FLOW_BOOK_DIRNAME)
  if (!fs.existsSync(flowsDir)) return

  const allFiles = walkScreenFiles(flowsDir, [])

  // Group real (non-hidden-by-__, since walkScreenFiles already pruned those) files by
  // (flow, screen) so multi-candidate folders can be resolved via pickScreenFile.
  const groups = new Map() // key: `${flow}::${screen}` -> [{segments, fullPath, parsed}]

  for (const entry of allFiles) {
    const visibility = resolveVisibility(entry.segments)
    if (visibility === 'non-existent') continue // belt-and-suspenders; walk already pruned __ dirs

    const parsed = parseScreenSegments(entry.segments)
    if (!parsed) continue // not a recognized screen-file extension (shouldn't happen given the walk filter)

    const key = `${parsed.flow}::${parsed.screen}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ ...entry, parsed })
  }

  for (const [, candidates] of groups) {
    const { flow, screen } = candidates[0].parsed
    const relDir = path.relative(wsDir, path.dirname(candidates[0].fullPath))

    let winnerFileName
    if (candidates.length > 1) {
      const filenames = candidates.map(c => path.basename(c.fullPath))
      const { chosen, ambiguous } = pickScreenFile(filenames)
      winnerFileName = chosen
      if (ambiguous) {
        const losers = filenames.filter(f => f !== chosen)
        report.add({
          ruleId: 'screen/ambiguous-folder',
          severity: 'warning',
          file: relDir,
          message: `Multiple candidate screen files found; '${chosen}' was picked as the real screen (alphabetically first).`,
          fix: `Prefix the other file(s) with '__' or delete/rename them to remove the ambiguity: ${losers.join(', ')}`,
          requiresAcknowledgment: true,
        })
      }
    } else {
      winnerFileName = path.basename(candidates[0].fullPath)
    }

    const winner = candidates.find(c => path.basename(c.fullPath) === winnerFileName)
    const filePath = winner.fullPath
    const relPath = path.relative(wsDir, filePath)
    const expectedId = makeScreenId(flow, screen)

    const body = parseTopLevel(filePath)
    if (!body) continue // unparseable — tsc/eslint's job to report syntax errors, not this rule's

    if (!hasDefaultFunctionExport(body)) {
      report.add({
        ruleId: 'screen/no-default-export',
        severity: 'error',
        file: relPath,
        message: 'No `export default function ScreenName(...)` found.',
        fix: 'Add a default-exported function component.',
      })
    }

    const meta = findExportedObjectLiteral(body, 'screenMeta')
    if (!meta) {
      report.add({
        ruleId: 'screen/missing-meta',
        severity: 'error',
        file: relPath,
        message: 'No `export const screenMeta` found.',
        fix: `Add: export const screenMeta = { label: '...', desc: '...' }`,
      })
      continue
    }

    // id is optional (repo-mode's own scaffold.js omits it entirely) — only flag a
    // genuine mismatch, never flag mere absence.
    if (meta.id !== undefined && meta.id !== expectedId) {
      report.add({
        ruleId: 'screen/meta-id-mismatch',
        severity: 'error',
        file: relPath,
        message: `screenMeta.id is '${meta.id}' but the derived screen id is '${expectedId}'.`,
        fix: `Set screenMeta.id to '${expectedId}', or rename the directory to match.`,
      })
    }

    if (!meta.label) {
      report.add({
        ruleId: 'screen/meta-missing-label',
        severity: 'warning',
        file: relPath,
        message: 'screenMeta has no `label` field.',
        fix: `Add a label: screenMeta.label = 'Some Title'`,
      })
    }
  }
}
