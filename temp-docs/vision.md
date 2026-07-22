# Product vision & personas (condensed)

Source: `product/vision/VISION.md`, `product/features-by-persona.md`, `product/user-stories.md`.

---

## What FlowKit is

A **browser-based execution platform for interactive UI prototypes**. Screens are React
components; flows are ordered sequences of screens. The platform executes them — real conditional
logic, a live mock database, device simulation, session recording — so prototypes behave like real
products, not static click-throughs.

**Who it's for:** designers and developers building multi-screen product flows who need more than
a slide deck but less than a production app. Primary use case: validate interactions/journeys
before writing production code.

**Fidelity range:** wireframes → high-fidelity mockups → production-ready component previews, all
on the same platform, same flows, same recording infrastructure.

**Three core values** (from user-stories.md): **Creation** (non-developers direct AI agents inside
a bounded, predictable structure — the differentiator from open-ended vibe-coding), **Collaboration**
(live navigable prototypes stakeholders experience in-browser, no install), **Research** (every
session is a data source — FlowLens gives real behavioral data, not guesses).

## What a successful v1 looks like — 7 core features, fully working, correctly gated

| Feature       | What it does                                                            |
| ------------- | ----------------------------------------------------------------------- |
| FlowMaster    | Executes flows — interactions, guards, animations, flowplan journeys    |
| FlowTracer    | Records every session automatically                                     |
| FlowLens      | Replays recordings; single + multi-session analytics                    |
| Feedback      | In-canvas per-screen comment wall, cloud sync, export                   |
| Flow Debugger | Live runtime inspection                                                 |
| Flow Library  | Browse/run flowplans; workspace hierarchy tree                          |
| Simulator     | Device presets, connection mode, accessibility filters, custom controls |

Gated by a planned feature management system (registry → entitlement resolver → gate) —
**not yet implemented**, see `features.md` #36.

## What FlowKit is explicitly NOT

- Not a component library — the kit system serves workspace authors, isn't distributed standalone
- Not a design tool — no drawing/layout/visual-editing surface; screens are code
- Not a testing framework — FlowLens analytics inform decisions, don't assert correctness
- Not a production host — the standalone export is for sharing previews, not running in production
- Not a CMS/feature-flag service — the feature registry is a dev-edited config, not a dashboard
- Not a backend — the mock database is in-memory only; no persistence, auth, or API layer

## Distribution model

Two ways to ship from one repo:

- **Repo mode** — this checkout, for platform development
- **Flat/author mode** — `npm create flowkit-app@latest`, gets `flowkit` in `node_modules/`, no
  `workspaces/` dir. **Not live yet** — see `features.md` Package-Publish section, T-23 through T-29.

**Why the split exists:** AI coding agents read `src/core/`, `src/features/`, `src/shared/`
unprompted and waste context on platform internals an author should never touch. `node_modules`
gives universal agent/editor blindness by convention.

## The five values that guide every decision

1. **Single ownership** — every piece of state has exactly one owner
2. **Runtime independence** — the execution engine never depends on how a flow was authored
3. **Observers never influence execution** — recording/analytics/debugging are read-only
4. **Layer boundaries are hard** — Authoring → Compiler → Runtime → Coordination → UI → Observers
5. **Incremental evolution** — smallest correct improvement, backed by evidence, not speculation

---

## Personas (U1–U5)

| ID  | Role                   | Environment                        | Core need                                       |
| --- | ---------------------- | ---------------------------------- | ----------------------------------------------- |
| U1  | Platform Developer     | `production` branch, full tooling  | Build and evolve FlowKit itself                 |
| U2  | Workspace Author       | `deployment` branch, CLI + browser | Create prototype flows, possibly via AI agents  |
| U3  | UX Researcher          | `deployment` browser + CLI         | Gather and export session data and feedback     |
| U4  | Stakeholder / Teammate | Browser or standalone HTML         | Experience and review flows, give feedback      |
| U5  | Workspace Recipient    | Handoff zip, no FlowKit needed     | Implement the real product from prototype specs |

Full per-feature persona mapping: `product/features-by-persona.md` (frozen June 2026 snapshot,
not auto-synced with `features.md` in this tracker).

### Core need per persona, one line each

- **U1 (Platform Developer):** stability tooling — lint/type-check/test, CLI validation commands,
  version tagging, a strip script that generates `deployment` from `production` automatically, and
  a locked `deployment` `src/`/`scripts/lib/` so authors/agents can't mutate the engine.
- **U2 (Workspace Author):** a scaffolded, convention-locked starting point (`flowkit nw`) so an AI
  agent has an unambiguous lane to work in; hot-reload (`flowkit watch`); at-a-glance status
  (`flowkit status`, `plan:ls`); one-command sharing (`flowkit export`) and handoff (`flowkit handoff`);
  realistic mock-DB-backed data so flows feel grounded, not placeholder-filled.
- **U3 (UX Researcher):** in-browser session replay without needing to interpret raw data;
  structured analytics export (`lens:report`) into their own tools; data audit/cleanup commands
  (`sessions:ls/export/stats/purge`); feedback export (`feedback:ls/dump`); all of it usable without
  a developer present.
- **U4 (Stakeholder/Teammate):** zero-install review via a link or standalone HTML file; natural
  navigation (tap/click/swipe) that feels like using the real thing; realistic data/device
  constraints so feedback is grounded; in-context commenting; offline-capable fast loading.
- **U5 (Workspace Recipient):** a structured, self-contained handoff zip with clearly named
  screens/flows, action notes per flowplan step (what triggers each transition, not just the
  destination), mock DB state per screen (to map to real API contracts), and screen metadata
  referenceable in tickets/PRs without ambiguity — understandable months later with no walkthrough.
