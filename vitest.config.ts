import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'studio/**/*.test.ts'],
    exclude: ['src/__tests__/playwright/**'],
    testTimeout: 5000,
    // Setup file for custom matchers
    setupFiles: ['./src/test-utils/setup.ts'],
    // Use jsdom for tests that need DOM
    environmentMatchGlobs: [
      ['src/__tests__/studio/**', 'jsdom'],
      ['src/__tests__/e2e/**', 'jsdom'],
      ['src/__tests__/errors/**', 'jsdom'],
      ['src/__tests__/snapshots/**', 'jsdom'],
      ['src/__tests__/golden/**', 'jsdom'],
      ['src/__tests__/generated/**', 'jsdom'],
      ['src/runtime/__tests__/dom-runtime.test.ts', 'jsdom'],
      ['src/ir/__tests__/layout-measurement.test.ts', 'jsdom'],
      ['src/ir/__tests__/hug-edge-cases.test.ts', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/parser/**/*.ts', 'src/ir/**/*.ts', 'src/backends/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test-utils/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
})
