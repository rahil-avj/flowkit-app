// Shared output formatting for flowkit check's rule domains — human-readable and --json,
// both built from the same finding objects so neither format can drift from the other.
import { g, r, d, b } from '../helpers/colors.js'

/**
 * @typedef {Object} Finding
 * @property {string} ruleId     e.g. 'screen/missing-meta'
 * @property {'error'|'warning'} severity
 * @property {string} file       workspace-relative path
 * @property {string} message    human-readable description of the problem
 * @property {string} [fix]      manual fix description
 * @property {string} [clifix]   exact CLI command that fixes it, if one exists
 */

export function createReport() {
  /** @type {Finding[]} */
  const findings = []
  return {
    findings,
    add(finding) {
      findings.push(finding)
    },
    get errorCount() {
      return findings.filter(f => f.severity === 'error').length
    },
    get warningCount() {
      return findings.filter(f => f.severity === 'warning').length
    },
  }
}

/** Prints a report in the human-readable format. `label` is e.g. "screens", "plans", or null for the full suite. */
export function printReport(report, workspaceName, label) {
  const { findings, errorCount, warningCount } = report
  const heading = label ? `flowkit check:${label}` : 'flowkit check'
  console.log('')
  console.log(b(`${heading} — ${workspaceName}`))
  console.log(d(' ────────────────────────────────────────────'))

  if (findings.length === 0) {
    console.log(g('  ✓ all clean'))
    console.log('')
    return
  }

  for (const f of findings) {
    const marker = f.severity === 'error' ? r('✗') : d('⚠')
    console.log(`  ${marker} [${f.ruleId}] ${f.file}`)
    console.log(d(`    ${f.message}`))
    if (f.fix) console.log(d(`    Fix: ${f.fix}`))
    if (f.clifix) console.log(d(`    Or:  ${f.clifix}`))
  }

  console.log(d(' ────────────────────────────────────────────'))
  const parts = []
  if (errorCount) parts.push(r(`${errorCount} error${errorCount !== 1 ? 's' : ''}`))
  if (warningCount) parts.push(d(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`))
  console.log('  ' + parts.join(', '))
  console.log('')
}

/** Prints a report as machine-readable JSON. */
export function printReportJson(report, workspaceName) {
  console.log(
    JSON.stringify(
      {
        workspace: workspaceName,
        errors: report.errorCount,
        warnings: report.warningCount,
        results: report.findings,
      },
      null,
      2
    )
  )
}
