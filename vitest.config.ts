import path from 'path'
import { defineConfig } from 'vitest/config'

// Unit-test config for pure logic (applyDotPathPatch, compileFlowplan, …).
// Mirrors the path aliases from vite.config.ts so test files can import via
// @flowkit/* etc. Node environment — no DOM needed for the pure-logic suites.
export default defineConfig({
  resolve: {
    alias: {
      '@flowkit': path.resolve(__dirname, './src'),
      '@flowkit-kit': path.resolve(__dirname, './src/kits/shared'),
      '@flowkit-core': path.resolve(__dirname, './src/core'),
      '@flowkit-features': path.resolve(__dirname, './src/features'),
      '@flowkit-shared': path.resolve(__dirname, './src/shared'),
      '@flowlens': path.resolve(__dirname, './src/modes/flowlens'),
    },
  },
  test: {
    environment: 'node',
    include: ['scripts/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 91,
        branches: 86,
        functions: 95,
        lines: 93,
      },
    },
  },
})
