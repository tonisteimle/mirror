/**
 * Pagination Navigation Playground E2E Tests
 *
 * Tests the Pagination component from 11-navigation.html tutorial.
 * Playgrounds 14-16
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
// TESTS: BASIC PAGINATION (Playground 14)
// ============================================================================

test.describe('Basic Pagination (Playground 14)', () => {
  const PLAYGROUND_INDEX = 14

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has prev and next triggers', async ({ page }) => {
    const triggers = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return { hasPrev: false, hasNext: false }

      const root = shadow.querySelector('.mirror-root')
      const paginationRoot = root?.children[1] as HTMLElement

      const prevBtn = paginationRoot?.querySelector('[data-slot="PrevTrigger"]')
      const nextBtn = paginationRoot?.querySelector('[data-slot="NextTrigger"]')

      return {
        hasPrev: !!prevBtn,
        hasNext: !!nextBtn
      }
    }, PLAYGROUND_INDEX)

    expect(triggers.hasPrev).toBe(true)
    expect(triggers.hasNext).toBe(true)
  })

  test('2. has page items', async ({ page }) => {
    const itemCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return 0

      const root = shadow.querySelector('.mirror-root')
      const paginationRoot = root?.children[1] as HTMLElement
      const items = paginationRoot?.querySelectorAll('[data-slot="Item"]')
      return items?.length || 0
    }, PLAYGROUND_INDEX)

    expect(itemCount).toBeGreaterThan(0)
  })

  test('3. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('pagination-basic.png')
  })
})

// ============================================================================
// TESTS: COMPACT PAGINATION (Playground 15)
// ============================================================================

test.describe('Compact Pagination (Playground 15)', () => {
  const PLAYGROUND_INDEX = 15

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has page navigation elements', async ({ page }) => {
    const hasElements = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return false

      const root = shadow.querySelector('.mirror-root')
      const paginationRoot = root?.children[1] as HTMLElement

      return !!paginationRoot
    }, PLAYGROUND_INDEX)

    expect(hasElements).toBe(true)
  })

  test('2. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('pagination-compact.png')
  })
})

// ============================================================================
// TESTS: PAGINATION WITH INFO (Playground 16)
// ============================================================================

test.describe('Pagination with Info (Playground 16)', () => {
  const PLAYGROUND_INDEX = 16

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has page info text', async ({ page }) => {
    const hasInfo = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return false

      const root = shadow.querySelector('.mirror-root')
      const wrapper = root?.children[1] as HTMLElement
      const text = wrapper?.textContent || ''

      // Should contain page info like "Seite 3 von 15"
      return text.includes('Seite') || text.includes('Page') || text.includes('von') || text.includes('of')
    }, PLAYGROUND_INDEX)

    expect(hasInfo).toBe(true)
  })

  test('2. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('pagination-with-info.png')
  })
})
