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

/** Runs screen-domain rules for one workspace. Appends findings to `report`. */
export function checkScreens(wsDir, report) {
  const flowsDir = path.join(wsDir, 'flows')
  if (!fs.existsSync(flowsDir)) return

  for (const flowId of fs.readdirSync(flowsDir)) {
    const flowDir = path.join(flowsDir, flowId)
    if (!fs.statSync(flowDir).isDirectory()) continue

    for (const screenId of fs.readdirSync(flowDir)) {
      const screenDir = path.join(flowDir, screenId)
      if (!fs.statSync(screenDir).isDirectory()) continue

      const screenFiles = fs
        .readdirSync(screenDir)
        .filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'))
      if (screenFiles.length === 0) continue // not a screen dir (e.g. stray subfolder) — nothing to check

      for (const fileName of screenFiles) {
        const filePath = path.join(screenDir, fileName)
        const relPath = path.relative(wsDir, filePath)
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
        if (meta.id !== undefined && meta.id !== screenId) {
          report.add({
            ruleId: 'screen/meta-id-mismatch',
            severity: 'error',
            file: relPath,
            message: `screenMeta.id is '${meta.id}' but the containing directory is '${screenId}'.`,
            fix: `Set screenMeta.id to '${screenId}', or rename the directory to match.`,
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
  }
}
