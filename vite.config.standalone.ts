import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

import { flowkit } from './scripts/helpers/vite-plugin.js'

const workspace = process.env.FLOWKIT_WORKSPACE
if (!workspace) throw new Error('FLOWKIT_WORKSPACE env var is required for standalone build.')

export default defineConfig({
  // flowkit() supplies virtual:flowkit/* (config/pages/flowStories/workspace) —
  // needed by src/modes/flowlens/useSessionLibrary.ts's virtual:flowkit/workspace
  // import, same mechanism this repo's own vite.config.ts already uses for the
  // dev server. standalone defaults to false since @flowkit/@workspace/@flowkit-kit
  // aliases are already supplied below, same pattern as vite.config.ts.
  plugins: [react(), flowkit({ workspaceRoot: `./workspaces/${workspace}` }), viteSingleFile()],
  resolve: {
    alias: {
      '@flowkit': path.resolve(__dirname, 'src'),
      '@workspace': path.resolve(__dirname, `workspaces/${workspace}`),
      '@flowkit-kit': path.resolve(__dirname, 'src/kits/shared'),
    },
  },
  build: {
    // Overridable so run-export.js can honor an export profile's exportPath —
    // defaults to the same dist-standalone/ this file has always used.
    outDir: process.env.FLOWKIT_EXPORT_OUTDIR ?? 'dist-standalone',
    emptyOutDir: false,
    cssCodeSplit: false,
  },
})
