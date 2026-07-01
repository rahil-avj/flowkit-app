# Gap Analysis — FlowKit Package Vision Plan vs. Actual State

> Audit date: 2026-07-01. Compares [think-thrugh-what-we-snug-thacker.md](./think-thrugh-what-we-snug-thacker.md) against the repo as it actually stands on `r/deployBuild`. Three parallel audits (Phase 1 packaging, Phase 3 Vite plugin, Phase 4 CLI flat-mode) plus direct verification of the highest-risk claims.

## Headline

The plan is **further along than its own framing suggests** — Phase 3, billed as "the hardest phase," is essentially complete, including the migration gate (Step 3.7: this repo now consumes its own `flowkit/vite` plugin). What's left is mostly small, concrete bugs rather than open design work. Two of those bugs are real shipping blockers; the rest are polish.

Separately, two issues were found and **already fixed this session**, outside the plan's original scope — see "Cross-cutting" below.

---

## Phase 1 — Package Foundation

| Item                                   | Status                               | Detail                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `files` field                          | ✅ PASS                              | All required entries present.                                                                                                                                                                                                                                                                                                                                                                                    |
| `exports` field structure              | ✅ PASS                              | Correct Node (`.`) / Vite (`./vite`) split.                                                                                                                                                                                                                                                                                                                                                                      |
| `exports["."].types` path              | 🔴 **BUG**                           | Declares `./dist/types/index.d.ts`. Actual emitted file is `./dist/types/types/index.d.ts` (the public `src/types/index.ts` entry compiles preserving its `types/` subpath). **Any consumer's TypeScript tooling resolving `flowkit`'s types will fail to find them.** Fix: either change the exports path to match, or change `tsconfig.build.json`'s rootDir/structure so `index.d.ts` lands at the top level. |
| `tsconfig.build.json` scoping          | ✅ PASS                              | Correctly scoped to public API only.                                                                                                                                                                                                                                                                                                                                                                             |
| `vite.lib.config.ts` + `build:lib`     | ✅ PASS                              | Verified directly — `npm run build:lib` succeeds, produces `dist/lib/index.js` + `dist/types/`.                                                                                                                                                                                                                                                                                                                  |
| React in peerDeps + devDeps            | ✅ PASS                              |                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Radix UI in peerDeps + devDeps         | 🟡 **GAP**                           | Still only in `dependencies`. Plan required peerDeps+devDeps for React _and_ Radix UI. Low risk today (nothing consumes the npm package yet) but will bloat every author's install once published, and Radix version conflicts become the author's problem instead of theirs to control.                                                                                                                         |
| `packages/` survives `sync:deployment` | ✅ functionally fine, 🟡 design note | `manifest.js` is a pure deny-list (`STRIP_DIRS`); `packages/` isn't in it, so it survives by omission, not by the "explicit whitelist" the plan described. No allow-list mechanism exists in this architecture at all — not worth building one just for this, but worth knowing it's implicit.                                                                                                                   |
| Scaffold `CLAUDE.md` is thin           | ✅ PASS                              | Verified — pointer-only, no duplicated CLI reference.                                                                                                                                                                                                                                                                                                                                                            |

**Phase 1 verdict:** One real bug (types path), one real gap (Radix deps), one cosmetic note. Fixable in under an hour.

---

## Phase 2 — create-flowkit-app Scaffolder

✅ **PASS**, with a plan amendment made live today: the original target name `create-flowkit` is squatted by an unrelated package on the npm registry (abandoned, last published ~1 year ago, does nothing). Renamed to `create-flowkit-app` everywhere — package name, bin, usage text, the flat-mode deprecation message in `scripts/cli/workspace.js`, and the author guide. Verified end-to-end: scaffold → `npm install` → `npm run dev` serves `HTTP 200`. **Not yet published to npm** — deliberate, separate decision (registry names aren't fully reclaimable after publish).

---

## Phase 3 — Vite Plugin

✅ **Essentially complete.** Every individual requirement passed direct audit:

- Config loading via esbuild → temp `.mjs` → `import()` (not `loadConfigFromFile`) ✅
- `@workspace` alias, `server.fs.allow`/`optimizeDeps.include` for `node_modules/flowkit/src`, `optimizeDeps.exclude`, `VITE_SINGLE_WORKSPACE` define ✅
- `reconcileWorkspacesPlugin` correctly gated off in flat mode (`vite.config.ts:176`) ✅
- `virtual:flowkit/screens` and `virtual:flowkit/config` implemented with `resolveId`/`load` ✅ (plus two beyond plan: `virtual:flowkit/workspace`, `virtual:flowkit/flowplans`)
- HMR: `configureServer` + `handleHotUpdate` watch `./flows/**` and invalidate virtual modules ✅
- TS declarations for all virtual modules in `vite-env.d.ts` ✅
- **Step 3.5 (the actual hard part):** the engine's `import.meta.glob` calls for screens/flowplans/db/config have been migrated to the virtual modules (`workspaceModules.ts`, `useWorkspaceHierarchy.ts`, `useSessionLibrary.ts`). The globs that remain (`PreviewCanvas.tsx`'s workspace-logo lookup, `FlowLensModeContext.tsx`'s FlowLens-presence check) are correctly _not_ migrated — they serve repo-mode-only purposes, not author screen loading.
- **Step 3.7 (the migration gate):** this repo's own `vite.config.ts` already imports and uses `flowkit/vite` (`scripts/vite-plugin.js`) — the gate that was supposed to block this phase from landing on `deployment` has already been cleared.

No blockers found in Phase 3.

---

## Phase 4 — CLI Flat Mode

| Item                                                              | Status                            | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isRepoMode()` / `workspacePath()`                                | ✅ PASS                           | Correct after today's safety fix (keys off `node_modules` membership in `ROOT`, not directory existence in CWD).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `sessions/*`, `feedback.js`, `dump.js`, `handoff.js`, `status.js` | ✅ PASS                           | All correctly call `workspacePath()`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `export.js`                                                       | 🟡 **GAP**                        | Most of the file is correctly threaded, but line 108 has a leftover hardcoded path: `npx eslint workspaces/${wsName} --max-warnings 0`. Will fail/no-op against the wrong directory in flat mode. One-line fix — use `workspacePath(wsName)`.                                                                                                                                                                                                                                                                                                                                                        |
| `flowkit nw` / `flowkit rw` flat-mode guard                       | ✅ PASS                           | Both now correctly print the flat-mode message and exit (the `rw` guard was added today as part of the safety fix).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| FlowLens session-save path                                        | 🟡 **GAP**                        | The plan specified this should be config-driven, defaulting to `./lib/flowLens/sessions/`. Actual implementation (`vite.config.ts:99` flat / `:106` repo, and `scripts/vite-plugin.js:188`) hardcodes the path per-branch instead of reading it from `flowkit.config.ts`. Works correctly today, but an author has no way to relocate session storage without editing the plugin itself.                                                                                                                                                                                                             |
| Existing-workspace migration                                      | 🔶 **DEVIATION, needs your call** | The plan called for "a documented one-time migration" of `workspaces/nClarity` to `import from 'flowkit'`. Instead, commit `405c8f7` deleted it outright as part of decommissioning. `workspaces/` now exists only as an empty directory with `.gitkeep`. If nClarity's content was meant to survive as a reference implementation, it's gone from the working tree (still recoverable from git history pre-`405c8f7` if needed). If the repo is intentionally repositioning as template/demo-only, this is fine as-is — just confirm that's the actual intent, since the plan didn't anticipate it. |

---

## Cross-cutting issues found this session (not in the original plan)

These aren't gaps in the plan's design — they're real bugs the plan's authors couldn't have anticipated, discovered and **already resolved** today:

1. **🔴 `create-flowkit` npm name collision** — the plan's target command (`npm create flowkit@latest`) can never work; that exact registry name belongs to an unrelated, abandoned package. Fixed by renaming to `create-flowkit-app` (plan and code both updated).
2. **🔴 Catastrophic `isRepoMode()` bug, already caused one real incident** — `isRepoMode()` keyed off whether `workspaces/` exists in CWD, which broke the moment this repo's own `workspaces/` dir was removed (the decommission deviation above). Once broken, `workspacePath(name)` silently fell back to `process.cwd()`, and `flowkit rw` (also exercised internally by `npm test`'s lifecycle suite) deleted the entire repo root on a confirmed `rw` call. Root-caused, fixed (keyed off `node_modules` membership instead), and hardened with an explicit `assertScopedWorkspaceDir()` guard at every workspace-delete call site as defense in depth. Verified against the test suite's own `rw` lifecycle tests.

---

## Punch list, prioritized

**Before this can be called "done":**

1. Fix `exports["."].types` path mismatch (Phase 1) — breaks type resolution for any real consumer.
2. Fix `export.js:108` hardcoded `workspaces/${wsName}` (Phase 4) — breaks `flowkit export` in flat mode.
3. Decide on the `workspaces/nClarity` deletion — confirm it's intentional, or restore from git history if not.

**Worth doing, not urgent:** 4. Move Radix UI packages to peerDeps+devDeps (Phase 1). 5. Make FlowLens session-save path config-driven instead of hardcoded per mode (Phase 4). 6. Decide whether `npm publish` for `create-flowkit-app` happens now or later (Phase 2 — deliberately held off so far).

Nothing else blocks calling Phases 1, 3, and the bulk of Phase 4 complete.
