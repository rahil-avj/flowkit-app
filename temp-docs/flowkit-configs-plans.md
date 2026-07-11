# FlowKit config surface — design diary

Live tracking doc for new keys being added to `defineConfig()`'s config object,
started because the export-profiles brainstorm (2026-07-11) grew fast enough
that scattering decisions across chat would risk losing them. Append dated
entries below as the shape evolves — do not silently rewrite past entries;
mark them superseded instead, same convention as `decisions.md`.

This is a design log, not the implementation itself — once a shape here is
built for real, the canonical source of truth is `src/types/index.ts` (typed
interfaces) and `src/core/config/defineConfig.ts` (runtime identity helper).
Cross-reference, don't duplicate.

---

## 2026-07-11 — Export profiles + output config (initial design)

### Why this exists

`flowkit export`/`export:full` only work in repo mode today (see
`docs/CLI.md`'s Export section, `scripts/builders/export.js`'s
`requireRepoMode()` gate) — confirmed live during canary-publish testing this
session. Fixing that for consumer projects (flat + multi-workspace mode)
surfaced a real design question: repo mode's `export` vs `export:full` split
works by temporarily renaming `src/modes/flowlens/` out of the way, which
can't be done against a consumer's `node_modules/flowkit/` (mutating an
installed package). Needed a mechanism that gives consumers real control
without touching `node_modules`.

### Decision: named export profiles, generalized beyond just FlowLens on/off

Rather than hardcode one FlowLens boolean, the config supports named profiles
with an `excludes` list — extensible to other exclusion kinds later, but
**only `'flowlens'` is a real, implemented exclusion value for now** (explicit
scope decision — flow/screen-level exclusion per profile was considered and
deferred, not built).

### Decision: umbrella `export` key on `defineConfig()`, not flat top-level keys

Chosen over separate `exportProfiles`/`exportOutput` top-level keys because
this conversation kept adding related sub-concerns (profiles → output
filename → output destination) — one growing concept, so one namespace.
Matches user's mental model better than flat keys that all happen to start
with `export*`.

### Current shape (design-stage, not yet implemented)

```ts
interface ExportProfile {
  excludes?: string[] // only 'flowlens' meaningful today; extensible later
}

interface ExportFilenameContext {
  workspaceName: string
  profileName: string // 'default' when no --profile:<name> given
  date: string // '2026-07-11'
  time: string // '21-30'
}

interface ExportOutputConfig {
  dir?: string // override for the default 'dist-standalone' destination
  filename?:
    | string // token template: {name} {profile} {workspace} {date} {time} {timestamp}
    | ((ctx: ExportFilenameContext) => string) // user-authored function, full control
}

interface ExportConfig {
  profiles?: Record<string, ExportProfile>
  output?: ExportOutputConfig
}

// New key on the object passed to defineConfig():
{
  workspace: {...},
  flows: [...],
  screenOrder: {...},
  export?: ExportConfig,
}
```

Example usage in a project's `flowkit.config.ts`:

```ts
export default defineConfig({
  workspace: { name: 'acme' },
  flows: [...],
  export: {
    profiles: {
      user: { excludes: ['flowlens'] },
      reviewer: { excludes: [] },
    },
    output: {
      dir: 'exports',
      filename: '{name}-{profile}-{timestamp}',
    },
  },
})
```

### CLI surface decisions

- **`flowkit export --profile:<name>`** — new flag, not a colon-suffix
  command. Repo mode's existing `export:<workspace-name>` / `export:all`
  convention (per `docs/CLI.md`) is preserved unchanged and means what it
  means today; profile selection is a separate flag so there's no ambiguity
  between "which workspace" and "which profile."
- **No `--profile:` given** → interactive prompt lists the profiles defined
  in `export.profiles` (same list-picker UX already used for workspace
  selection), rather than silently picking a default.
- **`flowkit export:full` kept as a shorthand** for the built-in
  no-exclusions case, so existing repo-mode muscle memory/docs stay valid.
- **Filenames**: plain `flowkit export` with no profile keeps today's exact
  behavior untouched (generic `index.html`, stamped name only on collision)
  — zero regression risk for existing repo-mode users. Any explicit
  `--profile:<name>` always routes through the configurable
  `export.output.filename` template (default template TBD if user hasn't
  set one — needs a sensible built-in default before implementation).

### Open questions (not yet resolved)

- Exact default filename template when `export.output.filename` is unset
  but a profile *was* explicitly requested.
- Whether `export.output.dir` is relative to the consumer project root
  always, or mode-aware (repo mode vs. consumer mode) like `workspacePath()`.
- Whether profiles are consumer-mode-only or also usable in repo mode (repo
  mode currently has its own separate stash/no-stash mechanism for the same
  FlowLens on/off concern — do profiles replace that internally, or coexist
  as a parallel mechanism?).

### Status

**Superseded by the 2026-07-12 entry below.** Kept for history — the
`export` umbrella key on `defineConfig()`, the function-valued `filename`,
and the `excludes` array shape were all replaced by a simpler design once
`flowkit.json` became a separate plain-JSON file. Do not implement anything
from this section.

---

## 2026-07-12 — Final shape: `workspace.ts` + `flowkit.json` split

### Why this changed from the 2026-07-11 design

Continued brainstorming surfaced three problems with the original design:

1. Putting `export` settings inside `flowkit.config.ts` mixed two unrelated
   concerns — per-workspace content registration (`flows`, `screenOrder`)
   and export/build settings — in one file.
2. The user wanted export settings to live at the **project root**, shared
   across all workspaces in multi-workspace mode, not per-workspace.
3. Once export settings moved to their own file, making that file **plain
   JSON** (simpler, no `esbuild` bundling needed, matches "just a settings
   file" mental model) became viable — but JSON can't hold a function, so
   the earlier `filename: (ctx) => string` escape hatch was explicitly
   dropped in favor of token-template strings only.

Separately, the user flagged that the whole system resolves
workspace-critical files (`flowkit.config.ts`, workspace folder locations)
by hardcoded string convention duplicated across ~24 call sites, with no
single source of truth — folded into the same implementation pass as
infra hardening, not deferred.

### Final decision: two files, two concerns, no overlap

- **`workspace.ts`** (renamed from `flowkit.config.ts`) — unchanged role,
  still per-workspace (`workspace`/`flows`/`screenOrder`), still
  TypeScript, still read via the existing `esbuild`-based reader in
  `vite-plugin.js`. Lives at project root in flat mode, inside each
  `workspace-N/` folder in multi mode — same location convention as
  today, just a new filename.
- **`flowkit.json`** (new) — plain JSON, always at the **project root**
  regardless of mode. Holds `exportDefaults` and **one flat, shared
  `exportProfiles` block** (not per-workspace — considered and rejected;
  same profile definitions apply no matter which workspace is being
  exported).

### Final shape

```json
// flowkit.json (project root, both flat and multi-workspace mode)
{
  "exportDefaults": {
    "exportPath": "./dist"
  },
  "exportProfiles": {
    "user": {
      "includeFlowlens": false,
      "exportPath": "./output",
      "exportName": "{workspace}-{profile}-{timestamp}"
    },
    "reviewer": {
      "includeFlowlens": true
    },
    "dev": {}
  }
}
```

- Only `includeFlowlens` is real/implemented. Other inclusion flags
  (`includeFeedback` was floated as an example) and flow/screen-level
  exclusion are explicitly deferred — the shape is meant to be
  extensible, the implementation is not extended beyond FlowLens yet.
- `exportName` is a **token-template string only**:
  `{workspace}` `{profile}` `{date}` `{time}` `{timestamp}`. No function
  support — dropped once `flowkit.json` became plain JSON. Default
  template when a profile omits it: `{workspace}-{profile}-{timestamp}`.
- `exportPath` always resolves relative to the **project root**, not
  per-workspace, even in multi-workspace mode — one shared output
  location. Falls back to `exportDefaults.exportPath`, which falls back
  to `./dist` (already gitignored in both scaffolders' generated
  `.gitignore` — confirmed, no new gitignore work needed).
- **Superseded by the 2026-07-12 (part 2) entry below**: this originally
  said plain `flowkit export` with no `--profile:` flag keeps today's
  exact generic-`index.html` behavior untouched. That's no longer true —
  `export:full` was removed and `export` became an always-guided flow. See
  below.

### File-location hardening (folded into the same task)

Two related infra changes, endorsed as in-scope for the same
implementation pass, not deferred to later:

1. **Config filenames become named constants** in a new
   `scripts/helpers/config-filenames.js`, imported everywhere instead of
   retyped as string literals — currently duplicated across ~24 files
   (confirmed via `grep -rln "flowkit\.config\.ts"`).
2. **`package.json`'s `flowkit.workspaces` becomes an object keyed by
   workspace name with an explicit `path`**, replacing today's plain
   name array whose folder location is only ever assumed by string
   convention:
   ```json
   "flowkit": {
     "mode": "multi",
     "workspaces": { "workspace-1": { "path": "workspace-1" } }
   }
   ```
   Rejected an earlier version of this idea that put the path/config
   registry inside `flowkit.json` itself (a `flowkit.config.json` shape
   with `workspaces: { name: { path, project-config } }`) — that would
   have duplicated what `package.json`'s own manifest key already owns,
   with two sources of truth able to drift out of sync. The registry
   stays in `package.json`; `flowkit.json` stays export-settings-only.

### Status

Superseded in part by the entry below (`export:full` removal). The
`flowkit.json` shape and file-location hardening above are still final.

---

## 2026-07-12 (part 2) — `export:full` removed; always-guided CLI flow; two-file split

### Decision: no more `export:full`, `flowkit export` is always guided

Once profiles existed as a real concept, keeping a separate `export:full`
command as a special-cased shortcut stopped making sense — a project with
zero profiles defined doesn't need a different command, it just needs the
profile-picker's choice list to have exactly one entry ("Everything, no
exclusions").

**New behavior, consumer mode:**
- `flowkit export --profile:<name>` still works as a non-interactive
  shortcut.
- Plain `flowkit export` (no flag) is **always** a guided, mode-aware
  prompt flow:
  1. **Workspace step** — asked only in multi-workspace mode with 2+
     workspaces. Flat mode never asks (not a valid question — only one
     implicit workspace exists). Multi mode with exactly one workspace also
     skips it.
  2. **Profile step** — always asked, never skipped, regardless of how many
     profiles exist. The list always includes an "Everything (no
     exclusions)" entry — the old `export:full` behavior lives on as
     always-present list item, not a separate command.
- Repo mode's own `export:<workspace-name>` / `export:all` colon-suffix
  convention is untouched — this guided flow is additive for consumer
  mode, not a replacement of repo mode's existing UX.

### Decision: split CLI prompting from build execution into two files

`scripts/builders/export.js` keeps its role as the CLI-facing entry point —
arg parsing, mode detection, all interactive prompting. A **new file,
`scripts/builders/run-export.js`**, owns the actual mode-agnostic build
execution (generate vite config, run the build, resolve output path/name) —
takes fully-resolved parameters, does no prompting and no mode branching of
its own. `export.js` calls into it after resolving parameters through its
own prompts, for both repo mode and consumer mode.

Rationale (user's own framing): keep "the actual export scripts that can
handle any kind of export" separate from "the terminal guide that asks the
right questions depending on mode and invokes the actual export scripts
with the right parameters" — makes the build logic independently reusable
later without dragging the interactive layer along.

### Status

Superseded in part by the entry below — repo mode was unified onto the same
guided flow, not left untouched as originally scoped, and `includeFlowlens`
was removed entirely.

---

## 2026-07-12 (part 3) — Repo mode unified; includeFlowlens removed

### Decision: repo mode gets the exact same guided flow, not a separate one

Originally scoped as consumer-mode-only, with repo mode's existing
`export`/`export:full` commands staying untouched. Changed mid-implementation
per the user: the only real difference between the two modes is whether
there's more than one workspace to choose from (repo mode: any number of
`workspaces/*` dirs; consumer multi-mode: 2+ entries in `flowkit.workspaces`)
— so both now go through the identical `flowkit export [--workspace:<name>]
[--profile:<name>]` guided flow. `export:full` and the colon-suffix
`export:<name>`/`export:all` dispatch are gone from the router.

`flowkit.json` (holding `exportProfiles`/`exportDefaults`) now also has a
**repo-mode reader** — lives at the monorepo `ROOT`, same shared/flat
structure as consumer mode (one set of profiles, not per-workspace).

### Decision: includeFlowlens removed entirely, not deferred to a flag

Building the unified flow surfaced a **pre-existing bug**, unrelated to this
task: `vite.config.standalone.ts` never included the `flowkit()` plugin, so
`src/modes/flowlens/useSessionLibrary.ts`'s `virtual:flowkit/workspace`
import was always unresolvable in a repo-mode standalone build — meaning
`export:full`'s "include FlowLens" promise may never have actually worked in
the final HTML file. Investigating this further revealed FlowLens's actual
UI code isn't reachable in `viteSingleFile()`'s output at all regardless of
any flag, a deeper problem than one task should absorb.

User's call: stop gating FlowLens by a flag entirely for now. Every export,
in both modes, always ships the full codebase — no exclusions. `includeFlowlens`
is removed from `ExportProfile` (was a design placeholder, never had a second
real implemented flag anyway). Proper feature-gating (deciding what's
actually excludable, and making exclusion genuinely work end-to-end) is a
future task, not attempted here.

### Real bugs found and fixed along the way (not originally in scope, all necessary to reach a working state)

1. **`vite.config.standalone.ts` missing the `flowkit()` plugin** — added it
   (matching this repo's own `vite.config.ts` pattern), which also required:
2. **`readFlowkitConfig()`'s esbuild shim only handled the bare `'flowkit'`
   specifier**, not `@platform/core/config` (repo-mode workspaces' own import
   convention) — the shim was never previously exercised against a
   repo-mode workspace file because the dev server's virtual-module
   resolution is lazy (FlowLens is a lazy-loaded chunk) while a standalone
   build's bundling is eager. Fixed by shimming both specifiers.
3. **Repo root's own `index.html` got accidentally deleted** during this
   session's testing (unrelated `rm` cleanup gone wrong) — restored via
   `git checkout`. Caught because it broke every standalone build with a
   confusing "cannot resolve entry module" error.
4. **`agent-workflow-plans/*.md` (3 files) were found deleted** in the
   working tree partway through this session, cause unclear (predates this
   session's own actions as far as could be traced) — restored via `git
   checkout`. Flagging here since this directory is explicitly
   memory-tagged as "not stale, don't archive."
5. **Scaffolded flat-mode demo screens (`HomeScreen`/`DetailScreen`/
   `SetupScreen`/`ReadyScreen`) fail `tsc --noEmit`** in every fresh
   scaffold — `db?.items ?? []` against `FlowScreenProps`'s `db: Record<string,
   unknown>` hits a TS quirk where `unknown` narrowed through `??` becomes
   `{}`, incompatible with an explicit array type annotation. Repo mode's
   own templates (`scaffold.js`) don't hit this because `useDashboard()`
   types `db` as `Record<string, any>`, not `unknown`. Fixed per user's
   direction: cast `db as any` once at the top of each affected screen
   template in `workspace-template.js` (not per-access), matching repo
   mode's existing looseness rather than tightening either convention.
6. **`create-flowkit-workspace`'s generated `vite.config.ts` template did
   `fs.readFileSync('./package.json')` with no `@types/node`** — pre-existing,
   surfaced once Phase 3's rename made this codepath exercised in testing.
   Added `@types/node` to the scaffolder's generated `devDependencies`.
7. **Consumer-mode ESLint pre-flight check hard-blocks every export** since
   neither scaffolder ships an `eslint.config.js` — `export.js` now skips
   the ESLint check (with a one-line notice) when no config file is found,
   `tsc` still gates.
8. **Temp vite config for consumer-mode export was written to the OS temp
   dir**, breaking Node module resolution for `@vitejs/plugin-react`/
   `vite-plugin-singlefile`/`flowkit/vite` (no `node_modules` ancestor to
   resolve against from there). Fixed by writing it inside the project root
   instead (`.flowkit-export-<timestamp>.mjs`, gitignored in both
   scaffolders).
9. **`ensureSinglefilePlugin()`'s auto-install of `vite-plugin-singlefile`
   silently converted a `--local-dev` real-copy `flowkit` install back into
   a symlink**, breaking `isRepoMode()` detection immediately after (a
   plain `npm install` re-resolves a `file:` dep without `--install-links`).
   Fixed by detecting whether `node_modules/flowkit` is currently a real
   directory before the install and re-passing `--install-links` if so.

### Status

Final, implemented, and verified state. See
`/Users/mac/.claude/plans/purrfect-swinging-hoare.md` for the plan this
was built from (though repo mode's scope and `includeFlowlens` both
changed mid-implementation per the entries above — this diary is the
accurate final record, the plan file describes the pre-repo-mode-unification
intent).

**Verification performed:** repo-mode export (single + multi workspace,
named profile + default), flat-mode consumer export (fresh `--local-dev`
scaffold), multi-workspace consumer export (single + multi workspace, flag
+ interactive paths), `npx tsc --noEmit` clean, `npx eslint .` clean, all
134 vitest tests pass, all 32 CLI integration tests pass.
