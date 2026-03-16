import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'studio/**/*.test.ts'],
    exclude: ['src/__tests__/playwright/**'],
    testTimeout: 5000,
    // Use jsdom for tests that need DOM
    environmentMatchGlobs: [
      ['src/__tests__/studio/**', 'jsdom'],
      ['src/runtime/__tests__/dom-runtime.test.ts', 'jsdom'],
      ['src/ir/__tests__/layout-measurement.test.ts', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/parser/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
})
