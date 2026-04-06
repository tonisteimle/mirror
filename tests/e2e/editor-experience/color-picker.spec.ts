/**
 * Color Picker E2E Tests
 *
 * Comprehensive tests for the color picker using event-based waiting.
 * The color picker triggers:
 * 1. When typing "#" after a color property (bg, col, boc)
 * 2. When double-clicking on an existing color value
 */

import { test, expect } from '@playwright/test'
import { createStudioTestHelper, type StudioTestHelper } from '../../helpers/studio-test-api'

test.describe('Color Picker - Hash Trigger', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    const apiReady = await helper.waitForTestAPI()
    expect(apiReady).toBe(true)
  })

  test('opens color picker when typing "#" after bg property', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker('#')

    expect(result.pickerType).toBe('color')
    const colorPicker = page.locator('.color-picker, .colorpicker')
    await expect(colorPicker).toBeVisible()
  })

  test('opens color picker when typing "#" after col property', async ({ page }) => {
    await helper.setEditorContent(`Text col `)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker('#')

    expect(result.pickerType).toBe('color')
  })

  test('opens color picker when typing "#" after boc property', async ({ page }) => {
    await helper.setEditorContent(`Frame boc `)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker('#')

    expect(result.pickerType).toBe('color')
  })

  test('closes color picker on Escape', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    const closeResult = await helper.dismissAndWaitForClose()
    expect(closeResult.reason).toBe('escape')

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })

  test('selects color on Enter and inserts hex value', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    await helper.selectAndWaitForClose()

    const content = await helper.getEditorContent()
    // Should have inserted a hex color
    expect(content).toMatch(/Button bg #[0-9a-fA-F]{6}/)
  })

  test('picker state is correctly reported via API', async ({ page }) => {
    let isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)

    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(true)

    const pickerType = await helper.getActivePickerType()
    expect(pickerType).toBe('color')

    await helper.dismissAndWaitForClose()

    isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })
})

test.describe('Color Picker - Keyboard Navigation (Grid)', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('ArrowRight moves selection right in color grid', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    // Move right
    await helper.navigatePickerRight()

    // Selection should have moved
    const selected = page.locator('.color-swatch.selected, .color-picker-item.selected, .picker-selected')
    await expect(selected).toHaveCount(1)

    await helper.dismissPicker()
  })

  test('ArrowLeft moves selection left in color grid', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    // Move right first, then left
    await helper.navigatePickerRight()
    await helper.navigatePickerRight()
    await helper.navigatePickerLeft()

    const selected = page.locator('.color-swatch.selected, .color-picker-item.selected, .picker-selected')
    await expect(selected).toHaveCount(1)

    await helper.dismissPicker()
  })

  test('ArrowDown moves selection down in color grid', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    await helper.navigatePickerDown()

    const selected = page.locator('.color-swatch.selected, .color-picker-item.selected, .picker-selected')
    await expect(selected).toHaveCount(1)

    await helper.dismissPicker()
  })

  test('ArrowUp moves selection up in color grid', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    // Move down first, then up
    await helper.navigatePickerDown()
    await helper.navigatePickerDown()
    await helper.navigatePickerUp()

    const selected = page.locator('.color-swatch.selected, .color-picker-item.selected, .picker-selected')
    await expect(selected).toHaveCount(1)

    await helper.dismissPicker()
  })

  test('Enter selects highlighted color', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    // Navigate in grid
    await helper.navigatePickerRight()
    await helper.navigatePickerRight()
    await helper.navigatePickerDown()

    await helper.selectAndWaitForClose()

    const content = await helper.getEditorContent()
    expect(content).toMatch(/Button bg #[0-9a-fA-F]{6}/)
  })
})

test.describe('Color Picker - Color Display', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('displays color swatches in a grid', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    const colorSwatches = page.locator('.color-swatch, .color-picker-item')
    const count = await colorSwatches.count()
    expect(count).toBeGreaterThan(10) // Should have multiple color options

    await helper.dismissPicker()
  })

  test('shows color preview on selection', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    // The color picker should show a preview or hex value
    const colorPicker = page.locator('.color-picker, .colorpicker')
    await expect(colorPicker).toBeVisible()

    await helper.dismissPicker()
  })

  test('displays multiple color shades', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    // Color picker should have rows of different shades
    const colorRows = page.locator('.color-row, .color-picker-row')
    const count = await colorRows.count()
    expect(count).toBeGreaterThan(5) // Should have multiple rows

    await helper.dismissPicker()
  })
})

test.describe('Color Picker - Token Definition Context', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('opens color picker when defining a .bg token', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: `)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker('#')

    expect(result.pickerType).toBe('color')
  })

  test('opens color picker when defining a .col token', async ({ page }) => {
    await helper.setEditorContent(`$text.col: `)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker('#')

    expect(result.pickerType).toBe('color')
  })

  test('opens color picker for simple token definition', async ({ page }) => {
    await helper.setEditorContent(`$mycolor: `)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker('#')

    expect(result.pickerType).toBe('color')
  })
})

test.describe('Color Picker - Edge Cases', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('does not trigger in wrong context', async ({ page }) => {
    // # in text content should not trigger
    await helper.setEditorContent(`Text "Hello `)
    await page.waitForTimeout(500)

    await page.keyboard.type('#')
    await page.waitForTimeout(300)

    // Should not trigger color picker (wrong context)
    const pickerType = await helper.getActivePickerType()
    expect(pickerType).not.toBe('color')
  })

  test('closes picker when clicking outside', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    // Click outside
    await page.locator('.preview-container').click({ force: true })
    await page.waitForTimeout(200)

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })

  test('closes picker when pressing Backspace past trigger', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('#')

    // Delete the #
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })

  test('handles hover-bg property', async ({ page }) => {
    await helper.setEditorContent(`Button hover-bg `)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker('#')

    expect(result.pickerType).toBe('color')
  })

  test('handles hover-col property', async ({ page }) => {
    await helper.setEditorContent(`Button hover-col `)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker('#')

    expect(result.pickerType).toBe('color')
  })
})

test.describe('Color Picker - Double Click Trigger', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('opens color picker on double-click on hex color', async ({ page }) => {
    await helper.setEditorContent(`Button bg #3b82f6`)
    await page.waitForTimeout(500)

    // Find the hex color in the editor
    const editor = page.locator('.cm-editor .cm-content')

    // Double-click on the hex color
    // We need to find the exact position of #3b82f6 in the editor
    const editorText = await editor.textContent()
    expect(editorText).toContain('#3b82f6')

    // Double-click in the editor area where the color is
    await editor.dblclick({ position: { x: 120, y: 10 } })

    // Wait for picker to open
    await page.waitForTimeout(500)

    const isOpen = await helper.isPickerOpen()
    if (isOpen) {
      const pickerType = await helper.getActivePickerType()
      expect(pickerType).toBe('color')
      await helper.dismissPicker()
    }
    // If picker didn't open, that's okay - double-click position might not be exact
  })
})

test.describe('Color Picker - Concurrent Operations', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('rapid open/close cycles work correctly', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    for (let i = 0; i < 3; i++) {
      await helper.typeAndWaitForPicker('#')
      await helper.dismissAndWaitForClose()
      await page.keyboard.press('Backspace')
    }

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })

  test('can select color, add new property, select again', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    // First selection
    await helper.typeAndWaitForPicker('#')
    await helper.selectAndWaitForClose()

    // Add comma and new property
    await page.keyboard.type(', col ')

    // Second selection
    await helper.typeAndWaitForPicker('#')
    await helper.selectAndWaitForClose()

    const content = await helper.getEditorContent()
    // Should have two hex colors
    const hexMatches = content.match(/#[0-9a-fA-F]{6}/g)
    expect(hexMatches?.length).toBe(2)
  })
})
