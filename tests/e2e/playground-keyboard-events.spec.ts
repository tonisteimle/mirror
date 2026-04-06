/**
 * Keyboard Events Playground E2E Test
 *
 * Tests the keyboard events playground from the States tutorial.
 * onenter and onescape trigger toggle() on keyboard events.
 *
 * Mirror Code being tested:
 * ```
 * Field: bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w 220
 *   focus:
 *     boc #2563eb
 *
 * Frame gap 8
 *   Input placeholder "Enter drücken...", Field, onenter toggle()
 *     on:
 *       boc #10b981
 *       bg #10b98122
 *   Input placeholder "Escape drücken...", Field, onescape toggle()
 *     on:
 *       boc #ef4444
 *       bg #ef444422
 * ```
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/06-states.html'
const PLAYGROUND_INDEX = 10 // 11th playground (0-indexed)

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

async function getInputInfo(page: Page, inputIndex: number): Promise<{
  state: string | null,
  borderColor: string,
  backgroundColor: string,
  placeholder: string
} | null> {
  return page.evaluate(({ idx, inputIdx }) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null

    const root = shadow.querySelector('.mirror-root')
    const container = root?.children[1] as HTMLElement
    if (!container) return null

    const input = container.children[inputIdx] as HTMLInputElement
    if (!input) return null

    const styles = getComputedStyle(input)

    return {
      state: input.getAttribute('data-state'),
      borderColor: styles.borderColor,
      backgroundColor: styles.backgroundColor,
      placeholder: input.placeholder
    }
  }, { idx: PLAYGROUND_INDEX, inputIdx: inputIndex })
}

async function focusInput(page: Page, inputIndex: number): Promise<void> {
  await page.evaluate(({ idx, inputIdx }) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const container = root?.children[1] as HTMLElement
    const input = container?.children[inputIdx] as HTMLInputElement
    if (!input) throw new Error(`Input ${inputIdx} not found`)
    input.focus()
  }, { idx: PLAYGROUND_INDEX, inputIdx: inputIndex })
}

async function pressKeyOnInput(page: Page, inputIndex: number, key: string): Promise<void> {
  await page.evaluate(({ idx, inputIdx, keyToPress }) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const container = root?.children[1] as HTMLElement
    const input = container?.children[inputIdx] as HTMLInputElement
    if (!input) throw new Error(`Input ${inputIdx} not found`)

    const event = new KeyboardEvent('keydown', {
      key: keyToPress,
      code: keyToPress === 'Enter' ? 'Enter' : 'Escape',
      bubbles: true
    })
    input.dispatchEvent(event)
  }, { idx: PLAYGROUND_INDEX, inputIdx: inputIndex, keyToPress: key })
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Keyboard Events Playground', () => {

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

      const input1 = container.children[0] as HTMLInputElement
      const input2 = container.children[1] as HTMLInputElement

      return {
        hasRoot: true,
        inputCount: container.children.length,
        input1Placeholder: input1?.placeholder || '',
        input2Placeholder: input2?.placeholder || '',
        gap: getComputedStyle(container).gap
      }
    }, PLAYGROUND_INDEX)

    expect(structure).not.toBeNull()
    expect(structure!.hasRoot).toBe(true)
    expect(structure!.inputCount).toBe(2)
    expect(structure!.input1Placeholder).toBe('Enter drücken...')
    expect(structure!.input2Placeholder).toBe('Escape drücken...')
    expect(structure!.gap).toBe('8px')
  })

  // --------------------------------------------------------------------------
  // TEST 2: Initial State
  // --------------------------------------------------------------------------
  test('2. inputs start in default state', async ({ page }) => {
    const input1 = await getInputInfo(page, 0)
    const input2 = await getInputInfo(page, 1)

    expect(input1).not.toBeNull()
    expect(input2).not.toBeNull()

    // Both should be in default state
    expect(input1!.state).toBe('default')
    expect(input2!.state).toBe('default')
  })

  // --------------------------------------------------------------------------
  // TEST 3: Enter Key Toggles First Input
  // --------------------------------------------------------------------------
  test('3. Enter key toggles first input to on state', async ({ page }) => {
    // Focus first input
    await focusInput(page, 0)
    await page.waitForTimeout(100)

    // Get initial border color
    const initialInput = await getInputInfo(page, 0)
    const initialBorder = initialInput!.borderColor

    // Press Enter
    await pressKeyOnInput(page, 0, 'Enter')
    await page.waitForTimeout(100)

    const input = await getInputInfo(page, 0)
    expect(input).not.toBeNull()

    // Should be in on state
    expect(input!.state).toBe('on')

    // Border color should have changed (to green #10b981)
    expect(input!.borderColor).not.toBe(initialBorder)
  })

  // --------------------------------------------------------------------------
  // TEST 4: Escape Key Toggles Second Input
  // --------------------------------------------------------------------------
  test('4. Escape key toggles second input to on state', async ({ page }) => {
    // Focus second input
    await focusInput(page, 1)
    await page.waitForTimeout(100)

    // Get initial border color
    const initialInput = await getInputInfo(page, 1)
    const initialBorder = initialInput!.borderColor

    // Press Escape
    await pressKeyOnInput(page, 1, 'Escape')
    await page.waitForTimeout(100)

    const input = await getInputInfo(page, 1)
    expect(input).not.toBeNull()

    // Should be in on state
    expect(input!.state).toBe('on')

    // Border color should have changed (to red #ef4444)
    expect(input!.borderColor).not.toBe(initialBorder)
  })

  // --------------------------------------------------------------------------
  // TEST 5: Wrong Key Doesn't Toggle
  // --------------------------------------------------------------------------
  test('5. wrong key does not toggle input', async ({ page }) => {
    // Focus first input (expects Enter)
    await focusInput(page, 0)
    await page.waitForTimeout(100)

    // Press Escape (wrong key for first input)
    await pressKeyOnInput(page, 0, 'Escape')
    await page.waitForTimeout(100)

    const input = await getInputInfo(page, 0)
    expect(input).not.toBeNull()

    // Should NOT be in on state
    expect(input!.state).not.toBe('on')
  })

  // --------------------------------------------------------------------------
  // TEST 6: Inputs Toggle Independently
  // --------------------------------------------------------------------------
  test('6. inputs toggle independently', async ({ page }) => {
    // Toggle first input on
    await focusInput(page, 0)
    await pressKeyOnInput(page, 0, 'Enter')
    await page.waitForTimeout(100)

    // Toggle second input on
    await focusInput(page, 1)
    await pressKeyOnInput(page, 1, 'Escape')
    await page.waitForTimeout(100)

    // Check both are on
    const input1 = await getInputInfo(page, 0)
    const input2 = await getInputInfo(page, 1)

    expect(input1!.state).toBe('on')
    expect(input2!.state).toBe('on')
  })

  // --------------------------------------------------------------------------
  // TEST 7: Toggle Back Off
  // --------------------------------------------------------------------------
  test('7. pressing key again toggles input back off', async ({ page }) => {
    await focusInput(page, 0)
    await page.waitForTimeout(100)

    // Toggle on
    await pressKeyOnInput(page, 0, 'Enter')
    await page.waitForTimeout(100)
    let input = await getInputInfo(page, 0)
    expect(input!.state).toBe('on')

    // Toggle off
    await pressKeyOnInput(page, 0, 'Enter')
    await page.waitForTimeout(100)
    input = await getInputInfo(page, 0)
    expect(input!.state).toBe('default')
  })

  // --------------------------------------------------------------------------
  // TEST 8: Visual Regression
  // --------------------------------------------------------------------------
  test('8. visual appearance matches snapshots', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    // Screenshot: initial state
    await expect(preview).toHaveScreenshot('keyboard-events-initial.png')

    // Toggle first input with Enter
    await focusInput(page, 0)
    await pressKeyOnInput(page, 0, 'Enter')
    await page.waitForTimeout(200)

    // Toggle second input with Escape
    await focusInput(page, 1)
    await pressKeyOnInput(page, 1, 'Escape')
    await page.waitForTimeout(200)

    // Screenshot: both toggled
    await expect(preview).toHaveScreenshot('keyboard-events-both-on.png')
  })

})
