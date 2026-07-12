import type { FlowNode } from '@flowkit/types/index'
import type { PaletteItem } from '@flowkit-features/command-palette'
import { CommandPalette } from '@flowkit-features/command-palette'
import { dispatchExplorerCommand } from '@flowkit-shared/utils/explorerCommands'
import { Search } from 'lucide-react'
import { useCallback, useState } from 'react'

import type { GoToItemMeta } from './types'
import { useGoToItems } from './useGoToItems'

interface Props {
  flows: FlowNode[]
  activeViewId: string
  navigateTo: (id: string) => void
  onClose: () => void
}

function useGoToHandlers({ flows, activeViewId, navigateTo, onClose }: Props) {
  const [query, setQuery] = useState('')
  const groups = useGoToItems({ flows, activeViewId, query })

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      const meta = item.meta as GoToItemMeta | undefined

      if (meta?.kind === 'screen') {
        navigateTo(item.id)
        dispatchExplorerCommand({ type: 'switchTab', tab: 'screens' })
        if (meta.flowId) {
          dispatchExplorerCommand({
            type: 'expandAndHighlight',
            flowId: meta.flowId,
            screenId: item.id,
          })
        }
      } else if (meta?.kind === 'flow') {
        dispatchExplorerCommand({ type: 'switchTab', tab: 'screens' })
        if (meta.flowId) {
          const firstScreenId = meta.firstScreenId ?? ''
          dispatchExplorerCommand({
            type: 'expandAndHighlight',
            flowId: meta.flowId,
            screenId: firstScreenId,
          })
          if (firstScreenId) navigateTo(firstScreenId)
        }
      } else if (meta?.kind === 'flowplan') {
        dispatchExplorerCommand({ type: 'switchTab', tab: 'flows' })
        dispatchExplorerCommand({ type: 'openFlowplanDetail', flowplanId: item.id })
      }

      onClose()
    },
    [navigateTo, onClose]
  )

  return { groups, handleSelect, setQuery }
}

// ── Inline content (no shell — for BottomSheet / mobile) ─────────────────────

export function GoToOverlayContent({ flows, activeViewId, navigateTo, onClose }: Props) {
  const { groups, handleSelect, setQuery } = useGoToHandlers({
    flows,
    activeViewId,
    navigateTo,
    onClose,
  })

  return (
    <CommandPalette
      modal={false}
      headerIcon={Search}
      placeholder="Go to screen, flow, or flow plan…"
      source={groups}
      onSelect={handleSelect}
      onClose={onClose}
      grouping="flat"
      filters={{ kinds: true, tags: true }}
      onQueryChange={setQuery}
    />
  )
}

// ── Modal wrapper (desktop overlay) ──────────────────────────────────────────

export default function GoToOverlay({ flows, activeViewId, navigateTo, onClose }: Props) {
  const { groups, handleSelect, setQuery } = useGoToHandlers({
    flows,
    activeViewId,
    navigateTo,
    onClose,
  })

  return (
    <CommandPalette
      headerIcon={Search}
      placeholder="Go to screen, flow, or flow plan…"
      source={groups}
      onSelect={handleSelect}
      onClose={onClose}
      grouping="flat"
      filters={{ kinds: true, tags: true }}
      onQueryChange={setQuery}
    />
  )
}
