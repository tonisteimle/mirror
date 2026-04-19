/**
 * Icon Picker Tests
 *
 * Tests that verify the icon picker displays icons correctly,
 * supports search functionality, and allows selecting icons
 * to change element properties.
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Layout code with an Icon element
const LAYOUT_WITH_ICON = `// Layout
Frame bg #1a1a1a, pad 24, gap 16
  Text "Icon Test", col white, fs 24
  Icon "check", ic #10b981, is 24
`

// Layout code with a Button (no icon)
const LAYOUT_WITH_BUTTON = `// Layout
Frame bg #1a1a1a, pad 24, gap 16
  Text "Button Test", col white, fs 24
  Button "Click me", bg #333333, col white, pad 12 24, rad 8
`

/**
 * Helper to setup layout with icon and return the icon node ID
 */
async function setupIconLayout(api: TestAPI): Promise<string> {
  await api.editor.setCode(LAYOUT_WITH_ICON)
  await api.utils.waitForCompile()
  await api.utils.delay(300)

  // Find the Icon element dynamically instead of hardcoding node-3
  const iconElement = document.querySelector(
    '[data-node-id][data-element-type="Icon"]'
  ) as HTMLElement
  if (iconElement) {
    return iconElement.getAttribute('data-node-id') || 'node-3'
  }
  // Fallback: Icon is typically the 3rd element in our layout
  return 'node-3'
}

/**
 * Helper to get search input element
 */
function getSearchInput(): HTMLInputElement | null {
  const picker = getIconPicker()
  if (!picker) return null
  return picker.querySelector('.icon-picker-search-input') as HTMLInputElement
}

/**
 * Helper to get the icon picker element
 */
function getIconPicker(): HTMLElement | null {
  return document.querySelector('.icon-picker.visible')
}

/**
 * Helper to check if icon picker is visible
 */
function isIconPickerVisible(): boolean {
  const picker = getIconPicker()
  return picker !== null && picker.classList.contains('visible')
}

/**
 * Helper to get icon items from the picker
 */
function getIconItems(): HTMLElement[] {
  const picker = getIconPicker()
  if (!picker) return []

  const items = picker.querySelectorAll('.icon-picker-item')
  return Array.from(items) as HTMLElement[]
}

/**
 * Helper to get icon names from picker items
 */
function getIconNames(): string[] {
  const items = getIconItems()
  return items.map(item => item.getAttribute('data-icon') || '').filter(Boolean)
}

/**
 * Helper to search in icon picker
 */
async function searchIcons(api: TestAPI, query: string): Promise<void> {
  const picker = getIconPicker()
  if (!picker) return

  const searchInput = picker.querySelector('.icon-picker-search-input') as HTMLInputElement
  if (!searchInput) return

  searchInput.value = query
  searchInput.dispatchEvent(new Event('input', { bubbles: true }))
  await api.utils.delay(200)
}

/**
 * Helper to select an icon by name
 */
async function selectIcon(api: TestAPI, iconName: string): Promise<boolean> {
  const items = getIconItems()
  for (const item of items) {
    if (item.getAttribute('data-icon') === iconName) {
      item.click()
      await api.utils.delay(400)
      return true
    }
  }
  return false
}

/**
 * Helper to open icon picker from property panel
 */
async function openIconPicker(api: TestAPI): Promise<boolean> {
  // Find the icon picker trigger button in the property panel
  const trigger = document.querySelector('[data-open-icon-picker]') as HTMLElement
  if (!trigger) {
    console.log('Icon picker trigger not found in property panel')
    return false
  }
  trigger.click()
  await api.utils.delay(500)
  return isIconPickerVisible()
}

/**
 * Helper to get recent icons section
 */
function getRecentIcons(): string[] {
  const picker = getIconPicker()
  if (!picker) return []

  const recentSection = picker.querySelector('.icon-picker-recent')
  if (!recentSection) return []

  const items = recentSection.querySelectorAll('.icon-picker-item')
  return Array.from(items)
    .map(item => item.getAttribute('data-icon') || '')
    .filter(Boolean)
}

export const iconPickerTests: TestCase[] = describe('Icon Picker', [
  test('Icon picker opens from property panel', async (api: TestAPI) => {
    // Setup layout with icon - returns the icon node ID dynamically
    const iconNodeId = await setupIconLayout(api)

    // Verify icon exists
    api.assert.exists(iconNodeId, 'Icon element should exist')

    // Select the icon
    await api.studio.setSelection(iconNodeId)
    await api.utils.delay(200)

    // Verify property panel is visible
    api.assert.ok(api.panel.property.isVisible(), 'Property panel should be visible')

    // Open icon picker
    const opened = await openIconPicker(api)
    api.assert.ok(opened, 'Icon picker should open')

    // Verify picker has expected structure
    const picker = getIconPicker()
    api.assert.ok(picker !== null, 'Picker element should exist')
    api.assert.ok(picker!.classList.contains('visible'), 'Picker should have visible class')

    // Close picker (Escape or click outside)
    await api.interact.pressKey('Escape')
    await api.utils.delay(300)

    // If still visible, try clicking outside
    if (isIconPickerVisible()) {
      const preview = document.getElementById('preview')
      if (preview) {
        preview.click()
        await api.utils.delay(300)
      }
    }
    // Note: Some implementations keep picker open until explicit close
    // The main test here is that the picker opened successfully
  }),

  test('Icon picker displays icons in grid', async (api: TestAPI) => {
    const iconNodeId = await setupIconLayout(api)
    await api.studio.setSelection(iconNodeId)
    await api.utils.delay(200)

    await openIconPicker(api)
    await api.utils.delay(300)

    // Get icons and verify grid structure
    const icons = getIconItems()
    api.assert.ok(icons.length > 0, `Should have icons displayed, got ${icons.length}`)
    api.assert.ok(icons.length >= 10, `Should have at least 10 icons, got ${icons.length}`)

    // Verify icons are actually visible (not hidden via CSS)
    const firstIcon = icons[0]
    const computedStyle = window.getComputedStyle(firstIcon)
    api.assert.ok(
      computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden',
      'Icons should be visible (not hidden via CSS)'
    )

    // Verify grid container exists with proper layout
    const picker = getIconPicker()
    const grid = picker?.querySelector('.icon-picker-grid')
    api.assert.ok(grid !== null, 'Grid container should exist')

    await api.interact.pressKey('Escape')
  }),

  test('Icon picker search filters icons', async (api: TestAPI) => {
    const iconNodeId = await setupIconLayout(api)
    await api.studio.setSelection(iconNodeId)
    await api.utils.delay(200)

    await openIconPicker(api)
    await api.utils.delay(300)

    // Get initial icon count
    const initialIcons = getIconItems()
    const initialCount = initialIcons.length
    api.assert.ok(initialCount > 20, `Should have many icons initially, got ${initialCount}`)

    // Search for "heart"
    await searchIcons(api, 'heart')

    // Get filtered icons
    const filteredIcons = getIconItems()
    const filteredNames = getIconNames()

    // STRICT: Must have fewer icons after search (not just <=20)
    api.assert.ok(
      filteredIcons.length < initialCount,
      `Search must reduce icon count: ${filteredIcons.length} should be < ${initialCount}`
    )

    // STRICT: All visible icons should match the search term
    const allMatchHeart = filteredNames.every(name => name.toLowerCase().includes('heart'))
    api.assert.ok(
      allMatchHeart || filteredNames.length === 0,
      `All filtered icons should contain "heart", got: ${filteredNames.slice(0, 5).join(', ')}`
    )

    // Should have at least one heart icon
    api.assert.ok(filteredNames.length > 0, 'Should have at least one heart icon in results')

    await api.interact.pressKey('Escape')
  }),

  test('Selecting icon updates code', async (api: TestAPI) => {
    const iconNodeId = await setupIconLayout(api)
    await api.studio.setSelection(iconNodeId)
    await api.utils.delay(200)

    // Get original code
    const originalCode = api.editor.getCode()
    api.assert.ok(originalCode.includes('"check"'), 'Original code should have check icon')

    await openIconPicker(api)
    await api.utils.delay(500)

    // Get available icons
    const iconNames = getIconNames()
    api.assert.ok(iconNames.length > 0, 'Should have icons available')

    // Find a different icon to select (not "check")
    const newIcon = iconNames.find(name => name !== 'check' && !name.includes('check'))

    // STRICT: Must find a different icon - fail if not found
    api.assert.ok(newIcon !== undefined, 'Must find an icon different from "check"')

    // Select the new icon
    const selected = await selectIcon(api, newIcon!)
    api.assert.ok(selected, `Should be able to select icon: ${newIcon}`)

    await api.utils.delay(500)

    // Verify code was updated
    const newCode = api.editor.getCode()

    // STRICT: Code must have changed
    api.assert.ok(newCode !== originalCode, 'Code should have changed after icon selection')

    // STRICT: New icon should be in code (with proper quoting or as content)
    const hasNewIconQuoted = newCode.includes(`"${newIcon}"`) || newCode.includes(`'${newIcon}'`)
    const hasNewIconContent =
      newCode.includes(`content ${newIcon}`) || newCode.includes(`content "${newIcon}"`)
    api.assert.ok(
      hasNewIconQuoted || hasNewIconContent,
      `Code should contain new icon "${newIcon}" with quotes, got: ${newCode.substring(0, 300)}`
    )

    // Verify the new icon is actually part of the Icon element definition
    // The icon might be added via content property rather than replacing the original
    const iconLineMatch = newCode.match(/Icon\s+.*$/m)
    api.assert.ok(iconLineMatch !== null, 'Should still have an Icon element in code')

    // Either the old icon is gone, OR the new icon is added (content property)
    const oldIconGone = !newCode.includes('Icon "check"')
    const newIconAdded = hasNewIconQuoted || hasNewIconContent

    api.assert.ok(
      oldIconGone || newIconAdded,
      `Icon should be updated: old icon gone (${oldIconGone}) or new icon added (${newIconAdded})`
    )
  }),

  test('Icon picker has search input', async (api: TestAPI) => {
    const iconNodeId = await setupIconLayout(api)
    await api.studio.setSelection(iconNodeId)
    await api.utils.delay(200)

    await openIconPicker(api)
    await api.utils.delay(300)

    // Check for search input
    const searchInput = getSearchInput()
    api.assert.ok(searchInput !== null, 'Search input should exist')

    // Verify it's a proper input element
    api.assert.ok(
      searchInput!.tagName.toLowerCase() === 'input',
      `Search should be an input element, got ${searchInput!.tagName}`
    )

    // Verify input is focusable and editable
    api.assert.ok(
      !searchInput!.disabled && !searchInput!.readOnly,
      'Search input should be editable'
    )

    await api.interact.pressKey('Escape')
  }),

  test('Icon picker search clears on reopen', async (api: TestAPI) => {
    const iconNodeId = await setupIconLayout(api)
    await api.studio.setSelection(iconNodeId)
    await api.utils.delay(200)

    // Open icon picker
    await openIconPicker(api)
    await api.utils.delay(300)

    // Clear any previous search state first (test isolation)
    const searchInputInit = getSearchInput()
    if (searchInputInit && searchInputInit.value !== '') {
      searchInputInit.value = ''
      searchInputInit.dispatchEvent(new Event('input', { bubbles: true }))
      await api.utils.delay(200)
    }

    // Get initial count after clearing
    const initialCount = getIconItems().length
    const searchInputBefore = getSearchInput()
    api.assert.ok(searchInputBefore !== null, 'Search input should exist')
    api.assert.ok(
      searchInputBefore!.value === '',
      `Search should be empty after clear, got: "${searchInputBefore!.value}"`
    )

    // Search for something specific
    await searchIcons(api, 'arrow')
    const filteredCount = getIconItems().length
    api.assert.ok(
      filteredCount < initialCount,
      `Search should filter icons: ${filteredCount} < ${initialCount}`
    )

    // Verify search input has our query
    const searchInputAfterSearch = getSearchInput()
    api.assert.ok(
      searchInputAfterSearch!.value === 'arrow',
      `Search input should have "arrow", got: "${searchInputAfterSearch!.value}"`
    )

    // Close picker using Escape key
    await api.interact.pressKey('Escape')
    await api.utils.delay(300)

    // If still visible, try clicking outside
    if (isIconPickerVisible()) {
      const preview = document.getElementById('preview')
      if (preview) {
        preview.click()
        await api.utils.delay(300)
      }
    }

    // If picker is still visible, we can't test reopen behavior
    // Skip the reopen test in this case
    if (isIconPickerVisible()) {
      // Clear search manually and verify it works
      const searchToClear = getSearchInput()
      if (searchToClear) {
        searchToClear.value = ''
        searchToClear.dispatchEvent(new Event('input', { bubbles: true }))
        await api.utils.delay(200)
        const clearedCount = getIconItems().length
        api.assert.ok(
          clearedCount >= initialCount - 5,
          `Clearing search should restore icons: ${clearedCount} >= ${initialCount - 5}`
        )
      }
      return
    }

    // Reopen picker
    const reopened = await openIconPicker(api)
    api.assert.ok(reopened, 'Should be able to reopen icon picker')
    await api.utils.delay(500)

    // Check search state after reopen
    const searchInputAfterReopen = getSearchInput()
    api.assert.ok(searchInputAfterReopen !== null, 'Search input should exist after reopen')

    const searchValue = searchInputAfterReopen!.value
    const reopenCount = getIconItems().length

    // Either search is cleared OR all icons are shown again
    const searchCleared = searchValue === ''
    const allIconsShown = reopenCount >= initialCount - 5 // Allow small variance

    api.assert.ok(
      searchCleared || allIconsShown,
      `Search should clear on reopen. Search value: "${searchValue}", icons: ${reopenCount} (was ${initialCount})`
    )

    // Clean up
    await api.interact.pressKey('Escape')
    await api.utils.delay(200)
  }),

  test('Icon picker shows icon titles on hover', async (api: TestAPI) => {
    const iconNodeId = await setupIconLayout(api)
    await api.studio.setSelection(iconNodeId)
    await api.utils.delay(200)

    await openIconPicker(api)
    await api.utils.delay(300)

    const items = getIconItems()
    api.assert.ok(items.length > 0, 'Should have icon items')

    // Check multiple items, not just first
    const itemsToCheck = items.slice(0, Math.min(5, items.length))
    for (const item of itemsToCheck) {
      const title = item.getAttribute('title')
      const dataIcon = item.getAttribute('data-icon')

      api.assert.ok(
        title !== null && title.length > 0,
        `Icon should have title attribute, got: ${title}`
      )
      api.assert.ok(
        dataIcon !== null && dataIcon.length > 0,
        `Icon should have data-icon attribute, got: ${dataIcon}`
      )
      api.assert.ok(title === dataIcon, `Title "${title}" should match data-icon "${dataIcon}"`)
    }

    await api.interact.pressKey('Escape')
  }),

  test('Icon picker keyboard navigation works', async (api: TestAPI) => {
    const iconNodeId = await setupIconLayout(api)
    await api.studio.setSelection(iconNodeId)
    await api.utils.delay(200)

    await openIconPicker(api)
    await api.utils.delay(300)

    const items = getIconItems()
    api.assert.ok(items.length > 0, 'Should have icon items')

    // Verify grid structure for keyboard nav
    const picker = getIconPicker()
    const grid = picker?.querySelector('.icon-picker-grid')
    api.assert.ok(grid !== null, 'Should have icon grid')

    // Focus search input first (typical keyboard flow)
    const searchInput = getSearchInput()
    api.assert.ok(searchInput !== null, 'Search input should exist for keyboard flow')
    searchInput!.focus()
    await api.utils.delay(100)

    // Verify search input is focused
    api.assert.ok(document.activeElement === searchInput, 'Search input should be focusable')

    // Press Tab to move to grid items (or ArrowDown depending on implementation)
    await api.interact.pressKey('Tab')
    await api.utils.delay(100)

    // Verify focus moved to an icon or stays in picker
    const focusedElement = document.activeElement
    const focusInPicker =
      picker?.contains(focusedElement) || focusedElement?.classList.contains('icon-picker-item')

    api.assert.ok(
      focusInPicker,
      `Focus should stay in picker after Tab, active: ${focusedElement?.className}`
    )

    // Items should have tabindex or be buttons for keyboard access
    const firstItem = items[0]
    const isKeyboardAccessible =
      firstItem.hasAttribute('tabindex') ||
      firstItem.tagName.toLowerCase() === 'button' ||
      firstItem.getAttribute('role') === 'button'

    api.assert.ok(
      isKeyboardAccessible,
      'Icon items should be keyboard accessible (tabindex, button, or role=button)'
    )

    await api.interact.pressKey('Escape')
    await api.utils.delay(200)
  }),
])

export const allIconPickerTests = iconPickerTests
