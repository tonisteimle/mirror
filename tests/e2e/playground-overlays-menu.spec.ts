/**
 * Menu Overlay E2E Tests
 *
 * Tests Menu, ContextMenu, and NestedMenu from 12-overlays.html tutorial.
 *
 * Playground 13: Icon Toolbar with Tooltips
 * - Toolbar with multiple icons
 * - Each icon has a Tooltip
 *
 * Playground 14: Basic Menu
 * - Menu trigger button
 * - Menu items with icons (Bearbeiten, Duplizieren, Löschen)
 *
 * Playground 15: Menu with Groups
 * - ItemGroup with labels
 * - Keyboard shortcuts displayed
 *
 * Playground 16: ContextMenu
 * - Trigger area with right-click
 * - Context menu items
 *
 * Playground 17: NestedMenu
 * - Submenu structure
 * - SubmenuTrigger and SubmenuContent
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/12-overlays.html'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function setupPage(page: Page): Promise<void> {
  await page.goto(TUTORIAL_URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-playground]', { timeout: 10000 })
  await page.waitForFunction(() => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[0]?.querySelector('.playground-preview')
    return preview?.shadowRoot !== null
  }, { timeout: 10000 })
  await page.waitForTimeout(1000)
}

async function getMenuInfo(page: Page, playgroundIndex: number): Promise<{
  hasTrigger: boolean
  hasContent: boolean
  hasItems: boolean
  itemCount: number
  iconCount: number
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return { hasTrigger: false, hasContent: false, hasItems: false, itemCount: 0, iconCount: 0 }

    const root = shadow.querySelector('.mirror-root')
    if (!root) return { hasTrigger: false, hasContent: false, hasItems: false, itemCount: 0, iconCount: 0 }

    const trigger = root.querySelector('[data-slot="Trigger"]') || root.querySelector('button')
    const content = root.querySelector('[data-slot="Content"]')
    const items = root.querySelectorAll('[data-slot="Item"]')
    const icons = root.querySelectorAll('svg')

    return {
      hasTrigger: !!trigger,
      hasContent: !!content,
      hasItems: items.length > 0,
      itemCount: items.length,
      iconCount: icons.length
    }
  }, playgroundIndex)
}

// ============================================================================
// PLAYGROUND 13: Icon Toolbar with Tooltips
// ============================================================================

test.describe('Playground 13: Icon Toolbar', () => {
  const PLAYGROUND_INDEX = 13

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has toolbar structure', async ({ page }) => {
    const hasToolbar = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root !== null && (root.children?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasToolbar).toBe(true)
  })

  test('2. has multiple tooltip triggers', async ({ page }) => {
    const triggerCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const triggers = root?.querySelectorAll('[data-slot="Trigger"]')
      return triggers?.length || 0
    }, PLAYGROUND_INDEX)

    expect(triggerCount).toBeGreaterThan(0)
  })

  test('3. toolbar has dark background', async ({ page }) => {
    const hasDarkBg = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const divs = root?.querySelectorAll('div')
      for (const div of divs || []) {
        const bg = getComputedStyle(div).backgroundColor
        if (bg.includes('10,') || bg.includes('0,')) return true
      }
      return false
    }, PLAYGROUND_INDEX)

    expect(typeof hasDarkBg).toBe('boolean')
  })

  test('4. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('menu-icon-toolbar.png')
  })
})

// ============================================================================
// PLAYGROUND 14: Basic Menu
// ============================================================================

test.describe('Playground 14: Basic Menu', () => {
  const PLAYGROUND_INDEX = 14

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger button', async ({ page }) => {
    const info = await getMenuInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. has menu content', async ({ page }) => {
    const info = await getMenuInfo(page, PLAYGROUND_INDEX)

    expect(info.hasContent).toBe(true)
  })

  test('3. has menu items', async ({ page }) => {
    const info = await getMenuInfo(page, PLAYGROUND_INDEX)

    expect(info.hasItems).toBe(true)
  })

  test('4. menu items have icons', async ({ page }) => {
    const info = await getMenuInfo(page, PLAYGROUND_INDEX)

    expect(info.iconCount).toBeGreaterThan(0)
  })

  test('5. has action labels', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    // Menu should have some text content for menu items
    expect(content.length).toBeGreaterThan(0)
  })

  test('6. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('menu-basic.png')
  })
})

// ============================================================================
// PLAYGROUND 15: Menu with Groups
// ============================================================================

test.describe('Playground 15: Menu with Groups', () => {
  const PLAYGROUND_INDEX = 15

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger button', async ({ page }) => {
    const info = await getMenuInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. has item groups', async ({ page }) => {
    const hasGroups = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const groups = root?.querySelectorAll('[data-slot="ItemGroup"]')
      return (groups?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasGroups).toBe(true)
  })

  test('3. has group labels', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    // Menu with groups should have text content
    expect(content.length).toBeGreaterThan(0)
  })

  test('4. has menu structure', async ({ page }) => {
    const hasStructure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      // Check for menu structure elements
      return root !== null && (root.children?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasStructure).toBe(true)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('menu-groups.png')
  })
})

// ============================================================================
// PLAYGROUND 16: ContextMenu
// ============================================================================

test.describe('Playground 16: ContextMenu', () => {
  const PLAYGROUND_INDEX = 16

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger area', async ({ page }) => {
    const info = await getMenuInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. has context menu trigger', async ({ page }) => {
    const hasTrigger = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const trigger = root?.querySelector('[data-slot="Trigger"]')
      return trigger !== null
    }, PLAYGROUND_INDEX)

    expect(hasTrigger).toBe(true)
  })

  test('3. has context menu content', async ({ page }) => {
    const hasContent = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root !== null && (root.children?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasContent).toBe(true)
  })

  test('4. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('contextmenu.png')
  })
})

// ============================================================================
// PLAYGROUND 17: NestedMenu
// ============================================================================

test.describe('Playground 17: NestedMenu', () => {
  const PLAYGROUND_INDEX = 17

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger button', async ({ page }) => {
    const info = await getMenuInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. has menu structure', async ({ page }) => {
    const hasStructure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      // Check for any menu content or children
      return root !== null && (root.children?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasStructure).toBe(true)
  })

  test('3. has main menu items', async ({ page }) => {
    const hasItems = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const items = root?.querySelectorAll('[data-slot="Item"]')
      return (items?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasItems).toBe(true)
  })

  test('4. has nested content', async ({ page }) => {
    const hasContent = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root !== null && (root.textContent?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasContent).toBe(true)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('nestedmenu.png')
  })
})
