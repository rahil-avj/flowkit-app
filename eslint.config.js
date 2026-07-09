import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import boundaries from 'eslint-plugin-boundaries'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tailwindcss from 'eslint-plugin-tailwindcss'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  // packages/** are scaffold templates copied into author projects at runtime —
  // not part of this app's own TypeScript project (see tsconfig.app.json's
  // include: ["src", "workspaces"]) and not subject to this repo's lint rules.
  { ignores: ['dist', 'coverage', 'packages', 'testspace', 'test'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
      'simple-import-sort': simpleImportSort,
      tailwindcss,
    },
    settings: {
      tailwindcss: {
        cssConfigPath: 'src/index.css',
      },
      'boundaries/elements': [
        { type: 'shared', pattern: 'src/shared/**/*' },
        { type: 'core', pattern: 'src/core/**/*' },
        { type: 'features', pattern: 'src/features/**/*' },
        { type: 'modes', pattern: 'src/modes/**/*' },
        { type: 'app', pattern: 'src/App.tsx' },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // ── Architecture boundary rules ──────────────────────────────────────────
      // shared  → nothing above it (foundation layer)
      // core    → shared only
      // features→ shared + core
      // modes   → anything (top layer, full-canvas overrides)
      // app     → anything (entry point)
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'tailwindcss/no-unnecessary-arbitrary-value': 'warn',
      'tailwindcss/enforces-shorthand': 'off',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: { type: 'shared' }, allow: { to: { type: ['shared'] } } },
            { from: { type: 'core' }, allow: { to: { type: ['shared', 'core'] } } },
            { from: { type: 'features' }, allow: { to: { type: ['shared', 'core', 'features'] } } },
            {
              from: { type: 'modes' },
              allow: { to: { type: ['shared', 'core', 'features', 'modes'] } },
            },
            {
              from: { type: 'app' },
              allow: { to: { type: ['shared', 'core', 'features', 'modes'] } },
            },
          ],
        },
      ],
    },
  },
  prettier
)
