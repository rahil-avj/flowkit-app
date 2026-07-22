# FlowLint Strategy

> "FlowLint" is this feature's name; the actual CLI command is **`flowkit check`**
> (`flowkit check:screens`, `flowkit check:plans`, etc.) — not `flowkit lint`, to avoid
> colliding with the existing `npm run lint` (plain ESLint) in this repo. Renamed throughout
> this doc during implementation planning; see the file-structure and plan:check sections
> below for the corrected paths and command names.

## Intent

FlowLint is a FlowKit-aware workspace integrity checker. Its purpose is not to replace ESLint or TypeScript — it sits above them, catching structural and semantic violations that neither tool can express.

The three existing tools catch:

- **TSC**: type errors, missing imports, wrong prop shapes
- **ESLint**: boundary violations, unused vars, import order
- **plan:check**: flowplan-level step/screenId validity (already exists)

FlowLint catches the gap between them: **the workspace is TypeScript-valid but FlowKit-structurally broken**. A screen missing `screenMeta` compiles fine. A `screenOrder` entry pointing to a non-existent directory compiles fine. A flowplan step referencing a deleted screen compiles fine. These all fail silently at runtime — FlowLint is what catches them.

---

## Place in the AI Workflow

FlowLint is the enforcement arm of the agent workflow system. The three layers are:

```
PREVENTION      →  scaffold CLI          makes wrong way harder than right way
DETECTION       →  flowlint              catches what scaffolding doesn't
ORIENTATION     →  AGENTS.md            mental model + "use the CLI"
```

FlowLint closes the feedback loop. When an agent writes a file manually (bypassing the scaffold CLI), or writes something partially correct, FlowLint fires immediately and gives actionable, self-correcting output. The agent does not need to debug — it reads the error, applies the stated fix, moves on.

Without FlowLint, the agent either discovers the problem at dev server startup (slow loop, hard to trace) or not at all (silent failure until a human reviews). With FlowLint, the error surfaces within the same tool-call round-trip.

### Execution Contexts

```
1. POST-WRITE HOOK     (primary for agents)
   Fires after every file save in the workspace
   Runs: flowkit check:file <path>
   Scope: the edited file + cross-references it touches
   Target: <100ms per file

2. PRE-BUILD GATE      (existing plan:check, extended)
   Runs: flowkit check (full workspace)
   Fires before: npm run build
   Blocks the build on errors, warns on warnings

3. ON-DEMAND COMMAND   (agent can call explicitly)
   Runs: flowkit check [--workspace:<ws>] [--fix]
   Full workspace check, optional auto-fix
```

For Claude Code users the post-write hook is configured in `.claude/settings.json`. For Cursor/Copilot users, the on-demand command and pre-build gate provide coverage.

---

## What FlowLint Checks

### Domain: SCREENS

Files: `workspaces/<ws>/flows/<flow>/<screen>/<ScreenName>.tsx`

| Rule ID                     | Check                                                    | Severity |
| --------------------------- | -------------------------------------------------------- | -------- |
| `screen/no-default-export`  | File has no default export (React component)             | Error    |
| `screen/missing-meta`       | No `export const screenMeta`                             | Error    |
| `screen/meta-missing-label` | `screenMeta` has no `label` field                        | Warning  |
| `screen/meta-id-mismatch`   | `screenMeta.id` present but doesn't match directory name | Error    |

> **Forbidden cross-layer imports are NOT a FlowKit-check rule** — resolved during
> implementation planning: `eslint-plugin-boundaries` (already configured in `eslint.config.js`
> for `src/**`'s shared/core/features/modes/app layers) is extended with a new `workspace`
> element type + dependency rule instead, rather than duplicating the same concern as a second,
> parallel rule engine here. See `eslint.config.js`'s `boundaries/elements`/`boundaries/dependencies`
> config for the actual enforcement.

### Domain: CONFIG

File: `workspaces/<ws>/flowkit.config.ts`

| Rule ID                | Check                                               | Severity |
| ---------------------- | --------------------------------------------------- | -------- |
| `config/orphaned-id`   | screenId in `screenOrder` has no matching directory | Error    |
| `config/orphaned-dir`  | Screen directory exists but not in `screenOrder`    | Warning  |
| `config/flow-mismatch` | Flow in `screenOrder` not listed in `flows[]`       | Error    |
| `config/empty-flow`    | Flow in `flows[]` has no screens in `screenOrder`   | Warning  |

### Domain: FLOWPLANS

Files: `workspaces/<ws>/flowplans/*.ts`

| Rule ID                         | Check                                        | Severity |
| ------------------------------- | -------------------------------------------- | -------- |
| `flowplan/invalid-screen`       | Step `screenId` not found in workspace flows | Error    |
| `flowplan/id-filename-mismatch` | `defineFlow({ id })` doesn't match filename  | Error    |
| `flowplan/empty-steps`          | Flowplan has zero steps                      | Warning  |
| `flowplan/weak-step`            | Step has no `actionNote` and no `on` handler | Warning  |
| `flowplan/invalid-fork-screen`  | Fork step references a non-existent screenId | Error    |

### Domain: COMPONENTS

Files: `workspaces/<ws>/lib/components/**`

| Rule ID                     | Check                                                            | Severity |
| --------------------------- | ---------------------------------------------------------------- | -------- |
| `components/unregistered`   | Component file exists but not in `.flowkit/components.json`      | Warning  |
| `components/stale-registry` | `.flowkit/components.json` references file that no longer exists | Warning  |
| `components/barrel-gap`     | Component file exists but not exported from nearest `index.ts`   | Warning  |
| `components/barrel-phantom` | `index.ts` exports a name with no matching file                  | Error    |

### Domain: MOCK DB

File: `workspaces/<ws>/lib/data/db.ts`

| Rule ID                | Check                                        | Severity |
| ---------------------- | -------------------------------------------- | -------- |
| `db/no-default-export` | `db.ts` has no default export                | Error    |
| `db/non-object-export` | Default export is not a plain object literal | Warning  |

---

## Output Format

Output is designed for agent consumption: every error includes the exact fix, not just the location.

```
FLOWLINT: 3 errors, 2 warnings  [workspaces/nClarity]

ERROR [screen/missing-meta] flows/auth/login/LoginScreen.tsx
  Missing: export const screenMeta
  Fix: add at bottom of file →
    export const screenMeta = { label: 'Login', desc: '' }
  Or:  flowkit fix:screen --flow:auth --name:login

ERROR [config/orphaned-id] flowkit.config.ts → screenOrder.auth
  screenId 'register' has no matching directory
  Expected: flows/auth/register/
  Fix: flowkit create:screen --flow:auth --name:register
  Or:  flowkit config:remove-screen --flow:auth --screen:register

ERROR [flowplan/invalid-screen] flowplans/auth.ts step[3]
  screenId 'sso-complete' not found in any flow
  Available auth screens: sign-in · sign-up · forgot-password · two-fa-verification
  Fix: update step screenId or run flowkit create:screen --flow:auth --name:sso-complete

WARNING [components/unregistered] lib/components/ui/StatusBadge.tsx
  Component exists but not in .flowkit/components.json
  Fix: flowkit components:register --name:StatusBadge --path:lib/components/ui --desc:"..."

WARNING [flowplan/weak-step] flowplans/onboarding.ts step[2]
  Step has no actionNote or on handler — playback shows no guidance
  Fix: add actionNote: 'describe what the user does here'
```

### `--json` flag output (for tooling integration):

```json
{
  "workspace": "nClarity",
  "errors": 3,
  "warnings": 2,
  "results": [
    {
      "ruleId": "screen/missing-meta",
      "severity": "error",
      "file": "flows/auth/login/LoginScreen.tsx",
      "message": "Missing export const screenMeta",
      "fix": "add `export const screenMeta = { label: 'Login', desc: '' }` at end of file",
      "clifix": "flowkit fix:screen --flow:auth --name:login"
    }
  ]
}
```

---

## Auto-Fix Scope (`--fix` flag)

Some errors are safe to auto-fix. Others require human/agent intent.

| Rule ID                     | Auto-fixable | Fix action                                             |
| --------------------------- | ------------ | ------------------------------------------------------ |
| `screen/missing-meta`       | Yes          | Append `screenMeta` stub to file                       |
| `components/unregistered`   | Yes          | Add to `components.json` with empty desc               |
| `components/stale-registry` | Yes          | Remove stale entry from `components.json`              |
| `components/barrel-gap`     | Yes          | Add export to `index.ts`                               |
| `flowplan/weak-step`        | Yes          | Add `actionNote: ''` stub                              |
| `config/orphaned-id`        | No           | Agent must decide: create screen or remove from config |
| `config/orphaned-dir`       | No           | Agent must decide: add to config or delete directory   |
| `flowplan/invalid-screen`   | No           | Agent must decide: create screen or update step        |
| `screen/forbidden-import`   | No           | Requires understanding of intent                       |

---

## Implementation Approach

### No Full TypeScript Compilation

FlowLint does not run `tsc`. It uses targeted parsing:

- **Export detection**: `@typescript-eslint/parser` to parse TSX/TS to AST, then walk for `ExportNamedDeclaration` and `ExportDefaultDeclaration` nodes. Fast and accurate for known patterns.
- **Import detection**: Same AST walk for `ImportDeclaration` nodes, check `source.value` against forbidden prefixes.
- **Config cross-referencing**: `fs.readdirSync` for directory existence checks; read `flowkit.config.ts` as text and extract `defineConfig({...})` object via regex + JSON-safe parsing (the config format is stable).
- **Flowplan validation**: Import and evaluate the flowplan `.ts` file at runtime using `tsx` or `jiti` (already available as a dependency candidate) to get the `FlowplanDef` object, then cross-reference `step.screenId` against workspace screen directories.
- **Barrel validation**: Read `index.ts` lines, extract named exports via regex; compare to files in directory.

### Performance Targets

| Context                       | Target                         | Strategy                                           |
| ----------------------------- | ------------------------------ | -------------------------------------------------- |
| Post-write hook (single file) | <150ms                         | Parse only the changed file + its cross-references |
| Full workspace lint           | <2s for 50 screens             | Parallel file reads, cache config parse            |
| Pre-build gate                | Blocking but non-critical path | Full check, no time constraint                     |

### File Location

Corrected to match this repo's actual current layout (`scripts/platform/`, `scripts/helpers/`,
`scripts/authoring-support/` — this doc previously proposed a `scripts/cli/`/`scripts/lib/`
structure that doesn't exist in this codebase):

```
scripts/platform/check.js        command handlers: cmdCheck, cmdCheckScreens, cmdCheckConfig,
                                  cmdCheckPlans, cmdCheckComponents, cmdCheckDb — dispatched
                                  from router.js's p.cmd === 'check' branch
scripts/checks/                  (sibling to scripts/authoring-support/, scripts/helpers/)
  ├── screens.js                 screen file rules (default-export + screenMeta shape only —
                                  forbidden-import checks live in eslint.config.js instead)
  ├── config.js                  flowkit.config.ts rules
  ├── flowplans.js                flowplan rules — plan:check's cmdPlanCheck becomes a thin
                                  wrapper calling into this module's runner
  ├── components.js              component registry rules
  ├── db.js                      mock db rules
  ├── reporter.js                formats output (human + JSON)
  └── ts-parse.js                 shared @typescript-eslint/parser AST-walk helpers
```

### Relation to Existing `plan:check`

Corrected — checked `scripts/platform/plans.js`'s `cmdPlanCheck` directly rather than assume:
today it only does crude string-presence checks (`src.includes('id:')` / `.includes('name:')` /
`.includes('steps:')`), not real parsing. It does **not** currently validate that step
`screenId`s reference real screens, or check `defineFlow`'s id against the filename, despite
this doc previously describing it that way. There is not substantial existing logic to
"extract" — `check:plans`'s rule module in `scripts/checks/flowplans.js` is written close to
from scratch, and `plan:check`/`fp:check` become a thin wrapper delegating to it (kept as
working, backward-compatible commands — not removed, since `plan:check` is a live `prebuild`
gate in `package.json` that other tooling already depends on).

---

## Integration with AGENTS.md

AGENTS.md references FlowLint in two places:

1. **Hard Rules section**: "FlowLint runs automatically after every file save. Read its output before continuing."
2. **Coming Soon section** (current sprint): replaced with active documentation once this sprint ships.

The post-write hook configuration for Claude Code (`.claude/settings.json`):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "flowkit check:file --path:${file}"
          }
        ]
      }
    ]
  }
}
```

For agents without hook support: AGENTS.md instructs the agent to run `flowkit check` after each batch of file changes and before declaring a task complete.

---

## Sprint Scope

This is a dedicated sprint after the CLI library sprint ships.

**In scope:**

- All rule domains above (screens, config, flowplans, components, db)
- `flowkit check` command (full workspace)
- `flowkit check:file` command (single file, for hooks)
- `--fix` auto-fix for safe rules
- `--json` machine-readable output
- Post-write hook configuration for Claude Code
- `plan:check` refactored to delegate to `scripts/checks/flowplans.js`
- AGENTS.md updated from "COMING SOON" to active documentation

**Out of scope (future sprint):**

- IDE extension integration (VS Code problems panel)
- `flowkit check:watch` continuous mode
- Custom rule authoring API
- Cross-workspace checks
