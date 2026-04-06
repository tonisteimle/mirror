import { test, expect } from '@playwright/test'

test('debug - check window objects and errors', async ({ page }) => {
  // Capture console messages and errors
  const consoleLogs: string[] = []
  const consoleErrors: string[] = []

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    } else {
      consoleLogs.push(msg.text())
    }
  })

  page.on('pageerror', err => {
    consoleErrors.push(err.message)
  })

  await page.goto('/studio/')

  // Wait for editor to be ready
  await page.waitForSelector('.cm-editor', { timeout: 10000 })

  // Wait a bit for initialization
  await page.waitForTimeout(3000)

  // Check what's on window
  const windowKeys = await page.evaluate(() => {
    const keys: string[] = []
    for (const key of Object.keys(window)) {
      if (key.startsWith('__') || key.includes('STUDIO') || key.includes('mirror') || key.includes('Mirror')) {
        keys.push(key)
      }
    }
    return keys
  })

  console.log('Window keys:', windowKeys)

  // Check if __STUDIO_TEST__ exists
  const hasTestAPI = await page.evaluate(() => typeof (window as any).__STUDIO_TEST__ !== 'undefined')
  console.log('Has __STUDIO_TEST__:', hasTestAPI)

  // Print errors
  console.log('Console errors:', consoleErrors)

  // Print logs that mention Test API
  const testAPILogs = consoleLogs.filter(l => l.includes('Test API') || l.includes('test-api'))
  console.log('Test API logs:', testAPILogs)

  expect(hasTestAPI).toBe(true)
})
