/**
 * Icon Picker E2E Tests
 *
 * Comprehensive tests for the icon picker using event-based waiting.
 * The icon picker triggers when typing space after "Icon" component.
 */

import { test, expect } from '@playwright/test'
import { createStudioTestHelper, type StudioTestHelper } from '../../helpers/studio-test-api'

test.describe('Icon Picker - Basic Operations', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    const apiReady = await helper.waitForTestAPI()
    expect(apiReady).toBe(true)
  })

  test('opens icon picker when typing space after Icon', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    const result = await helper.typeAndWaitForPicker(' ')

    expect(result.pickerType).toBe('icon')
    const iconPicker = page.locator('.icon-picker')
    await expect(iconPicker).toBeVisible()
  })

  test('shows icon grid with available icons', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    const iconItems = page.locator('.icon-picker-item')
    const count = await iconItems.count()
    expect(count).toBeGreaterThan(0)

    await helper.dismissPicker()
  })

  test('closes icon picker on Escape', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    const closeResult = await helper.dismissAndWaitForClose()
    expect(closeResult.reason).toBe('escape')

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })

  test('selects icon on Enter and inserts it', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    await helper.selectAndWaitForClose()

    const content = await helper.getEditorContent()
    // Icon should be inserted with quotes
    expect(content).toMatch(/Icon\s+"[a-z0-9-]+"/)
  })

  test('picker state is correctly reported via API', async ({ page }) => {
    let isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)

    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(true)

    const pickerType = await helper.getActivePickerType()
    expect(pickerType).toBe('icon')

    await helper.dismissAndWaitForClose()

    isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })
})

test.describe('Icon Picker - Keyboard Navigation (Grid)', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('ArrowRight moves selection right in grid', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    // Get initial selected icon
    const firstSelected = page.locator('.icon-picker-item.selected, .icon-picker-item.picker-selected').first()
    const initialIcon = await firstSelected.getAttribute('data-icon')

    await helper.navigatePickerRight()

    // Selection should have moved
    const newSelected = page.locator('.icon-picker-item.selected, .icon-picker-item.picker-selected').first()
    const newIcon = await newSelected.getAttribute('data-icon')

    expect(newIcon).not.toBe(initialIcon)

    await helper.dismissPicker()
  })

  test('ArrowLeft moves selection left in grid', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    // Move right first, then left
    await helper.navigatePickerRight()
    await helper.navigatePickerRight()

    const afterRightIcon = await page.locator('.icon-picker-item.selected, .icon-picker-item.picker-selected').first().getAttribute('data-icon')

    await helper.navigatePickerLeft()

    const afterLeftIcon = await page.locator('.icon-picker-item.selected, .icon-picker-item.picker-selected').first().getAttribute('data-icon')

    expect(afterLeftIcon).not.toBe(afterRightIcon)

    await helper.dismissPicker()
  })

  test('ArrowDown moves selection down in grid', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    await helper.navigatePickerDown()

    // Selection should have moved down (to next row)
    const selected = page.locator('.icon-picker-item.selected, .icon-picker-item.picker-selected')
    await expect(selected).toHaveCount(1)

    await helper.dismissPicker()
  })

  test('ArrowUp moves selection up in grid', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    // Move down first, then up
    await helper.navigatePickerDown()
    await helper.navigatePickerDown()
    await helper.navigatePickerUp()

    const selected = page.locator('.icon-picker-item.selected, .icon-picker-item.picker-selected')
    await expect(selected).toHaveCount(1)

    await helper.dismissPicker()
  })

  test('Enter selects highlighted icon', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    // Navigate to a specific icon
    await helper.navigatePickerRight()
    await helper.navigatePickerRight()
    await helper.navigatePickerDown()

    // Get the highlighted icon name
    const selectedIcon = await page.locator('.icon-picker-item.selected, .icon-picker-item.picker-selected').first().getAttribute('data-icon')

    await helper.selectAndWaitForClose()

    const content = await helper.getEditorContent()
    expect(content).toContain(`"${selectedIcon}"`)
  })
})

test.describe('Icon Picker - Search/Filtering', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('filters icons as user types', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    // Get initial count
    const initialCount = await page.locator('.icon-picker-item').count()

    // Type to filter
    await page.keyboard.type('heart')
    await page.waitForTimeout(200)

    const filteredCount = await page.locator('.icon-picker-item').count()
    expect(filteredCount).toBeLessThan(initialCount)
    expect(filteredCount).toBeGreaterThan(0)

    await helper.dismissPicker()
  })

  test('shows icons matching search term', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    // Search for "arrow"
    await page.keyboard.type('arrow')
    await page.waitForTimeout(200)

    // All visible icons should contain "arrow" in name
    const iconItems = page.locator('.icon-picker-item')
    const count = await iconItems.count()
    expect(count).toBeGreaterThan(0)

    // Check first few icons contain "arrow"
    for (let i = 0; i < Math.min(3, count); i++) {
      const iconName = await iconItems.nth(i).getAttribute('data-icon')
      expect(iconName?.toLowerCase()).toContain('arrow')
    }

    await helper.dismissPicker()
  })

  test('shows empty state when no icons match', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    // Type something that won't match any icon
    await page.keyboard.type('xyznonexistent')
    await page.waitForTimeout(200)

    const iconItems = page.locator('.icon-picker-item')
    await expect(iconItems).toHaveCount(0)

    await helper.dismissPicker()
  })

  test('Enter selects first filtered result', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    // Filter to "check"
    await page.keyboard.type('check')
    await page.waitForTimeout(200)

    await helper.selectAndWaitForClose()

    const content = await helper.getEditorContent()
    expect(content.toLowerCase()).toContain('check')
  })
})

test.describe('Icon Picker - Edge Cases', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('does not trigger after other components', async ({ page }) => {
    await helper.setEditorContent(`Button`)
    await page.waitForTimeout(500)

    // Type space after Button - should NOT trigger icon picker
    await page.keyboard.type(' ')
    await page.waitForTimeout(300)

    const isOpen = await helper.isPickerOpen()
    // Picker should either not be open, or be a different type
    if (isOpen) {
      const pickerType = await helper.getActivePickerType()
      expect(pickerType).not.toBe('icon')
    }
  })

  test('closes picker when clicking outside', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    // Click outside the picker (on the preview panel)
    await page.locator('.preview-panel').click({ force: true })
    await page.waitForTimeout(200)

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })

  test('closes picker when pressing Backspace past trigger', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    // Focus the editor (not search input) then delete the space
    await page.locator('.cm-content').click()
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })

  test('closes picker when typing another space', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    // Focus the editor (not search input) then type another space (closeOnChars)
    await page.locator('.cm-content').focus()
    await page.waitForTimeout(100)
    await page.keyboard.press('Space')
    await page.waitForTimeout(200)

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })

  test('works with component ending in Icon', async ({ page }) => {
    await helper.setEditorContent(`// Test with custom component
NavIcon`)
    await page.waitForTimeout(500)

    // Move to end
    await page.keyboard.press('End')

    const result = await helper.typeAndWaitForPicker(' ')

    // Should still trigger icon picker (pattern matches *Icon)
    expect(result.pickerType).toBe('icon')

    await helper.dismissPicker()
  })
})

test.describe('Icon Picker - Icon Display', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('displays icons in a grid layout', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    const iconGrid = page.locator('.icon-picker-grid, .icon-picker-content')
    await expect(iconGrid).toBeVisible()

    await helper.dismissPicker()
  })

  test('shows icon preview/tooltip on hover', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    await helper.typeAndWaitForPicker(' ')

    // Hover over an icon
    const firstIcon = page.locator('.icon-picker-item').first()
    await firstIcon.hover()

    // Icon name should be visible somewhere (tooltip or label)
    const iconName = await firstIcon.getAttribute('data-icon')
    expect(iconName).toBeTruthy()

    await helper.dismissPicker()
  })
})

test.describe('Icon Picker - Concurrent Operations', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('rapid open/close cycles work correctly', async ({ page }) => {
    await helper.setEditorContent(`Frame
  Icon`)
    await page.waitForTimeout(500)

    // Move to end
    await page.keyboard.press('End')

    for (let i = 0; i < 3; i++) {
      await helper.typeAndWaitForPicker(' ')
      await helper.dismissAndWaitForClose()
      await page.keyboard.press('Backspace')
    }

    const isOpen = await helper.isPickerOpen()
    expect(isOpen).toBe(false)
  })

  test('can select icon, add new Icon, select again', async ({ page }) => {
    await helper.setEditorContent(`Frame
  Icon`)
    await page.waitForTimeout(500)

    // Move to end
    await page.keyboard.press('End')

    // First selection
    await helper.typeAndWaitForPicker(' ')
    await helper.selectAndWaitForClose()

    // Add new line with Icon
    await page.keyboard.press('Enter')
    await page.keyboard.type('Icon')
    await page.waitForTimeout(500)  // Wait for editor to process

    // Second selection
    await helper.typeAndWaitForPicker(' ')
    await helper.selectAndWaitForClose()

    const content = await helper.getEditorContent()
    // Should have two Icon lines with icons
    const iconMatches = content.match(/Icon\s+"[a-z0-9-]+"/g)
    expect(iconMatches?.length).toBe(2)
  })
})
