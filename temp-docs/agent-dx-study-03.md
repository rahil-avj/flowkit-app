# FlowKit Manual Exercise — Report 03 (Flat → Multi-Workspace Conversion, Live Authoring)

**Date:** 2026-07-10
**Monorepo commit (start):** `f4ab810bda9db382ebf7945757b92141a6a6bf0e`
**Scaffold:** `temp-test-03/` (flat mode, fresh, via `create-flowkit-app --local-dev`), later converted to multi-workspace mode
**Previous runs:** [Report 01](agent-dx-study-01.md) (task execution, sub-agent), [Report 02](agent-dx-study-02.md) (docs comprehension, sub-agent) — this run is different from both: a **manual, hands-on exercise** driven directly by the orchestrating session, not a sub-agent study. Goal: exercise the exact workflow — scaffold → add real content → convert to multi-workspace mode → keep authoring in the converted state — and catch anything broken along the way, including re-testing fixes made earlier today (F1/F6/F7) against a live, freshly-created project.

## What was done

1. Scaffolded `temp-test-03/` fresh via `create-flowkit-app --local-dev`.
2. Created a new flow (`settings`) with two screens (`profile`, `notifications`) and a flowplan with two steps, all via the live CLI (`create:flow`, `create:screen`, `create:flowplan`, `add:step`).
3. Ran `tsc --noEmit` / `npm run build` as a baseline check before converting.
4. Converted to multi-workspace mode (`flowkit convert:multi`) — original content moved into `workspace-1/`.
5. Created a second workspace (`app-b`) and added a screen to it, to test cross-workspace isolation and confirm the fix generalizes beyond the workspace that existed at conversion time.
6. Re-ran `tsc --noEmit`, `npm run build`, `npm run dev` (HTTP boot check) against the full converted, multi-workspace project.
7. Ran the full monorepo test suite (134 vitest + 32 integration tests) + lint after all fixes.

## Findings

### F9 (Critical, NEW — found and fixed during this exercise) — `create:screen`'s own template hardcodes a repo-mode-only import, breaking every screen it creates in flat/multi-workspace consumer projects

- **Where:** `scripts/authoring/screens.js`'s `screenTemplate()` — generated `import type { FlowScreenProps } from '@platform/types'` unconditionally, regardless of mode.
- **Impact:** `@platform/types` only resolves in repo mode (a real tsconfig/vite alias there). In flat or multi-workspace consumer mode, this import is unresolvable — confirmed via direct reproduction: creating `settings/profile` and `settings/notifications` via `create:screen` in `temp-test-03` produced `TS2307: Cannot find module '@platform/types'` on both, immediately, before any other code was written.
- **Why earlier today's F1 fix didn't catch this:** F1 (from Report 01) fixed the _scaffolder's_ initial content generator (`workspace-template.js`, used once at project creation) to correctly import from `'flowkit'` in consumer mode. It did not touch `create:screen` — a completely separate code path used every time an author adds a screen _after_ scaffolding, in any mode, for the lifetime of the project. This means F1's fix was necessary but not sufficient — the exact same class of bug existed in the live authoring command and had never been exercised by Report 01's study (which used the scaffolder's initial screens, not `create:screen`-authored ones, for its `tsc` checks).
- **Fix:** Added `resolveTypeImport()` to `scripts/helpers/paths.js` (parallel to the existing `resolveDefineImport()` helper, same mode-branch pattern), and switched `screenTemplate()` to use it. Verified: freshly created screens in both flat mode (`temp-test-03` pre-conversion) and multi-workspace mode (`app-b`, a workspace created _after_ conversion) both correctly import `from 'flowkit'`.
- **Severity:** Critical — same class/impact as F1 (silent `tsc --noEmit` false-failure on ordinary, correct usage), and arguably worse discoverability since it fires on the single most common authoring action (adding a screen), not just at initial scaffold time.

### F10 (Medium, NEW — found and fixed during this exercise) — `create:screen`'s generated placeholder fails `noUnusedLocals` on arrival

- **Where:** Same template, `{ onNext, db }` destructured but never used in the placeholder body (`{/* Build your screen here */}`).
- **Impact:** With `noUnusedLocals: true` (the scaffolder's default `tsconfig.json`), every screen created via `create:screen` fails `TS6198: All destructured elements are unused` immediately, independent of and in addition to F9.
- **Fix:** Prefixed both destructured bindings with `_` (`{ onNext: _onNext, db: _db }`), matching the underscore-exemption convention already used elsewhere in this codebase's lint config.
- **Severity:** Medium — real, but a much smaller blast radius than F9 once F9 is fixed (F9 was a hard resolution failure; this is a strictness-policy false-positive on an intentionally-unused placeholder).

### F11 (Low-Medium, NEW — reproducible but NOT fixed, flagged for follow-up) — pre-existing scaffold screens fail `tsc --noEmit` with `db` typed as `{}`, but only in flat-mode's specific project state

- **Where:** `HomeScreen.tsx`, `DetailScreen.tsx`, `SetupScreen.tsx`, `ReadyScreen.tsx` — all generated by the scaffolder (`workspace-template.js`), not by live authoring.
- **Symptom:** `db?.items` / `db?.user?.name` etc. fail with `db` apparently typed as `{}` rather than the expected `Record<string, unknown>` default from `FlowScreenProps`'s generic.
- **Investigation done:** Isolated repro attempts (identical code in a standalone new `.ts`/`.tsx` file, a literal file-copy under a different name, direct probing of `FlowScreenProps['db']`'s resolved type) all typechecked **cleanly** — the bug did not reproduce outside the real project file at its real path. This points to something project-state-dependent (likely `tsconfig.json`'s `include` glob resolution or a project-wide declaration/module-scoping quirk specific to flat mode's structure), not a defect in `FlowScreenProps` itself or in the screen code.
- **Resolution status:** **Not fixed.** After converting to multi-workspace mode, this error disappeared entirely — the exact same files (moved into `workspace-1/`, byte-for-byte identical content) typecheck cleanly post-conversion. This is a real, reproducible finding but its root cause is specific to flat mode's tsconfig/glob setup in a way that didn't yield to isolated reproduction within the time proportionate to spend on a third, distinct bug during this exercise. Flagged as an open follow-up rather than guessed at further.
- **Severity:** Low-Medium — real (confirmed via direct `tsc --noEmit` runs, not assumed), but self-resolves upon the exact conversion this exercise was built around, and doesn't block `npm run build`/`npm run dev` (both succeed regardless, consistent with F1's original finding that `tsc --noEmit` overreports failures relative to real build health in this platform).

### Working well

- **`convert:multi` itself worked flawlessly** — clean conversion, correct `workspace-1/` restructure, correct `vite.config.ts` rewrite (matches the template fixed in this session's earlier `create-flowkit-workspace` vite-config-drift fix), mode detection immediately correct (`flowkit help` → `Mode: consumer`, active workspace → `workspace-1`).
- **Workspace isolation after conversion is exactly correct** — `create:workspace --name:app-b` produced a fully independent sibling workspace; `list:screens --workspace:<name>` correctly scoped to each, zero cross-contamination between `workspace-1`'s custom `settings` flow and `app-b`'s separate scaffold content.
- **The fix generalizes correctly across the mode transition** — screens created in `app-b` (a workspace that didn't exist until _after_ conversion) correctly used the fixed `resolveTypeImport()` path, confirming the fix isn't scaffold-time-specific or tied to any particular workspace's creation order.
- **Full monorepo suite unaffected**: 134 vitest + 32 integration tests pass, lint clean, after all three new fixes (F9, F10) plus this session's earlier F1/F6/F7 fixes.
- **`npm run build` and `npm run dev` both succeed cleanly** on the fully converted, multi-workspace project with custom content from two different workspaces.

## Verification summary

| Check                                                              | Result                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `tsc --noEmit` on fresh flat-mode scaffold + new screens (pre-fix) | FAIL — `@platform/types` unresolvable (F9)                                    |
| `tsc --noEmit` on same, post-F9/F10 fix                            | New screens clean; F11's pre-existing scaffold errors remain (flat mode only) |
| `convert:multi`                                                    | PASS — clean conversion, correct structure                                    |
| `tsc --noEmit` post-conversion (full project, 2 workspaces)        | **PASS — exit 0** (F11 self-resolves post-conversion)                         |
| `npm run build` post-conversion                                    | PASS — clean, known chunk-size warning only                                   |
| `npm run dev` post-conversion                                      | PASS — HTTP 200                                                               |
| Workspace isolation (`list:screens` per workspace)                 | PASS — correct scoping, zero leakage                                          |
| Full monorepo test suite + lint                                    | PASS — 134 + 32 tests, clean lint                                             |

## Open questions / follow-ups

- **F11 needs a dedicated root-cause pass** — specifically comparing flat mode's `tsconfig.json`/glob `include` resolution against multi-workspace mode's, to understand why identical code behaves differently. Isolated repro attempts didn't reproduce it, so the next step is likely comparing the two `tsconfig.json`s' `include` fields directly and/or testing with `--listFiles`/`--explainFiles` to see what's actually being included differently between the two modes.
- **Any other authoring command besides `create:screen` worth auditing for the same class of bug as F9?** This exercise only found it because a fresh flow/screen/flowplan cycle was run manually — worth a systematic grep-based sweep (already partially done: confirmed `flowplans.js` correctly uses the existing `resolveDefineImport()` helper, and `components.js`'s only reference is a non-compiled usage comment, not a real import) across the rest of `scripts/authoring/*.js` for any other hardcoded `@flowkit`/`@shared`/`@core` reference in generated _code_ (not comments).
