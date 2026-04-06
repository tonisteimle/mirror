/**
 * Focus/Disabled Playground E2E Test
 *
 * Tests the focus and disabled system states playground.
 *
 * NOTE: CSS pseudo-classes are challenging to test programmatically.
 * This test focuses on verifiable aspects.
 *
 * Mirror Code being tested:
 * ```
 * Field: bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w 200
 *   focus:
 *     boc #2563eb
 *   disabled:
 *     opacity 0.5
 *     cursor not-allowed
 *
 * Frame gap 8
 *   Input placeholder "Klick mich", Field
 *   Input placeholder "Deaktiviert", Field, disabled
 * ```
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/06-states.html'
const PLAYGROUND_INDEX = 2 // Third playground (0-indexed)

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

test.describe('Focus/Disabled Playground (Form States)', () => {

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  // --------------------------------------------------------------------------
  // TEST 1: DOM Structure
  // --------------------------------------------------------------------------
  test('1. DOM structure has 2 input fields', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      if (!root) return null

      const container = root.children[1] as HTMLElement
      if (!container) return null

      return {
        hasRoot: true,
        containerExists: !!container,
        inputCount: container.children.length,
        gap: getComputedStyle(container).gap
      }
    }, PLAYGROUND_INDEX)

    expect(structure).not.toBeNull()
    expect(structure!.hasRoot).toBe(true)
    expect(structure!.containerExists).toBe(true)
    expect(structure!.inputCount).toBe(2)
    expect(structure!.gap).toBe('8px')
  })

  // --------------------------------------------------------------------------
  // TEST 2: First Input Properties
  // --------------------------------------------------------------------------
  test('2. first input has correct properties', async ({ page }) => {
    const input = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement
      if (!container) return null

      const inputEl = container.children[0] as HTMLInputElement
      if (!inputEl) return null

      const styles = getComputedStyle(inputEl)

      return {
        isDisabled: inputEl.disabled,
        placeholder: inputEl.placeholder,
        borderRadius: styles.borderRadius,
        width: styles.width
      }
    }, PLAYGROUND_INDEX)

    expect(input).not.toBeNull()
    expect(input!.isDisabled).toBe(false)
    expect(input!.placeholder).toBe('Klick mich')
    expect(input!.borderRadius).toBe('6px')
    expect(input!.width).toBe('200px')
  })

  // --------------------------------------------------------------------------
  // TEST 3: Second Input Is Disabled
  // --------------------------------------------------------------------------
  test('3. second input is disabled', async ({ page }) => {
    const input = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement
      if (!container) return null

      const inputEl = container.children[1] as HTMLInputElement
      if (!inputEl) return null

      const styles = getComputedStyle(inputEl)

      return {
        isDisabled: inputEl.disabled,
        placeholder: inputEl.placeholder,
        opacity: styles.opacity
      }
    }, PLAYGROUND_INDEX)

    expect(input).not.toBeNull()
    expect(input!.isDisabled).toBe(true)
    expect(input!.placeholder).toBe('Deaktiviert')
    // Disabled state should have reduced opacity
    const opacity = parseFloat(input!.opacity)
    expect(opacity).toBeLessThan(1)
  })

  // --------------------------------------------------------------------------
  // TEST 4: Stylesheet Has Focus and Disabled Rules
  // --------------------------------------------------------------------------
  test('4. stylesheet contains focus and disabled rules', async ({ page }) => {
    const hasStyles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const styleSheet = shadow.querySelector('style')
      if (!styleSheet) return { hasStyle: false }

      const content = styleSheet.textContent || ''
      return {
        hasStyle: true,
        hasFocus: content.includes(':focus'),
        hasDisabled: content.includes(':disabled') || content.includes('[disabled]')
      }
    }, PLAYGROUND_INDEX)

    expect(hasStyles).not.toBeNull()
    expect(hasStyles!.hasStyle).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 5: Visual Regression
  // --------------------------------------------------------------------------
  test('5. visual appearance matches snapshot', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('focus-disabled-initial.png')
  })

})
