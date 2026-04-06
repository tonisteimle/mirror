/**
 * Functions - Menu Playground E2E Test
 *
 * Tests the third playground from the Functions tutorial.
 * Dropdown menu pattern with show() and hide().
 *
 * Mirror Code being tested:
 * ```
 * Frame gap 8, bg #0a0a0a, pad 16, rad 8
 *   Button "Menü öffnen", pad 10 20, bg #333, col white, rad 6, show(Menu)
 *
 *   Frame name Menu, hidden, bg #1a1a1a, pad 8, rad 8, gap 2, w 180
 *     Button "Profil", pad 10 16, bg transparent, col white, rad 4, w full
 *       hover:
 *         bg #333
 *     Button "Einstellungen", pad 10 16, bg transparent, col white, rad 4, w full
 *       hover:
 *         bg #333
 *     Divider bg #333, margin 4 0
 *     Button "Schließen", pad 10 16, bg #333, col white, rad 4, w full, hide(Menu)
 * ```
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/07-functions.html'
const PLAYGROUND_INDEX = 2 // Third playground (0-indexed)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function setupPage(page: Page): Promise<void> {
  await page.goto(TUTORIAL_URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-playground]', { timeout: 10000 })
  await page.waitForFunction(() => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    if (playgrounds.length === 0) return false
    const preview = playgrounds[0].querySelector('.playground-preview')
    return preview?.shadowRoot !== null
  }, { timeout: 10000 })
  await page.waitForTimeout(1000)
}

async function getMenuStructure(page: Page): Promise<{
  hasOpenButton: boolean,
  openButtonText: string,
  hasMenu: boolean,
  menuVisible: boolean,
  menuItemCount: number,
  menuItems: string[]
} | null> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null

    const root = shadow.querySelector('.mirror-root')
    if (!root) return null

    const container = root.children[1] as HTMLElement
    if (!container) return null

    const openButton = container.children[0] as HTMLButtonElement
    const menu = container.children[1] as HTMLElement

    // Menu has: Profil, Einstellungen, Divider, Schließen
    const menuItems: string[] = []
    if (menu) {
      for (let i = 0; i < menu.children.length; i++) {
        const child = menu.children[i] as HTMLElement
        const text = child.textContent?.trim()
        if (text) menuItems.push(text)
      }
    }

    const menuStyles = menu ? getComputedStyle(menu) : null

    return {
      hasOpenButton: !!openButton,
      openButtonText: openButton?.textContent?.trim() || '',
      hasMenu: !!menu,
      menuVisible: menuStyles?.display !== 'none' && menuStyles?.visibility !== 'hidden',
      menuItemCount: menu ? menu.children.length : 0,
      menuItems
    }
  }, PLAYGROUND_INDEX)
}

async function isMenuVisible(page: Page): Promise<boolean> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return false

    const root = shadow.querySelector('.mirror-root')
    const container = root?.children[1] as HTMLElement
    const menu = container?.children[1] as HTMLElement
    if (!menu) return false

    const styles = getComputedStyle(menu)
    return styles.display !== 'none' && styles.visibility !== 'hidden'
  }, PLAYGROUND_INDEX)
}

async function clickOpenMenuButton(page: Page): Promise<void> {
  await page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const container = root?.children[1] as HTMLElement
    const openButton = container?.children[0] as HTMLButtonElement
    if (!openButton) throw new Error('Open button not found')
    openButton.click()
  }, PLAYGROUND_INDEX)
}

async function clickCloseMenuButton(page: Page): Promise<void> {
  await page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const container = root?.children[1] as HTMLElement
    const menu = container?.children[1] as HTMLElement
    // Close button is the last child in the menu (index 3: Profil, Einstellungen, Divider, Schließen)
    const closeButton = menu?.children[3] as HTMLButtonElement
    if (!closeButton) throw new Error('Close button not found')
    closeButton.click()
  }, PLAYGROUND_INDEX)
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Functions - Menu Playground', () => {

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  // --------------------------------------------------------------------------
  // TEST 1: DOM Structure
  // --------------------------------------------------------------------------
  test('1. DOM structure has open button and menu with items', async ({ page }) => {
    const structure = await getMenuStructure(page)

    expect(structure).not.toBeNull()
    expect(structure!.hasOpenButton).toBe(true)
    expect(structure!.openButtonText).toBe('Menü öffnen')
    expect(structure!.hasMenu).toBe(true)
    // Menu has 4 children: Profil, Einstellungen, Divider, Schließen
    expect(structure!.menuItemCount).toBe(4)
  })

  // --------------------------------------------------------------------------
  // TEST 2: Menu Items
  // --------------------------------------------------------------------------
  test('2. menu contains correct items', async ({ page }) => {
    const structure = await getMenuStructure(page)

    expect(structure).not.toBeNull()
    // Divider has no text, so we expect: Profil, Einstellungen, Schließen
    expect(structure!.menuItems).toContain('Profil')
    expect(structure!.menuItems).toContain('Einstellungen')
    expect(structure!.menuItems).toContain('Schließen')
  })

  // --------------------------------------------------------------------------
  // TEST 3: Menu Initially Hidden
  // --------------------------------------------------------------------------
  test('3. menu starts hidden', async ({ page }) => {
    const visible = await isMenuVisible(page)
    expect(visible).toBe(false)
  })

  // --------------------------------------------------------------------------
  // TEST 4: Open Menu
  // --------------------------------------------------------------------------
  test('4. clicking open button shows menu', async ({ page }) => {
    // Verify initially hidden
    let visible = await isMenuVisible(page)
    expect(visible).toBe(false)

    // Click open button
    await clickOpenMenuButton(page)
    await page.waitForTimeout(100)

    // Verify menu is visible
    visible = await isMenuVisible(page)
    expect(visible).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 5: Close Menu
  // --------------------------------------------------------------------------
  test('5. clicking close button hides menu', async ({ page }) => {
    // First open the menu
    await clickOpenMenuButton(page)
    await page.waitForTimeout(100)

    // Verify visible
    let visible = await isMenuVisible(page)
    expect(visible).toBe(true)

    // Click close button
    await clickCloseMenuButton(page)
    await page.waitForTimeout(100)

    // Verify hidden
    visible = await isMenuVisible(page)
    expect(visible).toBe(false)
  })

  // --------------------------------------------------------------------------
  // TEST 6: Menu Width
  // --------------------------------------------------------------------------
  test('6. menu has correct width', async ({ page }) => {
    // Open menu first to get computed styles
    await clickOpenMenuButton(page)
    await page.waitForTimeout(100)

    const width = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement
      const menu = container?.children[1] as HTMLElement
      if (!menu) return null

      return getComputedStyle(menu).width
    }, PLAYGROUND_INDEX)

    expect(width).toBe('180px')
  })

  // --------------------------------------------------------------------------
  // TEST 7: Multiple Open/Close Cycles
  // --------------------------------------------------------------------------
  test('7. multiple open/close cycles work correctly', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      // Open
      await clickOpenMenuButton(page)
      await page.waitForTimeout(50)
      let visible = await isMenuVisible(page)
      expect(visible).toBe(true)

      // Close
      await clickCloseMenuButton(page)
      await page.waitForTimeout(50)
      visible = await isMenuVisible(page)
      expect(visible).toBe(false)
    }
  })

  // --------------------------------------------------------------------------
  // TEST 8: Visual Regression
  // --------------------------------------------------------------------------
  test('8. visual appearance matches snapshots', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    // Screenshot: menu closed
    await expect(preview).toHaveScreenshot('fn-menu-closed.png')

    // Open menu
    await clickOpenMenuButton(page)
    await page.waitForTimeout(200)

    // Screenshot: menu open
    await expect(preview).toHaveScreenshot('fn-menu-open.png')
  })

})
