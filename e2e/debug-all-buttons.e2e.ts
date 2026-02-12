import { test, expect } from '@playwright/test'

test('debug all buttons', async ({ page }) => {
  await page.goto('file:///Users/toni.steimle/Documents/Dev/Mirror/docs/mirror-docu.html')
  await page.waitForTimeout(2000)
  
  // Get all Button elements and their styles
  const buttons = page.locator('.Button')
  const count = await buttons.count()
  
  console.log(`Found ${count} Button elements`)
  
  for (let i = 0; i < Math.min(count, 5); i++) {
    const button = buttons.nth(i)
    const info = await button.evaluate(el => ({
      dataId: el.getAttribute('data-id'),
      inlineStyle: el.getAttribute('style'),
      text: el.textContent?.trim().slice(0, 30)
    }))
    console.log(`Button ${i}:`, JSON.stringify(info))
  }
  
  expect(true).toBe(true)
})
