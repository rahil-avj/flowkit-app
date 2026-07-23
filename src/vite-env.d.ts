/// <reference types="vite/client" />

// ── FlowKit virtual module types ──────────────────────────────────────────────

declare module 'virtual:flowkit/config' {
  import type { FlowkitConfig } from '@flowkit/types/index'
  export const config: FlowkitConfig
}

declare module 'virtual:flowkit/screens' {
  import type { ScreenMeta } from '@flowkit/types/index'
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
    /** '__'-prefixed entries are filtered out before reaching this list entirely. */
    visibility?: 'normal' | 'hidden'
  }>
}

declare module 'virtual:flowkit/flowplans' {
  import type { FlowplanDef } from '@flowkit/types/index'
  export const flowplans: FlowplanDef[]
}

declare module 'virtual:flowkit/workspace' {
  import type React from 'react'

  export const workspaceName: string
  export const db: Record<string, unknown>
  export const logo: string | null
  export const loadSimulator: (() => Promise<{ default: React.ComponentType }>) | null
  export const loadTokens: (() => Promise<string>) | null
  export const sessions: Record<string, unknown>
}

declare module '@flowkit-shared/utils/screenPathIdentity' {
  export const MISC_FLOW_ID: string
  export function isNonExistent(segment: string): boolean
  export function isHidden(segment: string): boolean
  export function resolveVisibility(segments: string[]): 'normal' | 'hidden' | 'non-existent'
  export function parseVariant(stem: string): { componentName: string; variant: string }
  export interface ParsedScreenSegments {
    flow: string
    screen: string
    variant: string
    componentName: string
    visibility: 'normal' | 'hidden' | 'non-existent'
    cosmeticSegments: string[]
  }
  export function parseScreenSegments(segments: string[]): ParsedScreenSegments | null
  export function makeScreenId(flow: string, screen: string): string
  export function pickScreenFile(candidateFilenames: string[]): {
    chosen: string | null
    ambiguous: boolean
  }
}
