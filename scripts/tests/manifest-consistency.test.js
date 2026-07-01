import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import { ROOT } from '../lib/config.js'
import { NPM_PACKAGE_EXCEPTIONS, STRIP_DIRS, STRIP_FILES } from '../deploy/manifest.js'

// manifest.js's deployment-branch strip list and package.json's "files" field
// are two separate mechanisms that overlap in purpose (see the comment above
// STRIP_DIRS in manifest.js). These tests catch the two ways they can drift
// apart: a strip entry that no longer exists on disk, and a strip entry with
// no matching files[] exclusion that isn't a documented, intentional
// exception.

describe('Suite M — manifest.js / package.json files[] consistency', () => {
  it('M1 — every STRIP_DIRS/STRIP_FILES entry exists on disk', () => {
    for (const entry of [...STRIP_DIRS, ...STRIP_FILES]) {
      assert.ok(
        fs.existsSync(path.join(ROOT, entry)),
        `manifest.js references "${entry}" but it does not exist on disk — stale entry?`
      )
    }
  })

  it('M2 — every strip entry package.json would otherwise ship is excluded or a documented exception', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    const files = pkg.files ?? []
    const positives = files.filter(f => !f.startsWith('!')).map(f => f.replace(/\/$/, ''))
    const negations = files.filter(f => f.startsWith('!')).map(f => f.slice(1).replace(/\/$/, ''))

    // "files" is an allowlist — an entry only needs an explicit "!" negation
    // if a positive pattern would otherwise include it (e.g. everything under
    // "scripts/"). Top-level dotfiles/configs like .husky or eslint.config.js
    // are never matched by any positive pattern, so they're already excluded
    // by omission and don't need one.
    const wouldBeIncluded = entry => positives.some(p => entry === p || entry.startsWith(p + '/'))

    const toCheck = [...STRIP_DIRS, ...STRIP_FILES].filter(
      entry => !NPM_PACKAGE_EXCEPTIONS.includes(entry) && wouldBeIncluded(entry)
    )
    for (const entry of toCheck) {
      const hasNegation = negations.includes(entry)
      assert.ok(
        hasNegation,
        `"${entry}" is stripped from the deployment branch and would otherwise be shipped ` +
          `by package.json's "files" field. Either add "!${entry}" to files[], or add ` +
          `"${entry}" to NPM_PACKAGE_EXCEPTIONS in manifest.js with a reason.`
      )
    }
  })

  it('M3 — every documented exception is actually in STRIP_DIRS or STRIP_FILES', () => {
    const known = new Set([...STRIP_DIRS, ...STRIP_FILES])
    for (const exception of NPM_PACKAGE_EXCEPTIONS) {
      assert.ok(
        known.has(exception),
        `"${exception}" is in NPM_PACKAGE_EXCEPTIONS but isn't in STRIP_DIRS/STRIP_FILES — ` +
          `remove it, it's not actually an exception to anything.`
      )
    }
  })

  it('M4 — the repo-root marker file (.flowkit-repo-root) is never shipped by files[]', () => {
    // scripts/lib/paths.js's isRepoMode() relies on this file's absence in any
    // real install (npm registry, git dep, or file: dep, symlinked or copied)
    // to distinguish flat mode from the real monorepo checkout. If a future
    // files[] pattern ever widens to catch it, isRepoMode() silently breaks
    // for every consumer at once.
    assert.ok(
      fs.existsSync(path.join(ROOT, '.flowkit-repo-root')),
      '.flowkit-repo-root is missing from the repo — isRepoMode() depends on it existing'
    )

    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    const positives = (pkg.files ?? []).filter(f => !f.startsWith('!')).map(f => f.replace(/\/$/, ''))
    const wouldBeIncluded = positives.some(
      p => '.flowkit-repo-root' === p || '.flowkit-repo-root'.startsWith(p + '/')
    )
    assert.ok(
      !wouldBeIncluded,
      '.flowkit-repo-root would be shipped by package.json "files" — this breaks isRepoMode() ' +
        'for every flat-mode install. Do not add it to files[].'
    )
  })
})
