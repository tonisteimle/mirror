/**
 * E2E Tests for 12-overlays.html - Menu, ContextMenu, NestedMenu
 * Playgrounds 13-17: Icon Toolbar, Menu, ContextMenu, NestedMenu
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/12-overlays.html'

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

// =============================================================================
// Playground 13: Icon Toolbar with Tooltips
// =============================================================================
test.describe('Playground 13: Icon Toolbar', () => {
  const PLAYGROUND_INDEX = 13

  test('renders icon toolbar with icons', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        hasIcons: root?.querySelectorAll('svg').length >= 3,
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasIcons).toBe(true)
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('menu-icon-toolbar.png')
  })
})

// =============================================================================
// Playground 14: Basic Menu
// =============================================================================
test.describe('Playground 14: Basic Menu', () => {
  const PLAYGROUND_INDEX = 14

  test('renders menu trigger button', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        text: root?.textContent || '',
        hasButton: root?.querySelector('button') !== null,
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Aktionen')
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('menu-basic.png')
  })
})

// =============================================================================
// Playground 15: Menu with Groups
// =============================================================================
test.describe('Playground 15: Menu with Groups', () => {
  const PLAYGROUND_INDEX = 15

  test('renders menu trigger', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        text: root?.textContent || '',
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Datei')
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('menu-groups.png')
  })
})

// =============================================================================
// Playground 16: ContextMenu
// =============================================================================
test.describe('Playground 16: ContextMenu', () => {
  const PLAYGROUND_INDEX = 16

  test('renders context menu trigger area', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        text: root?.textContent || '',
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Rechtsklick')
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('contextmenu.png')
  })
})

// =============================================================================
// Playground 17: NestedMenu
// =============================================================================
test.describe('Playground 17: NestedMenu', () => {
  const PLAYGROUND_INDEX = 17

  test('renders nested menu trigger', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        text: root?.textContent || '',
        hasButton: root?.querySelector('button') !== null,
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    // German: "Menü"
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('nestedmenu.png')
  })
})
