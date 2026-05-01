import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    testTimeout: 5000,
    setupFiles: ['./tests/utils/setup.ts'],
    environmentMatchGlobs: [
      ['tests/studio/**', 'jsdom'],
      ['tests/compiler/**/ir-*.test.ts', 'jsdom'],
      ['tests/compiler/**/html-output-*.test.ts', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'compiler/parser/**/*.ts',
        'compiler/ir/**/*.ts',
        'compiler/backends/**/*.ts',
        'compiler/validator/**/*.ts',
      ],
      exclude: [
        'tests/**',
        // CLI entry points are integration-tested by invocation, not unit-tested.
        'compiler/validator/cli.ts',
        // Pure type definitions — nothing to execute.
        'compiler/validator/types.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
})
