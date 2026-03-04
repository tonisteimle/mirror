import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    testTimeout: 5000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/parser/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
})
