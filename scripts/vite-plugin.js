/**
 * flowkit/vite — Vite plugin for FlowKit author projects.
 *
 * Generates virtual modules that replace all import.meta.glob patterns
 * which hardcode workspaces/<name>/... paths. In flat-layout author projects
 * the workspaces/ directory does not exist — the plugin reconstructs the same
 * data from flowkit.config.ts + direct filesystem globs from CWD.
 *
 * Virtual modules produced:
 *   virtual:flowkit/config      — parsed FlowkitConfig object
 *   virtual:flowkit/screens     — lazy screen import map
 *   virtual:flowkit/flowplans   — eager flowplan import map
 *   virtual:flowkit/workspace   — db, simulator, tokens, logos, tags, sessions
 */

import esbuild from 'esbuild'
import fs from 'fs'
import { glob } from 'fs/promises'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

import { handleSaveSession } from './lib/flowlens-session.js'

// src/ directory of the flowkit package — resolved relative to this plugin file.
// In flat mode (author project) all @platform/* aliases point here.
const ENGINE_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')

// ── Config reader ──────────────────────────────────────────────────────────────

async function readFlowkitConfig(cwd) {
  const configPath = path.join(cwd, 'flowkit.config.ts')
  if (!fs.existsSync(configPath)) return {}

  // Provide a shim for 'flowkit' so esbuild can bundle it inline.
  // The real package may not be resolvable from /tmp (repo mode) or may not be
  // installed yet (scaffold time). Identity functions are all the config file uses.
  const shimFile = path.join(os.tmpdir(), 'flowkit-shim.mjs')
  if (!fs.existsSync(shimFile)) {
    fs.writeFileSync(
      shimFile,
      `export const defineConfig = c => c\n` +
        `export const defineFlow = f => f\n` +
        `export const tag = (label, opts) => ({ label, ...opts })\n`
    )
  }

  const hash = configPath.replace(/[^a-z0-9]/gi, '_').slice(-40)
  const outfile = path.join(os.tmpdir(), `flowkit-config-${hash}.mjs`)
  await esbuild.build({
    entryPoints: [configPath],
    bundle: true,
    format: 'esm',
    outfile,
    alias: { flowkit: shimFile },
    external: ['react', 'react-dom'],
    logLevel: 'silent',
  })
  const fileUrl = `file://${outfile}?t=${Date.now()}`
  const mod = await import(fileUrl)
  return mod.default ?? mod
}

// ── Glob helpers ───────────────────────────────────────────────────────────────

async function globFiles(pattern, cwd) {
  const results = []
  try {
    for await (const f of glob(pattern, { cwd })) {
      results.push(f)
    }
  } catch {}
  return results
}

// ── Virtual module IDs ─────────────────────────────────────────────────────────

const VIRTUALS = {
  config: 'virtual:flowkit/config',
  screens: 'virtual:flowkit/screens',
  flowplans: 'virtual:flowkit/flowplans',
  workspace: 'virtual:flowkit/workspace',
}

function resolve(id) {
  if (Object.values(VIRTUALS).includes(id)) return '\0' + id
}

// ── Code generators ────────────────────────────────────────────────────────────

function genConfig(config) {
  return `export const config = ${JSON.stringify(config, null, 2)}`
}

async function genScreens(config, cwd) {
  const screenOrder = config.screenOrder ?? {}
  const flows = config.flows ?? Object.keys(screenOrder)

  // Collect structured screen entries
  const entries = [] // { key, flow, screenId, abs }

  for (const flow of flows) {
    const order = screenOrder[flow] ?? []
    const found = await globFiles(`flows/${flow}/**/*.tsx`, cwd)
    const sorted = [
      ...order
        .map(s => found.find(f => f.includes(`/${s}/`) || f.includes(`\\${s}\\`)))
        .filter(Boolean),
      ...found.filter(f => !order.some(s => f.includes(`/${s}/`) || f.includes(`\\${s}\\`))),
    ]
    for (const rel of sorted) {
      const abs = path.resolve(cwd, rel)
      const screenId = path.basename(path.dirname(abs))
      const key = `${flow}/${screenId}`
      entries.push({ key, flow, screenId, abs })
    }
  }

  const loaderLines = entries.map(
    e => `  ${JSON.stringify(e.key)}: () => import(${JSON.stringify(e.abs)})`
  )
  const metaImports = entries.map(
    (e, i) => `import { screenMeta as _meta${i} } from ${JSON.stringify(e.abs)}`
  )
  const metaLines = entries.map((e, i) => `  ${JSON.stringify(e.key)}: _meta${i}`)
  const listLines = entries.map(
    e =>
      `  { key: ${JSON.stringify(e.key)}, flow: ${JSON.stringify(e.flow)}, screenId: ${JSON.stringify(e.screenId)}, loader: screens[${JSON.stringify(e.key)}] }`
  )

  return `import { lazy } from 'react'
${metaImports.join('\n')}

export const screens = {
${loaderLines.join(',\n')}
}

export const lazyScreens = Object.fromEntries(
  Object.entries(screens).map(([k, loader]) => [k, lazy(loader)])
)

export const screenMeta = {
${metaLines.join(',\n')}
}

export const screenList = [
${listLines.join(',\n')}
]`
}

async function genFlowplans(cwd) {
  const files = await globFiles('flowplans/*.ts', cwd)
  const lines = files.map((rel, i) => {
    const abs = path.resolve(cwd, rel)
    return `import _fp${i} from ${JSON.stringify(abs)}\nexports.push(_fp${i})`
  })
  return `const exports = []
${lines.join('\n')}
export const flowplans = exports`
}

async function genWorkspace(config, cwd) {
  const name = config.workspace?.name ?? path.basename(cwd)

  // db
  const dbCandidates = ['lib/data/db.ts', 'lib/data/db.js', 'data/db.ts', 'data/db.js']
  const dbFile = dbCandidates.map(p => path.join(cwd, p)).find(p => fs.existsSync(p))

  // simulator
  const simCandidates = [
    'lib/data/simulator.tsx',
    'lib/data/simulator.jsx',
    'data/simulator.tsx',
    'data/simulator.jsx',
  ]
  const simFile = simCandidates.map(p => path.join(cwd, p)).find(p => fs.existsSync(p))

  // tokens css
  const tokenCandidates = ['lib/design-system/tokens.css', 'design-system/tokens.css']
  const tokenFile = tokenCandidates.map(p => path.join(cwd, p)).find(p => fs.existsSync(p))

  // logo
  const logoExts = ['svg', 'png', 'jpg', 'jpeg', 'webp']
  const logoFile = logoExts
    .map(e => path.join(cwd, `lib/assets/logo.${e}`))
    .find(p => fs.existsSync(p))

  // tags
  const tagsFiles = await globFiles('flows/**/_tags.ts', cwd)

  // sessions
  const sessionFiles = await globFiles('lib/flowLens/sessions/**/*.json', cwd)

  const parts = []

  parts.push(`export const workspaceName = ${JSON.stringify(name)}`)

  if (dbFile) {
    // db.ts uses named exports (no default) — import all and re-export as one object
    parts.push(
      `import * as _dbAll from ${JSON.stringify(dbFile)}\n` +
        `const { default: _dbDefault, ..._dbNamed } = _dbAll\n` +
        `export const db = Object.keys(_dbNamed).length ? _dbNamed : (_dbDefault ?? {})`
    )
  } else {
    parts.push(`export const db = {}`)
  }

  if (simFile) {
    parts.push(`export const loadSimulator = () => import(${JSON.stringify(simFile)})`)
  } else {
    parts.push(`export const loadSimulator = null`)
  }

  if (tokenFile) {
    // Declared as () => Promise<string> in vite-env.d.ts — a ?inline CSS import
    // resolves to a module namespace object ({ default: "css text" }), so unwrap
    // .default here rather than leaking the object to every caller.
    parts.push(
      `export const loadTokens = () => import(${JSON.stringify(tokenFile + '?inline')}).then(m => m.default)`
    )
  } else {
    parts.push(`export const loadTokens = null`)
  }

  if (logoFile) {
    parts.push(`import _logo from ${JSON.stringify(logoFile + '?url')}\nexport const logo = _logo`)
  } else {
    parts.push(`export const logo = null`)
  }

  if (tagsFiles.length) {
    const tagImports = tagsFiles.map((f, i) => {
      const abs = path.resolve(cwd, f)
      // derive flow name from path
      const flow = f.split(/[/\\]/)[1]
      return `import _tags${i} from ${JSON.stringify(abs)}\ntags[${JSON.stringify(flow)}] = _tags${i}`
    })
    parts.push(`const tags = {}\n${tagImports.join('\n')}\nexport { tags }`)
  } else {
    parts.push(`export const tags = {}`)
  }

  if (sessionFiles.length) {
    const sessionImports = sessionFiles.map((f, i) => {
      const abs = path.resolve(cwd, f)
      return `import _sess${i} from ${JSON.stringify(abs)}\nsessions[${JSON.stringify(abs)}] = _sess${i}`
    })
    parts.push(`const sessions = {}\n${sessionImports.join('\n')}\nexport { sessions }`)
  } else {
    parts.push(`export const sessions = {}`)
  }

  return parts.join('\n\n')
}

// ── Plugin ─────────────────────────────────────────────────────────────────────

export function flowkit(options = {}) {
  const cwd = options.workspaceRoot
    ? path.resolve(process.cwd(), options.workspaceRoot)
    : process.cwd()
  let config = {}
  // Cache generated virtual module source; cleared on relevant file changes
  const cache = new Map()

  async function getConfig() {
    if (!cache.has('config-obj')) {
      cache.set('config-obj', await readFlowkitConfig(cwd))
    }
    return cache.get('config-obj')
  }

  async function generateVirtual(id) {
    const cacheKey = id
    if (cache.has(cacheKey)) return cache.get(cacheKey)

    const cfg = await getConfig()
    let code

    if (id === VIRTUALS.config) {
      code = genConfig(cfg)
    } else if (id === VIRTUALS.screens) {
      code = await genScreens(cfg, cwd)
    } else if (id === VIRTUALS.flowplans) {
      code = await genFlowplans(cwd)
    } else if (id === VIRTUALS.workspace) {
      code = await genWorkspace(cfg, cwd)
    }

    if (code) cache.set(cacheKey, code)
    return code
  }

  function invalidate(server) {
    cache.clear()
    for (const virtual of Object.values(VIRTUALS)) {
      const mod = server.moduleGraph.getModuleById('\0' + virtual)
      if (mod) server.moduleGraph.invalidateModule(mod)
    }
  }

  return {
    name: 'flowkit',

    config() {
      // In flat mode, engine source lives in node_modules/flowkit/src (or a symlink
      // to it). Point all @platform/* aliases at the logical symlink path so that
      // react/react-dom resolve from the author project's node_modules rather than
      // the symlink target's directory. preserveSymlinks: true enforces this.
      const engineSrc = options.workspaceRoot
        ? ENGINE_SRC
        : path.join(cwd, 'node_modules/flowkit/src')
      const flatAliases = options.workspaceRoot
        ? {}
        : {
            '@platform': engineSrc,
            '@core': path.join(engineSrc, 'core'),
            '@features': path.join(engineSrc, 'features'),
            '@shared': path.join(engineSrc, 'shared'),
            '@flowlens': path.join(engineSrc, 'modes/flowlens'),
            '@kit': path.join(engineSrc, 'kits/shared'),
            flowkit: path.join(engineSrc, 'core/config/index.ts'),
          }
      return {
        define: options.workspaceRoot
          ? {}
          : { 'import.meta.env.VITE_SINGLE_WORKSPACE': JSON.stringify('true') },
        resolve: {
          alias: { '@workspace': cwd, ...flatAliases },
          dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
          // Keep symlink identity intact so react/react-dom resolve from the
          // author project's node_modules, not the symlink target's directory.
          preserveSymlinks: !options.workspaceRoot,
        },
        optimizeDeps: {
          // Do not pre-bundle flowkit or any of its internal alias paths.
          // Pre-bundling causes dual module instances: App.tsx loads FeedbackContext
          // via a relative path (raw ESM) while KitSideInspector loads via @platform
          // alias (pre-bundled chunk) → two createContext() calls → Provider/hook mismatch.
          exclude: options.workspaceRoot
            ? []
            : ['flowkit', '@platform', '@core', '@features', '@shared', '@kit', '@flowlens'],
        },
        server: {
          fs: {
            // cwd = the author project root (flat mode) or active workspace dir
            // (repo mode) — the author/dev's own files.
            // dirname(ENGINE_SRC) = wherever flowkit's own source physically
            // lives: node_modules/flowkit (flat mode) or this repo's own root
            // (repo mode, since ENGINE_SRC is computed from this plugin
            // file's own location — see top of file). In repo mode this MUST
            // resolve to the real repo root, not the workspace subdirectory,
            // or Vite can't serve the root index.html once a workspace is
            // active (server.fs.allow narrows away from it → 403).
            allow: [cwd, path.dirname(ENGINE_SRC)],
          },
        },
      }
    },

    resolveId(id) {
      return resolve(id)
    },

    async load(id) {
      if (!id.startsWith('\0virtual:flowkit/')) return
      const virtual = id.slice(1) // strip leading \0
      return generateVirtual(virtual)
    },

    configureServer(server) {
      // Watch author project files — invalidate virtuals on any change
      const watchDirs = [
        path.join(cwd, 'flows'),
        path.join(cwd, 'flowplans'),
        path.join(cwd, 'lib'),
        path.join(cwd, 'flowkit.config.ts'),
      ]
      server.watcher.add(watchDirs)

      server.watcher.on('all', (event, file) => {
        const isRelevant = watchDirs.some(d => file.startsWith(d))
        if (isRelevant) invalidate(server)
      })

      // FlowLens session recording — repo mode has its own copy of this same
      // middleware in vite.config.ts (workspace-scoped, since a repo-mode dev
      // server can have many workspaces). This is the flat-mode equivalent:
      // one author project == one implicit workspace, so everything is
      // relative to cwd. Author projects only ever load this plugin, never
      // this repo's own vite.config.ts, so without this flat-mode sessions
      // had no way to be saved at all.
      server.middlewares.use('/__flowlens/save-session', (req, res) =>
        handleSaveSession(req, res, path.join(cwd, 'lib', 'flowLens'))
      )
    },

    async handleHotUpdate({ file, server }) {
      const watchDirs = [
        path.join(cwd, 'flows'),
        path.join(cwd, 'flowplans'),
        path.join(cwd, 'lib'),
      ]
      const isRelevant =
        file === path.join(cwd, 'flowkit.config.ts') || watchDirs.some(d => file.startsWith(d))

      if (isRelevant) {
        invalidate(server)
        // Force full reload so virtual module consumers re-execute
        server.ws.send({ type: 'full-reload' })
        return []
      }
    },
  }
}
