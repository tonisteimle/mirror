import { test, expect } from '@playwright/test'

test('debug button col', async ({ page }) => {
  // Capture console logs
  const consoleLogs: string[] = []
  page.on('console', msg => {
    if (msg.text().includes('[DEBUG]')) {
      consoleLogs.push(msg.text())
    }
  })

  await page.goto('http://localhost:5174/mirror/app/')
  
  // Set up the button with hover state
  const editorCode = `Button col #2271c1 pad 12 24 rad 8 "Hover me"
  state hover
    col #1d5ba0`

  // Wait for app to load
  await page.waitForTimeout(1000)
  
  // Find the editor and type the code
  const editor = page.locator('.cm-content')
  await editor.click()
  await page.keyboard.press('Meta+A')
  await page.keyboard.type(editorCode)
  
  // Wait for preview to update
  await page.waitForTimeout(1000)
  
  // Print console logs
  console.log('Console logs from page:')
  for (const log of consoleLogs) {
    console.log('  ', log)
  }
  
  // Check if the button element exists and has the right styles
  const button = page.locator('[class*="Button"]').first()
  const exists = await button.count() > 0
  console.log('Button exists:', exists)
  
  if (exists) {
    const styles = await button.evaluate(el => ({
      backgroundColor: getComputedStyle(el).backgroundColor,
      color: getComputedStyle(el).color,
      className: el.className
    }))
    console.log('Button styles:', styles)
  }
  
  expect(true).toBe(true) // Dummy assertion
})
