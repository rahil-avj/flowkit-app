# Condensed specs (FRDs)

Full source docs: `flowkit-app/Documentation/project-plans/specs/`. Each entry here is the
condensed version — read the source doc before implementing, this is a summary for tracking
purposes, not a replacement for the full FRD.

---

## Canvas: Viewer Mode / Canvas Mode split
Source: `specs/canvas-viewer-mode.md` · Tracked as: `features.md` #20, #20b

**Status:** Viewer Mode shipped and verified. Canvas Mode not started — design-only.
**⚠️ Needs a fresh look (2026-07-02):** the spec's mechanism section references a `PREVIEW_MODE`
hardcoded constant that no longer greppable in source — re-verify the actual current split
mechanism in `PreviewCanvas.tsx` before treating the FRD's "Design Summary" section as accurate.

**Problem:** The old pannable canvas (2000×2000 fixed scroll surface, hand-tool, scroll-centering
state machine) existed to support freeform multi-screen placement — a use case FlowKit doesn't
have. It shows one screen at a time. This complexity produced real bugs (a duplicate mount-centering
race, since fixed).

**Decision:** Split into two named modes:
- **Viewer Mode** (built): one screen, CSS-flex centered, zoom in/out + fit-to-screen only. No
  pan, no hand-tool, no fixed-size scroll surface. Fit-scale = visible container size ÷ device
  size — a pure ratio, no scroll-position race possible.
- **Canvas Mode** (not built, deliberately deferred): a documentation-style overview — every flow
  as a fixed-layout card (title + row of screens via plain flexbox), tiled across a pannable/zoomable
  surface. Explicitly **not** a freeform Figma-style canvas — that scope was caught and rejected
  mid-design ("i just realized now i am talking about creating a figma clone. i don't want that").
  No manual x/y placement, no drag-to-reposition, no per-element selection.

**Why the old pannable canvas wasn't deleted:** risk management. If Viewer Mode is ever rolled
back, the fallback must not have been damaged. It's untouched, unreferenced by the current mode
selection, and its own future (become Canvas Mode's basis, or get deleted later) is an open question.

**Open questions (unresolved):**
1. Should Canvas Mode evolve from the existing `FigmaExportGrid.tsx`/`FigmaExportView` (already
   does grouped, device-chrome-free screen tiling for Figma handoff, reachable via Cmd+Alt+Shift+P)
   rather than being built fresh?
2. Is a flex-only fixed layout sufficient long-term, or will manual x/y placement eventually be
   needed after all?
3. Should mode selection ever be user-configurable, or always a code-level default?
4. Does FlowLens ever need to run "inside" Canvas Mode, or is it inherently Viewer-Mode-shaped?

**Known deviation from plan:** `isPanelDragging` signal was restructured (boolean → MutationObserver
watching a DOM attribute) due to a hook-ordering constraint from the mode split — currently inert
code since Canvas Mode isn't reachable, but a real change to a file the FRD said would stay untouched.

---

## FlowLens: Multi-session Reports two-pane revamp
Source: `specs/flowlens-reports-overlay.md` · Tracked as: `features.md` #17

**Status per verification-log.md (2026-07-02): NOT STARTED.** Spec is complete and ready to
build from; `ReportsOverlay.tsx` is still the old single-column layout.

**Scope: exactly one file changes** — `src/modes/flowlens/components/reports/ReportsOverlay.tsx`.
No changes to `AnalyticsOverlay.tsx`, `analyticsPrimitives.tsx`, `aggregate.ts`, `sessionFilters.ts`,
or `HeatmapView.tsx` — the data/aggregation layer is already correct, this is a UI-only rebuild.

**New layout:** two-pane — collapsible filter sidebar (260px open / 40px collapsed) on the left,
tab bar + tab body on the right. Tabs: `Overview`, `Funnel`, `Heatmap`, `Sessions`.

**New pieces needed:**
- `FilterSidebar` — all filters exposed (screen/device/connection/outcome/source selects, min+max
  quality sliders, date range, tag checkboxes, test-mode checkbox) — several of these exist in the
  data model but were never wired into the old flat UI (date range, tags, maxQuality).
- `OverviewTab` — hero stat grid (7 `StatCard`s), funnel preview, frustrated screens, screen
  popularity mini-table.
- `FunnelTab`, `HeatmapTab`, `SessionsTab` (sortable table, sticky header).
- Atoms: `StatCard`, `FunnelBar`, `SortableHeader`, `SessionRow`, `TagPill`, `SkeletonBlock`,
  `EmptyState`.
- Loading skeletons (sessions === null) and empty states (filtered.length === 0) for every tab.

**Verification checklist (from spec):** two-pane renders correctly; sidebar collapses/expands with
active-filter-count badge; all 4 tabs switch without error; date range + tag filters apply; loading
skeletons appear briefly; empty state on zero-match filters; export still works; Escape still closes.

---

## Flowaid — onboarding persona & cross-session persistence
Source: `specs/flowaid-onboarding.md` (includes exact stub-file source appended from a merged
earlier draft) · Tracked as: `features.md` #40 (status: **done**)

**Problem replaced:** `create-flowkit-app` used to force a static UI-kit choice
(apple/material/neo-brutalism/none) at scaffold time, coupling every project to Radix components
that weren't actually installed for any kit but `none` — broken out of the box.

**Approach:** Drop the kit picker. The generated `CLAUDE.md` instructs whichever AI agent opens the
project to act as **Flowaid** — profile the author conversationally, then make design/component
decisions itself. Design constraint: **multi-session continuity must feel like one continuous
relationship, not a series of first meetings.**

**Behavior:**
- **Cold start:** if the first message is already a concrete task, build immediately with sane
  defaults; thread the 5 profiling questions into natural checkpoints instead of front-loading.
- **Interview topics** (once, conversational): name, dev-experience level, what they're building,
  working style, look-and-feel preference (Flowaid decides the actual technical approach itself —
  plain Tailwind vs. shadcn/ui vs. other — based on the answer).
- **Tone:** warm-but-efficient by default, calibrates post-interview toward more explanatory
  (non-technical) or more terse (experienced dev) — with concrete example lines baked into
  `CLAUDE.md`, since adjectives alone read inconsistently across models.
- **No-name continuity:** writes an unnamed `## Author Profile` section if no name is given;
  upgrades in place if a name arrives later; only creates a second section if answers genuinely
  indicate a different person.

**Persistence:** `.flowaid/profile.md`, separate from `CLAUDE.md` (instructions vs. learned state).
Git-tracked, not personal-dotfile-gitignored — treated as a team artifact. None of the fields are
sensitive today; revisit if that changes.

**Multi-agent provisioning:** one canonical file (`CLAUDE.md`); `AGENTS.md` and
`.cursor/rules/flowkit.mdc` are stubs that redirect to it (hand-written template strings, since the
scaffolder is a standalone zero-dependency package that can't import the monorepo's `render.js`).

**Implementation:** `packages/create-flowkit-app/index.js` — `writeClaude`, `writeFlowaidProfileStub`,
`writeAgentsStub`, `writeCursorRules`, unchanged `writeGitignore` (deliberately no `.flowaid/`
gitignore entry).

**Known follow-up:** stub-to-canonical drift risk — the two stubs reference `CLAUDE.md`'s section
heading by name with no shared render step. Low risk today, flagged for a one-line comment.

---

## Flat-mode export command (new)
Source: `execution/flat-mode-export-command.md` · Tracked as: `features.md` T-22

**Status: planned, holding notes only** — detailed design deferred until prioritized for real work.

**Context:** `flowkit export`/`flowkit export:full` are currently repo-mode-only
(`requireRepoMode()` in `scripts/cli/export.js:73`). User considers flat-mode export important.

**Hard constraints:**
- Do **not** touch the existing `export`/`export:full` commands.
- Build a **separate, new command** for flat-mode export.
- `flowkit watch` does **not** need flat-mode support — deprioritized/dropped from scope entirely.

**Open decisions (nothing locked yet):**
- New command's name (explicitly not `export`/`export:full`)
- Which parts of repo-mode export translate directly to flat mode (single implicit workspace, no
  workspace-enumeration prompt needed) vs. need new logic
- Whether `inline.js` / `vite.config.standalone.ts` have repo-mode assumptions (workspace path
  resolution, `FLOWKIT_WORKSPACE` env var) the new command needs to handle
- Whether flat mode needs its own standalone-build vite config or can reuse the existing one by
  pointing `FLOWKIT_WORKSPACE`/cwd correctly
- FlowLens-included variant naming (mirroring `export` vs `export:full`)
- Wiring into `router.js`, `help.js`, `docs/CLI.md`
- Verification plan: scaffold a flat-mode test project (or simulate via `.flowkit-repo-root`
  absence) and confirm the new command produces a working standalone HTML file
