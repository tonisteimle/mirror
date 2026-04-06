/**
 * E2E Tests für 10-eingabe.html - Selection Components
 * Playgrounds 13-16: RatingGroup, SegmentedControl, ToggleGroup
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/10-eingabe.html'

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
// Playground 13: RatingGroup Basic
// =============================================================================
test.describe('Playground 13: RatingGroup Basic', () => {
  const PLAYGROUND_INDEX = 13

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 5 rating items (stars)', async ({ page }) => {
    const count = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const items = component?.querySelectorAll('[data-slot="Item"]')
      return items?.length || 0
    }, PLAYGROUND_INDEX)

    expect(count).toBe(5)
  })

  test('shows "Bewertung" label', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Bewertung')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('rating-basic.png')
  })
})

// =============================================================================
// Playground 14: RatingGroup with Half Stars
// =============================================================================
test.describe('Playground 14: RatingGroup Half Stars', () => {
  const PLAYGROUND_INDEX = 14

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 5 rating items', async ({ page }) => {
    const count = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const items = component?.querySelectorAll('[data-slot="Item"]')
      return items?.length || 0
    }, PLAYGROUND_INDEX)

    expect(count).toBe(5)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('rating-half.png')
  })
})

// =============================================================================
// Playground 15: SegmentedControl
// =============================================================================
test.describe('Playground 15: SegmentedControl', () => {
  const PLAYGROUND_INDEX = 15

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 segments (Liste, Grid, Tabelle)', async ({ page }) => {
    const segments = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const items = component?.querySelectorAll('[data-component="Segment"]')
      return Array.from(items || []).map(s => s.textContent?.trim())
    }, PLAYGROUND_INDEX)

    expect(segments).toContain('Liste')
    expect(segments).toContain('Grid')
    expect(segments).toContain('Tabelle')
  })

  test('has indicator element', async ({ page }) => {
    const hasIndicator = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return !!component?.querySelector('[data-slot="Indicator"]')
    }, PLAYGROUND_INDEX)

    expect(hasIndicator).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('segmented-control.png')
  })
})

// =============================================================================
// Playground 16: ToggleGroup
// =============================================================================
test.describe('Playground 16: ToggleGroup', () => {
  const PLAYGROUND_INDEX = 16

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 toggle items (bold, italic, underline)', async ({ page }) => {
    const count = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const items = component?.querySelectorAll('[data-component="Toggle"]')
      return items?.length || 0
    }, PLAYGROUND_INDEX)

    expect(count).toBe(3)
  })

  test('items have icons', async ({ page }) => {
    const hasIcons = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const icons = component?.querySelectorAll('svg')
      return icons && icons.length >= 3
    }, PLAYGROUND_INDEX)

    expect(hasIcons).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('toggle-group.png')
  })
})
