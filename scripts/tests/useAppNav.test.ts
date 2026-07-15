/* @vitest-environment jsdom */
//
// DashboardContext.tsx transitively imports workspaceModules.ts, which imports
// Vite-plugin-only virtual modules (virtual:flowkit/config, virtual:flowkit/
// workspace) that vitest.config.ts's Node-only "pure logic" project has no
// plugin to resolve (see that file's own comment — it's deliberately scoped
// to pure-logic suites, not full app rendering). Mocking useDashboard() here
// is the minimal, test-local way around that — it isolates useAppNav()'s own
// branching logic (the thing this suite actually verifies) from
// DashboardContext's unrelated internals, without changing any shared config.
import React, { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockDashboardNavigateTo = vi.fn()

vi.mock('@flowkit-shared/contexts/DashboardContext', () => ({
  useDashboard: () => ({ navigateTo: mockDashboardNavigateTo }),
}))

const { FlowNavCtx } = await import('@flowkit-shared/contexts/FlowNavContext')
const { useAppNav } = await import('@flowkit-shared/utils/useAppNav')

// ─── Helpers ──────────────────────────────────────────────────────────────────

let container: HTMLDivElement | null = null
let root: ReturnType<typeof createRoot> | null = null

beforeEach(() => {
  mockDashboardNavigateTo.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root?.render(null)
  })
  container?.remove()
  container = null
  root = null
})

function mount(component: React.ReactElement) {
  act(() => {
    root!.render(component)
  })
}

type ProbeResult = ReturnType<typeof useAppNav>

/** Captures the latest useAppNav() result into `outRef.current` after each commit. */
function Probe({ outRef }: { outRef: { current: ProbeResult | null } }) {
  const result = useAppNav()
  useEffect(() => {
    outRef.current = result
  })
  return null
}

function renderStandalone(outRef: { current: ProbeResult | null }) {
  mount(React.createElement(Probe, { outRef }))
}

function makeFlowNavValue(navigateTo: (target: string) => void) {
  return {
    navigateTo,
    goNext: () => navigateTo('next'),
    goBack: () => navigateTo('back'),
    isFlow: true,
    flowState: { sample: 'value' },
  }
}

function renderInFlow(
  outRef: { current: ProbeResult | null },
  flowNavValue: ReturnType<typeof makeFlowNavValue>
) {
  mount(
    React.createElement(
      FlowNavCtx.Provider,
      { value: flowNavValue },
      React.createElement(Probe, { outRef })
    )
  )
}

// ─── Standalone (no FlowNavCtx provider) ───────────────────────────────────────

describe('useAppNav — standalone (Screens tab, no flow)', () => {
  it('N1. isFlow is false and flowState is undefined', () => {
    const outRef: { current: ProbeResult | null } = { current: null }
    renderStandalone(outRef)
    expect(outRef.current!.isFlow).toBe(false)
    expect(outRef.current!.flowState).toBeUndefined()
  })

  it("N2. navigateTo calls DashboardContext's navigateTo and does not throw (unlike useFlowNav(), which throws outside a flow)", () => {
    const outRef: { current: ProbeResult | null } = { current: null }
    renderStandalone(outRef)
    expect(() => act(() => outRef.current!.navigateTo('setup-screen'))).not.toThrow()
    expect(mockDashboardNavigateTo).toHaveBeenCalledWith('setup-screen')
  })
})

// ─── In-flow (FlowNavCtx present) ───────────────────────────────────────────────

describe('useAppNav — in-flow (rendered inside FlowMaster)', () => {
  it("F1. isFlow is true and flowState is FlowNavCtx's flowState", () => {
    const outRef: { current: ProbeResult | null } = { current: null }
    renderInFlow(outRef, makeFlowNavValue(vi.fn()))
    expect(outRef.current!.isFlow).toBe(true)
    expect(outRef.current!.flowState).toEqual({ sample: 'value' })
  })

  it("F2. navigateTo calls FlowNavCtx's navigateTo, not DashboardContext's — this is the fix: no isFlow guard needed by the caller", () => {
    const outRef: { current: ProbeResult | null } = { current: null }
    const flowNavigateTo = vi.fn()
    renderInFlow(outRef, makeFlowNavValue(flowNavigateTo))
    act(() => outRef.current!.navigateTo('setup-screen'))
    expect(flowNavigateTo).toHaveBeenCalledWith('setup-screen')
    expect(mockDashboardNavigateTo).not.toHaveBeenCalled()
  })
})
