import type { PaletteGroup, PaletteItem } from '@platform/features/command-palette'
import { PALETTE_ACCENT_COLORS } from '@platform/features/command-palette'
import { useFlowLibrary } from '@platform/features/flow-library'
import { useActiveWorkspace } from '@platform/shared/contexts/ActiveWorkspaceContext'
import { useWorkspaceHierarchy } from '@platform/shared/utils/useWorkspaceHierarchy'
import type { FlowNode } from '@platform/types/index'
import { Folder, GitBranch, Smartphone } from 'lucide-react'
import { useMemo } from 'react'

import type { GoToItemMeta } from './types'

// Screens = blue [0], Flows = green [1], Flowplans = purple [2]
const SCREEN_COLOR = PALETTE_ACCENT_COLORS[0]
const FLOW_COLOR = PALETTE_ACCENT_COLORS[1]
const FLOWPLAN_COLOR = PALETTE_ACCENT_COLORS[2]

interface Options {
  flows: FlowNode[]
  activeViewId: string
  query: string
}

export function useGoToItems({ flows, activeViewId, query }: Options): PaletteGroup[] {
  const activeWorkspace = useActiveWorkspace()
  const { summaries } = useFlowLibrary()
  const { tree, hasHierarchy } = useWorkspaceHierarchy(activeWorkspace)
  const q = query.toLowerCase()

  return useMemo<PaletteGroup[]>(() => {
    const screenItems: PaletteItem[] = []
    const flowItems: PaletteItem[] = []

    if (hasHierarchy) {
      for (const projectNode of tree) {
        for (const flowNode of projectNode.children ?? []) {
          if (flowNode.kind !== 'flow') continue
          const flowId = flowNode.id
          const flowLabel = flowNode.label
          const screenChildren = (flowNode.children ?? []).filter(n => n.kind === 'screen')

          if (!q || flowLabel.toLowerCase().includes(q)) {
            const firstScreenId = screenChildren[0]?.id
            const meta: GoToItemMeta = { kind: 'flow', flowId, firstScreenId }
            flowItems.push({
              id: `flow:${flowId}`,
              label: flowLabel,
              subtitle: `${screenChildren.length} screen${screenChildren.length !== 1 ? 's' : ''}`,
              icon: Folder,
              iconColor: FLOW_COLOR,
              meta: meta as unknown as Record<string, unknown>,
            })
          }

          for (const screenNode of screenChildren) {
            if (!screenNode.view) continue
            const label = screenNode.label
            if (q && !label.toLowerCase().includes(q) && !flowLabel.toLowerCase().includes(q))
              continue
            const meta: GoToItemMeta = { kind: 'screen', flowId }
            const screenTags = screenNode.view.meta?.tags ?? []
            screenItems.push({
              id: screenNode.id,
              label,
              subtitle: flowLabel,
              icon: Smartphone,
              iconColor: SCREEN_COLOR,
              tags: screenTags,
              badges:
                screenNode.id === activeViewId ? [{ label: 'current', style: 'green' }] : undefined,
              meta: meta as unknown as Record<string, unknown>,
            })
          }
        }
      }
    } else {
      for (const flow of flows) {
        const screens = (flow.children ?? []).filter(v => !v.id.endsWith('-play'))

        if (!q || flow.label.toLowerCase().includes(q)) {
          const meta: GoToItemMeta = {
            kind: 'flow',
            flowId: flow.id,
            firstScreenId: screens[0]?.id,
          }
          flowItems.push({
            id: `flow:${flow.id}`,
            label: flow.label,
            subtitle: `${screens.length} screen${screens.length !== 1 ? 's' : ''}`,
            icon: Folder,
            iconColor: FLOW_COLOR,
            meta: meta as unknown as Record<string, unknown>,
          })
        }

        const matched = q
          ? screens.filter(
              s => s.label.toLowerCase().includes(q) || flow.label.toLowerCase().includes(q)
            )
          : screens
        for (const s of matched) {
          const meta: GoToItemMeta = { kind: 'screen', flowId: flow.id }
          screenItems.push({
            id: s.id,
            label: s.label,
            subtitle: flow.label,
            icon: Smartphone,
            iconColor: SCREEN_COLOR,
            tags: s.meta?.tags ?? [],
            badges: s.id === activeViewId ? [{ label: 'current', style: 'green' }] : undefined,
            meta: meta as unknown as Record<string, unknown>,
          })
        }
      }
    }

    const flowplanItems: PaletteItem[] = []
    for (const summary of summaries) {
      if (
        q &&
        !summary.name.toLowerCase().includes(q) &&
        !(summary.description ?? '').toLowerCase().includes(q)
      )
        continue
      const meta: GoToItemMeta = { kind: 'flowplan' }
      const subtitle =
        summary.tags.length > 0 ? summary.tags.slice(0, 3).join(', ') : `${summary.stepCount} steps`
      flowplanItems.push({
        id: summary.id,
        label: summary.name,
        subtitle,
        icon: GitBranch,
        iconColor: FLOWPLAN_COLOR,
        tags: summary.tags,
        meta: meta as unknown as Record<string, unknown>,
      })
    }

    return [
      { id: 'screens', label: 'Screens', items: screenItems, color: SCREEN_COLOR },
      { id: 'flows', label: 'Flows', items: flowItems, color: FLOW_COLOR },
      { id: 'flowplans', label: 'Flow Plans', items: flowplanItems, color: FLOWPLAN_COLOR },
    ]
  }, [flows, tree, hasHierarchy, summaries, q, activeViewId])
}
