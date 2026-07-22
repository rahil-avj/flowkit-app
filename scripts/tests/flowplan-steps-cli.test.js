// CLI-integration coverage for `flowkit add:step` / `remove:step` — specifically the guard
// in scripts/authoring/flowplans.js's rewriteSteps() that refuses to rewrite a flowplan
// containing forks (formatStep() has no serialization path for forks, and the steps-array
// regex only matches up to the first "]", so proceeding would silently corrupt the file).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import {
  backupRegistry,
  cleanupWorkspace,
  registerSnapshotForEmergencyRestore,
  restoreRegistry,
  ROOT,
  spawnCLI,
} from './helpers.js'

const WS = 'twsfpsteps'
const NW_FLAGS = ['--lang:ts', '--kit:none']
const FORKED_PLAN_PATH = path.join(ROOT, 'workspaces', WS, 'flowplans', 'forked-plan.ts')

const FORKED_PLAN_SRC = `import { defineFlow } from '@flowkit-core/config'

export default defineFlow({
  id: 'forked-plan',
  name: 'Forked Plan',
  steps: [
    { screenId: 'welcome-screen', on: 'get-started' },
    {
      screenId: 'setup-screen',
      on: 'continue',
      forks: [
        { label: 'Skip setup', steps: [{ screenId: 'ready-screen' }] },
      ],
    },
  ],
})
`

describe('Suite F — flowkit add:step / remove:step', () => {
  let snapshot

  before(async () => {
    snapshot = backupRegistry()
    registerSnapshotForEmergencyRestore(snapshot)
    cleanupWorkspace(WS)
    const result = await spawnCLI([`-nw:${WS}`, ...NW_FLAGS])
    assert.equal(result.code, 0, `workspace ${WS} creation failed: ${result.stderr}`)
    fs.writeFileSync(FORKED_PLAN_PATH, FORKED_PLAN_SRC)
  })

  after(() => {
    restoreRegistry(snapshot)
    cleanupWorkspace(WS)
  })

  it('F1 — add:step on a flowplan with forks → exit 1, file byte-for-byte untouched', async () => {
    const before = fs.readFileSync(FORKED_PLAN_PATH, 'utf8')
    const result = await spawnCLI([
      'add:step',
      '--flowplan:forked-plan',
      '--screen:ready-screen',
      `--workspace:${WS}`,
    ])
    assert.notEqual(result.code, 0)
    assert.match(result.stderr, /has forks/)
    const after = fs.readFileSync(FORKED_PLAN_PATH, 'utf8')
    assert.equal(after, before, 'flowplan file must be untouched when the fork guard fires')
  })

  it('F2 — remove:step on a flowplan with forks → exit 1, file byte-for-byte untouched', async () => {
    const before = fs.readFileSync(FORKED_PLAN_PATH, 'utf8')
    const result = await spawnCLI([
      'remove:step',
      '--flowplan:forked-plan',
      '--index:0',
      `--workspace:${WS}`,
    ])
    assert.notEqual(result.code, 0)
    assert.match(result.stderr, /has forks/)
    const after = fs.readFileSync(FORKED_PLAN_PATH, 'utf8')
    assert.equal(after, before, 'flowplan file must be untouched when the fork guard fires')
  })

  it('F3 — add:step on a fork-free flowplan still succeeds', async () => {
    const result = await spawnCLI([
      'add:step',
      '--flowplan:onboarding-flow',
      '--screen:ready-screen',
      '--action:test step',
      `--workspace:${WS}`,
    ])
    assert.equal(result.code, 0, `stderr: ${result.stderr}`)
    assert.match(result.stdout, /Step added/)
  })
})
