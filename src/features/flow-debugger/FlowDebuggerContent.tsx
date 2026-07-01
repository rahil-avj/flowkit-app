import {
  readStorage,
  STORAGE_DEBUG_SUBTAB,
  SubTabBar,
} from '@platform/core/layout/KitSideInspector'
import { useSessionRecorderOptional } from '@platform/features/flowTracer/context'
import { useCallback, useState } from 'react'

import { DEBUG_SUB_TABS, type DebugSubTab } from './debugSubTabs'
import FlowDebuggerTab from './FlowDebuggerTab'

interface Props {
  /** When provided, component is controlled — caller owns the sub-tab state (e.g. for keyboard shortcuts). */
  subTab?: DebugSubTab
  onSubTabChange?: (tab: DebugSubTab) => void
}

export function FlowDebuggerContent({ subTab: subTabProp, onSubTabChange }: Props) {
  const [internalSubTab, setInternalSubTab] = useState<DebugSubTab>(
    () => readStorage(STORAGE_DEBUG_SUBTAB, 'journey') as DebugSubTab
  )
  const recorder = useSessionRecorderOptional()

  const subTab = subTabProp ?? internalSubTab

  const handleSelect = useCallback(
    (tab: DebugSubTab) => {
      if (onSubTabChange) {
        onSubTabChange(tab)
      } else {
        setInternalSubTab(tab)
      }
      recorder?.logEvent('panel.debug-subtab-changed', { tab })
    },
    [onSubTabChange, recorder]
  )

  return (
    <>
      <SubTabBar tabs={DEBUG_SUB_TABS} active={subTab} onSelect={handleSelect} />
      <div className="flex-1 overflow-y-auto flex flex-col text-xs font-semibold leading-relaxed p-3 gap-3">
        <FlowDebuggerTab subTab={subTab} />
      </div>
    </>
  )
}
