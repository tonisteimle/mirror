/**
 * Simple Toggle Playground E2E Test
 *
 * Tests the very first playground from the States tutorial - the basic toggle concept.
 * This is the simplest possible state example demonstrating:
 * - Custom state definition (on:)
 * - toggle() function
 * - Base state vs active state
 *
 * Mirror Code being tested:
 * ```
 * Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer, toggle()
 *   on:
 *     bg #2563eb
 *
 * Btn "Klick mich"
 * ```
 *
 * Key features:
 * - Base state: gray background (#333)
 * - On state: blue background (#2563eb)
 * - toggle() cycles between base and on
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/06-states.html'
const PLAYGROUND_INDEX = 0 // First playground (0-indexed)

const COLORS = {
  baseBackground: { r: 51, g: 51, b: 51, tolerance: 15 },    // #333
  onBackground: { r: 37, g: 99, b: 235, tolerance: 20 },     // #2563eb
  textColor: { r: 255, g: 255, b: 255, tolerance: 10 },      // white
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

async function getButtonState(page: Page): Promise<string | null> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null

    const root = shadow.querySelector('.mirror-root')
    const button = root?.children[1] as HTMLElement  // The Btn component
    return button?.getAttribute('data-state')
  }, PLAYGROUND_INDEX)
}

async function getButtonStyles(page: Page): Promise<{
  backgroundColor: string,
  color: string,
  padding: string,
  borderRadius: string,
  cursor: string,
  text: string
} | null> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null

    const root = shadow.querySelector('.mirror-root')
    const button = root?.children[1] as HTMLElement
    if (!button) return null

    const styles = getComputedStyle(button)

    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      padding: styles.padding,
      borderRadius: styles.borderRadius,
      cursor: styles.cursor,
      text: button.textContent?.trim() || ''
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
    const button = root?.children[1] as HTMLElement
    if (!button) throw new Error('Button not found')
    button.click()
  }, PLAYGROUND_INDEX)
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Simple Toggle Playground', () => {

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
        buttonText: button.textContent?.trim() || '',
        hasSingleChild: root.children.length === 2  // style + button
      }
    }, PLAYGROUND_INDEX)

    expect(structure).not.toBeNull()
    expect(structure!.hasRoot).toBe(true)
    expect(structure!.buttonExists).toBe(true)
    expect(structure!.buttonText).toBe('Klick mich')
    expect(structure!.hasSingleChild).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 2: Initial State (Base)
  // --------------------------------------------------------------------------
  test('2. initial state is default (base state)', async ({ page }) => {
    const state = await getButtonState(page)
    expect(state).toBe('default')

    const styles = await getButtonStyles(page)
    expect(styles).not.toBeNull()

    // Base state should have gray background
    expect(colorsMatch(styles!.backgroundColor, COLORS.baseBackground)).toBe(true)

    // Text should be white
    expect(colorsMatch(styles!.color, COLORS.textColor)).toBe(true)

    // Text should be "Klick mich"
    expect(styles!.text).toBe('Klick mich')
  })

  // --------------------------------------------------------------------------
  // TEST 3: First Click → On State
  // --------------------------------------------------------------------------
  test('3. first click activates button (on state)', async ({ page }) => {
    await clickButton(page)
    await page.waitForTimeout(100)

    const state = await getButtonState(page)
    expect(state).toBe('on')

    const styles = await getButtonStyles(page)
    expect(styles).not.toBeNull()

    // On state should have blue background
    expect(colorsMatch(styles!.backgroundColor, COLORS.onBackground)).toBe(true)

    // Text should still be white
    expect(colorsMatch(styles!.color, COLORS.textColor)).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 4: Second Click → Back to Base
  // --------------------------------------------------------------------------
  test('4. second click deactivates button (back to base)', async ({ page }) => {
    // Activate
    await clickButton(page)
    await page.waitForTimeout(100)

    // Deactivate
    await clickButton(page)
    await page.waitForTimeout(100)

    const state = await getButtonState(page)
    expect(state).toBe('default')

    const styles = await getButtonStyles(page)
    expect(styles).not.toBeNull()

    // Back to gray background
    expect(colorsMatch(styles!.backgroundColor, COLORS.baseBackground)).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 5: Styling Validation
  // --------------------------------------------------------------------------
  test('5. styling is correctly applied', async ({ page }) => {
    const styles = await getButtonStyles(page)
    expect(styles).not.toBeNull()

    // Padding: 12px 24px
    expect(styles!.padding).toBe('12px 24px')

    // Border radius: 6px
    expect(styles!.borderRadius).toBe('6px')

    // Cursor: pointer
    expect(styles!.cursor).toBe('pointer')
  })

  // --------------------------------------------------------------------------
  // TEST 6: Text Content Remains Constant
  // --------------------------------------------------------------------------
  test('6. text content remains constant across states', async ({ page }) => {
    // Check text in base state
    let styles = await getButtonStyles(page)
    expect(styles!.text).toBe('Klick mich')

    // Click to on state
    await clickButton(page)
    await page.waitForTimeout(100)

    // Text should still be the same
    styles = await getButtonStyles(page)
    expect(styles!.text).toBe('Klick mich')

    // Click back to base state
    await clickButton(page)
    await page.waitForTimeout(100)

    // Text should still be the same
    styles = await getButtonStyles(page)
    expect(styles!.text).toBe('Klick mich')
  })

  // --------------------------------------------------------------------------
  // TEST 7: Full Toggle Cycle
  // --------------------------------------------------------------------------
  test('7. validates full toggle cycle', async ({ page }) => {
    const expectedCycle = [
      { state: 'default', bgColor: COLORS.baseBackground },
      { state: 'on', bgColor: COLORS.onBackground },
      { state: 'default', bgColor: COLORS.baseBackground },
      { state: 'on', bgColor: COLORS.onBackground },
    ]

    for (let i = 0; i < expectedCycle.length; i++) {
      const expected = expectedCycle[i]

      const state = await getButtonState(page)
      const styles = await getButtonStyles(page)

      expect(state).toBe(expected.state)
      expect(colorsMatch(styles!.backgroundColor, expected.bgColor)).toBe(true)

      // Click to advance
      await clickButton(page)
      await page.waitForTimeout(100)
    }
  })

  // --------------------------------------------------------------------------
  // TEST 8: Rapid Toggling Stress Test
  // --------------------------------------------------------------------------
  test('8. handles rapid toggling without breaking', async ({ page }) => {
    // Toggle 10 times rapidly
    for (let i = 0; i < 10; i++) {
      await clickButton(page)
      await page.waitForTimeout(30)
    }

    await page.waitForTimeout(200)

    // After even number of toggles, should be back to default
    const state = await getButtonState(page)
    expect(state).toBe('default')

    const styles = await getButtonStyles(page)
    expect(colorsMatch(styles!.backgroundColor, COLORS.baseBackground)).toBe(true)

    // One more toggle should work
    await clickButton(page)
    await page.waitForTimeout(100)

    const newState = await getButtonState(page)
    expect(newState).toBe('on')

    const newStyles = await getButtonStyles(page)
    expect(colorsMatch(newStyles!.backgroundColor, COLORS.onBackground)).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 9: Visual Regression
  // --------------------------------------------------------------------------
  test('9. visual appearance matches snapshots', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    // Screenshot: base state (gray)
    await expect(preview).toHaveScreenshot('simple-toggle-off.png')

    // Click to activate
    await clickButton(page)
    await page.waitForTimeout(200)

    // Screenshot: on state (blue)
    await expect(preview).toHaveScreenshot('simple-toggle-on.png')
  })

})
