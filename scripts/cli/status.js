import fs from 'fs'
import path from 'path'
import {
  workspacePath,
  isRepoMode,
  ROOT,
  b,
  c,
  d,
  g,
  r,
  getActiveWorkspaceName,
} from '../lib/config.js'
import { flowLensModuleExists } from './sessions/index.js'

export function cmdStatus(wsArg) {
  const ws = (wsArg || '').trim() || getActiveWorkspaceName()
  if (!ws) {
    console.error(r('✗ No active workspace.'))
    process.exit(1)
  }

  const wsDir = workspacePath(ws)
  if (!fs.existsSync(wsDir)) {
    console.error(r(`✗ Workspace not found: ${wsDir}`))
    process.exit(1)
  }

  const flowsDir = path.join(wsDir, 'flows')
  console.log('')
  console.log(b(` Status — ${ws}`))
  console.log(d(' ────────────────────────────────────────────'))

  const flatPlansDir = path.join(wsDir, 'flowplans')

  // Flows + screens: flows/<flow>/<screen>/<Screen>.tsx
  let flowCount = 0,
    screenCount = 0
  if (fs.existsSync(flowsDir)) {
    for (const folder of fs.readdirSync(flowsDir)) {
      const full = path.join(flowsDir, folder)
      if (!fs.statSync(full).isDirectory()) continue
      const screenFolders = fs.readdirSync(full).filter(sf => {
        const sfPath = path.join(full, sf)
        if (!fs.statSync(sfPath).isDirectory()) return false
        return fs.readdirSync(sfPath).some(f => f.endsWith('.tsx') || f.endsWith('.jsx'))
      })
      const directScreens = fs
        .readdirSync(full)
        .filter(f => (f.endsWith('.tsx') || f.endsWith('.jsx')) && !f.startsWith('_'))
      const total = screenFolders.length + directScreens.length
      if (total > 0) {
        flowCount++
        screenCount += total
      }
    }
  }
  console.log(`  Flows:           ${b(flowCount)}  (${screenCount} screens total)`)

  // FlowPlans
  if (fs.existsSync(flatPlansDir)) {
    const planCount = fs
      .readdirSync(flatPlansDir)
      .filter(f => f.endsWith('.ts') || f.endsWith('.js')).length
    console.log(`  FlowPlans:       ${b(planCount)}`)
  }

  // Session library — sessions/<study>/*.json under lib/flowLens/
  const sessionsBase = path.join(wsDir, 'lib', 'flowLens', 'sessions')
  if (fs.existsSync(sessionsBase)) {
    const sessionFiles = fs
      .readdirSync(sessionsBase, { recursive: true })
      .filter(f => f.endsWith('.json'))
    const lensPresent = flowLensModuleExists()
    console.log(
      `  Sessions:        ${b(sessionFiles.length)}  ${lensPresent ? g('(FlowLens available)') : c('(FlowLens module not found)')}`
    )
  } else {
    console.log(`  Sessions:        ${d('no library  — use sessions:import to add sessions')}`)
  }

  // Feedback snapshot
  const feedbackPath = path.join(wsDir, '.flowkit-feedback.json')
  if (fs.existsSync(feedbackPath)) {
    try {
      const fb = JSON.parse(fs.readFileSync(feedbackPath, 'utf8'))
      const count = (fb.comments ?? []).length
      console.log(`  Feedback:        ${b(count)} committed comment${count !== 1 ? 's' : ''}`)
    } catch {
      console.log(`  Feedback:        ${r('unreadable .flowkit-feedback.json')}`)
    }
  } else {
    console.log(`  Feedback:        ${d('none committed')}`)
  }

  // Agent files
  const agentMetaPath = path.join(wsDir, '.agent', '.agent-meta.json')
  if (fs.existsSync(agentMetaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(agentMetaPath, 'utf8'))
      console.log(`  Agent:           ${b(meta.agent ?? '?')}  spec v${meta.specVersion ?? '?'}`)
    } catch {
      console.log(`  Agent:           ${r('unreadable .agent-meta.json')}`)
    }
  } else {
    console.log(`  Agent:           ${d('not synced — run flowkit agent:sync')}`)
  }

  console.log('')
}
