# Flat-mode export support — running to-do list

(Holding notes only, per user request — detailed design deferred until they say to write it up properly.)

## Context so far

- `flowkit export` / `flowkit export:full` are currently repo-mode-only, gated by `requireRepoMode()` in `scripts/cli/export.js:73`.
- User considers flat-mode export support important enough to prioritize.
- Explicit instructions:
  - Do **not** touch the existing `export` / `export:full` commands.
  - Make a **separate, new command** for flat-mode export instead.
  - `watch` does not need flat-mode support — can stay repo-only, deprioritized/dropped from scope.

## Open items / to-do

- [ ] Decide the new command's name (not `export`/`export:full` — something distinct)
- [ ] Read `scripts/cli/export.js` in full to understand what repo-mode export actually does (workspace enumeration prompt, single-file HTML build via `vite.config.standalone.ts` + `inline.js`, FlowLens inclusion for `export:full`) and figure out which parts translate directly to flat mode (single implicit workspace, no prompt needed) vs. need new logic
- [ ] Check `scripts/build/inline.js` and `vite.config.standalone.ts` for any repo-mode assumptions (workspace path resolution, `FLOWKIT_WORKSPACE` env var usage) that the new flat-mode command needs to account for
- [ ] Determine whether flat mode needs its own standalone-build vite config or can reuse the existing one by pointing `FLOWKIT_WORKSPACE`/cwd correctly
- [ ] Decide FlowLens-included variant naming/flagging for the new command (mirroring `export` vs `export:full`)
- [ ] Wire the new command into `scripts/cli/router.js` dispatch table
- [ ] Update `scripts/cli/help.js` and `docs/CLI.md` for the new command
- [ ] Verification plan: scaffold a flat-mode test project (or simulate via `.flowkit-repo-root` absence) and confirm the new export command produces a working standalone HTML file

## Explicitly out of scope

- Modifying `flowkit export` / `flowkit export:full` in any way
- Adding flat-mode support to `flowkit watch`
