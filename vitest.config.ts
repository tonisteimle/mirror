import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['src/__tests__/playwright/**'],
    testTimeout: 5000,
    // Use jsdom for studio tests that need DOM
    environmentMatchGlobs: [
      ['src/__tests__/studio/**', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/parser/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
})
