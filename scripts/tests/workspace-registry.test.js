import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { backupRegistry, parseRegistry, restoreRegistry, ROOT, WORKSPACES_DIR } from './helpers.js'

const { readWorkspaceRegistry, syncWorkspaceRegistry, writeWorkspaceRegistry } = await import(
  path.join(ROOT, 'scripts/helpers/registry.js')
)

describe('Suite A — Registry pure logic', () => {
  let snapshot

  before(() => {
    snapshot = backupRegistry()
  })

  after(() => {
    restoreRegistry(snapshot)
  })

  it('A1 — empty workspaces array → active literal is null', () => {
    writeWorkspaceRegistry([], null)
    const reg = parseRegistry()
    assert.deepEqual(reg.names, [])
    assert.equal(reg.active, null)
  })

  it('A2 — single entry → active equals that entry', () => {
    writeWorkspaceRegistry(['alpha'], 'alpha')
    const reg = parseRegistry()
    assert.deepEqual(reg.names, ['alpha'])
    assert.equal(reg.active, 'alpha')
  })

  it('A3 — multiple entries → active = first when no URL param', () => {
    writeWorkspaceRegistry(['alpha', 'beta'], 'alpha')
    const reg = parseRegistry()
    assert.deepEqual(reg.names, ['alpha', 'beta'])
    assert.equal(reg.active, 'alpha')
  })

  it('A4 — readWorkspaceRegistry() with missing file → returns []', async () => {
    const { WORKSPACES_JSON } = await import(path.join(ROOT, 'scripts/helpers/config.js'))
    const tmpPath = WORKSPACES_JSON + '.bak'
    fs.renameSync(WORKSPACES_JSON, tmpPath)
    try {
      const result = readWorkspaceRegistry()
      assert.deepEqual(result, [])
    } finally {
      fs.renameSync(tmpPath, WORKSPACES_JSON)
    }
  })

  it('A5 — writeWorkspaceRegistry() output is valid JSON with required fields', async () => {
    writeWorkspaceRegistry(['ws-one', 'ws-two'], 'ws-one')
    const { WORKSPACES_JSON } = await import(path.join(ROOT, 'scripts/helpers/config.js'))
    const data = JSON.parse(fs.readFileSync(WORKSPACES_JSON, 'utf8'))
    assert.ok(Array.isArray(data.workspaces), 'workspaces must be an array')
    assert.ok(
      data.workspaces.some(w => w.name === 'ws-one'),
      'ws-one must be present'
    )
    assert.ok(
      data.workspaces.some(w => w.name === 'ws-two'),
      'ws-two must be present'
    )
    assert.equal(data.active, 'ws-one', 'active must be ws-one')
  })

  it('A6 — both workspace names appear in registry after multi-write', () => {
    writeWorkspaceRegistry(['ws-one', 'ws-two'], 'ws-one')
    const reg = parseRegistry()
    assert.ok(reg.names.includes('ws-one'))
    assert.ok(reg.names.includes('ws-two'))
  })

  it('A7 — syncWorkspaceRegistry() removes entry for non-existent folder', () => {
    writeWorkspaceRegistry(['nClarity', 'phantom'], 'nClarity')
    assert.ok(
      !fs.existsSync(path.join(WORKSPACES_DIR, 'phantom')),
      'phantom must not exist on disk'
    )
    syncWorkspaceRegistry()
    const reg = parseRegistry()
    assert.ok(!reg.names.includes('phantom'), 'phantom should be removed after sync')
  })

  it('A8 — syncWorkspaceRegistry() removes non-existent entries, active shifts to real workspace', () => {
    // Write only a ghost entry — no real workspaces/ folder for it
    writeWorkspaceRegistry(['ghost'], 'ghost')
    assert.ok(!fs.existsSync(path.join(WORKSPACES_DIR, 'ghost')), 'ghost must not exist on disk')
    syncWorkspaceRegistry()
    const reg = parseRegistry()
    assert.ok(!reg.names.includes('ghost'), 'ghost should be removed after sync')
    // nClarity exists on disk so sync may pick it up; active must not be 'ghost'
    assert.notEqual(reg.active, 'ghost', 'active should not remain as ghost')
  })

  it('A9 — syncWorkspaceRegistry() preserves existing valid entries', () => {
    // Create a minimal real workspace dir for this test so it's self-contained
    const realWs = 'twsync'
    const realWsDir = path.join(WORKSPACES_DIR, realWs)
    fs.mkdirSync(realWsDir, { recursive: true })
    try {
      writeWorkspaceRegistry([realWs, 'phantom'], realWs)
      syncWorkspaceRegistry()
      const reg = parseRegistry()
      assert.ok(reg.names.includes(realWs), `${realWs} should be preserved after sync`)
      assert.ok(!reg.names.includes('phantom'), 'phantom should be removed')
    } finally {
      fs.rmSync(realWsDir, { recursive: true })
    }
  })
})
