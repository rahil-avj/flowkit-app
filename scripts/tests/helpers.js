import fs from 'node:fs'
import path from 'node:path'
import { execSync, spawn } from 'node:child_process'
import {
  ROOT,
  WORKSPACES_DIR,
  WORKSPACES_JSON,
  PLATFORM_WORKSPACES_FILE as WORKSPACES_FILE,
  readWorkspacesJson,
} from '../helpers/paths.js'

const TSCONFIG_FILE = path.join(ROOT, 'tsconfig.app.json')

export function backupRegistry() {
  return {
    workspaces: fs.readFileSync(WORKSPACES_JSON, 'utf8'),
    tsconfig: fs.readFileSync(TSCONFIG_FILE, 'utf8'),
  }
}

export function restoreRegistry(snapshot) {
  fs.writeFileSync(WORKSPACES_JSON, snapshot.workspaces)
  fs.writeFileSync(TSCONFIG_FILE, snapshot.tsconfig)
}

export function parseRegistry() {
  const data = readWorkspacesJson()
  return {
    names: (data.workspaces ?? []).map(w => w.name),
    active: data.active ?? null,
    raw: data,
  }
}

export async function spawnCLI(args, stdinInput = null) {
  return new Promise(resolve => {
    const proc = spawn('node', ['scripts/flowkit.js', ...args], {
      cwd: ROOT,
      env: { ...process.env, FLOWKIT_NO_COLOR: '1' },
    })
    let stdout = '',
      stderr = ''
    proc.stdout.on('data', d => {
      stdout += d
    })
    proc.stderr.on('data', d => {
      stderr += d
    })
    if (stdinInput !== null) {
      proc.stdin.write(stdinInput + '\n')
      proc.stdin.end()
    }
    proc.on('close', code => resolve({ code, stdout, stderr }))
  })
}

export function runFormatCheck(target) {
  try {
    execSync(`npx prettier --check "${path.join(ROOT, target)}"`, { cwd: ROOT, stdio: 'pipe' })
    return 0
  } catch (e) {
    return e.status ?? 1
  }
}

export function runLint(target) {
  try {
    execSync(`npx eslint "${path.join(ROOT, target)}" --max-warnings=0`, {
      cwd: ROOT,
      stdio: 'pipe',
    })
    return 0
  } catch (e) {
    return e.status ?? 1
  }
}

export function cleanupWorkspace(name) {
  // FlowLens library lives inside the workspace dir (workspaces/<name>/lib/flowLens/),
  // so removing this one directory is sufficient — no separate path to clean up.
  const dir = path.join(ROOT, 'workspaces', name)
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true })
}

// Test workspace names used across suites — cleaned up on process exit as a safety net
const TEST_WS_NAMES = ['twsone', 'twstwo', 'twsync', 'twscheck']

let _registrySnapshot = null

export function registerSnapshotForEmergencyRestore(snapshot) {
  _registrySnapshot = snapshot
}

function emergencyCleanup() {
  for (const name of TEST_WS_NAMES) {
    cleanupWorkspace(name)
  }
  if (_registrySnapshot) {
    try {
      restoreRegistry(_registrySnapshot)
    } catch {
      // best-effort only
    }
  }
}

process.on('exit', emergencyCleanup)
process.on('SIGINT', () => {
  emergencyCleanup()
  process.exit(130)
})

export { ROOT, WORKSPACES_FILE, WORKSPACES_JSON, TSCONFIG_FILE, WORKSPACES_DIR, TEST_WS_NAMES }
