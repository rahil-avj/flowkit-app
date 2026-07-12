import type { FlowplanDef, InteractionRule } from '@flowkit/types/index'
import type { ScreenResolver } from '@flowkit-features/flowplan/compileFlowplan'
import { compileFlowplan, FlowplanCompileError } from '@flowkit-features/flowplan/compileFlowplan'
import { describe, expect, it } from 'vitest'
// (InteractionRule used in the `on`-wiring test below)

// A fake screen component (compiler only needs identity + label).
const C = () => null

// Resolver that accepts any screenId and echoes a label.
const resolveAny: ScreenResolver = id => ({ id, label: `${id} label`, component: C })

function emptyRegistry(): Map<string, FlowplanDef> {
  return new Map()
}

/** Helper: resolve a compiled step's advance target (string or fork-fn result). */
function goToFor(
  config: ReturnType<typeof compileFlowplan>,
  compiledScreenId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: Record<string, any> = {}
): string {
  const step = config.__flowplan.steps.find(s => s.screenId === compiledScreenId)
  if (!step) throw new Error(`no compiled step for ${compiledScreenId}`)
  const goTo = step.next!
  return typeof goTo === 'function' ? goTo({ db, flowState: {} }) : (goTo as string)
}

describe('compileFlowplan', () => {
  it('8. maps steps to ordered screens[] with resolver labels', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [{ screenId: 'a' }, { screenId: 'b' }, { screenId: 'c' }],
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    expect(cfg.screens.map(s => s.id)).toEqual(['a', 'b', 'c'])
    expect(cfg.screens[0].label).toBe('a label')
    expect(cfg.initialScreen).toBe('a')
    expect(cfg.__flowplan.steps.map(s => s.screenId)).toEqual(['a', 'b', 'c'])
  })

  it('9. sequential transitions advance to the next screen; last completes', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [{ screenId: 'a' }, { screenId: 'b' }],
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    expect(goToFor(cfg, 'a')).toBe('b')
    expect(goToFor(cfg, 'b')).toBe('__complete__')
  })

  it('9b. step.on keys the advance interaction on the named element id', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [{ screenId: 'cart', on: 'checkout' }, { screenId: 'pay' }],
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    // The interaction is keyed on the REAL element id, not a synthetic one.
    expect(cfg.interactions).toBeDefined()
    const rule = cfg.interactions!['checkout'] as InteractionRule
    expect(rule).toBeDefined()
    expect(rule.goTo).toBe('pay')
    // No synthetic __advance__ keys leak into interactions.
    expect(Object.keys(cfg.interactions!).some(k => k.startsWith('__advance__'))).toBe(false)
    // The compiled step records its `on` + resolved next for FlowMaster/gating.
    const cartStep = cfg.__flowplan.steps.find(s => s.screenId === 'cart')!
    expect(cartStep.on).toBe('checkout')
    expect(cartStep.next).toBe('pay')
  })

  it('9c. all-tap-anywhere flow leaves interactions undefined (sequential fallback)', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [{ screenId: 'a' }, { screenId: 'b' }], // no `on`
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    expect(cfg.interactions).toBeUndefined()
    // …but the resolved next targets are still on the steps for FlowMaster.
    expect(goToFor(cfg, 'a')).toBe('b')
  })

  it('carries step db patch + notes into __flowplan.steps', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [{ screenId: 'a', actionNote: 'tap go', db: { 'local.x': 1 }, annotation: 'note' }],
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    const step = cfg.__flowplan.steps[0]
    expect(step.actionNote).toBe('tap go')
    expect(step.db).toEqual({ 'local.x': 1 })
    expect(step.annotation).toBe('note')
  })

  it('10. terminal fork: branch entry chosen by db, branch end completes', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [
        {
          screenId: 'cart',
          forks: [{ label: 'empty', db: { 'cart.count': 0 }, steps: [{ screenId: 'cart-empty' }] }],
        },
        { screenId: 'pay' },
      ],
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    // db matches the fork → go to branch entry
    expect(goToFor(cfg, 'cart', { cart: { count: 0 } })).toBe('cart-empty')
    // db does NOT match → fall through to sequential next
    expect(goToFor(cfg, 'cart', { cart: { count: 2 } })).toBe('pay')
    // terminal branch's last step completes the flow
    expect(goToFor(cfg, 'cart-empty')).toBe('__complete__')
    // the branch screen exists in screens[]
    expect(cfg.screens.map(s => s.id)).toContain('cart-empty')
  })

  it("11. mergesTo:'next' rejoins the parent at the step after the fork", () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [
        {
          screenId: 'pay',
          forks: [
            {
              label: 'fail',
              db: { 'pay.failed': true },
              mergesTo: 'next',
              steps: [{ screenId: 'pay-error' }],
            },
          ],
        },
        { screenId: 'confirm' },
      ],
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    // fork matches → branch entry
    expect(goToFor(cfg, 'pay', { pay: { failed: true } })).toBe('pay-error')
    // branch's last step merges to parent's next step (confirm), NOT complete
    expect(goToFor(cfg, 'pay-error')).toBe('confirm')
    // no match → sequential
    expect(goToFor(cfg, 'pay', {})).toBe('confirm')
  })

  it('12. recursive fork (fork inside a fork branch) inlines correctly', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [
        {
          screenId: 'root',
          forks: [
            {
              label: 'outer',
              db: { o: true },
              steps: [
                {
                  screenId: 'mid',
                  forks: [{ label: 'inner', db: { i: true }, steps: [{ screenId: 'leaf' }] }],
                },
              ],
            },
          ],
        },
      ],
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    expect(cfg.screens.map(s => s.id)).toEqual(expect.arrayContaining(['root', 'mid', 'leaf']))
    expect(goToFor(cfg, 'root', { o: true })).toBe('mid')
    expect(goToFor(cfg, 'mid', { i: true })).toBe('leaf')
    expect(goToFor(cfg, 'leaf')).toBe('__complete__') // terminal
  })

  it('13. flowplan-ref inlines referenced steps with namespaced screen ids', () => {
    const checkout: FlowplanDef = {
      id: 'checkout',
      name: 'Checkout',
      steps: [{ screenId: 'cart' }, { screenId: 'pay' }],
    }
    const registry = new Map([['checkout', checkout]])
    const plan: FlowplanDef = {
      id: 'quick',
      name: 'Quick',
      steps: [{ screenId: 'home' }, { ref: 'checkout' }],
    }
    const cfg = compileFlowplan(plan, resolveAny, registry)
    expect(cfg.screens.map(s => s.id)).toEqual(['home', 'checkout::cart', 'checkout::pay'])
    // home advances into the ref's first (namespaced) screen
    expect(goToFor(cfg, 'home')).toBe('checkout::cart')
    expect(goToFor(cfg, 'checkout::cart')).toBe('checkout::pay')
    expect(goToFor(cfg, 'checkout::pay')).toBe('__complete__')
  })

  it("13b. ref'd steps preserve `on`; interaction keys on the element id, targets namespaced", () => {
    const checkout: FlowplanDef = {
      id: 'checkout',
      name: 'Checkout',
      steps: [{ screenId: 'cart', on: 'checkout-btn' }, { screenId: 'pay' }],
    }
    const registry = new Map([['checkout', checkout]])
    const plan: FlowplanDef = {
      id: 'quick',
      name: 'Quick',
      steps: [{ screenId: 'home', on: 'reorder' }, { ref: 'checkout' }],
    }
    const cfg = compileFlowplan(plan, resolveAny, registry)
    // `on` element ids are NOT namespaced (they're DOM ids), but their goTo
    // targets ARE the namespaced compiled screen ids.
    const homeRule = cfg.interactions!['reorder'] as InteractionRule
    expect(homeRule.goTo).toBe('checkout::cart')
    const cartRule = cfg.interactions!['checkout-btn'] as InteractionRule
    expect(cartRule.goTo).toBe('checkout::pay')
    // The compiled step records the source `on`.
    const cartStep = cfg.__flowplan.steps.find(s => s.screenId === 'checkout::cart')!
    expect(cartStep.on).toBe('checkout-btn')
  })

  it('14. circular ref throws a named error (no infinite loop)', () => {
    const a: FlowplanDef = { id: 'a', name: 'A', steps: [{ ref: 'b' }] }
    const b: FlowplanDef = { id: 'b', name: 'B', steps: [{ ref: 'a' }] }
    const registry = new Map([
      ['a', a],
      ['b', b],
    ])
    expect(() => compileFlowplan(a, resolveAny, registry)).toThrowError(
      /circular flowplan reference/
    )
  })

  it('15. missing ref throws a clear error', () => {
    const plan: FlowplanDef = { id: 'p', name: 'P', steps: [{ ref: 'ghost' }] }
    expect(() => compileFlowplan(plan, resolveAny, emptyRegistry())).toThrowError(
      /flowplan not found: "ghost"/
    )
  })

  it('16. single-step plan compiles to a valid FlowConfig', () => {
    const plan: FlowplanDef = { id: 'p', name: 'P', steps: [{ screenId: 'only' }] }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    expect(cfg.screens).toHaveLength(1)
    expect(cfg.initialScreen).toBe('only')
    expect(goToFor(cfg, 'only')).toBe('__complete__')
  })

  it('throws on missing screen with a clear error', () => {
    const plan: FlowplanDef = { id: 'p', name: 'P', steps: [{ screenId: 'nope' }] }
    const resolveNone: ScreenResolver = () => undefined
    expect(() => compileFlowplan(plan, resolveNone, emptyRegistry())).toThrowError(
      FlowplanCompileError
    )
  })

  it('empty plan throws', () => {
    const plan: FlowplanDef = { id: 'p', name: 'P', steps: [] }
    expect(() => compileFlowplan(plan, resolveAny, emptyRegistry())).toThrowError(/has no steps/)
  })

  it('CP1. fork with db.key === 0 (falsy number) still matches', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [
        {
          screenId: 'root',
          forks: [{ label: 'zero', db: { key: 0 }, steps: [{ screenId: 'branch' }] }],
        },
        { screenId: 'fallback' },
      ],
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    expect(goToFor(cfg, 'root', { key: 0 })).toBe('branch')
    expect(goToFor(cfg, 'root', { key: 1 })).toBe('fallback')
  })

  it('CP2. fork with db.key === false (falsy bool) still matches', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [
        {
          screenId: 'root',
          forks: [{ label: 'falsy', db: { enabled: false }, steps: [{ screenId: 'branch' }] }],
        },
        { screenId: 'fallback' },
      ],
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    expect(goToFor(cfg, 'root', { enabled: false })).toBe('branch')
    expect(goToFor(cfg, 'root', { enabled: true })).toBe('fallback')
  })

  it('CP3. unconditional fork (no db) always matches; first unconditional wins when multiple forks', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [
        {
          screenId: 'root',
          forks: [
            { label: 'unconditional', steps: [{ screenId: 'first' }] },
            { label: 'conditional', db: { x: 1 }, steps: [{ screenId: 'second' }] },
          ],
        },
      ],
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    // Unconditional fork is first — wins regardless of db
    expect(goToFor(cfg, 'root', {})).toBe('first')
    expect(goToFor(cfg, 'root', { x: 1 })).toBe('first')
  })

  it('CP4. ref chain A → B → C inlines all steps with correct double-namespace', () => {
    const c: FlowplanDef = {
      id: 'c',
      name: 'C',
      steps: [{ screenId: 'screen' }],
    }
    const b: FlowplanDef = {
      id: 'b',
      name: 'B',
      steps: [{ ref: 'c' }],
    }
    const registry = new Map([
      ['b', b],
      ['c', c],
    ])
    const plan: FlowplanDef = {
      id: 'a',
      name: 'A',
      steps: [{ screenId: 'a-screen' }, { ref: 'b' }],
    }
    const cfg = compileFlowplan(plan, resolveAny, registry)
    expect(cfg.initialScreen).toBe('a-screen')
    expect(cfg.screens.map(s => s.id)).toContain('b::c::screen')
    expect(goToFor(cfg, 'a-screen')).toBe('b::c::screen')
    expect(goToFor(cfg, 'b::c::screen')).toBe('__complete__')
  })

  it("CP5. ref'd plan inside a fork branch — namespace applied correctly", () => {
    const inner: FlowplanDef = {
      id: 'inner',
      name: 'Inner',
      steps: [{ screenId: 'detail' }],
    }
    const registry = new Map([['inner', inner]])
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [
        {
          screenId: 'root',
          forks: [{ label: 'branch', db: { go: true }, steps: [{ ref: 'inner' }] }],
        },
        { screenId: 'end' },
      ],
    }
    const cfg = compileFlowplan(plan, resolveAny, registry)
    expect(goToFor(cfg, 'root', { go: true })).toBe('inner::detail')
    expect(cfg.screens.map(s => s.id)).toContain('inner::detail')
  })

  it('CP6. plan.simulator.controls propagated to cfg.__flowplan.simulatorControls', () => {
    const controls = [
      { id: 'ctrl1', label: 'Network', type: 'toggle' as const },
      { id: 'ctrl2', label: 'Latency', type: 'select' as const, options: ['fast', 'slow'] },
    ]
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [{ screenId: 'a' }],
      simulator: { controls },
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    expect(cfg.__flowplan.simulatorControls).toEqual(controls)
  })

  it('CP7. missing plan.simulator → simulatorControls defaults to []', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [{ screenId: 'a' }],
      // no simulator field
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    expect(cfg.__flowplan.simulatorControls).toEqual([])
  })

  it('CP9. fork db with dot-path key matches nested db value via readDotPath', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [
        {
          screenId: 'root',
          forks: [
            {
              label: 'pro',
              db: { 'user.plan': 'pro' },
              steps: [{ screenId: 'pro-screen' }],
            },
          ],
        },
        { screenId: 'fallback' },
      ],
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    expect(goToFor(cfg, 'root', { user: { plan: 'pro' } })).toBe('pro-screen')
    expect(goToFor(cfg, 'root', { user: { plan: 'free' } })).toBe('fallback')
    expect(goToFor(cfg, 'root', {})).toBe('fallback')
  })

  it('CP10. decisionNote is carried into __flowplan.steps', () => {
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [{ screenId: 'a', decisionNote: 'choose path here' }],
    }
    const cfg = compileFlowplan(plan, resolveAny, emptyRegistry())
    expect(cfg.__flowplan.steps[0].decisionNote).toBe('choose path here')
  })

  it("CP8. sourceScreenId on ref'd steps is the pre-namespace original id", () => {
    const ref: FlowplanDef = {
      id: 'ref',
      name: 'Ref',
      steps: [{ screenId: 'screen' }],
    }
    const registry = new Map([['ref', ref]])
    const plan: FlowplanDef = {
      id: 'p',
      name: 'P',
      steps: [{ ref: 'ref' }],
    }
    const cfg = compileFlowplan(plan, resolveAny, registry)
    const step = cfg.__flowplan.steps.find(s => s.screenId === 'ref::screen')!
    expect(step).toBeDefined()
    expect(step.sourceScreenId).toBe('screen')
  })
})
