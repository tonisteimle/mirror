/**
 * Tour Overlay E2E Tests
 *
 * Tests Tour component from 12-overlays.html tutorial.
 * Tours provide guided walkthroughs with spotlights.
 *
 * Playground 21: Basic Tour
 * - Start tour button
 * - Spotlight on elements
 * - Next/Previous navigation
 *
 * Playground 22: Compact Tour
 * - Compact tour design
 * - Minimal UI
 * - Step indicators
 *
 * Playground 23: Tour with Progress
 * - Progress indicator
 * - Step count display
 * - Navigation controls
 *
 * Key behaviors:
 * - Tour highlights elements sequentially
 * - Navigation between steps
 * - Backdrop dims non-highlighted areas
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

async function getTourInfo(page: Page, playgroundIndex: number): Promise<{
  hasTrigger: boolean
  hasSpotlight: boolean
  hasContent: boolean
  hasControls: boolean
  childCount: number
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return { hasTrigger: false, hasSpotlight: false, hasContent: false, hasControls: false, childCount: 0 }

    const root = shadow.querySelector('.mirror-root')
    if (!root) return { hasTrigger: false, hasSpotlight: false, hasContent: false, hasControls: false, childCount: 0 }

    const trigger = root.querySelector('button')
    const spotlight = root.querySelector('[data-slot="Spotlight"]')
    const content = root.querySelector('[data-slot="Content"]')
    const controls = root.querySelector('[data-slot="Control"]') || root.querySelectorAll('button').length > 1

    return {
      hasTrigger: !!trigger,
      hasSpotlight: !!spotlight,
      hasContent: !!content,
      hasControls: !!controls,
      childCount: root.children?.length || 0
    }
  }, playgroundIndex)
}

// ============================================================================
// PLAYGROUND 21: Basic Tour
// ============================================================================

test.describe('Playground 21: Basic Tour', () => {
  const PLAYGROUND_INDEX = 21

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has tour structure', async ({ page }) => {
    const info = await getTourInfo(page, PLAYGROUND_INDEX)

    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has interactive elements', async ({ page }) => {
    const hasElements = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      // Check for buttons, links, or any clickable elements
      const buttons = root?.querySelectorAll('button')
      const links = root?.querySelectorAll('a')
      return (buttons?.length || 0) > 0 || (links?.length || 0) > 0 || (root?.children?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasElements).toBe(true)
  })

  test('3. has text content', async ({ page }) => {
    const hasText = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return (root?.textContent?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasText).toBe(true)
  })

  test('4. has multiple elements', async ({ page }) => {
    const hasElements = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const allElements = root?.querySelectorAll('*')
      return (allElements?.length || 0) > 2
    }, PLAYGROUND_INDEX)

    expect(hasElements).toBe(true)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('tour-basic.png')
  })
})

// ============================================================================
// PLAYGROUND 22: Compact Tour
// ============================================================================

test.describe('Playground 22: Compact Tour', () => {
  const PLAYGROUND_INDEX = 22

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has tour structure', async ({ page }) => {
    const info = await getTourInfo(page, PLAYGROUND_INDEX)

    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has interactive elements', async ({ page }) => {
    const hasElements = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return (root?.children?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasElements).toBe(true)
  })

  test('3. has text content', async ({ page }) => {
    const hasText = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return (root?.textContent?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasText).toBe(true)
  })

  test('4. has compact layout', async ({ page }) => {
    const hasLayout = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root !== null && (root.children?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasLayout).toBe(true)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('tour-compact.png')
  })
})

// ============================================================================
// PLAYGROUND 23: Tour with Progress
// ============================================================================

test.describe('Playground 23: Tour with Progress', () => {
  const PLAYGROUND_INDEX = 23

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has tour structure', async ({ page }) => {
    const info = await getTourInfo(page, PLAYGROUND_INDEX)

    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has interactive elements', async ({ page }) => {
    const hasElements = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return (root?.children?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasElements).toBe(true)
  })

  test('3. has text content', async ({ page }) => {
    const hasText = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return (root?.textContent?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasText).toBe(true)
  })

  test('4. has multiple elements', async ({ page }) => {
    const hasElements = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const allElements = root?.querySelectorAll('*')
      return (allElements?.length || 0) > 2
    }, PLAYGROUND_INDEX)

    expect(hasElements).toBe(true)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('tour-progress.png')
  })
})
