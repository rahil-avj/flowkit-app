// Single source of truth for what gets removed in the deployment branch.
// Consumed by sync.js for both dry-run display and actual stripping.
//
// This is a SEPARATE mechanism from package.json's "files" field:
//   - STRIP_DIRS/STRIP_FILES here remove paths from the `deployment` git
//     branch's working tree itself.
//   - package.json's "files" independently filters what npm actually packs
//     for `npm publish` or any file:/git-dep install, regardless of branch —
//     see its `!`-negation entries.
// They overlap for scripts/tests, scripts/deploy, and
// scripts/build/format.mjs, kept in sync deliberately. Drift between the two
// (including stale entries that no longer exist on disk) is caught by
// scripts/tests/manifest-consistency.test.js.
//
// NPM_PACKAGE_EXCEPTIONS below lists entries that are intentionally NOT
// mirrored in package.json's files[] — stripped from the deployment branch
// because they're repo-mode-only, but still fine to ship in the npm package
// since they don't do anything harmful if present (they just won't have
// anything to act on in a flat-mode project).

export const STRIP_DIRS = [
  'scripts/tests',
  'scripts/deploy',
  'scripts/flows',
  '.husky',
  'Documentation',
]

export const STRIP_FILES = [
  'eslint.config.js',
  'vitest.config.ts',
  '.prettierrc',
  '.prettierignore',
  'scripts/build/format.mjs',
  'scripts/build/kit-check.js',
]

// Stripped from the deployment branch (repo-mode-only: kit-check.js reads
// src/kits/*, promote.mjs forks flowplans across workspaces — neither concept
// exists in flat mode) but deliberately still included in the npm package.
export const NPM_PACKAGE_EXCEPTIONS = ['scripts/flows', 'scripts/build/kit-check.js']

export const STRIP_DEV_DEPS = [
  'vitest',
  '@vitest/coverage-v8',
  'jsdom',
  'playwright',
  'eslint',
  '@eslint/js',
  'typescript-eslint',
  'eslint-config-prettier',
  'eslint-plugin-react-hooks',
  'eslint-plugin-react-refresh',
  'eslint-plugin-simple-import-sort',
  'eslint-plugin-boundaries',
  'eslint-plugin-tailwindcss',
  'globals',
  'prettier',
  'husky',
  'lint-staged',
]

export const STRIP_NPM_SCRIPTS = [
  'prebuild',
  'lint',
  'lint:fix',
  'test',
  'test:coverage',
  'test:watch',
  'test:workspace',
  'format',
  'format:check',
]

export const STRIP_PACKAGE_KEYS = ['lint-staged']

export const LOCK_DIRS = ['src', 'scripts/lib', 'scripts/cli', 'scripts/agent']

export const LOCK_FILES = ['scripts/flowkit.js', 'scripts/install.js', 'scripts/build/inline.js']
