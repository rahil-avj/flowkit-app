/* @vitest-environment jsdom */
import type { CanvasState } from '@core/canvas/canvasReducer'
import { canvasReducer, makeInitialState } from '@core/canvas/canvasReducer'
import { beforeEach, describe, expect, it } from 'vitest'

// ─── Constants (mirror of canvasConfig.ts + sidebarConfig.ts) ─────────────────
const ZOOM_MIN = 0.25
const ZOOM_MAX = 5
const ZOOM_STEP = 0.1
const FIT_TARGET_W = 0.9
const FIT_TARGET_H = 0.8
const CANVAS_W = 2000
const CANVAS_H = 2000
const CANVAS_DEVICE_MARGIN = 0.95
const LS_KEEP_FIT = 'flowkit:keepFit'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function baseState(overrides?: Partial<CanvasState>): CanvasState {
  return {
    visibleW: 1200,
    visibleH: 800,
    fitScale: 0.5,
    keepFit: true,
    fullscreen: false,
    zoomByType: {},
    scale: 0.5,
    scrollCenterCount: 0,
    ...overrides,
  }
}

const MOBILE = { deviceType: 'mobile', deviceW: 390, deviceH: 844 }
const _TABLET = { deviceType: 'tablet', deviceW: 768, deviceH: 1024 }

function expectedFitScale(visibleW: number, visibleH: number, deviceW: number, deviceH: number) {
  const sx = (visibleW * FIT_TARGET_W) / deviceW
  const sy = (visibleH * FIT_TARGET_H) / deviceH
  const cx = (CANVAS_W * CANVAS_DEVICE_MARGIN) / deviceW
  const cy = (CANVAS_H * CANVAS_DEVICE_MARGIN) / deviceH
  return parseFloat(Math.min(1, sx, sy, cx, cy).toFixed(3))
}

function expectedSafeMax(deviceW: number, deviceH: number) {
  const mx = (CANVAS_W * CANVAS_DEVICE_MARGIN) / deviceW
  const my = (CANVAS_H * CANVAS_DEVICE_MARGIN) / deviceH
  return parseFloat(Math.min(ZOOM_MAX, mx, my).toFixed(3))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('canvasReducer', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ── MEASURED ────────────────────────────────────────────────────────────────

  it('M1. MEASURED updates visibleW and visibleH', () => {
    const state = baseState({ keepFit: false })
    const result = canvasReducer(state, {
      type: 'MEASURED',
      visibleW: 1000,
      visibleH: 700,
      ...MOBILE,
    })
    expect(result.visibleW).toBe(1000)
    expect(result.visibleH).toBe(700)
  })

  it('M2. MEASURED recomputes fitScale from visible and device dimensions', () => {
    const state = baseState({ keepFit: false })
    const result = canvasReducer(state, {
      type: 'MEASURED',
      visibleW: 1000,
      visibleH: 700,
      ...MOBILE,
    })
    expect(result.fitScale).toBe(expectedFitScale(1000, 700, 390, 844))
  })

  it('M3. MEASURED increments scrollCenterCount when keepFit=true', () => {
    const state = baseState({ keepFit: true, scrollCenterCount: 2 })
    const result = canvasReducer(state, {
      type: 'MEASURED',
      visibleW: 1000,
      visibleH: 700,
      ...MOBILE,
    })
    expect(result.scrollCenterCount).toBe(3)
  })

  it('M4. MEASURED does NOT increment scrollCenterCount when keepFit=false', () => {
    const state = baseState({ keepFit: false, scrollCenterCount: 2 })
    const result = canvasReducer(state, {
      type: 'MEASURED',
      visibleW: 1000,
      visibleH: 700,
      ...MOBILE,
    })
    expect(result.scrollCenterCount).toBe(2)
  })

  it('M5. MEASURED: scale === fitScale when keepFit=true and no user zoom', () => {
    const state = baseState({ keepFit: true, zoomByType: {} })
    const result = canvasReducer(state, {
      type: 'MEASURED',
      visibleW: 1000,
      visibleH: 700,
      ...MOBILE,
    })
    expect(result.scale).toBe(result.fitScale)
  })

  it('M6. MEASURED: scale === zoomByType[deviceType] when keepFit=false and zoom is set', () => {
    const state = baseState({ keepFit: false, zoomByType: { mobile: 1.5 } })
    const result = canvasReducer(state, {
      type: 'MEASURED',
      visibleW: 1000,
      visibleH: 700,
      ...MOBILE,
    })
    expect(result.scale).toBe(1.5)
  })

  // ── TOGGLE_KEEP_FIT ─────────────────────────────────────────────────────────

  it('TKF1. ON→OFF: locks fitScale into zoomByType[deviceType]', () => {
    const state = baseState({ keepFit: true, fitScale: 0.42 })
    const result = canvasReducer(state, {
      type: 'TOGGLE_KEEP_FIT',
      visibleW: 1200,
      visibleH: 800,
      ...MOBILE,
    })
    expect(result.zoomByType['mobile']).toBe(0.42)
  })

  it('TKF2. ON→OFF: sets keepFit=false', () => {
    const state = baseState({ keepFit: true })
    const result = canvasReducer(state, {
      type: 'TOGGLE_KEEP_FIT',
      visibleW: 1200,
      visibleH: 800,
      ...MOBILE,
    })
    expect(result.keepFit).toBe(false)
  })

  it('TKF3. ON→OFF: does NOT increment scrollCenterCount', () => {
    const state = baseState({ keepFit: true, scrollCenterCount: 5 })
    const result = canvasReducer(state, {
      type: 'TOGGLE_KEEP_FIT',
      visibleW: 1200,
      visibleH: 800,
      ...MOBILE,
    })
    expect(result.scrollCenterCount).toBe(5)
  })

  it('TKF4. ON→OFF: writes "false" to localStorage', () => {
    const state = baseState({ keepFit: true })
    canvasReducer(state, {
      type: 'TOGGLE_KEEP_FIT',
      visibleW: 1200,
      visibleH: 800,
      ...MOBILE,
    })
    expect(localStorage.getItem(LS_KEEP_FIT)).toBe('false')
  })

  it('TKF5. OFF→ON: sets keepFit=true', () => {
    const state = baseState({ keepFit: false })
    const result = canvasReducer(state, {
      type: 'TOGGLE_KEEP_FIT',
      visibleW: 1200,
      visibleH: 800,
      ...MOBILE,
    })
    expect(result.keepFit).toBe(true)
  })

  it('TKF6. OFF→ON: clears zoomByType[deviceType] to null', () => {
    const state = baseState({ keepFit: false, zoomByType: { mobile: 1.8 } })
    const result = canvasReducer(state, {
      type: 'TOGGLE_KEEP_FIT',
      visibleW: 1200,
      visibleH: 800,
      ...MOBILE,
    })
    expect(result.zoomByType['mobile']).toBeNull()
  })

  it('TKF7. OFF→ON: increments scrollCenterCount', () => {
    const state = baseState({ keepFit: false, scrollCenterCount: 3 })
    const result = canvasReducer(state, {
      type: 'TOGGLE_KEEP_FIT',
      visibleW: 1200,
      visibleH: 800,
      ...MOBILE,
    })
    expect(result.scrollCenterCount).toBe(4)
  })

  it('TKF8. OFF→ON: scale === fitScale after toggle', () => {
    const state = baseState({ keepFit: false, zoomByType: { mobile: 1.8 } })
    const result = canvasReducer(state, {
      type: 'TOGGLE_KEEP_FIT',
      visibleW: 1200,
      visibleH: 800,
      ...MOBILE,
    })
    expect(result.scale).toBe(result.fitScale)
  })

  it('TKF9. OFF→ON: fitScale recalculated from action visibleW/H, not state visibleW/H', () => {
    const state = baseState({ keepFit: false, visibleW: 900, visibleH: 600 })
    const result = canvasReducer(state, {
      type: 'TOGGLE_KEEP_FIT',
      visibleW: 1400,
      visibleH: 900,
      ...MOBILE,
    })
    expect(result.fitScale).toBe(expectedFitScale(1400, 900, 390, 844))
    expect(result.fitScale).not.toBe(expectedFitScale(900, 600, 390, 844))
  })

  // ── BREAK_KEEP_FIT ──────────────────────────────────────────────────────────

  it('BKF1. no-op when keepFit is already false — returns same state reference', () => {
    const state = baseState({ keepFit: false })
    const result = canvasReducer(state, { type: 'BREAK_KEEP_FIT', ...MOBILE })
    expect(result).toBe(state)
  })

  it('BKF2. sets keepFit=false when currently true', () => {
    const state = baseState({ keepFit: true })
    const result = canvasReducer(state, { type: 'BREAK_KEEP_FIT', ...MOBILE })
    expect(result.keepFit).toBe(false)
  })

  it('BKF3. falls back to fitScale when no prior zoom for device', () => {
    const state = baseState({ keepFit: true, fitScale: 0.55, zoomByType: {} })
    const result = canvasReducer(state, { type: 'BREAK_KEEP_FIT', ...MOBILE })
    expect(result.zoomByType['mobile']).toBe(0.55)
  })

  it('BKF4. preserves existing zoomByType[deviceType] when already set', () => {
    const state = baseState({ keepFit: true, fitScale: 0.55, zoomByType: { mobile: 1.2 } })
    const result = canvasReducer(state, { type: 'BREAK_KEEP_FIT', ...MOBILE })
    expect(result.zoomByType['mobile']).toBe(1.2)
  })

  // ── TOGGLE_FULLSCREEN ───────────────────────────────────────────────────────

  it('FS1. TOGGLE_FULLSCREEN flips false → true', () => {
    const state = baseState({ fullscreen: false })
    const result = canvasReducer(state, { type: 'TOGGLE_FULLSCREEN' })
    expect(result.fullscreen).toBe(true)
  })

  it('FS2. TOGGLE_FULLSCREEN flips true → false', () => {
    const state = baseState({ fullscreen: true })
    const result = canvasReducer(state, { type: 'TOGGLE_FULLSCREEN' })
    expect(result.fullscreen).toBe(false)
  })

  it('FS3. TOGGLE_FULLSCREEN does NOT change fitScale or scrollCenterCount', () => {
    const state = baseState({ fullscreen: false, fitScale: 0.42, scrollCenterCount: 7 })
    const result = canvasReducer(state, { type: 'TOGGLE_FULLSCREEN' })
    expect(result.fitScale).toBe(0.42)
    expect(result.scrollCenterCount).toBe(7)
  })

  // ── ZOOM_IN / ZOOM_OUT ──────────────────────────────────────────────────────

  it('ZI1. ZOOM_IN increments scale by ZOOM_STEP (rounded to 2dp)', () => {
    const state = baseState({ keepFit: false, zoomByType: { mobile: 0.5 }, scale: 0.5 })
    const result = canvasReducer(state, { type: 'ZOOM_IN', ...MOBILE })
    expect(result.scale).toBeCloseTo(0.5 + ZOOM_STEP, 2)
    expect(result.zoomByType['mobile']).toBe(parseFloat((0.5 + ZOOM_STEP).toFixed(2)))
  })

  it('ZI2. ZOOM_IN clamps at ZOOM_MAX', () => {
    const safeMax = expectedSafeMax(MOBILE.deviceW, MOBILE.deviceH)
    const state = baseState({ keepFit: false, zoomByType: { mobile: safeMax }, scale: safeMax })
    const result = canvasReducer(state, { type: 'ZOOM_IN', ...MOBILE })
    expect(result.scale).toBeLessThanOrEqual(safeMax)
  })

  it('ZO1. ZOOM_OUT decrements scale by ZOOM_STEP', () => {
    const state = baseState({ keepFit: false, zoomByType: { mobile: 0.5 }, scale: 0.5 })
    const result = canvasReducer(state, { type: 'ZOOM_OUT', ...MOBILE })
    expect(result.scale).toBeCloseTo(0.5 - ZOOM_STEP, 2)
    expect(result.zoomByType['mobile']).toBe(parseFloat((0.5 - ZOOM_STEP).toFixed(2)))
  })

  it('ZO2. ZOOM_OUT clamps at ZOOM_MIN', () => {
    const state = baseState({ keepFit: false, zoomByType: { mobile: ZOOM_MIN }, scale: ZOOM_MIN })
    const result = canvasReducer(state, { type: 'ZOOM_OUT', ...MOBILE })
    expect(result.scale).toBe(ZOOM_MIN)
    expect(result.zoomByType['mobile']).toBe(ZOOM_MIN)
  })

  it('ZI3. ZOOM_IN on mobile does NOT affect tablet zoom', () => {
    const state = baseState({
      keepFit: false,
      zoomByType: { mobile: 0.5, tablet: 1.0 },
      scale: 0.5,
    })
    const result = canvasReducer(state, { type: 'ZOOM_IN', ...MOBILE })
    expect(result.zoomByType['tablet']).toBe(1.0)
  })

  // ── SET_ZOOM ────────────────────────────────────────────────────────────────

  it('SZ1. SET_ZOOM clamps below ZOOM_MIN to ZOOM_MIN', () => {
    const state = baseState({ keepFit: false })
    const result = canvasReducer(state, { type: 'SET_ZOOM', zoom: 0.1, ...MOBILE })
    expect(result.zoomByType['mobile']).toBe(ZOOM_MIN)
    expect(result.scale).toBe(ZOOM_MIN)
  })

  it('SZ2. SET_ZOOM clamps above canvasSafeMax to safeMax', () => {
    const safeMax = expectedSafeMax(MOBILE.deviceW, MOBILE.deviceH)
    const state = baseState({ keepFit: false })
    const result = canvasReducer(state, { type: 'SET_ZOOM', zoom: 99, ...MOBILE })
    expect(result.zoomByType['mobile']).toBe(safeMax)
    expect(result.scale).toBe(safeMax)
  })

  it('SZ3. SET_ZOOM always sets keepFit=false', () => {
    const state = baseState({ keepFit: true })
    const result = canvasReducer(state, { type: 'SET_ZOOM', zoom: 1.0, ...MOBILE })
    expect(result.keepFit).toBe(false)
  })

  it('SZ4. SET_ZOOM increments scrollCenterCount when breaking keepFit for first time', () => {
    const state = baseState({ keepFit: true, scrollCenterCount: 2 })
    const result = canvasReducer(state, { type: 'SET_ZOOM', zoom: 1.0, ...MOBILE })
    expect(result.scrollCenterCount).toBe(3)
  })

  it('SZ5. SET_ZOOM does NOT increment scrollCenterCount when keepFit already false', () => {
    const state = baseState({ keepFit: false, scrollCenterCount: 2 })
    const result = canvasReducer(state, { type: 'SET_ZOOM', zoom: 1.0, ...MOBILE })
    expect(result.scrollCenterCount).toBe(2)
  })

  // ── RESET_ZOOM ──────────────────────────────────────────────────────────────

  it('RZ1. RESET_ZOOM sets zoomByType[deviceType] to 1.0', () => {
    const state = baseState({ keepFit: false, zoomByType: { mobile: 2.5 } })
    const result = canvasReducer(state, { type: 'RESET_ZOOM', ...MOBILE })
    expect(result.zoomByType['mobile']).toBe(1.0)
  })

  it('RZ2. RESET_ZOOM sets keepFit=false', () => {
    const state = baseState({ keepFit: true })
    const result = canvasReducer(state, { type: 'RESET_ZOOM', ...MOBILE })
    expect(result.keepFit).toBe(false)
  })

  it('RZ3. RESET_ZOOM increments scrollCenterCount', () => {
    const state = baseState({ scrollCenterCount: 4 })
    const result = canvasReducer(state, { type: 'RESET_ZOOM', ...MOBILE })
    expect(result.scrollCenterCount).toBe(5)
  })

  // ── makeInitialState ────────────────────────────────────────────────────────

  it('IS1. makeInitialState: keepFit=true when LS_KEEP_FIT absent', () => {
    localStorage.clear()
    const s = makeInitialState()
    expect(s.keepFit).toBe(true)
  })

  it('IS2. makeInitialState: keepFit=false when localStorage has "false"', () => {
    localStorage.setItem(LS_KEEP_FIT, 'false')
    const s = makeInitialState()
    expect(s.keepFit).toBe(false)
  })

  it('IS3. makeInitialState: keepFit=true when localStorage has "true"', () => {
    localStorage.setItem(LS_KEEP_FIT, 'true')
    const s = makeInitialState()
    expect(s.keepFit).toBe(true)
  })

  it('IS4. makeInitialState: keepFit=true when localStorage has unexpected/corrupt value', () => {
    localStorage.setItem(LS_KEEP_FIT, 'corrupted-value')
    const s = makeInitialState()
    expect(s.keepFit).toBe(true)
  })

  // ── SCROLL_DONE ─────────────────────────────────────────────────────────────

  it('SCROLL_DONE is a no-op — returns the same state reference', () => {
    const state = baseState()
    const result = canvasReducer(state, { type: 'SCROLL_DONE' })
    expect(result).toBe(state)
  })

  // ── derive() null zoom fallback ──────────────────────────────────────────────

  it('derive fallback: keepFit=false, zoomByType[device]=null → scale falls back to fitScale', () => {
    const state = baseState({
      keepFit: false,
      fitScale: 0.72,
      zoomByType: { mobile: null },
      scale: 0,
    })
    const result = canvasReducer(state, {
      type: 'MEASURED',
      visibleW: 1200,
      visibleH: 800,
      ...MOBILE,
    })
    expect(result.scale).toBe(result.fitScale)
  })

  // ── ZOOM_IN fallback to state.scale ─────────────────────────────────────────

  it('ZOOM_IN: uses state.scale as base when zoomByType has no entry for the device', () => {
    const state = baseState({ keepFit: false, zoomByType: {}, scale: 0.8 })
    const result = canvasReducer(state, { type: 'ZOOM_IN', ...MOBILE })
    expect(result.zoomByType['mobile']).toBe(parseFloat((0.8 + ZOOM_STEP).toFixed(2)))
  })

  // ── TOGGLE_KEEP_FIT OFF→ON writes localStorage ───────────────────────────────

  it('TKF10. OFF→ON: writes "true" to localStorage', () => {
    localStorage.setItem(LS_KEEP_FIT, 'false')
    const state = baseState({ keepFit: false })
    canvasReducer(state, {
      type: 'TOGGLE_KEEP_FIT',
      visibleW: 1200,
      visibleH: 800,
      ...MOBILE,
    })
    expect(localStorage.getItem(LS_KEEP_FIT)).toBe('true')
  })
})
