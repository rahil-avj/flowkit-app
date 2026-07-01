# Linting & Early Error Detection — Analysis Report

## 1. ESLint

**Config file:** `eslint.config.js` (flat config format, ESLint v10)

### Plugins active

| Plugin                             | Version | Purpose                                           |
| ---------------------------------- | ------- | ------------------------------------------------- |
| `@eslint/js`                       | ^10.0.1 | Base JS recommended rules                         |
| `typescript-eslint`                | ^8.59.2 | TS-aware rules, replaces `@typescript-eslint/*`   |
| `eslint-plugin-react-hooks`        | ^7.1.1  | Hooks rules (exhaustive-deps, rules-of-hooks)     |
| `eslint-plugin-react-refresh`      | ^0.5.2  | HMR safety                                        |
| `eslint-plugin-boundaries`         | ^6.0.2  | Architecture layer enforcement                    |
| `eslint-plugin-simple-import-sort` | ^13.0.0 | Import/export ordering                            |
| `eslint-plugin-tailwindcss`        | ^4.0.4  | Tailwind class correctness                        |
| `eslint-config-prettier`           | ^10.1.8 | Disables ESLint rules that conflict with Prettier |

### Scope

Applies only to `**/*.{ts,tsx}`. JavaScript files (scripts, config files) are **not linted** by ESLint.

### Global ignores

- `dist/` — excluded entirely

### Key rules

```
@typescript-eslint/no-unused-vars   error   (args/vars prefixed _ are exempt)
simple-import-sort/imports          error
simple-import-sort/exports          error
react-refresh/only-export-components off
tailwindcss/no-unnecessary-arbitrary-value  warn
tailwindcss/enforces-shorthand             warn
boundaries/dependencies             warn    (see Architecture section below)
```

All `react-hooks` recommended rules are spread in (includes `rules-of-hooks` as error, `exhaustive-deps` as warn/error).

### Architecture boundary rules (`boundaries/dependencies`)

Default: **disallow** all cross-layer imports unless explicitly allowed.

| From            | May import                            |
| --------------- | ------------------------------------- |
| `shared`        | `shared` only                         |
| `core`          | `shared`, `core`                      |
| `features`      | `shared`, `core`, `features`          |
| `modes`         | `shared`, `core`, `features`, `modes` |
| `app` (App.tsx) | `shared`, `core`, `features`, `modes` |

Severity: **warn** (not error). Violations are flagged but do not fail CI.

### Tailwind plugin config

Points to `src/index.css` as the CSS config path (required for Tailwind v4 which has no `tailwind.config.js`).

---

## 2. TypeScript

**Root config:** `tsconfig.json` — a composite project with three references.

### tsconfig.app.json — `src/` (app source)

| Option                         | Value     | Note                                               |
| ------------------------------ | --------- | -------------------------------------------------- |
| `strict`                       | `true`    | Enables strictNullChecks, noImplicitAny, etc.      |
| `noUnusedLocals`               | `false`   | **Disabled** — unused locals not caught by tsc     |
| `noUnusedParameters`           | `false`   | **Disabled** — unused params not caught by tsc     |
| `noFallthroughCasesInSwitch`   | `true`    | Switch fallthrough caught                          |
| `noUncheckedSideEffectImports` | `false`   | Side-effect imports not validated                  |
| `skipLibCheck`                 | `true`    | .d.ts files in node_modules skipped                |
| `isolatedModules`              | `true`    | Each file compiled independently (Vite-compatible) |
| `moduleResolution`             | `bundler` | Vite-compatible resolution                         |
| `noEmit`                       | `true`    | Type-check only, no output                         |
| `resolveJsonModule`            | `true`    | JSON imports allowed                               |

Path aliases defined: `@platform`, `@workspace`, `@core`, `@features`, `@shared`, `@flowlens`, `@kit`.

### tsconfig.node.json — `vite.config.ts`, `vite.config.standalone.ts`

Stricter than the app config:

| Option                         | Value  |
| ------------------------------ | ------ |
| `strict`                       | `true` |
| `noUnusedLocals`               | `true` |
| `noUnusedParameters`           | `true` |
| `noFallthroughCasesInSwitch`   | `true` |
| `noUncheckedSideEffectImports` | `true` |

Vite config files are checked more strictly than the app itself.

### tsconfig.workspace.json — `workspaces/`, `src/workspace-stub/`

Loosest config — workspace screens are authored code, not platform code:

| Option          | Value   |
| --------------- | ------- |
| `strict`        | `false` |
| `noImplicitAny` | `false` |
| `checkJs`       | `false` |
| `allowJs`       | `true`  |

Workspace code intentionally gets a lenient pass — no strict checks, JS allowed, JS not type-checked.

---

## 3. Prettier

**Config file:** `.prettierrc`

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

**Ignored paths (`.prettierignore`):**

- `dist`
- `node_modules`
- `*.generated.*`

`eslint-config-prettier` is applied last in the ESLint config, turning off any ESLint formatting rules that would conflict.

---

## 4. Vitest

**Config file:** `vitest.config.ts`

- **Environment:** `node` (no DOM, no jsdom)
- **Test include pattern:** `scripts/tests/**/*.test.ts`
- **Coverage:** not configured
- **Setup files:** none

Tests are scoped to pure-logic scripts only (`applyDotPathPatch`, `compileFlowplan`, keyboard shortcuts, canvas reducer, etc.). There are no component tests or browser-environment tests. `jsdom` and `playwright` are listed as devDependencies but no test config uses them currently.

---

## 5. Pre-commit Hooks

**None.** No Husky, no lint-staged, no `.husky/` directory. Linting and formatting must be run manually before commits.

---

## 6. Build-time Type Checking

`npm run build` runs `tsc -b && vite build`. The `tsc -b` step checks all three tsconfig references before Vite builds, so a type error in `src/` will fail the build. The dev server (`npm run dev`) does **not** run tsc — type errors in development are silent unless the editor surfaces them.

---

## 7. Suppressions & Exceptions in Source Code

### `@ts-ignore` / `@ts-nocheck` / `@ts-expect-error`

| File                                   | Line  | Directive                                                                            |
| -------------------------------------- | ----- | ------------------------------------------------------------------------------------ |
| `src/core/layout/KitSideInspector.tsx` | 17–18 | `// eslint-disable-next-line @typescript-eslint/ban-ts-comment` then `// @ts-ignore` |

One `@ts-ignore` in the entire codebase (suppressing a TS error on an HMR import).

### `eslint-disable` suppressions

**`react-hooks/exhaustive-deps`** — 13 occurrences (all `next-line`)

These suppress the exhaustive-deps warning on `useEffect` and `useCallback` calls where the author intentionally omits deps that would cause infinite loops or unintended re-runs.

| File                                           | Count |
| ---------------------------------------------- | ----- |
| `src/core/layout/FlowEngine.ts`                | 6     |
| `src/core/layout/FlowMaster.tsx`               | 3     |
| `src/core/canvas/PreviewCanvas.tsx`            | 2     |
| `src/core/layout/KitSideExplorer.tsx`          | 1     |
| `src/core/layout/hooks/usePanelDrag.ts`        | 1     |
| `src/features/feedback/panel.tsx`              | 1     |
| `src/shared/utils/useWorkspaceHierarchy.ts` | 1     |

**`react-hooks/set-state-in-effect`** — 5 occurrences

| File                                                    | Scope                             |
| ------------------------------------------------------- | --------------------------------- |
| `src/shared/utils/useJsonBinKeyValidation.ts`           | file-level `/* eslint-disable */` |
| `src/modes/flowlens/useSessionLibrary.ts`               | 2× next-line                      |
| `src/modes/flowlens/components/CursorGhost.tsx`         | 1× next-line                      |
| `src/features/flowTracer/components/SessionInspect.tsx` | 1× next-line                      |
| `src/features/feedback/context/index.tsx`               | 1× next-line                      |

`useJsonBinKeyValidation.ts` is the only file with a **file-level** disable (entire file exempt from the rule).

**`@typescript-eslint/no-explicit-any`** — 17 occurrences

| File                                           | Count                               |
| ---------------------------------------------- | ----------------------------------- |
| `src/shared/contexts/DashboardContext.tsx`     | 7                                   |
| `src/features/flow-library/compileFlowplan.ts` | 5                                   |
| `src/features/flow-debugger/DbInspector.tsx`   | 1                                   |
| `src/shared/utils/applyDotPathPatch.ts`        | 1                                   |
| `src/shared/contexts/ThemeContext.tsx`         | 1                                   |
| `src/shared/components/ui/ContextMenu.tsx`     | 1                                   |
| `src/core/layout/KitSideInspector.tsx`         | 1 (banning the ban-ts-comment rule) |

**`@typescript-eslint/ban-ts-comment`** — 1 occurrence (`KitSideInspector.tsx` line 17, used to allow the `@ts-ignore` on line 18).

---

## 8. Summary of Gaps

| Gap                                                | Severity | Detail                                                                                                                                                                |
| -------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No pre-commit hooks                                | High     | Nothing enforces lint/format before a commit lands. Errors only caught if dev runs `npm run lint` / `npm run build` manually.                                         |
| `noUnusedLocals` / `noUnusedParameters` off in app | Medium   | Dead code in `src/` is not caught by tsc. ESLint's `no-unused-vars` partially covers this but only for vars, not parameters.                                          |
| Architecture boundary rule is `warn` not `error`   | Medium   | Layer violations don't fail CI; they only appear in editor/lint output.                                                                                               |
| No coverage config in Vitest                       | Low      | No minimum coverage threshold; coverage not measured.                                                                                                                 |
| No component/DOM tests                             | Low      | `jsdom` and `playwright` devDependencies exist but are unused in the test config.                                                                                     |
| `react-hooks/exhaustive-deps` suppressed 13×       | Low      | Mostly intentional (stable refs, mount-once effects), but each is a potential stale-closure bug if the surrounding code changes.                                      |
| `no-explicit-any` suppressed 17×                   | Low      | Concentrated in `DashboardContext` (generic db type) and `compileFlowplan` (dynamic step evaluation). Both have structural reasons but could be typed more precisely. |
| Single file-level `eslint-disable`                 | Low      | `useJsonBinKeyValidation.ts` disables `set-state-in-effect` for the whole file — any new code added to that file is silently exempt.                                  |
