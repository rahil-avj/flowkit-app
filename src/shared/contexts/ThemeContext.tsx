import type { Theme, UIScale } from '@flowkit/theme'
import { dark, light, uiScale } from '@flowkit/theme'
import { LS_THEME } from '@flowkit-shared/constants/storageKeys'
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  scale: UIScale
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

if (import.meta.hot && !import.meta.hot.data.ThemeContext) {
  import.meta.hot.data.ThemeContext = createContext<ThemeContextType | null>(null)
}
const ThemeContext =
  (import.meta.hot?.data.ThemeContext as
    ReturnType<typeof createContext<ThemeContextType | null>> | undefined) ??
  createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(LS_THEME)
    return saved === 'light' || saved === 'dark' ? saved : 'dark'
  })

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    localStorage.setItem(LS_THEME, m)
  }, [])

  const theme = mode === 'dark' ? dark : light

  useEffect(() => {
    const root = document.documentElement

    const injectThemeVariables = (obj: Record<string, unknown>, prefix = '--theme') => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          injectThemeVariables(value as Record<string, unknown>, `${prefix}-${key}`)
        } else if (typeof value === 'string') {
          // Convert camelCase key to kebab-case
          const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
          root.style.setProperty(`${prefix}-${kebabKey}`, value)
        }
      }
    }

    injectThemeVariables(theme as unknown as Record<string, unknown>)
  }, [theme])

  const value = useMemo(() => ({ theme, scale: uiScale, mode, setMode }), [theme, mode, setMode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
