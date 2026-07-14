// Unit coverage for toKebab() (strings.js) and assertKebab()'s normalize-and-notify
// behavior (validate.js) — added after a real bug: flowkit nw's CLI-arg path
// (`nw:test-2 ` with a trailing space) hard-rejected an otherwise-valid name instead
// of trimming it, while the interactive-prompt path already trimmed. assertKebab now
// forgives common near-misses (whitespace, casing, underscores, stray punctuation) by
// normalizing first, and only hard-rejects names that are still invalid afterward.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { toKebab } from '../helpers/strings.js'
import { assertKebab, ValidationError } from '../helpers/validate.js'

describe('Suite K — toKebab() normalization', () => {
  it('K1 — already-valid kebab-case passes through unchanged', () => {
    assert.equal(toKebab('test-2'), 'test-2')
  })

  it('K2 — trims leading/trailing whitespace', () => {
    assert.equal(toKebab('test-2 '), 'test-2')
    assert.equal(toKebab(' test-2'), 'test-2')
    assert.equal(toKebab('test-2\t'), 'test-2')
  })

  it('K3 — lowercases mixed case', () => {
    assert.equal(toKebab('Test-2'), 'test-2')
  })

  it('K4 — converts underscores to hyphens', () => {
    assert.equal(toKebab('test_2'), 'test-2')
  })

  it('K5 — converts internal spaces to hyphens', () => {
    assert.equal(toKebab('My Test 2'), 'my-test-2')
  })

  it('K6 — collapses repeated separators into one hyphen', () => {
    assert.equal(toKebab('test   2'), 'test-2')
    assert.equal(toKebab('test--2'), 'test-2')
    assert.equal(toKebab('test__2'), 'test-2')
  })

  it('K7 — strips stray punctuation outside [a-z0-9-] (only whitespace/underscore become hyphens)', () => {
    assert.equal(toKebab("test's 2!"), 'tests-2')
  })

  it('K8 — all-invalid input normalizes to empty string', () => {
    assert.equal(toKebab('!!!'), '')
  })

  it('K9 — null/undefined input does not throw', () => {
    assert.equal(toKebab(undefined), '')
    assert.equal(toKebab(null), '')
  })
})

describe('Suite L — assertKebab() normalize-and-notify', () => {
  it('L1 — already-valid input returns unchanged, prints nothing', () => {
    const logs = captureLog(() => {
      const result = assertKebab('test-2', 'name')
      assert.equal(result, 'test-2')
    })
    assert.deepEqual(logs, [])
  })

  it('L2 — trailing space is silently normalized and returned corrected, no notice printed', () => {
    const logs = captureLog(() => {
      const result = assertKebab('test-2 ', 'name')
      assert.equal(result, 'test-2')
    })
    assert.deepEqual(logs, [])
  })

  it('L3 — mixed case + spaces normalizes and prints a notice', () => {
    const logs = captureLog(() => {
      const result = assertKebab('My Test 4', 'name')
      assert.equal(result, 'my-test-4')
    })
    assert.equal(logs.length, 1)
    assert.match(logs[0], /my-test-4/)
    assert.match(logs[0], /My Test 4/)
  })

  it('L4 — underscore input normalizes and prints a notice', () => {
    const logs = captureLog(() => {
      const result = assertKebab('test_underscore_5', 'name')
      assert.equal(result, 'test-underscore-5')
    })
    assert.equal(logs.length, 1)
  })

  it('L5 — leading-digit input still hard-rejects (genuinely invalid, not a typo)', () => {
    assert.throws(() => assertKebab('123', 'name'), ValidationError)
  })

  it('L6 — all-punctuation input still hard-rejects (normalizes to empty)', () => {
    assert.throws(() => assertKebab('!!!', 'name'), ValidationError)
  })

  it('L7 — empty/whitespace-only input still hard-rejects', () => {
    assert.throws(() => assertKebab('   ', 'name'), ValidationError)
    assert.throws(() => assertKebab('', 'name'), ValidationError)
  })

  it('L8 — error message includes the label and original (non-normalized) value', () => {
    try {
      assertKebab('123', 'Workspace name')
      assert.fail('expected assertKebab to throw')
    } catch (e) {
      assert.ok(e instanceof ValidationError)
      assert.match(e.message, /Workspace name/)
      assert.match(e.message, /123/)
    }
  })
})

/** Runs fn(), capturing console.log calls, and returns them as an array of strings. */
function captureLog(fn) {
  const original = console.log
  const logs = []
  console.log = (...args) => logs.push(args.join(' '))
  try {
    fn()
  } finally {
    console.log = original
  }
  return logs
}
