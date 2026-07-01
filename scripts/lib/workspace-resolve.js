import fs from 'fs'
import path from 'path'
import { workspacePath, getActiveWorkspaceName } from './paths.js'
import { red } from './colors.js'

/**
 * Resolve a workspace name from a CLI value string (e.g. from `:<name>` flag).
 * Falls back to the active workspace. Exits with code 1 if the directory doesn't exist.
 */
export function resolveWorkspace(val) {
  const ws = (val || '').trim() || getActiveWorkspaceName()
  if (!fs.existsSync(workspacePath(ws))) {
    console.error(red(`✗ Workspace not found: ${workspacePath(ws)}`))
    process.exit(1)
  }
  return ws
}

/**
 * Same as resolveWorkspace but does NOT validate existence.
 * Use when the workspace directory may not exist yet (e.g. feedback import).
 */
export function resolveWorkspaceLoose(val) {
  return (val || '').trim() || getActiveWorkspaceName()
}
