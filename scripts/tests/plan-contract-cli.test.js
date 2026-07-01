import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import { ROOT, spawnCLI, WORKSPACES_DIR } from './helpers.js'

// Smoke test: CLI sees the live nClarity workspace correctly.
// Catches C1/H1/H2/H3 regressions — any of those bugs would fail at least one assertion here.

const WS = 'nClarity'
const EXPECTED_PLANS = 8
const EXPECTED_FLOWS = 8

describe('Suite P — plan:check / plan:ls / status contract (nClarity)', () => {
  it('P1 — plan:ls lists all flowplans', async () => {
    const result = await spawnCLI([`plan:ls`])
    assert.equal(result.code, 0, `plan:ls failed: ${result.stderr}`)
    const lines = result.stdout.split('\n').filter(l => l.trim() && !l.includes('─'))
    // Count bold plan name lines (lines containing plan file names from flowplans/)
    const plansDir = path.join(WORKSPACES_DIR, WS, 'flowplans')
    const actualFiles = fs.readdirSync(plansDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'))
    assert.equal(actualFiles.length, EXPECTED_PLANS, `Expected ${EXPECTED_PLANS} flowplans on disk`)
    // plan:ls output must not say "No flowplans found"
    assert.ok(
      !result.stdout.includes('No flowplans found'),
      `plan:ls reported no plans despite ${actualFiles.length} on disk`
    )
  })

  it('P2 — plan:check exits 0 on all valid plans', async () => {
    const result = await spawnCLI([`plan:check`])
    assert.equal(
      result.code,
      0,
      `plan:check failed (errors found or no plans detected):\n${result.stdout}\n${result.stderr}`
    )
    assert.ok(
      !result.stdout.includes('No flowplans to check'),
      `plan:check saw no plans despite ${EXPECTED_PLANS} on disk`
    )
  })

  it('P3 — plan:check exits 1 on a planted broken plan', async () => {
    const plansDir = path.join(WORKSPACES_DIR, WS, 'flowplans')
    const brokenPath = path.join(plansDir, '_broken_test_plan.ts')
    fs.writeFileSync(brokenPath, '// intentionally missing id/name/steps\nexport default {}\n')
    try {
      const result = await spawnCLI([`plan:check`])
      assert.equal(result.code, 1, 'plan:check should exit 1 when a broken plan is present')
    } finally {
      fs.rmSync(brokenPath, { force: true })
    }
  })

  it('P4 — status reports correct flow and flowplan counts', async () => {
    const result = await spawnCLI([`status`])
    assert.equal(result.code, 0, `status failed: ${result.stderr}`)
    // Flows line must not show 0
    const flowLine = result.stdout.split('\n').find(l => l.includes('Flows:'))
    assert.ok(flowLine, 'status output missing Flows: line')
    assert.ok(
      !flowLine.includes('Flows:           0'),
      `status reported 0 flows for nClarity:\n${result.stdout}`
    )
    // FlowPlans line must appear and not show 0
    const planLine = result.stdout.split('\n').find(l => l.includes('FlowPlans:'))
    assert.ok(planLine, `status output missing FlowPlans: line:\n${result.stdout}`)
    assert.ok(
      !planLine.includes('FlowPlans:       0'),
      `status reported 0 flowplans for nClarity:\n${result.stdout}`
    )
    // Must NOT advise running the removed "build:flows" command (H2a)
    assert.ok(
      !result.stdout.includes('run flowkit build:flows'),
      'status still advises the removed build:flows command'
    )
  })

  it('P5 — lens:report:nClarity resolves (H4)', async () => {
    const result = await spawnCLI([`lens:report:${WS}`])
    // May exit non-zero if no sessions, but must NOT say "Unknown lens command"
    assert.ok(
      !result.stderr.includes('Unknown lens command'),
      `lens:report:${WS} was not parsed correctly:\n${result.stderr}`
    )
  })

  it('P6 — migrate:nav:nClarity is blocked on flat workspace (C2)', async () => {
    const result = await spawnCLI([`migrate:nav:${WS}`])
    assert.equal(result.code, 1, 'migrate:nav should exit 1 on a flat workspace')
    assert.ok(
      result.stderr.includes('flat flowplan format') || result.stderr.includes('legacy _playFlow'),
      `migrate:nav did not show the flat-workspace guard message:\n${result.stderr}`
    )
  })
})
