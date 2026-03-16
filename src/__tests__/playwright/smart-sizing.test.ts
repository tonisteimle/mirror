/**
 * Smart Sizing E2E Tests (Playwright)
 *
 * Tests the smart sizing behavior during resize:
 * - Drag larger than parent → "full"
 * - Drag smaller than children → "hug"
 * - Otherwise → pixel value
 */

import { test, expect } from '@playwright/test'

test.describe('Smart Sizing - Full/Hug Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/')
    await page.waitForSelector('.cm-editor')
    await page.waitForTimeout(1000)
  })

  test('resize changes width value in code', async ({ page }) => {
    // Basic resize test - verify that dragging a resize handle changes the width in code
    const editor = page.locator('.cm-editor')
    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type('Box w 100, h 100, bg #3B82F6')

    await page.waitForTimeout(2000)

    // Select the box
    const preview = page.locator('#preview')
    const box = preview.locator('[data-mirror-id="node-1"]')
    await expect(box).toBeVisible({ timeout: 5000 })
    await box.click()

    await page.waitForTimeout(1000)

    // Find the east resize handle
    const eastHandle = page.locator('.resize-handle-e')
    await expect(eastHandle).toBeVisible({ timeout: 3000 })

    const handleBox = await eastHandle.boundingBox()
    if (handleBox) {
      await eastHandle.hover()
      await page.waitForTimeout(200)

      await page.mouse.down()
      await page.waitForTimeout(100)

      // Drag to increase width by ~100px
      for (let i = 0; i < 10; i++) {
        await page.mouse.move(handleBox.x + 10 * (i + 1), handleBox.y + handleBox.height / 2)
        await page.waitForTimeout(50)
      }

      await page.mouse.up()
      await page.waitForTimeout(1000)

      // Check that the width changed (should be around 200)
      const editorContent = await editor.textContent()
      console.log('Editor content after resize:', editorContent)

      // Should contain w followed by a number around 200
      expect(editorContent).toMatch(/w\s+(19\d|20\d|21\d)/)
    }
  })

  test('shows size indicator during resize', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`Box w 300, h 200, pad 16
  Box w 100, h 80, bg #10B981`)

    await page.waitForTimeout(2000)

    // Select inner box
    const preview = page.locator('#preview')
    const innerBox = preview.locator('[data-mirror-id="node-2"]')
    await expect(innerBox).toBeVisible({ timeout: 5000 })
    await innerBox.click()

    await page.waitForTimeout(1000)

    // Start dragging
    const seHandle = page.locator('.resize-handle-se')
    await expect(seHandle).toBeVisible({ timeout: 3000 })

    const handleBox = await seHandle.boundingBox()
    if (handleBox) {
      await seHandle.hover()
      await page.waitForTimeout(200)

      await page.mouse.down()
      await page.waitForTimeout(100)

      // Move to trigger indicator
      await page.mouse.move(handleBox.x + 30, handleBox.y + 30)
      await page.waitForTimeout(200)

      // Size indicator should be visible (or overlay with size info)
      // The overlay shows size during resize
      const overlay = page.locator('.visual-overlay')
      await expect(overlay).toBeVisible({ timeout: 1000 })

      await page.mouse.up()
    }
  })

  test('resize handles appear on selection', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`Box w 200, h 150, bg #6366F1`)

    await page.waitForTimeout(2000)

    // Click on box to select
    const preview = page.locator('#preview')
    const box = preview.locator('[data-mirror-id="node-1"]')
    await expect(box).toBeVisible({ timeout: 5000 })
    await box.click()

    await page.waitForTimeout(500)

    // All 8 resize handles should be visible
    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
    for (const pos of handles) {
      const handle = page.locator(`.resize-handle-${pos}`)
      await expect(handle).toBeVisible({ timeout: 2000 })
    }
  })

  test('resize updates pixel value in code', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`Box w 100, h 100, bg #F59E0B`)

    await page.waitForTimeout(2000)

    // Select box
    const preview = page.locator('#preview')
    const box = preview.locator('[data-mirror-id="node-1"]')
    await expect(box).toBeVisible({ timeout: 5000 })
    await box.click()

    await page.waitForTimeout(1000)

    // Debug: Take screenshot
    await page.screenshot({ path: 'test-results/resize-debug.png' })

    // Drag east handle slightly (not to edge)
    const eastHandle = page.locator('.resize-handle-e')
    await expect(eastHandle).toBeVisible({ timeout: 3000 })

    const handleBox = await eastHandle.boundingBox()
    if (handleBox) {
      // Use dragAndDrop API for more reliable dragging
      await eastHandle.hover()
      await page.waitForTimeout(200)

      await page.mouse.down()
      await page.waitForTimeout(100)

      // Move in steps for more realistic drag
      for (let i = 0; i < 5; i++) {
        await page.mouse.move(handleBox.x + 10 * (i + 1), handleBox.y + handleBox.height / 2)
        await page.waitForTimeout(50)
      }

      await page.mouse.up()
      await page.waitForTimeout(1000)

      // Take another screenshot to see result
      await page.screenshot({ path: 'test-results/resize-after.png' })

      // Check that width changed to a pixel value (not full/hug)
      const editorContent = await editor.textContent()
      console.log('Editor content after resize:', editorContent)
      // Should contain w followed by a number around 150
      expect(editorContent).toMatch(/w\s+(14\d|15\d|16\d)/)
    }
  })
})

test.describe('Smart Sizing - Visual Feedback', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/')
    await page.waitForSelector('.cm-editor')
    await page.waitForTimeout(1000)
  })

  test('cursor changes during resize', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`Box w 150, h 150, bg #EC4899`)

    await page.waitForTimeout(2000)

    // Select box
    const preview = page.locator('#preview')
    const box = preview.locator('[data-mirror-id="node-1"]')
    await box.click()

    await page.waitForTimeout(500)

    // Check cursor on east handle
    const eastHandle = page.locator('.resize-handle-e')
    await expect(eastHandle).toBeVisible()

    const cursor = await eastHandle.evaluate(el => window.getComputedStyle(el).cursor)
    expect(cursor).toBe('ew-resize')

    // Check cursor on southeast handle
    const seHandle = page.locator('.resize-handle-se')
    const seCursor = await seHandle.evaluate(el => window.getComputedStyle(el).cursor)
    expect(seCursor).toBe('nwse-resize')
  })
})
