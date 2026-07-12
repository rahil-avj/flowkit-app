import type { PaletteGroup, PaletteItem } from '@flowkit-features/command-palette'
import { CommandPalette } from '@flowkit-features/command-palette'
import { Terminal } from 'lucide-react'
import { useMemo } from 'react'

import { type ActionCtx, APP_ACTIONS, type AppMode, slotToAction } from './appActions'
import OverlayShell from './OverlayShell'

interface Props {
  ctx: ActionCtx
  onClose: () => void
  mode?: AppMode
}

const STAY_OPEN_IDS = new Set([
  'toggle-sessions',
  'toggle-auto-record',
  'toggle-scrollbars',
  'toggle-dev-mode',
  'toggle-theme',
  'toggle-orient',
])

function actionBadges(
  action: (typeof APP_ACTIONS)[number],
  ctx: ActionCtx
): import('@flowkit-features/command-palette').PaletteBadge[] {
  const badges: import('@flowkit-features/command-palette').PaletteBadge[] = []

  if (action.beta) badges.push({ label: 'BETA', style: 'blue' })

  if (action.id === ctx.cloudSyncSlot?.actionId && ctx.cloudSyncSlot.enabled)
    badges.push({ label: 'ON', style: 'green' })
  if (action.id === 'toggle-scrollbars' && ctx.autoHideScrollbars)
    badges.push({ label: 'ON', style: 'green' })

  if (action.id === 'toggle-sessions') {
    badges.push({
      label: ctx.showSessionsFeature ? 'ON' : 'OFF',
      style: ctx.showSessionsFeature ? 'green' : 'default',
    })
  }
  if (action.id === 'toggle-auto-record') {
    badges.push({
      label: ctx.autoRecordOnPlay ? 'ON' : 'OFF',
      style: ctx.autoRecordOnPlay ? 'green' : 'default',
    })
  }

  return badges
}

export function ActionCenterContent({ ctx, onClose, mode = 'default' }: Props) {
  const runnable = useMemo(() => {
    const base = APP_ACTIONS.filter(
      a =>
        !!a.run &&
        (!a.modes || a.modes.includes(mode)) &&
        (a.id !== 'enter-flowlens' || ctx.flowLensAvailable)
    )
    return ctx.cloudSyncSlot ? [...base, slotToAction(ctx.cloudSyncSlot)] : base
  }, [mode, ctx.flowLensAvailable, ctx.cloudSyncSlot])

  const groups = useMemo<PaletteGroup[]>(() => {
    const map = new Map<string, PaletteItem[]>()
    for (const a of runnable) {
      if (!map.has(a.group)) map.set(a.group, [])
      map.get(a.group)!.push({
        id: a.id,
        label: a.label,
        shortcut: a.shortcut,
        badges: actionBadges(a, ctx),
        meta: { actionId: a.id },
      })
    }
    return [...map.entries()].map(([id, items]) => ({ id, label: id, items }))
  }, [runnable, ctx])

  function handleSelect(item: PaletteItem) {
    const action = runnable.find(a => a.id === item.id)
    if (action?.run) {
      action.run(ctx)
      const slotStayOpen = action.id === ctx.cloudSyncSlot?.actionId && ctx.cloudSyncSlot.stayOpen
      if (!STAY_OPEN_IDS.has(action.id) && !slotStayOpen) onClose()
    }
  }

  return (
    <CommandPalette
      modal={false}
      headerIcon={Terminal}
      placeholder="Search actions…"
      source={groups}
      onSelect={handleSelect}
      onClose={onClose}
      grouping="headers"
    />
  )
}

export default function ActionCenter({ ctx, onClose, mode }: Props) {
  return (
    <OverlayShell onClose={onClose} width={520}>
      <ActionCenterContent ctx={ctx} onClose={onClose} mode={mode} />
    </OverlayShell>
  )
}
