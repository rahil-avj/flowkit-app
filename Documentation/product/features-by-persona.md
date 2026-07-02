# FlowKit Features by Persona

> **Baseline snapshot** — current built features as of June 2026, organized by who each feature is for (U1–U5).
> This is a product/UX-facing view. The engineering-facing feature registry (status, subsystem, phase) lives at `Documentation/project-plans/vision/FEATURES.md` — that one is actively maintained; this one is a point-in-time snapshot and won't be kept in sync automatically.

---

## Legend

| Users                       |
| --------------------------- |
| U1 — Platform Developer     |
| U2 — Workspace Author       |
| U3 — UX Researcher          |
| U4 — Stakeholder / Teammate |
| U5 — Workspace Recipient    |

---

## Canvas & Playback

| Feature                    | Description                                                                                                 | Users  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| Interactive preview canvas | Pan, zoom, multi-screen grid; mode-switched between interactive and Figma export view                       | U2, U4 |
| Flow engine                | Interaction state machine; handles screen transitions, hotspots, swipe gestures, off-script toasts          | U2, U4 |
| FlowMaster renderer        | Single-flow playback; swipe navigation, presentation mode, step gating                                      | U2, U4 |
| Flowplan system            | Scripted journey playback — `defineFlow()` steps with action notes, screen gating, DB patching at each step | U2, U4 |
| Flowplan compiler          | Pure compiler: `FlowplanDef` → `FlowConfig` + `CompiledStep[]`; separates authoring format from runtime     | U1, U2 |
| Keyboard shortcuts         | Full keyboard navigation — zoom, screen/flow switch, tab switching, Go-To, Action Center, flowplan playback | U2     |

---

## Simulator

| Feature                        | Description                                                                                                                                                       | Users  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Device presets                 | Phone, tablet, desktop, wearable mockup shells with accurate frame rendering                                                                                      | U2, U4 |
| Orientation toggle             | Portrait/landscape switch; updates canvas layout                                                                                                                  | U2, U4 |
| Network speed simulation       | Simulate slow/fast connections to stress-test loading states                                                                                                      | U2, U3 |
| Color vision deficiency filter | CVD filter picker — simulate deuteranopia, protanopia, tritanopia, achromatopsia                                                                                  | U2, U3 |
| Blurry vision simulation       | Blur filter for accessibility testing                                                                                                                             | U2, U3 |
| Simulator controls primitives  | `SimToggle`, `SimSelect`, `SimSegmented`, `SimAction`, `SimTextInput`, `SimNumberInput`, `ControlAccordion`, `SimControl` — reusable inspector UI building blocks | U1     |

---

## Workspace Management

| Feature                                | Description                                                                       | Users |
| -------------------------------------- | --------------------------------------------------------------------------------- | ----- |
| Workspace scaffolding (`flowkit nw`)   | Creates full workspace directory structure with flows, flowplans, lib, config     | U2    |
| Workspace removal (`flowkit rw`)       | Removes workspace and cleans registry                                             | U2    |
| Active workspace switching             | Switch active workspace from browser UI                                           | U2    |
| Workspace registry sync                | `workspaces.json` as runtime source of truth; Vite plugin reconciles on dev start | U1    |
| File watcher (`flowkit watch`)         | Hot-watches workspace files for changes                                           | U2    |
| Status snapshot (`flowkit status`)     | Health overview: flows, sessions, feedback, agent state                           | U2    |
| Project listing (`flowkit project:ls`) | Lists all projects in the active workspace                                        | U2    |

---

## Sidebars & Inspector

| Feature                             | Description                                                             | Users  |
| ----------------------------------- | ----------------------------------------------------------------------- | ------ |
| Screen/flow explorer (left sidebar) | Tree view of all screens and flows; filterable                          | U2, U4 |
| Inspector (right sidebar)           | Tabbed panel: Simulator / Debug / Sessions / Feedback                   | U2, U3 |
| Flow library / Screens hierarchy    | Flowplan-aware screen listing with interactive filtering and navigation | U2     |
| Command palette                     | Global quick-action overlay — search flows, screens, flowplans          | U2     |
| Go-To overlay                       | Quick-jump dialog for flows, screens, flowplans                         | U2     |

---

## Session Recording & FlowLens

| Feature                                  | Description                                                                                                                                 | Users |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Session recorder                         | IndexedDB-backed interaction recording via `WriteBatcher`; captures navigation, clicks, timing                                              | U3    |
| FlowLens analytics mode                  | Optional lazy-loaded analytics/replay mode; enabled via `VITE_ENABLE_FLOWLENS=true`                                                         | U3    |
| Session replay                           | In-browser session playback — watch exactly how a user navigated a flow                                                                     | U3    |
| Session management CLI                   | `sessions:ls`, `sessions:import`, `sessions:export`, `sessions:rm`, `sessions:stats`, `sessions:sample`, `sessions:purge`, `sessions:brief` | U3    |
| Analytics export (`flowkit lens:report`) | Exports FlowLens session analytics as structured JSON                                                                                       | U3    |

---

## Feedback

| Feature                 | Description                                                           | Users  |
| ----------------------- | --------------------------------------------------------------------- | ------ |
| Comment wall            | In-app feedback collection with image attachments stored in IndexedDB | U4     |
| Cloud sync              | Feedback synced to JSONBin (configured via `JSONBIN_CONFIG`)          | U2, U3 |
| Feedback management CLI | `feedback:ls`, `feedback:import`, `feedback:dump`                     | U3     |

---

## Export & Handoff

| Feature                                   | Description                                                                | Users  |
| ----------------------------------------- | -------------------------------------------------------------------------- | ------ |
| Standalone HTML export (`flowkit export`) | Single-file HTML viewer — no FlowLens, no dev deps                         | U4     |
| Full export (`flowkit export:full`)       | Single-file HTML viewer + FlowLens analytics chunk                         | U3, U4 |
| Developer handoff (`flowkit handoff`)     | Structured zip with screen specs, flow definitions, action notes, DB state | U5     |
| Bulk data dump (`flowkit dump`)           | Exports sessions, feedback, and reports to a destination directory         | U3     |
| Figma export mode                         | 1:1 scaled canvas grid for design system handoff screenshots               | U5     |

---

## Flow Debugger

| Feature            | Description                                                    | Users  |
| ------------------ | -------------------------------------------------------------- | ------ |
| Live DB view/edit  | Real-time view and edit of mock DB state during a session      | U1, U2 |
| Navigation history | Tracks screen transition history during a session              | U1, U2 |
| State inspector    | Displays current flow state, sandbox state, and active effects | U1, U2 |

---

## Design System & Theming

| Feature                  | Description                                                                       | Users  |
| ------------------------ | --------------------------------------------------------------------------------- | ------ |
| Two-tier token system    | Runtime CSS vars (`--theme-*`) bridged to Tailwind utility classes (`bg-theme-*`) | U1     |
| Light/dark mode          | Runtime theme switching via `ThemeContext`                                        | U2, U4 |
| UI scale system          | `UIScale` constants (space, radius, minTap) injected via `ThemeContext`           | U1     |
| Shared component library | 35+ components: Button, Modal, Badge, and more in `src/shared/components/ui/`     | U1     |
| Radix UI primitives      | Headless accordion, dialog, select, etc. via `src/kits/shared/`                   | U1     |
| Device mockup shells     | Phone, tablet, desktop, wearable frame components                                 | U2, U4 |

---

## Platform & Tooling (U1 only)

| Feature                                      | Description                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Flowplan validation (`flowkit plan:check`)   | Validates all flowplan definitions; gates `npm run build`                                 |
| Agent spec sync (`flowkit agent:sync/check`) | Syncs and validates agent specification files                                             |
| Kit coverage check (`flowkit kit:check`)     | Verifies all themes cover all kit components                                              |
| Layer boundary enforcement                   | `eslint-plugin-boundaries` enforces `shared → core → features → modes → App` import order |
| TypeScript strict mode                       | Full type safety across `src/` and `scripts/lib/`                                         |
| Test suite                                   | Vitest unit + CLI integration tests covering `scripts/` modules                           |
| Pre-commit hooks                             | Husky + lint-staged: ESLint fix + Prettier on staged files                                |
| Prebuild gate                                | `plan:check` runs automatically before every build; exits non-zero on blocking issues     |
| HMR safety                                   | All React contexts guard identity with `import.meta.hot.data` pattern                     |
| Workspace rollback                           | `flowkit nw` scaffolding rolls back atomically on failure                                 |
