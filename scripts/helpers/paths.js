// Helper: root/mode resolution, workspace path safety, and repo/flat-mode detection.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, '../..')
export const WORKSPACES_DIR = path.join(ROOT, 'workspaces')
export const PLATFORM_WORKSPACES_FILE = path.join(ROOT, 'src', 'workspaces.ts')
export const WORKSPACES_JSON = path.join(ROOT, 'src', 'workspaces.json')

export function readWorkspacesJson() {
  try {
    return JSON.parse(fs.readFileSync(WORKSPACES_JSON, 'utf8'))
  } catch {
    return { workspaces: [], active: null }
  }
}

export function writeWorkspacesJson(data) {
  fs.writeFileSync(WORKSPACES_JSON, JSON.stringify(data, null, 2) + '\n')
}

export function listWorkspaceDirs() {
  if (!fs.existsSync(WORKSPACES_DIR)) return []
  return fs
    .readdirSync(WORKSPACES_DIR)
    .filter(d => fs.statSync(path.join(WORKSPACES_DIR, d)).isDirectory())
}

// ── Flat-mode detection ───────────────────────────────────────────────────────
//
// Repo mode:  flowkit is running from its own source tree (this platform repo).
// Flat mode:  flowkit is installed as a dependency inside an author's project.
//
// History of this check, because it has broken twice for two different reasons:
//
// 1. Originally keyed off whether CWD has a workspaces/ directory. Wrong — this
//    repo can legitimately have zero workspaces (freshly cloned, between `nw`
//    and the first workspace, or mid single-workspace migration) while still
//    being repo mode. When it misfired, `workspacePath()` fell through to its
//    flat-mode branch (`return process.cwd()`), and `flowkit rw` run from the
//    repo root deleted the entire repo.
// 2. Fixed by keying off `node_modules` appearing in ROOT's path (a structural
//    fact of how flowkit was installed, which can't drift the way a
//    directory's contents can) — but this broke too: `npm install` on a
//    `file:` dependency (exactly what create-flowkit-app's --local-dev escape
//    hatch produces, and what `npm link` produces) creates a SYMLINK, not a
//    copy, under node_modules. `import.meta.url` resolves through that symlink
//    to ROOT's realpath, which has no `node_modules` segment at all — so a
//    flat-mode project using a symlinked flowkit dependency was misdetected as
//    repo mode, pointing every workspace-scoped path at the real monorepo on
//    the developer's machine instead of the flat project. Confirmed live by
//    scaffolding via create-flowkit-app and running `flowkit status` from
//    inside it.
//
// Current approach: a marker file (.flowkit-repo-root) at this repo's actual
// root, tracked in git, deliberately excluded from package.json's "files"
// allowlist so it never ships to any real install — npm registry, git dep, or
// `file:` dep, symlinked or copied. Its presence is the one signal that
// distinguishes "the real monorepo checkout" from any way flowkit can be
// consumed as a dependency, and its absence fails toward the SAFE direction
// (repo-only commands get wrongly blocked, not wrongly allowed against the
// wrong ROOT).

const REPO_ROOT_MARKER = path.join(ROOT, '.flowkit-repo-root')

export function isRepoMode() {
  return fs.existsSync(REPO_ROOT_MARKER)
}

/**
 * Resolve the root directory for a workspace's files.
 * Repo mode: ROOT/workspaces/<name>
 * Flat mode: process.cwd() (the author project root)
 */
export function workspacePath(name) {
  if (isRepoMode()) return path.join(ROOT, 'workspaces', name)
  return process.cwd()
}

/**
 * Resolve the active workspace's display name.
 * Flat mode: the author project has exactly one implicit workspace — use its
 * directory's own name rather than a hardcoded placeholder.
 * Repo mode: read from src/workspaces.json, falling back to the first
 * workspace directory found.
 */
export function getActiveWorkspaceName() {
  if (!isRepoMode()) {
    return path.basename(process.cwd())
  }
  try {
    const data = readWorkspacesJson()
    if (data.active && fs.existsSync(path.join(WORKSPACES_DIR, data.active))) {
      return data.active
    }
  } catch {
    /* fallthrough */
  }
  const dirs = listWorkspaceDirs()
  return dirs[0] ?? 'demo'
}

/**
 * Call at the top of any CLI command that only makes sense in repo mode.
 * Prints a consistent flat-mode message and exits — replaces hand-copied
 * console.log blocks per command.
 */
export function requireRepoMode(commandLabel, flatModeHint) {
  if (isRepoMode()) return
  console.log('')
  console.log(`✗ ${commandLabel} is not available in author (flat) projects.`)
  if (flatModeHint) console.log(`  ${flatModeHint}`)
  console.log('')
  process.exit(1)
}

/**
 * Hard safety net for any code path about to recursively delete a named
 * workspace's directory. Throws rather than deleting if the resolved path
 * collapses onto ROOT, CWD, or a filesystem root — which should never happen
 * for a *named* workspace, and only would if isRepoMode()/workspacePath()
 * regress the way they did once before (see note above isRepoMode()).
 */
export function assertScopedWorkspaceDir(wsDir, name) {
  const resolved = path.resolve(wsDir)
  const unsafe = [ROOT, path.dirname(ROOT), process.cwd(), path.parse(resolved).root]
  if (!name || unsafe.some(p => path.resolve(p) === resolved)) {
    throw new Error(
      `Refusing to delete unsafe path "${resolved}" for workspace "${name}". ` +
        `isRepoMode()/workspacePath() may be misresolving — investigate before retrying.`
    )
  }
}

/**
 * Resolve the active workspace name.
 * Flat mode: read from flowkit.config.ts workspace.name, or use dirname.
 */
export function activeWorkspaceDir() {
  if (isRepoMode()) {
    const name = getActiveWorkspaceName()
    return path.join(ROOT, 'workspaces', name)
  }
  return process.cwd()
}

const STATE_FILE = path.join(ROOT, 'scripts', '.flowkit-state.json')

export function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

export function writeState(patch) {
  const current = readState()
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...current, ...patch }, null, 2))
}
