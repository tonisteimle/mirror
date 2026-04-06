/**
 * Hover/Active Playground E2E Test
 *
 * Tests the system states playground from the States tutorial.
 *
 * NOTE: CSS pseudo-classes (:hover, :active) are challenging to test
 * programmatically in Shadow DOM. This test focuses on verifiable aspects:
 * - DOM structure
 * - Base styling
 * - Visual regression (screenshot captures actual rendering)
 *
 * Mirror Code being tested:
 * ```
 * Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer
 *   hover:
 *     bg #444
 *   active:
 *     bg #222
 *     scale 0.98
 *
 * Btn "Hover und Klick mich"
 * ```
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/06-states.html'
const PLAYGROUND_INDEX = 1 // Second playground (0-indexed)

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

// ============================================================================
// TESTS
// ============================================================================

test.describe('Hover/Active Playground (System States)', () => {

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  // --------------------------------------------------------------------------
  // TEST 1: DOM Structure
  // --------------------------------------------------------------------------
  test('1. DOM structure is correct', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      if (!root) return null

      const button = root.children[1] as HTMLElement
      if (!button) return null

      return {
        hasRoot: true,
        buttonExists: !!button,
        buttonText: button.textContent?.trim() || ''
      }
    }, PLAYGROUND_INDEX)

    expect(structure).not.toBeNull()
    expect(structure!.hasRoot).toBe(true)
    expect(structure!.buttonExists).toBe(true)
    expect(structure!.buttonText).toBe('Hover und Klick mich')
  })

  // --------------------------------------------------------------------------
  // TEST 2: Base Styling
  // --------------------------------------------------------------------------
  test('2. base styling is correctly applied', async ({ page }) => {
    const styles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      const button = root?.children[1] as HTMLElement
      if (!button) return null

      const computed = getComputedStyle(button)

      return {
        padding: computed.padding,
        borderRadius: computed.borderRadius,
        cursor: computed.cursor,
        backgroundColor: computed.backgroundColor,
        color: computed.color
      }
    }, PLAYGROUND_INDEX)

    expect(styles).not.toBeNull()
    expect(styles!.padding).toBe('12px 24px')
    expect(styles!.borderRadius).toBe('6px')
    expect(styles!.cursor).toBe('pointer')
    // Background should be #333 (rgb(51, 51, 51))
    expect(styles!.backgroundColor).toBe('rgb(51, 51, 51)')
  })

  // --------------------------------------------------------------------------
  // TEST 3: Button Has States Defined (via stylesheet)
  // --------------------------------------------------------------------------
  test('3. component has hover and active states in stylesheet', async ({ page }) => {
    const hasStyles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      // Check if there are style rules for hover/active
      const styleSheet = shadow.querySelector('style')
      if (!styleSheet) return { hasStyle: false, content: '' }

      const content = styleSheet.textContent || ''
      return {
        hasStyle: true,
        hasHover: content.includes(':hover'),
        hasActive: content.includes(':active'),
        content: content.substring(0, 500)
      }
    }, PLAYGROUND_INDEX)

    expect(hasStyles).not.toBeNull()
    expect(hasStyles!.hasStyle).toBe(true)
    // The stylesheet should contain hover and active rules
    expect(hasStyles!.hasHover).toBe(true)
    expect(hasStyles!.hasActive).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 4: Visual Regression
  // --------------------------------------------------------------------------
  test('4. visual appearance matches snapshot', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('hover-active-base.png')
  })

})
