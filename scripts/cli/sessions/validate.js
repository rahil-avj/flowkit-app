import fs from 'fs'
import path from 'path'
import { ROOT } from '../../lib/paths.js'
import { g, r, b, d, c } from '../../lib/colors.js'
import { resolveWorkspace } from '../../lib/workspace-resolve.js'
import { listLibraryFiles, readSession, workspaceScreenIds, sessionScreenIds } from './_shared.js'

export function cmdSessionsCheck(val, { warnOnly = false } = {}) {
  const ws = resolveWorkspace(val)
  const files = listLibraryFiles(ws)
  const wsIds = workspaceScreenIds(ws)
  let errors = 0,
    warnings = 0
  const seenIds = new Map()

  console.log('')
  console.log(b(` sessions:check — ${ws}`))
  console.log(d(' ────────────────────────────────────────────'))

  for (const f of files) {
    const name = path.basename(f)
    const res = readSession(f)
    if (!res.ok) {
      console.log('  ' + r('✗ ') + name + d(`  — ${res.error}`))
      errors++
      continue
    }
    const m = res.session.meta
    const issues = []
    if (m.workspaceId && m.workspaceId !== ws)
      issues.push(['err', `workspaceId "${m.workspaceId}" ≠ "${ws}"`])
    if (seenIds.has(m.id)) issues.push(['err', `duplicate meta.id (also in ${seenIds.get(m.id)})`])
    else seenIds.set(m.id, name)
    const sessIds = [...sessionScreenIds(res.session)]
    if (sessIds.length && !sessIds.some(id => wsIds.has(id)))
      issues.push(['warn', 'no screen ids match this workspace — replay disabled'])
    if (typeof m.qualityScore !== 'number') issues.push(['warn', 'missing qualityScore'])

    if (issues.length === 0) {
      console.log('  ' + g('✓ ') + name)
    } else
      for (const [lvl, msg] of issues) {
        if (lvl === 'err') {
          console.log('  ' + r('✗ ') + name + d('  — ' + msg))
          errors++
        } else {
          console.log('  ' + c('! ') + name + d('  — ' + msg))
          warnings++
        }
      }
  }

  if (files.length > 0 && !flowLensModuleExists()) {
    console.log(
      '  ' +
        c('! ') +
        d(
          "FlowLens module not found (src/modes/flowlens/) — sessions won't be viewable until the module is present."
        )
    )
    warnings++
  }

  console.log(d(' ────────────────────────────────────────────'))
  if (files.length === 0) console.log(d('  No committed sessions.'))
  console.log(
    `  ${errors ? r(`${errors} error${errors !== 1 ? 's' : ''}`) : g('0 errors')}` +
      d(` · ${warnings} warning${warnings !== 1 ? 's' : ''}`)
  )
  console.log('')
  if (errors > 0 && !warnOnly) process.exit(1)
  return errors === 0
}

/** True if the FlowLens module exists on disk (presence = available). */
export function flowLensModuleExists() {
  return fs.existsSync(path.join(ROOT, 'src', 'modes', 'flowlens', 'index.ts'))
}
