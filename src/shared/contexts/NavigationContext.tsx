import { createContext, useContext } from 'react'

import type { Orientation } from './DashboardContext'

export interface NavigationContextValue {
  activeViewId: string
  firstViewId: string
  canGoBack: boolean
  activeVariantByView: Record<string, string>
  navigateTo: (id: string) => void
  goBack: () => void
  goHome: () => void
  resetToFirst: () => void
  setVariantForView: (viewId: string, serial: string) => void
  // Orientation lives here because it drives navigation-level layout decisions
  // (device shell chrome, canvas fit) and is tightly coupled to goHome/goBack flows.
  orientation: Orientation
  toggleOrientation: () => void
}

if (import.meta.hot && !import.meta.hot.data.NavigationContext) {
  import.meta.hot.data.NavigationContext = createContext<NavigationContextValue | null>(null)
}
export const NavigationContext =
  (import.meta.hot?.data.NavigationContext as
    ReturnType<typeof createContext<NavigationContextValue | null>> | undefined) ??
  createContext<NavigationContextValue | null>(null)

export function useNavigation() {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useNavigation must be used within DashboardProvider')
  return ctx
}
