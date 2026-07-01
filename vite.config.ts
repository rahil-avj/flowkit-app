import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { defineConfig, Plugin } from 'vite'

import { handleSaveSession } from './scripts/lib/flowlens-session.js'
import { flowkit } from './scripts/vite-plugin.js'

// Read active workspace from src/workspaces.json so -sw changes take effect on next dev restart.
// Returns null when no workspaces exist on disk (all were deleted).
function getActiveWorkspace(): string | null {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, './src/workspaces.json'), 'utf8')
    )
    const name = data.active ?? null
    if (!name) return null
    const wsPath = path.resolve(__dirname, `./workspaces/${name}`)
    return fs.existsSync(wsPath) ? name : null
  } catch {
    return null
  }
}

// Reconciles disk state against workspaces.ts on every dev server start.
// Removes stale entries whose folders are gone, updates tsconfig, and cleans
// up orphaned FlowLens library folders. Disk is the single source of truth.
function reconcileWorkspacesPlugin(): Plugin {
  return {
    name: 'flowkit-reconcile-workspaces',
    buildStart() {
      try {
        const workspacesDir = path.resolve(__dirname, './workspaces')
        const existing = fs.existsSync(workspacesDir)
          ? fs
              .readdirSync(workspacesDir)
              .filter(d => fs.statSync(path.join(workspacesDir, d)).isDirectory())
          : []

        const before = getActiveWorkspace()

        // Delegate write-back to the registry module — it owns the template and tsconfig patch.
        // Spawned as a child process to cross the ESM boundary cleanly.
        execSync(
          `node --input-type=module --eval "import { syncWorkspaceRegistry } from './scripts/lib/registry.js'; syncWorkspaceRegistry();"`,
          { cwd: __dirname, stdio: 'pipe' }
        )

        const after = getActiveWorkspace()

        if (existing.length === 0) {
          console.log('[flowkit] no workspaces found — showing empty state')
        } else if (before !== after) {
          const registered = (() => {
            try {
              const data = JSON.parse(
                fs.readFileSync(path.resolve(__dirname, './src/workspaces.json'), 'utf8')
              )
              return (data.workspaces ?? []).map((w: { name: string }) => w.name)
            } catch {
              return []
            }
          })()
          const removed = existing.filter(d => !registered.includes(d))
          if (removed.length) {
            console.log(`[flowkit] reconciled workspaces.json — removed: ${removed.join(', ')}`)
          }
        }
      } catch {
        // Non-fatal — reconciliation failure should never block the dev server
      }
    },
  }
}

function flowLensSaveSessionPlugin(): Plugin {
  return {
    name: 'flowkit-flowlens-save-session',
    configureServer(server) {
      server.middlewares.use('/__flowlens/save-session', (req, res) => {
        // Flat mode: sessions go under CWD/lib/flowLens (no workspaces/ dir)
        let flowLensDir: string
        let ws: string | undefined
        if (isSingleWorkspace) {
          flowLensDir = path.resolve(__dirname, 'lib', 'flowLens')
        } else {
          const workspacesJson = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, './src/workspaces.json'), 'utf8')
          )
          ws = workspacesJson.active
          if (!ws) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'No active workspace' }))
            return
          }
          flowLensDir = path.resolve(__dirname, `./workspaces/${ws}/lib/flowLens`)
        }
        return handleSaveSession(req, res, flowLensDir, ws ? { workspace: ws } : {})
      })
    },
  }
}

// VITE_SINGLE_WORKSPACE=true is injected by the flowkit/vite plugin in author (flat) mode.
// reconcileWorkspacesPlugin writes to src/workspaces.json — must never run in flat mode
// because that file lives inside node_modules/flowkit/ and is read-only.
const isSingleWorkspace = process.env.VITE_SINGLE_WORKSPACE === 'true'

// Active workspace dir for the flowkit plugin in repo mode.
// The plugin generates virtual:flowkit/* modules from this workspace's files.
const activeWsDir = (() => {
  const ws = getActiveWorkspace()
  return ws ? `./workspaces/${ws}` : null
})()

export default defineConfig({
  plugins: [
    react(),
    ...(isSingleWorkspace ? [] : [reconcileWorkspacesPlugin()]),
    flowLensSaveSessionPlugin(),
    ...(activeWsDir ? [flowkit({ workspaceRoot: activeWsDir })] : []),
  ],
  server: {
    // Allows tunneling localhost to a phone (localtunnel / cloudflared quick tunnels)
    // without sharing a network. Scoped to these two tunnel domains, not a wildcard host bypass.
    allowedHosts: ['.loca.lt', '.trycloudflare.com'],
  },
  resolve: {
    alias: {
      '@platform': path.resolve(__dirname, './src'),
      // @workspace resolves to the active workspace so screen files can import
      // @workspace/components/*, @workspace/design-system/tokens.css etc.
      // Db/simulator are loaded via import.meta.glob in workspaceModules.ts
      // and don't use this alias — but component imports do.
      '@workspace': (() => {
        const ws = getActiveWorkspace()
        return ws
          ? path.resolve(__dirname, `./workspaces/${ws}`)
          : path.resolve(__dirname, './src/workspace-stub')
      })(),
      flowkit: path.resolve(__dirname, './src/core/config/index.ts'),
      '@kit': path.resolve(__dirname, './src/kits/shared'),
      '@core': path.resolve(__dirname, './src/core'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@flowlens': path.resolve(__dirname, './src/modes/flowlens'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === 'INEFFECTIVE_DYNAMIC_IMPORT') return
        defaultHandler(warning)
      },
    },
  },
  // FlowLens is now a lazily-loaded MODE inside the main app (gated by
  // VITE_ENABLE_FLOWLENS), not a separate entry point. The single index.html
  // entry is the default, so no rollupOptions.input override is needed.
})
