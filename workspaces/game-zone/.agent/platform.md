# Platform reference — game-zone

Terse map of the platform surfaces you can reach. Each ends in a pointer to the full doc.

### Navigation

- **Use:** `useNav()` → `navigateTo(target)`, `goNext()`, `goBack()`, `isChapter`, `flowState`
- **From:** `@flowkit-shared/utils/useNav`
- **Note:** target = a screen id, "next", "back", or "**complete**"
- **Full detail:** `Documentation/FLOWMASTER.md`

### Data

- **Use:** `useDashboard()` → `db`, `updateDb(fn)`, `resetDb()`, `navigateTo(id)`
- **From:** `@flowkit-shared/contexts/DashboardContext`
- **Note:** db/updateDb/resetDb always safe; for navigateTo() prefer `useAppNav()` (see Navigation group above) — it works standalone and during flow playback with no `isChapter` check needed; use useNav() instead for flow-only screens
- **Full detail:** `Documentation/FLOWKIT.md`

### Screen props

- **Use:** `PageProps` → `onAction?`, `onNext?`, `onBack?`, `isChapter?`, `flowState?`, `db?`
- **From:** `@flowkit/types`
- **Note:** screens are pure markup with element `id`s
- **Full detail:** `Documentation/FLOWMASTER.md`

### Flows (Flowplan hierarchy)

- **Use:** `defineFlow({ id, name, steps[], homeScreen? })` — authored in `flowplans/<flow>.ts`
- **From:** `@flowkit-core/config` → `defineFlow`
- **Note:** Screen folders: `flows/<flow>/<screen>/`. Ordering declared in `workspace.ts` → `projects.<proj>.flows[]`. `homeScreen` overrides the device home button while that plan is playing; workspace-level default is `workspace.ts` → `startPage`.
- **Full detail:** `Documentation/FLOWMASTER.md`

### Guards

- **Use:** `canEnter`/`canNotEnter`: `({ db }) => boolean`
- **From:** `pageMeta` exported from the screen `.tsx` file
- **Note:** Screen-level guards only
- **Full detail:** `Documentation/FLOWMASTER.md`

### Simulator

- **Use:** `ControlAccordion`, `SimToggle`, `SimSegmented`, `SimSelect`, `SimAction`, `SimTextInput`, `SimNumberInput`, `SimControl`
- **From:** `@flowkit-core/layout`
- **Note:** `bind="db.auth.isLoggedIn"` path; default-export a JSX component from `data/simulator.tsx`
- **Full detail:** `Documentation/FLOWKIT.md`

### Device & orientation defaults

- **Use:** `workspace.ts` → `defaultDevice` (a `DevicePreset.label`), `defaultOrientation` ("portrait" | "landscape")
- **From:** `@flowkit-core/config` → `defineConfig`
- **Note:** Both optional. `defaultDevice` must match a label in `src/shared/components/devices`; falls back to the platform default when unset/unrecognized. `defaultOrientation` is ignored if the resolved device lacks `supportsLandscape`.
- **Full detail:** `Documentation/CLI.md`

### Theme

- **Use:** `useTheme()` → `theme` (`bg.*`, `text.*`, `accent.*`, `shadow.*`), `mode`, `setMode`
- **From:** `@flowkit-shared/contexts/ThemeContext`
- **Note:** prefer tokens over hardcoded colors
- **Full detail:** `Documentation/FLOWKIT.md`

### Styling & kit

- **Use:** no kit — base `design-system/tokens.css`
- **From:** `design-system/tokens.css` (loaded at runtime by the platform shell)
- **Note:** screens/components are `.tsx`
- **Full detail:** `Documentation/FLOWKIT.md`

### Sessions

- **Use:** recording always on; `flowkit sessions:ls|import|check|stats|sample|rm`
- **From:** `src/modes/flowlens/library/game-zone/`
- **Note:** FlowLens is available when src/modes/flowlens/ exists on disk (no env flag needed)
- **Full detail:** `Documentation/FLOWLENS.md`

## CLI

| Command                                                      | What                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `flowkit plan:ls`                                            | list all flowplans in the workspace                                |
| `flowkit check / flowkit check:<domain>`                     | validate authored content — screens/config/components/db/flowplans |
| `flowkit project:ls`                                         | list projects and their flowplan counts                            |
| `flowkit status`                                             | workspace health: projects, flowplans, sessions, feedback          |
| `flowkit sessions:ls / import / check / stats / sample / rm` | manage the session library                                         |
| `flowkit sessions:brief [--append]`                          | agent brief from session data                                      |
| `flowkit help`                                               | full command reference                                             |

> **Flow ordering** is set in `workspace.ts` → `projects.<proj>.flows[]`. Use the **Manage tab** (right panel → Manage) to generate a terminal script for reordering.
>
> **Default screen** (cold load / device home button / reset-to-first) is set in `workspace.ts` → `startPage`; a flowplan's `homeScreen` overrides it while that plan is playing.
>
> **To remove a flow or screen**, delete the folder manually: `rm -rf workspaces/game-zone/flows/<flow>/`

_Generated (spec v4). Facts mirror the platform source — `flowkit agent:sync` to refresh._
