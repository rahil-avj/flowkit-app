import { Monitor, Sliders } from 'lucide-react'
import type React from 'react'

export type SimSubTab = 'device' | 'workspace'

export const SIM_SUB_TABS: { id: SimSubTab; label: string; icon: React.ElementType }[] = [
  { id: 'device', label: 'Device', icon: Monitor },
  { id: 'workspace', label: 'Workspace', icon: Sliders },
]
