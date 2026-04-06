/**
 * Token Picker E2E Tests
 *
 * Comprehensive tests for the token picker using event-based waiting.
 * Uses the Studio Test API for reliable, deterministic testing.
 */

import { test, expect } from '@playwright/test'
import { createStudioTestHelper, type StudioTestHelper } from '../../helpers/studio-test-api'

test.describe('Token Picker - Basic Operations', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    const apiReady = await helper.waitForTestAPI()
    expect(apiReady).toBe(true)
  })

  test('opens token picker when typing "$" after bg property', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue
$surface.bg: gray

Button bg `)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker('$')

    expect(result.pickerType).toBe('token')
    const tokenPicker = page.locator('.token-picker')
    await expect(tokenPicker).toBeVisible()
  })

  test('opens token picker when typing "$" after col property', async ({ page }) => {
    await helper.setEditorContent(`$text.col: white
$muted.col: gray

Text col `)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker('$')

    expect(result.pickerType).toBe('token')
  })

  test('opens token picker when typing "$" after pad property', async ({ page }) => {
    await helper.setEditorContent(`$small.pad: 8
$large.pad: 24

Frame pad `)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker('$')

    expect(result.pickerType).toBe('token')
  })

  test('opens token picker when typing "$" after rad property', async ({ page }) => {
    await helper.setEditorContent(`$button.rad: 6
$card.rad: 12

Frame rad `)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker('$')

    expect(result.pickerType).toBe('token')
  })

  test('closes token picker on Enter and inserts selected token', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue
$surface.bg: gray

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')
    await helper.navigatePickerDown()

    const closeResult = await helper.selectAndWaitForClose()
    expect(closeResult.reason).toBe('select')

    const content = await helper.getEditorContent()
    expect(content).toContain('surface')
  })

  test('closes token picker on Escape without inserting', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const closeResult = await helper.dismissAndWaitForClose()
    expect(closeResult.reason).toBe('escape')

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)

    // Verify no token was inserted (only the $ we typed)
    const content = await helper.getEditorContent()
    expect(content).toMatch(/Button bg \$\s*$/)
  })

  test('picker state is correctly reported via API', async ({ page }) => {
    let isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)

    let pickerType = await helper.getActivePickerType()
    expect(pickerType).toBeNull()

    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(true)

    pickerType = await helper.getActivePickerType()
    expect(pickerType).toBe('token')

    const closeResult = await helper.dismissAndWaitForClose()
    expect(closeResult.reason).toBe('escape')

    isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })
})

test.describe('Token Picker - Keyboard Navigation', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('first item is selected by default', async ({ page }) => {
    await helper.setEditorContent(`$alpha.bg: red
$beta.bg: green
$gamma.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const firstItem = page.locator('.token-picker-item').first()
    await expect(firstItem).toHaveClass(/selected/)

    await helper.dismissPicker()
  })

  test('ArrowDown moves selection down', async ({ page }) => {
    await helper.setEditorContent(`$alpha.bg: red
$beta.bg: green
$gamma.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    await helper.navigatePickerDown()

    const secondItem = page.locator('.token-picker-item').nth(1)
    await expect(secondItem).toHaveClass(/selected/)

    await helper.dismissPicker()
  })

  test('ArrowUp moves selection up', async ({ page }) => {
    await helper.setEditorContent(`$alpha.bg: red
$beta.bg: green
$gamma.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    // Go down first
    await helper.navigatePickerDown()
    await helper.navigatePickerDown()

    // Then up
    await helper.navigatePickerUp()

    const secondItem = page.locator('.token-picker-item').nth(1)
    await expect(secondItem).toHaveClass(/selected/)

    await helper.dismissPicker()
  })

  test('navigation wraps around at boundaries', async ({ page }) => {
    await helper.setEditorContent(`$first.bg: red
$second.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    // First item selected
    const firstItem = page.locator('.token-picker-item').first()
    await expect(firstItem).toHaveClass(/selected/)

    // Go up from first should wrap to last
    await helper.navigatePickerUp()

    const lastItem = page.locator('.token-picker-item').last()
    await expect(lastItem).toHaveClass(/selected/)

    await helper.dismissPicker()
  })

  test('Enter selects currently highlighted item', async ({ page }) => {
    await helper.setEditorContent(`$first.bg: red
$second.bg: green
$third.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    // Navigate to third item
    await helper.navigatePickerDown()
    await helper.navigatePickerDown()

    await helper.selectAndWaitForClose()

    const content = await helper.getEditorContent()
    expect(content).toContain('third')
  })
})

test.describe('Token Picker - Filtering by Property Type', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('shows only .bg tokens after bg property', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue
$primary.col: white
$small.pad: 4

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(1)

    const tokenName = page.locator('.token-picker-name').first()
    await expect(tokenName).toContainText('$primary.bg')

    await helper.dismissPicker()
  })

  test('shows only .col tokens after col property', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue
$primary.col: white
$secondary.col: gray
$small.pad: 4

Text col `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(2)

    await helper.dismissPicker()
  })

  test('shows only .pad tokens after pad property', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue
$small.pad: 8
$large.pad: 24

Frame pad `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(2)

    await helper.dismissPicker()
  })

  test('shows only .rad tokens after rad property', async ({ page }) => {
    await helper.setEditorContent(`$button.rad: 6
$card.rad: 12
$primary.bg: blue

Frame rad `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(2)

    await helper.dismissPicker()
  })

  test('shows only .gap tokens after gap property', async ({ page }) => {
    await helper.setEditorContent(`$small.gap: 8
$large.gap: 24
$primary.bg: blue

Frame gap `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(2)

    await helper.dismissPicker()
  })
})

test.describe('Token Picker - Live Filtering', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('filters tokens as user types after $', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue
$secondary.bg: green
$surface.bg: gray

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    // Initially all 3 tokens visible
    let tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(3)

    // Type 's' to filter
    await page.keyboard.type('s')
    await page.waitForTimeout(100)

    // Should show secondary and surface
    tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(2)

    // Type 'u' to narrow down
    await page.keyboard.type('u')
    await page.waitForTimeout(100)

    // Should show only surface
    tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(1)

    const tokenName = page.locator('.token-picker-name').first()
    await expect(tokenName).toContainText('surface')

    await helper.dismissPicker()
  })

  test('shows empty state when no tokens match filter', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    // Type something that won't match
    await page.keyboard.type('xyz')
    await page.waitForTimeout(100)

    const tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(0)

    const emptyState = page.locator('.token-picker-empty')
    await expect(emptyState).toBeVisible()

    await helper.dismissPicker()
  })

  test('Enter selects first filtered result', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue
$surface.bg: gray

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    // Filter to surface
    await page.keyboard.type('sur')
    await page.waitForTimeout(100)

    await helper.selectAndWaitForClose()

    const content = await helper.getEditorContent()
    expect(content).toContain('surface')
  })
})

test.describe('Token Picker - Edge Cases', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('handles no tokens defined', async ({ page }) => {
    await helper.setEditorContent(`Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(0)

    const emptyState = page.locator('.token-picker-empty')
    await expect(emptyState).toBeVisible()

    await helper.dismissPicker()
  })

  test('handles single token', async ({ page }) => {
    await helper.setEditorContent(`$only.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(1)

    await helper.selectAndWaitForClose()

    const content = await helper.getEditorContent()
    expect(content).toContain('only')
  })

  test('handles many tokens', async ({ page }) => {
    // Create 10 tokens
    const tokens = Array.from({ length: 10 }, (_, i) => `$color${i}.bg: red`).join('\n')
    await helper.setEditorContent(`${tokens}

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(10)

    await helper.dismissPicker()
  })

  test('handles tokens with dots in name', async ({ page }) => {
    await helper.setEditorContent(`$brand.primary.bg: blue
$brand.secondary.bg: green

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const tokenItems = page.locator('.token-picker-item')
    await expect(tokenItems).toHaveCount(2)

    await helper.dismissPicker()
  })

  test('closes picker when clicking outside', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    // Click somewhere outside the picker
    await page.locator('.preview-container').click({ force: true })

    await page.waitForTimeout(200)

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })

  test('closes picker when pressing Backspace past trigger position', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    // Press backspace to delete the $
    await page.keyboard.press('Backspace')

    await page.waitForTimeout(200)

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })
})

test.describe('Token Picker - Token Display', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('displays token name correctly', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const tokenName = page.locator('.token-picker-name').first()
    await expect(tokenName).toContainText('$primary.bg')

    await helper.dismissPicker()
  })

  test('displays color preview for color tokens', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const colorPreview = page.locator('.token-picker-preview').first()
    await expect(colorPreview).toBeVisible()

    await helper.dismissPicker()
  })

  test('displays token value', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue

Button bg `)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker('$')

    const tokenValue = page.locator('.token-picker-value').first()
    await expect(tokenValue).toContainText('blue')

    await helper.dismissPicker()
  })
})

test.describe('Token Picker - Concurrent Operations', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('rapid open/close cycles are handled correctly', async ({ page }) => {
    await helper.setEditorContent(`$color.bg: white

Button `)
    await page.waitForTimeout(500)

    for (let i = 0; i < 3; i++) {
      await page.keyboard.type('bg ')
      await helper.typeAndWaitForPicker('$')
      await helper.dismissAndWaitForClose()

      // Clean up
      await page.keyboard.press('Backspace')
      await page.keyboard.press('Backspace')
      await page.keyboard.press('Backspace')
      await page.keyboard.press('Backspace')
    }

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })

  test('can open picker, close, and open again', async ({ page }) => {
    await helper.setEditorContent(`$primary.bg: blue
$secondary.bg: green

Button bg `)
    await page.waitForTimeout(500)

    // First open
    await helper.typeAndWaitForPicker('$')
    expect(await helper.isPickerOpen()).toBe(true)

    // Close
    await helper.dismissAndWaitForClose()
    expect(await helper.isPickerOpen()).toBe(false)

    // Delete $ and re-trigger
    await page.keyboard.press('Backspace')
    await helper.typeAndWaitForPicker('$')
    expect(await helper.isPickerOpen()).toBe(true)

    await helper.dismissPicker()
  })
})
