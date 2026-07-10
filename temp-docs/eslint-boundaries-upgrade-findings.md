# ESLint Boundaries Enforcement — Upgrade & Newly-Surfaced Findings

**Date:** 2026-07-10
**Context:** discovered while adding a `workspace` boundaries rule for `flowkit check`'s
groundwork (see `agent-workflow-plans/flowlint-strategy.md`). Not part of that task's original
scope — surfaced as a side effect and documented separately per that reasoning.

## What was found

`eslint-plugin-boundaries` has been configured in `eslint.config.js` since early in this repo's
history (`shared`/`core`/`features`/`modes`/`app` layer rules), but **had never actually
enforced anything** — confirmed via direct reproduction of the plugin's own README example,
which failed silently (zero errors) on an intentionally-invalid case. Root cause: the installed
version pairing (`eslint-plugin-boundaries@6.0.2` + its pinned `@boundaries/elements@2.0.1`
dependency) has a genuine upstream bug in element-pattern matching — confirmed by testing the
core `@boundaries/elements` package in isolation with the exact settings shape its own docs
specify, which still failed to classify any file at all.

## Fix applied

- Upgraded `eslint-plugin-boundaries` to `7.0.2` (pulls a fixed `@boundaries/elements@3.0.1`).
- Migrated `eslint.config.js`'s config to v7's shape (breaking changes from v6):
  - `boundaries/elements` patterns now correctly understood as **folder-level** classifiers
    (`src/shared`, not `src/shared/**/*`) — v7 emits an explicit warning if a pattern looks
    file-shaped where a folder is expected.
  - `app` (previously `{ type: 'app', pattern: 'src/App.tsx' }`, a single file) moved to
    `boundaries/files` (`{ category: 'app', pattern: 'src/App.tsx' }`) instead of
    `boundaries/elements`, since element patterns are folder-based and file-based
    classification is a separate, dedicated mechanism in this version.
  - `boundaries/dependencies`'s `rules`/`{ type: 'x' }` shorthand migrated to `policies`/
    `{ element: { types: 'x' } }` (`rules` still works but is deprecated with a warning).
  - Added `import/resolver` (`eslint-import-resolver-typescript`, new devDependency) and
    `boundaries/root-path`, both required for the plugin to resolve `@platform`/`@shared`/etc.
    path aliases back to real file paths at all — without them, only literal relative-path
    imports could ever be classified, which doesn't match how `CLAUDE.md` instructs imports to
    be written in this codebase (aliases only).
  - Added the new `workspace` element (`workspaces/*/flows`) + a `disallow`-everything policy,
    the original task this was all in service of.
- Verified: the plugin's own no-unknown-files/dependencies rules now correctly flag a
  deliberately-reintroduced test violation (`shared` importing `../features/...`), a case that
  silently passed before the upgrade. Full vitest suite (134 tests) still green — the upgrade
  only affects lint output, not test/build behavior.

## Newly-surfaced findings — NOT fixed, left for deliberate triage

Now that enforcement genuinely works for the first time, `npx eslint .` reports **43 errors
across 11 pre-existing `src/` files** that were always violations per `CLAUDE.md`'s documented
layer rules, just never caught:

**`core → features`** (disallowed — `core` may only depend on `shared`):
- `src/core/canvas/PreviewCanvas.tsx`
- `src/core/layout/FlowEngine.ts`
- `src/core/layout/FlowMaster.tsx`
- `src/core/layout/KitSideExplorer.tsx`
- `src/core/layout/KitSideInspector.tsx`
- `src/core/shortcuts/useKeyboardShortcuts.ts`

**`shared → core` / `shared → features`** (both disallowed — `shared` is the foundation layer,
may only depend on itself):
- `src/shared/components/mobile/MobileCanvas.tsx`
- `src/shared/components/overlays/ActionCenter.tsx`
- `src/shared/components/overlays/Settings.tsx`
- `src/shared/contexts/DevModeContext.tsx`
- `src/shared/contexts/FlowLensModeContext.tsx`
- `src/shared/utils/useWorkspaceHierarchy.ts`

Per explicit decision: **none of these 11 files were touched.** Each violation needs a real call
— either the import is a genuine architecture violation that should be rewired to respect the
layer boundary, or `CLAUDE.md`'s documented rules are stricter than actual legitimate practice
in these specific cases and should be loosened (e.g. maybe `shared` genuinely needs one specific,
narrow escape hatch to `core`/`features` that the current policy doesn't account for). That
judgment call belongs to whoever owns this architecture, not to a drive-by fix while working on
an unrelated task.

## Also found, in service of the original task — RESOLVED

The repo-mode workspace scaffold generator (`scripts/helpers/scaffold.js`, used by `flowkit nw`)
writes screen files importing `useDashboard` from `@platform/shared/contexts` — flagged by the
new `workspace` boundaries rule as a `workspace → shared` violation, which also broke a real
test (`scripts/tests/workspace-cli.test.js`'s B4, asserting scaffold-generated screens pass
ESLint). Confirmed this is the platform's actual, intended screen-to-db/simulator contract
(`useDashboard()`), not an accidental layer leak — so per explicit decision, the fix was to
**loosen the policy narrowly, not change the scaffold**:

- Added a new, more-specific `sharedContexts` element (`src/shared/contexts`, matched before
  the broader `shared` pattern) in `eslint.config.js`.
- Granted `workspace → sharedContexts` only — `workspace` still cannot reach the rest of
  `shared`, or `core`/`features`/`modes` at all.
- Verified the exception is genuinely narrow, not a backdoor: a workspace screen importing
  `@platform/shared/contexts` passes; a workspace screen importing anything else in `shared`
  (tested against a real file, `src/shared/constants/zIndex.ts`) still correctly fails.
- `npm run test:workspace` (32/32) and `npm test` (134/134) both green after the fix.

## Files changed

- `package.json` / `package-lock.json` — `eslint-plugin-boundaries` 6.0.2 → 7.0.2,
  `eslint-import-resolver-typescript` added (new devDependency)
- `eslint.config.js` — see "Fix applied" above
