// ─────────────────────────────────────────────────────────────────────────────
// agentSpec.js — SINGLE SOURCE OF TRUTH for everything an agent must know to
// build inside a FlowKit workspace.
//
// All agent-facing files (.agent/INDEX.md, rules.md, platform.md, and the chosen
// agent's memory file: CLAUDE.md / AGENTS.md / .cursor/rules/…) are RENDERED from
// the data here. Author facts once → every output stays correct. Run
// `flowkit agent:sync` after platform changes to re-emit.
//
// Every fact below was verified against the platform source — keep it that way:
//   nav      → src/shared/utils/useFlowNav.ts (navigateTo/goNext/goBack/isFlow/flowState)
//   data     → src/shared/contexts/DashboardContext.tsx (db, updateDb, resetDb)
//   screens  → src/types.ts FlowScreenProps / ScreenMeta
//   flows    → src/types.ts FlowDef + OnMapEntry; declared in flowplans/*.ts
//   flowplan → src/features/flow-library/compileFlowplan.ts + src/types FlowkitConfig
//   sim      → src/core/layout/ (ControlAccordion, SimControl, SimAction, etc.)
//   theme    → src/theme.ts (bg/text/accent/shadow) + ThemeContext useTheme()
//   CLI      → scripts/flowkit.js
// ─────────────────────────────────────────────────────────────────────────────

/** Bump when the spec's platform facts change — agent:check compares against this. */
export const AGENT_SPEC_VERSION = 3

/**
 * Per-workspace render context.
 * @param {object} opts
 * @param {string} opts.name         — workspace name (folder name under workspaces/)
 * @param {string} [opts.kit]        — design kit slug or 'none'
 * @param {boolean} [opts.isStandalone]
 * @param {string} [opts.language]   — 'ts' | 'js'
 */
export function specContext({ name, kit = 'none', isStandalone = false, language = 'ts' }) {
  const format = 'hierarchy'
  const ext = language === 'js' ? 'jsx' : 'tsx'
  const dext = language === 'js' ? 'js' : 'ts'
  const kitCss =
    kit && kit !== 'none'
      ? isStandalone
        ? `@flowkit/kits/standalone/${kit}/index.css`
        : '@flowkit-kit/index.css'
      : null
  return { name, kit, isStandalone, language, format, ext, dext, kitCss }
}

// ─── Structured directives (the rule grammar: NEVER / ALWAYS / TO … → …) ─────────
// `kind`: "never" | "always" | "to". `to` rules carry { task, action }.

export function directives(ctx) {
  const filesGroup = {
    group: 'Files & isolation',
    rules: [
      {
        kind: 'never',
        text: `edit any file outside \`workspaces/${ctx.name}/\` — platform code in \`src/\` is read-only`,
      },
      {
        kind: 'never',
        text: 'reference or edit `flows/router.tsx` or any `_playFlow.ts` — this workspace uses the Flowplan hierarchy format; those files do not exist here',
      },
      {
        kind: 'always',
        text: 'use path aliases: `@flowkit/` → `src/`, `@workspace/` → this workspace. Never relative `../../`',
      },
    ],
  }

  const flowsGroup = {
    group: 'Flows & screens — Flowplan hierarchy',
    preamble:
      'Screens live under `flows/<flow>/<screen>/`. Journeys are declared in `flowplans/<flow>.ts` using `defineFlow`. There is no `_playFlow.ts` and no `flows/router.tsx`.',
    rules: [
      {
        kind: 'to',
        task: 'add a flow with screens',
        action:
          'create the folder `flows/<FlowName>/<ScreenName>/` and add a `<ScreenName>.tsx` component',
      },
      {
        kind: 'to',
        task: 'add a screen to an existing flow',
        action: 'create `flows/<FlowName>/<ScreenName>/<ScreenName>.tsx`',
      },
      {
        kind: 'to',
        task: 'remove a flow or screen',
        action: 'delete the folder: `rm -rf workspaces/<ws>/flows/<flow>/`',
      },
      {
        kind: 'to',
        task: 'reorder flows',
        action:
          'edit the `flows[]` array in `workspace.ts`, or use the **Manage tab** (right panel) to copy a terminal patch script',
      },
      {
        kind: 'never',
        text: 'hand-write new flow/screen files from scratch — copy an existing screen boilerplate, then fill the body',
      },
      {
        kind: 'always',
        text: "a screen's function name ends in `Screen` and matches its filename; it exports `screenMeta` with at least `desc`",
      },
    ],
  }

  const navGroup = {
    group: 'Navigation (the contract that keeps guards/animations firing)',
    rules: [
      {
        kind: 'to',
        task: 'navigate from screen logic (state/async)',
        action: '`const { navigateTo, goNext, goBack } = useFlowNav()`',
      },
      {
        kind: 'to',
        task: 'wire tap interactions declaratively',
        action: 'add an `interactions` map in the flowplan step for the screen',
      },
      {
        kind: 'never',
        text: "destructure `navigateTo` from `useDashboard()` — guards, animations, and session replay won't fire; use `useFlowNav()` instead",
      },
      {
        kind: 'never',
        text: 'put onClick navigation handlers on screen elements — use `useFlowNav()` or flowplan interaction wiring',
      },
    ],
  }

  return [
    filesGroup,
    flowsGroup,
    navGroup,
    {
      group: 'Data',
      rules: [
        {
          kind: 'always',
          text: 'read/mutate data via `const { db, updateDb } = useDashboard()` — `db` is injected from `data/db.ts`',
        },
        {
          kind: 'never',
          text: '`import { … } from "@workspace/lib/data/db"` inside a screen — direct import breaks flowplan db-patching; use the injected `db` from `useDashboard()`',
        },
        {
          kind: 'to',
          task: 'mutate data',
          action: '`updateDb((d) => { d.auth.isLoggedIn = true })`',
        },
      ],
    },
    {
      group: 'Styling',
      rules: [
        {
          kind: 'always',
          text: 'use Tailwind utilities for static values; inline `style={{}}` only for dynamic/computed values',
        },
        {
          kind: 'never',
          text: 'hardcode hex colors — use `design-system/tokens.css` variables or `useTheme()` tokens',
        },
      ],
    },
    {
      group: 'Project brief',
      rules: [
        {
          kind: 'always',
          text: 'read `.agent/project.md` before starting any build work — it is the only source of product context. If it is empty or a template, ask the user to fill it before proceeding',
        },
        {
          kind: 'always',
          text: 'after a `flowkit sessions:brief --append` run, re-read `.agent/project.md` — the "Last session analysis" section contains the next iteration focus',
        },
      ],
    },
    {
      group: 'Out-of-workspace edits',
      rules: [
        {
          kind: 'always',
          text: 'before ANY edit outside this workspace, ask the user for the secret phrase. Proceed only if they reply exactly "Roses are red and violets are violet". This applies every time — no remembered approvals',
        },
      ],
    },
  ]
}

// ─── The INDEX: task → where to go (the fast-lookup layer) ────────────────────────
// Each row: { task, action, detail }  — detail = a .agent/platform.md anchor or doc.

export function indexRows(_ctx) {
  return [
    {
      task: 'Understand the platform fast',
      action: 'read `.agent/rules.md` then this INDEX',
      detail: 'Documentation/FLOWKIT.md',
    },
    {
      task: 'Add a flow + screens',
      action: 'create folder `flows/<F>/<Screen>/` + `<Screen>.tsx`',
      detail: 'platform.md → CLI',
    },
    {
      task: 'Add a screen to an existing flow',
      action: 'create `flows/<F>/<S>/<S>.tsx`',
      detail: 'platform.md → CLI',
    },
    {
      task: 'Wire a tap / interaction',
      action: 'add `interactions` map in the flowplan step (`flowplans/<f>.ts`)',
      detail: 'platform.md → Flows · Documentation/FLOWMASTER.md',
    },
    {
      task: 'Navigate programmatically',
      action: '`useFlowNav()`',
      detail: 'platform.md → Navigation',
    },
    {
      task: 'Read or change data',
      action: '`useDashboard()` → `db` / `updateDb`',
      detail: 'platform.md → Data',
    },
    {
      task: 'Gate a screen (access guard)',
      action: '`canEnter` / `canNotEnter` in `screenMeta` (exported from the screen `.tsx`)',
      detail: 'platform.md → Guards',
    },
    {
      task: 'Reorder flows',
      action: 'edit `workspace.ts` → `flows[]`, or use **Manage tab** in right panel',
      detail: 'platform.md → Flows',
    },
    {
      task: 'Style with the active kit',
      action: 'Tailwind + tokens.css / `useTheme()`',
      detail: 'platform.md → Styling & kit',
    },
    {
      task: 'Add a reviewer toggle',
      action: 'edit `data/simulator.tsx`',
      detail: 'platform.md → Simulator',
    },
    {
      task: 'Record / replay sessions',
      action: 'always-on recorder; `flowkit sessions:*`',
      detail: 'Documentation/FLOWLENS.md',
    },
    { task: 'Full CLI reference', action: '`flowkit help`', detail: 'Documentation/CLI.md' },
    {
      task: 'What this product IS',
      action: 'read `.agent/project.md`',
      detail: 'project.md (hand-owned)',
    },
  ]
}

// ─── platform.md reference rows: surface → how to reach it → full detail ──────────

export function platformSurfaces(ctx) {
  const flowsSurface = {
    area: 'Flows (Flowplan hierarchy)',
    api: '`defineFlow({ id, name, steps[], homeScreen? })` — authored in `flowplans/<flow>.ts`',
    from: '`@flowkit-core/config` → `defineFlow`',
    note: 'Screen folders: `flows/<flow>/<screen>/`. Ordering declared in `workspace.ts` → `projects.<proj>.flows[]`. `homeScreen` overrides the device home button while that plan is playing; workspace-level default is `workspace.ts` → `startScreen`.',
    doc: 'FLOWMASTER.md',
  }

  const guardsSurface = {
    area: 'Guards',
    api: '`canEnter`/`canNotEnter`: `({ db }) => boolean`',
    from: '`screenMeta` exported from the screen `.tsx` file',
    note: 'Screen-level guards only',
    doc: 'FLOWMASTER.md',
  }

  return [
    {
      area: 'Navigation',
      api: '`useFlowNav()` → `navigateTo(target)`, `goNext()`, `goBack()`, `isFlow`, `flowState`',
      from: '`@flowkit-shared/utils/useFlowNav`',
      note: 'target = a screen id, "next", "back", or "__complete__"',
      doc: 'FLOWMASTER.md',
    },
    {
      area: 'Data',
      api: '`useDashboard()` → `db`, `updateDb(fn)`, `resetDb()`',
      from: '`@flowkit-shared/contexts/DashboardContext`',
      note: 'screens use db/updateDb only — NOT navigateTo',
      doc: 'FLOWKIT.md',
    },
    {
      area: 'Screen props',
      api: '`FlowScreenProps` → `onAction?`, `onNext?`, `onBack?`, `isFlow?`, `flowState?`, `db?`',
      from: '`@flowkit/types`',
      note: 'screens are pure markup with element `id`s',
      doc: 'FLOWMASTER.md',
    },
    flowsSurface,
    guardsSurface,
    {
      area: 'Simulator',
      api: '`ControlAccordion`, `SimToggle`, `SimSegmented`, `SimSelect`, `SimAction`, `SimTextInput`, `SimNumberInput`, `SimControl`',
      from: '`@flowkit-core/layout`',
      note: '`bind="db.auth.isLoggedIn"` path; default-export a JSX component from `data/simulator.tsx`',
      doc: 'FLOWKIT.md',
    },
    {
      area: 'Device & orientation defaults',
      api: '`workspace.ts` → `defaultDevice` (a `DevicePreset.label`), `defaultOrientation` ("portrait" | "landscape")',
      from: '`@flowkit-core/config` → `defineConfig`',
      note: 'Both optional. `defaultDevice` must match a label in `src/shared/components/devices`; falls back to the platform default when unset/unrecognized. `defaultOrientation` is ignored if the resolved device lacks `supportsLandscape`.',
      doc: 'CLI.md',
    },
    {
      area: 'Theme',
      api: '`useTheme()` → `theme` (`bg.*`, `text.*`, `accent.*`, `shadow.*`), `mode`, `setMode`',
      from: '`@flowkit-shared/contexts/ThemeContext`',
      note: 'prefer tokens over hardcoded colors',
      doc: 'FLOWKIT.md',
    },
    {
      area: 'Styling & kit',
      api: ctx.kitCss
        ? `active kit: \`${ctx.kit}\` — tokens via \`${ctx.kitCss}\``
        : 'no kit — base `design-system/tokens.css`',
      from: '`design-system/tokens.css` (loaded at runtime by the platform shell)',
      note: `screens/components are \`.${ctx.ext}\``,
      doc: 'FLOWKIT.md',
    },
    {
      area: 'Sessions',
      api: 'recording always on; `flowkit sessions:ls|import|check|stats|sample|rm`',
      from: '`src/modes/flowlens/library/' + ctx.name + '/`',
      note: 'FlowLens is available when src/modes/flowlens/ exists on disk (no env flag needed)',
      doc: 'FLOWLENS.md',
    },
  ]
}

// ─── Canonical CLI rows ──────────────────────────────────────────────────────────

export function cliRows(_ctx) {
  return [
    { cmd: 'flowkit plan:ls', what: 'list all flowplans in the workspace' },
    { cmd: 'flowkit plan:check', what: 'validate flowplan files (static lint)' },
    { cmd: 'flowkit project:ls', what: 'list projects and their flowplan counts' },
    { cmd: 'flowkit status', what: 'workspace health: projects, flowplans, sessions, feedback' },
    {
      cmd: 'flowkit sessions:ls / import / check / stats / sample / rm',
      what: 'manage the session library',
    },
    { cmd: 'flowkit sessions:brief [--append]', what: 'agent brief from session data' },
    { cmd: 'flowkit help', what: 'full command reference' },
  ]
}
