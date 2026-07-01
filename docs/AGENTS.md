# Flowkit — Agent & Developer Wiki

This file is the single source of truth for navigating and extending this codebase.
It is written for AI agents and humans equally. Read it before writing code.

---

## Philosophy

> Structure is documentation. Imports are navigation. Barrels are contracts.

An agent or developer should be able to answer three questions from an import path alone:

1. **Where does this live?** — the alias tells you the layer, the path tells you the file
2. **What does this feature expose?** — read its `index.ts`, nothing else
3. **Can I import X from Y?** — the boundary table below tells you

---

## Alias Map

| Alias        | Resolves to            | Use for                                                 |
| ------------ | ---------------------- | ------------------------------------------------------- |
| `@shared`    | `src/shared/`          | Contexts, UI components, utils — foundation layer       |
| `@core`      | `src/core/`            | Canvas shell, layout panels, keyboard shortcuts         |
| `@features`  | `src/features/`        | Isolated product features (feedback, sessions, etc.)    |
| `@flowlens`  | `src/modes/flowlens/`  | FlowLens analytics mode (lazy-loaded chunk)             |
| `@platform`  | `src/`                 | Prefer scoped aliases above                             |
| `@workspace` | `workspaces/<active>/` | Active workspace screens and config                     |
| `@kit`       | `src/kits/shared/`     | Shared kit utilities                                    |

**Rule:** always use the most specific alias available.
`@shared/contexts/ThemeContext` beats `@platform/shared/contexts/ThemeContext`.

---

## Layer Architecture

```
┌─────────────────────────────────────────┐
│  modes/         Full-canvas overrides   │  ← can import anything
│  (FlowLens)     Lazy-loaded chunks      │
├─────────────────────────────────────────┤
│  features/      Isolated product        │  ← @shared + @core + other features
│  feedback       flowTracer        │
│  simulator      mock-db                 │
├─────────────────────────────────────────┤
│  core/          Canvas shell            │  ← @shared only
│  canvas  layout  shortcuts              │
├─────────────────────────────────────────┤
│  shared/        Foundation              │  ← nothing above it
│  contexts  components  utils  types     │
└─────────────────────────────────────────┘
```

**Boundary rules are enforced by ESLint (`boundaries/element-types`).**
A `warn` fires if you violate the layer contract. Violations will become errors.

---

## Import Patterns

### Preferred — barrel imports

```ts
// Single context
import { useTheme } from '@shared/contexts'

// UI component
import { Button, Modal } from '@shared/components/ui'

// Feature public API
import { FeedbackPanel, useFeedbackTabContext } from '@features/feedback'

// Session recorder
import { useSessionRecorder, SessionDb } from '@features/flowTracer'

// Core layout
import { SimulationPanel, RailButton } from '@core/layout'

// FlowLens (only inside modes/ — it's a lazy chunk)
import { useSessionLibrary } from '@flowlens'
```

### Acceptable — scoped file imports (when you need one specific export)

```ts
import { useTheme } from '@shared/contexts/ThemeContext'
import { default as Button } from '@shared/components/ui/Button'
```

### Never — deep internal imports into a feature

```ts
// ❌ reaches past the public API
import CommentCard from '@features/feedback/components/CommentCard'
import { someHelper } from '@features/flowTracer/context/index'
```

If you need something that isn't exported from the barrel, either:

- It's intentionally private — don't use it
- It should be added to the barrel — add it

---

## Directory Map

```
src/
├── core/
│   ├── canvas/          PreviewCanvas, CanvasView, canvasReducer, canvasConfig
│   ├── layout/          SimulationPanel, SidebarExplorer, RailButton, TabButton,
│   │                    SimulatorControls, FlowMaster, FlowMapPanel,
│   │                    FlowEngine, panelTabs, simSubTabs, debugSubTabs
│   └── shortcuts/       useKeyboardShortcuts
│
├── features/
│   ├── feedback/        Public API via index.ts (barrel)
│   │   ├── index.ts     ← barrel / public API — import from here
│   │   ├── panel.tsx    ← root component (FeedbackPanel)
│   │   ├── context/     FeedbackTabContext (internal)
│   │   └── components/  AddCommentForm, CommentCard, CommentsWall, FilterPanel … (internal)
│   ├── flowTracer/ Public API via index.ts (barrel)
│   │   ├── index.ts     ← barrel / public API — import from here
│   │   ├── panel.tsx    ← root component (SessionsPanel)
│   │   ├── context/     SessionRecorderContext (internal)
│   │   └── components/  SessionCard, SessionInspect, SessionExportOverlay … (internal)
│   ├── simulator/       AccessibilitySettings, DeviceSettings, COLOR_BLIND_FILTERS
│   └── mock-db/         FlowDebuggerTab, DbInspector
│
├── modes/
│   └── flowlens/        Entire FlowLens analytics mode — lazy-loaded chunk
│       ├── components/  FlowLensMode (default export), FlowLensRailPanel, overlays …
│       ├── library/     Committed session JSON files per workspace
│       └── index.ts     Chunk entry — only export: default (FlowLensMode)
│
├── shared/
│   ├── components/
│   │   ├── index.ts     ← barrel (re-exports all sub-barrels below)
│   │   ├── ui/          Button, Modal, Tooltip, Select, Input … (30+ primitives)
│   │   ├── devices/     DEVICE_PRESETS
│   │   ├── overlays/    ActionCenter, HelpModal, OverlayShell, Settings
│   │   ├── mobile/      MobileCanvas, BottomSheet, MobileFAB
│   │   └── errors/      NotFound, Forbidden, ServerError, Offline, Maintenance
│   ├── contexts/        useTheme, useDashboard, useFeedback, useFlowLensMode,
│   │                    useDevMode, FlowNavCtx
│   └── utils/           useWorkspaceFlows, buildDynamicFlows, useFlowNav,
│                         useIsMobile, useSwipeGesture, useJsonBinKeyValidation
│
├── types/
│   └── index.ts         All shared TypeScript types (FlowNode, WireframeView, DevicePreset …)
│
└── App.tsx              Root — wires providers, lazy-loads FlowLens if enabled
```

---

## Feature Public APIs

Each feature exposes exactly what's in its barrel. Everything else is internal.

### `@features/feedback`

```ts
FeedbackPanel // Main panel UI — drop into SimulationPanel
FeedbackTabProvider // Context provider — wraps panel
useFeedbackTabContext // Hook — read/write feedback tab state
CommentFilter // Type
```

### `@features/flowTracer`

```ts
SessionsPanel // Main panel UI
SessionRecorderProvider // Context provider
useSessionRecorder // Hook (throws if no provider)
useSessionRecorderOptional // Hook (returns null if no provider)
SessionDb // IndexedDB access object
buildSessionExport // Materialise a full SessionExport from meta
;(SessionExport, SessionMeta, SessionEvent, CursorSample) // Types
```

### `@features/simulator`

```ts
AccessibilitySettings // Accessibility controls panel
DeviceSettings // Device picker panel
COLOR_BLIND_FILTERS // SVG filter map
ColorBlindSVGDefs // SVG defs component
```

### `@features/mock-db`

```ts
FlowDebuggerTab // Debugger tab (journey/db/effects/log)
DbInspector // Raw DB inspector component
DbViewMode // Type: "styled" | "raw"
```

### `@flowlens` (lazy chunk — only import from inside `modes/`)

```ts
default   // FlowLensMode — the full-canvas overlay component
```

---

## Adding a New Feature

Every feature follows the same two-file convention at its root:

| File        | Role                                                        |
| ----------- | ----------------------------------------------------------- |
| `index.ts`  | **Public API barrel** — the only file consumers import from |
| `panel.tsx` | Root component (the thing you drop into the shell UI)       |

Steps:

1. Create `src/features/<name>/`
2. Add `panel.tsx` — the root component
3. Build internals in `components/`, `context/`, etc.
4. Create `index.ts` — re-export only what consumers need (component + provider + hooks + types)
5. Add `export * from './<name>/index'` to `src/features/index.ts`
6. The boundary rules enforce the layer contract automatically

**Do not** import from another feature's internals. If two features need to share
state, the shared state belongs in `@shared/contexts`.

---

## Adding a New Mode

Modes are full-canvas overrides (like FlowLens). They are always lazy-loaded.

1. Create `src/modes/<name>/`
2. Export a single default component from `src/modes/<name>/index.ts`
3. Lazy-import from `PreviewCanvas` behind an env flag:
   ```ts
   const MyMode =
     import.meta.env.VITE_ENABLE_MYMODE === 'true'
       ? lazy(() => import('@platform/modes/<name>'))
       : null
   ```
4. Modes can import from any layer — they are the top of the stack

---

## Workspace Files

Workspace files live in `workspaces/<name>/` and are reached via `@workspace`.
They are user-authored and should only import from:

- `@platform/core/layout/FlowMaster` — to run a flow
- `@platform/core/layout/SimulatorControls` — to define simulator controls
- Standard React

**Never** import shared contexts or features directly into workspace screens.
The platform injects everything via providers.

---

## Key Invariants

| Rule                                                       | Why                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| Barrels are the contract                                   | Internals can move freely without breaking consumers      |
| `@shared` imports nothing from `@core` or above            | Prevents circular deps                                    |
| FlowLens is always lazy                                    | Keeps base bundle lean when the mode is off               |
| `import.meta.glob` patterns are string literals            | Vite resolves them at build time — no variables           |
| Workspace screens only import from `@platform/core/layout` | Keeps workspace files portable and simple                 |
| One `SessionRecorderProvider` per app                      | Multiple providers create duplicate IndexedDB connections |

---

## Environment Flags

| Flag                             | Effect                                |
| -------------------------------- | ------------------------------------- |
| `VITE_ENABLE_FLOWLENS=true`      | Loads the FlowLens mode chunk         |
| `VITE_ENABLE_FLOWKIT_WATCH=true` | Starts the file-watcher plugin in dev |

Set in `.env.local` (not committed).
