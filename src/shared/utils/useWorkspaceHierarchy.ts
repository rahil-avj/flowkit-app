/**
 * useWorkspaceHierarchy.ts
 *
 * Workspace reader — supports two layouts:
 *
 *   New (flat):  workspaces/<ws>/flowplans/<Name>.ts
 *                workspaces/<ws>/flows/<flow>/<screen>/<Name>Screen.tsx
 *
 *   Old (nested): workspaces/<ws>/projects/<proj>/flowplans/<Name>.ts
 *                 workspaces/<ws>/projects/<proj>/flows/<flow>/<screen>/<Name>Screen.tsx
 *
 * Both layouts are detected automatically. Existing workspaces keep working unchanged.
 *
 * WHY a separate file: import.meta.glob patterns MUST be string literals (Vite
 * resolves them at build time). All globs live here, inline.
 */

import {
  type CompiledFlowplan,
  compileFlowplan,
  type ResolvedScreen,
  type ScreenResolver,
} from '@platform/features/flow-library/compileFlowplan'
import { useFlowPlaybackOptional } from '@platform/shared/contexts/FlowPlaybackContext'
import { getWorkspaceConfig } from '@platform/shared/utils/workspaceModules'
import type {
  AnnotationTag,
  FlowkitConfig,
  FlowNode,
  FlowplanDef,
  ScreenMeta,
  WireframeView,
  WorkspaceHierarchyNode,
} from '@platform/types/index'
import React, { useEffect, useMemo, useState } from 'react'

// ─── Mode detection ───────────────────────────────────────────────────────────

const isSingle = import.meta.env.VITE_SINGLE_WORKSPACE === 'true'

// ─── Flat mode: virtual module imports ────────────────────────────────────────

import { flowplans as _virtualFlowplans } from 'virtual:flowkit/flowplans'
import {
  screenList as _virtualScreenList,
  screenMeta as _virtualScreenMeta,
} from 'virtual:flowkit/screens'
import { tags as _virtualTags } from 'virtual:flowkit/workspace'

// ─── Repo mode: Vite glob maps (string literals only) ────────────────────────
//
// Broad globs match both old (projects/<proj>/...) and new (flat) layouts.
// These return empty objects in flat mode (no workspaces/ dir on disk).

type FlowplanModule = { default: FlowplanDef }
type FlowplanGlobMap = Record<string, FlowplanModule>
type ScreenGlobMap = Record<
  string,
  () => Promise<{ default: React.ComponentType; screenMeta?: ScreenMeta }>
>

const flowplanModules = import.meta.glob('/workspaces/**/flowplans/*.ts', {
  eager: true,
}) as FlowplanGlobMap

const projectScreenModules = import.meta.glob('/workspaces/**/flows/**/*.tsx') as ScreenGlobMap

// Eager named-import of screenMeta only — zero cost for files that don't export it.
const screenMetaModules = import.meta.glob('/workspaces/**/flows/**/*.tsx', {
  eager: true,
  import: 'screenMeta',
}) as Record<string, ScreenMeta | undefined>

type TagsModule = { default: AnnotationTag[] }
type TagsGlobMap = Record<string, () => Promise<TagsModule>>
const tagsModules = import.meta.glob('/workspaces/**/flows/_tags.ts') as TagsGlobMap

// ─── Path parsing — handles both flat and nested layouts ─────────────────────────

interface ScreenPathInfo {
  /** "default" for the base file, else the .variant.<serial> token. */
  variant: string
  flow: string
  screen: string // the <screen> folder name — THIS is the screen id
  componentName: string // e.g. "CartScreen"
  /** The project segment, or the workspace name for flat-layout workspaces. */
  project: string
}

/**
 * Parse a screen file path. Returns null if invalid (not a *Screen.tsx at a
 * screen-folder root, buried in a components/ subfolder, or wrong shape).
 *
 * Handles two layouts:
 *   Flat:   flows/<flow>/<screen>/<Name>Screen[.variant.<x>].tsx
 *   Nested: projects/<proj>/flows/<flow>/<screen>/<Name>Screen[.variant.<x>].tsx
 */
function parseScreenPath(
  filePath: string,
  wsPrefix: string,
  wsName: string
): ScreenPathInfo | null {
  if (!filePath.startsWith(wsPrefix)) return null
  const rest = filePath.slice(wsPrefix.length)
  const parts = rest.split('/')

  // Find the 'flows' segment — works for both flat (idx 0) and nested (idx >= 1) layouts
  const flowsIdx = parts.indexOf('flows')
  if (flowsIdx === -1) return null

  // Exactly 3 segments after 'flows': <flow>, <screen>, <File>.tsx
  if (parts.length !== flowsIdx + 4) return null // deeper = components/ subfolder → private

  // Project: everything before 'flows' (excluding 'projects/' prefix), or wsName for flat
  const beforeFlows = parts.slice(0, flowsIdx)
  let project: string
  if (beforeFlows[0] === 'projects') {
    project = beforeFlows.slice(1).join('/') || wsName
  } else if (beforeFlows.length === 0) {
    project = wsName
  } else {
    return null // unexpected prefix — not a recognized layout
  }

  const [flow, screen, file] = parts.slice(flowsIdx + 1)
  if (!flow || !screen || !file) return null
  if (file.startsWith('_')) return null

  const stem = file.replace(/\.(tsx|jsx)$/, '')
  const vMatch = stem.match(/^(.*)\.variant\.([^.]+)$/)
  const componentName = vMatch ? vMatch[1] : stem
  const variant = vMatch ? vMatch[2] : 'default'

  if (!componentName.endsWith('Screen')) return null

  return { project, flow, screen, variant, componentName }
}

function deriveScreenLabel(folderOrName: string): string {
  return folderOrName
    .replace(/[-_]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function titleCase(s: string): string {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Lazy screen wrapper ─────────────────────────────────────────────────────────

function buildLazyComponent(
  loader: () => Promise<{ default: React.ComponentType; screenMeta?: ScreenMeta }>
): React.ComponentType {
  const LazyScreen = React.lazy(async () => {
    const mod = await loader()
    return { default: mod.default }
  })
  return function WrappedLazyScreen(props: Record<string, unknown>) {
    return React.createElement(
      React.Suspense,
      { fallback: null },
      React.createElement(LazyScreen, props)
    )
  }
}

// ─── Result shape ───────────────────────────────────────────────────────────────

export interface WorkspaceHierarchyResult {
  /** Flow library: one FlowNode per Flowplan (with a `-play` runner child). */
  flows: FlowNode[]
  /** All screens as flat views (merged into ALL_VIEWS by App). */
  views: WireframeView[]
  /** Project → flow → screen tree for the Screens tab. */
  tree: WorkspaceHierarchyNode[]
  /** id → raw FlowplanDef (for the Flow Library + ref resolution). */
  registry: Map<string, FlowplanDef>
  /** Whether this workspace uses the hierarchy at all. */
  hasHierarchy: boolean
  /** screenId → active annotation tags (expiresAt filtered). */
  tagsByScreen: Map<string, AnnotationTag[]>
}

// ─── Flat mode builder (uses virtual modules, no path parsing needed) ───────────

function buildFlatHierarchy(activeWorkspace: string): WorkspaceHierarchyResult {
  const config = getWorkspaceConfig(activeWorkspace)

  // 1. Build screens from virtual:flowkit/screens screenList
  const screensById = new Map<string, ScreenRec>()
  for (const entry of _virtualScreenList) {
    const { flow, screenId, loader } = entry
    const meta = _virtualScreenMeta[entry.key]
    const label = meta?.label ?? deriveScreenLabel(screenId)
    const component = buildLazyComponent(loader)
    const view: WireframeView = {
      id: screenId,
      label,
      component,
      filePath: `flows/${flow}/${screenId}`,
      variants: [{ serial: 'default', label, component, filePath: `flows/${flow}/${screenId}` }],
      flow,
      project: activeWorkspace,
    }
    screensById.set(screenId, {
      id: screenId,
      label,
      project: activeWorkspace,
      flow,
      component,
      view,
    })
  }

  // 2. Flowplan registry from virtual:flowkit/flowplans
  const registry = new Map<string, FlowplanDef>()
  for (const def of _virtualFlowplans) {
    if (def?.id) registry.set(def.id, def)
  }

  const hasHierarchy = screensById.size > 0 || registry.size > 0

  // 3. Screen resolver
  const resolve: ScreenResolver = (screenId: string): ResolvedScreen | undefined => {
    const rec = screensById.get(screenId)
    if (!rec) return undefined
    return { id: rec.id, label: rec.label, component: rec.component }
  }

  // 4. Flow library FlowNodes
  const declaredIds =
    config.flows ?? Object.values(config.projects ?? {}).flatMap(p => p.flows ?? p.modules ?? [])
  const allDefs = [...registry.values()]
  const orderedDefs = [
    ...declaredIds.filter(id => registry.has(id)).map(id => registry.get(id)!),
    ...allDefs.filter(d => !declaredIds.includes(d.id)),
  ]
  const flows: FlowNode[] = []
  for (const def of orderedDefs) {
    const playNode: WireframeView = {
      id: `${def.id}-play`,
      label: 'Play Flow ➔',
      component: makeFlowplanRunner(def, resolve, registry),
    }
    flows.push({ id: def.id, label: def.name, children: [playNode] })
  }

  // 5. Views
  const views: WireframeView[] = [
    ...[...screensById.values()].map(r => r.view),
    ...flows.flatMap(f => f.children ?? []),
  ]

  // 6. Tree
  const tree = buildTree([...screensById.values()], config, activeWorkspace)

  return { flows, views, tree, registry, hasHierarchy, tagsByScreen: new Map() }
}

// ─── Builder (pure given the globs) ─────────────────────────────────────────────

interface ScreenRec {
  id: string // = the <screen> folder name
  label: string
  project: string
  flow: string
  component: React.ComponentType // default variant
  view: WireframeView // includes variants[]
}

function buildHierarchy(activeWorkspace: string): WorkspaceHierarchyResult {
  if (isSingle) return buildFlatHierarchy(activeWorkspace)
  const wsPrefix = `/workspaces/${activeWorkspace}/`
  const config = getWorkspaceConfig(activeWorkspace)

  // 1. Group screen files by their <screen> folder id, collecting variants.
  interface VariantFile {
    serial: string
    component: React.ComponentType
    filePath: string
    project: string
    flow: string
    componentName: string
  }
  const variantsByScreen = new Map<string, VariantFile[]>()

  for (const [path, loader] of Object.entries(projectScreenModules)) {
    const info = parseScreenPath(path, wsPrefix, activeWorkspace)
    if (!info) continue
    const list = variantsByScreen.get(info.screen) ?? []
    list.push({
      serial: info.variant,
      component: buildLazyComponent(loader),
      filePath: path.slice(wsPrefix.length),
      project: info.project,
      flow: info.flow,
      componentName: info.componentName,
    })
    variantsByScreen.set(info.screen, list)
  }

  // 2. Build a ScreenRec per screen folder.
  const screensById = new Map<string, ScreenRec>()
  for (const [screenId, files] of variantsByScreen) {
    const def = files.find(f => f.serial === 'default') ?? files[0]
    const label = deriveScreenLabel(screenId)
    const variants = files
      .slice()
      .sort((a, b) => {
        if (a.serial === 'default') return -1
        if (b.serial === 'default') return 1
        const aKey = `${wsPrefix}${a.filePath}`
        const bKey = `${wsPrefix}${b.filePath}`
        const aOrder = screenMetaModules[aKey]?.variantOrder ?? Infinity
        const bOrder = screenMetaModules[bKey]?.variantOrder ?? Infinity
        if (aOrder !== bOrder) return aOrder - bOrder
        return a.serial.localeCompare(b.serial)
      })
      .map(f => {
        const metaKey = `${wsPrefix}${f.filePath}`
        const meta = screenMetaModules[metaKey]
        return {
          serial: f.serial,
          label: f.serial === 'default' ? label : (meta?.variantLabel ?? `${label} · ${f.serial}`),
          component: f.component,
          filePath: f.filePath,
        }
      })
    const view: WireframeView = {
      id: screenId,
      label,
      component: def.component,
      filePath: def.filePath,
      variants,
      flow: def.flow,
      project: def.project,
    }
    screensById.set(screenId, {
      id: screenId,
      label,
      project: def.project,
      flow: def.flow,
      component: def.component,
      view,
    })
  }

  // 3. Flowplan registry for this workspace.
  const registry = new Map<string, FlowplanDef>()
  for (const [path, mod] of Object.entries(flowplanModules)) {
    if (!path.startsWith(wsPrefix)) continue
    const def = mod.default
    if (def && def.id) registry.set(def.id, def)
  }

  const hasHierarchy = screensById.size > 0 || registry.size > 0

  // 4. Screen resolver injected into the compiler.
  const resolve: ScreenResolver = (screenId: string): ResolvedScreen | undefined => {
    const rec = screensById.get(screenId)
    if (!rec) return undefined
    return { id: rec.id, label: rec.label, component: rec.component }
  }

  // 5. Flow library FlowNodes — one per flowplan, with a `-play` runner child.
  //    Flat layout: order from config.flows[]. Nested: from config.projects[*].flows[].
  const declaredIds =
    config.flows ?? Object.values(config.projects ?? {}).flatMap(p => p.flows ?? p.modules ?? [])
  const allDefs = [...registry.values()]
  const orderedDefs = [
    ...declaredIds.filter(id => registry.has(id)).map(id => registry.get(id)!),
    ...allDefs.filter(d => !declaredIds.includes(d.id)),
  ]
  const flows: FlowNode[] = []
  for (const def of orderedDefs) {
    const playNode: WireframeView = {
      id: `${def.id}-play`,
      label: 'Play Flow ➔',
      component: makeFlowplanRunner(def, resolve, registry),
    }
    flows.push({ id: def.id, label: def.name, children: [playNode] })
  }

  // 6. Flat views = all screens + every flow's play node.
  const views: WireframeView[] = [
    ...[...screensById.values()].map(r => r.view),
    ...flows.flatMap(f => f.children ?? []),
  ]

  // 7. Tree: project → flow → screen.
  const tree = buildTree([...screensById.values()], config, activeWorkspace)

  return { flows, views, tree, registry, hasHierarchy, tagsByScreen: new Map() }
}

function buildTree(
  screens: ScreenRec[],
  config: FlowkitConfig,
  wsName: string
): WorkspaceHierarchyNode[] {
  const projects = new Map<string, Map<string, WireframeView[]>>()
  for (const s of screens) {
    if (!projects.has(s.project)) projects.set(s.project, new Map())
    const flowsMap = projects.get(s.project)!
    if (!flowsMap.has(s.flow)) flowsMap.set(s.flow, [])
    flowsMap.get(s.flow)!.push(s.view)
  }

  const projectNodes: WorkspaceHierarchyNode[] = []
  for (const [project, flowsMap] of projects) {
    // Flat layout: top-level config.flows + config.screenOrder (project === wsName)
    // Nested layout: config.projects[project].flows + .screenOrder
    const projCfg = config.projects?.[project]
    const declaredOrder: string[] =
      (project === wsName ? config.flows : undefined) ?? projCfg?.flows ?? projCfg?.modules ?? []
    const flowEntries = [...flowsMap.entries()]
    const orderedFlows: [string, WireframeView[]][] = [
      ...declaredOrder
        .filter(f => flowsMap.has(f))
        .map(f => [f, flowsMap.get(f)!] as [string, WireframeView[]]),
      ...flowEntries.filter(([f]) => !declaredOrder.includes(f)),
    ]
    const flowNodes: WorkspaceHierarchyNode[] = []
    for (const [flow, flowViews] of orderedFlows) {
      const declaredScreens: string[] =
        (project === wsName ? config.screenOrder?.[flow] : undefined) ??
        projCfg?.screenOrder?.[flow] ??
        []
      const sortedViews =
        declaredScreens.length === 0
          ? flowViews
          : [
              ...declaredScreens
                .filter(slug => flowViews.some(v => v.id.endsWith(slug)))
                .map(slug => flowViews.find(v => v.id.endsWith(slug))!),
              ...flowViews
                .filter(v => !declaredScreens.some(slug => v.id.endsWith(slug)))
                .sort((a, b) => a.label.localeCompare(b.label)),
            ]
      flowNodes.push({
        kind: 'flow',
        id: flow,
        label: titleCase(flow),
        children: sortedViews.map(v => ({
          kind: 'screen' as const,
          id: v.id,
          label: v.label,
          view: v,
        })),
      })
    }
    projectNodes.push({
      kind: 'project',
      id: project,
      label: titleCase(project),
      children: flowNodes,
    })
  }
  return projectNodes
}

// ─── Play-time FlowplanRunner (compiles on mount, renders FlowMaster) ───────────

function makeFlowplanRunner(
  def: FlowplanDef,
  resolve: ScreenResolver,
  registry: Map<string, FlowplanDef>
): React.ComponentType {
  return function FlowplanRunner() {
    const [FlowMasterComp, setComp] = React.useState<React.ComponentType<{
      flow: CompiledFlowplan
    }> | null>(null)
    const [error, setError] = React.useState<string | null>(null)
    const playback = useFlowPlaybackOptional()

    // Compile at PLAY time (registry + screens fully available by mount).
    const { compiled, compilationError } = useMemo(() => {
      try {
        return { compiled: compileFlowplan(def, resolve, registry), compilationError: null }
      } catch (e) {
        return { compiled: null, compilationError: e instanceof Error ? e.message : String(e) }
      }
    }, [])

    React.useEffect(() => {
      if (compilationError) setError(compilationError)
    }, [compilationError])

    React.useEffect(() => {
      import('@platform/core/layout/FlowMaster')
        .then(m => setComp(() => m.default as React.ComponentType<{ flow: CompiledFlowplan }>))
        .catch(err => setError(String(err)))
    }, [])

    const enter = playback?.enter
    const exit = playback?.exit
    React.useEffect(() => {
      if (!compiled || !enter || !exit) return
      const rawDb = typeof def.db === 'object' && def.db !== null ? def.db : {}
      enter(compiled, rawDb as Record<string, unknown>)
      return () => exit()
    }, [compiled, enter, exit])

    if (error) {
      return React.createElement(
        'div',
        { style: { padding: 16, color: 'red', fontSize: 13 } },
        `Flowplan error: ${error}`
      )
    }
    if (!FlowMasterComp || !compiled) return null
    return React.createElement(FlowMasterComp, { flow: compiled })
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────────

function buildTagsMap(allTags: AnnotationTag[]): Map<string, AnnotationTag[]> {
  const today = new Date().toISOString().slice(0, 10)
  const filtered = allTags.filter(t => !t.expiresAt || t.expiresAt > today)
  const map = new Map<string, AnnotationTag[]>()
  for (const t of filtered) {
    for (const screenId of t.screens ?? []) {
      const existing = map.get(screenId) ?? []
      map.set(screenId, [...existing, t])
    }
  }
  return map
}

export function useWorkspaceHierarchy(activeWorkspace: string): WorkspaceHierarchyResult {
  const hierarchy = useMemo(() => buildHierarchy(activeWorkspace), [activeWorkspace])

  // virtual:flowkit/workspace tags are keyed by flow name; flatten to one array
  const singleTagsByScreen = useMemo(
    () => (isSingle ? buildTagsMap(Object.values(_virtualTags).flat()) : null),
    []
  )

  const [tagsByScreen, setTagsByScreen] = useState<Map<string, AnnotationTag[]>>(new Map())

  useEffect(() => {
    if (isSingle) return

    const prefix = `/workspaces/${activeWorkspace}/flows/_tags.ts`
    const loader = tagsModules[prefix]
    if (!loader) return
    let cancelled = false
    loader().then(mod => {
      if (cancelled) return
      setTagsByScreen(buildTagsMap(mod.default ?? []))
    })
    return () => {
      cancelled = true
    }
  }, [activeWorkspace])

  return { ...hierarchy, tagsByScreen: singleTagsByScreen ?? tagsByScreen }
}
