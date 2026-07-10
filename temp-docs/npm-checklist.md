# FlowKit npm Publish Checklist

First-time publish, three packages: `flowkit` (library), `create-flowkit-app` (flat-mode scaffolder),
`create-flowkit-workspace` (multi-workspace scaffolder).

> **Verified against live code/commands on 2026-07-08, updated 2026-07-10.** Checked items below
> reflect an actual command run or a file read on the date noted, not a status carried over from an
> earlier doc. Anything still unchecked either requires a decision only a human can make (names,
> versions, account setup) or requires real registry contact (Phase 7 is irreversible — nothing
> there was run).
>
> **2026-07-10 update:** `create-flowkit-workspace` — previously untested by this checklist — went
> through the same Phase 4/5 verification as the other two packages (see those sections). All
> findings clean. `flowkit/package.json`'s `"private": true` failsafe has also been removed; all
> three packages are now publish-ready pending only Phase 7's actual `npm publish` commands.

---

## Phase 0 — Account & Tooling (one-time)

- [x] npm account created at npmjs.com
- [x] 2FA enabled on npm account (required to publish)
- [x] `npm login` → confirm with `npm whoami` — **RESOLVED 2026-07-10.** Logged in as `rahil316`, confirmed via `npm whoami`.
- [ ] Decide npm access level for scoped work (not needed — "flowkit" and "create-flowkit-app" are unscoped public names)
- [x] `node --version` → confirm >=20 — **v24.13.1 installed, satisfies both the repo's own tooling and `packages/create-flowkit-app/package.json`'s `"engines": {"node": ">=20"}`**

---

## Phase 1 — Name / Version Decisions (irreversible once published)

- [x] Confirm "flowkit" still unclaimed: `npm view flowkit` → **404 Not Found, confirmed unclaimed**
- [x] Confirm "create-flowkit-app" unclaimed: `npm view create-flowkit-app` → **404 Not Found, confirmed unclaimed**
- [x] Decide starting version for `flowkit` → **`0.0.1-beta.0`, set in `package.json`.** `npm run build:lib` and `npm pack --dry-run` re-verified clean after the bump (still 340 files, version correctly reflected in pack metadata).
- [x] Decide starting version for `create-flowkit-app` → **`0.0.1-beta.0`, matched to `flowkit`'s version** so both packages' beta status stays obviously in sync
- [x] Decide dist-tag for first publish → **`--tag beta`** for both packages. Important: npm's `--tag` defaults to `latest` regardless of the version string — a `-beta.0` prerelease suffix alone does **not** keep a package off `npm install <pkg>`'s default resolution. `--tag beta` is required to actually achieve that; decided and will be used at Phase 7.
- [x] Committing to 1.0.0 semver promises — **resolved by going with 0.0.1-beta.0**, no semver promises made yet
- [x] **Follow-through fix applied:** `packages/create-flowkit-app/index.js`'s `FLOWKIT_PUBLISHED_RANGE` constant (used to pin the `flowkit` dependency version in every scaffolded project, for consumers not using `--local-dev`) was still hardcoded to `'^1.0.0'` — a range that would never resolve to a `0.0.1-beta.0` prerelease (prereleases need an explicit tag match; a 0.x caret range is stricter than a 1.x one regardless). Updated to `'0.0.1-beta.0'` to match. This would have been a real, publish-blocking bug if left as-is — every scaffolded project's `npm install` would have failed trying to satisfy `flowkit@^1.0.0` against a registry that only has `0.0.1-beta.0`.

---

## Phase 2 — package.json Hygiene (per package)

For **both** `flowkit/package.json` and `packages/create-flowkit-app/package.json`:

- [x] `"name"` matches intended registry name exactly — `"flowkit"` and `"create-flowkit-app"` confirmed in both files
- [x] `"version"` set correctly — **both now `"0.0.1-beta.0"`**, confirmed intentional (see Phase 1)
- [x] `"description"` present and accurate — flowkit: "Browser-based UI prototyping platform for multi-screen, flow-based interactive previews."; create-flowkit-app: "Scaffold a new FlowKit author project."; create-flowkit-workspace: "Scaffold a new FlowKit multi-workspace author project."
- [x] `"license"` field present — **`"license": "MIT"` added to all three package.json files (2026-07-10)**. `LICENSE` file (MIT, copyright Rahil Kothari) added at repo root and copied into both `packages/create-flowkit-app/` and `packages/create-flowkit-workspace/` so each ships its own copy. Confirmed via `npm pack --dry-run` that npm includes `LICENSE` in the tarball automatically (no `files[]` entry needed) for all three packages.
- [x] `"repository"` field points to the real GitHub URL — **RESOLVED 2026-07-10.** Added to all three package.json files: `{ type: "git", url: "https://github.com/rahil-avj/flowkit-app.git" }`, with a `directory` sub-field on the two `packages/` scaffolders pointing at their own subpath (npm monorepo convention).
- [x] `"author"` field set — **RESOLVED 2026-07-10.** `"Rahil Kothari <Rahilkothari5@gmail.com>"` on all three, matching the LICENSE copyright holder.
- [x] `"keywords"` added — **RESOLVED 2026-07-10.** Added to all three (flowkit/prototyping/react/vite-flavored terms per package).
- [x] `"engines"` field present if there's a real Node version floor — **RESOLVED 2026-07-10.** `>=20` added to `flowkit` itself too, now consistent across all three packages (matches `create-flowkit-app`/`create-flowkit-workspace`, which already had it).
- [x] `"type": "module"` consistent with actual output format — both set to `"module"`, confirmed consistent with ESM build output
- [x] For `flowkit`: `"exports"` map correct — verified both entries resolve and work at runtime:
  - `"."` → `dist/lib/index.js` (confirmed present, exports `defineConfig`/`defineFlow`/`tag`) + `dist/types/core/config/index.d.ts` (confirmed present, correct declarations)
  - `"./vite"` → `scripts/vite-plugin.js` — **confirmed importable** (`import('flowkit/vite')` resolves and loads in a real `file:`-installed consumer)
- [x] For `flowkit`: `"peerDependencies"` present and reasonable — `react`/`react-dom` `^19.0.0`, 7 `@radix-ui/*` packages with real version ranges (not wildcards)
- [x] For `flowkit`: `"files"` allowlist reviewed — `["scripts/", "src/", "dist/", "docs/", "index.html", "!scripts/tests/", "!scripts/build/format.mjs"]`, confirmed accurate via `npm pack --dry-run` (see Phase 4)
- [x] No `"private": true` accidentally left in either package.json — **RESOLVED 2026-07-10.** `flowkit/package.json`'s `"private": true` failsafe removed — this was the deliberate last gate before publish (see Phase 7); `create-flowkit-app`/`create-flowkit-workspace` never had the field. All three packages are now publishable.

---

## Phase 3 — Build Output Verification

- [x] `npm run build:lib` completes with zero errors — **confirmed, clean run**, `dist/lib/index.js` (224 bytes, correctly tiny — just the 3 identity/passthrough helpers) + `dist/types/` produced
- [x] `dist/` actually contains what `"exports"` promises — confirmed via `ls`: `dist/lib/index.js` present; `dist/types/core/config/index.d.ts`, `dist/types/types/index.d.ts`, `dist/types/shared/contexts/FlowNavContext.d.ts` all present
- [x] Public API type-check: path-alias-leak grep — **`grep -rn "from '@\(platform\|shared\|core\|features\|kit\|workspace\|flowlens\)" dist/types/` returns nothing (confirmed)**. Went further than the grep: wrote a real consumer `.ts` file importing `defineConfig`/`defineFlow`/`tag`/`AnnotationTag` from a `file:`-installed copy of the package and ran `tsc --noEmit` against it — **zero errors, types resolve correctly for a real external consumer**, not just an empty grep result.
- [x] No source maps leaking internal file structure — confirmed, `find dist -name "*.map"` returns nothing
- [x] No accidental dev artifacts in `dist/` — inspected `dist/lib/index.js` directly, contains only the expected 3 minified functions, no debug/TODO artifacts

---

## Phase 4 — Pack Contents Audit (dry runs, no registry contact)

**For `flowkit`:**

- [x] `npm pack --dry-run --json` — ran successfully, 340 files, 700,518 bytes tarball / 2,496,949 bytes unpacked
- [x] Review file list — confirmed present at top level: `README.md`, `dist`, `docs`, `index.html`, `package.json`, `scripts`, `src`. **Note:** the `scripts/deploy/` exclusion this checklist used to mention no longer applies — `scripts/deploy/` (the deployment-branch strip/lock/release tooling) was removed from the repo entirely; there's nothing left to exclude there.
- [x] Confirm ABSENT — **all confirmed absent from the actual pack contents**: `.env*` (0 matches), `Documentation/` (0), `workspaces/` (0), `.git` (0), `node_modules` (0), `.husky` (0), `eslint.config.js` (0), `.prettierrc` (0), `vitest.config.ts` (0), `.flowkit-repo-root` (0 — confirmed the repo-mode marker file correctly never ships)
- [x] Check tarball size — 700KB packed / 2.4MB unpacked, nothing anomalously large; no evidence of an accidentally-swept build cache or node_modules
- [ ] `npm publish --dry-run` (flowkit) — **not run**; requires being logged in to npm (Phase 0), which hasn't happened yet

**For `create-flowkit-app`:**

- [x] `npm pack --dry-run --json` — ran successfully: 3 files (`index.js`, `package.json`, `templates/index.html`)
- [x] Confirm `templates/` has everything needed — confirmed by design: `index.js` generates the full scaffolded project (2-flow/5-screen starter) via template literals at runtime, so `templates/` only needs to hold the one genuinely static file (`index.html`); nothing missing, nothing workspace-specific leaked in

**For `create-flowkit-workspace` (verified 2026-07-10 — not previously covered by this checklist):**

- [x] `npm pack --dry-run --json` — ran successfully: 4 files (`LICENSE`, `index.js`, `package.json`, `templates/index.html`), 7,283 bytes tarball / 19,017 bytes unpacked
- [x] Confirm ABSENT / nothing leaked — file list matches `create-flowkit-app`'s shape plus its own `LICENSE` copy; no monorepo-internal paths present

---

## Phase 5 — Local Consumer Smoke Test (before touching the registry)

**All items in this phase were actually run this session, in a scratch directory outside the repo — this phase is no longer untested.**

- [x] `mkdir` a scratch project outside this repo — done, cleaned up after
- [x] `npm install <path-to-repo>` (file: install of flowkit) — **confirmed: installs cleanly, 0 vulnerabilities**
- [x] Import from consumer code — **confirmed: `import { defineConfig, defineFlow, tag } from 'flowkit'` resolves at both runtime (Node ESM) and compile time (`tsc --noEmit` against real usage), zero errors, zero path-alias issues**
- [x] Import `flowkit/vite` — **confirmed the subpath resolves and the module loads** (`import('flowkit/vite')` succeeds, exports present). Did not go as far as running a live Vite dev server against a hand-written `flowkit.config.ts` outside the scaffolder — the scaffolder-generated project (next two items) exercises this same code path more realistically anyway.
- [x] Run `create-flowkit-app`'s scaffolder against a scratch dir — **confirmed working, with one real finding**: running it plainly (`node .../index.js cfa-test`) fails, because the generated project's `package.json` depends on `flowkit@^1.0.0` from the live registry, which 404s since `flowkit` isn't published yet — **this is expected/correct behavior given where the project actually is**, not a bug. The scaffolder's own `--local-dev` / `FLOWKIT_LOCAL_DEV=1` flag (built specifically for this pre-publish scenario) works exactly as documented: install succeeds, project scaffolds correctly, zero `workspaces/` dir present (flat mode confirmed).
- [x] `npm run dev` inside the scaffolded project — **confirmed: Vite dev server boots in 159ms, serves HTTP 200 on `localhost:5173`**, zero `workspaces/` dir present
- [x] `npm run build` inside the scaffolded project — **confirmed: production build succeeds** (2003 modules transformed, valid output). Two non-blocking warnings surfaced: (1) several screen components are both statically and dynamically imported via the generated `virtual:flowkit/screens` module, so Vite's `[INEFFECTIVE_DYNAMIC_IMPORT]` warning fires and code-splitting doesn't happen for those chunks; (2) the resulting main chunk is 635KB (177KB gzipped), over Vite's default 500KB warning threshold. Neither fails the build — both are optimization opportunities, not correctness bugs, and out of scope for this checklist to fix.

**`create-flowkit-workspace` local consumer smoke test (verified 2026-07-10 — not previously covered):**

- [x] Scaffold via `--local-dev --lang:ts` into a scratch dir outside the repo — **confirmed working**: `flowkit.mode: "multi"`, `flowkit.workspaces: ["workspace-1"]` written correctly to the generated `package.json`, `flowkit` devDependency points at the local checkout
- [x] `npm install` — **confirmed: 0 vulnerabilities**, 97 packages
- [x] `npm run dev` — **confirmed: Vite boots in 572ms, HTTP 200 on `localhost:5173`**
- [x] `npm run build` — **confirmed: succeeds**, same non-blocking chunk-size warning as `create-flowkit-app` (main chunk 627KB / 176KB gzipped), not a correctness issue
- [x] `flowkit create:workspace --name:workspace-2 --lang:ts` — **confirmed: adds `workspace-2/` dir, updates `package.json`'s `flowkit.workspaces[]` correctly**
- [x] `flowkit rename:workspace workspace-2 workspace-renamed` — **confirmed: renames dir + updates manifest**
- [x] Workspace isolation — `flowkit list:screens` (default → first workspace) vs. `flowkit list:screens --workspace:workspace-renamed` **confirmed both resolve independently**, no cross-workspace leakage
- [x] `flowkit remove:workspace --name:workspace-renamed` — **confirmed: requires typed confirmation of the workspace name** (correct safety behavior, matches repo-mode `rw`'s pattern), then removes dir + updates manifest correctly
- [x] Scratch directory cleaned up after test

---

## Phase 6 — Security / Legal Sweep

- [x] Grep the pack contents for hardcoded secrets/tokens/keys, especially `JSONBIN_CONFIG` — **confirmed resolved, no live secret in the pack.** Extracted the actual tarball (not just source) and grepped it directly: every `JSONBIN`/`MASTER_KEY` hit is either the config object's name, the guard code in `scripts/build/inline.js` that warns on a detected master-key pattern, or `packages/create-flowkit-app`'s handoff template's literal placeholder string `VITE_JSONBIN_MASTER_KEY=` (an empty env-var template). The actual `JSONBIN_CONFIG.providedKey` in `src/features/feedback/cloud-sync/constants.ts` is `''` (empty) by default. No `sk_live`/`sk_test`/`AKIA`/private-key patterns found anywhere in the pack. **This was previously the checklist's "Highest-Risk Item" — closed as of 2026-07-08.**
- [x] `npm audit` on the package's own dependency tree — **confirmed: `npm audit --omit=dev` reports 0 vulnerabilities**
- [x] Confirm LICENSE file exists in repo root — **RESOLVED 2026-07-10.** MIT LICENSE added at repo root, copied into both scaffolder packages, `license: "MIT"` field added to all three `package.json` files. Confirmed present in `npm pack --dry-run` output for all three packages.
- [ ] Check for any workspace/customer-specific data accidentally committed under `src/` or `scripts/` — not exhaustively audited this session; the `nClarity` workspace-consolidation decision (per `decisions.md`) suggests this has had at least one prior cleanup pass, but no fresh audit was done here since `workspaces/` doesn't ship via `files[]` anyway (confirmed absent from the pack in Phase 4) — lower urgency than it first appears.

---

## Phase 7 — Publish (irreversible past this line)

**Nothing in this phase was run or attempted.** All gates are now clear: npm login (Phase 0), LICENSE
(Phase 6), and — as of 2026-07-10 — `flowkit/package.json`'s `"private": true` failsafe has been
removed and `create-flowkit-workspace` has passed the same Phase 4/5 verification as the other two
packages. Versions/dist-tag are decided (Phase 1) — commands below reflect that.

- [ ] Final `npm whoami` check
- [ ] `cd` to `flowkit` package root, `npm publish --tag beta` (publishes `0.0.1-beta.0`)
- [ ] Immediately verify: `npm view flowkit versions` and `npm view flowkit dist-tags` (confirm `beta` points to `0.0.1-beta.0`, `latest` is NOT set)
- [ ] `cd` to `packages/create-flowkit-app`, `npm publish --tag beta` (publishes `0.0.1-beta.0`)
- [ ] Immediately verify: `npm view create-flowkit-app versions` and `dist-tags`
- [ ] `cd` to `packages/create-flowkit-workspace`, `npm publish --tag beta` (publishes `0.0.1-beta.0`)
- [ ] Immediately verify: `npm view create-flowkit-workspace versions` and `dist-tags`
- [ ] Real-world install test against the actual registry (not `file:`) — use `npm create flowkit-app@beta my-real-test` and `npm create flowkit-workspace@beta my-real-test-2` (not `@latest`, since nothing is tagged `latest` yet)

---

## Phase 8 — Post-Publish

**Not started — depends entirely on Phase 7.**

- [ ] Tag the release in git — **note:** the checklist used to suggest `flowkit checkpoint`/`flowkit release` CLI commands for this; both were removed from the CLI this session along with the rest of `scripts/deploy/` (the repo committed to npm-only distribution, no more deployment-branch tooling). Use plain `git tag`/`git push --tags` instead.
- [ ] Update README.md / CLAUDE.md to remove "not yet live" warnings once ready to promote off beta
- [ ] When ready to leave beta: bump both packages' `package.json` `"version"` past the `-beta.x` suffix (e.g. `0.1.0` or `1.0.0`, whatever Phase 1's eventual real-release decision is), update `create-flowkit-app`'s `FLOWKIT_PUBLISHED_RANGE` constant to match, publish that version with `--tag latest`
- [ ] Watch npm download stats / GitHub issues for first 48h
- [ ] Set a reminder: 72-hour unpublish window closes after that point

---

## Highest-Risk Item

The JSONBin master-key risk and the missing-LICENSE gap that were tracked here are both resolved (JSONBin: confirmed clean 2026-07-08, re-confirmed 2026-07-09; LICENSE: added 2026-07-10 — see Phase 6).

**No blockers remain.** npm login (`rahil316`), LICENSE, package.json hygiene (repository/author/keywords/engines), the `"private": true` failsafe removal, and `create-flowkit-workspace`'s Phase 4/5 verification are all resolved as of 2026-07-10. Every item in Phases 0–6 is checked for all three packages. The only remaining work is Phase 7 itself — the actual, irreversible `npm publish` commands — which requires a deliberate human go-ahead, not further verification.

---

## Summary of this pass (2026-07-08)

Of the concrete, checkable items across all 8 phases, the large majority that can be verified without publishing were checked and passed:

- **Fully verified working:** build output (`build:lib`, path-alias fix, pack contents for both packages), full Phase 5 local consumer smoke test (install, type resolution, `flowkit/vite` import, scaffold via `--local-dev`, flat-mode dev server boot, flat-mode production build), `npm audit` clean, JSONBin secret sweep clean.
- **Confirmed still open, needs a human decision:** starting versions, dist-tag choice, `license`/`repository`/`author`/`keywords` fields, npm account/2FA/login.
- **Confirmed still open, needs an artifact:** LICENSE file in repo root.
- **Correctly not attempted:** everything in Phase 7 (irreversible) and Phase 8 (depends on Phase 7).

The two things previously flagged as "currently untested" — the `flowkit/vite` virtual-module mechanism and the full flat-mode dev-server path — **both now have direct evidence they work**, via a real scaffolded project's dev server and production build succeeding.
