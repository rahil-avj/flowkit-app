// Platform command: session CRUD (sessions:ls/import/rm/export/purge).
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { g, r, b, d, c } from '../../helpers/colors.js'
import { fmtDate } from '../../helpers/dates.js'
import { resolveWorkspace } from '../../helpers/workspace-resolve.js'
import { toSlug } from '../../helpers/strings.js'
import {
  libraryDir,
  listLibraryFiles,
  readSession,
  readStudies,
  studyNameToId,
  sessionsRoot,
  workspaceScreenIds,
  sessionScreenIds,
} from './_shared.js'

// ─── sessions:ls ──────────────────────────────────────────────────────────────

export function cmdSessionsLs(val, args = []) {
  const ws = resolveWorkspace(val)
  const asJson = args.includes('--json')

  // --study filter
  const studyFilter = resolveStudyArg(ws, args)
  const files = listLibraryFiles(ws, studyFilter)

  const rows = files.map(f => {
    const res = readSession(f)
    return { file: path.basename(f), studyId: studyIdFromPath(ws, f), ...res }
  })

  if (asJson) {
    console.log(
      JSON.stringify(
        rows.map(row =>
          row.ok
            ? { file: row.file, studyId: row.studyId, meta: row.session.meta }
            : { file: row.file, error: row.error }
        ),
        null,
        2
      )
    )
    return
  }

  const qColor = q => (q >= 70 ? g : q >= 40 ? c : r)

  console.log('')
  const studyLabel = studyFilter ? d(` [study: ${studyFilter}]`) : ''
  console.log(b(` Sessions — ${ws}`) + studyLabel)
  console.log(d(' ────────────────────────────────────────────'))
  if (rows.length === 0) {
    console.log(
      d('  No committed sessions. Add one with: ') + c(`flowkit sessions:import <file.json>`)
    )
    console.log('')
    return
  }
  let totalQ = 0,
    valid = 0
  for (const row of rows) {
    if (!row.ok) {
      console.log('  ' + r('✗ ') + row.file + d(`  — ${row.error}`))
      continue
    }
    const m = row.session.meta
    const screens = sessionScreenIds(row.session).size
    totalQ += m.qualityScore ?? 0
    valid++
    const tag = m.isTestMode ? d(' [test]') : ''
    const study = row.studyId ? d(` [${row.studyId}]`) : ''
    console.log(
      '  ' +
        b(m.name ?? row.file) +
        tag +
        study +
        '\n' +
        d(
          `    ${fmtDate(m.startTime)} · ${m.eventCount ?? row.session.events.length} events · ${screens} screens · `
        ) +
        qColor(m.qualityScore ?? 0)(`${m.qualityScore ?? 0}%`) +
        d(`  · ${row.file}`)
    )
  }
  console.log(d(' ────────────────────────────────────────────'))
  console.log(
    d(
      `  ${valid} session${valid !== 1 ? 's' : ''}${valid ? ` · avg quality ${Math.round(totalQ / valid)}%` : ''}`
    )
  )
  console.log('')
}

// ─── sessions:import <file> ───────────────────────────────────────────────────

export function cmdSessionsImport(val, args = []) {
  const file = args.find(a => !a.startsWith('--'))
  if (!file) {
    console.error(r('✗ Usage: flowkit sessions:import <file.json> [--force] [--study <name|id>]'))
    process.exit(1)
  }
  const force = args.includes('--force')
  const ws = resolveWorkspace(val)

  const studyIdOverride = resolveStudyArg(ws, args)

  const srcPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file)
  if (!fs.existsSync(srcPath)) {
    console.error(r(`✗ File not found: ${file}`))
    process.exit(1)
  }

  const res = readSession(srcPath)
  if (!res.ok) {
    console.error(r(`✗ Not a valid session export — ${res.error}`))
    process.exit(1)
  }
  const session = res.session
  const m = session.meta

  if (m.workspaceId && m.workspaceId !== ws) {
    const msg = `session.meta.workspaceId is "${m.workspaceId}", importing into "${ws}"`
    if (!force) {
      console.error(r(`✗ ${msg}`) + d('  — re-run with --force to import anyway'))
      process.exit(1)
    }
    console.log(d(`  ! ${msg} (forced)`))
  }

  const wsIds = workspaceScreenIds(ws)
  const sessIds = [...sessionScreenIds(session)]
  const known = sessIds.filter(id => wsIds.has(id))
  if (sessIds.length > 0 && known.length === 0) {
    console.log(
      '  ' +
        r('! ') +
        d(
          `none of this session's screens exist in "${ws}" — replay will be disabled (analytics still work)`
        )
    )
  }

  const dir = libraryDir(ws, studyIdOverride)
  fs.mkdirSync(dir, { recursive: true })

  const existing = listLibraryFiles(ws).find(f => {
    const e = readSession(f)
    return e.ok && e.session.meta.id === m.id
  })
  if (existing && !force) {
    console.error(
      r(`✗ A session with id "${m.id}" already exists: ${path.basename(existing)}`) +
        d('  — use --force to overwrite')
    )
    process.exit(1)
  }

  const base = toSlug(m.name || 'session') || 'session'
  const dest = existing && force ? existing : path.join(dir, `${base}-${m.id.slice(0, 8)}.json`)
  fs.writeFileSync(dest, JSON.stringify(session, null, 2))
  console.log(
    g('✓') +
      ' Imported ' +
      b(m.name ?? m.id) +
      d(
        `  → workspaces/${ws}/lib/flowLens/sessions/${path.relative(dir, dest) === path.basename(dest) ? path.basename(dir) : '?'}/${path.basename(dest)}`
      )
  )
}

// ─── sessions:rm <id|name> ────────────────────────────────────────────────────

export function cmdSessionsRm(val, args = []) {
  const target = args.find(a => !a.startsWith('--'))
  if (!target) {
    console.error(r('✗ Usage: flowkit sessions:rm <id|name|file>'))
    process.exit(1)
  }
  const ws = resolveWorkspace(val)
  const files = listLibraryFiles(ws)

  const match = files.find(f => {
    if (path.basename(f) === target || path.basename(f) === `${target}.json`) return true
    const res = readSession(f)
    return res.ok && (res.session.meta.id === target || res.session.meta.name === target)
  })
  if (!match) {
    console.error(r(`✗ No committed session matching "${target}" in ${ws}`))
    process.exit(1)
  }

  fs.rmSync(match)
  console.log(
    g('✓') + ' Removed ' + b(path.basename(match)) + d(`  (workspaces/${ws}/lib/flowLens/)`)
  )
}

// ─── sessions:export ──────────────────────────────────────────────────────────

export function cmdSessionsExport(val, args = []) {
  const ws = resolveWorkspace(val)
  const target = args.find(a => !a.startsWith('--'))
  if (!target) {
    console.error(r('✗ Usage: flowkit sessions:export:<ws> <id|name|file>'))
    process.exit(1)
  }

  const destFlag = (() => {
    const i = args.indexOf('--dest')
    return i !== -1 ? args[i + 1] : null
  })()

  const files = listLibraryFiles(ws)
  const match = files.find(f => {
    if (path.basename(f) === target || path.basename(f) === `${target}.json`) return true
    const res = readSession(f)
    return res.ok && (res.session.meta.id === target || res.session.meta.name === target)
  })
  if (!match) {
    console.error(r(`✗ No committed session matching "${target}" in ${ws}`))
    process.exit(1)
  }

  const res = readSession(match)
  if (!res.ok) {
    console.error(r(`✗ Cannot read session: ${res.error}`))
    process.exit(1)
  }
  const m = res.session.meta
  const base = toSlug(m.name || 'session') || 'session'
  const outName = `${base}-${(m.id || '').slice(0, 8)}.flowkit-session.json`
  const dest = destFlag
    ? destFlag.endsWith('.json')
      ? destFlag
      : path.join(destFlag, outName)
    : path.join(process.cwd(), outName)

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(match, dest)
  console.log(g('✓') + ' Exported ' + b(m.name ?? m.id) + d(`  → ${dest}`))
}

// ─── sessions:purge ───────────────────────────────────────────────────────────

export async function cmdSessionsPurge(val, args = []) {
  const ws = resolveWorkspace(val)
  const testOnly = args.includes('--test-only')
  const olderThanFlag = (() => {
    const a = args.find(x => x.startsWith('--older-than:') || x.startsWith('--older-than'))
    if (!a) return null
    const v = a.includes(':') ? a.split(':')[1] : args[args.indexOf(a) + 1]
    return v ? parseInt(v, 10) : null
  })()

  if (!testOnly && olderThanFlag === null) {
    console.error(
      r('✗ Usage: flowkit sessions:purge [--test-only] [--older-than:<days>] [--study <name|id>]')
    )
    process.exit(1)
  }

  const studyFilter = resolveStudyArg(ws, args)
  const files = listLibraryFiles(ws, studyFilter)
  const now = Date.now()
  const toDelete = files.filter(f => {
    const res = readSession(f)
    if (!res.ok) return false
    const m = res.session.meta
    if (testOnly && !m.isTestMode) return false
    if (olderThanFlag !== null) {
      const ageDays = (now - (m.startTime ?? 0)) / (1000 * 60 * 60 * 24)
      if (ageDays < olderThanFlag) return false
    }
    return true
  })

  if (toDelete.length === 0) {
    console.log(d('  No sessions match the filter — nothing to remove.'))
    return
  }

  console.log('')
  console.log(b(` sessions:purge — ${ws}`))
  console.log(d(' ────────────────────────────────────────────'))
  for (const f of toDelete) {
    const res = readSession(f)
    const name = res.ok ? (res.session.meta.name ?? path.basename(f)) : path.basename(f)
    console.log('  ' + r('✗ ') + name + d(`  · ${path.basename(f)}`))
  }
  console.log(d(' ────────────────────────────────────────────'))
  console.log(`  ${toDelete.length} session${toDelete.length !== 1 ? 's' : ''} will be removed`)
  console.log('')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ans = await new Promise(resolve => rl.question(c('? ') + 'Proceed? [y/N] ', resolve))
  rl.close()
  if (ans.trim().toLowerCase() !== 'y') {
    console.log(d('  Aborted.'))
    return
  }

  for (const f of toDelete) fs.rmSync(f)
  console.log(g('✓') + ` Removed ${toDelete.length} session${toDelete.length !== 1 ? 's' : ''}.`)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse --study flag from args and return the resolved study id, or null. */
function resolveStudyArg(ws, args) {
  const i = args.indexOf('--study')
  if (i === -1) return null
  const target = args[i + 1]
  if (!target) return null
  const data = readStudies(ws)
  if (!data) return null
  const match = data.studies.find(
    s => s.id === target || s.name.toLowerCase() === target.toLowerCase()
  )
  return match?.id ?? null
}

/** Extract the study id from a file path within sessionsRoot. */
function studyIdFromPath(ws, filePath) {
  const root = sessionsRoot(ws)
  const rel = path.relative(root, filePath)
  const parts = rel.split(path.sep)
  return parts.length > 1 ? parts[0] : null
}
