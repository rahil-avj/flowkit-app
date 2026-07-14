// Authoring command: CRUD for screens within a flow (create/remove/rename/move/list/info).
import fs from 'fs'
import path from 'path'
import { parseStringFlag } from '../helpers/args.js'
import { resolveWorkspace } from '../helpers/workspace-resolve.js'
import {
  workspacePath,
  assertScopedWorkspaceDir,
  resolveTypeImport,
  detectWorkspaceLanguage,
} from '../helpers/paths.js'
import { asJsStringLiteral } from '../helpers/validate.js'
import { g, r, b, d, c } from '../helpers/colors.js'
import {
  readWorkspaceConfig,
  addScreen,
  removeScreen,
  renameScreen,
  moveScreen,
  screenExists,
  listScreens,
} from '../authoring-support/config-patch.js'
import { WORKSPACE_CONFIG_FILENAME } from '../helpers/config-filenames.js'

const KEBAB_RE = /^[a-z][a-z0-9-]*$/

function kebabValidate(id, label = 'name') {
  if (!KEBAB_RE.test(id)) throw new Error(`${label} '${id}' must be kebab-case (e.g. sign-in)`)
}

/** kebab-case → PascalCase: 'sign-in' → 'SignIn' */
function toPascal(kebab) {
  return kebab
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
}

/** kebab-case → Title Case label: 'sign-in' → 'Sign In' */
function toTitleLabel(kebab) {
  return kebab
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function screenTemplate(pascalName, label, isJs) {
  // onNext/db are prefixed with _ — the placeholder body doesn't use either yet,
  // and this project's tsconfig has noUnusedLocals: true, which flags unused
  // destructured bindings (TS6198) even though they're real, usable props the
  // author will wire up as they build the screen out. Not applicable in JS
  // mode (no tsconfig noUnusedLocals to satisfy), so the JS variant skips it.
  const header = isJs ? '' : `${resolveTypeImport('FlowScreenProps')}\n\n`
  const propsDestructure = isJs ? '{ onNext, db }' : '{ onNext: _onNext, db: _db }'
  const propsType = isJs ? '' : ': FlowScreenProps'
  return `${header}export default function ${pascalName}Screen(${propsDestructure}${propsType}) {
  return (
    <div className="flex flex-col h-full bg-theme-base">
      {/* Build your screen here */}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const screenMeta = { label: ${asJsStringLiteral(label)}, desc: '' }
`
}

/** Scan all flowplan files for any step referencing screenId. Returns list of flowplan ids. */
function findFlowplanRefs(wsDir, screenId) {
  const fpDir = path.join(wsDir, 'flowplans')
  if (!fs.existsSync(fpDir)) return []
  return fs
    .readdirSync(fpDir)
    .filter(f => f.endsWith('.ts'))
    .filter(f => {
      const src = fs.readFileSync(path.join(fpDir, f), 'utf8')
      return src.includes(`screenId: '${screenId}'`) || src.includes(`screenId: "${screenId}"`)
    })
    .map(f => f.replace('.ts', ''))
}

export async function cmdCreateScreen(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  let flowId = parseStringFlag(args, 'flow')
  let screenId = parseStringFlag(args, 'name')
  let label = parseStringFlag(args, 'label')

  if (!flowId || !screenId) {
    console.error(r('✗ --flow:<flow-id> and --name:<screen-id> are required'))
    console.error(
      d('  Example: flowkit create:screen --flow:auth --name:sign-in --label:"Sign In"')
    )
    process.exit(1)
  }

  flowId = flowId.trim()
  screenId = screenId.trim()

  try {
    kebabValidate(flowId, 'flow')
  } catch (e) {
    console.error(r(`✗ ${e.message}`))
    process.exit(1)
  }
  try {
    kebabValidate(screenId, 'screen name')
  } catch (e) {
    console.error(r(`✗ ${e.message}`))
    process.exit(1)
  }

  const config = readWorkspaceConfig(wsDir)
  if (!config.flows.includes(flowId)) {
    console.error(r(`✗ Flow '${flowId}' not found in workspace '${wsName}'`))
    console.error(d(`  Create it first: flowkit create:flow --name:${flowId}`))
    process.exit(1)
  }

  if (screenExists(wsDir, screenId)) {
    console.error(r(`✗ Screen '${screenId}' already exists in workspace '${wsName}'`))
    process.exit(1)
  }

  if (!label) label = toTitleLabel(screenId)

  const isJs = detectWorkspaceLanguage(wsDir) === 'js'
  const ext = isJs ? 'jsx' : 'tsx'
  const pascalName = toPascal(screenId)
  const screenDir = path.join(wsDir, 'flows', flowId, screenId)
  const screenFile = path.join(screenDir, `${pascalName}Screen.${ext}`)

  try {
    fs.mkdirSync(screenDir, { recursive: true })
    fs.writeFileSync(screenFile, screenTemplate(pascalName, label, isJs))
    addScreen(wsDir, flowId, screenId)
    console.log(g(`✓ Directory:  flows/${flowId}/${screenId}/`))
    console.log(g(`✓ Screen:     flows/${flowId}/${screenId}/${pascalName}Screen.${ext}`))
    console.log(g(`✓ Registered: ${WORKSPACE_CONFIG_FILENAME} → screenOrder.${flowId}[]`))
    console.log('')
    console.log(
      d(
        `Next: flowkit add:step --flowplan:${flowId} --screen:${screenId} --action:"User arrives at ${label}"`
      )
    )
  } catch (e) {
    if (fs.existsSync(screenDir)) fs.rmSync(screenDir, { recursive: true, force: true })
    console.error(r(`✗ Failed: ${e.message}`))
    process.exit(1)
  }
}

export async function cmdRemoveScreen(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  const flowId = parseStringFlag(args, 'flow')
  const screenId = parseStringFlag(args, 'name')

  if (!flowId || !screenId) {
    console.error(r('✗ --flow:<flow-id> and --name:<screen-id> are required'))
    process.exit(1)
  }
  try {
    kebabValidate(flowId, 'flow')
    kebabValidate(screenId, 'screen name')
  } catch (e) {
    console.error(r(`✗ ${e.message}`))
    process.exit(1)
  }

  const refs = findFlowplanRefs(wsDir, screenId)
  if (refs.length > 0) {
    console.log(r(`⚠  Warning: flowplan(s) reference '${screenId}': ${refs.join(', ')}`))
    console.log(r('   Update those flowplans after removing this screen.'))
  }

  removeScreen(wsDir, flowId, screenId)

  const screenDir = path.join(wsDir, 'flows', flowId, screenId)
  if (fs.existsSync(screenDir)) fs.rmSync(screenDir, { recursive: true, force: true })

  console.log(g(`✓ Removed:      flows/${flowId}/${screenId}/`))
  console.log(g(`✓ Unregistered: ${WORKSPACE_CONFIG_FILENAME} → screenOrder.${flowId}[]`))
}

export async function cmdRenameScreen(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  const flowId = parseStringFlag(args, 'flow')
  const oldId = parseStringFlag(args, 'name')
  const newId = parseStringFlag(args, 'to')

  if (!flowId || !oldId || !newId) {
    console.error(r('✗ --flow:<id> --name:<old-id> --to:<new-id> are required'))
    process.exit(1)
  }

  try {
    kebabValidate(flowId, 'flow')
    kebabValidate(oldId, 'name')
    kebabValidate(newId, 'new name')
  } catch (e) {
    console.error(r(`✗ ${e.message}`))
    process.exit(1)
  }

  const oldDir = path.join(wsDir, 'flows', flowId, oldId)
  const newDir = path.join(wsDir, 'flows', flowId, newId)

  if (!fs.existsSync(oldDir)) {
    console.error(r(`✗ Screen directory not found: flows/${flowId}/${oldId}/`))
    process.exit(1)
  }
  if (newId !== oldId && screenExists(wsDir, newId)) {
    console.error(r(`✗ Screen '${newId}' already exists in workspace '${wsName}'`))
    process.exit(1)
  }

  const oldPascal = toPascal(oldId)
  const newPascal = toPascal(newId)
  const ext =
    ['tsx', 'jsx'].find(e => fs.existsSync(path.join(oldDir, `${oldPascal}Screen.${e}`))) ?? 'tsx'
  const oldFile = path.join(oldDir, `${oldPascal}Screen.${ext}`)
  const newFile = path.join(oldDir, `${newPascal}Screen.${ext}`)

  // Steps below mutate the filesystem and then the config; if any step past
  // the first throws, roll back everything already applied so a failure never
  // leaves the screen file/dir renamed while workspace.ts still points at the
  // old id (or vice versa).
  let fileContentPatched = false
  let filePatchedBackup = null
  let fileRenamed = false
  let dirRenamed = false
  try {
    if (fs.existsSync(oldFile)) {
      filePatchedBackup = fs.readFileSync(oldFile, 'utf8')
      const patched = filePatchedBackup.replace(
        new RegExp(`export default function ${oldPascal}Screen\\b`),
        `export default function ${newPascal}Screen`
      )
      fs.writeFileSync(oldFile, patched)
      fileContentPatched = true
      if (oldFile !== newFile) {
        fs.renameSync(oldFile, newFile)
        fileRenamed = true
      }
    }
    fs.renameSync(oldDir, newDir)
    dirRenamed = true
    renameScreen(wsDir, flowId, oldId, newId)
  } catch (e) {
    if (dirRenamed) fs.renameSync(newDir, oldDir)
    if (fileRenamed) fs.renameSync(newFile, oldFile)
    if (fileContentPatched && filePatchedBackup !== null) {
      fs.writeFileSync(oldFile, filePatchedBackup)
    }
    console.error(r(`✗ Rename failed, rolled back: ${e.message}`))
    process.exit(1)
  }

  const refs = findFlowplanRefs(wsDir, oldId)
  if (refs.length > 0) {
    console.log(r(`⚠  Warning: flowplan(s) still reference '${oldId}': ${refs.join(', ')}`))
    console.log(r(`   Update step screenIds from '${oldId}' to '${newId}'.`))
  }

  console.log(g(`✓ Renamed:   flows/${flowId}/${oldId}/ → flows/${flowId}/${newId}/`))
  console.log(g(`✓ Renamed:   ${oldPascal}Screen.${ext} → ${newPascal}Screen.${ext}`))
  console.log(g(`✓ Updated:   ${WORKSPACE_CONFIG_FILENAME} → screenOrder.${flowId}[]`))
}

export async function cmdMoveScreen(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  const screenId = parseStringFlag(args, 'name')
  const fromFlow = parseStringFlag(args, 'from-flow')
  const toFlow = parseStringFlag(args, 'to-flow')

  if (!screenId || !fromFlow || !toFlow) {
    console.error(r('✗ --name:<screen-id> --from-flow:<id> --to-flow:<id> are required'))
    process.exit(1)
  }
  try {
    kebabValidate(screenId, 'name')
    kebabValidate(fromFlow, 'from-flow')
    kebabValidate(toFlow, 'to-flow')
  } catch (e) {
    console.error(r(`✗ ${e.message}`))
    process.exit(1)
  }

  if (fromFlow === toFlow) {
    console.error(r(`✗ Screen '${screenId}' is already in flow '${fromFlow}'`))
    process.exit(1)
  }

  const fromDir = path.join(wsDir, 'flows', fromFlow, screenId)
  const toDir = path.join(wsDir, 'flows', toFlow, screenId)

  if (!fs.existsSync(fromDir)) {
    console.error(r(`✗ Screen not found: flows/${fromFlow}/${screenId}/`))
    process.exit(1)
  }
  if (fs.existsSync(toDir)) {
    console.error(r(`✗ Screen already exists at destination: flows/${toFlow}/${screenId}/`))
    process.exit(1)
  }

  const toFlowDir = path.join(wsDir, 'flows', toFlow)
  if (!fs.existsSync(toFlowDir)) {
    console.error(r(`✗ Destination flow '${toFlow}' directory not found`))
    console.error(d(`  Create it first: flowkit create:flow --name:${toFlow}`))
    process.exit(1)
  }

  fs.renameSync(fromDir, toDir)
  moveScreen(wsDir, screenId, fromFlow, toFlow)

  console.log(g(`✓ Moved:   flows/${fromFlow}/${screenId}/ → flows/${toFlow}/${screenId}/`))
  console.log(
    g(`✓ Updated: ${WORKSPACE_CONFIG_FILENAME} (removed from '${fromFlow}', added to '${toFlow}')`)
  )
}

export async function cmdListScreens(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  const filterFlow = parseStringFlag(args, 'flow')
  const config = readWorkspaceConfig(wsDir)
  const screenOrder = listScreens(wsDir, filterFlow || undefined)

  const flows = filterFlow ? [filterFlow] : config.flows

  if (flows.length === 0) {
    console.log(d(`No flows in workspace '${wsName}'`))
    return
  }

  console.log(b(`Screens  [${wsName}]${filterFlow ? ` — flow: ${filterFlow}` : ''}\n`))
  let total = 0
  for (const flowId of flows) {
    const screens = screenOrder[flowId] || []
    console.log(`  ${c(flowId)}  ${d(`(${screens.length})`)}`)
    screens.forEach((s, i) => console.log(`    ${d(`${i + 1}.`)} ${s}`))
    if (screens.length === 0) console.log(d('    (no screens)'))
    total += screens.length
    console.log('')
  }
  console.log(
    d(
      `Total: ${total} screen${total !== 1 ? 's' : ''} across ${flows.length} flow${flows.length !== 1 ? 's' : ''}`
    )
  )
}

export async function cmdScreenInfo(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  const flowId = parseStringFlag(args, 'flow')
  const screenId = parseStringFlag(args, 'name')

  if (!flowId || !screenId) {
    console.error(r('✗ --flow:<id> and --name:<screen-id> are required'))
    process.exit(1)
  }

  const pascalName = toPascal(screenId)
  const screenDir = path.join(wsDir, 'flows', flowId, screenId)
  const ext = ['tsx', 'jsx'].find(e =>
    fs.existsSync(path.join(screenDir, `${pascalName}Screen.${e}`))
  )

  if (!ext) {
    console.error(r(`✗ Screen file not found: flows/${flowId}/${screenId}/${pascalName}Screen.tsx`))
    process.exit(1)
  }
  const screenFile = path.join(screenDir, `${pascalName}Screen.${ext}`)

  const src = fs.readFileSync(screenFile, 'utf8')

  const labelMatch = src.match(/label:\s*['"]([^'"]+)['"]/)
  const descMatch = src.match(/desc:\s*['"]([^'"]*)['"]/)
  const imports = [...src.matchAll(/^import\s+.*from\s+['"]([^'"]+)['"]/gm)].map(m => m[1])

  console.log(b(`Screen: ${pascalName}Screen\n`))
  console.log(`  Flow:      ${flowId}`)
  console.log(`  Screen ID: ${screenId}`)
  console.log(`  File:      flows/${flowId}/${screenId}/${pascalName}Screen.${ext}`)
  console.log(`  Label:     ${labelMatch ? labelMatch[1] : d('(not set)')}`)
  console.log(`  Desc:      ${descMatch && descMatch[1] ? descMatch[1] : d('(not set)')}`)
  if (imports.length > 0) {
    console.log(`  Imports:`)
    imports.forEach(imp => console.log(`    ${d(imp)}`))
  }
}
