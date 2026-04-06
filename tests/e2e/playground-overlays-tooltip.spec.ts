/**
 * E2E Tests for 12-overlays.html - Tooltip
 * Playgrounds 0-2: Basic Tooltip, Positioning, Multi-line
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
// Playground 0: Basic Tooltip
// =============================================================================
test.describe('Playground 0: Basic Tooltip', () => {
  const PLAYGROUND_INDEX = 0

  test('renders tooltip trigger button', async ({ page }) => {
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

    expect(structure.text).toContain('Hover')
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('tooltip-basic.png')
  })
})

// =============================================================================
// Playground 1: Tooltip Positioning
// =============================================================================
test.describe('Playground 1: Tooltip Positioning', () => {
  const PLAYGROUND_INDEX = 1

  test('renders multiple tooltip triggers', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      // Count buttons which are the tooltip triggers
      const buttons = root?.querySelectorAll('button')

      return {
        text: root?.textContent || '',
        buttonCount: buttons?.length || 0,
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    // Should have multiple tooltip triggers (buttons)
    expect(structure.buttonCount).toBeGreaterThanOrEqual(2)
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('tooltip-positioning.png')
  })
})

// =============================================================================
// Playground 2: Multi-line Tooltip
// =============================================================================
test.describe('Playground 2: Multi-line Tooltip', () => {
  const PLAYGROUND_INDEX = 2

  test('renders tooltip trigger button', async ({ page }) => {
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

    expect(structure.text).toContain('Multi-line')
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('tooltip-multiline.png')
  })
})
