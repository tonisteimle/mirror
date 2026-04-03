import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'tests/**/_archiv/**'],
    testTimeout: 5000,
    setupFiles: ['./tests/utils/setup.ts'],
    environmentMatchGlobs: [
      ['tests/studio/**', 'jsdom'],
      ['tests/compiler/**/ir-*.test.ts', 'jsdom'],
      ['tests/compiler/**/html-output-*.test.ts', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['compiler/parser/**/*.ts', 'compiler/ir/**/*.ts', 'compiler/backends/**/*.ts'],
      exclude: ['tests/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
})
