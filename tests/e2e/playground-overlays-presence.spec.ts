/**
 * E2E Tests for 12-overlays.html - Presence
 * Playgrounds 24-26: Toggle, Slide Animation, List Items
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
// Playground 24: Presence Toggle
// =============================================================================
test.describe('Playground 24: Presence Toggle', () => {
  const PLAYGROUND_INDEX = 24

  test('renders presence with toggle button', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        hasButton: root?.querySelector('button') !== null,
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasButton).toBe(true)
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('presence-toggle.png')
  })
})

// =============================================================================
// Playground 25: Presence Slide Animation
// =============================================================================
test.describe('Playground 25: Presence Slide Animation', () => {
  const PLAYGROUND_INDEX = 25

  test('renders presence with slide animation', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        hasButton: root?.querySelector('button') !== null,
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasButton).toBe(true)
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('presence-slide.png')
  })
})

// =============================================================================
// Playground 26: Presence List Items
// =============================================================================
test.describe('Playground 26: Presence List Items', () => {
  const PLAYGROUND_INDEX = 26

  test('renders presence with list items', async ({ page }) => {
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

    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('presence-list.png')
  })
})
