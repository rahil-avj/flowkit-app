import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import {
  ROOT,
  workspacePath,
  requireRepoMode,
  listWorkspaceDirs,
  g,
  r,
  b,
  d,
  c,
} from '../lib/config.js'
import { selectFromList } from '../lib/prompt.js'
import { copyDirRecursive } from '../lib/fs-copy.js'

// Folders and files to exclude from the handoff zip.
// These are Flowkit tooling — the developer only needs src/, workspaces/, and config files.
const EXCLUDE = [
  'scripts',
  'Documentation',
  '.vscode',
  '.git',
  '.vite',
  'node_modules',
  'dist',
  'dist-standalone',
  'handoff',
  '.env.local',
  '.env',
  '.flowkit-backup.json',
  'inline.js',
  'vite.config.standalone.ts',
  'README.md',
]

// ─── Main command ──────────────────────────────────────────────────────────────

export async function cmdHandoff(val) {
  requireRepoMode('flowkit handoff', 'Zip your own project directory manually for now.')

  const existing = listWorkspaceDirs()

  if (!existing.length) {
    console.error(r('✗ No workspaces found.'))
    process.exit(1)
  }

  let wsName = val
  if (!wsName) {
    console.log(c('? ') + 'Select workspace for developer handoff (↑↓ Enter):')
    wsName = await selectFromList(existing, null)
    console.log('\n')
  }

  const wsDir = workspacePath(wsName)
  if (!fs.existsSync(wsDir)) {
    console.error(r(`✗ Workspace not found: ${wsDir}`))
    process.exit(1)
  }

  const HANDOFF_DIR = path.join(ROOT, 'handoff')
  fs.mkdirSync(HANDOFF_DIR, { recursive: true })

  const date = new Date().toISOString().slice(0, 10)
  const outDirName = `${wsName}-handoff-${date}`
  const outDir = path.join(HANDOFF_DIR, outDirName)
  const zipPath = path.join(HANDOFF_DIR, `${outDirName}.zip`)

  // Clean previous run for the same workspace+date
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true })
  if (fs.existsSync(zipPath)) fs.rmSync(zipPath)

  console.log('')
  console.log(b(` Building handoff: ${wsName}`))
  console.log(d(' ────────────────────────────────────'))

  // Copy entire repo root into outDir, skipping excluded entries
  const excludeSet = new Set(EXCLUDE)
  const rootEntries = fs.readdirSync(ROOT).filter(e => {
    if (excludeSet.has(e)) return false
    return true
  })

  fs.mkdirSync(outDir, { recursive: true })
  for (const entry of rootEntries) {
    copyEntry(path.join(ROOT, entry), path.join(outDir, entry))
  }
  console.log(g('✓') + ' Codebase copied  (' + d(`${rootEntries.length} entries`) + ')')

  // Write a minimal .env.example so the developer knows what keys are needed
  const envExample =
    [
      '# Copy this to .env.local and fill in your own values.',
      '# Cloud export (optional — prototype works without it)',
      'VITE_JSONBIN_MASTER_KEY=',
      'VITE_JSONBIN_ACCESS_KEY=',
    ].join('\n') + '\n'
  fs.writeFileSync(path.join(outDir, '.env.example'), envExample)
  console.log(g('✓') + ' .env.example written')

  // Zip and clean up the temp dir
  execSync(`zip -r "${zipPath}" .`, { cwd: outDir, stdio: 'pipe' })
  fs.rmSync(outDir, { recursive: true })

  const kb = (fs.statSync(zipPath).size / 1024).toFixed(1)
  console.log('')
  console.log(g('✓') + ' Handoff ready: ' + b(`handoff/${outDirName}.zip`))
  console.log(d(`  ${kb} KB · unzip → npm install → npm run dev`))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyEntry(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    copyDirRecursive(src, dest)
  } else {
    fs.copyFileSync(src, dest)
  }
}
