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
 * @property {boolean} [requiresAcknowledgment]  when true, this finding is surfaced in its
 *   own clearly-headed section (in addition to the normal flat list) so it can't be missed
 *   or silently scrolled past — e.g. screen/ambiguous-folder. Never affects errorCount/
 *   exit code by itself; a finding still needs severity: 'error' to fail the build.
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

  printAcknowledgmentSection(findings)
}

/**
 * Findings marked `requiresAcknowledgment: true` (e.g. screen/ambiguous-folder) get a
 * second, visually distinct pass here — a boxed, all-caps-headed section printed after the
 * normal flat list — so an author can't just scroll past them as one more line among many.
 * This is presentation only: it does not change errorCount/exit-code behavior; a finding
 * still needs severity: 'error' to fail the build. Not a full interactive prompt (no
 * blocking/input handling) — that's a larger UX investment out of scope for this pass.
 */
function printAcknowledgmentSection(findings) {
  const needsAck = findings.filter(f => f.requiresAcknowledgment)
  if (needsAck.length === 0) return

  const line = '═'.repeat(48)
  console.log(r(line))
  console.log(r(`  ⚠ REQUIRES ACKNOWLEDGMENT (${needsAck.length})`))
  console.log(r(line))
  for (const f of needsAck) {
    console.log(`  [${f.ruleId}] ${f.file}`)
    console.log(`    ${f.message}`)
    if (f.fix) console.log(d(`    Fix: ${f.fix}`))
    if (f.clifix) console.log(d(`    Or:  ${f.clifix}`))
    console.log('')
  }
  console.log(r(line))
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
        requiresAcknowledgment: report.findings.filter(f => f.requiresAcknowledgment),
      },
      null,
      2
    )
  )
}
