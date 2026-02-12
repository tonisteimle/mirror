/**
 * E2E Test: Verify Box/Button elements in playground have correct width
 */

import { test, expect } from '@playwright/test'

test.describe('Playground Element Width', () => {
  test('Box with children should not stretch to full width', async ({ page }) => {
    // Test the specific case: Box with ver layout and children
    await page.goto('https://ux-strategy.ch/mirror/mirror-docu.html', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Find a Box element (from the Tile examples)
    const boxElement = page.locator('.Box').first()
    const isVisible = await boxElement.isVisible().catch(() => false)

    if (isVisible) {
      const boxWidth = await boxElement.evaluate(el => el.getBoundingClientRect().width)
      const styleAttr = await boxElement.getAttribute('style')

      console.log('Box style attribute:', styleAttr)
      console.log('Box width:', boxWidth)

      // Style should have inline-flex (browser computes it as "flex" but we set inline-flex)
      expect(styleAttr).toContain('inline-flex')
      // Should be reasonably sized, not full width (container is ~600px)
      expect(boxWidth).toBeLessThan(400)
    }
  })

  test('Button in step 2 should not stretch to full width', async ({ page, context }) => {
    // Disable cache
    await page.route('**/*', route => {
      route.continue({ headers: { ...route.request().headers(), 'Cache-Control': 'no-cache' } })
    })

    // Load the documentation page
    await page.goto('https://ux-strategy.ch/mirror/mirror-docu.html', { waitUntil: 'networkidle' })

    // Wait for the playground to load
    await page.waitForTimeout(3000)

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/docu-page.png', fullPage: true })

    // Find the styled Button in "2. Add Styling" section
    // It should have background color #2271c1
    const blueButton = page.locator('.Button').first()
    const isVisible = await blueButton.isVisible().catch(() => false)

    if (isVisible) {
      const buttonBox = await blueButton.boundingBox()
      console.log('Button bounding box:', buttonBox)

      // Get the style attribute
      const styleAttr = await blueButton.getAttribute('style')
      console.log('Button style attribute:', styleAttr)

      // Get computed style
      const computedWidth = await blueButton.evaluate(el => window.getComputedStyle(el).width)
      const computedDisplay = await blueButton.evaluate(el => window.getComputedStyle(el).display)
      console.log('Computed width:', computedWidth)
      console.log('Computed display:', computedDisplay)

      // Get parent info
      const parentStyle = await blueButton.evaluate(el => el.parentElement?.getAttribute('style'))
      console.log('Parent style:', parentStyle)

      if (buttonBox) {
        // A button with "Hello World" text and padding 12 24 should be around 150-180px
        // NOT 500+ px (full container width)
        console.log('Button width:', buttonBox.width)

        // Should be less than 300px for such a simple button
        expect(buttonBox.width).toBeLessThan(300)
      }
    } else {
      console.log('Button not visible, checking all elements...')
      const allButtons = await page.locator('.Button').count()
      console.log('Total Button elements:', allButtons)
    }
  })
})
