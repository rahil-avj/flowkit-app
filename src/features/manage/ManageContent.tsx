import {
  CopyScriptButton,
  generateFlowOrderPatch,
  generateWorkspaceOrderPatch,
} from '@platform/features/script-patch'
import { useActiveWorkspace } from '@platform/shared/contexts/ActiveWorkspaceContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import { useWorkspaceHierarchy } from '@platform/shared/utils/useWorkspaceHierarchy'
import { getWorkspaceConfig } from '@platform/shared/utils/workspaceModules'
import { ChevronDown } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'

import { workspaces } from '../../workspaces'

// ─── Accordion (local — no flow/screen guards needed here) ────────────────────

function Accordion({
  label,
  defaultOpen = false,
  children,
}: {
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const { theme, scale } = useTheme()
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden"
      style={{ border: `1px solid ${theme.bg.border}` }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex items-center justify-between px-3 py-2.5 transition-colors"
        style={{ backgroundColor: theme.bg.elevated, color: theme.text.muted }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = theme.bg.hover
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = theme.bg.elevated
        }}
      >
        <span className="font-black" style={{ fontSize: scale.text.xxs, color: theme.text.muted }}>
          {label.toUpperCase()}
        </span>
        <ChevronDown
          size={12}
          className="transition-transform"
          style={{ color: theme.text.muted, transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-3 p-3" style={{ backgroundColor: theme.bg.base }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Ordered list helper ──────────────────────────────────────────────────────

function OrderedList({ items }: { items: string[] }) {
  const { theme, scale } = useTheme()
  return (
    <ol className="flex flex-col gap-1">
      {items.map((item, i) => (
        <li key={item} className="flex items-center gap-2">
          <span
            className="shrink-0 w-4 text-right font-mono"
            style={{ fontSize: scale.text.xxs, color: theme.text.disabled }}
          >
            {i + 1}.
          </span>
          <span style={{ fontSize: scale.text.xs, color: theme.text.secondary }}>{item}</span>
        </li>
      ))}
    </ol>
  )
}

// ─── ManageContent ────────────────────────────────────────────────────────────

export function ManageContent() {
  const activeWorkspace = useActiveWorkspace()
  const { theme, scale } = useTheme()
  const { tree } = useWorkspaceHierarchy(activeWorkspace)

  const wsNames = workspaces.map(w => w.name)

  // Build project → flow map from the current tree
  const projectFlowMap: Record<string, string[]> = {}
  for (const projectNode of tree) {
    if (projectNode.kind === 'project') {
      projectFlowMap[projectNode.id] = (projectNode.children ?? [])
        .filter(c => c.kind === 'flow')
        .map(c => c.id)
    }
  }

  const config = getWorkspaceConfig(activeWorkspace)

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
      <p className="px-1 pb-1" style={{ fontSize: scale.text.xxs, color: theme.text.muted }}>
        Generate terminal scripts to make ordering changes permanent on disk. Paste at project root.
      </p>

      {/* ── Section 1: Workspace Order ────────────────────────────────────── */}
      <Accordion label="Workspace Order" defaultOpen>
        <p style={{ fontSize: scale.text.xxs, color: theme.text.muted }}>
          Current order in <code className="font-mono">src/workspaces.json</code>:
        </p>
        <OrderedList items={wsNames} />
        <CopyScriptButton patch={generateWorkspaceOrderPatch(wsNames)} size="sm" />
      </Accordion>

      {/* ── Section 2: Flow Order ─────────────────────────────────────────── */}
      <Accordion label="Flow Order">
        {Object.keys(projectFlowMap).length === 0 ? (
          <p className="italic" style={{ fontSize: scale.text.xs, color: theme.text.muted }}>
            No project flows discovered.
          </p>
        ) : (
          Object.entries(projectFlowMap).map(([project, flows]) => {
            const declaredOrder =
              config.projects?.[project]?.flows ?? config.projects?.[project]?.modules ?? []
            const ordered = [
              ...declaredOrder.filter(f => flows.includes(f)),
              ...flows.filter(f => !declaredOrder.includes(f)),
            ]
            return (
              <div key={project} className="flex flex-col gap-2">
                <span
                  className="font-bold uppercase tracking-widest"
                  style={{ fontSize: scale.text.xxs, color: theme.text.muted }}
                >
                  {project}
                </span>
                <OrderedList items={ordered} />
                <CopyScriptButton
                  patch={generateFlowOrderPatch(activeWorkspace, { [project]: ordered })}
                  size="sm"
                />
              </div>
            )
          })
        )}
      </Accordion>
    </div>
  )
}
