import { useSessionRecorderOptional } from '@platform/features/flowTracer/context'
import { TransitionLogEntry, useDashboard } from '@platform/shared/contexts/DashboardContext'
import type {
  FlowConfig,
  InteractionCtx,
  InteractionRule,
  TransitionAnimation,
} from '@platform/types/index'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ─── Animation maps (shared with FlowMaster renderer) ─────────────────────────

export const ANIM_DURATION = 280

export const ANIM_CLASSES: Record<TransitionAnimation, { enter: string; exit: string }> = {
  none: { enter: '', exit: '' },
  fade: { enter: 'fm-fade-in', exit: 'fm-fade-out' },
  'slide-left': { enter: 'fm-slide-in-left', exit: 'fm-slide-out-left' },
  'slide-right': { enter: 'fm-slide-in-right', exit: 'fm-slide-out-right' },
  'slide-up': { enter: 'fm-slide-in-up', exit: 'fm-slide-out-up' },
  'slide-down': { enter: 'fm-slide-in-down', exit: 'fm-slide-out-down' },
  scale: { enter: 'fm-scale-in', exit: 'fm-scale-out' },
}

export const BACK_ANIM: Partial<Record<TransitionAnimation, TransitionAnimation>> = {
  'slide-left': 'slide-right',
  'slide-right': 'slide-left',
  'slide-up': 'slide-down',
  'slide-down': 'slide-up',
}

// ─── Engine return type ───────────────────────────────────────────────────────

export interface FlowEngineReturn {
  // State
  activeScreenIndex: number
  activeScreen: FlowConfig['screens'][number] | undefined
  activeScreenId: string // T5: tags cursor.sample events
  history: string[]
  localState: Record<string, unknown>
  transitionLog: TransitionLogEntry[]
  effects: string[]
  animClass: string
  isAutoPlayPaused: boolean
  isAllowed: boolean
  autoPlay: (FlowConfig['autoPlay'] & Record<string, unknown>) | null

  // Refs — stable identity across renders
  screenContainerRef: React.RefObject<HTMLDivElement | null> // T5: cursor listener attachment

  // Dispatch — stable, instrumented by name (T5 wires by function name, not line number)
  resetEngine: () => void
  commitNavigation: (
    target: string,
    animation: TransitionAnimation,
    timestamp: string,
    actionName: string,
    warnings: string[]
  ) => void
  fireRule: (rule: InteractionRule, elementId: string, triggerName: string) => void
  buildCtx: () => InteractionCtx
  getRulesFor: (elementId: string, trigger: string) => InteractionRule[]
  onAction: (actionName: string) => void
  skipToLast: () => void
  setIsAutoPlayPaused: (v: boolean) => void
  navigateToScreen: (
    nextIdx: number,
    logEntry: TransitionLogEntry,
    animation?: TransitionAnimation
  ) => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFlowEngine(flow: FlowConfig): FlowEngineReturn {
  const {
    db,
    updateDb,
    navigateTo,
    firstViewId,
    setActiveFlowDebugInfo,
    flowAutoPlayOverride,
    flowAutoPlayPaused,
    setFlowAutoPlayPaused,
  } = useDashboard()
  const recorderCtx = useSessionRecorderOptional()
  const recorderRef = useRef(recorderCtx)
  useEffect(() => {
    recorderRef.current = recorderCtx
  })
  const recorder = recorderRef

  // ─── Screen lookup ────────────────────────────────────────────────────────
  const findScreenIndex = useCallback(
    (idOrLabel: string) => flow.screens.findIndex(s => s.id === idOrLabel || s.label === idOrLabel),
    [flow.screens]
  )

  const initialScreenName =
    flow.initialScreen || flow.screens[0]?.id || flow.screens[0]?.label || ''
  const initialIndex = findScreenIndex(initialScreenName)

  // ─── State ────────────────────────────────────────────────────────────────
  const [activeScreenIndex, setActiveScreenIndex] = useState(initialIndex !== -1 ? initialIndex : 0)
  const [history, setHistory] = useState<string[]>([initialScreenName])
  const screenEntryTimeRef = useRef<number>(0)
  const [localState, setLocalState] = useState<Record<string, unknown>>({})
  const [transitionLog, setTransitionLog] = useState<TransitionLogEntry[]>([])
  const [effects, setEffects] = useState<string[]>([])
  const [animClass, setAnimClass] = useState('')

  const isAutoPlayPaused = flowAutoPlayPaused
  const setIsAutoPlayPaused = setFlowAutoPlayPaused

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delayTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const screenContainerRef = useRef<HTMLDivElement | null>(null)
  const prevFlowIdRef = useRef(flow.id)

  // ─── Merged auto-play config (runtime override wins) ──────────────────────
  const autoPlay = useMemo(() => {
    if (!flow.autoPlay && !flowAutoPlayOverride) return null
    return { ...flow.autoPlay, ...flowAutoPlayOverride } as FlowEngineReturn['autoPlay']
  }, [flow.autoPlay, flowAutoPlayOverride])

  // ─── Flow-level entry guard ───────────────────────────────────────────────
  const isAllowed = useMemo(() => {
    if (flow.canNotEnter && flow.canNotEnter({ db })) return false
    if (flow.canEnter && !flow.canEnter({ db })) return false
    return true
    // flow omitted — only the guard functions and db drive re-evaluation; adding
    // the whole flow object would re-run on every unrelated flow prop change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.canNotEnter, flow.canEnter, db])

  useEffect(() => {
    if (!isAllowed) {
      recorder.current?.logEvent('flow.blocked', { flowId: flow.id })
      navigateTo(flow.canEnterFallback || firstViewId || 'home')
    } else {
      screenEntryTimeRef.current = performance.now()
      recorder.current?.logEvent('flow.entered', { flowId: flow.id, label: flow.label })
    }
    // Stable refs (recorder, navigateTo, flow.id) intentionally omitted — only
    // the guard result should trigger entry/redirect logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed])

  // ─── Sync debugger ────────────────────────────────────────────────────────
  const activeScreen = flow.screens[activeScreenIndex]
  const activeScreenId = activeScreen?.id ?? activeScreen?.label ?? ''
  const activeScreenLabel = activeScreenId

  useEffect(() => {
    if (!isAllowed) return
    const historyList = history.map(h => {
      const idx = findScreenIndex(h)
      return idx !== -1 ? flow.screens[idx].id || flow.screens[idx].label : h
    })
    setActiveFlowDebugInfo({ history: historyList, state: localState, transitionLog, effects })
  }, [
    isAllowed,
    history,
    localState,
    transitionLog,
    effects,
    setActiveFlowDebugInfo,
    findScreenIndex,
    flow.screens,
  ])

  useEffect(
    () => () => {
      setActiveFlowDebugInfo(null)
    },
    [setActiveFlowDebugInfo]
  )

  // ─── Screen-level entry guard ─────────────────────────────────────────────
  const screenPassesGuard = useCallback(
    (idx: number): boolean => {
      const screen = flow.screens[idx]
      if (!screen?.meta) return true
      if (screen.meta.canNotEnter && screen.meta.canNotEnter({ db })) return false
      if (screen.meta.canEnter && !screen.meta.canEnter({ db })) return false
      return true
    },
    [flow.screens, db]
  )

  // ─── Animated screen transition ───────────────────────────────────────────
  const navigateToScreen = useCallback(
    (
      nextIdx: number,
      logEntry: TransitionLogEntry,
      animation: TransitionAnimation = 'none',
      historyMode: 'push' | 'pop' = 'push'
    ) => {
      const commit = () => {
        const s = flow.screens[nextIdx]
        const name = s.id || s.label
        // Emit dwell-end for the screen we're leaving
        const dwell = performance.now() - screenEntryTimeRef.current
        recorder.current?.logEvent('screen.dwell-end', {
          screenId: logEntry.fromScreen,
          dwellMs: Math.round(dwell),
          flowId: flow.id,
        })
        screenEntryTimeRef.current = performance.now()
        setActiveScreenIndex(nextIdx)
        // "push" appends the new screen; "pop" (back nav) drops the current tail
        // so history shrinks instead of duplicating the target.
        setHistory(h => (historyMode === 'pop' ? h.slice(0, -1) : [...h, name]))
        setTransitionLog(prev => [...prev, { ...logEntry, toScreen: name }])
        recorder.current?.logEvent('screen.visited', {
          screenId: name,
          flowId: flow.id,
          from: logEntry.fromScreen,
          action: logEntry.action,
        })
      }

      if (animation === 'none') {
        commit()
        return
      }

      const { exit, enter } = ANIM_CLASSES[animation]
      setAnimClass(exit)
      // Cancel any in-flight transition (exit-phase and enter-clear are tracked
      // in separate refs so a fast re-navigation doesn't lose track of either).
      if (animTimerRef.current) clearTimeout(animTimerRef.current)
      if (animEndTimerRef.current) clearTimeout(animEndTimerRef.current)

      animTimerRef.current = setTimeout(() => {
        setAnimClass(enter)
        commit()
        animEndTimerRef.current = setTimeout(() => setAnimClass(''), ANIM_DURATION)
      }, ANIM_DURATION)
    },
    // State setters and recorder ref are stable; flow.id is structurally stable
    // per flow instance. Only flow.screens drives screen-lookup re-computation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flow.screens]
  )

  // ─── Build InteractionCtx ─────────────────────────────────────────────────
  const buildCtx = useCallback(
    (): InteractionCtx => ({
      activeScreenId,
      history,
      flowState: localState,
      get: key => localState[key],
      set: (key, value) => setLocalState(prev => ({ ...prev, [key]: value })),
      db,
      updateDb,
      effect: name => setEffects(prev => [...prev, name]),
    }),
    [activeScreenId, history, localState, db, updateDb]
  )

  // ─── Core navigation commit ───────────────────────────────────────────────
  const commitNavigation = useCallback(
    (
      target: string,
      animation: TransitionAnimation,
      timestamp: string,
      actionName: string,
      warnings: string[]
    ) => {
      if (target === '__state__') return

      if (target === '__complete__') {
        setTransitionLog(prev => [
          ...prev,
          {
            timestamp,
            action: actionName,
            fromScreen: activeScreenLabel,
            toScreen: '[Flow Completed]',
            warnings,
          },
        ])
        recorder.current?.logEvent('flow.completed', {
          flowId: flow.id,
          fromScreen: activeScreenLabel,
        })
        if (flow.onComplete) flow.onComplete(navigateTo)
        else navigateTo(firstViewId || 'home')
        return
      }
      if (target === 'next') {
        let nextIndex = activeScreenIndex + 1
        while (nextIndex < flow.screens.length && !screenPassesGuard(nextIndex)) nextIndex++
        if (nextIndex >= flow.screens.length) {
          setTransitionLog(prev => [
            ...prev,
            {
              timestamp,
              action: actionName,
              fromScreen: activeScreenLabel,
              toScreen: '[Flow Completed]',
              warnings,
            },
          ])
          if (flow.onComplete) flow.onComplete(navigateTo)
          else navigateTo(firstViewId || 'home')
        } else {
          navigateToScreen(
            nextIndex,
            {
              timestamp,
              action: actionName,
              fromScreen: activeScreenLabel,
              toScreen: '',
              warnings,
            },
            animation
          )
        }
        return
      }
      if (target === 'back') {
        if (history.length > 1) {
          const prevName = history[history.length - 2]
          const prevIdx = findScreenIndex(prevName)
          if (prevIdx !== -1) {
            const backAnim = BACK_ANIM[animation] ?? animation
            // historyMode "pop" — navigateToScreen drops the current tail so we
            // land on prevName with history shrunk (no duplicate append).
            navigateToScreen(
              prevIdx,
              {
                timestamp,
                action: actionName,
                fromScreen: activeScreenLabel,
                toScreen: prevName,
                warnings,
              },
              backAnim,
              'pop'
            )
            return
          }
        }
        navigateTo(firstViewId || 'home')
        return
      }

      const nextIdx = findScreenIndex(target)
      if (nextIdx === -1) {
        setTransitionLog(prev => [
          ...prev,
          {
            timestamp,
            action: actionName,
            fromScreen: activeScreenLabel,
            toScreen: `[External: ${target}]`,
            warnings,
          },
        ])
        recorder.current?.logEvent('flow.exited-early', {
          flowId: flow.id,
          fromScreen: activeScreenLabel,
          to: target,
        })
        navigateTo(target)
        return
      }
      if (nextIdx === activeScreenIndex) {
        setTransitionLog(prev => [
          ...prev,
          {
            timestamp,
            action: actionName,
            fromScreen: activeScreenLabel,
            toScreen: `${target} (state updated)`,
            warnings,
          },
        ])
        return
      }
      if (!screenPassesGuard(nextIdx)) {
        warnings.push(`Navigation to "${target}" blocked — screen guard denied.`)
        setTransitionLog(prev => [
          ...prev,
          {
            timestamp,
            action: actionName,
            fromScreen: activeScreenLabel,
            toScreen: `[Blocked: ${target}]`,
            warnings,
          },
        ])
        recorder.current?.logEvent('screen.blocked', {
          screenId: target,
          flowId: flow.id,
          fromScreen: activeScreenLabel,
        })
        recorder.current?.logEvent('flow.transition', {
          flowId: flow.id,
          action: actionName,
          from: activeScreenLabel,
          to: target,
          blocked: true,
          warnings,
        })
        return
      }

      const resolvedAnim =
        animation !== 'none' ? animation : (flow.screens[nextIdx].enterAnimation ?? 'none')
      navigateToScreen(
        nextIdx,
        { timestamp, action: actionName, fromScreen: activeScreenLabel, toScreen: '', warnings },
        resolvedAnim
      )
    },
    // recorder.current and setTransitionLog are stable refs/setters and correctly
    // omitted. All varying state is captured in the dep list below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeScreenLabel,
      activeScreenIndex,
      flow,
      history,
      firstViewId,
      findScreenIndex,
      navigateTo,
      navigateToScreen,
      screenPassesGuard,
    ]
  )

  // ─── Fire an interaction rule ─────────────────────────────────────────────
  const fireRule = useCallback(
    (rule: InteractionRule, elementId: string, triggerName: string) => {
      const timestamp = new Date().toLocaleTimeString()
      const warnings: string[] = []
      const ctx = buildCtx()

      // Resolve nearest data-fk-id ancestor if present
      const domEl = document.getElementById(elementId)
      let fkId: string | null = null
      let walker: HTMLElement | null = domEl
      while (walker) {
        if (walker.dataset.fkId) {
          fkId = walker.dataset.fkId
          break
        }
        walker = walker.parentElement
      }

      recorder.current?.logEvent('interaction.tap', {
        elementId,
        trigger: triggerName,
        screenId: activeScreenId,
        flowId: flow.id,
        ...(fkId ? { fkId } : {}),
      })

      if (rule.do) {
        try {
          rule.do(ctx)
          recorder.current?.logEvent('interaction.effect', {
            elementId,
            screenId: activeScreenId,
            flowId: flow.id,
          })
        } catch (e: unknown) {
          warnings.push(
            `do() error on "${elementId}": ${e instanceof Error ? e.message : String(e)}`
          )
        }
      }

      if (!rule.goTo) {
        if (rule.do) {
          setTransitionLog(prev => [
            ...prev,
            {
              timestamp,
              action: `${triggerName} → ${elementId}`,
              fromScreen: activeScreenLabel,
              toScreen: activeScreenLabel + ' (state updated)',
              warnings,
            },
          ])
        }
        return
      }

      let target: string
      if (typeof rule.goTo === 'function') {
        try {
          target = rule.goTo({ db: ctx.db, flowState: ctx.flowState })
        } catch (e: unknown) {
          warnings.push(
            `goTo() resolver error on "${elementId}": ${e instanceof Error ? e.message : String(e)}`
          )
          setTransitionLog(prev => [
            ...prev,
            {
              timestamp,
              action: `${triggerName} → ${elementId}`,
              fromScreen: activeScreenLabel,
              toScreen: activeScreenLabel,
              warnings,
            },
          ])
          return
        }
      } else {
        target = rule.goTo
      }

      // Surface rule-level errors (do()/goTo() exceptions) to FlowLens so a
      // replay shows WHY a tap misbehaved, not just that it happened.
      if (warnings.length > 0) {
        recorder.current?.logEvent('flow.transition', {
          flowId: flow.id,
          action: `${triggerName} → ${elementId}`,
          from: activeScreenLabel,
          to: target,
          error: true,
          warnings,
        })
      }

      const animation = rule.animation ?? 'none'
      const delay = rule.delay ?? 0
      const commit = () =>
        commitNavigation(target, animation, timestamp, `${triggerName} → ${elementId}`, warnings)
      if (delay > 0) {
        // Tracked so unmount cleanup cancels it — otherwise a delayed nav fires
        // after the flow is gone (setState/navigateTo on an unmounted tree).
        const t = setTimeout(() => {
          delayTimersRef.current.delete(t)
          commit()
        }, delay)
        delayTimersRef.current.add(t)
      } else commit()
    },
    // flow.interactions and delayTimersRef are accessed via buildCtx / stable ref —
    // both are correctly omitted. activeScreenLabel and commitNavigation are the
    // only values that meaningfully change the callback's behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildCtx, activeScreenLabel, commitNavigation]
  )

  // ─── Look up interaction rules for an element id ──────────────────────────
  const getRulesFor = useCallback(
    (elementId: string, trigger: string): InteractionRule[] => {
      const entry = flow.interactions?.[elementId]
      if (!entry) return []
      const rules = Array.isArray(entry) ? entry : [entry]
      return rules.filter(r => (r.trigger ?? 'tap') === trigger)
    },
    [flow.interactions]
  )

  // ─── onAction (escape hatch for programmatic triggers) ────────────────────
  const onAction = useCallback(
    (actionName: string) => {
      const timestamp = new Date().toLocaleTimeString()
      const entry = flow.interactions?.[actionName]
      if (entry) {
        const rules = Array.isArray(entry) ? entry : [entry]
        rules.forEach(r => fireRule(r, actionName, 'tap'))
        return
      }
      commitNavigation(actionName, 'none', timestamp, actionName, [])
    },
    [flow.interactions, fireRule, commitNavigation]
  )

  // ─── Per-screen auto-advance ──────────────────────────────────────────────
  useEffect(() => {
    // Auto-play owns advancing when enabled — don't let auto-advance also fire,
    // or both timers race and a screen gets skipped.
    if (autoPlay?.enabled && !isAutoPlayPaused) return
    const delay = activeScreen?.autoAdvanceDelay ?? flow.autoAdvanceDelay
    if (delay === undefined) return
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    autoTimerRef.current = setTimeout(() => {
      const timestamp = new Date().toLocaleTimeString()
      recorder.current?.logEvent('navigation.auto-advance', {
        screenId: activeScreenId,
        delayMs: delay,
        flowId: flow.id,
      })
      commitNavigation('next', 'none', timestamp, `auto-advance (${delay}ms)`, [])
    }, delay)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
    // activeScreenId is derived from activeScreenIndex + activeScreen (already in
    // deps), so adding it would be redundant. recorder.current is a stable ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeScreenIndex,
    activeScreen,
    flow.autoAdvanceDelay,
    flow.id,
    commitNavigation,
    autoPlay,
    isAutoPlayPaused,
  ])

  // ─── Auto-play mode ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoPlay?.enabled || isAutoPlayPaused) return
    const delay = (autoPlay.delay as number | undefined) ?? 2000
    const animation = ((autoPlay.animation as string | undefined) ?? 'fade') as TransitionAnimation

    const timer = setTimeout(() => {
      const timestamp = new Date().toLocaleTimeString()
      if (activeScreenIndex >= flow.screens.length - 1) {
        if (autoPlay.loop) {
          navigateToScreen(
            0,
            {
              timestamp,
              action: 'auto-play',
              fromScreen: activeScreenLabel,
              toScreen: '',
              warnings: [],
            },
            animation
          )
        } else {
          if (flow.onComplete) flow.onComplete(navigateTo)
          else navigateTo(firstViewId || 'home')
        }
      } else {
        commitNavigation('next', animation, timestamp, 'auto-play', [])
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [
    activeScreenIndex,
    autoPlay,
    isAutoPlayPaused,
    flow,
    activeScreenLabel,
    navigateTo,
    firstViewId,
    commitNavigation,
    navigateToScreen,
  ])

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(
    () => () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
      if (animTimerRef.current) clearTimeout(animTimerRef.current)
      if (animEndTimerRef.current) clearTimeout(animEndTimerRef.current)
      delayTimersRef.current.forEach(t => clearTimeout(t))
      delayTimersRef.current.clear()
    },
    []
  )

  // ─── Engine reset (called by FlowMaster on flowplan restart) ─────────────
  const resetEngine = useCallback(() => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    if (animTimerRef.current) clearTimeout(animTimerRef.current)
    if (animEndTimerRef.current) clearTimeout(animEndTimerRef.current)
    delayTimersRef.current.forEach(t => clearTimeout(t))
    delayTimersRef.current.clear()
    setActiveScreenIndex(initialIndex !== -1 ? initialIndex : 0)
    setHistory([initialScreenName])
    setLocalState({})
    setTransitionLog([])
    setEffects([])
    setAnimClass('')
  }, [initialIndex, initialScreenName])

  // Reset engine when the active flow changes — skip mount since state is already at initial values.
  useEffect(() => {
    if (prevFlowIdRef.current === flow.id) return
    prevFlowIdRef.current = flow.id
    resetEngine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.id])

  // ─── Skip to last (debug) ─────────────────────────────────────────────────
  const skipToLast = useCallback(() => {
    ;[autoTimerRef, animTimerRef, animEndTimerRef].forEach(r => {
      if (r.current) clearTimeout(r.current)
    })
    const last = flow.screens[flow.screens.length - 1]
    setAnimClass('')
    setActiveScreenIndex(flow.screens.length - 1)
    setHistory(h => [...h, last.id || last.label])
  }, [flow.screens])

  return {
    activeScreenIndex,
    activeScreen,
    activeScreenId,
    history,
    localState,
    transitionLog,
    effects,
    animClass,
    isAutoPlayPaused,
    isAllowed,
    autoPlay,
    screenContainerRef,
    resetEngine,
    commitNavigation,
    fireRule,
    buildCtx,
    getRulesFor,
    onAction,
    skipToLast,
    setIsAutoPlayPaused,
    navigateToScreen,
  }
}
