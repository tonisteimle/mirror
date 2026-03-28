/**
 * Slot Primitive E2E Tests (Playwright)
 *
 * Tests the Slot primitive for layout templates:
 * - Rendering with dashed border and label
 * - CSS classes and attributes
 * - Drag & Drop replacement behavior
 */

import { test, expect } from '@playwright/test'

test.describe('Slot Primitive Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/')
    // Wait for editor to be ready
    await page.waitForSelector('.cm-editor')
    await page.waitForTimeout(1000)
  })

  test('renders Slot with correct structure', async ({ page }) => {
    // Clear editor and enter Slot code
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Select all and replace
    await page.keyboard.press('Meta+a')
    await page.keyboard.type('Box pad 16\n  Slot "Main Content"')

    // Wait for compile
    await page.waitForTimeout(2000)

    // Debug: Take screenshot
    await page.screenshot({ path: 'test-results/slot-debug.png' })

    // Debug: Log preview HTML
    const preview = page.locator('#preview')
    const html = await preview.innerHTML()
    console.log('Preview HTML:', html.substring(0, 1000))

    // Check for any elements
    const elements = preview.locator('[data-mirror-id]')
    const count = await elements.count()
    console.log('Elements with mirror-id:', count)

    // Check that Slot is rendered
    const slot = preview.locator('.mirror-slot')
    await expect(slot).toBeVisible({ timeout: 5000 })
  })

  test('Slot has data-mirror-slot attribute', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    await page.keyboard.press('Meta+a')
    await page.keyboard.type('Container\n  Slot "Sidebar"')

    await page.waitForTimeout(1500)

    const preview = page.locator('#preview')
    const slot = preview.locator('[data-mirror-slot="true"]')

    await expect(slot).toBeVisible({ timeout: 5000 })
  })

  test('Slot displays label text', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    await page.keyboard.press('Meta+a')
    await page.keyboard.type('Box\n  Slot "My Custom Label"')

    await page.waitForTimeout(1500)

    const preview = page.locator('#preview')
    const slotLabel = preview.locator('.mirror-slot-label')

    await expect(slotLabel).toBeVisible({ timeout: 5000 })
    await expect(slotLabel).toContainText('My Custom Label')
  })

  test('Slot has dashed border style', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    await page.keyboard.press('Meta+a')
    await page.keyboard.type('Box\n  Slot "Content"')

    await page.waitForTimeout(1500)

    const preview = page.locator('#preview')
    const slot = preview.locator('.mirror-slot')

    await expect(slot).toBeVisible({ timeout: 5000 })

    // Check CSS properties
    const borderStyle = await slot.evaluate(el => {
      return window.getComputedStyle(el).borderStyle
    })
    expect(borderStyle).toBe('dashed')
  })

  test('Slot has data-slot-label attribute', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    await page.keyboard.press('Meta+a')
    await page.keyboard.type('Box\n  Slot "Header Area"')

    await page.waitForTimeout(1500)

    const preview = page.locator('#preview')
    const slot = preview.locator('[data-slot-label="Header Area"]')

    await expect(slot).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Slot in Layout Templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/')
    await page.waitForSelector('.cm-editor')
    await page.waitForTimeout(1000)
  })

  test('renders multiple Slots in layout', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    await page.keyboard.press('Meta+a')
    // Use direct Slots without component definition for simpler test
    await page.keyboard.type(`Box hor, w full, h 400
  Slot "Sidebar", w 200
  Slot "Main", w full`)

    await page.waitForTimeout(2000)

    const preview = page.locator('#preview')
    const slots = preview.locator('.mirror-slot')

    await expect(slots).toHaveCount(2)
  })

  test('Slot with width property renders correctly', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    await page.keyboard.press('Meta+a')
    await page.keyboard.type('Box hor\n  Slot "Side", w 200')

    await page.waitForTimeout(1500)

    const preview = page.locator('#preview')
    const slot = preview.locator('.mirror-slot')

    await expect(slot).toBeVisible({ timeout: 5000 })

    // Check that width style is applied
    const width = await slot.evaluate(el => {
      return window.getComputedStyle(el).width
    })
    expect(width).toBe('200px')
  })

  test('Slot with height property renders correctly', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    await page.keyboard.press('Meta+a')
    await page.keyboard.type('Box ver\n  Slot "Header", h 60')

    await page.waitForTimeout(1500)

    const preview = page.locator('#preview')
    const slot = preview.locator('.mirror-slot')

    await expect(slot).toBeVisible({ timeout: 5000 })

    // Check that height style is applied
    const height = await slot.evaluate(el => {
      return window.getComputedStyle(el).height
    })
    expect(height).toBe('60px')
  })
})

test.describe('Slot in Component Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/')
    await page.waitForSelector('.cm-editor')
    await page.waitForTimeout(1000)
  })

  test('Slot appears in component palette', async ({ page }) => {
    // Look for Slot in the component palette
    const palette = page.locator('.component-palette')
    const slotItem = palette.locator('[data-component="Slot"]')

    await expect(slotItem).toBeVisible({ timeout: 5000 })
  })

  test('Slot palette item has dashed icon', async ({ page }) => {
    const palette = page.locator('.component-palette')
    const slotItem = palette.locator('[data-component="Slot"]')

    await expect(slotItem).toBeVisible({ timeout: 5000 })

    // Check that the SVG has stroke-dasharray
    const svg = slotItem.locator('svg')
    const rect = svg.locator('rect')

    const dashArray = await rect.getAttribute('stroke-dasharray')
    expect(dashArray).toBeTruthy()
  })

  test('Slot palette item is draggable', async ({ page }) => {
    const palette = page.locator('.component-palette')
    const slotItem = palette.locator('[data-component="Slot"]')

    await expect(slotItem).toBeVisible({ timeout: 5000 })

    const draggable = await slotItem.getAttribute('draggable')
    expect(draggable).toBe('true')
  })
})
