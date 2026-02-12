import { test, expect } from '@playwright/test'

test('test hover state on Button', async ({ page }) => {
  // Capture console logs
  page.on('console', msg => {
    if (msg.text().includes('[DEBUG]')) {
      console.log('  ', msg.text())
    }
  })

  await page.goto('file:///Users/toni.steimle/Documents/Dev/Mirror/docs/mirror-docu.html')
  await page.waitForTimeout(2000)
  
  // Find the "Hover me" button (Button 2)
  const hoverButton = page.locator('.Button').nth(2)
  
  // Get initial styles
  const initialStyles = await hoverButton.evaluate(el => ({
    backgroundColor: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
    text: el.textContent?.trim()
  }))
  console.log('Initial styles:', initialStyles)
  
  // Hover over the button
  await hoverButton.hover()
  await page.waitForTimeout(500)
  
  // Get hover styles
  const hoverStyles = await hoverButton.evaluate(el => ({
    backgroundColor: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color
  }))
  console.log('Hover styles:', hoverStyles)
  
  // Verify background color changed
  // Initial: #2271c1 = rgb(34, 113, 193)
  // Hover: #1d5ba0 = rgb(29, 91, 160)
  expect(initialStyles.backgroundColor).toBe('rgb(34, 113, 193)')
  expect(hoverStyles.backgroundColor).toBe('rgb(29, 91, 160)')
})
