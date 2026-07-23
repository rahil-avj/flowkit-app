import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import { ROOT } from '../helpers/paths.js'
import { workspaceScaffold } from '../helpers/scaffold.js'
import { FLOW_BOOK_DIRNAME } from '../helpers/config-filenames.js'

// scripts/helpers/scaffold.js (repo mode) and scripts/helpers/workspace-template.js
// (the one shared source used by create-flowkit-app, create-flowkit-workspace,
// and this repo's own `flowkit create:workspace` command — see that file's module
// doc-comment) hand-port the same demo content in two places. Screen/flow id
// naming has already drifted between the two (scaffold.js suffixes ids with
// -screen/-flow, workspace-template.js doesn't) so this only checks
// structural shape — screen and flow counts — not exact ids or content. It
// exists to catch someone adding/removing a demo screen or flow in one file
// without the other, not full parity.
//
// scaffold.js returns one flat object-literal file map (keyed by
// `${FLOW_BOOK_DIRNAME}/<flow>/<screen>/File.tsx`, no per-screen generator functions),
// while workspace-template.js instead defines one `write*Screen(dir, language)` function per
// demo screen. The extraction logic below is intentionally asymmetric to match each file's
// actual current shape.

const TEMPLATE_PATH = 'scripts/helpers/workspace-template.js'

describe('Suite N — scaffold.js / create-flowkit-app demo-content parity', () => {
  it('N1 — same number of demo flows in scaffold.js and create-flowkit-app', () => {
    const files = workspaceScaffold('demo')
    const flowIds = new Set(
      Object.keys(files)
        .filter(p => p.startsWith(`${FLOW_BOOK_DIRNAME}/`) && p.endsWith('.tsx'))
        .map(p => p.split('/')[1])
    )

    const templateSrc = fs.readFileSync(path.join(ROOT, TEMPLATE_PATH), 'utf8')
    const chaptersArrayMatch = templateSrc.match(/chapters:\s*\[([^\]]*)\]/)
    assert.ok(chaptersArrayMatch, `${TEMPLATE_PATH} has no chapters: [...] array to compare against`)
    const templateFlowCount = chaptersArrayMatch[1].split(',').filter(s => s.trim()).length

    assert.equal(
      flowIds.size,
      templateFlowCount,
      `scaffold.js has ${flowIds.size} demo flow(s) (${[...flowIds].join(', ')}) but ` +
        `${TEMPLATE_PATH}'s chapters: [...] array has ${templateFlowCount} — demo content has drifted`
    )
  })

  it('N2 — same number of demo screens in scaffold.js and create-flowkit-app', () => {
    const files = workspaceScaffold('demo')
    const screenCount = Object.keys(files).filter(
      p => p.startsWith(`${FLOW_BOOK_DIRNAME}/`) && p.endsWith('.tsx')
    ).length

    const templateSrc = fs.readFileSync(path.join(ROOT, TEMPLATE_PATH), 'utf8')
    // Each demo screen has its own write*Screen(dir, language) generator function.
    const cfaScreenWriters = templateSrc.match(/^export function write\w+Screen\(/gm) ?? []

    assert.equal(
      screenCount,
      cfaScreenWriters.length,
      `scaffold.js scaffolds ${screenCount} demo screen(s) but ${TEMPLATE_PATH} ` +
        `defines ${cfaScreenWriters.length} write*Screen() generator(s) — demo content has drifted`
    )
  })
})
