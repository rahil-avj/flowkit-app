import type { CompiledFlowplan } from '@platform/features/flow-library'
import { useSessionRecorderOptional } from '@platform/features/flowTracer/context'
import PanelErrorBoundary from '@platform/shared/components/errors/PanelErrorBoundary'
import { type FlowNavContextValue, FlowNavCtx } from '@platform/shared/contexts/FlowNavContext'
import { useFlowPlaybackOptional } from '@platform/shared/contexts/FlowPlaybackContext'
import { useTheme } from '@platform/shared/contexts/ThemeContext'
import { useSwipeGesture } from '@platform/shared/utils/useSwipeGesture'
import type { FlowConfig, FlowScreenProps, Hotspot } from '@platform/types/index'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ANIM_DURATION, useFlowEngine } from './FlowEngine'

export default function FlowMaster({ flow }: { flow: FlowConfig }) {
  const engine = useFlowEngine(flow)
  const { theme } = useTheme()

  // ─── Flowplan playback integration ───────────────────────────────────────────
  // A compiled flowplan carries a `__flowplan` field; flows without it leave
  // the entire playback branch dormant.
  const flowplan = (flow as Partial<CompiledFlowplan>).__flowplan
  const playback = useFlowPlaybackOptional()
  const {
    activeScreenIndex,
    activeScreen,
    activeScreenId,
    localState,
    animClass,
    isAllowed,
    screenContainerRef,
    resetEngine,
    commitNavigation,
    fireRule,
    getRulesFor,
    onAction,
    skipToLast,
    setIsAutoPlayPaused,
  } = engine

  // The current flowplan step, derived SYNCHRONOUSLY from activeScreenId + the
  // compiled step list (FlowMaster is the source of truth for the active screen;
  // the context never looks the step up itself). Used by the patch effect, the
  // gating handler, and the actionNote caption.
  const currentStepIndex = flowplan
    ? flowplan.steps.findIndex(s => s.screenId === activeScreenId)
    : -1
  const currentStep =
    flowplan && currentStepIndex >= 0 ? flowplan.steps[currentStepIndex] : undefined

  // ── Per-step db patch: when the active screen changes during flowplan
  // playback, apply that step's db patch (silently) + advance currentStep.
  const applyStep = playback?.applyStep
  useEffect(() => {
    if (!flowplan || !applyStep || currentStepIndex < 0) return
    applyStep(currentStepIndex, currentStep?.db)
    // currentStep is derived from flowplan + currentStepIndex which are already
    // in deps — including it would be redundant and cause a double-apply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowplan, applyStep, currentStepIndex])

  // ── Restart coordination: FlowPlaybackContext increments restartSignal when
  // restart() is called. FlowMaster is the coordinator — it owns the engine
  // reference, so it is the only place that can call engine.resetEngine().
  const restartSignal = playback?.restartSignal ?? 0
  useEffect(() => {
    if (!flowplan || restartSignal === 0) return
    resetEngine()
    // resetEngine and flowplan intentionally omitted — restartSignal is the
    // sole trigger; adding resetEngine would fire on every engine identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartSignal])

  // ── Off-script feedback (gating): a non-blocking toast shown briefly when a
  // tap during playback lands outside the step's planned element.
  const [offScript, setOffScript] = useState(false)
  const offScriptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const offScriptElTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashOffScript = useCallback((el: HTMLElement | null) => {
    if (el) {
      el.setAttribute('data-off-script', 'true')
      if (offScriptElTimerRef.current) clearTimeout(offScriptElTimerRef.current)
      offScriptElTimerRef.current = setTimeout(() => {
        if (el.isConnected) {
          el.removeAttribute('data-off-script')
        }
      }, 300)
    }
    setOffScript(true)
    if (offScriptTimerRef.current) clearTimeout(offScriptTimerRef.current)
    offScriptTimerRef.current = setTimeout(() => setOffScript(false), 1500)
  }, [])
  useEffect(
    () => () => {
      if (offScriptTimerRef.current) clearTimeout(offScriptTimerRef.current)
      if (offScriptElTimerRef.current) clearTimeout(offScriptElTimerRef.current)
    },
    []
  )

  // Planned advance element id for the current step (undefined = tap-anywhere).
  const currentOn = flowplan ? currentStep?.on : undefined
  const currentNext = flowplan ? currentStep?.next : undefined

  // ─── FlowNavCtx — programmatic nav from screens goes through commitNavigation
  const flowNavValue = useMemo(
    (): FlowNavContextValue => ({
      navigateTo: (target: string) => {
        const timestamp = new Date().toLocaleTimeString()
        commitNavigation(target, 'none', timestamp, `programmatic → ${target}`, [])
      },
      goNext: () => {
        const timestamp = new Date().toLocaleTimeString()
        commitNavigation('next', 'none', timestamp, 'goNext()', [])
      },
      goBack: () => {
        const timestamp = new Date().toLocaleTimeString()
        commitNavigation('back', 'none', timestamp, 'goBack()', [])
      },
      isFlow: true,
      flowState: localState,
    }),
    [commitNavigation, localState]
  )

  // ─── Cursor sampler + recorder ───────────────────────────────────────────
  const recorderOpt = useSessionRecorderOptional()

  // ─── Event delegation — click / double-click ──────────────────────────────
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, isDouble = false) => {
      // ── Flowplan advancement is driven ENTIRELY by the current step (not the
      // engine's interactions map, which keys on element id and would collide
      // when the same screen/element appears at two journey positions, e.g. a
      // ref'd flow). Resolve the advance target from currentNext; forks resolve
      // via the function form.
      if (flowplan && currentNext !== undefined) {
        const advance = () => {
          const timestamp = new Date().toLocaleTimeString()
          const target =
            typeof currentNext === 'function'
              ? currentNext({ db: engine.buildCtx().db, flowState: localState })
              : currentNext
          commitNavigation(target, 'none', timestamp, 'tap', [])
        }
        if (currentOn === undefined) {
          // Tap-anywhere step.
          advance()
          return
        }
        // Step with a planned element: advance only if the tap hit it (or a
        // descendant); otherwise it's off-script.
        let n = e.target as HTMLElement | null
        while (n && n !== e.currentTarget) {
          if (n.id === currentOn) {
            e.stopPropagation()
            setIsAutoPlayPaused(true)
            advance()
            return
          }
          n = n.parentElement
        }
        flashOffScript(e.target as HTMLElement)
        return
      }
      if (!flow.interactions) {
        const timestamp = new Date().toLocaleTimeString()
        commitNavigation('next', 'none', timestamp, 'tap', [])
        return
      }
      let node = e.target as HTMLElement | null
      let nearestFkId: string | null = null
      while (node && node !== e.currentTarget) {
        // Capture nearest data-fk-id as we walk up
        if (!nearestFkId && node.dataset.fkId) nearestFkId = node.dataset.fkId
        const id = node.id
        if (id) {
          const trigger = isDouble ? 'double-tap' : 'tap'
          const rules = getRulesFor(id, trigger)
          if (rules.length > 0) {
            e.stopPropagation()
            setIsAutoPlayPaused(true)
            rules.forEach(r => fireRule(r, id, trigger))
            return
          }
        }
        node = node.parentElement
      }
      // No rule matched — frustrated click (legacy flows only; flowplans return
      // above and never reach here).
      recorderOpt?.logEvent('interaction.frustrated-click', {
        x: e.clientX,
        y: e.clientY,
        screenId: activeScreenId,
        flowId: flow.id,
        ...(nearestFkId ? { elementId: nearestFkId } : {}),
      })
    },
    // flow.id omitted — it is structurally stable for the lifetime of a flow
    // instance; only flow.interactions drives re-computation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      flow.interactions,
      getRulesFor,
      fireRule,
      commitNavigation,
      setIsAutoPlayPaused,
      recorderOpt,
      activeScreenId,
      flowplan,
      currentOn,
      currentNext,
      flashOffScript,
      localState,
    ]
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => handleContainerClick(e, true),
    [handleContainerClick]
  )

  // ─── Hover ────────────────────────────────────────────────────────────────
  const handleMouseOver = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!flow.interactions) return
      let node = e.target as HTMLElement | null
      while (node && node !== e.currentTarget) {
        const id = node.id
        if (id) {
          const rules = getRulesFor(id, 'hover')
          if (rules.length > 0) {
            rules.forEach(r => fireRule(r, id, 'hover'))
            return
          }
        }
        node = node.parentElement
      }
    },
    [flow.interactions, getRulesFor, fireRule]
  )

  // ─── Swipe gestures ───────────────────────────────────────────────────────
  useSwipeGesture(screenContainerRef, direction => {
    const triggerName = `swipe-${direction}`
    const timestamp = new Date().toLocaleTimeString()
    // Check if any element id has a matching swipe rule; otherwise default swipe-left → next
    const allIds = Object.keys(flow.interactions ?? {})
    for (const id of allIds) {
      const rules = getRulesFor(id, triggerName)
      if (rules.length > 0) {
        rules.forEach(r => fireRule(r, id, triggerName))
        return
      }
    }
    if (direction === 'left') commitNavigation('next', 'slide-left', timestamp, triggerName, [])
    if (direction === 'right') commitNavigation('back', 'slide-right', timestamp, triggerName, [])
  })

  // ─── Cursor sampling (rAF, only when channel enabled) ────────────────────
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      cursorPosRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  useEffect(() => {
    if (!recorderOpt?.channels.cursorTracking) return
    if (recorderOpt.state !== 'recording') return
    const rec = recorderOpt

    let rafId: number
    let lastTick = 0
    function tick(now: number) {
      rafId = requestAnimationFrame(tick)
      // Skip layout reads most frames — the recorder throttles persistence, but
      // there's no point measuring 60×/sec. ~30fps is finer than any sane rate.
      if (now - lastTick < 33) return
      lastTick = now
      const pos = cursorPosRef.current
      const el = screenContainerRef.current
      if (!pos || !el) return
      const rect = el.getBoundingClientRect()
      const x = pos.x - rect.left
      const y = pos.y - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
      rec.logCursorSample({
        x,
        y,
        screenW: rect.width,
        screenH: rect.height,
        screenId: activeScreenId,
        timestamp: performance.now(),
      })
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [recorderOpt, screenContainerRef, activeScreenId])

  // ─── Guard / null checks ──────────────────────────────────────────────────
  if (!isAllowed || !activeScreen) return null

  const screenProps: FlowScreenProps = {
    onAction,
    onNext: () => onAction('next'),
    onBack: () => onAction('back'),
    isFlow: true,
    flowState: localState,
    db: engine.buildCtx().db,
  }

  const isFirst = activeScreenIndex === 0
  const isLast = activeScreenIndex === flow.screens.length - 1
  const ScreenComp = activeScreen.component as React.ComponentType<FlowScreenProps>
  const hotspots: Hotspot[] = activeScreen.hotspots ?? []

  return (
    <>
      {/* Screen transition keyframes */}
      <style>{`
        @keyframes fm-fade-in        { from{opacity:0}                          to{opacity:1} }
        @keyframes fm-fade-out       { from{opacity:1}                          to{opacity:0} }
        @keyframes fm-slide-in-left  { from{transform:translateX(100%)}         to{transform:translateX(0)} }
        @keyframes fm-slide-out-left { from{transform:translateX(0)}            to{transform:translateX(-30%)} }
        @keyframes fm-slide-in-right { from{transform:translateX(-100%)}        to{transform:translateX(0)} }
        @keyframes fm-slide-out-right{ from{transform:translateX(0)}            to{transform:translateX(30%)} }
        @keyframes fm-slide-in-up    { from{transform:translateY(100%)}         to{transform:translateY(0)} }
        @keyframes fm-slide-out-up   { from{transform:translateY(0)}            to{transform:translateY(-30%)} }
        @keyframes fm-slide-in-down  { from{transform:translateY(-100%)}        to{transform:translateY(0)} }
        @keyframes fm-slide-out-down { from{transform:translateY(0)}            to{transform:translateY(30%)} }
        @keyframes fm-scale-in       { from{transform:scale(.92);opacity:0}     to{transform:scale(1);opacity:1} }
        @keyframes fm-scale-out      { from{transform:scale(1);opacity:1}       to{transform:scale(.92);opacity:0} }

        .fm-fade-in          { animation: fm-fade-in         ${ANIM_DURATION}ms ease both }
        .fm-fade-out         { animation: fm-fade-out        ${ANIM_DURATION}ms ease both }
        .fm-slide-in-left    { animation: fm-slide-in-left   ${ANIM_DURATION}ms cubic-bezier(.4,0,.2,1) both }
        .fm-slide-out-left   { animation: fm-slide-out-left  ${ANIM_DURATION}ms cubic-bezier(.4,0,.2,1) both }
        .fm-slide-in-right   { animation: fm-slide-in-right  ${ANIM_DURATION}ms cubic-bezier(.4,0,.2,1) both }
        .fm-slide-out-right  { animation: fm-slide-out-right ${ANIM_DURATION}ms cubic-bezier(.4,0,.2,1) both }
        .fm-slide-in-up      { animation: fm-slide-in-up     ${ANIM_DURATION}ms cubic-bezier(.4,0,.2,1) both }
        .fm-slide-out-up     { animation: fm-slide-out-up    ${ANIM_DURATION}ms cubic-bezier(.4,0,.2,1) both }
        .fm-slide-in-down    { animation: fm-slide-in-down   ${ANIM_DURATION}ms cubic-bezier(.4,0,.2,1) both }
        .fm-slide-out-down   { animation: fm-slide-out-down  ${ANIM_DURATION}ms cubic-bezier(.4,0,.2,1) both }
        .fm-scale-in         { animation: fm-scale-in        ${ANIM_DURATION}ms cubic-bezier(.4,0,.2,1) both }
        .fm-scale-out        { animation: fm-scale-out       ${ANIM_DURATION}ms cubic-bezier(.4,0,.2,1) both }

        /* Off-script tap feedback (flowplan gating) */
        @keyframes fm-offscript-pulse { 0%{outline-color:rgba(239,68,68,0)} 30%{outline-color:rgba(239,68,68,.9)} 100%{outline-color:rgba(239,68,68,0)} }
        [data-off-script] { outline: 2px solid rgba(239,68,68,0); outline-offset: 2px; animation: fm-offscript-pulse 300ms ease both; }
        @keyframes fm-toast-in { from{opacity:0;transform:translate(-50%,8px)} to{opacity:1;transform:translate(-50%,0)} }
      `}</style>

      <div
        ref={screenContainerRef}
        className="relative overflow-hidden size-full"
        onClick={handleContainerClick}
        onDoubleClick={handleDoubleClick}
        onMouseOver={handleMouseOver}
        // Sequential mode advances on tap-anywhere — give it a keyboard equivalent.
        {...(!flow.interactions
          ? {
              tabIndex: 0,
              role: 'button' as const,
              'aria-label': 'Flow — press Enter or Arrow Right to advance, Arrow Left to go back',
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
                  e.preventDefault()
                  onAction('next')
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault()
                  onAction('back')
                }
              },
            }
          : {})}
      >
        {/* Active screen wrapped in FlowNavCtx so useFlowNav() works inside */}
        <FlowNavCtx.Provider value={flowNavValue}>
          <PanelErrorBoundary
            key={activeScreenId}
            fallback={
              <div className="flex items-center justify-center text-xs opacity-40 size-full">
                Screen crashed — check the console
              </div>
            }
          >
            <div className={`flex flex-col size-full ${animClass}`}>
              <ScreenComp {...screenProps} />
            </div>
          </PanelErrorBoundary>
        </FlowNavCtx.Provider>

        {/* Hotspot overlay — real buttons so keyboard + screen-reader users can
            trigger them (the click delegation matches on node.id either way). */}
        {hotspots.map(hs => (
          <button
            key={hs.id}
            id={hs.id}
            title={hs.label}
            aria-label={hs.label || `Hotspot ${hs.id}`}
            className="absolute"
            style={{
              left: `${hs.region.x}%`,
              top: `${hs.region.y}%`,
              width: `${hs.region.w}%`,
              height: `${hs.region.h}%`,
              cursor: 'pointer',
              outline: '1.5px dashed rgba(99,102,241,0.35)',
              background: 'rgba(99,102,241,0.04)',
              borderRadius: 4,
              padding: 0,
            }}
          />
        ))}

        {/* Skip button — sequential mode only */}
        {!flow.interactions && !isFirst && !isLast && (
          <button
            onClick={e => {
              e.stopPropagation()
              skipToLast()
            }}
            className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
            }}
          >
            Skip
          </button>
        )}

        {/* Progress dots — sequential mode only */}
        {!flow.interactions && flow.screens.length > 1 && (
          <div
            className="absolute bottom-6 flex justify-center gap-1.5 pointer-events-none inset-x-0"
            role="status"
            aria-live="polite"
            aria-label={`Step ${activeScreenIndex + 1} of ${flow.screens.length}`}
          >
            {flow.screens.map((screen, i) => (
              <div
                key={screen.id}
                className="rounded-full transition-all"
                style={{
                  width: i === activeScreenIndex ? 20 : 6,
                  height: 6,
                  background: i === activeScreenIndex ? theme.text.secondary : theme.bg.border,
                }}
              />
            ))}
          </div>
        )}

        {/* Flowplan: actionNote caption for the current step */}
        {flowplan && currentStep?.actionNote && (
          <div
            className="absolute top-4 left-1/2 z-50 px-3 py-1.5 rounded-full text-xs font-semibold pointer-events-none"
            style={{
              transform: 'translateX(-50%)',
              background: theme.bg.elevated + 'd9',
              color: '#fff',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
            }}
          >
            {currentStep.actionNote}
          </div>
        )}

        {/* Flowplan: off-script toast */}
        {flowplan && offScript && (
          <div
            className="absolute bottom-6 left-1/2 z-50 px-3 py-1.5 rounded-full text-xs font-semibold pointer-events-none"
            style={{
              transform: 'translateX(-50%)',
              background: theme.accent.red + 'eb',
              color: '#fff',
              animation: 'fm-toast-in 150ms ease both',
            }}
            role="status"
            aria-live="polite"
          >
            Outside planned flow
          </div>
        )}
      </div>
    </>
  )
}
