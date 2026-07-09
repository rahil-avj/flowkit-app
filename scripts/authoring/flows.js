// Authoring command: CRUD for flows (create/remove/list).
import fs from 'fs'
import path from 'path'
import { parseStringFlag } from '../helpers/args.js'
import { resolveWorkspace } from '../helpers/workspace-resolve.js'
import { workspacePath, assertScopedWorkspaceDir } from '../helpers/paths.js'
import { g, r, b, d } from '../helpers/colors.js'
import { addFlow, removeFlow, readWorkspaceConfig, flowExists } from '../authoring-support/config-patch.js'
import { prompt, selectFromList } from '../helpers/prompt.js'

const KEBAB_RE = /^[a-z][a-z0-9-]*$/

function kebabValidate(id, label = 'name') {
  if (!KEBAB_RE.test(id)) throw new Error(`${label} '${id}' must be kebab-case (e.g. user-auth)`)
}

export async function cmdCreateFlow(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  let flowId = parseStringFlag(args, 'name')

  if (!flowId) {
    const rl = (await import('readline')).createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    flowId = await prompt(rl, 'Flow ID (kebab-case): ')
    rl.close()
    if (!flowId) {
      console.error(r('✗ Flow name is required'))
      process.exit(1)
    }
  }

  flowId = flowId.trim()
  try {
    kebabValidate(flowId)
  } catch (e) {
    console.error(r(`✗ ${e.message}`))
    process.exit(1)
  }

  if (flowExists(wsDir, flowId)) {
    console.error(r(`✗ Flow '${flowId}' already exists`))
    process.exit(1)
  }

  const flowDir = path.join(wsDir, 'flows', flowId)

  try {
    fs.mkdirSync(flowDir, { recursive: true })
    addFlow(wsDir, flowId)
    console.log(g(`✓ Flow created:  flows/${flowId}/`))
    console.log(g(`✓ Registered:    flowkit.config.ts → flows[] + screenOrder`))
    console.log('')
    console.log(
      d(`Next: flowkit create:screen --flow:${flowId} --name:<first-screen> --label:"Screen Name"`)
    )
  } catch (e) {
    // Rollback on failure
    if (fs.existsSync(flowDir)) fs.rmSync(flowDir, { recursive: true, force: true })
    console.error(r(`✗ Failed: ${e.message}`))
    process.exit(1)
  }
}

export async function cmdRemoveFlow(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  const flowId = parseStringFlag(args, 'name')
  const force = args.includes('--force')

  if (!flowId) {
    console.error(r('✗ --name:<flow-id> is required'))
    process.exit(1)
  }
  try {
    kebabValidate(flowId)
  } catch (e) {
    console.error(r(`✗ ${e.message}`))
    process.exit(1)
  }

  if (!flowExists(wsDir, flowId)) {
    console.error(r(`✗ Flow '${flowId}' not found in workspace '${wsName}'`))
    process.exit(1)
  }

  const flowDir = path.join(wsDir, 'flows', flowId)
  if (fs.existsSync(flowDir)) {
    const screens = fs
      .readdirSync(flowDir)
      .filter(f => fs.statSync(path.join(flowDir, f)).isDirectory())
    if (screens.length > 0 && !force) {
      console.error(
        r(`✗ Flow '${flowId}' has ${screens.length} screen(s). Use --force to delete them.`)
      )
      process.exit(1)
    }
  }

  removeFlow(wsDir, flowId)
  if (fs.existsSync(flowDir)) fs.rmSync(flowDir, { recursive: true, force: true })
  console.log(g(`✓ Flow removed:  flows/${flowId}/`))
  console.log(g(`✓ Unregistered:  flowkit.config.ts`))
}

export async function cmdListFlows(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  const config = readWorkspaceConfig(wsDir)

  if (config.flows.length === 0) {
    console.log(d(`No flows in workspace '${wsName}'`))
    console.log(d('Create one: flowkit create:flow --name:<flow-id>'))
    return
  }

  console.log(b(`Flows  [${wsName}]\n`))
  for (const flowId of config.flows) {
    const screens = config.screenOrder[flowId] || []
    const count = String(screens.length).padStart(2)
    console.log(`  ${flowId.padEnd(28)} ${d(`${count} screen${screens.length !== 1 ? 's' : ''}`)}`)
  }
  console.log('')
  console.log(d(`Total: ${config.flows.length} flow${config.flows.length !== 1 ? 's' : ''}`))
}
