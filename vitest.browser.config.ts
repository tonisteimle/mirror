import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@testing-library/react',
      '@testing-library/user-event',
      '@testing-library/jest-dom/vitest',
    ],
  },
  test: {
    // Browser Tests - für CodeMirror und echte DOM-Interaktionen
    include: ['src/**/*.browser.test.{ts,tsx}'],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      headless: true,
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
