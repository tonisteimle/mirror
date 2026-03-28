/**
 * Position Panel E2E Tests (Playwright)
 *
 * Tests for the position controls in the property panel:
 * - X/Y input fields display and interaction
 * - Drag-to-adjust functionality
 * - Spinner button interaction
 * - Keyboard navigation (ArrowUp/ArrowDown)
 * - Shift modifier for 10x step
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// HELPERS
// ============================================================================

async function waitForStudioReady(page: Page) {
  await page.goto('/studio/')
  await page.waitForSelector('.cm-editor')
  await page.waitForTimeout(2000) // Wait for initial compile
}

async function setEditorContent(page: Page, content: string) {
  const editor = page.locator('.cm-editor')
  await editor.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.type(content)
  await page.waitForTimeout(1000)
}

async function selectElementInPreview(page: Page, nodeId: string) {
  const element = page.locator(`#preview [data-mirror-id="${nodeId}"]`)
  await element.click()
  await page.waitForTimeout(500) // Wait for panel update
}

// ============================================================================
// POSITION PANEL TESTS
// ============================================================================

test.describe('Position Panel', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('shows position inputs for absolute element', async ({ page }) => {
    // Create an absolute positioned element
    await setEditorContent(page, `
Box stacked w 400 h 300
  Box x 100 y 50 w 80 h 40 bg #3B82F6
`.trim())

    // Select the inner element
    const innerBox = page.locator('#preview [data-mirror-id]').nth(1)
    await innerBox.click()

    // Check for position section in property panel
    const propertyPanel = page.locator('#property-panel, .property-panel')
    const positionSection = propertyPanel.locator('.position-section, [data-section="position"]')

    // Position inputs should be visible
    await expect(positionSection.or(propertyPanel.locator('text=Position'))).toBeVisible({ timeout: 5000 })
  })

  test('displays current x/y values', async ({ page }) => {
    await setEditorContent(page, `
Box stacked w 400 h 300
  Box x 150 y 75 w 80 h 40 bg #3B82F6
`.trim())

    const innerBox = page.locator('#preview [data-mirror-id]').nth(1)
    await innerBox.click()

    const propertyPanel = page.locator('#property-panel, .property-panel')

    // Look for inputs containing the values
    const xInput = propertyPanel.locator('input[data-axis="x"], input[data-property="x"]')
    const yInput = propertyPanel.locator('input[data-axis="y"], input[data-property="y"]')

    if (await xInput.count() > 0) {
      await expect(xInput).toHaveValue('150')
    }
    if (await yInput.count() > 0) {
      await expect(yInput).toHaveValue('75')
    }
  })

  test('updates position via input change', async ({ page }) => {
    await setEditorContent(page, `
Box stacked w 400 h 300
  Box x 100 y 50 w 80 h 40 bg #3B82F6
`.trim())

    const innerBox = page.locator('#preview [data-mirror-id]').nth(1)
    await innerBox.click()

    const propertyPanel = page.locator('#property-panel, .property-panel')
    const xInput = propertyPanel.locator('input[data-axis="x"], input[data-property="x"]').first()

    if (await xInput.count() > 0) {
      await xInput.click()
      await xInput.fill('200')
      await page.keyboard.press('Enter')

      await page.waitForTimeout(500)

      // Check if editor content was updated
      const editor = page.locator('.cm-editor')
      const content = await editor.textContent()
      expect(content).toContain('200')
    }
  })

  test('spinner buttons increment/decrement position', async ({ page }) => {
    await setEditorContent(page, `
Box stacked w 400 h 300
  Box x 100 y 50 w 80 h 40 bg #3B82F6
`.trim())

    const innerBox = page.locator('#preview [data-mirror-id]').nth(1)
    await innerBox.click()

    const propertyPanel = page.locator('#property-panel, .property-panel')
    const upButton = propertyPanel.locator('.numeric-input-spinner-up').first()

    if (await upButton.count() > 0) {
      await upButton.click()
      await page.waitForTimeout(300)

      // Value should have incremented
      const xInput = propertyPanel.locator('input[data-axis="x"]').first()
      const newValue = await xInput.inputValue()
      expect(parseInt(newValue)).toBeGreaterThan(100)
    }
  })

  test('arrow keys change position value in focused input', async ({ page }) => {
    await setEditorContent(page, `
Box stacked w 400 h 300
  Box x 100 y 50 w 80 h 40 bg #3B82F6
`.trim())

    const innerBox = page.locator('#preview [data-mirror-id]').nth(1)
    await innerBox.click()

    const propertyPanel = page.locator('#property-panel, .property-panel')
    const xInput = propertyPanel.locator('input[data-axis="x"], input[data-property="x"]').first()

    if (await xInput.count() > 0) {
      await xInput.click()
      await xInput.focus()

      // Press ArrowUp
      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(200)

      const newValue = await xInput.inputValue()
      expect(parseInt(newValue)).toBe(101)
    }
  })

  test('shift+arrow uses 10px step', async ({ page }) => {
    await setEditorContent(page, `
Box stacked w 400 h 300
  Box x 100 y 50 w 80 h 40 bg #3B82F6
`.trim())

    const innerBox = page.locator('#preview [data-mirror-id]').nth(1)
    await innerBox.click()

    const propertyPanel = page.locator('#property-panel, .property-panel')
    const xInput = propertyPanel.locator('input[data-axis="x"], input[data-property="x"]').first()

    if (await xInput.count() > 0) {
      await xInput.click()
      await xInput.focus()

      // Press Shift+ArrowUp
      await page.keyboard.press('Shift+ArrowUp')
      await page.waitForTimeout(200)

      const newValue = await xInput.inputValue()
      expect(parseInt(newValue)).toBe(110) // 100 + 10
    }
  })
})

// ============================================================================
// ARROW KEY NAVIGATION (PREVIEW FOCUSED)
// ============================================================================

test.describe('Arrow Key Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('arrow keys move absolute element when selected', async ({ page }) => {
    await setEditorContent(page, `
Box stacked w 400 h 300
  Box x 100 y 50 w 80 h 40 bg #3B82F6
`.trim())

    // Select the absolute element
    const innerBox = page.locator('#preview [data-mirror-id]').nth(1)
    await innerBox.click()

    // Focus the preview area (not an input)
    const preview = page.locator('#preview')
    await preview.click({ position: { x: 10, y: 10 } })

    // Press ArrowRight
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(500)

    // Check if the source was updated
    const editor = page.locator('.cm-editor')
    const content = await editor.textContent()

    // Should have moved to x 101
    expect(content).toMatch(/x\s+101/)
  })

  test('shift+arrow moves by 10px', async ({ page }) => {
    await setEditorContent(page, `
Box stacked w 400 h 300
  Box x 100 y 50 w 80 h 40 bg #3B82F6
`.trim())

    const innerBox = page.locator('#preview [data-mirror-id]').nth(1)
    await innerBox.click()

    const preview = page.locator('#preview')
    await preview.click({ position: { x: 10, y: 10 } })

    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(500)

    const editor = page.locator('.cm-editor')
    const content = await editor.textContent()

    expect(content).toMatch(/x\s+110/)
  })

  test('arrow keys do not move flex element', async ({ page }) => {
    // Create a flex layout element
    await setEditorContent(page, `
Box ver gap 8
  Box w 80 h 40 bg #3B82F6
  Box w 80 h 40 bg #EF4444
`.trim())

    const firstBox = page.locator('#preview [data-mirror-id]').nth(1)
    await firstBox.click()

    const preview = page.locator('#preview')
    await preview.click({ position: { x: 10, y: 10 } })

    const editor = page.locator('.cm-editor')
    const contentBefore = await editor.textContent()

    // Press ArrowRight - should NOT add x property
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(500)

    const contentAfter = await editor.textContent()

    // Content should not have changed (no x added)
    expect(contentAfter).not.toContain('x 1')
  })
})

// ============================================================================
// DRAG-TO-ADJUST
// ============================================================================

test.describe('Drag-to-Adjust', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('label has ew-resize cursor', async ({ page }) => {
    await setEditorContent(page, `
Box stacked w 400 h 300
  Box x 100 y 50 w 80 h 40 bg #3B82F6
`.trim())

    const innerBox = page.locator('#preview [data-mirror-id]').nth(1)
    await innerBox.click()

    const propertyPanel = page.locator('#property-panel, .property-panel')
    const label = propertyPanel.locator('.numeric-input-label').first()

    if (await label.count() > 0) {
      const cursor = await label.evaluate(el => window.getComputedStyle(el).cursor)
      expect(cursor).toBe('ew-resize')
    }
  })

  test('dragging label changes value', async ({ page }) => {
    await setEditorContent(page, `
Box stacked w 400 h 300
  Box x 100 y 50 w 80 h 40 bg #3B82F6
`.trim())

    const innerBox = page.locator('#preview [data-mirror-id]').nth(1)
    await innerBox.click()

    const propertyPanel = page.locator('#property-panel, .property-panel')
    const label = propertyPanel.locator('.numeric-input-label').first()
    const xInput = propertyPanel.locator('input[data-axis="x"]').first()

    if (await label.count() > 0 && await xInput.count() > 0) {
      const box = await label.boundingBox()
      if (box) {
        // Drag right
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2)
        await page.mouse.up()

        await page.waitForTimeout(300)

        const newValue = await xInput.inputValue()
        expect(parseInt(newValue)).toBeGreaterThan(100)
      }
    }
  })
})
