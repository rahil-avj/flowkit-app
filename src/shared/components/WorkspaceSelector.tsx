import { workspaces } from '@platform/workspaces'
import { storeWorkspace } from '@platform/workspaces'
import { listWorkspaceNames } from '@shared/utils/workspaceModules'

import NoWorkspace from './errors/NoWorkspace'

interface WorkspaceSelectorProps {
  onSelect: (name: string) => void
}

export default function WorkspaceSelector({ onSelect }: WorkspaceSelectorProps) {
  const names = listWorkspaceNames()

  if (names.length === 0) {
    return <NoWorkspace />
  }

  const handleSelect = (name: string) => {
    storeWorkspace(name)
    onSelect(name)
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-theme-base">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-ui-xl font-semibold text-theme-text-primary">Flowkit</p>
        <p className="text-ui-sm text-theme-text-muted">Select a workspace to open</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        {names.map(name => {
          const entry = workspaces.find(w => w.name === name)
          const label = entry?.label ?? name
          return (
            <button
              key={name}
              onClick={() => handleSelect(name)}
              className="flex w-full items-center justify-between rounded-[10px] border border-theme-border bg-theme-surface px-4 py-3 text-left transition-colors duration-150 hover:bg-theme-hover"
            >
              <span className="text-ui-sm font-medium text-theme-text-primary">{label}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-theme-text-muted"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )
        })}
      </div>
    </div>
  )
}
