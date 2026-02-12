import { test, expect } from '@playwright/test'

test('debug button html', async ({ page }) => {
  await page.goto('file:///Users/toni.steimle/Documents/Dev/Mirror/docs/mirror-docu.html')
  await page.waitForTimeout(2000)
  
  // Find the first Button element
  const button = page.locator('.Button').first()
  
  // Get the full element HTML and computed styles
  const info = await button.evaluate(el => {
    const style = el.getAttribute('style')
    const computed = getComputedStyle(el)
    return {
      outerHTML: el.outerHTML.slice(0, 500),
      inlineStyle: style,
      computedBg: computed.backgroundColor,
      computedColor: computed.color,
      tagName: el.tagName,
      parentTag: el.parentElement?.tagName,
      parentClass: el.parentElement?.className,
    }
  })
  
  console.log('Button info:', JSON.stringify(info, null, 2))
  
  expect(true).toBe(true)
})
