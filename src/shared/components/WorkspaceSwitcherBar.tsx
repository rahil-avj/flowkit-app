import { workspaces } from '@flowkit/workspaces'
import { useActiveWorkspace } from '@flowkit-shared/contexts/ActiveWorkspaceContext'
import { useDashboard } from '@flowkit-shared/contexts/DashboardContext'
import { getWorkspaceLogo } from '@flowkit-shared/utils/workspaceModules'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// Flat/multi-workspace consumer mode (VITE_SINGLE_WORKSPACE) has no repo-mode
// `workspaces.json` fixtures — `@flowkit/workspaces` there resolves to this
// monorepo's own dev fixtures shipped inside the installed `flowkit` package
// (src/ ships unfiltered per package.json's files[]), not the consumer's real
// workspace. Never list/switch to those in single-workspace mode.
const isSingle = import.meta.env.VITE_SINGLE_WORKSPACE === 'true'

// Deterministic color per workspace name — stable across renders and sessions.
const AVATAR_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#0EA5E9',
]
function workspaceColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function WorkspaceAvatar({
  name,
  label,
  size = 40,
}: {
  name: string
  label: string
  size?: number
}) {
  const logo = getWorkspaceLogo(name)
  const radius = size <= 24 ? 5 : 8

  if (logo) {
    return (
      <span
        className="shrink-0 overflow-hidden flex items-center justify-center bg-theme-elevated"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <img src={logo} alt={label} className="object-contain size-full" draggable={false} />
      </span>
    )
  }

  return (
    <span
      className="shrink-0 flex items-center justify-center font-black text-white select-none"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: workspaceColor(name),
        fontSize: size <= 24 ? 10 : 16,
        letterSpacing: '-0.02em',
      }}
    >
      {(label?.[0] ?? '?').toUpperCase()}
    </span>
  )
}

export interface WorkspaceSwitcherBarProps {
  /** Whether the owning rail panel is expanded (label/chevron) or collapsed (icon only). */
  panelOpen: boolean
}

/**
 * Workspace switcher footer for a rail panel — active workspace avatar + label,
 * opens a dropdown (upward, anchored above the bar) listing other workspaces to
 * switch to. Shared between the default preview mode and FlowLens mode.
 */
export default function WorkspaceSwitcherBar({ panelOpen }: WorkspaceSwitcherBarProps) {
  const activeWorkspace = useActiveWorkspace()
  const { switchWorkspace } = useDashboard()
  // Single-workspace consumer mode: there is exactly one workspace (this
  // project itself) and nothing to switch to — never read the repo-mode
  // `workspaces` fixture list here (see import comment above).
  const current = isSingle
    ? { name: activeWorkspace, label: activeWorkspace }
    : (workspaces.find(w => w.name === activeWorkspace) ?? workspaces[0] ?? null)
  const others = isSingle ? [] : workspaces.filter(w => w.name !== activeWorkspace)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  if (!current) return null

  const handleOpen = () => {
    if (isSingle) return
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.top, left: rect.left, width: Math.max(rect.width, 200) })
    }
    setOpen(v => !v)
  }

  return (
    <div className="relative shrink-0 flex items-center border-t border-theme-border bg-theme-elevated h-11">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        disabled={isSingle}
        className={`flex-1 h-full flex items-center transition-colors min-w-0 ${isSingle ? 'cursor-default' : 'hover:bg-white/3'} ${panelOpen ? 'gap-3 px-2' : 'justify-center px-0'}`}
      >
        <WorkspaceAvatar name={activeWorkspace} label={current.label ?? activeWorkspace} size={28} />
        {panelOpen && (
          <>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-ui-sm font-bold truncate text-theme-text-primary leading-tight">
                {current.label ?? activeWorkspace}
              </span>
              <span className="text-ui-xs truncate text-theme-text-muted leading-tight">
                {activeWorkspace}
              </span>
            </div>
            {!isSingle && (
              <ChevronDown
                size={12}
                className={`shrink-0 transition-transform mr-1 text-theme-text-disabled ${open ? 'rotate-0' : 'rotate-180'}`}
              />
            )}
          </>
        )}
      </button>

      {open && dropdownPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 overflow-hidden bg-theme-elevated border border-theme-border shadow-theme-float rounded-[10px]"
            style={{
              bottom: `calc(100vh - ${dropdownPos.top}px + 4px)`,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
          >
            {/* Active workspace row — clicking dismisses */}
            <div
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-theme-hover transition-colors"
              onClick={() => setOpen(false)}
            >
              <WorkspaceAvatar
                name={activeWorkspace}
                label={current.label ?? activeWorkspace}
                size={28}
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-ui-sm font-semibold truncate text-theme-text-primary leading-tight">
                  {current.label ?? activeWorkspace}
                </span>
                <span className="text-ui-2xs truncate text-theme-text-muted leading-tight">
                  {activeWorkspace}
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded-sm text-ui-2xs font-bold bg-theme-blue-dim text-theme-blue shrink-0">
                active
              </span>
            </div>

            {others.length > 0 && (
              <>
                <div className="h-px bg-theme-border" />
                {others.map(w => (
                  <WorkspaceSwitchRow key={w.name} workspace={w} onSwitch={switchWorkspace} />
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Safety net for `onSwitch`: the happy path unmounts this row entirely (a
// workspace switch remounts the tree), so `switching` normally never needs to
// be reset. If `onSwitch` throws before that remount (e.g. storeWorkspace()
// hitting a full/blocked localStorage) or otherwise doesn't cause one, this
// timeout clears the stuck "switching…" state instead of leaving the row
// permanently disabled until a manual page reload.
const SWITCH_TIMEOUT_MS = 4000

function WorkspaceSwitchRow({
  workspace,
  onSwitch,
}: {
  workspace: { name: string; label: string; description?: string }
  onSwitch: (name: string) => void
}) {
  const [switching, setSwitching] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleClick = () => {
    setSwitching(true)
    try {
      onSwitch(workspace.name)
      timeoutRef.current = setTimeout(() => setSwitching(false), SWITCH_TIMEOUT_MS)
    } catch (e) {
      console.error('Workspace switch failed:', e)
      setSwitching(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={switching}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-theme-hover ${switching ? 'opacity-60' : 'opacity-100'}`}
    >
      <WorkspaceAvatar name={workspace.name} label={workspace.label} size={28} />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-ui-sm font-semibold truncate text-theme-text-primary leading-tight">
          {workspace.label}
        </span>
        <span className="text-ui-2xs truncate leading-tight text-theme-text-muted">
          {workspace.description ?? (
            <span className="italic text-theme-text-disabled">no description</span>
          )}
        </span>
      </div>
      <span className="text-ui-2xs text-theme-text-disabled shrink-0">
        {switching ? 'switching…' : 'switch →'}
      </span>
    </button>
  )
}
