import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Standard Tests (jsdom) - für einfache Unit Tests
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['src/**/*.browser.test.{ts,tsx}'],
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
