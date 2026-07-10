# Session TODO — `flowkit check` activation & cleanup

Stopped mid-verification. Log of exact state and what's left, so this can be picked up cold.

## Current state (verified working, before stopping)

- `scripts/checks/{reporter,ts-parse,screens,config,flowplans,components,db}.js` — all 5 rule
  domains built and tested against deliberately-broken content in both repo mode and a real
  flat-mode consumer project (`temp-test-04/`, real `node_modules` install). All rules fired
  correctly in both.
- `scripts/platform/check.js` — command handlers + `dispatchCheck(sub, rest)` entry point.
  **Not imported by `router.js`** — deliberate. `router.js` has zero trace of `check`
  (confirmed via empty `git diff`).
- `scripts/flowkit.js` (bin entry) — intercepts `check`/`check:*` before calling `route()`,
  only when `!isRepoMode()`. Verified: inert in this repo (falls through to router's "Unknown
  command"), active in a real consumer project (`check` and `check:plans` both confirmed
  working against `temp-test-04/` right before stopping).
- `scripts/platform/router.js`, `scripts/platform/plans.js`, `eslint.config.js` — all confirmed
  byte-identical to git HEAD (fully reverted from the earlier detour).
- `package.json` — `eslint-plugin-boundaries` back to `^6.0.2`, resolver package uninstalled.
- `scripts/helpers/vite-plugin.d.ts` + `FlowScreenProps` export fix — unrelated, earlier
  session fix (not part of check-activation work), should stay.
- Mid-session incident: `scripts/platform/` was accidentally deleted, then restored via
  `git restore` — confirmed fully recovered, CLI works again.

## Not done yet

1. Never re-verified `check:screens`/`check:config`/`check:components`/`check:db` against a
   real consumer project after the accidental delete+restore (only `check` and `check:plans`
   were confirmed in that exact window).
2. Never tested the NEW activation mechanism (flowkit.js interception) against multi-workspace
   consumer mode — only flat mode (`temp-test-04/`) was tested against it.
3. No automated test coverage — everything verified via manual CLI runs only.
4. `docs/CLI.md` / `flowkit help` never updated to document `check`/`check:*` for real users.
5. Fork-step validation explicitly out of scope (documented in flowplans.js's header) — not a
   bug, just a known gap.
6. `agent-workflow-plans/flowlint-strategy.md` describes the old router.js-wired activation
   design, not the current flowkit.js-interception approach — needs a pass once the design is
   finalized.

## Baseline check before resuming

```bash
npm test                     # expect 134/134
npm run test:workspace       # expect 32/32
npx eslint .                  # expect clean
node scripts/flowkit.js help  # expect Mode: repo
node scripts/flowkit.js check # expect "Unknown command: check" (correct — inert here)
```

## Scratch artifacts still on disk

- `temp-test-04/` — flat-mode consumer scaffold, disposable, safe to delete/reuse.
- `temp-docs/agent-dx-study-0{1,2,3}.md`, `-02-questionnaire.md`, `agent-dx-exercises.md`,
  `live-agent-interview-template.md` — from earlier DX-study work, unrelated to this effort.
- `temp-docs/eslint-boundaries-upgrade-findings.md` — describes a fix that was FULLY REVERTED.
  Historically informative only; doesn't describe current repo state.

## Next step when resumed

Run the baseline check, then continue verifying the remaining check:<domain> subcommands
against a real consumer project, then tackle items 3-4 above.
