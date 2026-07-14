// Unit coverage for scripts/checks/*.js rule modules — pure functions given a wsDir and a
// report, exercised directly against small on-disk fixtures (no CLI spawn needed). One
// deliberately-broken case per rule family, plus a clean case proving no false positives.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { createReport } from '../checks/reporter.js'
import { checkScreens } from '../checks/screens.js'
import { checkDb } from '../checks/db.js'
import { checkFlowplans } from '../checks/flowplans.js'
import { checkConfig } from '../checks/config.js'
import { checkComponents } from '../checks/components.js'

let wsDir

function ruleIds(report) {
  return report.findings.map(f => f.ruleId)
}

function write(relPath, content) {
  const full = path.join(wsDir, relPath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}

describe('Suite D — scripts/checks/*.js rule modules', () => {
  before(() => {
    wsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowkit-check-rules-'))
  })

  after(() => {
    fs.rmSync(wsDir, { recursive: true, force: true })
  })

  it('D1 — checkScreens: clean screen → no findings', () => {
    write(
      'flows/onboarding/welcome/WelcomeScreen.tsx',
      `export default function WelcomeScreen() { return null }
export const screenMeta = { label: 'Welcome' }
`
    )
    const report = createReport()
    checkScreens(wsDir, report)
    assert.deepEqual(ruleIds(report), [])
  })

  it('D2 — checkScreens: missing screenMeta → screen/missing-meta', () => {
    write(
      'flows/onboarding/broken/BrokenScreen.tsx',
      `export default function BrokenScreen() { return null }
`
    )
    const report = createReport()
    checkScreens(wsDir, report)
    assert.ok(ruleIds(report).includes('screen/missing-meta'))
  })

  it('D3 — checkScreens: no default export → screen/no-default-export', () => {
    write(
      'flows/onboarding/nodefault/NoDefaultScreen.tsx',
      `export const screenMeta = { label: 'No Default' }
`
    )
    const report = createReport()
    checkScreens(wsDir, report)
    assert.ok(ruleIds(report).includes('screen/no-default-export'))
  })

  it('D4 — checkDb: has an export → no findings', () => {
    write('lib/data/db.ts', `export const user = { name: 'Test' }\n`)
    const report = createReport()
    checkDb(wsDir, report)
    assert.deepEqual(ruleIds(report), [])
  })

  it('D5 — checkDb: no exports → db/no-exports', () => {
    write('lib/data/db.ts', `// nothing here\n`)
    const report = createReport()
    checkDb(wsDir, report)
    assert.ok(ruleIds(report).includes('db/no-exports'))
  })

  it('D6 — checkFlowplans: step referencing a real screen → no findings', async () => {
    // Reuses the same screen fixture from D1 (flows/onboarding/welcome).
    write(
      'flowplans/onboarding.ts',
      `export default {
  id: 'onboarding',
  name: 'Onboarding',
  steps: [
    { screenId: 'welcome', on: 'get-started', actionNote: 'Taps Get Started' },
  ],
}
`
    )
    const report = createReport()
    await checkFlowplans(wsDir, report)
    assert.deepEqual(ruleIds(report), [])
  })

  it('D7 — checkFlowplans: step referencing a nonexistent screen → flowplan/invalid-screen', async () => {
    write(
      'flowplans/broken.ts',
      `export default {
  id: 'broken',
  name: 'Broken',
  steps: [
    { screenId: 'does-not-exist', actionNote: 'goes nowhere' },
  ],
}
`
    )
    const report = createReport()
    await checkFlowplans(wsDir, report)
    assert.ok(ruleIds(report).includes('flowplan/invalid-screen'))
  })

  it('D8 — checkFlowplans: id/filename mismatch → flowplan/id-filename-mismatch', async () => {
    write(
      'flowplans/mismatched.ts',
      `export default {
  id: 'totally-different-id',
  name: 'Mismatched',
  steps: [{ screenId: 'welcome' }],
}
`
    )
    const report = createReport()
    await checkFlowplans(wsDir, report)
    assert.ok(ruleIds(report).includes('flowplan/id-filename-mismatch'))
  })

  it('D9 — checkFlowplans: empty flowplans/ dir → flowplan/empty-workspace', async () => {
    const emptyWs = fs.mkdtempSync(path.join(os.tmpdir(), 'flowkit-check-empty-'))
    fs.mkdirSync(path.join(emptyWs, 'flowplans'))
    try {
      const report = createReport()
      await checkFlowplans(emptyWs, report)
      assert.ok(ruleIds(report).includes('flowplan/empty-workspace'))
    } finally {
      fs.rmSync(emptyWs, { recursive: true, force: true })
    }
  })

  it('D10 — checkFlowplans: no flowplans/ dir at all → no findings (not suspicious)', async () => {
    const noDirWs = fs.mkdtempSync(path.join(os.tmpdir(), 'flowkit-check-nodir-'))
    try {
      const report = createReport()
      await checkFlowplans(noDirWs, report)
      assert.deepEqual(ruleIds(report), [])
    } finally {
      fs.rmSync(noDirWs, { recursive: true, force: true })
    }
  })

  it('D11 — checkConfig: screenOrder references a directory that does not exist → config/orphaned-id', async () => {
    const cfgWs = fs.mkdtempSync(path.join(os.tmpdir(), 'flowkit-check-config-'))
    try {
      fs.writeFileSync(
        path.join(cfgWs, 'workspace.ts'),
        `export default {
  workspace: { name: 'test' },
  flows: ['onboarding'],
  screenOrder: { onboarding: ['ghost-screen'] },
}
`
      )
      const report = createReport()
      await checkConfig(cfgWs, report)
      assert.ok(ruleIds(report).includes('config/orphaned-id'))
    } finally {
      fs.rmSync(cfgWs, { recursive: true, force: true })
    }
  })

  it('D12 — checkComponents: registered component file missing → components/stale-registry', () => {
    const compWs = fs.mkdtempSync(path.join(os.tmpdir(), 'flowkit-check-components-'))
    try {
      fs.mkdirSync(path.join(compWs, '.flowkit'), { recursive: true })
      fs.writeFileSync(
        path.join(compWs, '.flowkit', 'components.json'),
        JSON.stringify([{ name: 'GhostButton', path: 'lib/components/ui', desc: '' }])
      )
      const report = createReport()
      checkComponents(compWs, report)
      assert.ok(ruleIds(report).includes('components/stale-registry'))
    } finally {
      fs.rmSync(compWs, { recursive: true, force: true })
    }
  })
})
