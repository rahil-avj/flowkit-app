// Authoring command: CRUD for flowplans and their steps (create/remove/add/list/info).
import fs from 'fs'
import path from 'path'
import { parseStringFlag } from '../helpers/args.js'
import { resolveWorkspace } from '../helpers/workspace-resolve.js'
import { workspacePath } from '../helpers/paths.js'
import { g, r, b, d, c } from '../helpers/colors.js'
import { readWorkspaceConfig } from '../authoring-support/config-patch.js'

const KEBAB_RE = /^[a-z][a-z0-9-]*$/

function kebabValidate(id, label = 'name') {
  if (!KEBAB_RE.test(id)) throw new Error(`${label} '${id}' must be kebab-case`)
}

function toDisplayName(kebab) {
  return kebab
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function flowplanPath(wsDir, id) {
  return path.join(wsDir, 'flowplans', `${id}.ts`)
}

/** Parse a flowplan .ts file into a plain object. Returns null on failure. */
function parseFlowplan(filePath) {
  if (!fs.existsSync(filePath)) return null
  let src = fs.readFileSync(filePath, 'utf8')
  src = src.replace(/^import\s+.*\n/m, '')
  src = src.replace(/export\s+default\s+defineFlow\s*\(/, 'return (')
  try {
    return new Function(src)()
  } catch {
    return null
  }
}

/** Format a single step object back to source. */
function formatStep(step) {
  const parts = [`screenId: '${step.screenId}'`]
  if (step.on) parts.push(`on: '${step.on}'`)
  if (step.actionNote) parts.push(`actionNote: '${step.actionNote.replace(/'/g, "\\'")}'`)
  if (step.decisionNote) parts.push(`decisionNote: '${step.decisionNote.replace(/'/g, "\\'")}'`)
  if (step.annotation) parts.push(`annotation: '${step.annotation.replace(/'/g, "\\'")}'`)
  return `    { ${parts.join(', ')} },`
}

/** Replace the steps: [...] block in a flowplan source with regenerated steps. */
function rewriteSteps(filePath, steps) {
  let src = fs.readFileSync(filePath, 'utf8')
  const stepsContent = steps.length > 0 ? '\n' + steps.map(formatStep).join('\n') + '\n  ' : ''
  // Non-greedy match — works for simple step arrays (no fork nesting)
  src = src.replace(/steps:\s*\[[\s\S]*?\]/, `steps: [${stepsContent}]`)
  fs.writeFileSync(filePath, src)
}

function flowplanTemplate(id, displayName) {
  return `import { defineFlow } from 'flowkit'

export default defineFlow({
  id: '${id}',
  name: '${displayName}',
  description: '',

  steps: [
    // { screenId: 'screen-id', on: 'element-id', actionNote: 'What the user does' },
  ],
})
`
}

export async function cmdCreateFlowplan(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  let id = parseStringFlag(args, 'name')

  if (!id) {
    console.error(r('✗ --name:<flowplan-id> is required'))
    console.error(d('  Example: flowkit create:flowplan --name:auth'))
    process.exit(1)
  }

  id = id.trim()
  try {
    kebabValidate(id)
  } catch (e) {
    console.error(r(`✗ ${e.message}`))
    process.exit(1)
  }

  const fpPath = flowplanPath(wsDir, id)
  if (fs.existsSync(fpPath)) {
    console.error(r(`✗ Flowplan '${id}' already exists: flowplans/${id}.ts`))
    process.exit(1)
  }

  const fpDir = path.join(wsDir, 'flowplans')
  if (!fs.existsSync(fpDir)) fs.mkdirSync(fpDir, { recursive: true })

  const displayName = toDisplayName(id)
  fs.writeFileSync(fpPath, flowplanTemplate(id, displayName))

  console.log(g(`✓ Flowplan: flowplans/${id}.ts`))
  console.log('')
  console.log(d(`Next:`))
  console.log(d(`  flowkit add:step --flowplan:${id} --screen:<screenId> --action:"User arrives"`))
  console.log(d(`  flowkit list:steps --flowplan:${id}`))
}

export async function cmdRemoveFlowplan(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  const id = parseStringFlag(args, 'name')
  const force = args.includes('--force')

  if (!id) {
    console.error(r('✗ --name:<flowplan-id> is required'))
    process.exit(1)
  }

  const fpPath = flowplanPath(wsDir, id)
  if (!fs.existsSync(fpPath)) {
    console.error(r(`✗ Flowplan not found: flowplans/${id}.ts`))
    process.exit(1)
  }

  if (!force) {
    console.error(r(`✗ Add --force to confirm deletion of flowplans/${id}.ts`))
    process.exit(1)
  }

  fs.unlinkSync(fpPath)
  console.log(g(`✓ Removed: flowplans/${id}.ts`))
}

export async function cmdAddStep(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  const fpId = parseStringFlag(args, 'flowplan')
  const screenId = parseStringFlag(args, 'screen')
  const on = parseStringFlag(args, 'on')
  const actionNote = parseStringFlag(args, 'action')
  const positionStr = parseStringFlag(args, 'position')

  if (!fpId || !screenId) {
    console.error(r('✗ --flowplan:<id> and --screen:<screenId> are required'))
    process.exit(1)
  }

  // Validate screenId exists in workspace
  const config = readWorkspaceConfig(wsDir)
  const allScreens = Object.values(config.screenOrder).flat()
  if (!allScreens.includes(screenId)) {
    console.error(r(`✗ screenId '${screenId}' not found in workspace flows`))
    const close = allScreens.filter(s => s.startsWith(screenId.split('-')[0]))
    if (close.length > 0) console.error(d(`  Did you mean: ${close.join(', ')}`))
    console.error(d(`  Available screens: ${allScreens.join(', ')}`))
    process.exit(1)
  }

  const fpPath = flowplanPath(wsDir, fpId)
  if (!fs.existsSync(fpPath)) {
    console.error(r(`✗ Flowplan not found: flowplans/${fpId}.ts`))
    console.error(d(`  Create it first: flowkit create:flowplan --name:${fpId}`))
    process.exit(1)
  }

  const step = { screenId }
  if (on) step.on = on
  if (actionNote) step.actionNote = actionNote

  const fp = parseFlowplan(fpPath)
  if (!fp) {
    console.error(r(`✗ Failed to parse flowplans/${fpId}.ts — check for syntax errors`))
    process.exit(1)
  }

  const steps = fp.steps || []
  if (positionStr !== '') {
    const position = parseInt(positionStr, 10)
    if (!isNaN(position)) steps.splice(position, 0, step)
    else steps.push(step)
  } else {
    steps.push(step)
  }
  rewriteSteps(fpPath, steps)

  console.log(g(`✓ Step added to flowplans/${fpId}.ts`))
  console.log(
    `  ${d('screen:')} ${screenId}${on ? `  ${d('on:')} ${on}` : ''}${actionNote ? `  ${d('action:')} ${actionNote}` : ''}`
  )
  console.log('')
  console.log(d(`View: flowkit list:steps --flowplan:${fpId}`))
}

export async function cmdRemoveStep(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  const fpId = parseStringFlag(args, 'flowplan')
  const indexStr = parseStringFlag(args, 'index')

  if (!fpId || indexStr === null || indexStr === undefined) {
    console.error(r('✗ --flowplan:<id> and --index:<n> are required (0-based)'))
    process.exit(1)
  }

  const fpPath = flowplanPath(wsDir, fpId)
  if (!fs.existsSync(fpPath)) {
    console.error(r(`✗ Flowplan not found: flowplans/${fpId}.ts`))
    process.exit(1)
  }

  const fp = parseFlowplan(fpPath)
  if (!fp) {
    console.error(r(`✗ Failed to parse flowplans/${fpId}.ts`))
    process.exit(1)
  }

  const idx = parseInt(indexStr, 10)
  const steps = fp.steps || []
  if (idx < 0 || idx >= steps.length) {
    console.error(r(`✗ Index ${idx} out of range (0–${steps.length - 1})`))
    process.exit(1)
  }

  const removed = steps.splice(idx, 1)[0]
  rewriteSteps(fpPath, steps)

  console.log(g(`✓ Removed step [${idx}]: screenId '${removed.screenId}'`))
  if (steps.length > 0) {
    console.log(d(`  Flowplan now has ${steps.length} step${steps.length !== 1 ? 's' : ''}`))
  }
}

export async function cmdListSteps(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  const fpId = parseStringFlag(args, 'flowplan')

  if (!fpId) {
    console.error(r('✗ --flowplan:<id> is required'))
    process.exit(1)
  }

  const fpPath = flowplanPath(wsDir, fpId)
  if (!fs.existsSync(fpPath)) {
    console.error(r(`✗ Flowplan not found: flowplans/${fpId}.ts`))
    process.exit(1)
  }

  const fp = parseFlowplan(fpPath)
  if (!fp) {
    console.error(r(`✗ Failed to parse flowplans/${fpId}.ts — check for syntax errors`))
    process.exit(1)
  }

  const steps = fp.steps || []
  console.log(b(`Steps  [${fpId}] — ${fp.name || fpId}\n`))

  if (steps.length === 0) {
    console.log(d('  (no steps)'))
    console.log(d(`  Add one: flowkit add:step --flowplan:${fpId} --screen:<screenId>`))
    return
  }

  steps.forEach((step, i) => {
    const idx = String(i).padStart(2)
    const on = step.on ? `  ${d(`on: ${step.on}`)}` : ''
    const note = step.actionNote ? `  ${d(`"${step.actionNote}"`)}` : ''
    console.log(`  [${idx}] ${c(step.screenId)}${on}${note}`)
  })
  console.log('')
  console.log(d(`Total: ${steps.length} step${steps.length !== 1 ? 's' : ''}`))
}

export async function cmdFlowplanInfo(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  const fpId = parseStringFlag(args, 'name')

  if (!fpId) {
    console.error(r('✗ --name:<flowplan-id> is required'))
    process.exit(1)
  }

  const fpPath = flowplanPath(wsDir, fpId)
  if (!fs.existsSync(fpPath)) {
    console.error(r(`✗ Flowplan not found: flowplans/${fpId}.ts`))
    process.exit(1)
  }

  const fp = parseFlowplan(fpPath)
  if (!fp) {
    console.error(r(`✗ Failed to parse flowplans/${fpId}.ts — check for syntax errors`))
    process.exit(1)
  }

  const steps = fp.steps || []
  console.log(b(`Flowplan: ${fpId}\n`))
  console.log(`  ID:          ${fp.id || fpId}`)
  console.log(`  Name:        ${fp.name || d('(not set)')}`)
  console.log(`  Description: ${fp.description || d('(not set)')}`)
  console.log(`  Steps:       ${steps.length}`)

  if (steps.length > 0) {
    console.log('')
    console.log(d('  First 5 steps:'))
    steps.slice(0, 5).forEach((step, i) => {
      const on = step.on ? ` → ${step.on}` : ''
      const note = step.actionNote ? ` — "${step.actionNote}"` : ''
      console.log(`    ${i + 1}. ${step.screenId}${on}${d(note)}`)
    })
    if (steps.length > 5) console.log(d(`    … and ${steps.length - 5} more`))
  }
}
