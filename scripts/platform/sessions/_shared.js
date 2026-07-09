import fs from 'fs'
import path from 'path'
import { workspacePath } from '../../lib/paths.js'
import { toId, toSlug } from '../../lib/strings.js'

// ── Path helpers ─────────────────────────────────────────────────────────────

export const flowLensRoot = ws => path.join(workspacePath(ws), 'lib', 'flowLens')
export const sessionsRoot = ws => path.join(flowLensRoot(ws), 'sessions')
export const studyDir = (ws, studyId) => path.join(sessionsRoot(ws), studyId)
export const reportsDir = ws => path.join(flowLensRoot(ws), 'reports')
export const studiesJsonPath = ws => path.join(flowLensRoot(ws), 'studies.json')

// ── Study helpers ─────────────────────────────────────────────────────────────

export function readStudies(ws) {
  const p = studiesJsonPath(ws)
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

export function writeStudies(ws, data) {
  fs.mkdirSync(flowLensRoot(ws), { recursive: true })
  fs.writeFileSync(studiesJsonPath(ws), JSON.stringify(data, null, 2) + '\n')
}

/** Read studies.json, creating it with "Initial Study" if absent. */
export function ensureStudies(ws) {
  const existing = readStudies(ws)
  if (existing) return existing
  const data = {
    workspace: ws,
    activeStudyId: 'initial-study',
    studies: [
      {
        id: 'initial-study',
        name: 'Initial Study',
        status: 'active',
        createdAt: new Date().toISOString(),
        archivedAt: null,
        description: '',
      },
    ],
  }
  fs.mkdirSync(studyDir(ws, 'initial-study'), { recursive: true })
  fs.writeFileSync(path.join(studyDir(ws, 'initial-study'), '.gitkeep'), '')
  writeStudies(ws, data)
  return data
}

/** Returns the study object matching activeStudyId, or null. */
export function activeStudy(ws) {
  const data = readStudies(ws)
  if (!data?.activeStudyId) return null
  return data.studies.find(s => s.id === data.activeStudyId) ?? null
}

/** Slugify a human study name to an id. */
export function studyNameToId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Session file listing ─────────────────────────────────────────────────────

/**
 * List all committed session JSON files.
 * @param {string} ws
 * @param {string|null} studyId  — null = all studies
 */
export function listLibraryFiles(ws, studyId = null) {
  const root = sessionsRoot(ws)
  if (!fs.existsSync(root)) return []
  const dirs = studyId
    ? [studyId]
    : fs.readdirSync(root).filter(d => {
        try {
          return fs.statSync(path.join(root, d)).isDirectory()
        } catch {
          return false
        }
      })
  return dirs.flatMap(sid => {
    const dir = path.join(root, sid)
    if (!fs.existsSync(dir)) return []
    return fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(dir, f))
  })
}

/**
 * Resolve the directory for the next session write.
 * Calls ensureStudies() so studies.json is always present before writes.
 * @param {string} ws
 * @param {string|null} studyIdOverride
 */
export function libraryDir(ws, studyIdOverride = null) {
  const data = ensureStudies(ws)
  const sid = studyIdOverride ?? data.activeStudyId ?? 'initial-study'
  const dir = studyDir(ws, sid)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

// ── Session reading / validation ─────────────────────────────────────────────

/** Parse + lightly validate a SessionExport file. Returns { ok, session?, error? }. */
export function readSession(file) {
  let raw
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch (e) {
    return { ok: false, error: `unreadable: ${e.message}` }
  }
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${e.message}` }
  }
  if (!data || typeof data !== 'object') return { ok: false, error: 'not an object' }
  if (!data.meta?.id) return { ok: false, error: 'missing meta.id' }
  if (!Array.isArray(data.events)) return { ok: false, error: 'events is not an array' }
  return { ok: true, session: data }
}

// ── Screen id helpers ─────────────────────────────────────────────────────────

/** Screen ids the workspace actually defines (mirrors the app's deriveScreenId). */
export function workspaceScreenIds(ws) {
  const flowsDir = path.join(workspacePath(ws), 'flows')
  const ids = new Set()
  if (!fs.existsSync(flowsDir)) return ids
  for (const folder of fs.readdirSync(flowsDir)) {
    const full = path.join(flowsDir, folder)
    if (!fs.statSync(full).isDirectory()) continue
    for (const f of fs.readdirSync(full)) {
      if (/\.(tsx|jsx)$/.test(f) && !f.startsWith('_') && f !== 'router.tsx') {
        ids.add(toId(f.replace(/\.(tsx|jsx)$/, '')))
      }
    }
  }
  return ids
}

/** Screen ids referenced by a session's events. */
export function sessionScreenIds(session) {
  const ids = new Set()
  for (const e of session.events) {
    const id = e.payload?.screenId ?? e.payload?.to
    if (typeof id === 'string') ids.add(id)
  }
  return ids
}

export { toSlug }
