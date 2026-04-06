/**
 * Toggle Switch Playground E2E Test
 *
 * Tests the "State-Namen sind frei wählbar" playground from the States tutorial.
 * This playground demonstrates a custom toggle switch component with:
 * - Custom state name "active:" (showing state names are flexible)
 * - Visual toggle with thumb that moves left/right
 * - Content variants (different child styling in each state)
 *
 * Mirror Code being tested:
 * ```
 * Toggle: w 44, h 24, rad 99, bg #333, pad 2, cursor pointer, toggle()
 *   Frame w 20, h 20, rad 99, bg #666
 *   active:
 *     bg #2563eb
 *     Frame w 20, h 20, rad 99, bg white, margin 0 0 0 20
 *
 * Toggle
 * ```
 *
 * Key features:
 * - Custom component that looks like iOS/Android toggle switch
 * - "active:" state name (not "on:")
 * - Thumb moves from left (default) to right (active) using margin
 * - Background: gray (#333) → blue (#2563eb)
 * - Thumb: gray (#666) → white
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/06-states.html'
const PLAYGROUND_INDEX = 4 // 5th playground (0-indexed)

const COLORS = {
  trackDefault: { r: 51, g: 51, b: 51, tolerance: 15 },    // #333
  trackActive: { r: 37, g: 99, b: 235, tolerance: 20 },    // #2563eb
  thumbDefault: { r: 102, g: 102, b: 102, tolerance: 15 }, // #666
  thumbActive: { r: 255, g: 255, b: 255, tolerance: 5 },   // white
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface ColorSpec {
  r: number
  g: number
  b: number
  tolerance: number
}

function parseRgb(rgb: string): { r: number, g: number, b: number } | null {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return null
  return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) }
}

function colorsMatch(actual: string, expected: ColorSpec): boolean {
  const parsed = parseRgb(actual)
  if (!parsed) return false
  return Math.abs(parsed.r - expected.r) <= expected.tolerance &&
         Math.abs(parsed.g - expected.g) <= expected.tolerance &&
         Math.abs(parsed.b - expected.b) <= expected.tolerance
}

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

async function getToggleState(page: Page): Promise<string | null> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null

    const root = shadow.querySelector('.mirror-root')
    const toggle = root?.children[1] as HTMLElement  // The Toggle component
    return toggle?.getAttribute('data-state')
  }, PLAYGROUND_INDEX)
}

async function getToggleStyles(page: Page): Promise<{
  trackBg: string,
  thumbBg: string,
  thumbMargin: string
} | null> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null

    const root = shadow.querySelector('.mirror-root')
    const toggle = root?.children[1] as HTMLElement  // The Toggle (track)
    if (!toggle) return null

    const thumb = toggle.children[0] as HTMLElement  // The Frame (thumb)
    if (!thumb) return null

    const trackStyles = getComputedStyle(toggle)
    const thumbStyles = getComputedStyle(thumb)

    return {
      trackBg: trackStyles.backgroundColor,
      thumbBg: thumbStyles.backgroundColor,
      thumbMargin: thumbStyles.margin
    }
  }, PLAYGROUND_INDEX)
}

async function clickToggle(page: Page): Promise<void> {
  await page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const toggle = root?.children[1] as HTMLElement
    if (!toggle) throw new Error('Toggle not found')
    toggle.click()
  }, PLAYGROUND_INDEX)
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Toggle Switch Playground', () => {

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

      const toggle = root.children[1] as HTMLElement
      if (!toggle) return null

      const toggleStyles = getComputedStyle(toggle)
      const thumb = toggle.children[0] as HTMLElement

      return {
        hasRoot: true,
        toggleExists: !!toggle,
        hasThumb: !!thumb,
        toggleWidth: toggleStyles.width,
        toggleHeight: toggleStyles.height,
        toggleRadius: toggleStyles.borderRadius,
        toggleCursor: toggleStyles.cursor,
      }
    }, PLAYGROUND_INDEX)

    expect(structure).not.toBeNull()
    expect(structure!.hasRoot).toBe(true)
    expect(structure!.toggleExists).toBe(true)
    expect(structure!.hasThumb).toBe(true)
    expect(structure!.toggleWidth).toBe('44px')
    expect(structure!.toggleHeight).toBe('24px')
    expect(structure!.toggleRadius).toBe('99px')  // Pill shape
    expect(structure!.toggleCursor).toBe('pointer')
  })

  // --------------------------------------------------------------------------
  // TEST 2: Initial State (Default/Off)
  // --------------------------------------------------------------------------
  test('2. initial state is default (off position)', async ({ page }) => {
    const state = await getToggleState(page)
    expect(state).toBe('default')

    const styles = await getToggleStyles(page)
    expect(styles).not.toBeNull()

    // Track should be gray
    expect(colorsMatch(styles!.trackBg, COLORS.trackDefault)).toBe(true)

    // Thumb should be gray
    expect(colorsMatch(styles!.thumbBg, COLORS.thumbDefault)).toBe(true)

    // Thumb should be on the left (no margin-left or 0)
    expect(styles!.thumbMargin).toMatch(/^0px/)
  })

  // --------------------------------------------------------------------------
  // TEST 3: First Click → Active State
  // --------------------------------------------------------------------------
  test('3. first click activates toggle', async ({ page }) => {
    await clickToggle(page)
    await page.waitForTimeout(100)

    const state = await getToggleState(page)
    expect(state).toBe('active')

    const styles = await getToggleStyles(page)
    expect(styles).not.toBeNull()

    // Track should be blue
    expect(colorsMatch(styles!.trackBg, COLORS.trackActive)).toBe(true)

    // Thumb should be white
    expect(colorsMatch(styles!.thumbBg, COLORS.thumbActive)).toBe(true)

    // Thumb should be on the right (margin-left: 20px)
    expect(styles!.thumbMargin).toContain('20px')
  })

  // --------------------------------------------------------------------------
  // TEST 4: Second Click → Back to Default
  // --------------------------------------------------------------------------
  test('4. second click deactivates toggle', async ({ page }) => {
    // Activate
    await clickToggle(page)
    await page.waitForTimeout(100)

    // Deactivate
    await clickToggle(page)
    await page.waitForTimeout(100)

    const state = await getToggleState(page)
    expect(state).toBe('default')

    const styles = await getToggleStyles(page)
    expect(styles).not.toBeNull()

    // Back to gray track
    expect(colorsMatch(styles!.trackBg, COLORS.trackDefault)).toBe(true)

    // Back to gray thumb
    expect(colorsMatch(styles!.thumbBg, COLORS.thumbDefault)).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 5: Thumb Size Consistency
  // --------------------------------------------------------------------------
  test('5. thumb maintains size across states', async ({ page }) => {
    // Check thumb size in default state
    const thumbDefault = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const toggle = root?.children[1] as HTMLElement
      const thumb = toggle?.children[0] as HTMLElement
      if (!thumb) return null
      const styles = getComputedStyle(thumb)
      return {
        width: styles.width,
        height: styles.height,
        borderRadius: styles.borderRadius
      }
    }, PLAYGROUND_INDEX)

    expect(thumbDefault).not.toBeNull()
    expect(thumbDefault!.width).toBe('20px')
    expect(thumbDefault!.height).toBe('20px')
    expect(thumbDefault!.borderRadius).toBe('99px')  // Circle

    // Activate and check thumb size
    await clickToggle(page)
    await page.waitForTimeout(100)

    const thumbActive = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const toggle = root?.children[1] as HTMLElement
      const thumb = toggle?.children[0] as HTMLElement
      if (!thumb) return null
      const styles = getComputedStyle(thumb)
      return {
        width: styles.width,
        height: styles.height,
        borderRadius: styles.borderRadius
      }
    }, PLAYGROUND_INDEX)

    expect(thumbActive).not.toBeNull()
    expect(thumbActive!.width).toBe('20px')
    expect(thumbActive!.height).toBe('20px')
    expect(thumbActive!.borderRadius).toBe('99px')
  })

  // --------------------------------------------------------------------------
  // TEST 6: Full Toggle Cycle
  // --------------------------------------------------------------------------
  test('6. validates full toggle cycle', async ({ page }) => {
    const expectedCycle = [
      { state: 'default', trackColor: COLORS.trackDefault },
      { state: 'active', trackColor: COLORS.trackActive },
      { state: 'default', trackColor: COLORS.trackDefault },
      { state: 'active', trackColor: COLORS.trackActive },
    ]

    for (let i = 0; i < expectedCycle.length; i++) {
      const expected = expectedCycle[i]

      const state = await getToggleState(page)
      const styles = await getToggleStyles(page)

      expect(state).toBe(expected.state)
      expect(colorsMatch(styles!.trackBg, expected.trackColor)).toBe(true)

      // Click to advance
      await clickToggle(page)
      await page.waitForTimeout(100)
    }
  })

  // --------------------------------------------------------------------------
  // TEST 7: Padding Creates Proper Spacing
  // --------------------------------------------------------------------------
  test('7. toggle has correct padding for thumb spacing', async ({ page }) => {
    const padding = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const toggle = root?.children[1] as HTMLElement
      if (!toggle) return null
      return getComputedStyle(toggle).padding
    }, PLAYGROUND_INDEX)

    expect(padding).toBe('2px')
  })

  // --------------------------------------------------------------------------
  // TEST 8: Rapid Toggle Stress Test
  // --------------------------------------------------------------------------
  test('8. handles rapid toggling without breaking', async ({ page }) => {
    // Toggle 10 times rapidly
    for (let i = 0; i < 10; i++) {
      await clickToggle(page)
      await page.waitForTimeout(30)
    }

    await page.waitForTimeout(200)

    // After even number of toggles, should be back to default
    const state = await getToggleState(page)
    expect(state).toBe('default')

    const styles = await getToggleStyles(page)
    expect(colorsMatch(styles!.trackBg, COLORS.trackDefault)).toBe(true)

    // One more toggle should work
    await clickToggle(page)
    await page.waitForTimeout(100)

    const newState = await getToggleState(page)
    expect(newState).toBe('active')
  })

  // --------------------------------------------------------------------------
  // TEST 9: Visual Regression
  // --------------------------------------------------------------------------
  test('9. visual appearance matches snapshots', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    // Screenshot: off state
    await expect(preview).toHaveScreenshot('toggle-switch-off.png')

    // Click to activate
    await clickToggle(page)
    await page.waitForTimeout(200)

    // Screenshot: on state
    await expect(preview).toHaveScreenshot('toggle-switch-on.png')
  })

})
