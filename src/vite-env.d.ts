/// <reference types="vite/client" />

// ── FlowKit virtual module types ──────────────────────────────────────────────

declare module 'virtual:flowkit/config' {
  import type { FlowkitConfig } from '@platform/types/index'
  export const config: FlowkitConfig
}

declare module 'virtual:flowkit/screens' {
  import type { ScreenMeta } from '@platform/types/index'
  import type React from 'react'
  /** Lazy screen loaders keyed by "flow/screenId" */
  export const screens: Record<
    string,
    () => Promise<{ default: React.ComponentType; screenMeta?: ScreenMeta }>
  >
  /** Pre-wrapped React.lazy() components keyed by "flow/screenId" */
  export const lazyScreens: Record<string, React.LazyExoticComponent<React.ComponentType>>
  /** Eagerly imported screenMeta per screen, keyed by "flow/screenId" */
  export const screenMeta: Record<string, ScreenMeta | undefined>
  /** Structured screen list for hierarchy building */
  export const screenList: Array<{
    key: string
    flow: string
    screenId: string
    loader: () => Promise<{ default: React.ComponentType; screenMeta?: ScreenMeta }>
  }>
}

declare module 'virtual:flowkit/flowplans' {
  import type { FlowplanDef } from '@platform/types/index'
  export const flowplans: FlowplanDef[]
}

declare module 'virtual:flowkit/workspace' {
  import type { AnnotationTag } from '@platform/types/index'
  import type React from 'react'

  export const workspaceName: string
  export const db: Record<string, unknown>
  export const logo: string | null
  export const loadSimulator: (() => Promise<{ default: React.ComponentType }>) | null
  export const loadTokens: (() => Promise<string>) | null
  export const tags: Record<string, AnnotationTag[]>
  export const sessions: Record<string, unknown>
}
