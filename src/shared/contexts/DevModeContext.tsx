import type { PageMetaPatchEntry } from '@flowkit-features/script-patch'
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

// ScreenEdit is the internal edit record (what the user typed); PageMetaPatchEntry
// is the shape expected by generatePageMetaPatch. They are kept aligned.
export type { PageMetaPatchEntry }

type ScreenEdit = PageMetaPatchEntry

interface DevModeCtx {
  devMode: boolean
  toggleDevMode: () => void
  pendingEdits: Map<string, ScreenEdit>
  setEdit: (pageId: string, edit: ScreenEdit) => void
  clearEdits: () => void
}

if (import.meta.hot && !import.meta.hot.data.DevModeContext) {
  import.meta.hot.data.DevModeContext = createContext<DevModeCtx | null>(null)
}
const DevModeContext =
  (import.meta.hot?.data.DevModeContext as
    ReturnType<typeof createContext<DevModeCtx | null>> | undefined) ??
  createContext<DevModeCtx | null>(null)

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [devMode, setDevMode] = useState(false)
  const [pendingEdits, setPendingEdits] = useState<Map<string, ScreenEdit>>(new Map())

  const toggleDevMode = useCallback(() => setDevMode(v => !v), [])

  const setEdit = useCallback((pageId: string, edit: ScreenEdit) => {
    setPendingEdits(prev => {
      const next = new Map(prev)
      next.set(pageId, edit)
      return next
    })
  }, [])

  const clearEdits = useCallback(() => setPendingEdits(new Map()), [])

  const value = useMemo(
    () => ({ devMode, toggleDevMode, pendingEdits, setEdit, clearEdits }),
    [devMode, toggleDevMode, pendingEdits, setEdit, clearEdits]
  )

  return <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>
}

export function useDevMode(): DevModeCtx {
  const ctx = useContext(DevModeContext)
  if (!ctx) throw new Error('useDevMode must be used within DevModeProvider')
  return ctx
}
