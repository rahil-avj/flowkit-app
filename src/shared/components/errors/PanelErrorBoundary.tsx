import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

interface Props {
  children: ReactNode
  fallback: ReactNode
}

interface State {
  caught: boolean
}

/**
 * Lightweight boundary for panel-level subtrees (FlowLens, Feedback, screen render).
 * Shows a caller-provided fallback; does not reload the app.
 */
export default class PanelErrorBoundary extends Component<Props, State> {
  state: State = { caught: false }

  static getDerivedStateFromError(): State {
    return { caught: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PanelErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ caught: false })

  render() {
    if (this.state.caught) return this.props.fallback
    return this.props.children
  }
}
