---
name: flowkit-author
description: Command FlowKit's authoring CLI and file formats precisely — create/remove/rename workspaces, chapters, pages, flowplans, and components; add/remove flowplan steps; wire simulator controls; understand exactly what each command does to disk and where it silently fails. Use for any authoring task in a FlowKit workspace (repo, flat, or multi-workspace mode), not just the common recipes.
---

Every fact below was checked against source (file:line), not against other docs. Where this
contradicts CLAUDE.md/README, this is the one that was re-verified — trust this file for CLI
mechanics.

Vocabulary note: FlowKit's core terms are **Chapter** (a grouping of pages, formerly called
"Flow") and **Page** (one component file/folder, formerly called "Screen"). A **Flowplan** is a
separate, third concept — an authored playback script — and was never renamed; don't conflate it
with a Chapter. `FlowMaster`, `FlowLens`, and the package name `flowkit` are brand names, also
never renamed.

# Mode you're in matters

Three modes, detected by `scripts/helpers/paths.js#isRepoMode()` (checks for `.flowkit-repo-root`
marker at repo root) and `scripts/helpers/flowkit-manifest.js#isMultiMode()` (reads `package.json`'s
`flowkit.mode`):

| Mode                                         | Workspace lives at                                                  | Create/remove workspace                                                                |
| --------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Repo (this checkout)                         | `workspaces/<name>/`                                                | `flowkit nw:<name>` / `rw:<name>` (repo-mode only, gated by `requireRepoMode()`)       |
| Flat (consumer, `create-flowkit-app`)        | project root itself                                                 | N/A — one implicit workspace, is `process.cwd()`                                       |
| Multi (consumer, `create-flowkit-workspace`) | sibling folder per `package.json`'s `flowkit.workspaces[name].path` | `flowkit create:workspace` / `remove:workspace` / `rename:workspace` (flat/multi-only) |

All other authoring commands (`create:chapter`, `create:page`, `add:step`, etc.) work in every mode —
they resolve the target workspace via `resolveWorkspace()` + `workspacePath()`, which branches on
the mode internally. You never need to change command form between modes, only workspace-creation
commands differ.

**`--workspace:<name>` flag**: optional on every authoring command. In repo mode, defaults to the
active workspace in `src/workspaces.json`. In flat mode it's meaningless (there's only `cwd`). In
multi mode it defaults to `flowkit.workspaces` object's first key.

---

# Creating things

## Workspace (repo mode only)

```bash
flowkit nw:my-app
```

Scaffolds (exact file list, `scripts/helpers/scaffold.js`):

```
index.ts                                        # barrel, empty by default
lib/data/db.ts                                   # mock db — named exports become db.* keys
lib/data/simulator.tsx                           # simulator control panel for this workspace
lib/design-system/tokens.css
workspace.ts                                      # defineConfig() — chapters[], pageOrder{}, startPage
.flowkit/components.json                         # empty array — component registry
flowStories/onboarding-flow.ts
flowStories/home-flow.ts
flowBook/onboarding-flow/welcome-screen/WelcomePage.tsx
flowBook/onboarding-flow/setup-screen/SetupPage.tsx
flowBook/onboarding-flow/ready-screen/ReadyPage.tsx
flowBook/home-flow/home-screen/HomePage.tsx
flowBook/home-flow/detail-screen/DetailPage.tsx
lib/docs/overview.md
```

Note: the old workspace-level `flows/_tags.ts` annotation-tags sidecar file is gone. Annotation
badges are now declared per-page via `screenMeta`/`pageMeta.annotations` — see the demo pages'
commented-out example.

Also registers the workspace in `src/workspaces.json` and runs `flowkit agent:sync` to generate
`CLAUDE.md`/`AGENTS.md`/`.cursor/rules/flowkit.mdc` for the new workspace. Has rollback on failure.

Demo pages import `PageMeta` from `@flowkit/types` and `useAppNav` from `@flowkit-shared/utils`
for navigation (plus `useDashboard` from `@flowkit-shared/contexts` too, on pages that also read
`db`) — **not** `PageProps`. They use the direct-navigation convention (see Page navigation
conventions below), not the FlowMaster-injected-props convention. Don't assume every scaffolded
page uses `PageProps` — the demo ones deliberately don't.

## Chapter

```bash
flowkit create:chapter --name:checkout [--workspace:<name>]
```

`--name:` required, kebab-case (enforced by `assertKebab`). Creates `flowBook/<name>/` and registers
it in `workspace.ts`'s `chapters[]` + initializes `pageOrder[name] = []`
(`scripts/authoring/chapters.js`).

## Page

```bash
flowkit create:page --flow:checkout --name:payment-form [--label:"Payment Form"] [--workspace:<name>]
```

`--flow:` and `--name:` required (both kebab-case; the flag is still named `--flow:`, not
`--chapter:`, even though the concept is now called Chapter). `--label:` optional, defaults to
title-cased name. Fails if the chapter doesn't exist yet, or the page id is already taken.

**Exact output path**: `flowBook/<chapterId>/<pageId>/<PascalName>.{tsx|jsx}` — one directory per
page (`scripts/authoring/pages.js`). The generated filename/function name is suffixed `Page` as
the CLI's own convention (e.g. `PaymentFormPage.tsx`, `export default function PaymentFormPage()`)
but this suffix is **not required** — page identity is derived from folder position, never
filename. A hand-authored page file can be named anything. Confirmed against the real scaffold
(`WelcomePage.tsx` lives at `flowBook/onboarding-flow/welcome-screen/WelcomePage.tsx`) — do not
assume a flat `flowBook/<chapter>/pages/*.tsx` layout, and don't assume the folder segment name
matches the filename (it commonly won't, e.g. `welcome-screen/WelcomePage.tsx`).

Page identity: the page's own id is the **last folder segment** (`welcome-screen` in the example
above, not derived from the `.tsx` filename). Folders can nest arbitrarily deep between the
chapter folder and the page folder — only the first segment (chapter id) and the last segment
(page id) matter for identity; everything in between is cosmetic/organizational.

Registered composite id shown to the user is `${chapterId}-${pageId}` (e.g.
`checkout-payment-form`), built by `makePageId()` — collision-proof across chapters. Internally,
`workspace.ts`'s `pageOrder` map still stores the **bare** page id (chapter-scoped already, no
collision risk there); the composite form is only used for flowplan step references and other
cross-chapter/global contexts. Don't confuse the two: `pageOrder.<chapterId>[]` holds bare ids,
flowplan `steps[].pageId` holds composite ids.

Registration into `workspace.ts`'s `pageOrder.<chapterId>[]` is **automatic** — no manual config
edit needed after `create:page`.

Generated template (TS mode) imports `PageProps` via the mode-aware helper (see Import
correctness below) and destructures `{ onNext: _onNext, db: _db }` — underscore-prefixed because
the placeholder body doesn't use them yet and this repo's `tsconfig` has `noUnusedLocals: true`.
Rename the `_`-prefixed bindings back to real names as you wire up the page; the underscore is
not a convention to preserve.

### Hiding a page/chapter without deleting it

Prefix the folder (or file) name with a single `_` to hide it from the default Pages-tab browsing
UI — it stays fully real, parsed, compiled, checked, and playable; a flowplan step can still
reference it. Prefix with `__` instead to make it practically non-existent — excluded from
parsing, `check:*`, flowplan reference resolution, and `flowkit status` counts entirely. A `__`
ancestor anywhere in the path dominates a `_` ancestor at any depth. Use `flowkit list:pages
--hidden` / `--gone` / `--all` to see hidden/non-existent/every-tier pages respectively (default
listing shows neither).

### Ambiguous page folders

A page folder is expected to contain exactly one real (non-`_`/`__`-prefixed) component file. If
it contains two or more, the alphabetically-first file is picked deterministically as the real
page, and `flowkit check:pages` reports a non-blocking `page/ambiguous-folder` warning (never
fails the build) naming the winner and telling you to `__`-prefix or remove/rename the other
file(s).

## Flowplan

```bash
flowkit create:flowplan --name:checkout-flow [--workspace:<name>]
```

Creates `flowStories/<name>.ts` with an empty `steps: []`. Import line is generated via
`resolveDefineImport('defineFlow')` — correct for whatever mode you're in (see below).

## Component

```bash
flowkit create:component --name:StatusBadge --path:lib/components/ui [--desc:"..."] [--workspace:<name>]
```

`--name:` must be PascalCase (validated). `--path:` is workspace-relative and validated to stay
inside the workspace (`assertWithinWorkspace`). Writes `<path>/<Name>.{tsx|jsx}`, registers it in
`.flowkit/components.json` (array of `{name, path, desc, createdAt}`), and auto-appends an export
line to a barrel `index.ts`/`index.js` in the same directory if one exists.

---

# Flowplan steps — the sharp edge

```bash
flowkit add:step --flowplan:checkout-flow --screen:payment-form \
  [--on:submit-btn] [--action:"User submits payment"] [--position:2] [--workspace:<name>]
```

`--flowplan:` and `--screen:` required (the flag is still `--screen:`, taking a **bare** page id —
the CLI resolves which chapter that bare id belongs to and writes the composite `chapter-page` id
into the step for you; you never type the composite form yourself). `--screen:` is validated
against the union of all `pageOrder` values — fails with a "did you mean" suggestion if not found.
No `--force` flag on this command (unlike some others).

**How the mutation actually works** (`scripts/authoring/flowplans.js`):

1. Reads the flowplan file as text, strips the `import` line and the `export default defineFlow(`
   wrapper, and evaluates the remainder with `new Function()` to get the JS object back out.
2. Splices the new step into the resulting `steps` array (respecting `--position:` if given).
3. Re-serializes **only** the `steps: [...]` block back into the file via a **non-greedy regex**
   (`/steps:\s*\[[\s\S]*?\]/`) — everything else in the file (imports, `db`, `simulator`, `homeScreen`,
   comments) is left untouched, but the regex only matches up to the _first_ `]`.

**Consequence — do not use `add:step`/`remove:step` on a flowplan that has `forks`.** The step
formatter (`formatStep()`) only emits `pageId`/`on`/`actionNote`/`decisionNote`/`annotation` — it
has no serialization path for a step's `forks: [...]` array, and the non-greedy regex will match the
first closing bracket, not the true end of the array, once forks are present. The source comment
confirms this ("works for simple step arrays (no fork nesting)"). If a flowplan has forks, either
hand-edit it directly or use `promote:chapter` to pull the fork out first.

```bash
flowkit remove:step --flowplan:checkout-flow --index:2 [--workspace:<name>]
```

0-based index, same regex-rewrite mechanism and same fork caveat.

## Forks in flowplans

Forks aren't created via CLI — author them directly in the flowplan file. Note `pageId` values
inside a flowplan file must be the **composite** `chapter-page` form (matching what `add:step`
writes), not a bare page id:

```ts
{
  pageId: 'checkout-cart',
  on: 'checkout-btn',
  forks: [
    { label: 'Empty cart', steps: [{ pageId: 'checkout-empty-cart' }] },              // terminal
    { label: 'Payment fails', steps: [{ pageId: 'checkout-error' }], mergesTo: 'next' }, // rejoins
  ],
}
```

`mergesTo: 'next'` rejoins the parent flow at the step after the fork's entry point; omit it for a
terminal branch. Forks are recursive (a fork's steps can themselves have forks).

## Promoting a fork to its own flowplan

```bash
flowkit promote:chapter --flowplan:flowStories/checkout-flow.ts --fork:"Payment fails" [--as:payment-fails-flow]
```

`--flowplan:` and `--fork:` required; `--as:` optional (defaults to kebab-cased fork label).
Locates the fork by regex-matching its `label`, then does a **bracket-depth scan** (aware of quotes
and escapes) to find the true end of that fork's `steps: [...]` array — this is the one place in
the authoring CLI that correctly handles nested brackets, unlike `add:step`. Writes a new standalone
flowplan file with those steps, but **does not** edit the source file — it prints a one-line comment
you must manually add at the fork site referencing the new flowplan.

## Reference another flowplan inline

```ts
steps: [
  { pageId: 'onboarding-welcome' },
  { ref: 'shared-auth-flow' }, // FlowplanRef — inlines that flowplan's steps here, namespaced
]
```

`isFlowplanRef()` type-guards on presence of `ref`. The compiler (`compileFlowplan.ts`) inlines the
referenced plan's steps at this position when building the runtime `ChapterConfig`.

---

# Import correctness — don't hardcode either mode's import path

Any authoring command that generates a **brand-new file** must not hardcode `'flowkit'` or
`'@flowkit-core/config'` for its `defineFlow`/`defineConfig`/`PageProps` import — the correct
one depends on repo vs. flat/multi mode. Two helpers in `scripts/helpers/paths.js` exist specifically
because this was gotten wrong twice before (`create:flowplan` hardcoded `'flowkit'`, breaking repo
mode; `promote-chapter.js` hardcoded `'@flowkit-core/config'`, breaking consumer mode):

```js
resolveDefineImport('defineFlow') // → `import { defineFlow } from '@flowkit-core/config'` (repo)
// → `import { defineFlow } from 'flowkit'`               (flat/multi)
resolveTypeImport('PageProps') // same branch, for type-only imports
```

If you ever write a new file-generating authoring command, use these — don't inline the import
string. (This is distinct from `config-patch.js`'s `writeConfig()`, which round-trips an _existing_
file's import line rather than generating one from scratch — different mechanism, same underlying
mode-awareness requirement.)

---

# Page navigation conventions — two, don't mix

1. **Direct nav — use `useAppNav()`** (`@flowkit-shared/utils`):
   `const { navigateTo } = useAppNav(); onClick={() => navigateTo(id)}`. No `isChapter` prop, no manual
   guard. The hook reads `FlowNavCtx` non-throwing (unlike `useNav()`, which throws outside a
   chapter) and picks FlowMaster's chapter-aware `navigateTo` (routes through `commitNavigation` —
   guards, animations, debugger, recording) when this page is rendered inside a chapter, or
   `DashboardContext`'s `navigateTo` otherwise. Calling it unconditionally is always safe — there
   is no code path where the wrong navigation state machine fires. `scripts/helpers/scaffold.js`'s
   demo pages use this.

   A page may instead call `useDashboard().navigateTo(id)` directly, guarded with
   `onClick={() => !isChapter && navigateTo(id)}`. This works, but the guard must be written by hand on
   every call site, and forgetting it doesn't throw — it silently _also_ fires during chapter playback,
   pushing onto `DashboardContext`'s view history and desyncing it from `FlowEngine`'s step index.
   `useAppNav()` avoids this by never requiring the guard in the first place. `useAppNav()` does not
   expose `db` — pages that need `db` also call `useDashboard()` alongside it (see the scaffold's
   `SetupPage`/`ReadyPage`/`HomePage`/`DetailPage` templates for the two-hooks-together pattern).

2. **FlowMaster-injected props** (`PageProps`: `onAction`/`onNext`/`onBack`,
   `src/types/index.ts:410-439`): only non-`undefined` during active flowplan playback. FlowMaster
   also does DOM-`id`-based event delegation independent of any `onClick` — `handleContainerClick`
   (`src/core/layout/FlowMaster.tsx`) walks up from the click target looking for an
   ancestor whose `id` matches the current step's `on` field, and advances the chapter if found. A
   button just needs `id="submit-btn"` to match a step's `on: 'submit-btn'` — no `onClick` required.
   Off-script taps (inside the container but not matching `on`) trigger a visual "off-script" flash;
   they don't error. This mechanism is independent of convention (1) — off-script detection, the
   "Show Hints" glow effect, and `useFlowplanElementCheck`'s dev-mode authoring diagnostic (warns
   when a step's `on` doesn't match any real element on the page) all structurally depend on `on`
   being a queryable DOM id — none of it is affected by which hook a page uses for direct
   navigation.

Pick one convention per page. `id="submit-btn"` (convention 2) and `onClick={() => navigateTo(id)}`
via `useAppNav()` (convention 1) can coexist on the same element without conflict — this is exactly
what the scaffold's demo buttons do (an `id` for FlowMaster's delegation, plus a `useAppNav()`-backed
`onClick` for Pages-tab standalone use — the panel is still UI-labeled "Screens tab" in the app
today, not yet renamed). What you must never do is combine convention 2's `id` with an
_unconditional, unguarded_ `useDashboard().navigateTo()` call — that double-fires (once via React's
bubble-phase `onClick`, again via FlowMaster's container-level delegation) and desyncs chapter
state from dashboard nav state.

---

# Simulator controls

Barrel: `src/features/simulator/controls/index.ts` — exports `ControlAccordion`, `SimAction`,
`SimControl`, `SimNumberInput`, `SimSegmented`, `SimSelect`, `SimTextInput`, `SimToggle`. Verified
exhaustive — `SimArrayEditor`/`SimObjectEditor` exist as files but are deliberately not exported.

Per-workspace controls live in `lib/data/simulator.tsx` (default export, a React component) — see
the scaffold example:

```tsx
import { ControlAccordion, SimAction, SimControl } from '@flowkit-features/simulator/controls'

export default function WorkspaceSimulatorControls() {
  return (
    <ControlAccordion label="User" defaultOpen>
      <SimControl label="Name" bind="db.user.name" />
      <SimControl label="Plan" bind="db.user.plan" options={['Free', 'Pro', 'Enterprise']} />
    </ControlAccordion>
  )
}
```

Per-step overrides use `StepSimulatorOverride` (`hide?: string[]`, `exclusive?: SimulatorControl[]`)
on a `FlowStep`'s `simulator` field — not a CLI-managed concern, author it directly in the flowplan.

---

# db patching

`FlowStep.db` and `Fork.db` are `DotPathPatch` (`Record<string, unknown>`), applied via
`applyDotPathPatch(db, patch)` (`src/shared/utils/applyDotPathPatch.ts`) — immutable, dot-path keys
auto-vivify nested objects, objects deep-merge, arrays and primitives replace wholesale:

```ts
applyDotPathPatch({ user: { plan: 'free' } }, { 'user.plan': 'pro' })
// → { user: { plan: 'pro' } }
```

⚠️ `setAtPath`/`deepMerge` reject `__proto__`/`prototype`/`constructor` keys at any nesting depth
(both in dot-path segments and in nested patch values) — this was a real prototype-pollution gap,
fixed. Still, avoid passing wholly untrusted external input as a patch key without your own review.

---

# Validating what you authored

```bash
flowkit check              # all 5 domains
flowkit check:flowplans    # prebuild gate — npm run build always runs this
flowkit check:pages
flowkit check:config
flowkit check:components
flowkit check:db
flowkit check:pages:my-workspace   # domain + explicit workspace
flowkit check --json
```

Domains map to `scripts/checks/index.js`'s `DOMAINS` table: `pages`, `config`, `components`, `db`,
`flowplans`. Exits non-zero if `report.errorCount > 0` — this is what blocks `npm run build`. Note:
`page/ambiguous-folder` findings are `severity: 'warning'` and marked `requiresAcknowledgment:
true` — surfaced in a distinct section of the printed report, but never counted toward
`errorCount`, so they never block the build on their own.

Rule ids you'll see: `page/no-default-export`, `page/missing-meta`, `page/meta-id-mismatch`,
`page/meta-missing-label`, `page/ambiguous-folder`, `config/chapter-mismatch`,
`config/empty-chapter`, `config/orphaned-id`, `config/orphaned-dir`, `flowplan/invalid-page`,
`flowplan/id-filename-mismatch`, `flowplan/empty-steps`, `flowplan/empty-workspace`,
`flowplan/weak-step`.

---

# Full flag reference (verified against source, not paraphrased)

| Command             | Required flags                                  | Optional flags                                      |
| -------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| `create:chapter`    | `--name:`                                       | `--workspace:`                                       |
| `remove:chapter`    | `--name:`                                       | `--workspace:`, `--force` (if pages exist)          |
| `list:chapters`     | —                                                | `--workspace:`                                       |
| `create:page`       | `--flow:`, `--name:`                            | `--label:`, `--workspace:`                          |
| `remove:page`       | `--flow:`, `--name:`                            | `--workspace:`                                       |
| `rename:page`       | `--flow:`, `--name:` (old id), `--to:` (new id) | `--workspace:`                                       |
| `move:page`         | `--name:`, `--from-flow:`, `--to-flow:`         | `--workspace:`                                       |
| `list:pages`        | —                                                | `--flow:`, `--hidden`, `--gone`, `--all`, `--workspace:` |
| `page:info`         | `--flow:`, `--name:`                            | `--workspace:`                                       |
| `create:flowplan`   | `--name:`                                       | `--workspace:`                                       |
| `remove:flowplan`   | `--name:`                                       | `--workspace:`, `--force`                            |
| `add:step`          | `--flowplan:`, `--screen:`                      | `--on:`, `--action:`, `--position:`, `--workspace:` |
| `remove:step`       | `--flowplan:`, `--index:`                       | `--workspace:`                                       |
| `create:component`  | `--name:`, `--path:`                            | `--desc:`, `--workspace:`                           |
| `promote:chapter`   | `--flowplan:`, `--fork:`                        | `--as:`, `--workspace:`                             |
| `add:export`        | `--barrel:`, `--name:`                          | `--workspace:`                                       |

Flag syntax is `--name:value` or `--name:"quoted value"` (`scripts/helpers/args.js#parseStringFlag`
strips only leading/trailing quote characters, not internal escapes).

`--gone` on `list:pages` is the only way to see `__`-prefixed non-existent items — every other
listing mode (default, `--hidden`, `--all`) walks the registered `workspace.ts` config, but
non-existent items are by definition never registered there, so `--gone` walks the filesystem
directly instead.

---

# Type shapes (verbatim from `src/types/index.ts`)

```ts
interface FlowplanDef {
  id: string
  name: string
  description?: string
  tags?: string[]
  db?: Record<string, unknown> | string // inline baseline OR "db/<preset>.ts" ref (preset loading Phase-1-stubbed)
  simulator?: { controls: SimulatorControl[] }
  homeScreen?: string // device home-button target during this plan's playback
  steps: FlowplanStepEntry[] // FlowStep | FlowplanRef
}

interface FlowStep {
  pageId: string // composite `chapter-page` form, not a bare page id
  on?: string // element id whose tap advances; omit = tap-anywhere
  db?: DotPathPatch
  actionNote?: string // playback overlay caption
  decisionNote?: string // step-list narrative
  annotation?: string // canvas sticky note
  simulator?: StepSimulatorOverride
  forks?: Fork[]
}

interface Fork {
  label: string
  db?: DotPathPatch
  steps: FlowStep[]
  mergesTo?: 'next' // omit = terminal branch
}

interface FlowplanRef {
  ref: string
}

interface PageProps<TState = Record<string, unknown>, TDb = Record<string, unknown>> {
  onAction?: (actionName: string, payload?: unknown) => void
  onNext?: () => void
  onBack?: () => void
  isChapter?: boolean
  state?: TState // NOT flowState — that field name was dropped in the Chapter/Page rename
  db?: TDb
}
```

All fields on `PageProps` are `undefined` when the page is previewed standalone — check
`isChapter` to branch, don't assume `onNext` exists.

Note: `InteractionCtx` (the context passed to interaction `do` functions and conditional `goTo`
resolvers) is a **separate** type from `PageProps` and still uses the field name `flowState` —
it's internal FlowMaster/FlowEngine plumbing that was deliberately left unrenamed, distinct from
the author-facing `PageProps.state`/`AppNav.state` fields. Don't conflate the two when reading
either type's fields.
