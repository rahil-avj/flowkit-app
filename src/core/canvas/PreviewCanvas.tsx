import { useFlowPlaybackOptional } from '@features/flowplan/FlowPlaybackContext'
import { useFeedback } from '@platform/features/feedback/context/FeedbackContext'
import { useSessionSettings } from '@platform/features/flowTracer/components/useSessionSettings'
import { useSessionRecorderOptional } from '@platform/features/flowTracer/context'
import { GoToOverlay } from '@platform/features/go-to-overlay'
import DeviceMockup from '@platform/shared/components/devices/DeviceMockup'
import PanelErrorBoundary from '@platform/shared/components/errors/PanelErrorBoundary'
import MobileCanvas from '@platform/shared/components/mobile/MobileCanvas'
import ActionCenter from '@platform/shared/components/overlays/ActionCenter'
import type { ActionCtx } from '@platform/shared/components/overlays/appActions'
import HelpModal from '@platform/shared/components/overlays/HelpModal'
import Settings from '@platform/shared/components/overlays/Settings'
import Tooltip from '@platform/shared/components/ui/Tooltip'
import {
  LS_AUTO_HIDE_SCROLLBARS,
  LS_SESSIONS_ENABLED,
} from '@platform/shared/constants/storageKeys'
import { useActiveWorkspace } from '@platform/shared/contexts/ActiveWorkspaceContext'
import { useDashboard } from '@platform/shared/contexts/DashboardContext'
import { useDevMode } from '@platform/shared/contexts/DevModeContext'
import { useFlowLensModeOptional } from '@platform/shared/contexts/FlowLensModeContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import { useIsMobile } from '@platform/shared/utils/useIsMobile'
import type { FlowNode, WireframeView } from '@platform/types/index'
import { workspaces } from '@platform/workspaces'
import {
  ChevronDown,
  Hand,
  Maximize2,
  MessageSquare,
  MessageSquare as RemarkIcon,
  Minimize2,
  Pause,
  Play,
  Repeat,
  ScanEye,
  Shrink,
  Square,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'

import type { PanelDragHandle } from '../layout/hooks/usePanelDrag'
import KitSideExplorer from '../layout/KitSideExplorer'
import KitSideInspector, {
  COLOR_BLIND_FILTERS,
  ColorBlindSVGDefs,
} from '../layout/KitSideInspector'
import PanelFrame from '../layout/PanelFrame'
import { useCanvasShortcuts, useGlobalOverlayShortcuts } from '../shortcuts/useKeyboardShortcuts'
import { CANVAS_H, CANVAS_W, ZOOM_MAX, ZOOM_MIN } from './canvasConfig'
import { canvasReducer, type CanvasState, makeInitialState } from './canvasReducer'
import { useHandTool } from './hooks/useHandTool'
import { usePanelResize } from './hooks/usePanelResize'
import { ToolbarBtn, ToolbarTooltipContent } from './ToolbarBtn'

// Safe fallback used when useFlowLensModeOptional returns null during HMR
// re-renders before the provider tree is restored.
const DISABLED_LENS = {
  available: false,
  enabled: false,
  pendingSessionId: null,
  enter: () => {},
  exit: () => {},
  consumePendingSessionId: () => null,
} as const

// FlowLens mode — presence-based. flowlensLoader comes from import.meta.glob in
// FlowLensModeContext; when src/modes/flowlens/ is absent the glob is empty,
// loader is undefined, and Rollup DCEs the entire flowlens chunk.
import { flowlensLoader } from '@platform/shared/contexts/FlowLensModeContext'
interface FlowLensModeProps {
  views: unknown[]
  effectiveLeftW: number
  effectiveRightW: number
  leftOpen: boolean
  rightOpen: boolean
  setLeftOpen: (v: boolean) => void
  setRightOpen: (v: boolean) => void
  leftHandle: PanelDragHandle
  rightHandle: PanelDragHandle
}
const FlowLensMode = flowlensLoader
  ? lazy(flowlensLoader as () => Promise<{ default: React.ComponentType<FlowLensModeProps> }>)
  : null

interface Props {
  flows: FlowNode[]
  views: WireframeView[]
}
export default function PreviewCanvas({ flows, views }: Props) {
  const isMobile = useIsMobile()
  if (isMobile) return <MobileCanvas flows={flows} views={views} />
  return <DesktopCanvas flows={flows} views={views} />
}

function DesktopCanvas({ flows, views }: Props) {
  const {
    activeViewId,
    devicePreset,
    orientation,
    colorBlindMode,
    blurryVision,
    navigateTo,
    toggleOrientation,
    resetToFirst,
    resetDb,
    workspaceConfig,
  } = useDashboard()
  const isLandscape = orientation === 'landscape'
  const effectiveDeviceW = isLandscape ? devicePreset.height : devicePreset.width
  const effectiveDeviceH = isLandscape ? devicePreset.width : devicePreset.height
  const {
    totalCommentCount,
    openFeedbackTab,
    openCommentForm,
    cloudExportEnabled,
    toggleCloudExport,
    openExportModal,
    openImportModal,
  } = useFeedback()
  const { theme, mode, setMode } = useTheme()
  const { toggleDevMode } = useDevMode()
  const flowLens = useFlowLensModeOptional() ?? DISABLED_LENS
  const lensOn = flowLens.enabled
  const flowPlayback = useFlowPlaybackOptional()

  // ── Global overlays ──────────────────────────────────────────────────────────
  const [showGoTo, setShowGoTo] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // ── Scrollbar preference ─────────────────────────────────────────────────────
  const [autoHideScrollbars, setAutoHideScrollbars] = useState(
    () => localStorage.getItem(LS_AUTO_HIDE_SCROLLBARS) === 'true'
  )
  const toggleAutoHideScrollbars = useCallback(() => {
    setAutoHideScrollbars(v => {
      const next = !v
      localStorage.setItem(LS_AUTO_HIDE_SCROLLBARS, String(next))
      return next
    })
  }, [])

  // ── Sessions feature ─────────────────────────────────────────────────────────
  const [showSessionsFeature, setShowSessionsFeature] = useState(
    () => localStorage.getItem(LS_SESSIONS_ENABLED) === 'true'
  )
  const toggleSessionsFeature = useCallback(() => {
    setShowSessionsFeature(v => {
      const next = !v
      localStorage.setItem(LS_SESSIONS_ENABLED, String(next))
      return next
    })
  }, [])

  const { settings: sessionSettings, saveSettings: saveSessionSettings } = useSessionSettings()
  const autoRecordOnPlay = sessionSettings.autoStartOnFlow
  const toggleAutoRecordOnPlay = useCallback(() => {
    saveSessionSettings({ ...sessionSettings, autoStartOnFlow: !sessionSettings.autoStartOnFlow })
  }, [sessionSettings, saveSessionSettings])

  const toggleTheme = useCallback(
    () => setMode(mode === 'dark' ? 'light' : 'dark'),
    [mode, setMode]
  )
  const openGoTo = useCallback(() => setShowGoTo(true), [])
  const openHelp = useCallback(() => setShowHelp(true), [])
  const openSettings = useCallback(() => setShowSettings(true), [])
  const enterFlowLens = useCallback(() => flowLens.enter(), [flowLens])

  const actionCtx = useMemo<ActionCtx>(
    () => ({
      navigateTo,
      setActiveTab: () => {},
      setIsOpen: () => {},
      toggleTheme,
      toggleOrientation,
      resetToFirst,
      resetDb,
      openGoTo,
      openHelp,
      toggleDevMode,
      toggleCloudExport,
      cloudExportEnabled,
      openFeedbackTab,
      openExportModal,
      openImportModal,
      toggleAutoHideScrollbars,
      autoHideScrollbars,
      showSessionsFeature,
      toggleSessionsFeature,
      autoRecordOnPlay,
      toggleAutoRecordOnPlay,
      openSettings,
      flowLensAvailable: flowLens.available,
      enterFlowLens,
    }),
    [
      navigateTo,
      toggleTheme,
      toggleOrientation,
      resetToFirst,
      resetDb,
      openGoTo,
      openHelp,
      toggleDevMode,
      toggleCloudExport,
      cloudExportEnabled,
      openFeedbackTab,
      openExportModal,
      openImportModal,
      toggleAutoHideScrollbars,
      autoHideScrollbars,
      showSessionsFeature,
      toggleSessionsFeature,
      autoRecordOnPlay,
      toggleAutoRecordOnPlay,
      openSettings,
      flowLens.available,
      enterFlowLens,
    ]
  )

  const openActions = useCallback(() => setShowActions(true), [])
  const openCommentFormShortcut = useCallback(() => {
    openFeedbackTab()
    openCommentForm()
  }, [openFeedbackTab, openCommentForm])

  useGlobalOverlayShortcuts({
    openGoTo,
    openActions,
    openHelp,
    openSettings,
    openCommentForm: openCommentFormShortcut,
  })

  // ── Memoized derived values ──────────────────────────────────────────────────
  const activeView = useMemo(
    () => views.find(v => v.id === activeViewId) ?? views[0],
    [views, activeViewId]
  )
  const { activeVariantByView, db } = useDashboard()
  const ActiveComponent = useMemo(() => {
    const serial = activeView?.id ? activeVariantByView[activeView.id] : undefined
    if (serial && activeView?.variants) {
      const variant = activeView.variants.find(v => v.serial === serial)
      if (variant) return variant.component
    }
    return activeView?.component
  }, [activeView, activeVariantByView])
  const gridDotColor = useMemo(
    () => (theme.bg.base === '#09090b' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)'),
    [theme.bg.base]
  )

  // ── Canvas state — single reducer atom ───────────────────────────────────────
  const [state, dispatch] = useReducer(canvasReducer, undefined, makeInitialState)

  // Mirror for the non-reactive wheel handler.
  const stateRef = useRef<CanvasState>(state)
  useLayoutEffect(() => {
    stateRef.current = state
  })

  const canvasRef = useRef<HTMLDivElement>(null)
  const gridPatternId = useId().replace(/:/g, '')

  // ── Panel layout — single source of truth for all panel geometry ─────────────
  // usePanelResize (→ usePanelLayout) owns drag widths, open state, AND the
  // derived effectiveLeftW / effectiveRightW. No component below this call
  // should recompute effective widths independently.
  const {
    leftOpen,
    rightOpen,
    setLeftOpen,
    setRightOpen,
    effectiveLeftW,
    effectiveRightW,
    leftHandle,
    rightHandle,
    isPanelDragging,
  } = usePanelResize(undefined, undefined, state.fullscreen)

  // ── CSS vars — produced from canonical effectiveLeftW / effectiveRightW ──────
  // These are the only writers of --left-panel-w and --right-panel-w in the
  // entire application. FlowLens reads these same values via props.
  const cssVars = useMemo(
    () =>
      ({
        '--left-panel-w': `${effectiveLeftW}px`,
        '--right-panel-w': `${effectiveRightW}px`,
      }) as React.CSSProperties,
    [effectiveLeftW, effectiveRightW]
  )

  // ── ResizeObserver — observation and state commitment are separate concerns ───
  //
  // The ResizeObserver ALWAYS receives browser geometry — it is never suppressed.
  // During a drag, measurements are stored in a ref (pendingMeasurement) but not
  // committed to the reducer, preventing ~300 fitScale recomputations per drag.
  //
  // When drag ends (isPanelDragging transitions false → true), the pending
  // measurement is compared to the last committed measurement. If they differ,
  // exactly one MEASURED action is dispatched. This covers the clamped-width
  // case: when a panel reaches its max width before mouseup, the ResizeObserver
  // fires during drag and stores the correct canvas dimensions in the ref.
  // At drag-end the ref holds a value that differs from the last commit, so
  // exactly one MEASURED dispatch occurs — with no second measurement pipeline
  // and no manual DOM reads outside the ResizeObserver callback.

  // Stores the last measurement received from ResizeObserver (always up-to-date).
  const pendingMeasurement = useRef<{ w: number; h: number } | null>(null)
  // Stores the last measurement that was committed to the reducer.
  const committedMeasurement = useRef<{ w: number; h: number } | null>(null)
  // Stable ref to device dimensions for use inside the observer callback.
  const deviceDimsRef = useRef({
    effectiveDeviceW,
    effectiveDeviceH,
    deviceType: devicePreset.type,
  })
  useLayoutEffect(() => {
    deviceDimsRef.current = { effectiveDeviceW, effectiveDeviceH, deviceType: devicePreset.type }
  })

  const isPanelDraggingRef = useRef(isPanelDragging)
  useLayoutEffect(() => {
    isPanelDraggingRef.current = isPanelDragging
  })

  const commitMeasurement = useCallback(
    (w: number, h: number) => {
      const { effectiveDeviceW: dW, effectiveDeviceH: dH, deviceType } = deviceDimsRef.current
      committedMeasurement.current = { w, h }
      dispatch({
        type: 'MEASURED',
        visibleW: w,
        visibleH: h,
        deviceW: dW,
        deviceH: dH,
        deviceType,
      })
    },
    [] // dispatch is stable; deviceDimsRef is a ref
  )

  useLayoutEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const onObserve = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w === 0 || h === 0) return
      pendingMeasurement.current = { w, h }
      // Commit immediately when not dragging.
      if (!isPanelDraggingRef.current) {
        commitMeasurement(w, h)
      }
    }

    const ro = new ResizeObserver(onObserve)
    ro.observe(el)
    onObserve() // initial measurement on mount / device-change

    return () => ro.disconnect()
  }, [effectiveDeviceW, effectiveDeviceH, devicePreset.type, commitMeasurement])

  // Flush pending measurement when drag ends. Runs after usePanelLayout's
  // useEffect (which removes data-panel-drag), so the drag flag is already clear.
  const wasDraggingRef = useRef(isPanelDragging)
  useEffect(() => {
    const wasDragging = wasDraggingRef.current
    wasDraggingRef.current = isPanelDragging
    if (wasDragging && !isPanelDragging) {
      const pending = pendingMeasurement.current
      const committed = committedMeasurement.current
      if (
        pending &&
        (committed === null || pending.w !== committed.w || pending.h !== committed.h)
      ) {
        commitMeasurement(pending.w, pending.h)
      }
    }
  }, [isPanelDragging, commitMeasurement])

  // ── Scroll-intent layout effect ───────────────────────────────────────────────
  useLayoutEffect(() => {
    if (state.scrollCenterCount === 0) return
    const el = canvasRef.current
    if (!el || el.clientWidth === 0 || el.clientHeight === 0) return
    el.scrollLeft = (CANVAS_W - el.clientWidth) / 2
    el.scrollTop = (CANVAS_H - el.clientHeight) / 2
  }, [state.scrollCenterCount])

  // ── Toggle functions ──────────────────────────────────────────────────────────
  const getVisibleDims = useCallback(() => {
    const el = canvasRef.current
    return { visibleW: el?.clientWidth ?? 0, visibleH: el?.clientHeight ?? 0 }
  }, [])

  const toggleKeepFit = useCallback(() => {
    const { visibleW, visibleH } = getVisibleDims()
    dispatch({
      type: 'TOGGLE_KEEP_FIT',
      deviceType: devicePreset.type,
      deviceW: effectiveDeviceW,
      deviceH: effectiveDeviceH,
      visibleW,
      visibleH,
    })
  }, [devicePreset.type, effectiveDeviceW, effectiveDeviceH, getVisibleDims])

  const toggleFullscreen = useCallback(() => {
    // Only signal the intent to toggle. KeepFit recalculation is deferred entirely
    // to the MEASURED dispatch that ResizeObserver fires after browser layout
    // completes — no pre-layout dimension estimation here.
    dispatch({ type: 'TOGGLE_FULLSCREEN' })
  }, [])

  const zoomIn = useCallback(() => {
    dispatch({
      type: 'ZOOM_IN',
      deviceType: devicePreset.type,
      deviceW: effectiveDeviceW,
      deviceH: effectiveDeviceH,
    })
  }, [devicePreset.type, effectiveDeviceW, effectiveDeviceH])

  const zoomOut = useCallback(() => {
    dispatch({
      type: 'ZOOM_OUT',
      deviceType: devicePreset.type,
      deviceW: effectiveDeviceW,
      deviceH: effectiveDeviceH,
    })
  }, [devicePreset.type, effectiveDeviceW, effectiveDeviceH])

  const resetZoom = useCallback(() => {
    dispatch({
      type: 'RESET_ZOOM',
      deviceType: devicePreset.type,
      deviceW: effectiveDeviceW,
      deviceH: effectiveDeviceH,
    })
  }, [devicePreset.type, effectiveDeviceW, effectiveDeviceH])

  const breakKeepFit = useCallback(() => {
    dispatch({
      type: 'BREAK_KEEP_FIT',
      deviceType: devicePreset.type,
      deviceW: effectiveDeviceW,
      deviceH: effectiveDeviceH,
    })
  }, [devicePreset.type, effectiveDeviceW, effectiveDeviceH])

  // ── Wheel handler — non-reactive, reads stateRef ──────────────────────────────
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      const inDevice = !!(e.target as HTMLElement).closest('[data-mockup]')
      if (e.ctrlKey) {
        if (inDevice) return
        e.preventDefault()
        const cur = stateRef.current.scale
        const delta = e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.005)
        const newZoom = parseFloat(
          Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cur * (1 - delta))).toFixed(3)
        )
        dispatch({
          type: 'SET_ZOOM',
          zoom: newZoom,
          deviceType: devicePreset.type,
          deviceW: effectiveDeviceW,
          deviceH: effectiveDeviceH,
        })
        return
      }
      if (stateRef.current.keepFit && !inDevice) e.preventDefault()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty — handler reads live state via stateRef.

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useCanvasShortcuts({
    zoomIn,
    zoomOut,
    resetZoom,
    toggleKeepFit,
    toggleFullscreen,
    toggleOrientation,
    resetToFirst,
    isFullscreen: () => stateRef.current.fullscreen,
    isKeepFit: () => stateRef.current.keepFit,
    flowPlayback,
  })

  return (
    // CSS Grid root: left panel | canvas (spans all 3 cols) | right panel
    // Panels sit at z-index:2, canvas at z-index:0.
    // CSS vars drive both the column widths and the canvas scroll inset.
    <div
      className="grid grid-cols-[var(--left-panel-w)_1fr_var(--right-panel-w)] grid-rows-[minmax(0,1fr)] min-h-0 flex-1 overflow-hidden relative size-full"
      style={cssVars}
    >
      <CanvasContent
        canvasRef={canvasRef}
        scale={state.scale}
        gridDotColor={gridDotColor}
        gridPatternId={gridPatternId}
        colorBlindMode={colorBlindMode}
        blurryVision={blurryVision}
        ActiveComponent={ActiveComponent}
        db={db}
        activeViewLabel={activeView?.label}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        resetZoom={resetZoom}
        keepFit={state.keepFit}
        toggleKeepFit={toggleKeepFit}
        toggleFullscreen={toggleFullscreen}
        fullscreen={state.fullscreen}
        totalCommentCount={totalCommentCount}
        openFeedbackTab={openFeedbackTab}
        autoHideScrollbars={autoHideScrollbars}
        breakKeepFit={breakKeepFit}
        kitTheme={workspaceConfig.kit ?? 'apple'}
        showSessionsFeature={showSessionsFeature}
        isPanelDragging={isPanelDragging}
      />

      {/* ── Left panel ── */}
      <PanelFrame
        side="left"
        layout="grid"
        handle={leftHandle}
        isOpen={leftOpen}
        accentColor={theme.accent.blue}
        className={`col-start-1 row-start-1 z-2 flex flex-col ${state.fullscreen ? 'invisible pointer-events-none' : 'visible pointer-events-auto'} ${lensOn ? 'hidden' : 'flex'}`}
      >
        <div className="flex flex-1 min-h-0">
          <KitSideExplorer
            flows={flows}
            isOpen={leftOpen}
            onOpenChange={setLeftOpen}
            onOpenSettings={openSettings}
          />
        </div>
        <WorkspaceBar panelOpen={leftOpen} />
      </PanelFrame>

      {/* ── Right panel ── */}
      <PanelFrame
        side="right"
        layout="grid"
        handle={rightHandle}
        isOpen={rightOpen}
        accentColor={theme.accent.blue}
        className={`col-start-3 row-start-1 z-2 ${state.fullscreen ? 'invisible pointer-events-none' : 'visible pointer-events-auto'} ${lensOn ? 'hidden' : 'flex'}`}
      >
        <KitSideInspector
          views={views}
          isOpen={rightOpen}
          onOpenChange={setRightOpen}
          sessionsFeatureEnabled={showSessionsFeature}
        />
      </PanelFrame>

      {/* ── FlowLens overlay — spans all columns, pass-through pointer events ── */}
      {lensOn && FlowLensMode && (
        <div className="col-span-full row-start-1 z-3 relative pointer-events-none">
          <PanelErrorBoundary
            fallback={
              <div className="absolute inset-0 flex items-center justify-center text-xs opacity-40 pointer-events-none">
                Replay unavailable — check the console
              </div>
            }
          >
            <Suspense fallback={<FlowLensPanelSkeleton />}>
              <FlowLensMode
                views={views}
                effectiveLeftW={effectiveLeftW}
                effectiveRightW={effectiveRightW}
                leftOpen={leftOpen}
                rightOpen={rightOpen}
                setLeftOpen={setLeftOpen}
                setRightOpen={setRightOpen}
                leftHandle={leftHandle}
                rightHandle={rightHandle}
              />
            </Suspense>
          </PanelErrorBoundary>
        </div>
      )}

      {showGoTo && (
        <GoToOverlay
          flows={flows}
          activeViewId={activeViewId}
          navigateTo={navigateTo}
          onClose={() => setShowGoTo(false)}
        />
      )}
      {showActions && (
        <ActionCenter
          ctx={actionCtx}
          onClose={() => setShowActions(false)}
          mode={lensOn ? 'flowlens' : 'default'}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} ctx={actionCtx} />}
    </div>
  )
}

function FlowLensPanelSkeleton() {
  return (
    <div className="absolute left-0 w-[280px] bg-theme-surface border-r border-theme-border pointer-events-auto inset-y-0">
      <div className="p-4 text-theme-text-disabled text-ui-xs">Loading FlowLens…</div>
    </div>
  )
}

// ─── CanvasContent ────────────────────────────────────────────────────────────

interface CanvasContentProps {
  canvasRef: React.RefObject<HTMLDivElement | null>
  scale: number
  gridDotColor: string
  gridPatternId: string
  colorBlindMode: string
  blurryVision: number
  ActiveComponent: React.ComponentType<Record<string, unknown>> | undefined
  db: Record<string, unknown>
  activeViewLabel: string | undefined
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  keepFit: boolean
  toggleKeepFit: () => void
  toggleFullscreen: () => void
  fullscreen: boolean
  totalCommentCount: number
  openFeedbackTab: () => void
  autoHideScrollbars: boolean
  breakKeepFit: () => void
  kitTheme: string
  showSessionsFeature: boolean
  isPanelDragging: boolean
}

function CanvasContent({
  canvasRef,
  scale,
  gridDotColor,
  gridPatternId,
  colorBlindMode,
  blurryVision,
  ActiveComponent,
  db,
  activeViewLabel,
  zoomIn,
  zoomOut,
  resetZoom,
  keepFit,
  toggleKeepFit,
  toggleFullscreen,
  fullscreen,
  totalCommentCount,
  openFeedbackTab,
  autoHideScrollbars,
  breakKeepFit,
  kitTheme,
  showSessionsFeature,
  isPanelDragging,
}: CanvasContentProps) {
  const recorder = useSessionRecorderOptional()
  const recState = recorder?.state ?? 'idle'
  const flowLens = useFlowLensModeOptional() ?? DISABLED_LENS
  const [remarkDraft, setRemarkDraft] = useState('')
  const [showRemarkInput, setShowRemarkInput] = useState(false)

  const submitRemark = useCallback(() => {
    if (!remarkDraft.trim() || !recorder) return
    recorder.addRemark(remarkDraft.trim())
    setRemarkDraft('')
    setShowRemarkInput(false)
  }, [remarkDraft, recorder])

  const {
    activeViewId,
    flowAutoPlayEnabled,
    flowAutoPlayPaused,
    setFlowAutoPlayPaused,
    flowAutoPlayLoop,
    setFlowAutoPlayLoop,
  } = useDashboard()

  // ── On-mount scroll center ───────────────────────────────────────────────────
  useLayoutEffect(() => {
    const el = canvasRef.current
    if (!el || el.clientWidth === 0 || el.clientHeight === 0) return
    el.scrollLeft = (CANVAS_W - el.clientWidth) / 2
    el.scrollTop = (CANVAS_H - el.clientHeight) / 2
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Once only — reducer's scrollIntent effect handles subsequent centers.

  // ── Scrollbar fade ────────────────────────────────────────────────────────────
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    },
    []
  )

  useEffect(() => {
    if (!autoHideScrollbars && canvasRef.current) {
      canvasRef.current.classList.remove('is-scrolling')
    }
  }, [autoHideScrollbars, canvasRef])

  const handleScroll = useCallback(() => {
    if (!autoHideScrollbars) return
    const el = canvasRef.current
    if (!el) return
    el.classList.add('is-scrolling')
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      if (canvasRef.current) canvasRef.current.classList.remove('is-scrolling')
    }, 600)
  }, [canvasRef, autoHideScrollbars])

  // ── Hand tool ────────────────────────────────────────────────────────────────
  const { handMode, setHandLocked, showHandTooltip, cursor, handlers } = useHandTool(
    canvasRef,
    breakKeepFit
  )
  const canvasClass = `canvas-scroll${autoHideScrollbars ? '' : ' scrollbars-always'}${keepFit ? ' keep-fit' : ''}`
  const deviderV = <div className="w-0.25 h-6 my-0.5 bg-theme-border" />

  return (
    // Spans all 3 grid columns, z-index:0 — panels float above at z-index:2
    <div className="col-span-full row-start-1 z-0 relative overflow-hidden bg-theme-base size-full">
      <svg
        className="absolute inset-0 pointer-events-none size-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={gridPatternId}
            width={Math.max(0.01, 24 * scale)}
            height={Math.max(0.01, 24 * scale)}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={Math.max(0, 0.75 * scale)}
              cy={Math.max(0, 0.75 * scale)}
              r={Math.max(0, 0.75 * scale)}
              fill={gridDotColor}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gridPatternId})`} />
      </svg>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(59,130,246,0.05)_0%,transparent_70%)]" />

      <div
        ref={canvasRef}
        className={`${canvasClass} absolute left-(--left-panel-w) right-(--right-panel-w) overflow-auto bg-transparent outline-none overscroll-contain inset-y-0`}
        tabIndex={-1}
        data-kit={kitTheme}
        style={{
          cursor,
        }}
        onScroll={handleScroll}
        {...handlers}
        onClick={e => (e.currentTarget as HTMLDivElement).focus()}
      >
        <ColorBlindSVGDefs />

        <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
          <div
            id="mockup-container"
            data-mockup="true"
            className={`absolute top-1/2 left-1/2 shrink-0 origin-center ${handMode ? 'pointer-events-none' : 'pointer-events-auto'}`}
            style={{
              transform: `translate(-50%, -50%) scale(${scale})`,
              transition: isPanelDragging ? 'none' : 'transform 0.28s ease',
            }}
          >
            <DeviceMockup
              filter={[
                COLOR_BLIND_FILTERS[colorBlindMode as keyof typeof COLOR_BLIND_FILTERS],
                blurryVision > 0 ? `blur(${blurryVision}px)` : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {ActiveComponent ? (
                // Static Screens-tab preview — outside flowplan playback there's no
                // navigation/flow context, so only db is meaningful here. Screens
                // authored against FlowScreenProps (the flat-mode convention) would
                // otherwise see db as undefined until entering playback via FlowMaster.
                <ActiveComponent db={db} />
              ) : (
                <div className="flex-1 flex items-center justify-center h-full bg-theme-elevated text-theme-text-disabled text-ui-sm font-sans">
                  No view selected
                </div>
              )}
            </DeviceMockup>
          </div>
        </div>
      </div>

      <div className="absolute z-20 user-select-none pointer-events-none bottom-15 left-middle-canvas -translate-x-1/2">
        <span className="text-ui-xs font-medium text-theme-text-disabled tracking-wider">
          {activeViewLabel}
        </span>
      </div>

      {/* Main Toolbar */}
      <div className="absolute z-20 flex flex-col-reverse items-center gap-2 bottom-5 left-middle-canvas -translate-x-1/2">
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-theme-surface/88 border border-theme-border backdrop-blur-md shadow-theme-float">
          {activeViewId.endsWith('-play') && flowAutoPlayEnabled && (
            <>
              <ToolbarBtn
                onClick={() => setFlowAutoPlayPaused(!flowAutoPlayPaused)}
                title={flowAutoPlayPaused ? 'Resume auto-play' : 'Pause auto-play'}
                tooltip={{ label: flowAutoPlayPaused ? 'Resume' : 'Pause', hint: 'Auto-play' }}
                tint={flowAutoPlayPaused ? 'amber' : 'green'}
              >
                {flowAutoPlayPaused ? <Play size={14} /> : <Pause size={14} />}
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => setFlowAutoPlayLoop(!flowAutoPlayLoop)}
                title={flowAutoPlayLoop ? 'Loop on' : 'Loop off'}
                tooltip={{
                  label: 'Loop',
                  hint: flowAutoPlayLoop ? 'On — click to turn off' : 'Off — click to turn on',
                }}
                tint={flowAutoPlayLoop ? 'green' : 'default'}
              >
                <Repeat size={14} />
              </ToolbarBtn>
              {deviderV}
            </>
          )}

          <ToolbarBtn
            onClick={zoomOut}
            title="Zoom out"
            tooltip={{ label: 'Zoom out', shortcut: '⌘−' }}
          >
            <ZoomOut size={14} />
          </ToolbarBtn>
          <ZoomLabel scale={scale} onClick={resetZoom} />
          <ToolbarBtn
            onClick={zoomIn}
            title="Zoom in"
            tooltip={{ label: 'Zoom in', shortcut: '⌘+' }}
          >
            <ZoomIn size={14} />
          </ToolbarBtn>

          {deviderV}

          <ToolbarBtn
            onClick={() => setHandLocked(l => !l)}
            title="Hand tool"
            tooltip={
              showHandTooltip
                ? {
                    label: 'Hand tool active',
                    shortcut: 'H',
                    hint: 'Click again to exit · interact mode on',
                  }
                : {
                    label: 'Hand tool',
                    shortcut: 'H',
                    hint: 'Drag to pan · hold Space for quick access',
                  }
            }
            active={handMode}
            tint={showHandTooltip ? 'warning' : 'default'}
          >
            <Hand size={14} />
          </ToolbarBtn>

          <ToolbarBtn
            onClick={toggleKeepFit}
            title="Keep fit"
            tooltip={{
              label: 'Fit to screen',
              shortcut: '0',
              hint: keepFit ? 'Auto-fit is on' : 'Auto-fit is off',
            }}
            active={keepFit}
          >
            <Shrink size={14} />
          </ToolbarBtn>

          <ToolbarBtn
            onClick={toggleFullscreen}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            tooltip={
              fullscreen
                ? { label: 'Exit fullscreen', shortcut: 'Esc' }
                : { label: 'Fullscreen', shortcut: 'F' }
            }
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </ToolbarBtn>

          <ToolbarBtn
            onClick={openFeedbackTab}
            title="Feedback"
            tooltip={{
              label: 'Feedback',
              hint:
                totalCommentCount > 0
                  ? `${totalCommentCount} comment${totalCommentCount !== 1 ? 's' : ''}`
                  : 'Leave a comment',
            }}
            tint="green"
          >
            <MessageSquare size={15} />
            {totalCommentCount > 0 && (
              <span className="text-ui-2xs font-bold">{totalCommentCount}</span>
            )}
          </ToolbarBtn>

          {flowLens.available && (
            <>
              {deviderV}
              <ToolbarBtn
                onClick={() => (flowLens.enabled ? flowLens.exit() : flowLens.enter())}
                title="FlowLens mode"
                tooltip={{ label: 'FlowLens mode', hint: 'Replay & analyze recorded sessions' }}
                tint="violet"
                active={flowLens.enabled}
              >
                <ScanEye size={14} />
              </ToolbarBtn>
            </>
          )}
        </div>
      </div>

      {/* Recording toolbar */}
      {showSessionsFeature && recState !== 'idle' && (
        <div className="flex items-center gap-1 rounded-xl absolute z-20 top-5 left-middle-canvas -translate-x-1/2 bg-theme-surface/90 border border-theme-border backdrop-blur-md shadow-theme-float p-1.5">
          <ToolbarBtn
            onClick={() => recorder?.stopRecording().catch(console.error)}
            title="Stop recording"
            tooltip={{ label: 'Stop & save session' }}
            tint="red"
          >
            <Square size={13} />
          </ToolbarBtn>
          {deviderV}
          <div className="flex items-center gap-1 px-1.5">
            <span
              className={`size-2 rounded-full shrink-0 transition-all duration-200 ${recState === 'recording' ? 'bg-red-500' : 'bg-amber-500'}`}
            />
            <span className="text-ui-xs font-bold text-theme-text-primary tabular-nums">
              {formatElapsed(recorder?.elapsedMs ?? 0)}
            </span>
          </div>
          {deviderV}
          <ToolbarBtn
            onClick={() =>
              recState === 'paused' ? recorder?.resumeRecording() : recorder?.pauseRecording()
            }
            title={recState === 'paused' ? 'Resume' : 'Pause'}
            tooltip={{ label: recState === 'paused' ? 'Resume recording' : 'Pause recording' }}
            tint={recState === 'paused' ? 'amber' : 'default'}
          >
            {recState === 'paused' ? <Play size={14} /> : <Pause size={14} />}
          </ToolbarBtn>

          {showRemarkInput ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={remarkDraft}
                onChange={e => setRemarkDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitRemark()
                  if (e.key === 'Escape') {
                    setShowRemarkInput(false)
                    setRemarkDraft('')
                  }
                }}
                placeholder="Add remark…"
                className="w-40 h-6.5 rounded-sm px-2 outline-none text-ui-xs border border-theme-border bg-theme-elevated text-theme-text-primary"
              />
              <ToolbarBtn
                onClick={submitRemark}
                title="Save remark"
                tooltip={{ label: 'Save remark' }}
                tint="green"
              >
                <RemarkIcon size={13} />
              </ToolbarBtn>
            </div>
          ) : (
            <ToolbarBtn
              onClick={() => setShowRemarkInput(true)}
              title="Add remark"
              tooltip={{ label: 'Add remark' }}
            >
              <RemarkIcon size={13} />
            </ToolbarBtn>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ZoomLabel ────────────────────────────────────────────────────────────────

function ZoomLabel({ scale, onClick }: { scale: number; onClick: () => void }) {
  return (
    <Tooltip
      content={
        <ToolbarTooltipContent label="Reset zoom" shortcut="⌘0" hint="Click to reset to 100%" />
      }
      placement="top"
      showDelay={1500}
    >
      <button
        onClick={onClick}
        className="min-w-11.5 h-6.5 rounded-sm border-none bg-transparent text-theme-text-secondary text-ui-xs font-bold cursor-pointer tabular-nums font-sans transition-colors hover:bg-theme-hover"
      >
        {Math.round(scale * 100)}%
      </button>
    </Tooltip>
  )
}

// ─── formatElapsed ────────────────────────────────────────────────────────────

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── WorkspaceBar ──────────────────────────────────────────────────────────────

// Glob all workspace logos at build time (repo mode). Pattern must be a string literal.
// In flat mode WORKSPACE_LOGOS is {} — logo comes from virtual:flowkit/workspace instead.
const _isSingleWs = import.meta.env.VITE_SINGLE_WORKSPACE === 'true'
const WORKSPACE_LOGOS = import.meta.glob('../../../workspaces/*/lib/assets/logo.*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function getWorkspaceLogo(name: string): string | null {
  if (_isSingleWs) {
    // virtual:flowkit/workspace logo is imported at workspaceModules level; re-export here
    // would create a circular dep. Instead, the flat logo is unused — workspace bar is
    // hidden in single-workspace mode (no switcher shown).
    return null
  }
  const entry = Object.entries(WORKSPACE_LOGOS).find(([p]) =>
    p.includes(`/workspaces/${name}/lib/assets/logo.`)
  )
  return entry?.[1] ?? null
}

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

function WorkspaceBar({ panelOpen }: { panelOpen: boolean }) {
  const activeWorkspace = useActiveWorkspace()
  const { switchWorkspace } = useDashboard()
  const current = workspaces.find(w => w.name === activeWorkspace) ?? workspaces[0] ?? null
  const others = workspaces.filter(w => w.name !== activeWorkspace)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  if (!current) return null

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.top, left: rect.left, width: Math.max(rect.width, 200) })
    }
    setOpen(v => !v)
  }

  return (
    <div
      className="relative shrink-0 flex items-center border-t border-theme-border bg-theme-elevated"
      style={{ height: 57 }}
    >
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="flex-1 h-full flex items-center gap-3 px-2 transition-colors hover:bg-white/3 min-w-0"
      >
        <WorkspaceAvatar
          name={activeWorkspace}
          label={current.label ?? activeWorkspace}
          size={40}
        />
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
            <ChevronDown
              size={12}
              className={`shrink-0 transition-transform mr-1 text-theme-text-disabled ${open ? 'rotate-0' : 'rotate-180'}`}
            />
          </>
        )}
      </button>

      {open && dropdownPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 overflow-hidden bg-theme-elevated border border-theme-border shadow-theme-float rounded-[10px]"
            style={{
              bottom: `calc(100vh - ${dropdownPos.top} + 4px)`,
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
              <span className="px-1.5 py-0.5 rounded-[4px] text-ui-2xs font-bold bg-theme-blue-dim text-theme-blue shrink-0">
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

function WorkspaceSwitchRow({
  workspace,
  onSwitch,
}: {
  workspace: { name: string; label: string; description?: string }
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
