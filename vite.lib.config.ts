import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@platform': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/core/config/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist/lib',
    emptyOutDir: true,
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
})
