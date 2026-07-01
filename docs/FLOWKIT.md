# Flowkit

A browser-based UI prototyping platform for building multi-screen, flow-based interactive previews. Works at any fidelity — quick wireframes, polished high-fidelity mockups, or production-ready component previews. Screens are React components. Flows are ordered sequences of screens. The CLI manages everything — you never touch the router by hand.

---

## Documentation map

This folder is the platform knowledge base. Start with the one that fits your task:

| Doc                        | Covers                                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FLOWKIT.md** (this file) | Platform architecture: structure, aliases, kit system, canvas, db, theming, feedback, entry guards, export vs build.                                       |
| **FLOWMASTER.md**          | The flow engine: flowplan config (`defineFlow`), steps, forks, guards, animations, screen components, the recorded event stream.                           |
| **FLOWLENS.md**            | FlowTracer (session recorder) + FlowLens (replay mode & analytics): event types, build gating, the committed session library.                              |
| **AGENTS.md**              | How a coding agent works inside a workspace: cold-start sequence, common task recipes, the directive grammar, and the `agent:sync` source-of-truth system. |
| **CLI.md**                 | Full `flowkit` command reference with examples.                                                                                                            |
| **AUDIT.md**               | Pre-release / onboarding checklist — every subsystem, file by file.                                                                                        |

---

## Top-level structure

```
flowkit/
  src/                          ← Platform source
    core/                       ← Canvas engine, layout panels, shortcuts
      canvas/                   ← PreviewCanvas, CanvasView, canvasReducer, canvasConfig
      layout/                   ← FlowMaster, FlowEngine, KitSideExplorer, KitSideInspector
        simulator-controls/     ← ControlAccordion, SimControl, SimToggle, SimSelect, …
      shortcuts/                ← useKeyboardShortcuts
    features/                   ← Isolated product features
      feedback/                 ← Comment wall, cloud push, export/import
      flow-debugger/            ← Runtime flow state, db inspector
      flow-library/             ← Flowplan browsing, hierarchy, compileFlowplan
      flowTracer/               ← Session recorder + IndexedDB (WriteBatcher 300ms)
      simulator/                ← Accessibility settings, device settings
    modes/
      flowlens/                 ← FlowLens replay mode + analytics (lazy, build-gated)
        library/                ← Committed session JSON files per workspace
    shared/                     ← Foundation layer — contexts, utils, UI components
      contexts/                 ← DashboardContext, ThemeContext, FlowLensModeContext, …
      components/ui/            ← Button, Input, Modal, Tooltip, SegmentedControl, …
      utils/                    ← dynamicRouter, useWorkspaceFlows, applyDotPathPatch, …
    types/                      ← All shared TypeScript interfaces
    main.tsx / App.tsx          ← React entry
  workspaces/                   ← One folder per workspace
    <name>/
      flowplans/                ← Flowplan files (defineFlow) — flat format
        <flow>.ts
      flows/                    ← Flow screen folders — flat format
        <flow>/
          <screen>/
            <ScreenName>.tsx    ← Screen component
      components/               ← Workspace-scoped shared components
        ui/
        layout/
        navigation/
        forms/
        feedback/
      lib/data/db.ts                ← Mock database (named exports)
      lib/data/simulator.tsx        ← Custom simulator controls
      design-system/tokens.css  ← CSS custom properties
      lib/                      ← Workspace utility functions
      hooks/                    ← Workspace custom hooks
      assets/                   ← Images, icons, static files
      .agent/                   ← Agent onboarding (generated from agentSpec.js — see below)
        INDEX.md                ← the map: task → action → detail
        rules.md                ← directive grammar: NEVER / ALWAYS / TO … → …
        platform.md             ← terse surface reference → Documentation/*
        project.md              ← living product brief (hand-owned, never regenerated)
        .agent-meta.json        ← formatter state for agent:sync
      CLAUDE.md                 ← agent memory file (when --agent:claude; else AGENTS.md or .cursor/rules/flowkit.mdc)
      flowkit.config.ts         ← workspace-level config overrides
      index.ts                  ← Workspace entry
  scripts/                      ← Node.js CLI (never bundled by Vite)
    flowkit.js                  ← CLI entry
    lib/                        ← Command handlers: flows, workspace, export, build
  Documentation/                ← This folder
```

---

## Alias system

Path aliases keep workspace code isolated from platform code and enforce the layer hierarchy:

| Alias        | Resolves to            | Use for                                           |
| ------------ | ---------------------- | ------------------------------------------------- |
| `@shared`    | `src/shared/`          | Contexts, UI components, utils — foundation layer |
| `@core`      | `src/core/`            | Canvas shell, layout panels, shortcuts            |
| `@features`  | `src/features/`        | Isolated product features                         |
| `@flowlens`  | `src/modes/flowlens/`  | FlowLens mode (lazy-loaded chunk)                 |
| `@kit`       | `src/kits/shared/`     | Radix/shadcn kit utilities                        |
| `@platform`  | `src/`                 | Prefer scoped aliases above                       |
| `@workspace` | `workspaces/<active>/` | Active workspace screens and config               |

`<active>` is the workspace name stored in `localStorage` (key `flowkit:active_workspace`). It is set via the browser UI workspace switcher, or by the URL param `?workspace=<name>` on load.

**Always use the most specific alias:** `@shared/contexts/ThemeContext` beats `@platform/shared/contexts/ThemeContext`.

**Common imports in screen files:**

```ts
import type { FlowScreenProps } from '@platform/types'
import { useDashboard } from '@shared/contexts/DashboardContext'
import '@workspace/design-system/tokens.css'
```

Screens **do not need to import `db`** — it is injected as a prop by the canvas automatically.

---

## Kit system

The kit system provides a shared component library and CSS token architecture that workspaces consume via the `@kit` alias. All kits use the same Shadcn/Radix-backed components — what changes between themes is CSS variables, not JSX.

### Architecture layers

```
src/kits/shared/
  tokens/
    base.css           ← theme-agnostic scales (spacing, font sizes, fallback vars)
    themes/
      apple.css        ← --kit-* vars under [data-kit="apple"]
      material.css     ← --kit-* vars under [data-kit="material"]
      neo-brutalism.css
    dark.css           ← dark mode overrides under [data-mode="dark"]
  styles/
    button.css         ← structural styles + kit-button escape hatch
    card.css, input.css, ...  (one file per component)
  components/          ← Shadcn/Radix components (source-copied)
  lib/utils.ts         ← cn() helper (clsx + tailwind-merge)
  utilities.css        ← semantic utility classes (.card, .surface, .bg-elevated, etc.)
  index.css            ← imports all layers in order
  index.ts             ← KIT_MANIFEST (components + themes list)
```

CSS cascade order: base → theme → dark mode → component styles → utilities → workspace overrides.

### Using kit components in a screen

```tsx
import { Button, Card, Input } from '@kit/components'

export default function LoginScreen() {
  return (
    <Card>
      <Input placeholder="Email" />
      <Button>Sign in</Button>
    </Card>
  )
}
```

### Using utility classes on custom components

Semantic classes consume `--kit-*` vars and re-skin automatically when the kit changes:

```tsx
function StatCard({ label, value }) {
  return (
    <div className="card">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-primary text-lg">{value}</span>
    </div>
  )
}
```

**Three-tool mental model:**

| Need                   | Use                                                    |
| ---------------------- | ------------------------------------------------------ |
| Layout / structure     | Tailwind (`flex`, `grid`, `w-full`)                    |
| Visual identity        | Kit utilities (`.card`, `.bg-elevated`, `.text-muted`) |
| Per-component override | Escape hatch (`.kit-button`, `.kit-card`, etc.)        |

### Token naming convention

All CSS vars use the `--kit-` prefix:

| Var                                     | Meaning                  |
| --------------------------------------- | ------------------------ |
| `--kit-bg`                              | Page / screen background |
| `--kit-bg-elevated`                     | Cards, panels            |
| `--kit-bg-overlay`                      | Modals, popovers         |
| `--kit-bg-sunken`                       | Input wells, inset areas |
| `--kit-scrim`                           | Modal backdrop           |
| `--kit-brand`                           | Primary action color     |
| `--kit-text` / `--kit-text-muted`       | Text colors              |
| `--kit-border` / `--kit-border-strong`  | Border colors            |
| `--kit-radius-sm/md/lg/full`            | Border radii             |
| `--kit-shadow-sm/md/lg`                 | Box shadows              |
| `--kit-font`                            | Font stack               |
| `--kit-space-1` through `--kit-space-8` | Spacing scale            |

### Workspace-level overrides

In `design-system/tokens.css`, import the kit first, then override any vars:

```css
@import '@kit/index.css';

:root {
  --kit-brand: #1a1a2e; /* workspace-specific brand color */
}
```

### Setting a kit

In `src/workspaces.ts`:

```ts
{ name: "my-app", label: "My App", path: "workspaces/my-app", config: { kit: "material" } }
```

Or via CLI: `flowkit nw:my-app --kit:material`

The canvas reads `config.kit` and sets `data-kit="material"` on the preview wrapper — all components and utility classes respond automatically.

### Adding a new theme

1. Create `src/kits/shared/tokens/themes/my-theme.css` — define all `--kit-*` vars under `[data-kit="my-theme"]`
2. Add `"my-theme"` to `KIT_MANIFEST.themes` in `src/kits/shared/index.ts`
3. Run `flowkit kit:check` to see coverage gaps

> `WorkspaceConfig.kit` is a plain `string` — no type union to update. Any string value is accepted; the canvas sets `data-kit="<value>"` on the preview wrapper.

### Adding a new component

1. `npx shadcn@latest add <component>` — outputs to `src/kits/shared/components/`
2. Add `kit-{name}` class to the root element
3. Add structural styles to `src/kits/shared/styles/{name}.css`
4. Add component name to `KIT_MANIFEST.components` in `src/kits/shared/index.ts`

---

## JavaScript workspaces

Workspaces can be authored in plain JavaScript/JSX instead of TypeScript. The platform core (`src/`) always stays strictly typed — only workspace files are affected.

### Setting a workspace to JS

In `src/workspaces.ts`, set `config.language` to `"js"`:

```ts
{ name: "my-workspace", label: "My Workspace", path: "workspaces/my-workspace", config: { language: "js" } }
```

The platform will then pick up `.jsx` screen files and `.js` flowplan files.

### Writing screens in JSX

```jsx
// flows/home/home/HomeScreen.jsx
export default function HomeScreen({ db }) {
  return (
    <div>
      <button id="continue-btn">Continue</button>
    </div>
  )
}
```

For screen props:

```js
/** @param {import('@platform/types').FlowScreenProps} props */
export default function HomeScreen({ db }) { ... }
```

### Isolation guarantee

- `src/` is compiled by `tsconfig.app.json` (`strict: true`, `allowJs: false`) — untouched.
- `workspaces/` is compiled by `tsconfig.workspace.json` (`allowJs: true`, `checkJs: false`, `strict: false`).
- The two tsconfigs have non-overlapping `include` arrays — no leakage in either direction.

---

## Router

Workspaces have no `router.tsx`. Screens are discovered by `useWorkspaceHierarchy()` via Vite glob from `flows/**`. The flowplan files (`defineFlow`) in `flowplans/*.ts` declare step sequences; no router file is generated or needed.

---

## Mock database

Every workspace has `lib/data/db.ts` — a plain TypeScript module of named exports.

```ts
export const auth = { isLoggedIn: true, isGuestUser: false }
export const user = { id: 'u1', name: '…', email: '…', plan: 'pro' }
export const settings = { theme: 'dark', language: 'en' }
```

`DashboardContext` imports it on startup and holds a live copy. Screens receive it as the `db` prop — no import needed. Mutations go through `updateDb` from `useDashboard()`.

---

## Mobile canvas

On narrow viewports (or touch devices) the platform switches to `MobileCanvas` — a `BottomSheet`-based layout with full feature parity to the desktop canvas.

### Layout

- **Main area** — device mockup fills the screen; BottomSheet slides up from the bottom.
- **Bottom sheet tabs** — Inspect / Feedback / Settings (three top-level tabs).
- **Inspect rail** (sub-tabs): Info · Simulator · Flow · Database · Sessions. Sessions tab is gated by `showSessionsFeature`.
- **Feedback** — full `FeedbackContent` panel, same as desktop.
- **Settings rail** (sub-tabs): Interface · Panel · Sessions · **Workspace**.

### Workspace sub-tab

The Workspace sub-tab shows the active workspace name and lets you switch to any other registered workspace. `switchWorkspace()` from `@platform/workspaces` is called on tap. This is the mobile equivalent of the desktop workspace dropdown in `WorkspaceBar`.

### Active tab indicator

Rail buttons use an inset left-border accent: `boxShadow: "inset 2px 0 0 <blue>"` + a 10% blue tinted background. This avoids layout shift from a real `borderLeft`.

### `BottomSheet` drag behavior

`BottomSheet` resets `dragOffset` to 0 via `handleClose` (a `useCallback` wrapper around the parent's `onClose`) whenever the sheet closes — whether via backdrop tap or drag-to-dismiss. This keeps the sheet's initial position clean on re-open without calling `setState` inside an effect.

---

## Canvas and simulator

`PreviewCanvas` wraps every active view in a device mockup. It handles:

- **Device frame** — phone / tablet / desktop / wearable with correct safe areas
- **Zoom + pan** — keyboard shortcuts (see table below); zoom is tracked per device type (`zoomByType`) so switching devices restores their last zoom level
- **keepFit mode** — device fills 90% of visible width and 80% of visible height (whichever is the binding constraint); toggled with `Cmd Shift 0` or `0`
- **Simulator panel** — connection mode, network speed, color-blind filters, blur
- **Feedback** — comment wall, tags, screenshot attachment, export/import, badge count
- **FlowLens mode** — toggle into session replay + analytics over the same canvas (build-gated, lazy). See `FLOWLENS.md`.
- **db injection** — passes `db` as a prop to every rendered screen automatically

### Canvas architecture

All canvas state lives in a `useReducer` (`canvasReducer.ts`). Constants are defined once in `canvasConfig.ts`.

**`canvasConfig.ts`** — single source of truth:

| Constant                | Value            | Meaning                                                     |
| ----------------------- | ---------------- | ----------------------------------------------------------- |
| `CANVAS_SIZE`           | `4000`           | Fixed panning surface (px)                                  |
| `CANVAS_DEVICE_MARGIN`  | `0.95`           | Device must fit within this fraction of canvas              |
| `FIT_TARGET_W`          | `0.9`            | Fraction of visible width the device fills in keepFit mode  |
| `FIT_TARGET_H`          | `0.8`            | Fraction of visible height the device fills in keepFit mode |
| `ZOOM_MIN` / `ZOOM_MAX` | `0.25` / `5`     | Zoom bounds                                                 |
| `ZOOM_STEP`             | `0.1`            | Zoom increment per step                                     |
| `LEFT_PANEL_MIN/MAX`    | `200` / `480` px | Left panel drag limits                                      |
| `RIGHT_PANEL_MIN/MAX`   | `280` / `560` px | Right panel drag limits                                     |

**`canvasReducer.ts`** — state shape:

- `viewportW/H` — measured canvas viewport dimensions
- `leftPanelW`, `rightPanelW` — current panel widths
- `fitScale` — computed fit scale for the current device and viewport
- `keepFit` — boolean; when true, `scale` tracks `fitScale` continuously
- `zoomByType` — per-device-type zoom map; switching device types restores their last zoom
- `scale` — derived each action via `derive()`; equals `fitScale` when `keepFit` is on, else the stored per-type zoom
- `scrollIntent: "center"` — set by actions that need the device re-centered; consumed by a `useLayoutEffect` and cleared by `SCROLL_DONE`
- `fullscreen` — boolean

Actions: `MEASURED`, `TOGGLE_KEEP_FIT`, `BREAK_KEEP_FIT`, `TOGGLE_FULLSCREEN`, `ZOOM_IN`, `ZOOM_OUT`, `RESET_ZOOM`, `SET_ZOOM`, `SET_PANEL_WIDTH`, `SCROLL_DONE`.

The `MEASURED` action receives `effectiveRightW` — `RAIL_W` (40 px) when the right panel is collapsed, full width when open — so `computeFitScale` always uses the actual visible width.

### Canvas layout

`PreviewCanvas` root is a CSS Grid: `gridTemplateColumns: leftPanelW 1fr rightPanelW`, `gridTemplateRows: minmax(0, 1fr)`.

- Left panel (col 1) and right panel (col 3) sit at `z-index: 2` — they visually overlay the canvas.
- `CanvasContent` (canvas + scrollbars + device) spans `grid-column: 1 / -1` at `z-index: 0` — it fills the full grid width underneath the panels.
- The scroll container (`canvas-scroll`) uses `position: absolute; top: 0; bottom: 0; left: var(--left-panel-w); right: var(--right-panel-w)` — inset by the panel widths so scrollbar tracks render in the visible canvas gap between panels, not hidden behind them.
- `--left-panel-w` and `--right-panel-w` are CSS custom properties on the root div, inherited by the scroll container. They update live on every drag pixel — no React re-render is needed for scroll position changes.
- Both scrollbars (vertical and horizontal) are always visible within the canvas area regardless of panel state or resizing.

### Panel resizing

- `livePanelW` state drives the CSS column widths live on every drag pixel via the CSS custom properties above.
- The reducer's `SET_PANEL_WIDTH` action is fired debounced (300 ms) so `fitScale` is only recomputed after the drag settles — not on every pixel.

### Canvas keyboard shortcuts

| Shortcut              | Action                                                                |
| --------------------- | --------------------------------------------------------------------- |
| `Cmd +` / `Cmd -`     | Zoom in / out                                                         |
| `Cmd 0`               | Reset to 100% zoom, re-centers device                                 |
| `Cmd Shift 0`         | Toggle keepFit (fit device to visible area)                           |
| `0`                   | Same as `Cmd Shift 0` — toggle keepFit                                |
| `F`                   | Toggle fullscreen                                                     |
| `Escape`              | Exit fullscreen                                                       |
| `H`                   | Toggle hand/pan tool lock (canvas must have focus)                    |
| `Space` (hold)        | Temporary hand/pan tool (canvas must have focus)                      |
| Middle mouse button   | Pan canvas                                                            |
| `←` / `→`             | Previous / next screen                                                |
| `Shift ←` / `Shift →` | Previous / next flow                                                  |
| `Shift 1–4`           | Switch right panel tabs (Info / Simulator / Flow Debugger / Feedback) |
| `Shift ,` / `Shift .` | Previous / next sub-tab within the active panel tab                   |
| `Shift S`             | Toggle left panel: Screens ↔ Flow Map                                 |
| `Shift F`             | Focus the screen search input                                         |
| `Shift G`             | Open Go-To overlay (search all flows and screens)                     |
| `Cmd /`               | Open Action Center (searchable command palette)                       |
| `Cmd Shift ?`         | Open keyboard shortcuts reference                                     |

### Simulator settings (from `useDashboard()`)

When **Ignore all Simulator Settings** is enabled, all controls below it are dimmed and non-interactive.

| Setting          | Type             | Values                             |
| ---------------- | ---------------- | ---------------------------------- |
| `connectionMode` | `ConnectionMode` | `"wifi" \| "mobile" \| "airplane"` |
| `networkSpeed`   | `NetworkSpeed`   | `"strong" \| "weak" \| "offline"`  |
| `colorBlindMode` | `ColorBlindMode` | `"none"` + 7 vision modes          |
| `blurryVision`   | `number`         | 0–8, blur amount in px             |

---

## Feedback

The feedback tab lets reviewers leave per-screen comments without leaving the browser.

- Comments are attributed to **"Me"** while reviewing — author is set at export time
- Each author gets a unique avatar color derived deterministically from their name
- Team members defined in `src/features/feedback/teamMembers.ts` get suggested in the export author picker
- **Wall sort order**: groups sorted by screen label (A→Z); comments within each group sorted by timestamp (oldest first)
- Screens that have comments show a muted comment icon in the sidebar screen list
- **Local export**: MD tile downloads a shareable Markdown report (includes a `Tags:` line per comment), JSON tile downloads a re-importable backup — tiles are direct download buttons, no selection step
- **Cloud export**: toggle via Action Center (`Cmd /` → "Push Feedback to Cloud"). Requires a JSONBin access key or master key (stored locally, never bundled). Pushes JSON to JSONBin; share the returned bin URL for the recipient to import via the Import modal's "From Cloud" tab.

### Action Center (`Cmd /`)

A searchable command palette. Opens as a floating overlay on desktop and as a full-width panel on mobile.

**Scroll behaviour** — the search row is `flexShrink: 0` (always visible); the results list below it is `flex: 1, overflowY: auto`. The outer overlay wrapper has a `maxHeight: 70vh` cap but does **not** itself scroll — only the results div scrolls. This keeps the search input pinned regardless of result count.

---

### Importing feedback

The import modal accepts JSON and Markdown feedback files. Three input methods:

| Method              | How                                                                            |
| ------------------- | ------------------------------------------------------------------------------ |
| **Drag & drop**     | Drag a `.json` or `.md` file onto the drop zone — highlights green on hover    |
| **File picker**     | Click the drop zone to open a file chooser                                     |
| **Clipboard paste** | Click "Paste from Clipboard" — reads `navigator.clipboard.readText()` directly |

Both JSON and MD are auto-detected by content (first character). Imports are deduplicated by `id` and merged with `isImported: true`. The `importCommentsFromText(text)` method on `FeedbackContext` accepts raw string content and handles both formats.

### Feedback keyboard shortcuts (within the Feedback tab)

| Shortcut      | Action                                |
| ------------- | ------------------------------------- |
| `Cmd K`       | Add comment                           |
| `Cmd I`       | Open import modal                     |
| `Cmd Shift F` | Toggle auto-filter for current screen |

---

## Simulator controls authoring

Each workspace has `lib/data/simulator.tsx` — a default-exported React component rendered inside the Simulator panel's custom controls tab. Use the platform primitives from `@core/layout/simulator-controls`:

```tsx
import { ControlAccordion, SimControl, SimAction } from '@core/layout/simulator-controls'

export default function WorkspaceSimulatorControls() {
  return (
    <>
      <ControlAccordion label="Auth" defaultOpen>
        <SimControl label="Logged In" bind="db.auth.isLoggedIn" />
        <SimControl label="Guest User" bind="db.auth.isGuestUser" />
      </ControlAccordion>

      <ControlAccordion label="User">
        <SimControl label="Plan" bind="db.user.plan" options={['Free', 'Pro', 'Enterprise']} />
      </ControlAccordion>
    </>
  )
}
```

### `SimControl` — smart binding

`bind` accepts any `db.*` path or a `DashboardContext` key. The control type is inferred automatically:

| Value type               | Rendered as               |
| ------------------------ | ------------------------- |
| `boolean`                | Toggle                    |
| `string` with `options`  | Segmented control         |
| `string` without options | Text input                |
| `number`                 | Number input              |
| `array`                  | Editable array            |
| `object`                 | Editable key-value object |

### `ControlAccordion` visibility props

Both `ControlAccordion` and `SimControl` accept `onlyForFlow` and `onlyForScreen` props to show controls only when a specific flow or screen is active:

```tsx
<ControlAccordion label="Checkout" onlyForFlow="checkout-flow">
  <SimControl label="Cart total" bind="db.cart.total" />
</ControlAccordion>

<SimControl label="Error state" bind="db.form.hasError" onlyForScreen="PaymentScreen" />
```

### `SimAction`

A button that calls a function with the full dashboard context:

```tsx
<SimAction label="Reset Database" icon="Trash2" badgeColor="red" onClick={ctx => ctx.resetDb()} />
```

---

## Entry guards

Screens declare access rules in `screenMeta` — evaluated against the live `db`:

```ts
export const screenMeta = {
  desc: 'Pro feature',
  canEnter: ({ db }) => db.user.plan === 'pro',
  canNotEnter: ({ db }) => !db.auth.isLoggedIn,
}
```

`EntryGuard` type: `(context: { db: any }) => boolean`

Guards control whether the sidebar shows the screen as locked. Both `canEnter` and `canNotEnter` can coexist — if either blocks, the guard fails.

---

## Export vs Build

| Command           | Output                                                | Purpose                                                                                           |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `flowkit export`  | `dist-standalone/<outDir>/<name>-<date>-<HH-MM>.html` | Full Flowkit viewer, single self-contained HTML — share with designers / PMs, no install required |
| `flowkit handoff` | `handoff/<name>-handoff-<date>.zip`                   | Pure React app — no Flowkit shell, recipient runs `npm install && npm run dev`                    |

Output directory and naming are configured in `vite.config.standalone.ts` (`outDir`) and `scripts/lib/export.js` (`USE_GENERIC_NAME`). Old exports accumulate — never auto-deleted.

---

## Agent bootstrap system

Agent-ready workspaces are a core value prop: drop a coding agent in and it builds correctly and fast, without reading the whole codebase. Every workspace ships a **layered, lookup-first** file set, all generated from one platform spec (`scripts/lib/agentSpec.js`) so it never drifts.

| File                                                                  | Purpose                                                                                                                       |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| memory file — `CLAUDE.md` / `AGENTS.md` / `.cursor/rules/flowkit.mdc` | Auto-ingested by the chosen agent. Identity + read-order + the hardest `NEVER`/`ALWAYS` directives. Chosen at `nw --agent:…`. |
| `.agent/INDEX.md`                                                     | The map: `Task → Action → Detail`. The fast-lookup layer — the agent finds any task in one hop, no blind search.              |
| `.agent/rules.md`                                                     | Full directive set in a structured grammar: `NEVER` / `ALWAYS` / `TO <task> → <action>`.                                      |
| `.agent/platform.md`                                                  | Terse platform reference (hooks, types, CLI, kit), each row pointing to the full `Documentation/*.md`.                        |
| `.agent/project.md`                                                   | Hand-owned product brief — flows, data model, decisions. **Never regenerated.**                                               |
| `.agent/.agent-meta.json`                                             | Formatter state (agent, kit, language, spec version) for `agent:sync`.                                                        |

**Read order for a cold agent:** memory file → `rules.md` → `INDEX.md` → (depth only when a row points there) → `platform.md` / `Documentation/*`.

**Single source → many agents.** `agentSpec.js` holds the facts once; `agent.js` formats them into whichever agent's native file. Regenerate with `flowkit agent:sync` (also switches agent via `--agent:`). `docs/overview.md` remains the human-facing project doc — `.agent/` is agent-only.

For how an agent actually _works_ a workspace — the cold-start sequence, task recipes, and the directive grammar — see **`Documentation/AGENTS.md`**.

---

## Workspace workflow

```bash
flowkit nw:<name>                    # Create workspace
flowkit plan:ls                      # List all flowplans
flowkit plan:check                   # Validate flowplans — also runs as prebuild gate
flowkit status                       # Workspace health: flows, screens, flowplans, sessions
flowkit export                       # Export as standalone HTML viewer
flowkit handoff                      # Build developer handoff zip
```

Workspace switching is done via the browser UI (or `?workspace=<name>` URL param).

Full command reference: [CLI.md](CLI.md)
