interface NoWorkspaceProps {
  onAction?: () => void
}

export default function NoWorkspace({ onAction }: NoWorkspaceProps) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-theme-base">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center justify-center rounded-xl bg-theme-elevated opacity-60 size-12">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-theme-text-muted"
          >
            <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-ui-md font-semibold text-theme-text-primary">No workspace</p>
          <p className="max-w-xs text-ui-sm text-theme-text-muted">
            Create a workspace with{' '}
            <code className="rounded bg-theme-elevated px-1 py-0.5 font-mono text-ui-xs text-theme-text-secondary">
              npm run cli
            </code>{' '}
            to get started.
          </p>
        </div>
        {onAction && (
          <button
            onClick={onAction}
            className="rounded-md bg-theme-blue px-3 py-1.5 text-ui-sm font-semibold text-white transition-colors duration-120 hover:opacity-90"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  )
}
