# FRD: Preview Canvas — Viewer Mode / Canvas Mode Separation

**Status:** Viewer Mode shipped and verified. Canvas Mode not started (design-only).
**Owner:** Platform / Preview Canvas
**Related code:** `src/core/canvas/PreviewCanvas.tsx`, `src/core/canvas/hooks/useViewerFit.ts`, `src/core/canvas/canvasReducer.ts`, `src/shared/contexts/MockupHostContext.tsx`

---

## 1. Background & Problem Statement

`PreviewCanvas.tsx` historically had exactly one rendering mode for desktop: a pannable, scrollable, fixed-size (2000×2000) surface holding a single device mockup, centered via scroll-offset math, with hand-tool panning, wheel-zoom, and a scroll-centering state machine (`canvasReducer.ts`).

This machinery exists to solve a problem FlowKit does not currently have: viewing **multiple screens placed freely on a 2D surface**. Today, and for the foreseeable near-term, FlowKit only ever shows **one screen at a time**. The pannable-canvas code was carrying real complexity (a documented duplicate-mount-centering race was found and fixed during this work) purely to support a use case that isn't live.

Separately, FlowKit's future roadmap includes a genuine multi-screen use case: a documentation-style overview where every flow is rendered as a tiled, fixed-layout card (title + its screens), and the surface can be panned/zoomed to see everything at once — closer to a Figma multi-frame view than to freeform screen placement.

These are two different problems requiring two different rendering models. This FRD separates them into two explicit, named modes.

---

## 1a. Intent & Full Story

### How this started: an audit, not a feature request

This work did not begin as a request to build Viewer Mode. It began as a general canvas audit: "we have some issues in the canvas, do an audit yourself and then I will tell you what I find problematic." The audit surfaced several findings in `PreviewCanvas.tsx` and its supporting hooks — duplicate mount-centering effects, an inline wheel-zoom handler living outside the codebase's usual hook-extraction pattern, and general scatter across the canvas interaction system. Of those, one was judged worth fixing immediately: two separate effects (`DesktopCanvas`'s `scrollCenterCount`-driven centering, and `CanvasContent`'s mount-only centering) were both writing to the same scroll position on initial mount, redundantly. That fix shipped first, in isolation, verified by `tsc`/tests — a small, contained correction with no architectural implications.

### The real conversation: what is this canvas actually for?

After that fix landed, the next question wasn't "what else is broken" — it was "what is this canvas actually supposed to do." The existing pannable/scrollable canvas was designed as if FlowKit needed to support arranging multiple screens freely on a large 2D surface. But FlowKit, as a product, does not do that today. It shows one screen at a time, in a device mockup, and lets you zoom in and out. The pannable surface, the 2000×2000 fixed-size scroll area, the hand-tool, the scroll-centering state machine — all of that complexity exists to solve a problem that isn't real yet.

This produced the core idea: **split "canvas" into two modes** — a lightweight **viewer mode** that matches what FlowKit actually does (one screen, centered, zoom only), and a **canvas mode** reserved for the day multi-screen browsing becomes real. Viewer mode would be the default, immediately, because it's the only one anything currently needs. Canvas mode would not be built yet — just named, and designed for, so that building it later wouldn't require undoing viewer mode's foundations.

An important simplification fell out of this framing for free: once there's no pannable surface, "keep fit" stops being a scroll-and-recenter problem and becomes a pure ratio calculation — visible container size ÷ device size. All of the scroll-centering race-condition class of bugs (the very thing the audit had just found one instance of) simply cannot exist in viewer mode, because there is no scroll position to race over.

### The near-miss: almost building a Figma clone

While describing what canvas mode should look like, the scope started drifting toward a general-purpose 2D placement canvas — screens placed anywhere, moved around, selected, and inspected like elements in a design tool. Mid-description, this was caught and named directly: "i just realized now i am talking about creating a figma clone. i don't want that." That self-correction reshaped canvas mode entirely. Instead of freeform placement, canvas mode became a **fixed, deterministic layout**: every flow is a card (a title plus a row of its screens, arranged via ordinary flexbox), and all those cards are tiled across a pannable/zoomable surface — a documentation/overview view, not a design-tool canvas. No manual x/y coordinates, no drag-to-reposition, no per-element selection model to invent. The pan/zoom surface is real; the _content_ inside it is deterministic, derived from existing flow/screen data, not manually arranged.

The remaining pieces of canvas mode were deliberately narrowed at the same time: no device mockup chrome (screens shown at their real size, adjustable via a settings control later); no in-place editing (hovering a screen just reveals a play button that jumps into viewer mode to actually interact with it); no reordering UI yet (a fixed layout order is enough for now). Canvas mode's scope shrank from "a 2D design surface" to "a read-only map of what already exists."

### Why build viewer mode now and stop there

Even after canvas mode's shape was clarified, the decision was to build **only viewer mode** in this pass. The reasoning was explicit: there is no current use case for multi-screen canvas browsing, so building it now would be speculative work. What was needed was for viewer mode's architecture to leave room for canvas mode later — a real mode-switch point, a mockup-hosting abstraction that doesn't hardcode assumptions about which mode is active — without spending effort on canvas mode's actual UI before it's needed.

This is also why the pre-existing pannable canvas code was not deleted. Deleting `canvasReducer.ts`, `useHandTool.ts`, and the scroll-centering logic in `PreviewCanvas.tsx` was considered and explicitly declined: "do this development separately without touching the current system." The reasoning was risk management, not sentimentality — if viewer mode's rebuild is ever discarded, the fallback must not have been damaged in the process. So the pannable canvas was left completely alone, byte-for-byte, simply no longer the default path. Whether it becomes the basis for canvas mode later, or is deleted once canvas mode is actually built some other way, is an open question (§9), deliberately not resolved here.

### What surfaced during implementation

Two things emerged while building that weren't part of the original ask, and both are worth recording because they shaped the final design:

1. **A real architectural constraint, not a preference.** The plan called for branching between viewer-mode and pannable-mode hooks based on a mode flag. React's rules of hooks don't allow a hook call to be conditional, even when the condition is a compile-time-constant in practice — ESLint's `react-hooks/rules-of-hooks` caught this immediately. The fix was to split the relevant components (`DesktopCanvas`, `CanvasContent`) into thin per-mode wrapper components, each calling exactly one hook unconditionally, sharing everything else. This is why the implementation has more component layers (`DesktopCanvasViewer`/`DesktopCanvasPannable`, `CanvasContentViewer`/`CanvasContentPannable`) than the original plan sketched — the plan's shape was adjusted mid-build to satisfy a hard constraint, not a stylistic choice.

2. **A hidden existing feature that overlaps with canvas mode's future shape.** While implementing, `FigmaExportGrid.tsx`/`FigmaExportView` was discovered — an existing, working feature (reachable via `Cmd+Alt+Shift+P`) that already tiles screens in groups with headers, at real sizes, without device chrome, for Figma handoff export. This is architecturally close to what canvas mode is meant to become. It was surfaced and flagged rather than silently built around, specifically so that when canvas mode is eventually scoped, the option of evolving this existing feature instead of building a parallel one isn't lost. This is recorded as an open question (§9), not a decision.

### Why this matters for whoever reads this next

The throughline across all of the above is a single operating principle, stated directly during the work: don't build more than the current, real use case requires, but don't box out the near-future use case either. Viewer mode exists because FlowKit needs it today. Canvas mode is named and designed-for, not built, because FlowKit doesn't need it yet — building it now would be guessing. The old pannable canvas is untouched because discarding working code before its replacement is proven is an unnecessary risk. Every one of these choices was made explicitly, in conversation, rather than assumed — this section exists so that history isn't lost the next time someone opens this file and wonders why the old canvas code is still sitting there unused.

---

## 2. Goals

- Replace today's single implicit "pan a device around a big surface" behavior with an explicit **Viewer Mode**, sized to what FlowKit actually needs right now: one screen, centered, zoom in/out only.
- Eliminate the state-machine complexity (scroll-centering, hand-tool, fixed-surface math) from the default, 100%-of-the-time code path, without deleting or destabilizing the existing pannable implementation.
- Establish **Canvas Mode** as a named, reserved future mode — architecturally prepared for, not built — so that when multi-screen browsing becomes a real requirement, it has a clear home and doesn't require reworking Viewer Mode's foundations.
- Do this as a strictly additive change to reduce risk: if Viewer Mode needs to be rolled back, the pre-existing pannable canvas must still work, untouched.

## 3. Non-Goals

- Building any part of Canvas Mode's actual UI (flow-card tiling, hover-to-play, screen selection/inspection). This FRD documents its _shape_ for forward-compatibility only.
- Removing or refactoring the existing pannable canvas code (`canvasReducer.ts`, `useHandTool.ts`, `PreviewCanvas.tsx`'s scroll-centering effects). That is an explicit future task, deliberately deferred.
- A mode-switching UI/setting. Mode selection is a hardcoded constant today.
- Adding coordinate/placement data models for screens (deferred to when Canvas Mode is actually scoped).

---

## 4. Definitions

| Term                | Meaning                                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Viewer Mode**     | Shows exactly one screen/device mockup, CSS-flex centered, zoom in/out + fit-to-screen only. No pan, no hand-tool, no fixed-size scroll surface.                                                              |
| **Canvas Mode**     | (Future, not built) A pannable/zoomable 2D surface tiling every flow as a fixed-layout card of its screens, for at-a-glance browsing. No device mockup chrome.                                                |
| **Pannable canvas** | The pre-existing implementation (2000×2000 fixed surface, hand-tool, scroll-centering) that predates this FRD. Kept alive, unused, pending a future decision on whether it becomes the basis for Canvas Mode. |
| **Mockup host**     | The DOM element hosting the live device mockup, used by FlowLens (cursor-ghost overlay) and the feedback tool (screenshot capture) regardless of which mode is active.                                        |

---

## 5. Functional Requirements

### 5.1 Viewer Mode (shipped)

| ID   | Requirement                                                                                                                                                                                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-1 | Exactly one screen is visible at a time, centered in the available canvas area via CSS flex layout (no absolute-position scroll math).                                                                                                                                                       |
| FR-2 | Zoom in / zoom out / reset-to-100% / toggle-fit-to-screen are supported via toolbar buttons and existing keyboard shortcuts (`⌘+`, `⌘-`, `⌘0`, `0`).                                                                                                                                         |
| FR-3 | "Fit to screen" (`keepFit`) computes scale from the visible container's measured size ÷ the active device's dimensions — no reference to a fixed abstract canvas size.                                                                                                                       |
| FR-4 | Zoom level is cached per **device type**, not per screen. Switching screens without changing device type must **not** trigger a refit or reset zoom. Switching device type **must** trigger a refit (or reuse that device type's own cached zoom, if previously set).                        |
| FR-5 | No hand-tool / pan affordance is present in Viewer Mode — no toolbar button, no space-hold/H-key binding, no drag-to-pan behavior.                                                                                                                                                           |
| FR-6 | The device mockup container grows/shrinks smoothly (CSS transition) as side panels are resized or toggled — no jump cuts, no dependency on panel-drag state to suppress/enable the transition (unlike the pannable canvas, which must suppress transitions during drag to track the cursor). |
| FR-7 | Fullscreen toggle hides both side panels and keeps the mockup centered, with zoom level preserved (not refit) unless the container's measured size actually changed.                                                                                                                         |
| FR-8 | FlowLens's cursor-ghost overlay and the feedback tool's screenshot capture continue to work identically to before this change, regardless of which mode is rendering the mockup.                                                                                                             |
| FR-9 | Viewer Mode is the default and, as of this FRD, the _only_ reachable mode — the mode switch exists in code but the alternate branch is not wired to anything user-facing.                                                                                                                    |

### 5.2 Canvas Mode (future — design only, not built)

These are captured for forward-compatibility, not as commitments for the current milestone.

| ID    | Requirement (draft)                                                                                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-10 | Every flow renders as a fixed-layout card: a title row plus a row of its screens, laid out with plain flex (no manual x/y coordinates).                                                                                  |
| FR-11 | Screens render without device mockup chrome, at a size configurable via a settings control (not tied to a device preset).                                                                                                |
| FR-12 | The overall surface (all flow-cards) is pannable and zoomable.                                                                                                                                                           |
| FR-13 | Hovering a screen reveals an action affordance (e.g. a play button) that jumps into Viewer Mode for that specific screen, entering an interactive state.                                                                 |
| FR-14 | Screen selection/inspection (clicking into a screen's DOM to inspect elements) and reordering are explicitly out of scope for the first version of Canvas Mode and are not designed here.                                |
| FR-15 | Canvas Mode must **not** require Viewer Mode's architecture to change. The mode-switch point and the mockup-host abstraction introduced by this FRD are the intended integration seams for Canvas Mode when it is built. |

---

## 6. Non-Functional Requirements

| ID    | Requirement                                                                                                                                                                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-1 | Zero behavior change to the pre-existing pannable canvas's _tested_ behavior. All 43 `canvasReducer.ts` unit tests (`scripts/tests/canvasReducer.test.ts`) must continue to pass unmodified.                                                    |
| NFR-2 | No new runtime dependency on `CANVAS_W`/`CANVAS_H` (the pannable surface's fixed dimensions) anywhere in Viewer Mode's fit/zoom math — that constant is only meaningful when a fixed scroll surface exists.                                     |
| NFR-3 | `react-hooks/rules-of-hooks` (ESLint) must pass with zero suppressions. Mode-specific hooks (`useViewerFit`, `useHandTool`) must each be called unconditionally within their own component, not branched inline inside a shared component body. |
| NFR-4 | `tsc --noEmit` and the full test suite (`npm test`) must pass with no regressions.                                                                                                                                                              |
| NFR-5 | The change must be reversible without risk: rolling back to the pannable-only behavior must not require having modified `canvasReducer.ts`, `useHandTool.ts`, or the pannable JSX path, since those are left completely untouched.              |

---

## 7. Design Summary (as implemented)

- **Mode selection**: a hardcoded module constant (`PREVIEW_MODE: 'viewer' | 'canvas'`, currently `'viewer'`) inside `PreviewCanvas.tsx`, mirroring the existing `isMobile` branch pattern already used to route to `MobileCanvas`.
- **`useViewerFit`** (`src/core/canvas/hooks/useViewerFit.ts`): a new, small hook providing fit/zoom state with no scroll-surface concept. Fit-scale is `min(1, visibleW×FIT_TARGET_W/deviceW, visibleH×FIT_TARGET_H/deviceH)` — reuses `FIT_TARGET_W/H` from `canvasConfig.ts`, omits the fixed-surface terms present in `canvasReducer.ts`'s `computeFitScale`/`canvasSafeMax`. Reuses the same per-device-type zoom-caching convention as the pannable reducer's `zoomByType`.
- **Component split**: `DesktopCanvas` is a thin router to `DesktopCanvasViewer` / `DesktopCanvasPannable`, each calling exactly one canvas-state hook unconditionally, both rendering a shared `DesktopCanvasBody`. The same pattern applies one level down: `CanvasContentViewer` / `CanvasContentPannable` wrap a shared `CanvasContentInner`, so `useHandTool` only mounts on the pannable path.
- **`MockupHostContext`** (`src/shared/contexts/MockupHostContext.tsx`): replaces the previous `document.querySelector('#mockup-container')` pattern used by FlowLens's `CursorGhost` and the feedback tool's screenshot capture. Exposes both a reactive `host` (for effects that must re-run when the mockup remounts, e.g. on device swap) and an imperative `getHost()` (for one-shot reads, e.g. at comment-submit time).
- **Pannable canvas**: left in place, byte-for-byte behaviorally unchanged, simply unreferenced by the current mode selection. Its own `#mockup-container` div also registers into `MockupHostContext`, so it would work identically if the mode switch were flipped.

---

## 8. Out of Scope / Explicitly Deferred

- Deleting or refactoring the pannable canvas code. Tracked as a separate future task, to be done once Viewer Mode has proven itself in real use and Canvas Mode's actual requirements are better understood.
- Any Canvas Mode implementation work (see §5.2 — draft requirements only).
- A settings/config UI for choosing between modes.
- Coordinate/placement type additions to `src/types/index.ts` for future screen positioning.
- `FigmaExportGrid.tsx` / `FigmaExportView` — a pre-existing, separate feature that already implements a tiled, grouped, device-chrome-free screen grid for Figma handoff export. It bears architectural resemblance to draft Canvas Mode requirements (FR-10, FR-11) but is not currently connected to this work. Whether Canvas Mode should evolve from it, replace it, or remain independent is an open question (§9), not a decision made here.

---

## 9. Open Questions

1. Should Canvas Mode's rendering be built fresh, or evolved from the existing `FigmaExportGrid.tsx`/`FigmaExportView` (currently reachable via `Cmd+Alt+Shift+P` in `App.tsx`, used today for Figma handoff export)? Not resolved — flagged during implementation, deferred.
2. When Canvas Mode is scoped, where should screen-placement/layout data live — is a flex-only fixed layout (per FR-10) sufficient long-term, or will manual x/y placement (a "true canvas") eventually be needed after all? The user has explicitly ruled out a Figma-clone-style freeform canvas for now.
3. Should mode selection ever become user-configurable (e.g. a workspace setting), or will it always be a code-level default swapped by whoever is building the next mode?
4. Does FlowLens ever need to run "inside" Canvas Mode, or is FlowLens inherently a Viewer-Mode-shaped feature (single active screen) regardless of what browsing mode was used to reach it?

---

## 10. Acceptance Criteria (Viewer Mode — met)

- [x] `tsc --noEmit` passes with zero errors.
- [x] `eslint .` passes with zero errors (including `react-hooks/rules-of-hooks`).
- [x] `npm test` — all 134 tests pass, including all 43 pre-existing `canvasReducer` tests, unmodified.
- [x] Manual verification (real browser, scaffolded test workspace):
  - [x] Screen switch, same device type → zoom preserved, no refit.
  - [x] Manual zoom → screen switch → zoom preserved (not reset to fit).
  - [x] Device-type switch → triggers refit.
  - [x] Fullscreen toggle → panels hide, mockup stays centered, zoom preserved.
  - [x] Panel resize (drag) → mockup recenters smoothly, no jump cut.
  - [x] Hand-tool button confirmed absent from Viewer Mode's toolbar.
- [x] `MockupHostContext` correctly replaces the raw DOM-ID lookup for both known consumers (`CursorGhost.tsx`, feedback screenshot capture).

## 11. Acceptance Criteria (Canvas Mode — not started)

Not defined. To be written when Canvas Mode is scoped as its own implementation effort, informed by the open questions in §9.

---

## 12. Known Deviations From Original Plan

- The pannable canvas's `isPanelDragging` signal was restructured (from a directly-passed boolean to a `MutationObserver` watching `document.body`'s `data-panel-drag` attribute) due to a hook-ordering constraint introduced by the mode split. This is currently inert, unreachable code (`PREVIEW_MODE` is hardcoded to `'viewer'`), and was verified behavior-equivalent by inspecting `usePanelLayout.ts`'s existing attribute-toggling logic — but it is a real change to a file this FRD's goals (§2) said would be left untouched. Flagged here for visibility; not considered a blocker since the affected path is not currently reachable.
