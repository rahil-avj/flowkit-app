// Platform command: study cohort management (sessions:study:new/ls/archive/active).
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { g, r, b, d, c } from '../../helpers/colors.js'
import { resolveWorkspace } from '../../helpers/workspace-resolve.js'
import {
  readStudies,
  writeStudies,
  ensureStudies,
  studyDir,
  studyNameToId,
  listLibraryFiles,
} from './_shared.js'

// ─── sessions:study:new ───────────────────────────────────────────────────────

export function cmdStudyNew(wsVal, args = []) {
  const ws = resolveWorkspace(wsVal)
  const name = args.find(a => !a.startsWith('--'))
  if (!name) {
    console.error(r('✗ Usage: flowkit sessions:study:new:<ws> "<Study Name>" [--desc "<text>"]'))
    process.exit(1)
  }

  const descIdx = args.indexOf('--desc')
  const description = descIdx !== -1 ? (args[descIdx + 1] ?? '') : ''

  const id = studyNameToId(name)
  if (!id) {
    console.error(r(`✗ Cannot slugify "${name}" into a valid id.`))
    process.exit(1)
  }

  const data = ensureStudies(ws)

  if (data.studies.some(s => s.id === id)) {
    console.error(r(`✗ A study with id "${id}" already exists in ${ws}.`))
    process.exit(1)
  }

  data.studies.push({
    id,
    name,
    status: 'active',
    createdAt: new Date().toISOString(),
    archivedAt: null,
    description,
  })
  data.activeStudyId = id

  const dir = studyDir(ws, id)
  fs.mkdirSync(dir, { recursive: true })
  writeStudies(ws, data)

  console.log(g('✓') + ' Study created: ' + b(name) + d(` (${id})`))
  console.log(d(`  Active study set to "${id}" — new sessions will land here.`))
}

// ─── sessions:study:ls ────────────────────────────────────────────────────────

export function cmdStudyLs(wsVal) {
  const ws = resolveWorkspace(wsVal)
  const data = readStudies(ws)

  console.log('')
  console.log(b(` Studies — ${ws}`))
  console.log(d(' ────────────────────────────────────────────'))

  if (!data || data.studies.length === 0) {
    console.log(d('  No studies yet.'))
    console.log('')
    return
  }

  for (const study of data.studies) {
    const isActive = study.id === data.activeStudyId
    const files = listLibraryFiles(ws, study.id)
    const marker = isActive ? c('●') : d('○')
    const statusBadge = study.status === 'archived' ? d(' [archived]') : ''
    console.log(
      `  ${marker} ${b(study.name)}${statusBadge}` +
        d(` — ${study.id} · ${files.length} session${files.length !== 1 ? 's' : ''}`)
    )
    if (study.description) console.log(d(`      ${study.description}`))
    if (study.archivedAt)
      console.log(d(`      Archived: ${new Date(study.archivedAt).toLocaleString()}`))
  }

  console.log(d(' ────────────────────────────────────────────'))
  const active = data.activeStudyId ?? d('(none)')
  console.log(d(`  Active: `) + c(active))
  console.log('')
}

// ─── sessions:study:archive ───────────────────────────────────────────────────

export async function cmdStudyArchive(wsVal, args = []) {
  const ws = resolveWorkspace(wsVal)
  const target = args.find(a => !a.startsWith('--'))
  const force = args.includes('--force')

  if (!target) {
    console.error(r('✗ Usage: flowkit sessions:study:archive:<ws> "<name|id>" [--force]'))
    process.exit(1)
  }

  const data = ensureStudies(ws)
  const study = data.studies.find(
    s => s.id === target || s.name.toLowerCase() === target.toLowerCase()
  )

  if (!study) {
    console.error(r(`✗ No study matching "${target}" in ${ws}.`))
    process.exit(1)
  }

  if (study.status === 'archived') {
    console.log(d(`  Study "${study.name}" is already archived.`))
    return
  }

  if (!force) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const ans = await new Promise(resolve =>
      rl.question(c('? ') + `Archive study "${study.name}" (${study.id})? [y/N] `, resolve)
    )
    rl.close()
    if (ans.trim().toLowerCase() !== 'y') {
      console.log(d('  Aborted.'))
      return
    }
  }

  study.status = 'archived'
  study.archivedAt = new Date().toISOString()

  if (data.activeStudyId === study.id) {
    data.activeStudyId = null
    console.log(d('  Active study cleared — use sessions:study:active to set a new one.'))
  }

  writeStudies(ws, data)
  console.log(g('✓') + ' Archived: ' + b(study.name) + d(` (${study.id})`))
}

// ─── sessions:study:active ────────────────────────────────────────────────────

export function cmdStudyActive(wsVal, args = []) {
  const ws = resolveWorkspace(wsVal)
  const target = args.find(a => !a.startsWith('--'))

  if (!target) {
    // Print current active study
    const data = readStudies(ws)
    if (!data?.activeStudyId) {
      console.log(d('  No active study set for ') + b(ws) + d('.'))
      console.log(d('  Use: ') + c(`flowkit sessions:study:active:${ws} "<name|id>"`))
    } else {
      const study = data.studies.find(s => s.id === data.activeStudyId)
      console.log(
        c('●') + ' ' + b(study?.name ?? data.activeStudyId) + d(` (${data.activeStudyId})`)
      )
    }
    return
  }

  const data = ensureStudies(ws)
  const study = data.studies.find(
    s => s.id === target || s.name.toLowerCase() === target.toLowerCase()
  )

  if (!study) {
    console.error(r(`✗ No study matching "${target}" in ${ws}.`))
    process.exit(1)
  }

  if (study.status === 'archived') {
    console.error(r(`✗ Study "${study.name}" is archived — unarchive it before setting as active.`))
    process.exit(1)
  }

  data.activeStudyId = study.id
  writeStudies(ws, data)
  console.log(g('✓') + ' Active study set to: ' + b(study.name) + d(` (${study.id})`))
}
