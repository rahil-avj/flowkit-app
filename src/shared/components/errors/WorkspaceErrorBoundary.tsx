import Button from '@flowkit-shared/components/ui/Button'
import { useTheme } from '@flowkit-shared/contexts/ThemeContext'
import { AlertCircle } from 'lucide-react'
import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

interface Props {
  children: ReactNode
  workspaceName: string
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
        className="w-full max-w-[560px] mx-[32px] bg-theme-surface rounded-[12px] overflow-hidden shadow-theme-card"
        style={{ border: `1px solid ${theme.accent.redDim}` }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-[10px] px-[20px] py-[14px]"
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
        <div className="px-[20px] py-[16px]">
          <p className="text-theme-text-secondary text-[10px] font-bold uppercase tracking-[0.08em] mb-[6px]">
            Error
          </p>
          <pre
            className="text-ui-xs rounded-[6px] px-[12px] py-[10px] whitespace-pre-wrap wrap-break-word m-0 font-['JetBrains_Mono','Fira_Code',monospace]"
            style={{
              color: theme.accent.red,
              background: theme.accent.redDim,
              border: `1px solid ${theme.accent.redDim}`,
            }}
          >
            {message}
          </pre>

          {stack && (
            <details className="mt-[12px]">
              <summary className="text-theme-text-muted text-[10px] cursor-pointer select-none tracking-[0.04em]">
                Component stack
              </summary>
              <pre className="text-theme-text-disabled text-[10px] mt-[6px] whitespace-pre-wrap wrap-break-word font-['JetBrains_Mono','Fira_Code',monospace] max-h-[140px] overflow-auto">
                {stack.trim()}
              </pre>
            </details>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex gap-[8px] px-[20px] py-[12px]"
          style={{ borderTop: `1px solid ${theme.bg.border}` }}
        >
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
