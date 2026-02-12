import { test, expect } from '@playwright/test'

test('debug docs button col', async ({ page }) => {
  // Capture console logs
  const consoleLogs: string[] = []
  page.on('console', msg => {
    if (msg.text().includes('[DEBUG]')) {
      consoleLogs.push(msg.text())
    }
  })

  // Build and deploy to docs folder first - using local file URL
  await page.goto('file:///Users/toni.steimle/Documents/Dev/Mirror/docs/mirror-docu.html')
  
  // Wait for editors to initialize
  await page.waitForTimeout(2000)
  
  // Print console logs
  console.log('Console logs from page:')
  for (const log of consoleLogs) {
    console.log('  ', log)
  }
  
  // Find the states example (Beispiel 5)
  // The Button example should be visible
  const buttons = page.locator('.Button')
  const count = await buttons.count()
  console.log('Number of Button elements:', count)
  
  if (count > 0) {
    // Check the first Button
    const button = buttons.first()
    const styles = await button.evaluate(el => ({
      backgroundColor: getComputedStyle(el).backgroundColor,
      color: getComputedStyle(el).color,
      className: el.className
    }))
    console.log('First Button styles:', styles)
  }
  
  expect(true).toBe(true)
})
