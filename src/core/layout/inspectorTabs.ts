import { InspectorTab } from '@shared/constants/tabs'
import { Activity, Database, Info, MessageSquare, Settings2, Workflow } from 'lucide-react'
import type React from 'react'

export type { InspectorTab } from '@shared/constants/tabs'
export type InspectorMode = 'fixed' | 'floating'

export const ALL_TABS: InspectorTab[] = ['feedback', 'info', 'simulator', 'flow', 'db', 'sessions']

/** Returns the tabs that should be visible given the current feature flags. */
export function getVisibleTabs(sessionsEnabled: boolean): InspectorTab[] {
  return ALL_TABS.filter(t => t !== 'sessions' || sessionsEnabled)
}

export const TAB_META: Record<InspectorTab, { label: string; icon: React.ElementType }> = {
  info: { label: 'Screen Info', icon: Info },
  simulator: { label: 'Simulator', icon: Settings2 },
  flow: { label: 'Flow Debugger', icon: Workflow },
  db: { label: 'Database', icon: Database },
  feedback: { label: 'Feedback', icon: MessageSquare },
  sessions: { label: 'Sessions', icon: Activity },
}
