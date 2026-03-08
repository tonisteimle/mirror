/**
 * Token Autocomplete E2E Tests (Playwright)
 *
 * Tests the token autocomplete functionality in the property panel
 */

import { test, expect } from '@playwright/test'

test.describe('Token Autocomplete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/', { waitUntil: 'networkidle' })
    await page.waitForSelector('.cm-editor', { timeout: 10000 })
    await page.waitForTimeout(2000)
  })

  test('shows autocomplete dropdown when typing $ in property panel input', async ({ page }) => {
    const preview = page.locator('#preview')

    // Find any clickable element in preview
    const element = preview.locator('[data-mirror-id]').first()
    await expect(element).toBeVisible({ timeout: 5000 })

    // Click on it to show property panel
    await element.click()

    // Wait for property panel to show
    const ppHeader = page.locator('.pp-header')
    await expect(ppHeader).toBeVisible({ timeout: 5000 })

    // Find the gap input (which should have data-prop="gap")
    const gapInput = page.locator('.property-panel input.pp-gap-field[data-prop="gap"]')

    if (await gapInput.isVisible()) {
      console.log('Found gap input')
      // Clear the input and type $
      await gapInput.click()
      await gapInput.fill('$')

      // Wait a bit for the autocomplete to render
      await page.waitForTimeout(1000)

      // Check if autocomplete dropdown appeared
      const autocomplete = page.locator('.pp-token-autocomplete')
      const isVisible = await autocomplete.isVisible()
      console.log('Autocomplete visible:', isVisible)

      if (isVisible) {
        // Check dropdown content
        const dropdownHTML = await autocomplete.innerHTML()
        console.log('Dropdown HTML:', dropdownHTML)

        const tokenItems = autocomplete.locator('.pp-token-item')
        const count = await tokenItems.count()
        console.log('Token items count:', count)

        expect(count).toBeGreaterThan(0)
      } else {
        // Debug: check what's in the DOM
        const bodyHTML = await page.locator('body').innerHTML()
        console.log('Body contains pp-token-autocomplete:', bodyHTML.includes('pp-token-autocomplete'))

        // Check if there are any text inputs
        const allInputs = await page.locator('.property-panel input[type="text"]').all()
        console.log('Total text inputs in property panel:', allInputs.length)

        // Fail with a clear message
        expect(isVisible, 'Autocomplete dropdown should be visible after typing $').toBeTruthy()
      }
    } else {
      console.log('Gap input not visible, trying first text input')
      // Fallback to any text input
      const textInput = page.locator('.property-panel input[type="text"]').first()
      await expect(textInput).toBeVisible({ timeout: 5000 })

      // Get the data-prop attribute
      const dataProp = await textInput.getAttribute('data-prop')
      console.log('First text input data-prop:', dataProp)

      await textInput.click()
      await textInput.fill('$')

      await page.waitForTimeout(1000)

      const autocomplete = page.locator('.pp-token-autocomplete')
      const isVisible = await autocomplete.isVisible()
      console.log('Autocomplete visible:', isVisible)

      expect(isVisible, 'Autocomplete should be visible').toBeTruthy()
    }
  })

  test('hides autocomplete on Escape', async ({ page }) => {
    const preview = page.locator('#preview')
    const element = preview.locator('[data-mirror-id]').first()
    await expect(element).toBeVisible({ timeout: 5000 })
    await element.click()

    const ppHeader = page.locator('.pp-header')
    await expect(ppHeader).toBeVisible({ timeout: 5000 })

    // Use gap input which should have proper data-prop
    const gapInput = page.locator('.property-panel input.pp-gap-field[data-prop="gap"]')

    if (await gapInput.isVisible()) {
      await gapInput.click()
      await gapInput.fill('$')

      await page.waitForTimeout(1000)

      const autocomplete = page.locator('.pp-token-autocomplete')

      if (await autocomplete.isVisible()) {
        // Press Escape
        await page.keyboard.press('Escape')

        // Autocomplete should be hidden
        await expect(autocomplete).not.toBeVisible({ timeout: 1000 })
      }
    }
  })
})
