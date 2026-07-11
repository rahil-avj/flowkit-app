# Changelog — scoped npm canary publish rehearsal executed

Date: 2026-07-12

## Context

`temp-docs/scoped-canary-publish-plan.md` (saved 2026-07-10) laid out a plan
to rehearse the real `npm publish` → registry `install`/`npm create` path
under a personal scope (`@rahil316/*`) before the real unscoped release,
since every prior verification had only used `file:`/`--local-dev` installs.
This session executed that plan end-to-end for the first time.

## What changed

### 1. New tool: `scripts/dev/scope-toggle.js`

Reversibly toggles the repo between real (unscoped) package identity and a
scoped canary identity. `node scripts/dev/scope-toggle.js <@scope> <on|off>`.

- `on`: reads/increments a shared counter (`scripts/dev/.canary-version.json`,
  committed), stamps all 3 `package.json`'s `name`+`version` to
  `@<scope>/<name>@0.0.0-canary.<n>`, rewrites both scaffolders'
  `FLOWKIT_PUBLISHED_RANGE` to `npm:@<scope>/flowkit@0.0.0-canary.<n>`
  (npm dependency-aliasing — lets generated code keep importing the plain
  `'flowkit'` specifier while it resolves to the scoped package), and
  snapshots the originals to a gitignored transient file
  (`scripts/dev/.pre-canary-snapshot.json`) before editing.
- `off`: restores all 5 edited values from the snapshot, deletes it, leaves
  the counter untouched.
- Idempotency-guarded (a second `on` without an intervening `off` errors
  instead of double-scoping).
- Verified via a dry run: `on` → `off` reproduces a byte-identical `git diff`
  except the counter.

### 2. Real bug found and fixed: dev tooling was shipping in the published tarball

`package.json`'s `files` allowlist listed `scripts/` with only 2 negations
(`!scripts/tests/`, `!scripts/builders/format.mjs`) — no exclusion for
`scripts/dev/`. A real `npm pack --dry-run` during this session showed
`scope-toggle.js`, `.canary-version.json`, and (most importantly) the
transient `.pre-canary-snapshot.json` — containing the real unscoped package
names/versions — all shipping to consumers. Added `!scripts/dev/`; confirmed
via dry-run pack (354 → 350 files). This fix is permanent, not
canary-specific, and also protects the upcoming real unscoped publish.

### 3. `.gitignore` — added `scripts/dev/.pre-canary-snapshot.json`

Transient toggle state; must never be committed. (`.canary-version.json`, by
contrast, is committed — it's the durable "next canary number" record.)

## Executed: the actual scoped publish (first real registry publish ever, for this project)

All three packages published to the real npm registry under `--tag canary`,
kept live permanently as an ongoing pre-release channel (no unpublish step):

- `@rahil316/flowkit@0.0.0-canary.0`
- `@rahil316/create-flowkit-app@0.0.0-canary.0`
- `@rahil316/create-flowkit-workspace@0.0.0-canary.0`

npm 2FA is passkey-only on this account (no TOTP fallback), so `npm publish`
required an interactive browser/passkey approval the agent couldn't drive —
the user ran the three `npm publish --access public --tag canary` commands
directly.

### Known deviation from the plan (accepted as-is)

`dist-tags` shows `latest: 0.0.0-canary.0` on all three packages, not just
`canary`. This is standard npm behavior — a package's very first-ever
publish always gets `latest` regardless of `--tag`; there was no prior
version for `latest` to keep pointing at. User explicitly chose to leave
this rather than run `npm dist-tag rm <pkg> latest`, since a second publish
under `--tag canary` (`canary.1`, `canary.2`, ...) will not move `latest`
again — this only affects version 0.

## Verification — real-registry smoke test

Both scaffolders tested fresh, against the real published packages, in
scratch directories (not `file:`/`--local-dev`):

- `npm create @rahil316/flowkit-app@canary` — scaffolds, `npm install` pulls
  `node_modules/flowkit` resolved via the alias to
  `@rahil316/flowkit@0.0.0-canary.0` (confirmed by reading
  `node_modules/flowkit/package.json`), `npm run dev` → HTTP 200,
  `npm run build` succeeds.
- `npm create @rahil316/flowkit-workspace@canary` — same scaffold/dev/build
  checks pass. `create:workspace` and `rename:workspace` verified against
  the registry-installed `flowkit` binary
  (`node_modules/flowkit/scripts/flowkit.js ...`) — both correctly mutated
  `package.json`'s `flowkit.workspaces` and the filesystem.
  `remove:workspace` was invoked and correctly demanded an interactive
  delete-confirmation prompt; not forced through since proving the
  confirmation gate is itself the relevant safety check.

This closes the one gap every prior publish-readiness pass had left open:
"never tested against the actual registry."

## Not in scope / deferred

- The real unscoped `flowkit`/`create-flowkit-app`/`create-flowkit-workspace`
  publish at `0.1.0` — separate next mission, gated on this rehearsal, not
  started. Still needs: `package.json`'s `"private": true` removed,
  `FLOWKIT_PUBLISHED_RANGE` bumped to `'0.1.0'` in both scaffolders, all
  three `package.json` `"version"` fields bumped to match.
- Unpublishing/deprecating the scoped canary packages — intentionally not
  done; `@rahil316/*` is now a permanent, reusable pre-release test channel
  for future versions.
- Fixing the `latest` dist-tag pointing at `canary.0` — explicitly deferred
  by user decision (see above).
