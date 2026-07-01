#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const GREEN = '\x1b[32m'
const CYAN = '\x1b[36m'
const DIM = '\x1b[2m'
const RED = '\x1b[31m'

const g = (s) => GREEN + s + RESET
const b = (s) => BOLD + s + RESET
const c = (s) => CYAN + s + RESET
const d = (s) => DIM + s + RESET
const r = (s) => RED + s + RESET

// ── Minimal self-contained prompt helpers ───────────────────────────────────────
// Deliberately not imported from the platform's scripts/lib/prompt.js — this
// package is meant to be installable/publishable on its own, with no
// dependency on the rest of the monorepo at runtime.

function prompt(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

function selectFromList(items) {
  if (!process.stdin.isTTY) {
    return new Promise((resolve) => {
      items.forEach((item, i) => console.log(`  ${d(String(i + 1) + '.')} ${item}`))
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      rl.question(c('? ') + `Select (1-${items.length}): `, (ans) => {
        rl.close()
        const n = parseInt(ans.trim(), 10) - 1
        resolve(items[Math.max(0, Math.min(isNaN(n) ? 0 : n, items.length - 1))])
      })
    })
  }

  return new Promise((resolve) => {
    let idx = 0
    const render = () => {
      process.stdout.write('\x1b[?25l')
      items.forEach((item, i) => {
        const prefix = i === idx ? c('  ❯ ') : '    '
        const text = i === idx ? b(item) : d(item)
        process.stdout.write(`\r${prefix}${text}\n`)
      })
      process.stdout.write(`\x1b[${items.length}A`)
    }
    render()
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    const onData = (key) => {
      if (key === '\x1b[A') {
        idx = (idx - 1 + items.length) % items.length
        render()
      } else if (key === '\x1b[B') {
        idx = (idx + 1) % items.length
        render()
      } else if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdin.removeListener('data', onData)
        process.stdout.write(`\x1b[${items.length}B`)
        process.stdout.write('\x1b[?25h')
        resolve(items[idx])
      } else if (key === '\x03') {
        process.stdout.write('\x1b[?25h')
        process.exit()
      }
    }
    process.stdin.on('data', onData)
  })
}

function parseStringFlag(argv, name) {
  const hit = argv.find((a) => a.startsWith(`--${name}:`))
  return hit ? hit.slice(name.length + 3) : null
}

// ── Available kits ───────────────────────────────────────────────────────────
// Kept as a small static list rather than read from the platform's src/kits/ —
// once this package is published standalone it won't have a sibling src/ tree
// to read from. Mirrors what's currently in src/kits/{shared,standalone}.

const SHARED_KITS = ['apple', 'material', 'neo-brutalism']
const STANDALONE_KITS = ['mobile-wireframe']
const ALL_KIT_SLUGS = [...SHARED_KITS, ...STANDALONE_KITS]

function usage() {
  console.log(`
  ${b('create-flowkit-app')} — scaffold a new FlowKit author project

  ${b('Usage:')}
    npm create flowkit-app@latest ${c('<project-name>')} ${d('[--lang:ts|js] [--kit:<slug>|none]')}
    npx create-flowkit-app ${c('<project-name>')}

  ${b('Example:')}
    npm create flowkit-app@latest my-prototype
    npm create flowkit-app@latest my-prototype -- --lang:js --kit:none

  ${d('flowkit contributors: --local-dev points the generated project at your')}
  ${d('local flowkit checkout instead of the published package. Only works when')}
  ${d('run from inside that checkout — see packages/create-flowkit-app/index.js.')}
`)
  process.exit(0)
}

const args = process.argv.slice(2).filter((a) => a !== '--')
const projectName = args[0]

if (!projectName || projectName === '--help' || projectName === '-h') {
  usage()
}

if (!/^[a-z0-9][a-z0-9._-]*$/.test(projectName)) {
  console.error(r(`✗ Invalid project name: "${projectName}"`))
  console.error(d('  Use lowercase letters, numbers, hyphens, dots, or underscores.'))
  process.exit(1)
}

const targetDir = path.resolve(process.cwd(), projectName)

if (fs.existsSync(targetDir)) {
  console.error(r(`✗ Directory already exists: ${targetDir}`))
  process.exit(1)
}

// The published range for the `flowkit` dependency. Bump this alongside
// flowkit's own package.json "version" when cutting a release — there's no
// automatic way to read that from here once this package is actually
// installed from the registry (it won't have flowkit's monorepo as a sibling
// directory anymore).
const FLOWKIT_PUBLISHED_RANGE = '^1.0.0'

// ── Local-testing escape hatch ───────────────────────────────────────────────
// Pass --local-dev (or set FLOWKIT_LOCAL_DEV=1) to point the generated
// project's flowkit dependency at a local monorepo checkout instead of the
// published range above — for testing this scaffolder against unreleased
// platform changes before a real publish.
//
// Guarded by checking for flowkit's repo-root marker file two directories up:
// the flag/env var alone isn't enough, so a stray env var in someone's shell
// can't accidentally point a real user's scaffold at an unrelated local path
// — it only activates when this script is genuinely running from inside a
// flowkit monorepo checkout (see scripts/lib/paths.js's isRepoMode(), which
// uses the same marker file for the same reason).
const WANTS_LOCAL_DEV = args.includes('--local-dev') || process.env.FLOWKIT_LOCAL_DEV === '1'

function resolveFlowkitDependency() {
  if (!WANTS_LOCAL_DEV) return FLOWKIT_PUBLISHED_RANGE

  const monorepoRoot = path.resolve(__dirname, '..', '..')
  const markerPath = path.join(monorepoRoot, '.flowkit-repo-root')
  if (!fs.existsSync(markerPath)) {
    console.error(r('✗ --local-dev requires this script to run from inside a flowkit monorepo checkout.'))
    console.error(d(`  Expected a repo-root marker at: ${markerPath}`))
    process.exit(1)
  }
  console.log(d(`  --local-dev: flowkit dependency points at local checkout (${monorepoRoot})`))
  return `file:${monorepoRoot}`
}

const FLOWKIT_DEP = resolveFlowkitDependency()

// ── Preferences — language + kit, same flow as `flowkit nw` ────────────────────

async function resolveLanguage() {
  const flag = parseStringFlag(args, 'lang')
  if (flag) {
    const clean = flag.toLowerCase().trim()
    if (clean === 'ts' || clean === 'js') return clean
    console.error(r(`✗ Invalid lang: ${flag}. Supported: ts, js.`))
    process.exit(1)
  }
  console.log(c('? ') + 'Language (↑↓ Enter):')
  const selection = await selectFromList([
    'TypeScript — .tsx / .ts  (recommended)',
    'JavaScript — .jsx / .js',
  ])
  console.log('\n')
  return selection.startsWith('JavaScript') ? 'js' : 'ts'
}

async function resolveKit(language) {
  const flag = parseStringFlag(args, 'kit')
  if (flag) {
    const clean = flag.toLowerCase().trim()
    if (clean === 'none' || ALL_KIT_SLUGS.includes(clean)) return clean
    console.error(r(`✗ Invalid kit: ${flag}. Supported: ${[...ALL_KIT_SLUGS, 'none'].join(', ')}.`))
    process.exit(1)
  }
  const options = [...ALL_KIT_SLUGS.map((k) => `${k}${STANDALONE_KITS.includes(k) ? ' — standalone' : ' — shared kit'}`), 'none — plain tokens, no kit theme']
  console.log(c('? ') + 'Design kit (↑↓ Enter):')
  const selection = await selectFromList(options)
  console.log('\n')
  return selection.split(' —')[0].trim()
}

// ── Copy templates ─────────────────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

// ── Write generated files ──────────────────────────────────────────────────────

function writePackageJson(dir, name, language) {
  const isJs = language === 'js'
  const pkg = {
    name,
    version: '0.0.1',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    devDependencies: {
      flowkit: FLOWKIT_DEP,
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      vite: '^8.0.0',
      '@vitejs/plugin-react': '^6.0.0',
      tailwindcss: '^4.0.0',
      '@tailwindcss/postcss': '^4.0.0',
      ...(isJs
        ? {}
        : {
            typescript: '~6.0.0',
            '@types/react': '^19.0.0',
            '@types/react-dom': '^19.0.0',
          }),
    },
  }
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
}

function writeViteConfig(dir) {
  fs.writeFileSync(
    path.join(dir, 'vite.config.ts'),
    `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { flowkit } from 'flowkit/vite'

export default defineConfig({
  plugins: [react(), flowkit()],
})
`,
  )
}

function writeTsConfig(dir) {
  fs.writeFileSync(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
          skipLibCheck: true,
        },
        include: ['flows', 'flowplans', 'lib', 'flowkit.config.ts', 'vite.config.ts'],
      },
      null,
      2,
    ) + '\n',
  )
}

// NOTE: writeFlowkitConfig/writeFlowplans/write*Screen/writeDb below hand-port
// scripts/lib/scaffold.js's demo content — see that file's comment. Cannot
// import it directly: this package must stay standalone-publishable with zero
// runtime deps on the monorepo (see the standalone-prompt-helpers comment
// above and this package's package.json). If you add/remove a demo screen or
// flow here, update scaffold.js too — scripts/tests/scaffold-consistency.test.js
// checks screen/flow counts match, not exact ids (naming conventions already
// differ: this file omits scaffold.js's -screen/-flow id suffixes).
function writeFlowkitConfig(dir) {
  fs.writeFileSync(
    path.join(dir, 'flowkit.config.ts'),
    `import { defineConfig } from 'flowkit'

export default defineConfig({
  workspace: { name: '${projectName}' },
  flows: ['onboarding', 'home'],
  screenOrder: {
    onboarding: ['welcome', 'setup', 'ready'],
    home: ['home', 'detail'],
  },
})
`,
  )
}

function writeFlowplans(dir) {
  fs.mkdirSync(path.join(dir, 'flowplans'), { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'flowplans', 'onboarding.ts'),
    `import { defineFlow } from 'flowkit'

export default defineFlow({
  id: 'onboarding',
  name: 'Onboarding',
  description: 'Guides the user through welcome, profile setup, and into the app.',
  steps: [
    { screenId: 'welcome', on: 'get-started', actionNote: 'Taps Get Started' },
    { screenId: 'setup', on: 'continue', actionNote: 'Confirms profile and continues' },
    { screenId: 'ready', on: 'go-to-home', actionNote: 'Proceeds to home' },
  ],
})
`,
  )
  fs.writeFileSync(
    path.join(dir, 'flowplans', 'home.ts'),
    `import { defineFlow } from 'flowkit'

export default defineFlow({
  id: 'home',
  name: 'Home',
  description: 'Browse the item list and view a detail page.',
  steps: [
    { screenId: 'home', on: 'item-1', actionNote: 'Taps the first item' },
    { screenId: 'detail', on: 'back', actionNote: 'Goes back to list' },
  ],
})
`,
  )
}

// ── Screens ──────────────────────────────────────────────────────────────────
// Ported from scripts/lib/scaffold.js's repo-mode workspaceScaffold() — same
// flows/screens/content, adapted from the useDashboard() hook (repo mode) to
// the FlowScreenProps convention (flat mode's documented public API).

function screenFile(isJs, typeImport, propsType, body) {
  const header = isJs ? '' : `${typeImport}\n\n`
  return `${header}${body.replace('__PROPS__', isJs ? '' : `: ${propsType}`)}`
}

function writeScreen(dir, flow, id, filename, isJs, content) {
  const screenDir = path.join(dir, 'flows', flow, id)
  fs.mkdirSync(screenDir, { recursive: true })
  fs.writeFileSync(path.join(screenDir, `${filename}.${isJs ? 'jsx' : 'tsx'}`), content)
}

function writeWelcomeScreen(dir, language) {
  const isJs = language === 'js'
  const content = screenFile(
    isJs,
    `import type { FlowScreenProps } from 'flowkit'`,
    'FlowScreenProps',
    `export default function WelcomeScreen({ onAction }__PROPS__) {
  return (
    <div className="flex flex-col h-full bg-theme-base">
      <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6">
        <div className="w-16 h-16 rounded-full bg-theme-blue-dim flex items-center justify-center">
          <span className="text-2xl">👋</span>
        </div>
        <h1 className="text-ui-xl font-bold text-theme-text-primary text-center">
          Welcome to FlowKit
        </h1>
        <p className="text-ui-sm text-theme-text-secondary text-center max-w-xs">
          This project shows how screens read from db, use theme tokens, and wire interactions via
          flowplan steps.
        </p>
      </div>
      <div className="p-4 pb-8">
        <button
          onClick={() => onAction?.('get-started')}
          className="w-full px-3 py-[10px] rounded-[6px] bg-theme-blue-dim text-theme-blue text-ui-sm font-medium"
        >
          Get Started
        </button>
      </div>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const screenMeta = { id: 'welcome', label: 'Welcome Screen' }
`,
  )
  writeScreen(dir, 'onboarding', 'welcome', 'WelcomeScreen', isJs, content)
}

function writeSetupScreen(dir, language) {
  const isJs = language === 'js'
  const content = screenFile(
    isJs,
    `import type { FlowScreenProps } from 'flowkit'`,
    'FlowScreenProps',
    `export default function SetupScreen({ onAction, db }__PROPS__) {
  return (
    <div className="flex flex-col h-full bg-theme-base">
      <div className="flex items-center px-4 h-12 border-b border-theme-border-subtle">
        <span className="text-ui-md font-medium text-theme-text-primary">Your Profile</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-[10px] bg-theme-surface shadow-theme-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-theme-blue-dim flex items-center justify-center text-ui-sm font-bold text-theme-blue">
            {db?.user?.name?.[0] ?? 'U'}
          </div>
          <div>
            <p className="text-ui-sm font-medium text-theme-text-primary">{db?.user?.name ?? 'User'}</p>
            <p className="text-ui-xs text-theme-text-muted">{db?.user?.email ?? ''}</p>
          </div>
        </div>
        <div className="rounded-[10px] bg-theme-surface shadow-theme-card divide-y divide-theme-border-subtle">
          {['Notifications', 'Privacy', 'Display'].map((item) => (
            <div key={item} className="flex items-center justify-between px-3 py-2.5">
              <span className="text-ui-sm text-theme-text-primary">{item}</span>
              <span className="text-ui-xs text-theme-text-muted">›</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto p-4 pb-8">
        <button
          onClick={() => onAction?.('continue')}
          className="w-full px-3 py-[10px] rounded-[6px] bg-theme-blue-dim text-theme-blue text-ui-sm font-medium"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const screenMeta = { id: 'setup', label: 'Setup Screen' }
`,
  )
  writeScreen(dir, 'onboarding', 'setup', 'SetupScreen', isJs, content)
}

function writeReadyScreen(dir, language) {
  const isJs = language === 'js'
  const content = screenFile(
    isJs,
    `import type { FlowScreenProps } from 'flowkit'`,
    'FlowScreenProps',
    `export default function ReadyScreen({ onAction, db }__PROPS__) {
  return (
    <div className="flex flex-col h-full bg-theme-base items-center justify-center gap-6 p-6">
      <div className="w-16 h-16 rounded-full bg-theme-green-dim flex items-center justify-center">
        <span className="text-2xl">✓</span>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-ui-xl font-bold text-theme-text-primary">You're all set</h1>
        <p className="text-ui-sm text-theme-text-secondary">
          {db?.user?.name ?? 'User'}, your project is ready.
        </p>
      </div>
      <button
        onClick={() => onAction?.('go-to-home')}
        className="px-4 py-[10px] rounded-[6px] bg-theme-blue-dim text-theme-blue text-ui-sm font-medium"
      >
        Go to Home
      </button>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const screenMeta = { id: 'ready', label: 'Ready Screen' }
`,
  )
  writeScreen(dir, 'onboarding', 'ready', 'ReadyScreen', isJs, content)
}

function writeHomeScreen(dir, language) {
  const isJs = language === 'js'
  const itemsType = isJs
    ? ''
    : `: Array<{ id: number; title: string; desc: string; status: string }>`
  const content = screenFile(
    isJs,
    `import type { FlowScreenProps } from 'flowkit'`,
    'FlowScreenProps',
    `export default function HomeScreen({ onAction, db }__PROPS__) {
  const items${itemsType} = db?.items ?? []

  return (
    <div className="flex flex-col h-full bg-theme-base">
      <div className="flex items-center justify-between px-4 h-12 border-b border-theme-border-subtle">
        <span className="text-ui-md font-medium text-theme-text-primary">Home</span>
        <span className="text-ui-xs text-theme-text-muted">{items.length} items</span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {items.map((item) => {
          const badgeClass =
            item.status === 'active'
              ? 'bg-theme-green-dim text-theme-green'
              : 'bg-theme-amber-dim text-theme-amber'
          return (
            <div
              key={item.id}
              onClick={() => onAction?.('item-' + item.id)}
              className="rounded-[10px] bg-theme-surface shadow-theme-card p-3 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-ui-sm font-medium text-theme-text-primary truncate">{item.title}</p>
                <p className="text-ui-xs text-theme-text-muted truncate">{item.desc}</p>
              </div>
              <span className={'text-ui-2xs font-bold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-full shrink-0 ' + badgeClass}>
                {item.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const screenMeta = { id: 'home', label: 'Home Screen' }
`,
  )
  writeScreen(dir, 'home', 'home', 'HomeScreen', isJs, content)
}

function writeDetailScreen(dir, language) {
  const isJs = language === 'js'
  const content = screenFile(
    isJs,
    `import type { FlowScreenProps } from 'flowkit'`,
    'FlowScreenProps',
    `export default function DetailScreen({ onAction, db }__PROPS__) {
  const item = db?.items?.[0]
  const badgeClass =
    item?.status === 'active'
      ? 'bg-theme-green-dim text-theme-green'
      : 'bg-theme-amber-dim text-theme-amber'

  return (
    <div className="flex flex-col h-full bg-theme-base">
      <div className="flex items-center gap-2 px-4 h-12 border-b border-theme-border-subtle">
        <button onClick={() => onAction?.('back')} className="text-ui-sm text-theme-blue">
          ← Back
        </button>
        <span className="flex-1 text-center text-ui-sm font-medium text-theme-text-primary">Detail</span>
        <div className="w-12" />
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-[12px] bg-theme-surface shadow-theme-card p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-ui-lg font-bold text-theme-text-primary">{item?.title ?? 'Item'}</h2>
            <span className={'text-ui-2xs font-bold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-full shrink-0 ' + badgeClass}>
              {item?.status}
            </span>
          </div>
          <p className="text-ui-sm text-theme-text-secondary">{item?.desc ?? ''}</p>
          <div className="pt-2 border-t border-theme-border-subtle">
            <p className="text-ui-2xs font-bold uppercase tracking-[0.04em] text-theme-text-muted mb-1">Item ID</p>
            <p className="text-ui-sm text-theme-text-primary">{item?.id ?? '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const screenMeta = { id: 'detail', label: 'Detail Screen' }
`,
  )
  writeScreen(dir, 'home', 'detail', 'DetailScreen', isJs, content)
}

function writeDb(dir) {
  fs.mkdirSync(path.join(dir, 'lib', 'data'), { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'lib', 'data', 'db.ts'),
    `/** Initial mock database state. Mutate freely — these are just plain exports. */
export const user = {
  name: 'Alex',
  email: 'alex@example.com',
}

export const items = [
  { id: 1, title: 'First Item', desc: 'A sample item to demonstrate db reads.', status: 'active' },
  { id: 2, title: 'Second Item', desc: 'Another item showing list rendering.', status: 'pending' },
  { id: 3, title: 'Third Item', desc: 'More items can be added in db.ts.', status: 'active' },
]
`,
  )
}

function writeTokensCss(dir, kit) {
  fs.mkdirSync(path.join(dir, 'lib', 'design-system'), { recursive: true })
  // Direct node_modules path — same precedent already used by index.html's
  // <script src="/node_modules/flowkit/src/main.tsx">. There's no @kit/@platform
  // alias available in a flat-mode project, so this is the established way to
  // reach into the installed engine package's bundled kit assets.
  const kitImport =
    kit === 'none'
      ? ''
      : STANDALONE_KITS.includes(kit)
        ? `@import "/node_modules/flowkit/src/kits/standalone/${kit}/index.css";\n\n`
        : `@import "/node_modules/flowkit/src/kits/shared/tokens/themes/${kit}.css";\n\n`
  const content =
    kit === 'none'
      ? `/* ${projectName} — Design Tokens */\n/* No kit selected — add your own CSS variables here. */\n:root {\n  /* --my-brand: #1a1a2e; */\n}\n`
      : `/* ${projectName} — Design Tokens */\n${kitImport}/* ── Project-level overrides ─────────────────────────────────────────────\n   Override kit variables here to customise the active theme.\n   ────────────────────────────────────────────────────────────────────────── */\n:root {\n}\n`
  fs.writeFileSync(path.join(dir, 'lib', 'design-system', 'tokens.css'), content)
}

function writeClaude(dir) {
  fs.writeFileSync(
    path.join(dir, 'CLAUDE.md'),
    `# ${projectName}

A FlowKit author project. Your work lives in:

- \`flows/\` — Screen components, organized by flow then screen name
- \`flowplans/\` — Playback scripts (sequences of screens with interaction definitions)
- \`lib/\` — Shared data, components, and utilities for this project

## CLI Commands

See \`docs/CLI.md\` for the full command reference.

Common commands:
\`\`\`
flowkit status          # health snapshot
flowkit sessions:ls     # list recorded sessions
flowkit export          # build standalone HTML viewer
\`\`\`

## Rules

- Do **not** edit \`node_modules/flowkit/\` — that is the platform engine.
- Add screens under \`flows/<flow-name>/<screen-id>/\`
- Add flowplan steps in \`flowplans/<flow-name>.ts\`
- All CLI operations go through \`flowkit <command>\`
`,
  )
}

function writePostcssConfig(dir) {
  fs.writeFileSync(
    path.join(dir, 'postcss.config.js'),
    `export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
`,
  )
}

function writeGitignore(dir) {
  fs.writeFileSync(
    path.join(dir, '.gitignore'),
    `node_modules/
dist/
.env.local
`,
  )
}

// ── Copy docs from installed flowkit ──────────────────────────────────────────

function copyDocsFromFlowkit(targetDir) {
  // After npm install, docs live in node_modules/flowkit/docs/
  const docsSource = path.join(targetDir, 'node_modules', 'flowkit', 'docs')
  const docsDest = path.join(targetDir, 'docs')
  if (fs.existsSync(docsSource)) {
    copyDir(docsSource, docsDest)
    return true
  }
  return false
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('')
  console.log(`  ${b('Creating FlowKit project:')} ${c(projectName)}`)
  console.log('')

  const language = await resolveLanguage()
  const kit = await resolveKit(language)

  try {
    fs.mkdirSync(targetDir, { recursive: true })

    // Static, language-agnostic files
    fs.copyFileSync(
      path.join(__dirname, 'templates', 'index.html'),
      path.join(targetDir, 'index.html'),
    )

    // Generated files
    writePackageJson(targetDir, projectName, language)
    writeViteConfig(targetDir)
    if (language === 'ts') writeTsConfig(targetDir)
    writeFlowkitConfig(targetDir)
    writeFlowplans(targetDir)
    writeWelcomeScreen(targetDir, language)
    writeSetupScreen(targetDir, language)
    writeReadyScreen(targetDir, language)
    writeHomeScreen(targetDir, language)
    writeDetailScreen(targetDir, language)
    writeDb(targetDir)
    writeTokensCss(targetDir, kit)
    writePostcssConfig(targetDir)
    writeClaude(targetDir)
    writeGitignore(targetDir)

    console.log(`  ${g('✓')} Scaffolded project files`)
    console.log(
      `  ${g('✓')} Language: ` +
        b(language === 'js' ? 'JavaScript (.jsx / .js)' : 'TypeScript (.tsx / .ts)'),
    )
    console.log(`  ${g('✓')} Kit: ` + b(kit === 'none' ? 'none' : `[${kit}]`))

    // Install dependencies.
    // --install-links only matters for --local-dev's file: dependency: npm's
    // default for a `file:` spec pointing at a directory is to SYMLINK it into
    // node_modules, not copy it. Node's ESM loader resolves import.meta.url
    // through that symlink to its realpath, which erases the node_modules
    // path segment isRepoMode() would otherwise rely on — so a symlinked
    // install gets misdetected as repo mode, pointing every workspace-scoped
    // path at the real monorepo instead of this scaffolded project. Forcing a
    // real copy sidesteps the problem entirely for local testing; it's a
    // no-op for the published range (registry/git installs are already real
    // copies, never symlinks).
    console.log(`  ${d('Installing dependencies (this may take a moment)...')}`)
    execSync(`npm install${WANTS_LOCAL_DEV ? ' --install-links' : ''}`, {
      cwd: targetDir,
      stdio: 'inherit',
    })
    console.log(`  ${g('✓')} Dependencies installed`)

    // Copy docs from installed flowkit
    const docsCopied = copyDocsFromFlowkit(targetDir)
    if (docsCopied) {
      console.log(`  ${g('✓')} Docs copied from flowkit`)
    }

    console.log('')
    console.log(`  ${g('✓')} Done! Get started:`)
    console.log('')
    console.log(`    ${c(`cd ${projectName}`)}`)
    console.log(`    ${c('npm run dev')}`)
    console.log('')
  } catch (err) {
    console.error(r(`\n  ✗ Failed: ${err.message}`))
    // Clean up on failure
    if (fs.existsSync(targetDir)) {
      try {
        fs.rmSync(targetDir, { recursive: true, force: true })
        console.error(d('  Cleaned up partial directory.'))
      } catch {}
    }
    process.exit(1)
  }
}

main()
