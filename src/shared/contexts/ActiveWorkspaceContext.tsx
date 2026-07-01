import { createContext, useContext } from 'react'

export const ActiveWorkspaceContext = createContext<string>('')

export function useActiveWorkspace(): string {
  return useContext(ActiveWorkspaceContext)
}
