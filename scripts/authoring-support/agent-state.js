/**
 * agent-state.js
 * Manages .flowkit/ per-workspace state files.
 * Auto-creates the directory on first write.
 */

import fs from 'fs'
import path from 'path'

const FLOWKIT_DIR = '.flowkit'
const COMPONENTS_FILE = 'components.json'

function flowkitDir(wsDir) {
  return path.join(wsDir, FLOWKIT_DIR)
}

export function ensureFlowkitDir(wsDir) {
  const dir = flowkitDir(wsDir)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

// ─── Component Registry ───────────────────────────────────────────────────────

function componentsPath(wsDir) {
  return path.join(flowkitDir(wsDir), COMPONENTS_FILE)
}

/** @returns {{ name: string, path: string, desc: string, createdAt: string }[]} */
export function readComponents(wsDir) {
  const file = componentsPath(wsDir)
  if (!fs.existsSync(file)) return []
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return []
  }
}

export function writeComponents(wsDir, entries) {
  ensureFlowkitDir(wsDir)
  fs.writeFileSync(componentsPath(wsDir), JSON.stringify(entries, null, 2) + '\n')
}

export function registerComponent(wsDir, { name, path: compPath, desc = '' }) {
  const entries = readComponents(wsDir)
  const existing = entries.findIndex(e => e.name === name && e.path === compPath)
  const entry = { name, path: compPath, desc, createdAt: new Date().toISOString() }
  if (existing >= 0) {
    entries[existing] = entry
  } else {
    entries.push(entry)
  }
  writeComponents(wsDir, entries)
}

export function unregisterComponent(wsDir, name, compPath) {
  const entries = readComponents(wsDir)
  writeComponents(
    wsDir,
    entries.filter(e => !(e.name === name && e.path === compPath))
  )
}

/** @returns {{ name: string, path: string, desc: string, createdAt: string } | null} */
export function findComponent(wsDir, name) {
  return readComponents(wsDir).find(e => e.name === name) ?? null
}
