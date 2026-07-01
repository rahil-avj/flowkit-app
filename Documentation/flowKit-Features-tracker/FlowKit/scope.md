# FlowKit Core — Scope

The "FlowKit" subsystem covers the platform shell: canvas, workspace model, kit system, device mockups, simulator, feedback, CLI scaffolding, and feature management. Everything that is not flow execution (FlowMaster), recording/analytics (FlowLens), or agent/workspace setup (Workspace-Setup).

---

## In scope

### Canvas & device

- Pan, zoom, keepFit mode — `PreviewCanvas.tsx`, `canvasReducer.ts`, `canvasConfig.ts`
- Device mockups (phone, tablet, desktop, wearable) with correct safe areas — `src/shared/components/devices/`
- Per-device-type zoom memory; `CanvasView` (multi-screen Figma export mode)
- Mobile canvas (`MobileCanvas.tsx`) with `BottomSheet`; full feature parity with desktop

### Workspace model

- `workspaces.json` — runtime registry (name, label, kit); source of truth for the CLI
- `workspaces.ts` — runtime loader; derives `path`, `config.kit`, `config.language`; localStorage helpers
- Multi-workspace selection at runtime: URL `?workspace=` param → stored value → `WorkspaceSelector`
- Two workspace formats: Old (`flows/_playFlow.ts`) and Flowplan (`projects/**/flowplans/*.ts`)
- Old format kill-switched behind `removed` env flag

### Kit system

- `src/kits/shared/` — Shadcn/Radix components, `--kit-*` CSS vars, semantic utility classes
- Theme applied via `data-kit="<name>"` on the preview wrapper; dark mode via `data-mode="dark"`
- Cascade order: base → theme → dark → component styles → utilities → workspace overrides
- Workspace-level overrides in `design-system/tokens.css`

### Simulator

- Built-in controls: connection mode, network speed, CVD filter, blur intensity — `useDashboard()`
- Custom workspace controls: `data/simulator.tsx`; `SimControl`, `ControlAccordion`, etc.
- "Ignore all Simulator Settings" master switch

### Feedback

- Per-screen comment wall; tag filtering; screenshot attachment; author attribution
- Cloud sync via JSONBin (Access Key or Master Key); `JSONBIN_CONFIG`
- Import: JSON + Markdown; drag-drop, file picker, clipboard paste

### Feature management system (planned)

- Three layers: Registry (`src/core/features/registry.ts`) → Entitlement Resolver → Feature Gate
- `useFeature("id")` hook + `<FeatureGate>` component at all entry points
- `build: false` = DCE from bundle; `enabled: false` = runtime hidden; `beta: true` = badge only
- Current `FLOWLENS_AVAILABLE` and `LS_SESSIONS_ENABLED` flags are pre-cursors; to be replaced

### CLI (core commands)

- `flowkit nw`, `flowkit rw`, `flowkit export`, `flowkit handoff`, `flowkit status`
- `flowkit agent:sync`, `flowkit agent:check`
- `flowkit sw` — deprecated; prints notice, does nothing

---

## Out of scope

- Flow execution logic — that is FlowMaster
- Session recording and analytics — that is FlowLens
- Agent file generation spec — that is Workspace-Setup
- A/B testing or runtime feature flag service (LaunchDarkly-style)
- A UI dashboard for managing feature flags
- Remote runtime flag fetching
- Production hosting or CDN delivery of exported prototypes
- Distributing the kit system as a standalone npm package

---

## Key constraints

- **No global state libraries.** Context only — no Redux, Zustand, or similar.
- **Tailwind v4, configured in CSS.** No `tailwind.config.js`. All tokens in `src/index.css` `@theme {}`.
- **`style={{}}` only for runtime-computed values.** Tailwind classes for everything else.
- **`cn()` always** for conditional Tailwind — no raw template literals.
- **Layer boundaries.** `shared → core → features → modes → app`. No reverse imports.
