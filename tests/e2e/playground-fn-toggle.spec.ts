/**
 * Functions - Basic Toggle Playground E2E Test
 *
 * Tests the first playground from the Functions tutorial.
 * Basic toggle() function as property syntax.
 *
 * Mirror Code being tested:
 * ```
 * Btn: Button pad 10 20, rad 6, bg #333, col white, toggle()
 *   on:
 *     bg #2563eb
 *
 * Btn "An/Aus"
 * ```
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/07-functions.html'
const PLAYGROUND_INDEX = 0 // First playground (0-indexed)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

async function getButtonInfo(page: Page): Promise<{
  text: string,
  state: string | null,
  backgroundColor: string
} | null> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null

    const root = shadow.querySelector('.mirror-root')
    if (!root) return null

    const button = root.children[1] as HTMLButtonElement
    if (!button) return null

    const styles = getComputedStyle(button)

    return {
      text: button.textContent?.trim() || '',
      state: button.getAttribute('data-state'),
      backgroundColor: styles.backgroundColor
    }
  }, PLAYGROUND_INDEX)
}

async function clickButton(page: Page): Promise<void> {
  await page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const button = root?.children[1] as HTMLButtonElement
    if (!button) throw new Error('Button not found')
    button.click()
  }, PLAYGROUND_INDEX)
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Functions - Basic Toggle Playground', () => {

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  // --------------------------------------------------------------------------
  // TEST 1: DOM Structure
  // --------------------------------------------------------------------------
  test('1. DOM structure has button with correct text', async ({ page }) => {
    const button = await getButtonInfo(page)

    expect(button).not.toBeNull()
    expect(button!.text).toBe('An/Aus')
  })

  // --------------------------------------------------------------------------
  // TEST 2: Initial State
  // --------------------------------------------------------------------------
  test('2. button starts in default state with gray background', async ({ page }) => {
    const button = await getButtonInfo(page)

    expect(button).not.toBeNull()
    expect(button!.state).toBe('default')
    // Background should be #333 (rgb(51, 51, 51))
    expect(button!.backgroundColor).toBe('rgb(51, 51, 51)')
  })

  // --------------------------------------------------------------------------
  // TEST 3: Toggle On
  // --------------------------------------------------------------------------
  test('3. clicking button toggles to on state', async ({ page }) => {
    // Click button
    await clickButton(page)
    await page.waitForTimeout(100)

    const button = await getButtonInfo(page)

    expect(button).not.toBeNull()
    expect(button!.state).toBe('on')
    // Background should be #2563eb (rgb(37, 99, 235))
    expect(button!.backgroundColor).toBe('rgb(37, 99, 235)')
  })

  // --------------------------------------------------------------------------
  // TEST 4: Toggle Off
  // --------------------------------------------------------------------------
  test('4. clicking again toggles back to default state', async ({ page }) => {
    // Click to toggle on
    await clickButton(page)
    await page.waitForTimeout(100)

    // Click to toggle off
    await clickButton(page)
    await page.waitForTimeout(100)

    const button = await getButtonInfo(page)

    expect(button).not.toBeNull()
    expect(button!.state).toBe('default')
    // Background should be back to #333
    expect(button!.backgroundColor).toBe('rgb(51, 51, 51)')
  })

  // --------------------------------------------------------------------------
  // TEST 5: Multiple Toggles
  // --------------------------------------------------------------------------
  test('5. multiple toggles work correctly', async ({ page }) => {
    // Toggle 5 times
    for (let i = 0; i < 5; i++) {
      await clickButton(page)
      await page.waitForTimeout(50)
    }

    // After odd number of clicks, should be in 'on' state
    const button = await getButtonInfo(page)
    expect(button).not.toBeNull()
    expect(button!.state).toBe('on')
    expect(button!.backgroundColor).toBe('rgb(37, 99, 235)')
  })

  // --------------------------------------------------------------------------
  // TEST 6: Visual Regression
  // --------------------------------------------------------------------------
  test('6. visual appearance matches snapshots', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    // Screenshot: initial state
    await expect(preview).toHaveScreenshot('fn-toggle-initial.png')

    // Click to toggle on
    await clickButton(page)
    await page.waitForTimeout(200)

    // Screenshot: on state
    await expect(preview).toHaveScreenshot('fn-toggle-on.png')
  })

})
