# Flowkit

A browser-based UI prototyping platform for building multi-screen, flow-based interactive previews. Screens are React components. Flows are ordered sequences of screens with conditional transitions and guard rules. The CLI manages everything.

---

## Quick start

```bash
npm install
npm link          # register the `flowkit` command globally
npm run dev       # start the dev server
```

Then open [http://localhost:5173](http://localhost:5173).

---

## What it is

Flowkit gives you a live canvas with:

- **Device mockup** — phone, tablet, desktop, wearable with correct safe areas
- **Flow engine** — conditional navigation, local sandbox state, mock database mutations
- **Simulator** — color-blind vision modes, connection/network conditions, blur
- **Feedback** — per-screen comment wall with tags, screenshots, export/import to cloud
- **Debugger** — live view of flow state, transition history, db activity
- **FlowLens** — session replay, cursor heatmaps, funnel analytics, and multi-session reports
- **Mobile canvas** — full feature parity on touch devices via a bottom-sheet layout

---

## Workspace setup (this repo)

A workspace is a folder under `workspaces/`. It contains your flows, components, mock database, and design tokens — isolated from the platform and from other workspaces.

```bash
flowkit nw:my-app    # create workspace
```

Switch active workspace from the browser UI — select a workspace in the canvas shell and your choice is saved automatically.

Flowplans live at `workspaces/<name>/flowplans/`. Add a new `.ts` file there and it is picked up automatically on next dev server hot reload.

---

## Using FlowKit in your own project

> Not yet published under the real package names (`flowkit`, `create-flowkit-app`, `create-flowkit-workspace`) — the commands below describe the intended flow once that happens. A scoped canary rehearsal is live today under `@rahil316/*`; see [temp-docs/npm-checklist.md](temp-docs/npm-checklist.md) for real, working install commands in the meantime.

Outside this repo, FlowKit ships as installable packages rather than a checkout:

**Single-workspace project** — scaffold via `create-flowkit-app`. Your project root _is_ the one workspace: `flowkit.config.ts`, `flows/`, `flowplans/`, `lib/` sit directly at root, and `flowkit` is a `devDependency` in `node_modules/`.

```bash
npm create flowkit-app@latest my-app
cd my-app && npm run dev
```

**Multi-workspace project** — scaffold via `create-flowkit-workspace` instead. Each workspace is its own sibling folder at project root (`workspace-1/`, `app-b/`, …), declared explicitly in `package.json`'s `flowkit.workspaces` array.

```bash
npm create flowkit-workspace@latest my-project
cd my-project && npm run dev   # serves flowkit.workspaces[0] by default
```

Convert between the two shapes any time, and manage workspaces in a multi-workspace project:

```bash
flowkit convert:multi              # flat → multi (wraps root into workspace-1/)
flowkit convert:flat               # multi → flat (collapses back to root)
flowkit create:workspace --name:app-b --lang:ts
flowkit remove:workspace --name:app-b
flowkit rename:workspace app-b app-c
```

The rest of the CLI reference below (authoring commands, sessions, export/handoff) works the same in a scaffolded project as it does in this repo, minus the repo-mode-only commands noted in the table.

---

## Writing a screen

Screens are plain React components. Props are injected automatically — no context imports needed. Import path differs by mode: `@flowkit/types` inside this repo's own `workspaces/<name>/`, `'flowkit'` in a project scaffolded by `create-flowkit-app`/`create-flowkit-workspace`.

```tsx
// this repo (repo mode)
import type { FlowScreenProps } from '@flowkit/types'

// scaffolded consumer project (flat/multi-workspace mode)
import type { FlowScreenProps } from 'flowkit'

export default function WelcomeScreen({ onNext, onBack, db }: FlowScreenProps) {
  return (
    <div>
      <p>Hello, {db?.user?.name}</p>
      <button onClick={onNext}>Continue</button>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const screenMeta = { id: 'welcome', label: 'Welcome' }
```

---

## Flow config

Flows are defined as **flowplans** under `workspaces/<name>/flowplans/` (repo mode) or `flowplans/` at the workspace root (consumer mode). Each flowplan is a `FlowplanDef` — a typed, ordered sequence of steps with optional db patches, forks, and entry guards:

```ts
// this repo (repo mode)
import { defineFlow } from '@flowkit-core/config'

// scaffolded consumer project (flat/multi-workspace mode)
import { defineFlow } from 'flowkit'

export default defineFlow({
  id: 'onboarding',
  name: 'Onboarding',
  canEnter: ({ db }) => !db.auth.isLoggedIn,
  steps: [
    { screenId: 'WelcomeScreen' },
    { screenId: 'SignupScreen', db: { 'auth.started': true } },
    { screenId: 'SuccessScreen' },
  ],
})
```

The flowplan compiler (`compileFlowplan.ts`) converts this at runtime into a `FlowConfig` with gating, step sequencing, and db patch application. Press **F4** to enter flowplan playback mode, **F5** to restart.

---

## CLI reference

| Command                                    | Description                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `flowkit nw:<name>`                        | Create workspace (repo mode only)                                                                                  |
| `flowkit rw:<name>`                        | Remove workspace (repo mode only)                                                                                  |
| `flowkit watch:flows`                      | Watch workspace for file changes (repo mode only)                                                                  |
| `flowkit status`                           | Workspace health snapshot                                                                                          |
| `flowkit export`                           | Export as standalone HTML viewer (guided flow; always ships full codebase)                                        |
| `flowkit handoff`                          | Build developer handoff zip                                                                                        |
| `flowkit check` / `flowkit check:<domain>` | Validate authored content — screens/config/components/db/flowplans (`check:flowplans` runs automatically on build) |
| `flowkit sessions:brief`                   | Agent analytics brief from committed sessions                                                                      |
| `flowkit convert:multi`                    | Convert a flat consumer project to multi-workspace mode                                                            |
| `flowkit convert:flat`                     | Collapse a multi-workspace consumer project back to flat                                                           |
| `flowkit create/remove/rename:workspace`   | Add/remove/rename a workspace (multi-workspace consumer mode only)                                                 |
| `flowkit help`                             | Full help                                                                                                          |

Full reference: [docs/CLI.md](docs/CLI.md)

---

## FlowLens — session analytics

FlowLens is a built-in analytics mode that replays recorded user sessions and surfaces behavioral data without any external tooling.

**Recording** — sessions are captured automatically when a flow starts (if enabled), or manually from the Sessions panel. The recorder tracks interactions, navigation events, db mutations, cursor position (optional), and flow lifecycle. Everything is stored locally in IndexedDB.

**Replay** — FlowLens mounts the real workspace inside a device mockup and scrubs through recorded events, restoring db state and screen position at each point in time. Cursor ghosts and interaction markers are overlaid on the live UI.

**Analytics views:**

| View     | What it shows                                     |
| -------- | ------------------------------------------------- |
| Timeline | Chronological event stream for a single session   |
| Heatmap  | Cursor density and click concentration by screen  |
| Paths    | Screen-to-screen navigation Sankey / flow diagram |
| Funnel   | Drop-off rates across a defined screen sequence   |
| Metrics  | Duration, interaction counts, quality score, tags |

**Reports** — generate aggregate reports across multiple sessions: funnel completion rates, avg session duration, top screens by dwell time, frustrated-click frequency. Export as CSV, JSON, or Markdown.

**Session management** — sessions can be tagged, renamed, merged, filtered by quality score, and exported as `.flowkit-session.json` files (or `.bundle.flowkit-session.json` for multi-session exports). Bundles import cleanly and re-sequence events correctly on merge.

Sessions auto-prune when the library exceeds 200 entries (oldest first).

---

## Sharing your work

**Stakeholder review** — export as a single self-contained HTML file. Anyone can open it in a browser, no install required:

```bash
flowkit export            # guided flow; always ships full codebase incl. FlowLens
# → dist-standalone/index.html
```

**Developer handoff** — generate a standalone React app without any Flowkit dependency:

```bash
flowkit handoff
# → <name>-handoff-<date>.zip
# recipient: unzip → npm install → npm run dev
```

---

## Canvas shortcuts

| Shortcut              | Action                       |
| --------------------- | ---------------------------- |
| `Cmd +` / `Cmd -`     | Zoom in / out                |
| `Cmd 0`               | Reset to 100% zoom           |
| `Cmd Shift 0`         | Fit device to screen         |
| `←` / `→`             | Navigate screens             |
| `Shift ←` / `Shift →` | Navigate flows               |
| `Shift 1–4`           | Switch right panel tabs      |
| `Shift S`             | Toggle Screens ↔ Flow Map    |
| `Shift F`             | Focus screen search          |
| `Shift G`             | Go-To overlay                |
| `Cmd /`               | Action Center                |
| `Cmd Shift /`         | Keyboard shortcuts reference |

---

## Source layout

```
src/
  App.tsx                      # root — wires canvas, panels, overlays, mode switching
  workspaces.json              # workspace registry (names, labels, active)
  core/
    canvas/                    # pan, zoom, device mockup, hand tool, panel resize
    layout/                    # FlowMaster, FlowEngine, Sidebar, PanelFrame, KitSide{Explorer,Inspector}
      hooks/                   # usePanelLayout, usePanelDrag
    shortcuts/                 # keyboard shortcut registry (all hooks centralised here)
    config/                    # defineConfig(), defineFlow() type-safe helpers
  features/
    feedback/                  # comment wall, cloud push via JSONBin, export/import
    figma-export/              # FigmaExportView — multi-screen canvas grid (Cmd+Alt+Shift+P)
    flow-debugger/             # db inspector, flow state viewer
    flow-library/              # flow/screen hierarchy, flow canvas, compileFlowplan
    flowTracer/                # session recorder, IndexedDB storage, FlowLens bridge
      context/                 # SessionRecorderProvider — state machine, event hooks
      components/              # SessionCard, SessionInspect, CountdownOverlay, overlays, settings
      sessionDb.ts             # IndexedDB layer + WriteBatcher (300ms flush)
      buildSessionExport.ts    # assembles SessionExport from IDB for replay/export
      panel.tsx                # Sessions panel UI
    script-patch/              # PatchScript generators + CopyScriptButton UI primitive
  modes/
    flowlens/                  # FlowLens analytics mode (presence-gated — delete this folder to strip it from a build)
      components/              # replay controller, timeline, heatmap, paths, funnel, metrics
      analyticsEngine.ts       # metrics computation from SessionExport
      exportUtils.ts           # CSV, JSON, Markdown, SVG, PNG export
  shared/
    components/
      errors/                  # 404, 403, 500, Maintenance, Offline, NoWorkspace boundaries
      mobile/                  # MobileCanvas, BottomSheet — touch-first layout
      overlays/                # ActionCenter, Settings, GoTo, Help
      ui/                      # design system: Button, Input, Modal, Tooltip, …
    contexts/                  # Dashboard, Theme, FlowNav, FlowPlayback, FlowLens
                               # ActiveWorkspaceContext — runtime workspace switching
    utils/
      workspaceModules.ts      # glob-based db/simulator/config loaders (runtime workspace switch)
  kits/
    shared/                    # shadcn-based component kit (accordion, dialog, select, …)
```

---

## Code quality

| Check      | Command                 | Gate                                                                               |
| ---------- | ----------------------- | ---------------------------------------------------------------------------------- |
| TypeScript | `npm run build`         | Blocks build — strict mode + unused locals/params                                  |
| ESLint     | `npm run lint`          | 7 plugins: TS, React hooks, import sort, Tailwind, architecture boundaries (error) |
| Prettier   | `npm run format:check`  | Auto-applied to staged files on commit                                             |
| Tests      | `npm test`              | Vitest — pure logic suites                                                         |
| Coverage   | `npm run test:coverage` | Thresholds: statements 91%, branches 86%, functions 95%, lines 93%                 |

Architecture layer boundaries (`shared → core → features → modes → app`) are enforced as ESLint **errors** via `eslint-plugin-boundaries`. Cross-layer imports fail lint.

---

## Documentation

- [docs/CLI.md](docs/CLI.md) — Full CLI command reference
- [docs/FLOWKIT.md](docs/FLOWKIT.md) — Platform architecture
- [docs/FLOWLENS.md](docs/FLOWLENS.md) — FlowLens analytics reference
- [docs/FLOWMASTER.md](docs/FLOWMASTER.md) — Flow engine reference
- [docs/AGENTS.md](docs/AGENTS.md) — AI agent spec
