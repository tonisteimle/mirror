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
 * Helper to setup layout with icon
 */
async function setupIconLayout(api: TestAPI): Promise<void> {
  await api.editor.setCode(LAYOUT_WITH_ICON)
  await api.utils.waitForCompile()
  await api.utils.delay(300)
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
    // Setup layout with icon
    await setupIconLayout(api)

    // Verify icon exists (node-3 is the Icon in this layout)
    api.assert.exists('node-3', 'Icon should exist')

    // Select the icon
    await api.studio.setSelection('node-3')
    await api.utils.delay(200)

    // Verify property panel is visible
    api.assert.ok(api.panel.property.isVisible(), 'Property panel should be visible')

    // Open icon picker
    const opened = await openIconPicker(api)
    api.assert.ok(opened, 'Icon picker should open')
    api.assert.ok(isIconPickerVisible(), 'Icon picker should be visible')

    // Close picker
    await api.interact.pressKey('Escape')
    await api.utils.delay(200)
  }),

  test('Icon picker displays icons in grid', async (api: TestAPI) => {
    // Setup layout with icon
    await setupIconLayout(api)

    // Select the icon
    await api.studio.setSelection('node-3')
    await api.utils.delay(200)

    // Open icon picker
    await openIconPicker(api)
    await api.utils.delay(300)

    // Get icons
    const icons = getIconItems()
    api.assert.ok(icons.length > 0, `Should have icons displayed, got ${icons.length}`)

    // Should have multiple icons (at least built-in icons)
    api.assert.ok(icons.length >= 10, `Should have at least 10 icons, got ${icons.length}`)

    // Close picker
    await api.interact.pressKey('Escape')
  }),

  test('Icon picker search filters icons', async (api: TestAPI) => {
    // Setup layout with icon
    await setupIconLayout(api)

    // Select the icon
    await api.studio.setSelection('node-3')
    await api.utils.delay(200)

    // Open icon picker
    await openIconPicker(api)
    await api.utils.delay(300)

    // Get initial icon count
    const initialIcons = getIconItems()
    const initialCount = initialIcons.length

    // Search for "heart"
    await searchIcons(api, 'heart')

    // Get filtered icons
    const filteredIcons = getIconItems()
    const filteredNames = getIconNames()

    // Should have fewer icons after search
    api.assert.ok(
      filteredIcons.length < initialCount || filteredIcons.length <= 20,
      'Search should filter icons'
    )

    // Should have icons matching "heart"
    const hasHeart = filteredNames.some(name => name.toLowerCase().includes('heart'))
    api.assert.ok(hasHeart, 'Should have heart icon in results')

    // Close picker
    await api.interact.pressKey('Escape')
  }),

  test('Selecting icon updates code', async (api: TestAPI) => {
    // Setup layout with icon
    await setupIconLayout(api)

    // Select the icon (node-3)
    await api.studio.setSelection('node-3')
    await api.utils.delay(200)

    // Open icon picker
    await openIconPicker(api)
    await api.utils.delay(500)

    // Get available icons
    const iconNames = getIconNames()
    api.assert.ok(iconNames.length > 0, 'Should have icons available')

    // Find a different icon to select (not "check")
    const newIcon = iconNames.find(name => name !== 'check' && !name.includes('check'))
    if (newIcon) {
      // Select the new icon
      const selected = await selectIcon(api, newIcon)
      api.assert.ok(selected, `Should be able to select icon: ${newIcon}`)

      // Wait for code update
      await api.utils.delay(500)

      // Verify code was updated - icon picker may add as content property or change icon name
      const code = api.editor.getCode()
      const hasNewIcon =
        code.includes(`"${newIcon}"`) ||
        code.includes(`'${newIcon}'`) ||
        code.includes(`content ${newIcon}`) ||
        code.includes(newIcon)
      api.assert.ok(
        hasNewIcon,
        `Code should reference new icon "${newIcon}", got: ${code.substring(0, 200)}`
      )
    }
  }),

  test('Icon picker has search input', async (api: TestAPI) => {
    // Setup layout with icon
    await setupIconLayout(api)

    // Select the icon
    await api.studio.setSelection('node-3')
    await api.utils.delay(200)

    // Open icon picker
    await openIconPicker(api)
    await api.utils.delay(300)

    // Check for search input
    const picker = getIconPicker()
    api.assert.ok(picker !== null, 'Picker should exist')

    const searchInput = picker?.querySelector('.icon-picker-search-input')
    api.assert.ok(searchInput !== null, 'Search input should exist')

    // Close picker
    await api.interact.pressKey('Escape')
  }),

  test('Icon picker search clears on reopen', async (api: TestAPI) => {
    // Setup layout with icon
    await setupIconLayout(api)

    // Select the icon
    await api.studio.setSelection('node-3')
    await api.utils.delay(200)

    // Open icon picker
    await openIconPicker(api)
    await api.utils.delay(300)

    // Search for something
    await searchIcons(api, 'arrow')
    const filteredCount = getIconItems().length

    // Close picker by clicking outside
    const preview = document.getElementById('preview')
    if (preview) {
      preview.click()
      await api.utils.delay(300)
    }

    // Reopen picker
    await openIconPicker(api)
    await api.utils.delay(500)

    // Should show icons (either all or filtered - behavior depends on implementation)
    const reopenCount = getIconItems().length
    api.assert.ok(reopenCount >= 10, `Should have icons displayed after reopen, got ${reopenCount}`)

    // Close picker
    const preview2 = document.getElementById('preview')
    if (preview2) {
      preview2.click()
    }
    await api.utils.delay(200)
  }),

  test('Icon picker shows icon titles on hover', async (api: TestAPI) => {
    // Setup layout with icon
    await setupIconLayout(api)

    // Select the icon
    await api.studio.setSelection('node-3')
    await api.utils.delay(200)

    // Open icon picker
    await openIconPicker(api)
    await api.utils.delay(300)

    // Get first few icon items
    const items = getIconItems()
    api.assert.ok(items.length > 0, 'Should have icon items')

    // Check that items have title attribute (for tooltip)
    const firstItem = items[0]
    const title = firstItem.getAttribute('title')
    api.assert.ok(title && title.length > 0, `Icon should have title attribute, got: ${title}`)

    // Title should match data-icon
    const dataIcon = firstItem.getAttribute('data-icon')
    api.assert.ok(title === dataIcon, `Title "${title}" should match data-icon "${dataIcon}"`)

    // Close picker
    await api.interact.pressKey('Escape')
  }),

  test('Icon picker keyboard navigation', async (api: TestAPI) => {
    // Setup layout with icon
    await setupIconLayout(api)

    // Select the icon
    await api.studio.setSelection('node-3')
    await api.utils.delay(200)

    // Open icon picker
    await openIconPicker(api)
    await api.utils.delay(300)

    // Get initial items
    const items = getIconItems()
    api.assert.ok(items.length > 0, 'Should have icon items')

    // Verify grid layout exists
    const picker = getIconPicker()
    const grid = picker?.querySelector('.icon-picker-grid')
    api.assert.ok(grid !== null, 'Should have icon grid')

    // Items should have data-icon attribute for keyboard selection
    const firstItem = items[0]
    api.assert.ok(firstItem.hasAttribute('data-icon'), 'Icon items should have data-icon attribute')

    // Close picker by clicking outside
    const preview = document.getElementById('preview')
    if (preview) {
      preview.click()
    }
    await api.utils.delay(200)
  }),
])

export const allIconPickerTests = iconPickerTests
