import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import { ROOT } from '../lib/config.js'
import { workspaceScaffold } from '../lib/scaffold.js'

// scripts/lib/scaffold.js (repo mode) and packages/create-flowkit-app/index.js
// (flat-mode scaffolder, deliberately standalone — can't import scaffold.js at
// runtime) hand-port the same demo content in two places. See the comments
// above workspaceScaffold() and above writeFlowkitConfig() in create-flowkit-app
// for the full explanation. Screen/flow id naming has already drifted between
// the two (scaffold.js suffixes ids with -screen/-flow, create-flowkit-app
// doesn't) so this only checks structural shape — screen and flow counts —
// not exact ids or content. It exists to catch someone adding/removing a demo
// screen or flow in one file without the other, not full parity.

describe('Suite N — scaffold.js / create-flowkit-app demo-content parity', () => {
  it('N1 — same number of demo flows in scaffold.js and create-flowkit-app', () => {
    const files = workspaceScaffold('demo')
    const flowIds = new Set(
      Object.keys(files)
        .filter(p => p.startsWith('flows/') && p.endsWith('.tsx'))
        .map(p => p.split('/')[1])
    )

    const cfaSrc = fs.readFileSync(path.join(ROOT, 'packages/create-flowkit-app/index.js'), 'utf8')
    const flowsArrayMatch = cfaSrc.match(/flows:\s*\[([^\]]*)\]/)
    assert.ok(
      flowsArrayMatch,
      'create-flowkit-app/index.js has no flows: [...] array to compare against'
    )
    const cfaFlowCount = flowsArrayMatch[1].split(',').filter(s => s.trim()).length

    assert.equal(
      flowIds.size,
      cfaFlowCount,
      `scaffold.js has ${flowIds.size} demo flow(s) (${[...flowIds].join(', ')}) but ` +
        `create-flowkit-app/index.js's flows: [...] array has ${cfaFlowCount} — demo content has drifted`
    )
  })

  it('N2 — same number of demo screens in scaffold.js and create-flowkit-app', () => {
    const files = workspaceScaffold('demo')
    const screenCount = Object.keys(files).filter(
      p => p.startsWith('flows/') && p.endsWith('.tsx')
    ).length

    const cfaSrc = fs.readFileSync(path.join(ROOT, 'packages/create-flowkit-app/index.js'), 'utf8')
    // Each demo screen has its own write*Screen(dir, language) generator function.
    const cfaScreenWriters = cfaSrc.match(/^function write\w+Screen\(/gm) ?? []

    assert.equal(
      screenCount,
      cfaScreenWriters.length,
      `scaffold.js scaffolds ${screenCount} demo screen(s) but create-flowkit-app/index.js ` +
        `defines ${cfaScreenWriters.length} write*Screen() generator(s) — demo content has drifted`
    )
  })
})
