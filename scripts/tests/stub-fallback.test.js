import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import { ROOT, WORKSPACES_FILE } from './helpers.js'

describe('Suite E — Runtime workspace selection static assertions', () => {
  it('E1 — src/workspace-stub/ exists as fallback for @workspace alias', () => {
    const p = path.join(ROOT, 'src/workspace-stub')
    assert.ok(
      fs.existsSync(p),
      'workspace-stub/ must exist as fallback when no workspace is active'
    )
  })

  it('E2 — tsconfig.app.json has @workspace/* pointing to active workspace + stub fallback', () => {
    const tsconfigPath = path.join(ROOT, 'tsconfig.app.json')
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
    const alias = tsconfig.compilerOptions?.paths?.['@workspace/*']
    assert.ok(
      Array.isArray(alias) && alias.length > 0,
      `@workspace/* must exist in tsconfig for screen imports, got: ${JSON.stringify(alias)}`
    )
  })

  it('E3 — NoWorkspace.tsx contains expected user-facing text', () => {
    const p = path.join(ROOT, 'src/shared/components/errors/NoWorkspace.tsx')
    assert.ok(fs.existsSync(p), 'NoWorkspace.tsx missing')
    const src = fs.readFileSync(p, 'utf8')
    assert.ok(src.includes('No workspace'), 'NoWorkspace.tsx must contain "No workspace" text')
    assert.ok(src.includes('npm run cli'), 'NoWorkspace.tsx must reference npm run cli')
    assert.ok(src.includes('onAction'), 'NoWorkspace.tsx must use onAction prop')
  })

  it('E4 — src/workspaces.ts exports getStoredWorkspace and storeWorkspace helpers', () => {
    const src = fs.readFileSync(WORKSPACES_FILE, 'utf8')
    assert.ok(src.includes('getStoredWorkspace'), 'getStoredWorkspace must be exported')
    assert.ok(src.includes('storeWorkspace'), 'storeWorkspace must be exported')
    assert.ok(src.includes('LS_ACTIVE_WORKSPACE'), 'LS_ACTIVE_WORKSPACE key must be defined')
  })

  it('E5 — src/workspaces.ts does not export active or switchWorkspace (removed)', () => {
    const src = fs.readFileSync(WORKSPACES_FILE, 'utf8')
    assert.ok(!src.includes('export const active'), 'active export should be removed')
    assert.ok(
      !src.includes('export function switchWorkspace'),
      'switchWorkspace export should be removed'
    )
  })
})
