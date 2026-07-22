import Button from '@flowkit-shared/components/ui/Button'
import { useTheme } from '@flowkit-shared/contexts/ThemeContext'
import { AlertCircle } from 'lucide-react'
import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

interface Props {
  children: ReactNode
  workspaceName: string
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  error: Error | null
  info: ErrorInfo | null
}

function WorkspaceErrorPanel({
  workspaceName,
  message,
  stack,
  onReload,
  onDismiss,
}: {
  workspaceName: string
  message: string
  stack: string
  onReload: () => void
  onDismiss: () => void
}) {
  const { theme } = useTheme()

  return (
    <div className="flex items-center justify-center bg-theme-base font-[Inter,system-ui,sans-serif] size-full">
      <div
        className="w-full max-w-140 mx-8 bg-theme-surface rounded-xl overflow-hidden shadow-theme-card"
        style={{ border: `1px solid ${theme.accent.redDim}` }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-5 py-3.5"
          style={{
            background: theme.accent.redDim,
            borderBottom: `1px solid ${theme.accent.redDim}`,
          }}
        >
          <ErrorIcon color={theme.accent.red} />
          <div>
            <p className="text-ui-sm font-bold m-0" style={{ color: theme.accent.red }}>
              Workspace crashed
            </p>
            <p className="text-theme-text-muted text-ui-2xs m-0">{workspaceName}</p>
          </div>
        </div>

        {/* Error message */}
        <div className="px-5 py-4">
          <p className="text-theme-text-secondary text-[10px] font-bold uppercase tracking-[0.08em] mb-1.5">
            Error
          </p>
          <pre
            className="text-ui-xs rounded-md px-3 py-2.5 whitespace-pre-wrap wrap-break-word m-0 font-['JetBrains_Mono','Fira_Code',monospace]"
            style={{
              color: theme.accent.red,
              background: theme.accent.redDim,
              border: `1px solid ${theme.accent.redDim}`,
            }}
          >
            {message}
          </pre>

          {stack && (
            <details className="mt-3">
              <summary className="text-theme-text-muted text-[10px] cursor-pointer select-none tracking-[0.04em]">
                Component stack
              </summary>
              <pre className="text-theme-text-disabled text-[10px] mt-1.5 whitespace-pre-wrap wrap-break-word font-['JetBrains_Mono','Fira_Code',monospace] max-h-35 overflow-auto">
                {stack.trim()}
              </pre>
            </details>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-3" style={{ borderTop: `1px solid ${theme.bg.border}` }}>
          <Button onClick={onReload} style={{ flex: 1 }} variant="primary">
            Reload app
          </Button>
          <Button onClick={onDismiss} style={{ flex: 1 }} variant="secondary">
            Dismiss & retry
          </Button>
        </div>
      </div>
    </div>
  )
}

function ErrorIcon({ color }: { color: string }) {
  return <AlertCircle size={20} strokeWidth={1.5} color={color} />
}

export default class WorkspaceErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info })
    console.error(
      `[WorkspaceErrorBoundary] Crash in workspace "${this.props.workspaceName}":`,
      error,
      info
    )
    this.props.onError?.(error, info)
  }

  handleReload = () => window.location.reload()

  handleDismiss = () => this.setState({ error: null, info: null })

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children

    const stack = info?.componentStack ?? ''
    const message = error.message ?? String(error)

    return (
      <WorkspaceErrorPanel
        workspaceName={this.props.workspaceName}
        message={message}
        stack={stack}
        onReload={this.handleReload}
        onDismiss={this.handleDismiss}
      />
    )
  }
}
