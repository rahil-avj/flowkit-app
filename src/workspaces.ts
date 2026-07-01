import data from './workspaces.json'

export interface WorkspaceConfig {
  language?: 'ts' | 'js'
  kit?: string
}

export interface WorkspaceEntry {
  name: string
  label: string
  description?: string
  path: string
  config?: WorkspaceConfig
}

type JsonWorkspace = {
  name: string
  label: string
  description?: string
  language?: string
  kit?: string
}

export const workspaces: WorkspaceEntry[] = (data.workspaces as JsonWorkspace[]).map(w => {
  const config: WorkspaceConfig = {}
  if (w.kit && w.kit !== 'none') config.kit = w.kit
  if (w.language === 'js') config.language = 'js'
  return {
    name: w.name,
    label: w.label,
    ...(w.description ? { description: w.description } : {}),
    path: `workspaces/${w.name}`,
    ...(Object.keys(config).length ? { config } : {}),
  }
})

// ─── Runtime workspace selection (localStorage) ───────────────────────────────

export const LS_ACTIVE_WORKSPACE = 'flowkit:active_workspace'

export function getStoredWorkspace(): string | null {
  try {
    return localStorage.getItem(LS_ACTIVE_WORKSPACE)
  } catch {
    return null
  }
}

export function storeWorkspace(name: string): void {
  localStorage.setItem(LS_ACTIVE_WORKSPACE, name)
}

export function clearStoredWorkspace(): void {
  localStorage.removeItem(LS_ACTIVE_WORKSPACE)
}
