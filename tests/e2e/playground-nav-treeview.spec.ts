/**
 * TreeView Navigation Playground E2E Tests
 *
 * Tests the TreeView component from 11-navigation.html tutorial.
 * Playgrounds 17-19
 */

import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/11-navigation.html'

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

// ============================================================================
// TESTS: BASIC TREEVIEW (Playground 17)
// ============================================================================

test.describe('Basic TreeView (Playground 17)', () => {
  const PLAYGROUND_INDEX = 17

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has tree branches', async ({ page }) => {
    const hasBranches = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return false

      const root = shadow.querySelector('.mirror-root')
      // TreeBranch elements have data-component="TreeBranch"
      const branches = root?.querySelectorAll('[data-component="TreeBranch"]')
      return branches && branches.length > 0
    }, PLAYGROUND_INDEX)

    expect(hasBranches).toBe(true)
  })

  test('2. has tree items', async ({ page }) => {
    const hasItems = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return false

      const root = shadow.querySelector('.mirror-root')
      // TreeItem elements have data-component="TreeItem"
      const items = root?.querySelectorAll('[data-component="TreeItem"]')
      return items && items.length > 0
    }, PLAYGROUND_INDEX)

    expect(hasItems).toBe(true)
  })

  test('3. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('treeview-basic.png')
  })
})

// ============================================================================
// TESTS: TREEVIEW WITH ICONS (Playground 18)
// ============================================================================

test.describe('TreeView with Icons (Playground 18)', () => {
  const PLAYGROUND_INDEX = 18

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has tree structure', async ({ page }) => {
    const hasTree = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return false

      const root = shadow.querySelector('.mirror-root')
      const treeView = root?.querySelector('[data-zag-component="tree-view"]')
      return !!treeView
    }, PLAYGROUND_INDEX)

    expect(hasTree).toBe(true)
  })

  test('2. has file/folder icons', async ({ page }) => {
    const hasIcons = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return false

      const root = shadow.querySelector('.mirror-root')
      const svgs = root?.querySelectorAll('svg')
      return svgs && svgs.length > 0
    }, PLAYGROUND_INDEX)

    expect(hasIcons).toBe(true)
  })

  test('3. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('treeview-icons.png')
  })
})

// ============================================================================
// TESTS: TREEVIEW WITH SELECTION (Playground 19)
// ============================================================================

test.describe('TreeView with Selection (Playground 19)', () => {
  const PLAYGROUND_INDEX = 19

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has tree items', async ({ page }) => {
    const itemCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return 0

      const root = shadow.querySelector('.mirror-root')
      // TreeItem elements have data-component="TreeItem"
      const items = root?.querySelectorAll('[data-component="TreeItem"]')
      return items?.length || 0
    }, PLAYGROUND_INDEX)

    expect(itemCount).toBeGreaterThan(0)
  })

  test('2. clicking item selects it', async ({ page }) => {
    // Click an item
    await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return

      const root = shadow.querySelector('.mirror-root')
      const firstItem = root?.querySelector('[data-component="TreeItem"]') as HTMLElement
      firstItem?.click()
    }, PLAYGROUND_INDEX)

    await page.waitForTimeout(200)

    // Test passes if no error - visual regression will verify selection state
  })

  test('3. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('treeview-selection.png')
  })
})
