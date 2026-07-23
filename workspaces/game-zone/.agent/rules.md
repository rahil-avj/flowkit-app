# Rules — game-zone

Directives the agent operates under. Grammar: **NEVER** (hard stop), **ALWAYS** (default), **TO** `<task>` **→** `<action>` (the one right way).

## Files & isolation

- **NEVER** edit any file outside `workspaces/game-zone/` — platform code in `src/` is read-only
- **NEVER** reference or edit `flows/router.tsx` or any `_playFlow.ts` — this workspace uses the Flowplan hierarchy format; those files do not exist here
- **ALWAYS** use path aliases: `@flowkit/` → `src/`, `@workspace/` → this workspace. Never relative `../../`

## Flows & screens — Flowplan hierarchy

Screens live under `flows/<flow>/<screen>/`. Journeys are declared in `flowplans/<flow>.ts` using `defineFlow`. There is no `_playFlow.ts` and no `flows/router.tsx`.

- **TO** add a flow with screens **→** create the folder `flows/<FlowName>/<ScreenName>/` and add a `<ScreenName>.tsx` component
- **TO** add a screen to an existing flow **→** create `flows/<FlowName>/<ScreenName>/<ScreenName>.tsx`
- **TO** remove a flow or screen **→** delete the folder: `rm -rf workspaces/<ws>/flows/<flow>/`
- **TO** reorder flows **→** edit the `flows[]` array in `workspace.ts`, or use the **Manage tab** (right panel) to copy a terminal patch script
- **NEVER** hand-write new flow/screen files from scratch — copy an existing screen boilerplate, then fill the body
- **ALWAYS** a screen's function name ends in `Screen` and matches its filename; it exports `pageMeta` with at least `desc`

## Navigation (two independent conventions — know which one you need)

- **TO** navigate from screen logic during flow playback (state/async) **→** `const { navigateTo, goNext, goBack } = useFlowNav()`
- **TO** wire tap interactions declaratively during flow playback **→** add an `interactions` map in the flowplan step for the screen
- **NEVER** call `useFlowNav()` unconditionally in a screen meant to also work standalone — it throws when there's no FlowMaster ancestor (i.e. viewed from the Screens tab, no flow active)
- **TO** make a screen freely navigable from the Screens tab (no flow active) as well as during flow playback **→** `const { navigateTo } = useAppNav()` (from `@flowkit-shared/utils`), then call it unconditionally: `onClick={() => navigateTo(id)}`. `useAppNav()` picks FlowMaster's flow-aware navigateTo when the screen is rendered inside a flow, or DashboardContext's otherwise — no `isChapter` check needed in the screen's own code. See scripts/helpers/scaffold.js's demo screens for the pattern.
- **NEVER** destructure `navigateTo` from `useDashboard()` directly and call it inside a screen that also relies on FlowMaster's guards/animations/session-replay during playback — use `useAppNav()` for a screen that needs to work both standalone and in-flow, or `useFlowNav()` if the screen is flow-only

## Data

- **ALWAYS** read/mutate data via `const db = useDb()` (`@flowkit-shared/utils`) — safe get/has/set/remove/update helpers over the injected `db`; falls back to `const { db, updateDb } = useDashboard()` only when you need the raw object/setter directly
- **NEVER** `import { … } from "@workspace/lib/data/db"` inside a screen — direct import breaks flowplan db-patching; use the injected `db` from `useDashboard()`/`useDb()`
- **NEVER** write a hand-rolled dot-path walker against `db` — `useDb()`'s `set`/`remove`/`update` reject `__proto__`/`prototype`/`constructor` paths; a raw `updateDb(fn)` mutation callback does not
- **TO** mutate data **→** `useDb().set('auth.isLoggedIn', true)` (or `useDb().update('cart.count', n => n + 1)`)

## Styling

- **ALWAYS** use Tailwind utilities for static values; inline `style={{}}` only for dynamic/computed values
- **NEVER** hardcode hex colors — use `design-system/tokens.css` variables or `useTheme()` tokens

## Project brief

- **ALWAYS** read `.agent/project.md` before starting any build work — it is the only source of product context. If it is empty or a template, ask the user to fill it before proceeding
- **ALWAYS** after a `flowkit sessions:brief --append` run, re-read `.agent/project.md` — the "Last session analysis" section contains the next iteration focus

_Generated from the platform spec (v4). Run `flowkit agent:sync` to refresh._
