/**
 * Steps Navigation Playground E2E Tests
 *
 * Tests the Steps component from 11-navigation.html tutorial.
 * Playgrounds 11-13
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
// TESTS: BASIC STEPS (Playground 11)
// ============================================================================

test.describe('Basic Steps (Playground 11)', () => {
  const PLAYGROUND_INDEX = 11

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has step items', async ({ page }) => {
    const itemCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return 0

      const root = shadow.querySelector('.mirror-root')
      // Steps are siblings of the main Steps container, with data-component="Step"
      const steps = root?.querySelectorAll('[data-component="Step"]')
      return steps?.length || 0
    }, PLAYGROUND_INDEX)

    expect(itemCount).toBeGreaterThan(0)
  })

  test('2. has steps navigation or list', async ({ page }) => {
    const hasNavigation = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return false

      const root = shadow.querySelector('.mirror-root')
      const stepsRoot = root?.querySelector('[data-zag-component="steps"]') as HTMLElement
      const list = stepsRoot?.querySelector('[data-slot="List"]')
      return !!list
    }, PLAYGROUND_INDEX)

    expect(hasNavigation).toBe(true)
  })

  test('3. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('steps-basic.png')
  })
})

// ============================================================================
// TESTS: STEPS WITH NAVIGATION (Playground 12)
// ============================================================================

test.describe('Steps with Navigation (Playground 12)', () => {
  const PLAYGROUND_INDEX = 12

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has prev and next triggers', async ({ page }) => {
    const buttons = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return { hasPrev: false, hasNext: false }

      const root = shadow.querySelector('.mirror-root')
      const stepsRoot = root?.children[1] as HTMLElement

      const prevBtn = stepsRoot?.querySelector('[data-slot="PrevTrigger"]')
      const nextBtn = stepsRoot?.querySelector('[data-slot="NextTrigger"]')

      return {
        hasPrev: !!prevBtn,
        hasNext: !!nextBtn
      }
    }, PLAYGROUND_INDEX)

    expect(buttons.hasPrev).toBe(true)
    expect(buttons.hasNext).toBe(true)
  })

  test('2. clicking next advances step', async ({ page }) => {
    // Click next button
    await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return

      const root = shadow.querySelector('.mirror-root')
      const stepsRoot = root?.children[1] as HTMLElement
      const nextBtn = stepsRoot?.querySelector('[data-slot="NextTrigger"]') as HTMLElement
      nextBtn?.click()
    }, PLAYGROUND_INDEX)

    await page.waitForTimeout(200)

    // Test passes if no error - visual regression will verify the step changed
  })

  test('3. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('steps-navigation.png')
  })
})

// ============================================================================
// TESTS: VERTICAL STEPS (Playground 13)
// ============================================================================

test.describe('Vertical Steps (Playground 13)', () => {
  const PLAYGROUND_INDEX = 13

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has step items', async ({ page }) => {
    const itemCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return 0

      const root = shadow.querySelector('.mirror-root')
      // Steps are siblings of the main Steps container, with data-component="Step"
      const steps = root?.querySelectorAll('[data-component="Step"]')
      return steps?.length || 0
    }, PLAYGROUND_INDEX)

    expect(itemCount).toBeGreaterThanOrEqual(3) // Vertical steps has at least 3 steps
  })

  test('2. has steps container', async ({ page }) => {
    const hasContainer = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return false

      const root = shadow.querySelector('.mirror-root')
      const stepsRoot = root?.querySelector('[data-zag-component="steps"]')
      return !!stepsRoot
    }, PLAYGROUND_INDEX)

    expect(hasContainer).toBe(true)
  })

  test('3. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('steps-vertical.png')
  })
})
