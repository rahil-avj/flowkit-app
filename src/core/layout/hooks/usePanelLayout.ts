import { LS_LEFT_PANEL_OPEN, LS_RIGHT_PANEL_OPEN } from '@platform/shared/constants/storageKeys'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  LEFT_PANEL_DEFAULT,
  LEFT_PANEL_MAX,
  LEFT_PANEL_MIN,
  RAIL_W,
  RIGHT_PANEL_DEFAULT,
  RIGHT_PANEL_MAX,
  RIGHT_PANEL_MIN,
} from '../sidebarConfig'
import { type PanelDragHandle, usePanelDrag } from './usePanelDrag'

export interface PanelLayoutState {
  // ── Drag widths (the expanded size) ──────────────────────────────────────────
  leftW: number
  rightW: number

  // ── Open/closed state — single source of truth ────────────────────────────
  leftOpen: boolean
  rightOpen: boolean
  setLeftOpen: (v: boolean) => void
  setRightOpen: (v: boolean) => void

  // ── Derived effective widths (accounts for open state and fullscreen) ──────
  // These are the values everything must consume. No component should re-derive
  // effectiveLeftW / effectiveRightW independently.
  effectiveLeftW: number
  effectiveRightW: number

  leftHandle: PanelDragHandle
  rightHandle: PanelDragHandle
  /** True while either handle is being dragged. */
  isPanelDragging: boolean
  /** Tracks which side is being dragged; null when idle. */
  dragRef: React.MutableRefObject<{ side: 'left' | 'right' } | null>
}

function readLSNum(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? Number(raw) : fallback
  } catch {
    return fallback
  }
}

function readLSBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === 'true'
  } catch {
    return fallback
  }
}

function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore write failures (private/full storage)
  }
}

export interface PanelLayoutOptions {
  /** localStorage key for the left panel width. */
  storageKeyLeft: string
  /** localStorage key for the right panel width. */
  storageKeyRight: string
  /** Initial left width; falls back to panelConfig default if omitted. */
  initialLeft?: number
  /** Initial right width; falls back to panelConfig default if omitted. */
  initialRight?: number
  /**
   * Whether the whole canvas is in fullscreen mode. When true both effective
   * widths are forced to 0 regardless of open state.
   * Default: false.
   */
  fullscreen?: boolean
}

/**
 * Unified panel layout state — single source of truth for:
 *   - drag widths (leftW / rightW)
 *   - open/closed state (leftOpen / rightOpen)
 *   - derived effective widths (effectiveLeftW / effectiveRightW)
 *
 * Both PreviewCanvas and FlowLens consume this hook (via usePanelResize) so
 * that all geometry is derived once, in one place.
 *
 * effectiveLeftW  = fullscreen ? 0 : leftOpen  ? leftW  : RAIL_W
 * effectiveRightW = fullscreen ? 0 : rightOpen ? rightW : RAIL_W
 *
 * No component outside this hook should recompute effective widths. Every
 * consumer receives them as props or reads them from the returned state.
 */
export function usePanelLayout({
  storageKeyLeft,
  storageKeyRight,
  initialLeft,
  initialRight,
  fullscreen = false,
}: PanelLayoutOptions): PanelLayoutState {
  const [leftW, setLeftW] = useState(() =>
    initialLeft !== undefined ? initialLeft : readLSNum(storageKeyLeft, LEFT_PANEL_DEFAULT)
  )
  const [rightW, setRightW] = useState(() =>
    initialRight !== undefined ? initialRight : readLSNum(storageKeyRight, RIGHT_PANEL_DEFAULT)
  )

  // Open state — persisted, migrates from old child-component keys on first read
  // via fallback: if the new key is absent, read the legacy key so users don't
  // lose their saved state on upgrade.
  const [leftOpen, setLeftOpenState] = useState(() =>
    readLSBool(LS_LEFT_PANEL_OPEN, readLSBool('flowkit:left-panel:open', true))
  )
  const [rightOpen, setRightOpenState] = useState(() =>
    readLSBool(LS_RIGHT_PANEL_OPEN, readLSBool('flowkit:panel:open', false))
  )

  const setLeftOpen = useCallback((v: boolean) => {
    setLeftOpenState(v)
    writeLS(LS_LEFT_PANEL_OPEN, String(v))
  }, [])

  const setRightOpen = useCallback((v: boolean) => {
    setRightOpenState(v)
    writeLS(LS_RIGHT_PANEL_OPEN, String(v))
  }, [])

  // Stable refs so drag closures never go stale when the other side changes.
  const leftWRef = useRef(leftW)
  const rightWRef = useRef(rightW)
  useEffect(() => {
    leftWRef.current = leftW
  }, [leftW])
  useEffect(() => {
    rightWRef.current = rightW
  }, [rightW])

  const onChangeLeft = useCallback((w: number) => {
    setLeftW(w)
  }, [])

  const onChangeRight = useCallback((w: number) => {
    setRightW(w)
  }, [])

  const onCommitLeft = useCallback(
    (w: number) => {
      writeLS(storageKeyLeft, String(w))
      window.dispatchEvent(
        new CustomEvent('flowkit:panel-resize', { detail: { side: 'left', width: w } })
      )
    },
    [storageKeyLeft]
  )

  const onCommitRight = useCallback(
    (w: number) => {
      writeLS(storageKeyRight, String(w))
      window.dispatchEvent(
        new CustomEvent('flowkit:panel-resize', { detail: { side: 'right', width: w } })
      )
    },
    [storageKeyRight]
  )

  // Synchronize drag widths across mode instances (fires on mouseup commit).
  useEffect(() => {
    const handleResize = (e: Event) => {
      const customEvent = e as CustomEvent<{ side: 'left' | 'right'; width: number }>
      if (customEvent.detail.side === 'left') {
        setLeftW(customEvent.detail.width)
      } else {
        setRightW(customEvent.detail.width)
      }
    }
    window.addEventListener('flowkit:panel-resize', handleResize)
    return () => window.removeEventListener('flowkit:panel-resize', handleResize)
  }, [])

  const leftHandle = usePanelDrag(
    'left',
    () => leftWRef.current,
    LEFT_PANEL_MIN,
    LEFT_PANEL_MAX,
    onChangeLeft,
    onCommitLeft
  )

  const rightHandle = usePanelDrag(
    'right',
    () => rightWRef.current,
    RIGHT_PANEL_MIN,
    RIGHT_PANEL_MAX,
    onChangeRight,
    onCommitRight
  )

  const isPanelDragging = leftHandle.handleActive === 'drag' || rightHandle.handleActive === 'drag'

  useEffect(() => {
    if (isPanelDragging) {
      document.body.setAttribute('data-panel-drag', '')
    } else {
      document.body.removeAttribute('data-panel-drag')
    }
  }, [isPanelDragging])

  const dragRef = useRef<{ side: 'left' | 'right' } | null>(null)
  useEffect(() => {
    if (leftHandle.handleActive === 'drag') dragRef.current = { side: 'left' }
    else if (rightHandle.handleActive === 'drag') dragRef.current = { side: 'right' }
    else dragRef.current = null
  }, [leftHandle.handleActive, rightHandle.handleActive])

  // ── Derived effective widths — the canonical computation, exists only here ──
  const effectiveLeftW = fullscreen ? 0 : leftOpen ? leftW : RAIL_W
  const effectiveRightW = fullscreen ? 0 : rightOpen ? rightW : RAIL_W

  return {
    leftW,
    rightW,
    leftOpen,
    rightOpen,
    setLeftOpen,
    setRightOpen,
    effectiveLeftW,
    effectiveRightW,
    leftHandle,
    rightHandle,
    isPanelDragging,
    dragRef,
  }
}
