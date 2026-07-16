#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { execSync } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Kept as a local literal, not imported from scripts/helpers/config-filenames.js
// — this package must stay independently publishable with zero runtime deps on
// the monorepo (see the standalone-prompt-helpers comment below). If flowkit's
// own WORKSPACE_CONFIG_FILENAME ever changes again, update this too.
const WORKSPACE_CONFIG_FILENAME = 'workspace.ts'

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const GREEN = '\x1b[32m'
const CYAN = '\x1b[36m'
const DIM = '\x1b[2m'
const RED = '\x1b[31m'

const g = s => GREEN + s + RESET
const b = s => BOLD + s + RESET
const c = s => CYAN + s + RESET
const d = s => DIM + s + RESET
const r = s => RED + s + RESET

// ── Minimal self-contained prompt helpers ───────────────────────────────────────
// Deliberately not imported from the platform's scripts/lib/prompt.js — this
// package is meant to be installable/publishable on its own, with no
// dependency on the rest of the monorepo at runtime.

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve))
}

function selectFromList(items) {
  if (!process.stdin.isTTY) {
    return new Promise(resolve => {
      items.forEach((item, i) => console.log(`  ${d(String(i + 1) + '.')} ${item}`))
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      rl.question(c('? ') + `Select (1-${items.length}): `, ans => {
        rl.close()
        const n = parseInt(ans.trim(), 10) - 1
        resolve(items[Math.max(0, Math.min(isNaN(n) ? 0 : n, items.length - 1))])
      })
    })
  }

  return new Promise(resolve => {
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
    const onData = key => {
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
  const hit = argv.find(a => a.startsWith(`--${name}:`))
  return hit ? hit.slice(name.length + 3) : null
}

function usage() {
  console.log(`
  ${b('create-flowkit-app')} — scaffold a new FlowKit author project

  ${b('Usage:')}
    npm create flowkit-app@latest ${c('<project-name>')} ${d('[--lang:ts|js]')}
    npx create-flowkit-app ${c('<project-name>')}

  ${b('Example:')}
    npm create flowkit-app@latest my-prototype
    npm create flowkit-app@latest my-prototype -- --lang:js

  ${d('flowkit contributors: --local-dev points the generated project at your')}
  ${d('local flowkit checkout instead of the published package. Only works when')}
  ${d('run from inside that checkout — see packages/create-flowkit-app/index.js.')}
`)
  process.exit(0)
}

const args = process.argv.slice(2).filter(a => a !== '--')
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
const FLOWKIT_PUBLISHED_RANGE = '0.0.1-beta.0'

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
    console.error(
      r('✗ --local-dev requires this script to run from inside a flowkit monorepo checkout.')
    )
    console.error(d(`  Expected a repo-root marker at: ${markerPath}`))
    process.exit(1)
  }
  console.log(d(`  --local-dev: flowkit dependency points at local checkout (${monorepoRoot})`))
  return `file:${monorepoRoot}`
}

const FLOWKIT_DEP = resolveFlowkitDependency()

// ── Preferences — language, same flow as `flowkit nw` ──────────────────────────

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
  build: {
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        // Screens are both statically listed (for eager type-checking) and
        // dynamically imported (for code-splitting) by the virtual:flowkit/screens
        // module flowkit/vite generates — harmless by design, not a real issue.
        if (warning.code === 'INEFFECTIVE_DYNAMIC_IMPORT') return
        defaultHandler(warning)
      },
    },
  },
})
`
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
        include: ['flows', 'flowplans', 'lib', WORKSPACE_CONFIG_FILENAME, 'vite.config.ts'],
      },
      null,
      2
    ) + '\n'
  )
}

// writeWorkspaceContent (config/flowplans/screens/db/tokens) lives in
// ./lib/workspace-template.js, shared with create-flowkit-workspace. That
// module in turn hand-ports scripts/helpers/scaffold.js's demo content — see
// its top comment. Cannot import scaffold.js directly: both scaffolder
// packages must stay standalone-publishable with zero runtime deps on the
// monorepo (see the standalone-prompt-helpers comment above and this
// package's package.json).

function writeClaude(dir) {
  fs.writeFileSync(
    path.join(dir, 'CLAUDE.md'),
    `# ${projectName}

A FlowKit author project. Your work lives in:

- \`flows/\` — Screen components, organized by flow then screen name
- \`flowplans/\` — Playback scripts (sequences of screens with interaction definitions)
- \`lib/\` — Shared data, components, and utilities for this project

No UI kit is pre-installed — \`lib/design-system/tokens.css\` starts empty. See "First session" below.

## Workspaces

This project is in **flat mode** — the project root is the one implicit workspace, no
\`workspaces/\` folder. If you need more than one independent workspace (separate
flows/screens/lib per app or client), convert to multi-workspace mode:

- \`npx flowkit convert:multi\` — split this project into multiple sibling workspace folders
- After converting: \`npx flowkit create:workspace <name>\` / \`remove:workspace <name>\` /
  \`rename:workspace <old> <new>\` manage workspaces; \`npx flowkit convert:flat\` collapses back

## CLI Commands

See \`docs/CLI.md\` for the full command reference.

Common commands:
\`\`\`
npx flowkit status          # health snapshot
npx flowkit sessions:ls     # list recorded sessions
npx flowkit export          # build standalone HTML viewer
\`\`\`

## Rules

- Do **not** edit \`node_modules/flowkit/\` — that is the platform engine.
- Add screens under \`flows/<flow-name>/<screen-id>/\`
- Add flowplan steps in \`flowplans/<flow-name>.ts\`
- All CLI operations go through \`flowkit <command>\` — invoke it as \`npx flowkit <command>\`
  unless you've confirmed (\`which flowkit\`) it was installed globally during setup; don't
  assume a bare \`flowkit\` resolves.

## First session — onboarding

If this is the first time you (the agent) are opening this project, introduce
yourself as **Flowaid** — the FlowKit-native assistant for this project, not a
generic coding agent — and run this short interview before writing any code.
Keep it conversational, one or two questions at a time, not a form dump.

1. **Name.** Ask what to call them. Use their name for the rest of the
   session — this is a collaboration, not a prompt terminal.
2. **Experience level.** Are they a developer, a designer who codes a little,
   or non-technical (founder/PM/etc. testing an idea)? This sets how much you
   explain vs. just do. Don't ask it clinically — something like "so I pitch
   this right: are you more comfortable in the code, or would you rather I
   just handle that side?"
3. **What they're building.** A quick prototype for a pitch/demo, a client
   deliverable, a personal project, something else? Shapes how much you
   optimize for speed vs. polish.
4. **Working style.** Do they want you to check in before changes, or move
   fast and explain after the fact? Set your autonomy level for the rest of
   the session based on the answer — don't re-ask this every time.
5. **Look and feel.** There's no pre-installed component kit or design
   system — ask in plain language what they're going for ("clean and
   minimal", "playful", "enterprise/dashboard-y", or a reference link/screenshot
   if they have one). Based on the answer, YOU decide and set up the actual
   approach (e.g. plain Tailwind utility classes, shadcn/ui components, some
   other library) — don't make them pick a library by name unless they bring
   it up themselves.

Once you have these answers, act on them immediately — set up
\`lib/design-system/tokens.css\` and whatever component approach fits, then
get to the actual flows/screens. Don't re-run this interview later in the
project; refer back to what you learned instead.
`
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
`
  )
}

function writeGitignore(dir) {
  fs.writeFileSync(
    path.join(dir, '.gitignore'),
    `node_modules/
dist/
.env.local
.flowkit-export-*.mjs
`
  )
}

function writeReadme(dir, name) {
  fs.writeFileSync(
    path.join(dir, 'README.md'),
    `# ${name}

A [FlowKit](https://github.com/rahil-avj/flowkit-app) author project.

## Getting started

\`\`\`bash
npm run dev      # start the dev server
npm run build    # production build
\`\`\`

## Project layout

- \`flows/\` — screen components, organized by flow then screen name
- \`flowplans/\` — playback scripts (sequences of screens with interaction definitions)
- \`lib/\` — shared data, components, and utilities
- \`${WORKSPACE_CONFIG_FILENAME}\` — flow and screen registration

See \`docs/CLI.md\` for the full \`flowkit\` CLI command reference, and \`CLAUDE.md\`
if you're working with an AI coding agent on this project.

## Running CLI commands

If you chose to install flowkit globally during setup, \`flowkit <command>\` works
bare (e.g. \`flowkit export\`). Otherwise, run it through npx: \`npx flowkit export\`.
`
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

// ── Optional global install ─────────────────────────────────────────────────
// Bare `flowkit <command>` only resolves in a shell when something puts it on
// PATH. A local devDependency alone doesn't do that (only `npm run <script>`
// or `npx flowkit` reach node_modules/.bin) — the only way to get a literal
// bare `flowkit` is a global install, which mutates state outside this
// project and is shared across every project on the machine. Never do that
// without asking; never assume yes in non-interactive/CI contexts.
async function offerGlobalInstall() {
  if (!process.stdin.isTTY) {
    console.log(d('  Skipping global install prompt (non-interactive).'))
    return false
  }
  const globalSpec = WANTS_LOCAL_DEV ? FLOWKIT_DEP : 'flowkit'
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await prompt(
    rl,
    c('? ') +
      `Install flowkit globally so you can run bare \`flowkit <command>\` here? (y/N) `
  )
  rl.close()
  if (!/^y(es)?$/i.test(answer.trim())) return false

  try {
    console.log(d(`  Installing flowkit globally (npm install -g ${globalSpec})...`))
    execSync(`npm install -g ${globalSpec}`, { stdio: 'inherit' })
    console.log(`  ${g('✓')} flowkit installed globally — \`flowkit <command>\` now works bare.`)
    return true
  } catch (err) {
    console.error(r(`  ✗ Global install failed: ${err.message}`))
    return false
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('')
  console.log(`  ${b('Creating FlowKit project:')} ${c(projectName)}`)
  console.log('')

  const language = await resolveLanguage()

  try {
    fs.mkdirSync(targetDir, { recursive: true })

    // Static, language-agnostic files
    fs.copyFileSync(
      path.join(__dirname, 'templates', 'index.html'),
      path.join(targetDir, 'index.html')
    )

    // Generated files that don't need flowkit installed yet.
    writePackageJson(targetDir, projectName, language)
    writeViteConfig(targetDir)
    if (language === 'ts') writeTsConfig(targetDir)
    writePostcssConfig(targetDir)
    writeClaude(targetDir)
    writeGitignore(targetDir)
    writeReadme(targetDir, projectName)

    console.log(`  ${g('✓')} Scaffolded project files`)
    console.log(
      `  ${g('✓')} Language: ` +
        b(language === 'js' ? 'JavaScript (.jsx / .js)' : 'TypeScript (.tsx / .ts)')
    )
    // Install dependencies BEFORE writing workspace content: the demo
    // screens/flowplans/config are generated by writeWorkspaceContent(),
    // which lives in flowkit itself (scripts/helpers/workspace-template.js —
    // the one shared source of truth also used by create-flowkit-workspace
    // and this repo's own `flowkit create:workspace` command) and is only
    // resolvable from node_modules/flowkit once installed. This package
    // can't depend on the monorepo directly (see the standalone-prompt-
    // helpers comment above) — it reaches the shared template through its
    // own `flowkit` devDependency instead, same as any consumer's project
    // importing from `flowkit` at runtime.
    //
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

    const templateUrl = pathToFileURL(
      path.join(targetDir, 'node_modules', 'flowkit', 'scripts', 'helpers', 'workspace-template.js')
    ).href
    const { writeWorkspaceContent } = await import(templateUrl)
    writeWorkspaceContent(targetDir, projectName, language)
    console.log(`  ${g('✓')} Workspace content generated`)

    // Copy docs from installed flowkit
    const docsCopied = copyDocsFromFlowkit(targetDir)
    if (docsCopied) {
      console.log(`  ${g('✓')} Docs copied from flowkit`)
    }

    console.log('')
    const gotGlobal = await offerGlobalInstall()

    console.log('')
    console.log(`  ${g('✓')} Done! Get started:`)
    console.log('')
    console.log(`    ${c(`cd ${projectName}`)}`)
    console.log(`    ${c('npm run dev')}`)
    console.log('')
    if (gotGlobal) {
      console.log(`  ${d('flowkit is installed globally — run any command bare, e.g.:')}`)
      console.log(`    ${c('flowkit export')}`)
    } else {
      console.log(`  ${d('flowkit was installed locally only. Run CLI commands via npx, e.g.:')}`)
      console.log(`    ${c('npx flowkit export')}`)
      console.log(
        d('  (AI agents working in this project: use `npx flowkit <command>`, not a bare `flowkit`.)')
      )
    }
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
