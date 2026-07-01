import { History, MapPin, Zap } from 'lucide-react'
import type React from 'react'

export type DebugSubTab = 'journey' | 'effects' | 'log'

export const DEBUG_SUB_TABS: { id: DebugSubTab; label: string; icon: React.ElementType }[] = [
  { id: 'journey', label: 'Journey', icon: MapPin },
  { id: 'effects', label: 'Effects', icon: Zap },
  { id: 'log', label: 'Log', icon: History },
]
