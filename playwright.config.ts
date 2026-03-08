import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './src/__tests__/playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Run sequentially to avoid server issues
  reporter: 'list',
  timeout: 15000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx serve . -l 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
})
