# FlowKit npm Publish Checklist

First-time publish, two packages: `flowkit` (library) and `create-flowkit-app` (scaffolder).

---

## Phase 0 — Account & Tooling (one-time)

- [ ] npm account created at npmjs.com
- [ ] 2FA enabled on npm account (required to publish)
- [ ] `npm login` → confirm with `npm whoami`
- [ ] Decide npm access level for scoped work (not needed — "flowkit" and "create-flowkit-app" are unscoped public names)
- [ ] `node --version` → confirm >=20 (`packages/create-flowkit-app/package.json:10` requires it; check main package's `engines` too if any is set)

---

## Phase 1 — Name / Version Decisions (irreversible once published)

- [ ] Confirm "flowkit" still unclaimed: `npm view flowkit`
- [ ] Confirm "create-flowkit-app" unclaimed: `npm view create-flowkit-app`
- [ ] Decide starting version for `flowkit` (0.1.0 vs 1.0.0)
- [ ] Decide starting version for `create-flowkit-app`
- [ ] Decide dist-tag for first publish:
  - `--tag latest` → what `npm install flowkit` gives by default
  - `--tag next` → claims name, doesn't become the default install
  - (recommended: `next`/`alpha` until Phase 4 smoke tests pass)
- [ ] If unsure about committing to 1.0.0 semver promises yet, start at 0.x — 0.x lets you make breaking changes without a major bump

---

## Phase 2 — package.json Hygiene (per package)

For **both** `flowkit/package.json` and `packages/create-flowkit-app/package.json`:

- [ ] `"name"` matches intended registry name exactly
- [ ] `"version"` set correctly (not left at stale `"1.0.0"` placeholder — check `flowkit/package.json:4` currently says `"1.0.0"`, confirm that's intentional and not a leftover default)
- [ ] `"description"` present and accurate (shows in npm search results)
- [ ] `"license"` field present (missing license = npm publish warns, consumers' legal/compliance tools may flag it)
- [ ] `"repository"` field points to the real GitHub URL
- [ ] `"author"` field set (or intentionally omitted)
- [ ] `"keywords"` added — affects npm search discoverability
- [ ] `"engines"` field present if there's a real Node version floor
- [ ] `"type": "module"` consistent with actual output format
- [ ] For `flowkit`: `"exports"` map correct — verify both entries resolve:
  - `"."` → `dist/lib/index.js` + `dist/types/core/config/index.d.ts`
  - `"./vite"` → `scripts/vite-plugin.js`
- [ ] For `flowkit`: `"peerDependencies"` versions are real ranges you've tested against (react/react-dom ^19, @radix-ui/* — pinned per recent "move to peerDependencies" change)
- [ ] For `flowkit`: `"files"` allowlist reviewed line by line — this is the actual security/size boundary, not a formality
- [ ] No `"private": true` accidentally left in either package.json (this silently blocks publish entirely — good failsafe to check is OFF, not ON, before you're ready)

---

## Phase 3 — Build Output Verification

- [ ] `npm run build:lib` completes with zero errors
- [ ] `dist/` actually contains what `"exports"` in package.json promises: `ls -la dist/lib/ dist/types/`
- [ ] Public API type-check: grep for path aliases leaking into `.d.ts` (known failure mode):
  ```
  grep -rn "from '@\(platform\|shared\|core\|features\|kit\|workspace\|flowlens\)" dist/types/
  ```
  → MUST return nothing. If it returns hits, fix relative imports in `src/core/config/index.ts` and anything it re-exports, rebuild, re-check.
- [ ] No source maps leaking internal file structure unintentionally (check `dist/` for `.map` files — decide if you want them shipped)
- [ ] No accidental dev artifacts in `dist/` (console.log debug statements, TODO comments meant to stay internal)

---

## Phase 4 — Pack Contents Audit (dry runs, no registry contact)

**For `flowkit`:**

- [ ] `npm pack --dry-run --json > /tmp/flowkit-pack.json`
- [ ] Review file list — confirm present: `dist/`, `scripts/` (minus `scripts/tests/`, `scripts/deploy/`, `scripts/build/format.mjs` per the `!` negations), `src/`, `docs/`, `index.html`
- [ ] Confirm ABSENT: `.env*`, `Documentation/`, `workspaces/`, `.git/`, `node_modules/`, any test fixtures with fake secrets/tokens, `.husky/`, `eslint.config.js`, `.prettierrc`, `vitest.config.ts`
- [ ] Check tarball size — sanity check nothing huge got swept in (e.g. an accidentally-committed node_modules or build cache)
- [ ] `npm publish --dry-run` (flowkit) — confirms registry-side view matches pack output, no auth/permission surprises

**For `create-flowkit-app`:**

- [ ] `npm pack --dry-run --json` (same review — `index.js`, `templates/`)
- [ ] Confirm `templates/` directory has everything a scaffold needs and nothing workspace-specific leaked in from this repo

---

## Phase 5 — Local Consumer Smoke Test (before touching the registry)

- [ ] `mkdir` a scratch project outside this repo
- [ ] `npm install /Users/mac/Documents/flowkit-app` (file: install of flowkit) — confirms package resolves and installs cleanly
- [ ] Import from consumer code: `import { defineConfig } from 'flowkit'` → confirm TypeScript resolves types with zero red squiggles, zero path-alias errors (this is the Phase 3 check's real test)
- [ ] Import `flowkit/vite` in a `vite.config.ts` → confirm virtual module generation actually works (`virtual:flowkit/config|screens|flowplans|workspace`) — this is the flat/author-mode dev-server path, currently untested
- [ ] `node packages/create-flowkit-app/index.js` (or `npm exec --package=./packages/create-flowkit-app -- create-flowkit-app`) against a scratch dir → confirm scaffold produces a working project structure
- [ ] `npm run dev` inside that scaffolded project → confirm dev server actually boots with zero `workspaces/` dir present (flat mode)
- [ ] `npm run build` inside that scaffolded project → confirm prod build succeeds in flat mode

---

## Phase 6 — Security / Legal Sweep

- [ ] Grep the pack contents for hardcoded secrets/tokens/keys — **especially check `FeedbackContext.tsx`'s `JSONBIN_CONFIG`** (client-bundled master key) — decide before publish whether this master key becomes public forever the moment it ships in the tarball. This is not reversible.
- [ ] `npm audit` on the package's own dependency tree
- [ ] Confirm LICENSE file exists in repo root and is included in the `"files"` allowlist
- [ ] Check for any workspace/customer-specific data accidentally committed under `src/` or `scripts/` that would ship to the public

---

## Phase 7 — Publish (irreversible past this line)

- [ ] Final `npm whoami` check — publishing under correct account
- [ ] `cd` to `flowkit` package root
- [ ] `npm publish --tag next` (or `--tag latest` if fully confident)
- [ ] Immediately verify: `npm view flowkit versions`
- [ ] `cd` to `packages/create-flowkit-app`
- [ ] `npm publish --tag next` (or `--tag latest`)
- [ ] Immediately verify: `npm view create-flowkit-app versions`
- [ ] Real-world install test from a totally fresh machine/directory, against the actual registry (not file:):
  ```
  npm create flowkit-app@next my-real-test
  cd my-real-test && npm install && npm run dev
  ```

---

## Phase 8 — Post-Publish

- [ ] Tag the release in git (matches `flowkit checkpoint` / `flowkit release` commands if you want the CLI-native flow)
- [ ] Update README.md / CLAUDE.md to remove "not yet live" warnings once `--tag latest` is actually promoted
- [ ] If started on `--tag next`/`alpha`: once confident, promote with `npm dist-tag add flowkit@<version> latest`
- [ ] Watch npm download stats / GitHub issues for first 48h for install-time failures you didn't catch in Phase 5
- [ ] Set a reminder: 72-hour unpublish window closes — after that, any published version is permanent (deprecate-only, no removal)

---

## Highest-Risk Item

**Phase 6, `JSONBIN_CONFIG`.** That master key going into a public npm tarball cannot be undone by unpublishing after 72h, and even within 72h anyone who installed it in that window keeps a local copy forever. Resolve this **before** Phase 7, not after.
