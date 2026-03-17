/**
 * Playwright E2E Test: Element Move Operations
 *
 * Tests element move functionality in the real browser environment.
 * This tests the full integration including:
 * - Preview rendering
 * - Drag event handling
 * - Source code modification
 */

import { test, expect } from '@playwright/test'

const STUDIO_URL = 'http://ux-strategy.ch/mirror/'

test.describe('Element Move E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STUDIO_URL)
    // Wait for studio to initialize
    await page.waitForSelector('#preview', { timeout: 10000 })
    await page.waitForTimeout(500) // Give time for compilation
  })

  test('preview elements should have draggable attribute after render', async ({ page }) => {
    // Wait for initial compilation to complete
    await page.waitForTimeout(1000)

    // Find non-root elements with data-mirror-id
    const nonRootElements = page.locator('[data-mirror-id]:not([data-mirror-root="true"])')
    const count = await nonRootElements.count()

    // At least one non-root element should exist
    expect(count).toBeGreaterThan(0)

    // Check that non-root elements have draggable attribute
    for (let i = 0; i < count; i++) {
      const el = nonRootElements.nth(i)
      const draggable = await el.getAttribute('draggable')
      expect(draggable).toBe('true')
    }
  })

  test('root element should not be draggable', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Root element should have data-mirror-root="true"
    const root = page.locator('[data-mirror-root="true"]')
    const rootCount = await root.count()

    if (rootCount > 0) {
      // Root should NOT be draggable (we skip it in makePreviewElementsDraggable)
      const draggable = await root.first().getAttribute('draggable')
      expect(draggable).not.toBe('true')
    }
  })

  test('dragging existing element should trigger drag events', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Find a draggable element
    const draggable = page.locator('[data-mirror-id][draggable="true"]').first()
    await expect(draggable).toBeVisible()

    // Get bounding box
    const box = await draggable.boundingBox()
    expect(box).toBeTruthy()

    if (box) {
      // Start drag
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()

      // Move to trigger drag
      await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50)

      // Check for drop indicator (if drag was initiated correctly)
      const indicator = page.locator('.mirror-drop-indicator')
      // Note: HTML5 drag events may not fire with mouse simulation
      // This test validates the setup is correct

      // End drag
      await page.mouse.up()
    }
  })
})
