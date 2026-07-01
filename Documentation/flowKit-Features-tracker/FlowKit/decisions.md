# FlowKit Core — Decision Log

Append-only. Most recent at top.

---

## 2026-06-26 — Feature management system designed but not implemented

**Decision:** Three-layer architecture planned (Registry → Entitlement Resolver → Feature Gate) with 7 features to register at v1: `flowlens`, `flowplans`, `feedback`, `flowTracer`, `flowDebugger`, `flowLibrary`, `simulator`.
**Reason:** Approaching v1 — need kill switches, beta labels, and plan gating before ship. Current flags (`FLOWLENS_AVAILABLE`, `LS_SESSIONS_ENABLED`) are ad-hoc and inconsistent.
**Source:** `Documentation/project-plans/Feature_Management_System.md`

---

## 2026-06-26 — `workspaces.json` split from `workspaces.ts`

**Decision:** `workspaces.json` holds the registry (name, label, kit) as the CLI-readable source of truth. `workspaces.ts` is the runtime loader that derives `path` and `config` from the JSON — it does NOT export an `active` field.
**Reason:** The CLI needs to read workspace metadata without importing TypeScript. JSON is universally readable. Active workspace selection lives in `localStorage`, not in either file.
**Source:** Refactor visible in `src/workspaces.ts` and `src/workspaces.json`

---

## 2026-06-26 — `flowkit sw` deprecated; workspace switching moved to browser UI

**Decision:** `cmdSwitchWorkspace` prints a deprecation notice and exits. Active workspace is set via the browser UI workspace switcher or `?workspace=<name>` URL param on load.
**Reason:** CLI switching required a dev server restart and didn't work reliably in all environments. The browser UI switcher is faster and always in sync.
**Source:** `scripts/lib/workspace.js:318–323`; confirmed in doc audit

---

## 2026-06-26 — `kit` field in `WorkspaceConfig` is `string`, not a union type

**Decision:** `WorkspaceConfig.kit` is typed as `string` — any value is accepted. There is no union type to extend when adding a new theme.
**Reason:** Union types require a code change every time a new kit is added, creating friction. The canvas sets `data-kit="<value>"` dynamically — runtime, not type-checked.
**Source:** `src/workspaces.ts:5`

---

## 2026-06-26 — Tailwind v4, CSS-only configuration

**Decision:** No `tailwind.config.js`. All custom tokens in `src/index.css` `@theme {}`. Two-tier var architecture: raw `--theme-*` vars set by `ThemeContext`, aliased as `--color-theme-*` for Tailwind utility generation.
**Reason:** Tailwind v4's CSS-native config eliminates the JS config file entirely. Runtime theme injection via CSS vars gives dark/light switching without class toggling or rebuild.
**Source:** `src/index.css`, `src/shared/contexts/ThemeContext.tsx`

---

## 2026-06-26 — Old workspace format kill-switched

**Decision:** Old `_playFlow.ts` / `flows/router.tsx` format is disabled by default. Enabled only via `removed` env flag. The old CLI commands moved under `flowkit arch <cmd>`.
**Reason:** New Flowplan format (`projects/**/flowplans/*.ts`) is the path forward. Old support stays isolated per `DevelopmentValues.md` Principle 16 (Backward Compatibility Through Isolation).
**Source:** `CHANGELOG`, `scripts/flowkit.js:548+`, `src/shared/utils/old/`
