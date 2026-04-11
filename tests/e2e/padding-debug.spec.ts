/**
 * Debug test to check App padding in the Studio
 */

import { test, expect } from '@playwright/test'

test('App element should have padding from $l token', async ({ page }) => {
  // Navigate to the Studio
  await page.goto('http://localhost:5173')

  // Wait for the preview to be rendered
  await page.waitForSelector('#preview .mirror-root', { timeout: 10000 })

  // Wait a bit for compilation to complete
  await page.waitForTimeout(2000)

  // Find the App element
  const appElement = page.locator('[data-component="App"]').first()
  await expect(appElement).toBeVisible()

  // Get computed styles
  const styles = await appElement.evaluate((el) => {
    const computed = window.getComputedStyle(el)
    return {
      padding: computed.padding,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      background: computed.background,
      gap: computed.gap,
      // Also check if CSS variable is defined
      lPadVar: computed.getPropertyValue('--l-pad'),
    }
  })

  console.log('=== COMPUTED STYLES ===')
  console.log('padding:', styles.padding)
  console.log('paddingTop:', styles.paddingTop)
  console.log('paddingRight:', styles.paddingRight)
  console.log('paddingBottom:', styles.paddingBottom)
  console.log('paddingLeft:', styles.paddingLeft)
  console.log('background:', styles.background)
  console.log('gap:', styles.gap)
  console.log('--l-pad variable:', styles.lPadVar)

  // Get inline style attribute
  const inlineStyle = await appElement.getAttribute('style')
  console.log('\n=== INLINE STYLE ===')
  console.log(inlineStyle)

  // Check the style element content
  const styleContent = await page.evaluate(() => {
    const styleEl = document.querySelector('#preview .mirror-root style')
    return styleEl?.textContent || 'No style element found'
  })

  console.log('\n=== STYLE ELEMENT (first 500 chars) ===')
  console.log(styleContent.substring(0, 500))

  // Check if --l-pad is in the :root
  const hasLPad = styleContent.includes('--l-pad')
  console.log('\n=== CSS VARIABLE CHECK ===')
  console.log('--l-pad in style element:', hasLPad)

  // The actual assertion
  expect(styles.paddingTop).not.toBe('0px')
  expect(styles.paddingTop).toBe('16px')
})
