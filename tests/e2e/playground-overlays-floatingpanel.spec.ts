/**
 * FloatingPanel Overlay E2E Tests
 *
 * Tests FloatingPanel from 12-overlays.html tutorial.
 * FloatingPanels are draggable, positionable panels.
 *
 * Playground 18: FloatingPanel Draggable
 * - Trigger button to open panel
 * - Draggable panel with header
 * - Content area
 *
 * Playground 19: FloatingPanel Fixed Position
 * - Inspector-style panel
 * - Fixed position on screen
 * - Panel content with controls
 *
 * Playground 20: FloatingPanel Resizable
 * - Resizable panel with notes
 * - Resize handles
 * - Panel can be resized by user
 *
 * Key behaviors:
 * - Panels can be opened/closed via trigger
 * - Draggable panels can be moved
 * - Resizable panels have resize handles
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

async function getFloatingPanelInfo(page: Page, playgroundIndex: number): Promise<{
  hasTrigger: boolean
  hasContent: boolean
  hasHeader: boolean
  hasCloseButton: boolean
  childCount: number
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return { hasTrigger: false, hasContent: false, hasHeader: false, hasCloseButton: false, childCount: 0 }

    const root = shadow.querySelector('.mirror-root')
    if (!root) return { hasTrigger: false, hasContent: false, hasHeader: false, hasCloseButton: false, childCount: 0 }

    const trigger = root.querySelector('[data-slot="Trigger"]') || root.querySelector('button')
    const content = root.querySelector('[data-slot="Content"]')
    const header = root.querySelector('[data-slot="Header"]')
    const closeBtn = root.querySelector('[data-slot="CloseTrigger"]')

    return {
      hasTrigger: !!trigger,
      hasContent: !!content,
      hasHeader: !!header,
      hasCloseButton: !!closeBtn,
      childCount: root.children?.length || 0
    }
  }, playgroundIndex)
}

// ============================================================================
// PLAYGROUND 18: FloatingPanel Draggable
// ============================================================================

test.describe('Playground 18: FloatingPanel Draggable', () => {
  const PLAYGROUND_INDEX = 18

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger button', async ({ page }) => {
    const info = await getFloatingPanelInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. has panel content', async ({ page }) => {
    const info = await getFloatingPanelInfo(page, PLAYGROUND_INDEX)

    expect(info.hasContent).toBe(true)
  })

  test('3. has structure with children', async ({ page }) => {
    const info = await getFloatingPanelInfo(page, PLAYGROUND_INDEX)

    expect(info.childCount).toBeGreaterThan(0)
  })

  test('4. trigger is clickable button', async ({ page }) => {
    const isButton = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const button = root?.querySelector('button')
      return button !== null
    }, PLAYGROUND_INDEX)

    expect(isButton).toBe(true)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('floatingpanel-draggable.png')
  })
})

// ============================================================================
// PLAYGROUND 19: FloatingPanel Fixed Position
// ============================================================================

test.describe('Playground 19: FloatingPanel Fixed Position', () => {
  const PLAYGROUND_INDEX = 19

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger button', async ({ page }) => {
    const info = await getFloatingPanelInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. has panel content', async ({ page }) => {
    const info = await getFloatingPanelInfo(page, PLAYGROUND_INDEX)

    expect(info.hasContent).toBe(true)
  })

  test('3. has structure with children', async ({ page }) => {
    const info = await getFloatingPanelInfo(page, PLAYGROUND_INDEX)

    expect(info.childCount).toBeGreaterThan(0)
  })

  test('4. panel has text content', async ({ page }) => {
    const hasText = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return (root?.textContent?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasText).toBe(true)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('floatingpanel-fixed.png')
  })
})

// ============================================================================
// PLAYGROUND 20: FloatingPanel Resizable
// ============================================================================

test.describe('Playground 20: FloatingPanel Resizable', () => {
  const PLAYGROUND_INDEX = 20

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger button', async ({ page }) => {
    const info = await getFloatingPanelInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. has panel content', async ({ page }) => {
    const info = await getFloatingPanelInfo(page, PLAYGROUND_INDEX)

    expect(info.hasContent).toBe(true)
  })

  test('3. has structure with children', async ({ page }) => {
    const info = await getFloatingPanelInfo(page, PLAYGROUND_INDEX)

    expect(info.childCount).toBeGreaterThan(0)
  })

  test('4. has text content', async ({ page }) => {
    const hasText = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return (root?.textContent?.length || 0) > 0
    }, PLAYGROUND_INDEX)

    expect(hasText).toBe(true)
  })

  test('5. panel has multiple elements', async ({ page }) => {
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

  test('6. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('floatingpanel-resizable.png')
  })
})
