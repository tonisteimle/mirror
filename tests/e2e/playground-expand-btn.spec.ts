/**
 * ExpandBtn Playground E2E Test
 *
 * Tests the "States können alles ändern" playground from the States tutorial chapter.
 * This playground demonstrates "Content Variants" - states with completely different
 * children (text + icon), not just different styling.
 *
 * Mirror Code being tested:
 * ```
 * ExpandBtn: pad 12, bg #333, col white, rad 6, hor, gap 8, cursor pointer, toggle()
 *   "Mehr zeigen"
 *   Icon "chevron-down", ic white, is 16
 *   open:
 *     "Weniger zeigen"
 *     Icon "chevron-up", ic white, is 16
 *
 * ExpandBtn
 * ```
 *
 * Key feature: Like Figma Variants - each state can have completely different content,
 * not just different colors/sizes.
 *
 * State behavior:
 * - Base (default): "Mehr zeigen" + chevron-down icon
 * - Open: "Weniger zeigen" + chevron-up icon
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/06-states.html'
const PLAYGROUND_INDEX = 5 // 6th playground (0-indexed)

// Expected content for each state
const STATES = {
  default: {
    name: 'default',
    text: 'Mehr zeigen',
    icon: 'chevron-down'
  },
  open: {
    name: 'open',
    text: 'Weniger zeigen',
    icon: 'chevron-up'
  }
}

// Button styling
const BUTTON_STYLE = {
  bg: { r: 51, g: 51, b: 51, tolerance: 15 },  // #333
  color: 'rgb(255, 255, 255)',  // white
  padding: '12px',
  radius: '6px',
  gap: '8px'
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

async function getShadowStyle(page: Page, selector: string, property: string): Promise<string> {
  return page.evaluate(({ sel, prop, idx }) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return ''
    const el = shadow.querySelector(sel)
    if (!el) return ''
    return getComputedStyle(el).getPropertyValue(prop)
  }, { sel: selector, prop: property, idx: PLAYGROUND_INDEX })
}

async function clickShadowElement(page: Page, selector: string): Promise<void> {
  await page.evaluate(({ sel, idx }) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')
    const el = shadow.querySelector(sel) as HTMLElement
    if (!el) throw new Error(`Element ${sel} not found in shadow DOM`)
    el.click()
  }, { sel: selector, idx: PLAYGROUND_INDEX })
}

async function getElementState(page: Page, selector: string): Promise<string | null> {
  return page.evaluate(({ sel, idx }) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null
    const el = shadow.querySelector(sel)
    return el?.getAttribute('data-state')
  }, { sel: selector, idx: PLAYGROUND_INDEX })
}

async function getButtonText(page: Page): Promise<string> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    const root = shadow?.querySelector('.mirror-root')
    const wrapper = root?.children[1] as HTMLElement
    // Get text from the first span (which contains the text, not the icon)
    // Note: In the open state, the span may not have data-mirror-name attribute
    const firstSpan = wrapper?.querySelector('span')
    return firstSpan?.textContent?.trim() || ''
  }, PLAYGROUND_INDEX)
}

async function getIconType(page: Page): Promise<string | null> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null

    const svg = shadow.querySelector('svg')
    if (!svg) return null

    const svgClass = svg.getAttribute('class') || ''
    if (svgClass.includes('lucide-chevron-down')) return 'chevron-down'
    if (svgClass.includes('lucide-chevron-up')) return 'chevron-up'

    return 'unknown'
  }, PLAYGROUND_INDEX)
}

async function getChildCount(page: Page): Promise<number> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    const root = shadow?.querySelector('.mirror-root')
    const wrapper = root?.children[1] as HTMLElement
    return wrapper?.children.length ?? -1
  }, PLAYGROUND_INDEX)
}

const BUTTON_SELECTOR = '.mirror-root > div:nth-child(2)'

// ============================================================================
// TESTS
// ============================================================================

test.describe('ExpandBtn Playground (Content Variants)', () => {

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

      const wrapper = root.children[1] as HTMLElement
      if (!wrapper) return null

      return {
        hasRoot: true,
        wrapperExists: !!wrapper,
        childCount: wrapper.children.length,
        hasTextSpan: !!wrapper.querySelector('span[data-mirror-name="Text"]'),
        hasIconSpan: !!wrapper.querySelector('span[data-mirror-name="Icon"]'),
        hasSvg: !!wrapper.querySelector('svg'),
        isHorizontal: getComputedStyle(wrapper).flexDirection === 'row',
      }
    }, PLAYGROUND_INDEX)

    expect(structure).not.toBeNull()
    expect(structure!.hasRoot).toBe(true)
    expect(structure!.wrapperExists).toBe(true)
    expect(structure!.childCount).toBe(2) // Text + Icon
    expect(structure!.hasTextSpan).toBe(true)
    expect(structure!.hasIconSpan).toBe(true)
    expect(structure!.hasSvg).toBe(true)
    expect(structure!.isHorizontal).toBe(true) // hor layout
  })

  // --------------------------------------------------------------------------
  // TEST 2: Initial State (Base)
  // --------------------------------------------------------------------------
  test('2. initial state shows "Mehr zeigen" with chevron-down', async ({ page }) => {
    // State should be "default"
    const state = await getElementState(page, BUTTON_SELECTOR)
    expect(state).toBe('default')

    // Text should be "Mehr zeigen"
    const text = await getButtonText(page)
    expect(text).toBe(STATES.default.text)

    // Icon should be chevron-down
    const icon = await getIconType(page)
    expect(icon).toBe(STATES.default.icon)
  })

  // --------------------------------------------------------------------------
  // TEST 3: First Click → Open State
  // --------------------------------------------------------------------------
  test('3. first click shows "Weniger zeigen" with chevron-up', async ({ page }) => {
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(100)

    // State should be "open"
    const state = await getElementState(page, BUTTON_SELECTOR)
    expect(state).toBe('open')

    // Text should change to "Weniger zeigen"
    const text = await getButtonText(page)
    expect(text).toBe(STATES.open.text)

    // Icon should change to chevron-up
    const icon = await getIconType(page)
    expect(icon).toBe(STATES.open.icon)
  })

  // --------------------------------------------------------------------------
  // TEST 4: Second Click → Back to Base
  // --------------------------------------------------------------------------
  test('4. second click returns to "Mehr zeigen" with chevron-down', async ({ page }) => {
    // Click twice: default → open → default
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(100)
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(100)

    // State should be back to "default"
    const state = await getElementState(page, BUTTON_SELECTOR)
    expect(state).toBe('default')

    // Text should be back to "Mehr zeigen"
    const text = await getButtonText(page)
    expect(text).toBe(STATES.default.text)

    // Icon should be back to chevron-down
    const icon = await getIconType(page)
    expect(icon).toBe(STATES.default.icon)
  })

  // --------------------------------------------------------------------------
  // TEST 5: Content Actually Changes (not just hidden)
  // --------------------------------------------------------------------------
  test('5. content is replaced, not just hidden', async ({ page }) => {
    // In base state, should have exactly 2 children
    let childCount = await getChildCount(page)
    expect(childCount).toBe(2)

    // Click to open
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(100)

    // Still exactly 2 children (content replaced, not added)
    childCount = await getChildCount(page)
    expect(childCount).toBe(2)

    // Verify the icon SVG changed
    const svgHtml = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const svg = shadow?.querySelector('svg')
      return svg?.outerHTML || ''
    }, PLAYGROUND_INDEX)

    expect(svgHtml).toContain('chevron-up')
    expect(svgHtml).not.toContain('chevron-down')
  })

  // --------------------------------------------------------------------------
  // TEST 6: Styling Validation
  // --------------------------------------------------------------------------
  test('6. styling is correctly applied', async ({ page }) => {
    const bg = await getShadowStyle(page, BUTTON_SELECTOR, 'background-color')
    const color = await getShadowStyle(page, BUTTON_SELECTOR, 'color')
    const padding = await getShadowStyle(page, BUTTON_SELECTOR, 'padding')
    const radius = await getShadowStyle(page, BUTTON_SELECTOR, 'border-radius')
    const gap = await getShadowStyle(page, BUTTON_SELECTOR, 'gap')
    const cursor = await getShadowStyle(page, BUTTON_SELECTOR, 'cursor')

    expect(colorsMatch(bg, BUTTON_STYLE.bg)).toBe(true)
    expect(color).toBe(BUTTON_STYLE.color)
    expect(padding).toBe(BUTTON_STYLE.padding)
    expect(radius).toBe(BUTTON_STYLE.radius)
    expect(gap).toBe(BUTTON_STYLE.gap)
    expect(cursor).toBe('pointer')
  })

  // --------------------------------------------------------------------------
  // TEST 7: Styling Persists Across State Changes
  // --------------------------------------------------------------------------
  test('7. styling remains constant across states', async ({ page }) => {
    // Get initial styling
    const initialBg = await getShadowStyle(page, BUTTON_SELECTOR, 'background-color')
    const initialPad = await getShadowStyle(page, BUTTON_SELECTOR, 'padding')

    // Click to change state
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(100)

    // Styling should remain the same
    const openBg = await getShadowStyle(page, BUTTON_SELECTOR, 'background-color')
    const openPad = await getShadowStyle(page, BUTTON_SELECTOR, 'padding')

    expect(openBg).toBe(initialBg)
    expect(openPad).toBe(initialPad)
  })

  // --------------------------------------------------------------------------
  // TEST 8: Full Toggle Cycle
  // --------------------------------------------------------------------------
  test('8. validates full toggle cycle', async ({ page }) => {
    const expectedCycle = [
      { state: 'default', text: 'Mehr zeigen', icon: 'chevron-down' },
      { state: 'open', text: 'Weniger zeigen', icon: 'chevron-up' },
      { state: 'default', text: 'Mehr zeigen', icon: 'chevron-down' },
      { state: 'open', text: 'Weniger zeigen', icon: 'chevron-up' },
    ]

    for (let i = 0; i < expectedCycle.length; i++) {
      const expected = expectedCycle[i]

      const state = await getElementState(page, BUTTON_SELECTOR)
      const text = await getButtonText(page)
      const icon = await getIconType(page)

      expect(state).toBe(expected.state)
      expect(text).toBe(expected.text)
      expect(icon).toBe(expected.icon)

      // Click to advance
      await clickShadowElement(page, BUTTON_SELECTOR)
      await page.waitForTimeout(100)
    }
  })

  // --------------------------------------------------------------------------
  // TEST 9: Rapid Toggle Stress Test
  // --------------------------------------------------------------------------
  test('9. handles rapid toggling without breaking', async ({ page }) => {
    // Click 10 times rapidly
    for (let i = 0; i < 10; i++) {
      await clickShadowElement(page, BUTTON_SELECTOR)
      await page.waitForTimeout(30)
    }

    await page.waitForTimeout(200)

    // After even number of clicks, should be back to default
    const state = await getElementState(page, BUTTON_SELECTOR)
    expect(state).toBe('default')

    // Verify content is correct
    const text = await getButtonText(page)
    expect(text).toBe(STATES.default.text)

    // One more click should work
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(100)

    const newState = await getElementState(page, BUTTON_SELECTOR)
    expect(newState).toBe('open')
  })

  // --------------------------------------------------------------------------
  // TEST 10: Visual Regression
  // --------------------------------------------------------------------------
  test('10. visual appearance matches snapshots', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    // Screenshot: collapsed state
    await expect(preview).toHaveScreenshot('expand-btn-collapsed.png')

    // Click to expand
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(200)

    // Screenshot: expanded state
    await expect(preview).toHaveScreenshot('expand-btn-expanded.png')
  })

})
