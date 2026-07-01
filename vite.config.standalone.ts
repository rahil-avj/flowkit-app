import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const workspace = process.env.FLOWKIT_WORKSPACE
if (!workspace) throw new Error('FLOWKIT_WORKSPACE env var is required for standalone build.')

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      '@platform': path.resolve(__dirname, 'src'),
      '@workspace': path.resolve(__dirname, `workspaces/${workspace}`),
      '@kit': path.resolve(__dirname, 'src/kits/shared'),
    },
  },
  build: {
    outDir: 'dist-standalone',
    emptyOutDir: false,
    cssCodeSplit: false,
  },
})
