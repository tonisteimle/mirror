/**
 * E2E Tests for 12-overlays.html - HoverCard
 * Playgrounds 6-7: Basic HoverCard, User Profile
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
// Playground 6: Basic HoverCard
// =============================================================================
test.describe('Playground 6: Basic HoverCard', () => {
  const PLAYGROUND_INDEX = 6

  test('renders hovercard trigger', async ({ page }) => {
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
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('hovercard-basic.png')
  })
})

// =============================================================================
// Playground 7: HoverCard User Profile
// =============================================================================
test.describe('Playground 7: HoverCard User Profile', () => {
  const PLAYGROUND_INDEX = 7

  test('renders user mention trigger', async ({ page }) => {
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

    // Should contain user mention text
    expect(structure.text).toContain('@')
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('hovercard-userprofile.png')
  })
})
