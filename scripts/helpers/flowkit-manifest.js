// Helper: read/write/validate the consumer project's flowkit.mode / flowkit.workspaces
// declaration in package.json. Used only by flat-mode-facing commands (convert:multi,
// convert:flat, add:workspace, remove:workspace, rename:workspace) — never by this
// repo's own repo-mode workspace CLI (nw/rw/watch), which is unrelated and untouched.
//
// Mode and workspace list are both declared explicitly in package.json, never inferred
// from folder shape. Two prior mode-detection incidents in paths.js (see the comment
// above isRepoMode()) came from inferring repo-mode vs. flat-mode from folder contents
// or node_modules path structure — both broke in ways that misrouted destructive
// operations. Declared-and-checkable beats inferred-and-magic for anything a
// delete/move command reads before acting.
import fs from 'fs'
import path from 'path'

function packageJsonPath(cwd = process.cwd()) {
  return path.join(cwd, 'package.json')
}

function readPackageJson(cwd = process.cwd()) {
  const p = packageJsonPath(cwd)
  if (!fs.existsSync(p)) throw new Error(`No package.json found at ${p}`)
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writePackageJson(pkg, cwd = process.cwd()) {
  fs.writeFileSync(packageJsonPath(cwd), JSON.stringify(pkg, null, 2) + '\n')
}

/** Reads the flowkit manifest block. Absent/missing key defaults to flat mode, no workspaces list. */
export function readFlowkitManifest(cwd = process.cwd()) {
  const pkg = readPackageJson(cwd)
  const flowkit = pkg.flowkit ?? {}
  return {
    mode: flowkit.mode === 'multi' ? 'multi' : 'flat',
    workspaces: Array.isArray(flowkit.workspaces) ? flowkit.workspaces : [],
  }
}

export function isMultiMode(cwd = process.cwd()) {
  return readFlowkitManifest(cwd).mode === 'multi'
}

/** Merges { mode, workspaces } into package.json's flowkit key and writes it back. */
export function writeFlowkitManifest(patch, cwd = process.cwd()) {
  const pkg = readPackageJson(cwd)
  pkg.flowkit = { ...(pkg.flowkit ?? {}), ...patch }
  writePackageJson(pkg, cwd)
}

/** Removes the flowkit key from package.json entirely — reverts to flat's "absent key" convention. */
export function clearFlowkitManifest(cwd = process.cwd()) {
  const pkg = readPackageJson(cwd)
  delete pkg.flowkit
  writePackageJson(pkg, cwd)
}

/**
 * Call at the top of any command that only makes sense in multi-workspace mode.
 * Mirrors requireRepoMode()'s pattern in scripts/helpers/paths.js.
 */
export function requireMultiMode(commandLabel, cwd = process.cwd()) {
  if (isMultiMode(cwd)) return
  console.log('')
  console.log(`✗ ${commandLabel} requires a multi-workspace project.`)
  console.log('  Run `flowkit convert:multi` first to enable multiple workspaces.')
  console.log('')
  process.exit(1)
}

/**
 * Call at the top of any command that only makes sense in flat (single-workspace) mode.
 */
export function requireFlatMode(commandLabel, cwd = process.cwd()) {
  if (!isMultiMode(cwd)) return
  console.log('')
  console.log(`✗ ${commandLabel} is not available in a multi-workspace project.`)
  console.log('  Run `flowkit convert:flat` first to collapse to a single workspace.')
  console.log('')
  process.exit(1)
}

/**
 * Hard safety net for any code path about to move/delete a named workspace folder in
 * flat/multi consumer mode. Mirrors assertScopedWorkspaceDir() in paths.js — throws
 * rather than acting if the resolved path collapses onto the project root, its parent,
 * or a filesystem root.
 */
export function assertScopedConsumerWorkspaceDir(wsDir, name, cwd = process.cwd()) {
  const resolved = path.resolve(wsDir)
  const root = path.resolve(cwd)
  const unsafe = [root, path.dirname(root), path.parse(resolved).root]
  if (!name || unsafe.some(p => path.resolve(p) === resolved)) {
    throw new Error(
      `Refusing to act on unsafe path "${resolved}" for workspace "${name}". ` +
        `Manifest resolution may be misresolving — investigate before retrying.`
    )
  }
}
