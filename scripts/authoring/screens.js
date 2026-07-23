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
import { asJsStringLiteral, assertKebab } from '../helpers/validate.js'
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
import {
  WORKSPACE_CONFIG_FILENAME,
  FLOW_BOOK_DIRNAME,
  FLOW_STORIES_DIRNAME,
} from '../helpers/config-filenames.js'
import { makeScreenId, isNonExistent, isHidden } from '../../src/shared/utils/screenPathIdentity.js'

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
  const header = isJs ? '' : `${resolveTypeImport('PageProps')}\n\n`
  const propsDestructure = isJs ? '{ onNext, db }' : '{ onNext: _onNext, db: _db }'
  const propsType = isJs ? '' : ': PageProps'
  return `${header}export default function ${pascalName}Screen(${propsDestructure}${propsType}) {
  return (
    <div className="flex flex-col h-full bg-theme-base">
      {/* Build your screen here */}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const pageMeta = { label: ${asJsStringLiteral(label)}, desc: '' }
`
}

/** Scan all flowplan files for any step referencing pageId. Returns list of flowplan ids. */
function findFlowplanRefs(wsDir, pageId) {
  const fpDir = path.join(wsDir, FLOW_STORIES_DIRNAME)
  if (!fs.existsSync(fpDir)) return []
  return fs
    .readdirSync(fpDir)
    .filter(f => f.endsWith('.ts'))
    .filter(f => {
      const src = fs.readFileSync(path.join(fpDir, f), 'utf8')
      return src.includes(`pageId: '${pageId}'`) || src.includes(`pageId: "${pageId}"`)
    })
    .map(f => f.replace('.ts', ''))
}

export async function cmdCreateScreen(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  let flowId = parseStringFlag(args, 'flow')
  let pageId = parseStringFlag(args, 'name')
  let label = parseStringFlag(args, 'label')

  if (!flowId || !pageId) {
    console.error(r('✗ --flow:<flow-id> and --name:<screen-id> are required'))
    console.error(
      d('  Example: flowkit create:screen --flow:auth --name:sign-in --label:"Sign In"')
    )
    process.exit(1)
  }

  try {
    flowId = assertKebab(flowId, 'flow')
    pageId = assertKebab(pageId, 'screen name')
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

  if (screenExists(wsDir, pageId)) {
    console.error(r(`✗ Screen '${pageId}' already exists in workspace '${wsName}'`))
    process.exit(1)
  }

  if (!label) label = toTitleLabel(pageId)

  const isJs = detectWorkspaceLanguage(wsDir) === 'js'
  const ext = isJs ? 'jsx' : 'tsx'
  const pascalName = toPascal(pageId)
  // The CLI always creates the standard 2-level shape (flow/screen, no cosmetic
  // folders in between) — variable-depth nesting is a hand-authoring capability,
  // not something this command needs to produce itself.
  const screenDir = path.join(wsDir, FLOW_BOOK_DIRNAME, flowId, pageId)
  // "Screen" suffix is no longer REQUIRED anywhere (screenPathIdentity.js derives
  // identity from folders, not filename) — but we keep generating it as the CLI's
  // own friendly convention default, since it costs nothing and reads clearly.
  const screenFile = path.join(screenDir, `${pascalName}Screen.${ext}`)
  // Collision-proof display/registration id: `${flowId}-${pageId}` — see
  // screenPathIdentity.js's makeScreenId(). config-patch.js's pageOrder map is
  // already flow-scoped (pageOrder[flowId] = [...]) so it stores the bare
  // pageId internally without risk of cross-flow collision; makeScreenId is
  // only needed where an id is shown to the user or would be compared globally.
  const fullScreenId = makeScreenId(flowId, pageId)

  try {
    fs.mkdirSync(screenDir, { recursive: true })
    fs.writeFileSync(screenFile, screenTemplate(pascalName, label, isJs))
    addScreen(wsDir, flowId, pageId)
    console.log(g(`✓ Directory:  ${FLOW_BOOK_DIRNAME}/${flowId}/${pageId}/`))
    console.log(
      g(`✓ Screen:     ${FLOW_BOOK_DIRNAME}/${flowId}/${pageId}/${pascalName}Screen.${ext}`)
    )
    console.log(
      g(`✓ Registered: ${WORKSPACE_CONFIG_FILENAME} → pageOrder.${flowId}[] (id: ${fullScreenId})`)
    )
    console.log('')
    console.log(
      d(
        `Next: flowkit add:step --flowplan:${flowId} --screen:${pageId} --action:"User arrives at ${label}"`
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
  let flowId = parseStringFlag(args, 'flow')
  let pageId = parseStringFlag(args, 'name')

  if (!flowId || !pageId) {
    console.error(r('✗ --flow:<flow-id> and --name:<screen-id> are required'))
    process.exit(1)
  }
  try {
    flowId = assertKebab(flowId, 'flow')
    pageId = assertKebab(pageId, 'screen name')
  } catch (e) {
    console.error(r(`✗ ${e.message}`))
    process.exit(1)
  }

  const refs = findFlowplanRefs(wsDir, pageId)
  if (refs.length > 0) {
    console.log(r(`⚠  Warning: flowplan(s) reference '${pageId}': ${refs.join(', ')}`))
    console.log(r('   Update those flowplans after removing this screen.'))
  }

  removeScreen(wsDir, flowId, pageId)

  // Keeping the CLI's own 2-level assumption for locating the folder to delete
  // (flowBook/<flow>/<screen>/) — a screen this command created is always
  // here; a hand-authored screen nested deeper (cosmetic folders in between)
  // is an advanced/manual case this command does not attempt to locate or
  // remove in this pass.
  const screenDir = path.join(wsDir, FLOW_BOOK_DIRNAME, flowId, pageId)
  if (fs.existsSync(screenDir)) fs.rmSync(screenDir, { recursive: true, force: true })

  const fullScreenId = makeScreenId(flowId, pageId)
  console.log(g(`✓ Removed:      ${FLOW_BOOK_DIRNAME}/${flowId}/${pageId}/`))
  console.log(
    g(`✓ Unregistered: ${WORKSPACE_CONFIG_FILENAME} → pageOrder.${flowId}[] (id: ${fullScreenId})`)
  )
}

export async function cmdRenameScreen(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  let flowId = parseStringFlag(args, 'flow')
  let oldId = parseStringFlag(args, 'name')
  let newId = parseStringFlag(args, 'to')

  if (!flowId || !oldId || !newId) {
    console.error(r('✗ --flow:<id> --name:<old-id> --to:<new-id> are required'))
    process.exit(1)
  }

  try {
    flowId = assertKebab(flowId, 'flow')
    oldId = assertKebab(oldId, 'name')
    newId = assertKebab(newId, 'new name')
  } catch (e) {
    console.error(r(`✗ ${e.message}`))
    process.exit(1)
  }

  // Same 2-level assumption as cmdRemoveScreen/cmdMoveScreen — see comment there.
  const oldDir = path.join(wsDir, FLOW_BOOK_DIRNAME, flowId, oldId)
  const newDir = path.join(wsDir, FLOW_BOOK_DIRNAME, flowId, newId)

  if (!fs.existsSync(oldDir)) {
    console.error(r(`✗ Screen directory not found: ${FLOW_BOOK_DIRNAME}/${flowId}/${oldId}/`))
    process.exit(1)
  }
  if (newId !== oldId && screenExists(wsDir, newId)) {
    console.error(r(`✗ Screen '${newId}' already exists in workspace '${wsName}'`))
    process.exit(1)
  }

  // The "Screen" suffix is no longer a REQUIREMENT for hand-authored files, but
  // this rename command still assumes it because the CLI's own create:screen
  // always generates it — this regex-based function-name patch only needs to
  // stay in sync with what this file itself produces, not with every possible
  // hand-authored filename. A screen that was hand-renamed away from the
  // "Screen" suffix convention won't be found here and rename will fall through
  // to the "not found" branch below (fileContentPatched stays false, no crash).
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

  console.log(
    g(
      `✓ Renamed:   ${FLOW_BOOK_DIRNAME}/${flowId}/${oldId}/ → ${FLOW_BOOK_DIRNAME}/${flowId}/${newId}/`
    )
  )
  console.log(g(`✓ Renamed:   ${oldPascal}Screen.${ext} → ${newPascal}Screen.${ext}`))
  console.log(
    g(
      `✓ Updated:   ${WORKSPACE_CONFIG_FILENAME} → pageOrder.${flowId}[] (id: ${makeScreenId(flowId, oldId)} → ${makeScreenId(flowId, newId)})`
    )
  )
}

export async function cmdMoveScreen(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  let pageId = parseStringFlag(args, 'name')
  let fromFlow = parseStringFlag(args, 'from-flow')
  let toFlow = parseStringFlag(args, 'to-flow')

  if (!pageId || !fromFlow || !toFlow) {
    console.error(r('✗ --name:<screen-id> --from-flow:<id> --to-flow:<id> are required'))
    process.exit(1)
  }
  try {
    pageId = assertKebab(pageId, 'name')
    fromFlow = assertKebab(fromFlow, 'from-flow')
    toFlow = assertKebab(toFlow, 'to-flow')
  } catch (e) {
    console.error(r(`✗ ${e.message}`))
    process.exit(1)
  }

  if (fromFlow === toFlow) {
    console.error(r(`✗ Screen '${pageId}' is already in flow '${fromFlow}'`))
    process.exit(1)
  }

  // Same 2-level assumption as cmdRemoveScreen/cmdRenameScreen — see comment there.
  const fromDir = path.join(wsDir, FLOW_BOOK_DIRNAME, fromFlow, pageId)
  const toDir = path.join(wsDir, FLOW_BOOK_DIRNAME, toFlow, pageId)

  if (!fs.existsSync(fromDir)) {
    console.error(r(`✗ Screen not found: ${FLOW_BOOK_DIRNAME}/${fromFlow}/${pageId}/`))
    process.exit(1)
  }
  if (fs.existsSync(toDir)) {
    console.error(
      r(`✗ Screen already exists at destination: ${FLOW_BOOK_DIRNAME}/${toFlow}/${pageId}/`)
    )
    process.exit(1)
  }

  const toFlowDir = path.join(wsDir, FLOW_BOOK_DIRNAME, toFlow)
  if (!fs.existsSync(toFlowDir)) {
    console.error(r(`✗ Destination flow '${toFlow}' directory not found`))
    console.error(d(`  Create it first: flowkit create:flow --name:${toFlow}`))
    process.exit(1)
  }

  fs.renameSync(fromDir, toDir)
  moveScreen(wsDir, pageId, fromFlow, toFlow)

  console.log(
    g(
      `✓ Moved:   ${FLOW_BOOK_DIRNAME}/${fromFlow}/${pageId}/ → ${FLOW_BOOK_DIRNAME}/${toFlow}/${pageId}/`
    )
  )
  console.log(
    g(
      `✓ Updated: ${WORKSPACE_CONFIG_FILENAME} (removed '${makeScreenId(fromFlow, pageId)}' from '${fromFlow}', added '${makeScreenId(toFlow, pageId)}' to '${toFlow}')`
    )
  )
}

/**
 * Registered screenIds are the bare screen-folder name (pageOrder is keyed
 * per-flow already, so no makeScreenId() prefix is stored internally — see
 * config-patch.js). A hidden screen's folder is literally named '_something',
 * so the registered pageId itself carries the single-'_' prefix; this just
 * re-uses screenPathIdentity.js's isHidden() on that raw id string.
 */
function isHiddenScreenId(pageId) {
  return isHidden(pageId)
}

/**
 * Walks flowBook/ on disk looking for '__'-prefixed folder/file segments —
 * non-existent items are excluded from pageOrder entirely (they're not
 * "registered" screens at all, by design), so `--gone` is the one listing mode
 * that can't be answered from workspace config and must scan the filesystem
 * directly. Returns a flat list of { flow, relPath } — relPath is the path
 * under flowBook/<flow>/ for display, kept as raw segments (not otherwise
 * parsed/identified) since a non-existent item has no real screen id.
 */
function findGoneItems(wsDir) {
  const root = path.join(wsDir, FLOW_BOOK_DIRNAME)
  if (!fs.existsSync(root)) return []
  const results = []

  function walk(flow, dir, segmentsSoFar) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const segs = [...segmentsSoFar, entry.name]
      if (isNonExistent(entry.name)) {
        results.push({ flow, relPath: segs.join('/') })
        // Don't recurse further in — everything below a '__' segment is
        // already covered by parent-dominance (resolveVisibility), no need
        // to enumerate it item-by-item as separate "gone" entries.
        continue
      }
      if (entry.isDirectory()) {
        walk(flow, path.join(dir, entry.name), segs)
      }
    }
  }

  for (const flowEntry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!flowEntry.isDirectory()) continue
    if (isNonExistent(flowEntry.name)) {
      results.push({ flow: flowEntry.name, relPath: '' })
      continue
    }
    walk(flowEntry.name, path.join(root, flowEntry.name), [])
  }
  return results
}

export async function cmdListScreens(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  const filterFlow = parseStringFlag(args, 'flow')
  // Presence-flags, consistent with the `args.includes('--flag')` convention
  // used elsewhere in this codebase (e.g. scripts/checks/index.js's --json,
  // scripts/authoring/flows.js's --force) — no dedicated boolean-flag helper
  // exists in helpers/args.js, so this matches existing practice rather than
  // inventing a new one.
  const showHidden = args.includes('--hidden')
  const showAll = args.includes('--all')
  const showGoneOnly = args.includes('--gone')

  const config = readWorkspaceConfig(wsDir)
  const pageOrder = listScreens(wsDir, filterFlow || undefined)
  const flows = filterFlow ? [filterFlow] : config.flows

  // --gone is a fully separate mode: registered pageOrder has no concept of
  // non-existent items (they're excluded from config by definition), so this
  // branch never touches pageOrder at all and returns early.
  if (showGoneOnly) {
    const gone = findGoneItems(wsDir).filter(item => !filterFlow || item.flow === filterFlow)
    console.log(b(`Non-existent (__)  [${wsName}]${filterFlow ? ` — flow: ${filterFlow}` : ''}\n`))
    if (gone.length === 0) {
      console.log(d('  (none found)'))
      return
    }
    for (const item of gone) {
      console.log(`  ${c(item.flow)}/${item.relPath ? item.relPath : d('(entire flow folder)')}`)
    }
    console.log('')
    console.log(d(`Total: ${gone.length} non-existent item${gone.length !== 1 ? 's' : ''}`))
    return
  }

  if (flows.length === 0) {
    console.log(d(`No flows in workspace '${wsName}'`))
    return
  }

  // registered pageOrder only ever contains normal + hidden screens (never
  // '__' ones) — visibility here is folder-name-only (single '_' prefix on the
  // pageId's own folder segment). This does not walk cosmetic in-between
  // folders for hidden-ness the way screenPathIdentity.js's full
  // resolveVisibility() does, since the CLI's own registered screens are
  // always the plain 2-level shape; a hand-authored deeper path with a hidden
  // cosmetic ancestor folder isn't reflected in pageOrder in the first place.
  const modeLabel = showAll ? ' — all tiers' : showHidden ? ' — including hidden' : ''
  console.log(b(`Screens  [${wsName}]${filterFlow ? ` — flow: ${filterFlow}` : ''}${modeLabel}\n`))

  let total = 0
  let hiddenTotal = 0
  for (const flowId of flows) {
    const screens = pageOrder[flowId] || []
    const visible = screens.filter(
      s => !isNonExistent(s) && (showAll || showHidden || !isHiddenScreenId(s))
    )
    console.log(`  ${c(flowId)}  ${d(`(${visible.length})`)}`)
    visible.forEach((s, i) => {
      const hiddenTag = isHiddenScreenId(s) ? d(' (hidden)') : ''
      console.log(`    ${d(`${i + 1}.`)} ${s}${hiddenTag}`)
      if (isHiddenScreenId(s)) hiddenTotal++
    })
    if (visible.length === 0) console.log(d('    (no screens)'))
    total += visible.length
    console.log('')
  }

  if (showAll) {
    const gone = findGoneItems(wsDir).filter(item => !filterFlow || item.flow === filterFlow)
    if (gone.length > 0) {
      console.log(`  ${d('Non-existent (__):')}`)
      gone.forEach(item =>
        console.log(`    ${d(`${item.flow}/${item.relPath || '(entire flow folder)'} (gone)`)}`)
      )
      console.log('')
    }
  }

  console.log(
    d(
      `Total: ${total} screen${total !== 1 ? 's' : ''} across ${flows.length} flow${flows.length !== 1 ? 's' : ''}` +
        (hiddenTotal > 0 ? ` (${hiddenTotal} hidden)` : '')
    )
  )
}

export async function cmdScreenInfo(_val, args = []) {
  const wsName = resolveWorkspace(parseStringFlag(args, 'workspace'))
  const wsDir = workspacePath(wsName)
  assertScopedWorkspaceDir(wsDir, wsName)
  const flowId = parseStringFlag(args, 'flow')
  const pageId = parseStringFlag(args, 'name')

  if (!flowId || !pageId) {
    console.error(r('✗ --flow:<id> and --name:<screen-id> are required'))
    process.exit(1)
  }

  const pascalName = toPascal(pageId)
  // Same 2-level assumption as remove/rename/move — see comment on cmdRemoveScreen.
  const screenDir = path.join(wsDir, FLOW_BOOK_DIRNAME, flowId, pageId)
  const ext = ['tsx', 'jsx'].find(e =>
    fs.existsSync(path.join(screenDir, `${pascalName}Screen.${e}`))
  )

  if (!ext) {
    console.error(
      r(`✗ Screen file not found: ${FLOW_BOOK_DIRNAME}/${flowId}/${pageId}/${pascalName}Screen.tsx`)
    )
    process.exit(1)
  }
  const screenFile = path.join(screenDir, `${pascalName}Screen.${ext}`)

  const src = fs.readFileSync(screenFile, 'utf8')

  const labelMatch = src.match(/label:\s*['"]([^'"]+)['"]/)
  const descMatch = src.match(/desc:\s*['"]([^'"]*)['"]/)
  const imports = [...src.matchAll(/^import\s+.*from\s+['"]([^'"]+)['"]/gm)].map(m => m[1])

  const fullScreenId = makeScreenId(flowId, pageId)
  console.log(b(`Screen: ${pascalName}Screen\n`))
  console.log(`  Flow:      ${flowId}`)
  console.log(`  Screen ID: ${pageId}  ${d(`(${fullScreenId})`)}`)
  console.log(`  File:      ${FLOW_BOOK_DIRNAME}/${flowId}/${pageId}/${pascalName}Screen.${ext}`)
  console.log(`  Label:     ${labelMatch ? labelMatch[1] : d('(not set)')}`)
  console.log(`  Desc:      ${descMatch && descMatch[1] ? descMatch[1] : d('(not set)')}`)
  if (imports.length > 0) {
    console.log(`  Imports:`)
    imports.forEach(imp => console.log(`    ${d(imp)}`))
  }
}
