import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'spec-studio-quality.spec.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 180000,
  use: {
    baseURL: 'http://localhost:3333',
    trace: 'off',
  },
})
