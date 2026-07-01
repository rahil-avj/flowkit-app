import KitSideExplorer from '@platform/core/layout/KitSideExplorer'
import { COLOR_BLIND_FILTERS, ColorBlindSVGDefs } from '@platform/core/layout/KitSideInspector'
import {
  DbContent,
  FeedbackContent,
  ScreenInfoContent,
  SessionsContent,
  SimulatorContent,
} from '@platform/core/layout/KitSideInspector'
import { useFeedback } from '@platform/features/feedback/context/FeedbackContext'
import { FlowDebuggerContent } from '@platform/features/flow-debugger'
import { useSessionSettings } from '@platform/features/flowTracer/components/useSessionSettings'
import { GoToOverlayContent } from '@platform/features/go-to-overlay'
import { Z } from '@platform/shared/constants/zIndex'
import type { FlowNode, WireframeView } from '@platform/types/index'
import {
  Activity, // inspect sub-tabs + feedback top tab
  Briefcase, // settings sub-tabs
  ChevronLeft,
  Compass,
  Database,
  Info,
  LayoutPanelLeft,
  MessageSquare,
  ScanSearch,
  Search,
  Settings, // top-level tabs
  Settings2,
  SlidersHorizontal,
  Video,
  Workflow,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useDashboard } from '../../contexts/DashboardContext'
import { useDevMode } from '../../contexts/DevModeContext'
import { useTheme } from '../../contexts/ThemeContext'
import { ActionCenterContent } from '../overlays/ActionCenter'
import type { ActionCtx } from '../overlays/appActions'
import BottomSheet, { type PanelTab } from './BottomSheet'
import MobileFAB, { type MobileTab } from './MobileFAB'

// ── Sub-tab definitions per top-level tab ─────────────────────────────────────

type RightSubTab = 'info' | 'simulator' | 'flow' | 'db' | 'sessions'
type SettingsSubTab = 'interface' | 'panel' | 'sessions' | 'workspace'

interface SubTabDef {
  id: string
  icon: React.ReactNode
  label: string
}

const RIGHT_SUBTABS_ALL: SubTabDef[] = [
  { id: 'info', icon: <Info size={15} />, label: 'Screen Info' },
  { id: 'simulator', icon: <Settings2 size={15} />, label: 'Simulator' },
  { id: 'flow', icon: <Workflow size={15} />, label: 'Flow Debugger' },
  { id: 'db', icon: <Database size={15} />, label: 'Database' },
  { id: 'sessions', icon: <Activity size={15} />, label: 'Sessions' },
]

const SETTINGS_SUBTABS: SubTabDef[] = [
  { id: 'interface', icon: <SlidersHorizontal size={15} />, label: 'Interface' },
  { id: 'panel', icon: <LayoutPanelLeft size={15} />, label: 'Panel' },
  { id: 'sessions', icon: <Video size={15} />, label: 'Sessions' },
  { id: 'workspace', icon: <Briefcase size={15} />, label: 'Workspace' },
]

// ── Rail + content shell shared by Left, Right, Settings tabs ─────────────────

interface RailShellProps {
  tabs: SubTabDef[]
  activeId: string
  onSelect: (id: string) => void
  children: React.ReactNode
  badgeMap?: Record<string, number>
}

function RailShell({ tabs, activeId, onSelect, children, badgeMap = {} }: RailShellProps) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Icon rail — desktop SidebarButton style */}
      <div className="w-[44px] shrink-0 flex flex-col border-r border-theme-border bg-theme-elevated">
        {tabs.map(t => {
          const active = t.id === activeId
          const badge = badgeMap[t.id] ?? 0
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              title={t.label}
              className={`relative w-full h-11 flex items-center justify-center border-none cursor-pointer transition-colors duration-120 ${active ? 'bg-theme-base text-theme-blue' : 'bg-transparent text-theme-text-muted hover:text-theme-text-secondary'}`}
            >
              {t.icon}
              {active && (
                <span className="absolute right-0 w-0.5 rounded-l bg-theme-blue inset-y-2" />
              )}
              {badge > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-theme-red text-white text-[8px] font-extrabold min-w-[13px] h-[13px] rounded-full flex items-center justify-center px-0.5">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  )
}

// ── Main canvas ────────────────────────────────────────────────────────────────

interface MobileCanvasProps {
  flows: FlowNode[]
  views: WireframeView[]
}

export default function MobileCanvas({ flows, views }: MobileCanvasProps) {
  const {
    activeViewId,
    navigateTo,
    colorBlindMode,
    blurryVision,
    canGoBack,
    goBack,
    workspaceConfig,
    toggleOrientation,
    resetToFirst,
    resetDb,
  } = useDashboard()
  const { totalCommentCount, setOpenFeedbackTab, cloudExportEnabled, toggleCloudExport } =
    useFeedback()

  const [autoHideScrollbars, setAutoHideScrollbars] = useState(
    () => localStorage.getItem(LS_AUTO_HIDE_SCROLLBARS) === 'true'
  )
  const toggleAutoHideScrollbars = useCallback(
    () =>
      setAutoHideScrollbars(v => {
        const n = !v
        localStorage.setItem(LS_AUTO_HIDE_SCROLLBARS, String(n))
        return n
      }),
    []
  )
  const [showSessionsFeature, setShowSessionsFeature] = useState(
    () => localStorage.getItem(LS_SESSIONS_ENABLED) === 'true'
  )
  const toggleSessionsFeature = useCallback(
    () =>
      setShowSessionsFeature(v => {
        const n = !v
        localStorage.setItem(LS_SESSIONS_ENABLED, String(n))
        return n
      }),
    []
  )
  const { settings: sessionSettings, saveSettings: saveSessionSettings } = useSessionSettings()
  const autoRecordOnPlay = sessionSettings.autoStartOnFlow
  const toggleAutoRecordOnPlay = useCallback(() => {
    saveSessionSettings({ ...sessionSettings, autoStartOnFlow: !sessionSettings.autoStartOnFlow })
  }, [sessionSettings, saveSessionSettings])

  const { mode, setMode } = useTheme()
  const { toggleDevMode } = useDevMode()

  // Top-level drawer tab
  const [activeTab, setActiveTab] = useState<MobileTab | null>(null)

  // Sub-tab memory per top-level tab
  const [rightSub, setRightSub] = useState<RightSubTab>('info')
  const [settingsSub, setSettingsSub] = useState<SettingsSubTab>('interface')

  // Register global feedback-open API
  useEffect(() => {
    setOpenFeedbackTab(() => {
      setActiveTab('feedback')
    })
  }, [setOpenFeedbackTab])

  const closeSheet = useCallback(() => setActiveTab(null), [])
  const openSheet = useCallback(() => setActiveTab(t => t ?? 'explore'), [])

  const activeView = views.find(v => v.id === activeViewId)
  const screenLabel = activeView?.label ?? activeViewId
  const kitTheme = workspaceConfig.kit ?? 'apple'

  const colorFilter =
    colorBlindMode !== 'none' ? `url(#${COLOR_BLIND_FILTERS[colorBlindMode]})` : undefined
  const blurFilter = blurryVision > 0 ? `blur(${blurryVision * 2}px)` : undefined
  const combinedFilter = [colorFilter, blurFilter].filter(Boolean).join(' ') || undefined

  const ActiveComponent = activeView?.component as
    | React.ComponentType<Record<string, unknown>>
    | undefined

  const actionCtx = useMemo<ActionCtx>(
    () => ({
      navigateTo,
      setActiveTab: () => {},
      setIsOpen: open => {
        if (!open) closeSheet()
      },
      toggleTheme: () => setMode(mode === 'dark' ? 'light' : 'dark'),
      toggleOrientation,
      resetToFirst,
      resetDb,
      openGoTo: () => {},
      openHelp: () => {},
      openSettings: () => {
        setActiveTab('settings')
      },
      toggleDevMode,
      toggleCloudExport,
      cloudExportEnabled,
      openFeedbackTab: () => {
        setActiveTab('feedback')
      },
      openExportModal: () => {},
      openImportModal: () => {},
      toggleAutoHideScrollbars,
      autoHideScrollbars,
      showSessionsFeature,
      toggleSessionsFeature,
      autoRecordOnPlay,
      toggleAutoRecordOnPlay,
      flowLensAvailable: false,
      enterFlowLens: () => {},
    }),
    [
      navigateTo,
      closeSheet,
      setMode,
      mode,
      toggleOrientation,
      resetToFirst,
      resetDb,
      toggleDevMode,
      toggleCloudExport,
      cloudExportEnabled,
      toggleAutoHideScrollbars,
      autoHideScrollbars,
      showSessionsFeature,
      toggleSessionsFeature,
      autoRecordOnPlay,
      toggleAutoRecordOnPlay,
    ]
  )

  // Top-level tab definitions
  const topTabs: PanelTab[] = useMemo(
    () => [
      { id: 'explore', label: 'Explore', icon: <Compass size={14} /> },
      { id: 'goto', label: 'Go To', icon: <Search size={14} /> },
      { id: 'inspect', label: 'Inspect', icon: <ScanSearch size={14} /> },
      {
        id: 'feedback',
        label: 'Feedback',
        icon: <MessageSquare size={14} />,
        badge: totalCommentCount > 0 ? totalCommentCount : undefined,
      },
      { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
      { id: 'actions', label: 'Actions', icon: <Zap size={14} /> },
    ],
    [totalCommentCount]
  )

  return (
    <div
      data-kit={kitTheme}
      data-theme={mode}
      className="relative w-screen h-svh overflow-hidden"
      style={{ background: 'var(--color-bg-base, #fff)' }}
    >
      <ColorBlindSVGDefs />

      {/* Screen content */}
      <div className="absolute inset-0 flex flex-col" style={{ filter: combinedFilter }}>
        {ActiveComponent && <ActiveComponent />}
      </div>

      {/* Bottom-left — back button + screen label (thumb zone, same row as FAB) */}
      <div
        style={{ zIndex: Z.modal }}
        className="fixed bottom-6 left-5 flex items-center gap-2 pointer-events-none"
      >
        {canGoBack && (
          <button
            onClick={goBack}
            className="pointer-events-auto rounded-full bg-gray-950/40 border-0 cursor-pointer flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-transform duration-150 shrink-0 size-14"
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
            aria-label="Go back"
          >
            <ChevronLeft size={22} color="#fff" />
          </button>
        )}
        <span
          className="pointer-events-none text-ui-sm font-semibold text-white/40 leading-tight"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
        >
          {screenLabel}
        </span>
      </div>

      {/* FAB */}
      <MobileFAB onClick={openSheet} />

      {/* Bottom sheet drawer */}
      <BottomSheet
        isOpen={activeTab !== null}
        onClose={closeSheet}
        tabs={topTabs}
        activeTabId={activeTab ?? undefined}
        onTabChange={id => setActiveTab(id as MobileTab)}
      >
        {activeTab === 'explore' && <KitSideExplorer flows={flows} bare hideDeviceControls />}

        {activeTab === 'goto' && (
          <GoToOverlayContent
            flows={flows}
            activeViewId={activeViewId}
            navigateTo={id => {
              navigateTo(id)
              closeSheet()
            }}
            onClose={closeSheet}
          />
        )}

        {activeTab === 'inspect' && (
          <RailShell
            tabs={RIGHT_SUBTABS_ALL.filter(t => t.id !== 'sessions' || showSessionsFeature)}
            activeId={rightSub}
            onSelect={id => setRightSub(id as RightSubTab)}
          >
            {rightSub === 'info' && <ScreenInfoContent views={views} />}
            {rightSub === 'simulator' && <SimulatorContent hideDevice />}
            {rightSub === 'flow' && <FlowDebuggerContent />}
            {rightSub === 'db' && <DbContent />}
            {rightSub === 'sessions' && showSessionsFeature && <SessionsContent />}
          </RailShell>
        )}

        {activeTab === 'feedback' && <FeedbackContent views={views} />}

        {activeTab === 'settings' && (
          <RailShell
            tabs={SETTINGS_SUBTABS}
            activeId={settingsSub}
            onSelect={id => setSettingsSub(id as SettingsSubTab)}
          >
            <MobileSettingsContent section={settingsSub} ctx={actionCtx} />
          </RailShell>
        )}

        {activeTab === 'actions' && <ActionCenterContent ctx={actionCtx} onClose={closeSheet} />}
      </BottomSheet>
    </div>
  )
}

// ── Mobile settings content ───────────────────────────────────────────────────
// Thin shim — renders the relevant Settings section inline without the overlay shell.

import {
  LS_AUTO_HIDE_SCROLLBARS,
  LS_LEFT_PANEL_W,
  LS_RIGHT_PANEL_W,
  LS_SESSIONS_ENABLED,
} from '@platform/shared/constants/storageKeys'
import type { ColorBlindMode } from '@platform/types/index'
import { workspaces } from '@platform/workspaces'

import { useActiveWorkspace } from '../../contexts/ActiveWorkspaceContext'
import { useDashboard as _useDashboard, useSimulator } from '../../contexts/DashboardContext'
import Select from '../ui/Select'
import Toggle from '../ui/Toggle'

interface MobileSettingsContentProps {
  section: SettingsSubTab
  ctx: ActionCtx
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-[10px] border-b border-theme-border">
      <div className="flex-1 min-w-0">
        <div className="text-ui-sm font-medium text-theme-text-primary">{label}</div>
        {hint && (
          <div className="text-ui-2xs text-theme-text-muted mt-0.5 leading-normal">{hint}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="px-4 pt-3 pb-1 text-[10px] font-extrabold tracking-[0.09em] uppercase text-theme-text-disabled">
      {title}
    </div>
  )
}

function MobileSettingsContent({ section, ctx }: MobileSettingsContentProps) {
  const activeWorkspaceName = useActiveWorkspace()
  const { switchWorkspace } = _useDashboard()
  const { mode, setMode } = useTheme()
  const { colorBlindMode, setColorBlindMode, blurryVision, setBlurryVision } = useSimulator()
  const { settings, saveSettings } = useSessionSettings()

  if (section === 'interface') {
    return (
      <div>
        <SectionLabel title="Appearance" />
        <SettingRow label="Theme">
          <Select
            value={mode}
            onChange={e => setMode(e.target.value as 'dark' | 'light')}
            style={{ width: 110 }}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </Select>
        </SettingRow>
        <SettingRow label="Auto-hide scrollbars">
          <Toggle
            size="sm"
            checked={ctx.autoHideScrollbars}
            onChange={ctx.toggleAutoHideScrollbars}
          />
        </SettingRow>
        <SectionLabel title="Accessibility" />
        <SettingRow label="Color blind mode">
          <Select
            value={colorBlindMode}
            onChange={e => setColorBlindMode(e.target.value as ColorBlindMode)}
            style={{ width: 140 }}
          >
            <option value="none">None</option>
            <option value="deuteranopia">Deuteranopia</option>
            <option value="protanopia">Protanopia</option>
            <option value="tritanopia">Tritanopia</option>
            <option value="achromatopsia">Achromatopsia</option>
          </Select>
        </SettingRow>
        <SettingRow label="Blurry vision">
          <Select
            value={String(blurryVision)}
            onChange={e => setBlurryVision(Number(e.target.value))}
            style={{ width: 110 }}
          >
            <option value="0">Off</option>
            <option value="1">Mild</option>
            <option value="2">Moderate</option>
            <option value="3">Severe</option>
          </Select>
        </SettingRow>
      </div>
    )
  }

  if (section === 'panel') {
    const leftW = parseInt(localStorage.getItem(LS_LEFT_PANEL_W) ?? '260', 10)
    const rightW = parseInt(localStorage.getItem(LS_RIGHT_PANEL_W) ?? '380', 10)
    return (
      <div>
        <SectionLabel title="Panel widths (desktop)" />
        <SettingRow label="Left panel">
          <span className="text-ui-sm text-theme-text-muted tabular-nums">{leftW}px</span>
        </SettingRow>
        <SettingRow label="Right panel">
          <span className="text-ui-sm text-theme-text-muted tabular-nums">{rightW}px</span>
        </SettingRow>
        <SettingRow label="Reset widths">
          <button
            onClick={() => {
              localStorage.removeItem(LS_LEFT_PANEL_W)
              localStorage.removeItem(LS_RIGHT_PANEL_W)
            }}
            className="text-ui-xs font-semibold py-1 px-[10px] rounded-md border border-theme-border bg-theme-elevated text-theme-text-secondary cursor-pointer"
          >
            Reset
          </button>
        </SettingRow>
      </div>
    )
  }

  if (section === 'workspace') {
    const current = workspaces.find(w => w.name === activeWorkspaceName) ?? workspaces[0] ?? null
    if (!current) return null
    const others = workspaces.filter(w => w.name !== activeWorkspaceName)
    return (
      <div>
        <SectionLabel title="Active workspace" />
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg border border-theme-border bg-theme-elevated flex items-center gap-2">
          <div className="rounded-full bg-blue-400 shrink-0 size-2" />
          <span className="text-ui-sm font-semibold flex-1 truncate text-theme-text-primary">
            {current?.label ?? activeWorkspaceName}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-theme-blue-dim text-theme-blue">
            active
          </span>
        </div>
        {others.length > 0 && (
          <>
            <SectionLabel title="Switch to" />
            {others.map(w => (
              <WorkspaceSwitchItem key={w.name} workspace={w} onSwitch={switchWorkspace} />
            ))}
          </>
        )}
        {others.length === 0 && (
          <p className="px-3 text-ui-xs text-theme-text-disabled">
            No other workspaces configured.
          </p>
        )}
      </div>
    )
  }

  // sessions
  return (
    <div>
      <SectionLabel title="Recording" />
      <SettingRow label="Enable sessions">
        <Toggle size="sm" checked={ctx.showSessionsFeature} onChange={ctx.toggleSessionsFeature} />
      </SettingRow>
      <SettingRow label="Auto-record on flow play">
        <Toggle size="sm" checked={ctx.autoRecordOnPlay} onChange={ctx.toggleAutoRecordOnPlay} />
      </SettingRow>
      <SectionLabel title="Data channels" />
      <SettingRow label="Cursor tracking">
        <Toggle
          size="sm"
          checked={settings.cursorTracking}
          onChange={() => saveSettings({ ...settings, cursorTracking: !settings.cursorTracking })}
        />
      </SettingRow>
      <SettingRow label="Interaction effects">
        <Toggle
          size="sm"
          checked={settings.effects}
          onChange={() => saveSettings({ ...settings, effects: !settings.effects })}
        />
      </SettingRow>
      <SettingRow label="State changes">
        <Toggle
          size="sm"
          checked={settings.stateChanges}
          onChange={() => saveSettings({ ...settings, stateChanges: !settings.stateChanges })}
        />
      </SettingRow>
    </div>
  )
}

function WorkspaceSwitchItem({
  workspace,
  onSwitch,
}: {
  workspace: { name: string; label: string }
  onSwitch: (name: string) => void
}) {
  const [switching, setSwitching] = useState(false)
  return (
    <button
      onClick={() => {
        setSwitching(true)
        onSwitch(workspace.name)
      }}
      disabled={switching}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/4"
      style={{ opacity: switching ? 0.6 : 1 }}
    >
      <div className="rounded-full bg-theme-text-muted shrink-0 size-2" />
      <span className="text-ui-sm flex-1 truncate text-theme-text-secondary">
        {workspace.label}
      </span>
      <span className="text-ui-xs text-theme-text-disabled">
        {switching ? 'switching…' : 'switch'}
      </span>
    </button>
  )
}
