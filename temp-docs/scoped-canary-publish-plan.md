# Scoped npm Publish Rehearsal (`@rahil316/*`)

> Saved 2026-07-10 for later execution — not yet run. See `temp-docs/npm-checklist.md` for the
> real unscoped publish checklist this plan feeds into (Phases 0-6 there are all complete).

## Context

`flowkit`, `create-flowkit-app`, and `create-flowkit-workspace` have passed every pre-publish check that can be done without touching the real npm registry (Phases 0-6 of `temp-docs/npm-checklist.md`, including a fresh `create-flowkit-workspace` smoke test and removal of `flowkit/package.json`'s `"private": true` flag). What's never been exercised is the **real** `npm publish` → real registry `npm install`/`npm create` path — everything so far used `file:` installs or `--local-dev`, which never touch the registry at all.

Publishing the real unscoped names directly carries real consequences (Phase 1 of the checklist already flags unscoped names as effectively permanent once claimed — see prior conversation on scope vs. access-level reversibility). The decision: rehearse the entire mechanism first under a personal scope (`@rahil316/*`), which is a completely separate, disposable registry identity with zero effect on the unscoped names. Once the scoped rehearsal proves the publish → install → scaffold → build loop works end-to-end, the same steps are repeated for real under the unscoped names, targeting `0.1.0` directly on `latest` (no separate beta dist-tag needed for the unscoped release, since the beta/canary testing already happened under the scope).

`@rahil316/*` is not a one-time throwaway — it's being kept permanently as an ongoing pre-release/canary testing ground for future versions. So this isn't "publish, test, delete" — it's "publish, test, leave it, and build a **reusable, scripted** way to flip between scoped-test-mode and real-unscoped-mode" so this rehearsal can be repeated for every future release without manual, error-prone file edits.

### Real-release version decision: `0.1.0`, not `1.0.0` (confirmed 2026-07-10)

Explicitly considered and rejected `1.0.0` for the real first release, despite the scoped canary rehearsal being unusually thorough. Reasoning: the rehearsal proves the **publish mechanism** works (registry publish, real install, scaffold, build) — it does not prove the **public API surface** (`defineConfig`/`defineFlow` signatures, the CLI verb set, `flowkit/vite` plugin options) is final, since no outside consumer has touched it yet. `1.0.0` under semver is a forward-looking promise ("breaking this now requires a major bump"), not a badge for "well-tested." This matches `temp-docs/npm-checklist.md`'s own earlier reasoning for choosing a beta version originally ("no semver promises made yet") — `0.1.0` keeps that same posture, just past the beta/prerelease phase. `1.0.0` is deferred until the API has proven itself against real, external usage.

This means, as part of the **real** (unscoped) release step — separate from and after this canary rehearsal plan — `FLOWKIT_PUBLISHED_RANGE` in both `packages/create-flowkit-app/index.js` and `packages/create-flowkit-workspace/index.js` must be bumped from `'0.0.1-beta.0'` to `'0.1.0'`, and all three `package.json`'s `"version"` fields bumped to match, immediately before that publish — not handled by the canary toggle script, which only ever touches the temporary `@rahil316/*` scoped state and reverts back to whatever the real version currently is.

### Versioning scheme for the permanent canary channel

Reusing `0.0.1-beta.0` as a fixed string every publish (the version already sitting in the real, unscoped `package.json` files) is wrong for a channel meant to be republished repeatedly — every publish needs a **distinct** version, or `npm publish` will simply reject the second attempt as a duplicate version. Decided scheme, matching how Vite/Vitest/React run their canary channels:

- **Version format:** `0.0.0-canary.<N>`, where the actual `0.0.0` is deliberately meaningless (it never needs to track the real package's semver) and `<N>` is a plain incrementing integer bumped on every canary publish (`canary.0`, `canary.1`, `canary.2`, ...).
- **Dist-tag:** `--tag canary` (not `beta`, not `latest`) — signals "no stability contract, just the latest test build," matching the ongoing/permanent framing better than `beta`'s conventional "converging toward a specific release" meaning.
- **Tracking N:** since three packages (`flowkit`, `create-flowkit-app`, `create-flowkit-workspace`) are published together and must stay version-coupled (the scaffolders pin an exact `flowkit` canary version — see hazard below), `N` is tracked as **one shared counter across all three**, not three independent counters. Stored in a new small JSON file: `scripts/dev/.canary-version.json` → `{ "n": 0 }`. The toggle script reads this, computes `0.0.0-canary.<n>`, writes it into all three `package.json`'s `"version"` field during `on`, and increments `n` for next time. This file **is committed to git** (it's the durable record of "what canary version did we last publish," not disposable scratch state) but is separate from the real `package.json` version fields, which the `off` step restores untouched.

## Mission boundary for this plan

This plan covers everything up through **getting the scoped `@rahil316/*` packages published and ready to smoke-test**. It does not include the real unscoped publish (that's the next, separate mission after this one succeeds), and does not include writing new automated tests — only the manual/scripted verification steps needed to trust the rehearsal.

## The core mechanism: a reversible scope-toggle script

Rather than hand-editing 3 `package.json` files + 2 scaffolder `index.js` files + 8 generated-import call sites + 1 fallback constant, write one Node script that mechanically toggles every one of these between unscoped and scoped state, so the revert is byte-identical to the original (verifiable via `git diff` showing empty).

**New file:** `scripts/dev/scope-toggle.js` (Node ESM, run directly via `node scripts/dev/scope-toggle.js <scope> <on|off>`)

Two subcommands:

- `node scripts/dev/scope-toggle.js @rahil316 on` — applies scoped names everywhere
- `node scripts/dev/scope-toggle.js @rahil316 off` — reverts to unscoped (also serves as the "back to real" step before the actual unscoped publish)

### Exact edits the script performs (all confirmed by direct file reads, not assumed)

**1. `package.json` (repo root, the `flowkit` package)** — line 2, plus the version field

```
"name": "flowkit"              →  "name": "@rahil316/flowkit"
"version": "0.0.1-beta.0"      →  "version": "0.0.0-canary.<n>"
```

No `bin` field to touch here (flowkit itself has no CLI bin exposed under a scope-sensitive name — its `bin.flowkit` entry maps to `scripts/flowkit.js`; npm scoping does not require changing bin key names, only the package `name` field. Confirmed via `bin` inspection — scoped packages' bin commands still install under the unscoped bin key npm derives, no edit needed).

**2. `packages/create-flowkit-app/package.json`** — line 2, plus version field

```
"name": "create-flowkit-app"       →  "name": "@rahil316/create-flowkit-app"
"version": "0.0.1-beta.0"          →  "version": "0.0.0-canary.<n>"
```

`bin.create-flowkit-app` (line 21-23) — **left unchanged**. npm scoping only affects the package name field; the `bin` map keys are independent and npm doesn't require them to match the scope.

**3. `packages/create-flowkit-workspace/package.json`** — line 2 + version field, same treatment as above → `@rahil316/create-flowkit-workspace` at `0.0.0-canary.<n>`.

**4. `packages/create-flowkit-app/index.js`** — line 132

```js
const FLOWKIT_PUBLISHED_RANGE = '0.0.1-beta.0'
```

→

```js
const FLOWKIT_PUBLISHED_RANGE = 'npm:@rahil316/flowkit@0.0.0-canary.<n>'
```

This is npm's dependency-aliasing syntax: it lets a `package.json` declare `"flowkit": "npm:@rahil316/flowkit@0.0.0-canary.<n>"`, which installs the scoped package under the _unscoped_ local name `flowkit` in `node_modules`. This is the key trick that avoids having to rewrite every generated import statement to say `@rahil316/flowkit` — the generated code can keep importing from `'flowkit'` and it'll resolve correctly, because npm's alias makes the scoped package answer to the unscoped name inside `node_modules`. `<n>` here must be the exact same value published in step 1 for this specific publish run — the toggle script computes `n` once per `on` invocation and reuses it across all 5 edits, never recomputing mid-run.

**5. `packages/create-flowkit-workspace/index.js`** — line 142, identical treatment to #4.

### Version-pinning hazard (caught before execution, still relevant under the canary scheme)

Because `@rahil316/*` stays published permanently as an ongoing canary channel, the version pinned into `FLOWKIT_PUBLISHED_RANGE` is **not disposable test scaffolding — it becomes permanent, load-bearing state**, the same way the real `FLOWKIT_PUBLISHED_RANGE` already is for the unscoped release (per the existing code comment: "Bump this alongside flowkit's own package.json version when cutting a release"). The shared incrementing counter (`scripts/dev/.canary-version.json`) fixes the _collision_ half of this problem — every publish now gets a genuinely distinct, traceable version, so `npm view @rahil316/flowkit versions` becomes a real, readable history instead of the same string republished forever. It does **not** fix the _staleness_ half: `@rahil316/create-flowkit-app@0.0.0-canary.3`, once published, is a frozen artifact whose `FLOWKIT_PUBLISHED_RANGE` is hard-pinned to whatever `@rahil316/flowkit` canary number was current at that moment. If `@rahil316/flowkit` alone is ever republished later (e.g. testing a library fix without touching the scaffolders), the scaffolder still on the shelf keeps installing the older pinned library version until it too is republished.

**Handling this correctly:**

- Because all three packages share **one counter** (not independent per-package counters), the common case — republishing all three together for a fresh end-to-end rehearsal — automatically keeps them in lockstep: a new `on` run computes one fresh `n`, stamps all three at `0.0.0-canary.<n>`, and the pin is always exactly correct for that batch.
- The hazard only materializes if someone republishes **one** of the three in isolation (e.g. `@rahil316/flowkit` alone, skipping the scaffolders) — the toggle script's `on` output prints an explicit warning covering this so it's never silently forgotten (see script implementation notes below).
- This mirrors the real, unscoped release's existing discipline exactly (same comment already in the code) — the canary channel doesn't need a different or lesser standard, just the same one applied consistently.

### Why the alias trick instead of rewriting generated import strings

The alternative approach considered was rewriting all 9 generated `from 'flowkit'` strings (8 in `scripts/helpers/workspace-template.js` + 1 fallback in `scripts/authoring-support/config-patch.js`) to say `from '@rahil316/flowkit'` during the rehearsal. Rejected in favor of `npm:@scope/name@version` aliasing in `FLOWKIT_PUBLISHED_RANGE` (step 4/5 above) so that **workspace-template.js and config-patch.js never need to change at all** — they keep saying `'flowkit'`, and the alias makes that resolve correctly to the scoped package under the hood. This is strictly fewer moving parts than rewriting 9 separate generated-string call sites and is less error-prone to revert (only 5 files touched instead of 7, and the 2 highest-risk/most-called files — workspace-template.js, config-patch.js — are never touched at all).

**This changes the toggle script's scope to touch exactly 5 files' content, plus one counter file**, not 7:

- `package.json` (root) — `name` + `version`
- `packages/create-flowkit-app/package.json` — `name` + `version`
- `packages/create-flowkit-workspace/package.json` — `name` + `version`
- `packages/create-flowkit-app/index.js` — `FLOWKIT_PUBLISHED_RANGE` (1 line)
- `packages/create-flowkit-workspace/index.js` — `FLOWKIT_PUBLISHED_RANGE` (1 line)
- `scripts/dev/.canary-version.json` — the shared counter (read + incremented on `on`, untouched on `off`)

`scripts/helpers/workspace-template.js` and `scripts/authoring-support/config-patch.js` are **not edited** by this rehearsal — confirmed safe to leave alone.

### Script implementation notes

- Use simple, anchored string replacement (not a JSON.parse/stringify round-trip for the package.json files, to avoid reformatting/key-reordering diffs unrelated to the actual change) — read file as text, replace the exact `"name": "X"` and `"version": "Y"` lines, write back.
- `on` mode:
  1. Read `scripts/dev/.canary-version.json` (create it with `{ "n": 0 }` if it doesn't exist yet), take `n`.
  2. Compute `CANARY_VERSION = 0.0.0-canary.${n}`.
  3. Replace unscoped → scoped `name` in all 3 package.json files; replace `version` in all 3 with `CANARY_VERSION`; replace `FLOWKIT_PUBLISHED_RANGE` in both scaffolder `index.js` files with `npm:@rahil316/flowkit@${CANARY_VERSION}`.
  4. Increment `n` in `.canary-version.json` and write it back immediately — so even if the publish step later fails partway, the counter has already moved past the version that was about to be attempted, and a retry naturally gets a fresh, non-colliding version rather than retrying the same one.
  - Must be idempotent against double-invocation of `on` itself (running `on` twice in a row without an intervening `off` should not double-prefix `@rahil316/@rahil316/flowkit` or bump `n` twice for the same working state) — guard by checking if `name` already contains `@rahil316/` before treating the repo as "currently unscoped."
- `off` mode: replace scoped `name` → real unscoped name in all 3 package.json files; replace `version` back to the real release version (read from a stored "original version" — see below); restore `FLOWKIT_PUBLISHED_RANGE` in both scaffolders to the plain unscoped value. Does **not** touch `.canary-version.json` — that counter only ever moves forward, on `on`.
- Because `off` needs to know what the _real_ version/`FLOWKIT_PUBLISHED_RANGE` values were before `on` overwrote them, `on` must stash them first — simplest approach: `on` writes a small `scripts/dev/.pre-canary-snapshot.json` (gitignored, purely transient) capturing the 5 original strings before editing; `off` reads that snapshot to restore exactly, then deletes the snapshot file. This avoids hardcoding the real version string into the toggle script itself (which would silently go stale the next time the real `package.json` version is bumped).
- After either run, print a `git diff --stat` so the user can see exactly what changed before publishing or committing.
- `on` mode must print an explicit warning after the diff: `⚠ Published as @rahil316/*@0.0.0-canary.<n>. FLOWKIT_PUBLISHED_RANGE in both scaffolders is pinned to this exact canary number. If @rahil316/flowkit is ever republished alone (a newer canary number) without republishing both scaffolders to match, every future 'npm create @rahil316/...' will keep installing the older pinned library version.` This is the one thing that makes the permanent-canary-channel decision safe to act on later without re-deriving this reasoning from scratch.
- No dependency on external libs — plain `fs.readFileSync`/`writeFileSync`, matches the repo's existing style in `scripts/helpers/json.js`.
- Since this is dev-only tooling (not shipped to consumers), it does not need to go in `scripts/platform/` or be wired into `router.js`'s dispatch table — a standalone script under `scripts/dev/` (new directory, not currently in `package.json`'s `files[]` allowlist, so it never ships) is correct and consistent with the repo's "organized by nature" folder philosophy from `CLAUDE.md`.
- `.gitignore` needs one new entry: `scripts/dev/.pre-canary-snapshot.json` (transient, must never be committed — it only exists mid-flight between `on` and `off`). `scripts/dev/.canary-version.json`, by contrast, **is** committed (durable counter).

## Step-by-step execution plan

1. **Write `scripts/dev/scope-toggle.js`** implementing `on`/`off` exactly as specified above (name + version + `FLOWKIT_PUBLISHED_RANGE` edits, counter file, transient snapshot file). Add `scripts/dev/.pre-canary-snapshot.json` to `.gitignore`.
2. **Run `node scripts/dev/scope-toggle.js @rahil316 on`** — verify via `git diff` that exactly 5 files' content changed (3 package.json's `name`+`version`, 2 index.js's `FLOWKIT_PUBLISHED_RANGE`), `.canary-version.json` shows an incremented `n` and is staged as a real (committable) change, and the warning about pin staleness printed. Note the exact `0.0.0-canary.<n>` value used this run.
3. **Rebuild the lib output** — `npm run build:lib` (the root package's build must be re-run since `dist/lib/` doesn't embed the package name/version, but this confirms nothing broke from the rename before publishing).
4. **Publish all three scoped packages** at `0.0.0-canary.<n>`, in dependency order (flowkit first, since the scaffolders declare it as a dependency), all under the `canary` dist-tag:
   - `cd` to repo root → `npm publish --access public --tag canary` (publishes `@rahil316/flowkit@0.0.0-canary.<n>`)
   - Verify: `npm view @rahil316/flowkit versions` and `npm view @rahil316/flowkit dist-tags` (confirm `canary` points to `0.0.0-canary.<n>`, `latest` is NOT set)
   - `cd packages/create-flowkit-app` → `npm publish --access public --tag canary`
   - Verify: `npm view @rahil316/create-flowkit-app versions` + `dist-tags`
   - `cd packages/create-flowkit-workspace` → `npm publish --access public --tag canary`
   - Verify: `npm view @rahil316/create-flowkit-workspace versions` + `dist-tags`
5. **Revert scope immediately after all three publishes succeed** — `node scripts/dev/scope-toggle.js @rahil316 off`, confirm `git diff` shows only `.canary-version.json`'s incremented counter as a real change (everything else back to the real unscoped state), and confirm `.pre-canary-snapshot.json` no longer exists. This must happen before any further repo work, so the working tree never sits in scoped state longer than the publish window requires.
6. **Commit the counter bump** — `.canary-version.json`'s new `n` is the durable record of "this canary number is taken"; commit it now so the next canary publish (whenever that happens) starts from the correct next value, not a stale one.
7. **Real-registry smoke test**, in a fresh scratch directory (outside the repo, per existing convention in `temp-docs/npm-checklist.md` Phase 5):
   - `npm create @rahil316/flowkit-app@canary smoke-test-app` (confirmed correct invocation syntax per `npm help create`'s documented transform: `npm init @scope/foo` → `npm exec @scope/create-foo`, so publishing under `@rahil316/create-flowkit-app` is invoked as `npm create @rahil316/flowkit-app`; `@canary` selects the dist-tag explicitly since nothing is tagged `latest`)
   - Inside the scaffolded project: confirm generated `package.json`'s `"flowkit"` dependency resolves (should show `"flowkit": "npm:@rahil316/flowkit@0.0.0-canary.<n>"` after the alias fix) — `npm install` should already have run as part of scaffolding; if not, run it and confirm 0 errors pulling from the **real registry**, not `file:`
   - `npm run dev` — confirm boot + HTTP 200, same as prior local rehearsals but this time against a genuinely registry-installed `flowkit`
   - `npm run build` — confirm success
   - Repeat the same for `npm create @rahil316/flowkit-workspace@canary smoke-test-ws`, plus a spot-check of `create:workspace`/`rename:workspace`/`remove:workspace` against the registry-installed `flowkit` binary (`node_modules/flowkit/scripts/flowkit.js ...`, same invocation pattern as the prior `--local-dev` rehearsal)
   - Clean up both scratch directories after.
8. **Leave `@rahil316/flowkit`, `@rahil316/create-flowkit-app`, `@rahil316/create-flowkit-workspace` published** at their `canary` dist-tag — these become a permanent personal canary/pre-release channel, not a one-time throwaway. No unpublish step.
9. **Report results** — summarize what was verified against the real registry (this closes the one gap every previous phase left open: "never tested against the actual registry, only `file:`/`--local-dev`").

## What this plan explicitly does NOT do

- Does not touch the real unscoped `flowkit`/`create-flowkit-app`/`create-flowkit-workspace` publish — that's the next mission, gated on this rehearsal succeeding.
- Does not bump `package.json`'s `"version"` fields or `FLOWKIT_PUBLISHED_RANGE` to the confirmed real target (`0.1.0`, see decision above) — that edit belongs to the real-release mission, executed fresh at that time (immediately before that publish, not now), not as a side effect of this canary rehearsal.
- Does not modify `workspace-template.js` or `config-patch.js` — confirmed unnecessary via the npm alias mechanism.
- Does not unpublish or deprecate the scoped packages afterward — `--tag canary` keeps them off `latest` resolution by default, which is the actual safety mechanism (not deletion).

## Verification checklist (what "done" looks like for this mission)

- [ ] `scripts/dev/scope-toggle.js` exists; `on` computes a fresh `0.0.0-canary.<n>` from the shared counter, stamps all 3 package.json's `name`+`version` and both `FLOWKIT_PUBLISHED_RANGE` constants consistently, snapshots originals, and prints the pin-staleness warning
- [ ] `off` restores all 5 files to their exact pre-`on` state from the snapshot, deletes the snapshot file, and never touches `.canary-version.json`
- [ ] Running `on` twice in a row without an intervening `off` does not double-scope or double-increment
- [ ] All three `@rahil316/*` packages appear in `npm view <name> versions`, each at a distinct `0.0.0-canary.<n>`, with `dist-tags` showing `canary` set and `latest` NOT set
- [ ] `git diff` after the `off` revert shows only `.canary-version.json`'s incremented counter as a real, intentional change — nothing else
- [ ] A scratch project scaffolded via `npm create @rahil316/flowkit-app@canary` installs (from the real registry), runs `npm run dev` (HTTP 200), and `npm run build` (succeeds) — same for `@rahil316/flowkit-workspace@canary`
- [ ] Multi-workspace commands (`create:workspace`/`rename:workspace`/`remove:workspace`) work against the registry-installed `flowkit` binary, not just `--local-dev`
- [ ] `.canary-version.json`'s bumped counter is committed after the rehearsal, so the next canary publish starts from the correct next number
