/**
 * Multi-State Playground E2E Test
 *
 * Tests the "Mehrere States" playground from the States tutorial chapter.
 * This playground demonstrates cycling through multiple states (todo → doing → done).
 *
 * IMPORTANT: This playground has a quirk - components with ALL content inside states
 * (no base content) start in a "default" state that is empty. The first click
 * activates the first defined state.
 *
 * Mirror Code being tested:
 * ```
 * StatusBtn: pad 12 24, rad 6, col white, cursor pointer, hor, gap 8, toggle()
 *   todo:
 *     bg #333
 *     Icon "circle", ic white, is 14
 *   doing:
 *     bg #f59e0b
 *     Icon "clock", ic white, is 14
 *   done:
 *     bg #10b981
 *     Icon "check", ic white, is 14
 *
 * StatusBtn
 * ```
 *
 * State cycle behavior:
 * - Initial: "default" (empty - no content)
 * - Click 1: "todo" → Click 2: "doing" → Click 3: "done" → Click 4: "todo" ...
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/06-states.html'
const PLAYGROUND_INDEX = 6 // 7th playground (0-indexed)

// State definitions
const STATES = {
  default: {
    name: 'default',
    color: { r: 0, g: 0, b: 0, a: 0, tolerance: 5 },  // transparent
    icon: null  // no icon
  },
  todo: {
    name: 'todo',
    color: { r: 51, g: 51, b: 51, tolerance: 15 },      // #333
    icon: 'circle'
  },
  doing: {
    name: 'doing',
    color: { r: 245, g: 158, b: 11, tolerance: 20 },    // #f59e0b
    icon: 'clock'
  },
  done: {
    name: 'done',
    color: { r: 16, g: 185, b: 129, tolerance: 20 },    // #10b981
    icon: 'check'
  }
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

/**
 * Parse rgb(r, g, b) or rgba(r, g, b, a) string to components
 */
function parseRgb(rgb: string): { r: number, g: number, b: number } | null {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return null
  return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) }
}

/**
 * Check if two colors are close enough
 */
function colorsMatch(actual: string, expected: ColorSpec): boolean {
  const parsed = parseRgb(actual)
  if (!parsed) return false
  return Math.abs(parsed.r - expected.r) <= expected.tolerance &&
         Math.abs(parsed.g - expected.g) <= expected.tolerance &&
         Math.abs(parsed.b - expected.b) <= expected.tolerance
}

/**
 * Navigate to the tutorial page and wait for playgrounds to initialize
 */
async function setupPage(page: Page): Promise<void> {
  await page.goto(TUTORIAL_URL, { waitUntil: 'networkidle' })

  // Wait for playground elements to exist
  await page.waitForSelector('[data-playground]', { timeout: 10000 })

  // Wait for shadow DOM to be initialized
  await page.waitForFunction(() => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    if (playgrounds.length === 0) return false
    const preview = playgrounds[0].querySelector('.playground-preview')
    return preview?.shadowRoot !== null
  }, { timeout: 10000 })

  // Extra time for all playgrounds to compile
  await page.waitForTimeout(1000)
}

/**
 * Get computed style of an element inside shadow DOM
 */
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

/**
 * Click an element inside shadow DOM
 */
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

/**
 * Get the data-state attribute of an element
 */
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

/**
 * Check if an SVG icon exists with a specific type
 */
async function getIconType(page: Page): Promise<string | null> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null

    const svg = shadow.querySelector('svg')
    if (!svg) return null

    // Check for specific icon patterns in the SVG class
    const svgClass = svg.getAttribute('class') || ''
    if (svgClass.includes('lucide-circle')) return 'circle'
    if (svgClass.includes('lucide-clock')) return 'clock'
    if (svgClass.includes('lucide-check')) return 'check'

    // Fallback: check HTML content
    const html = svg.outerHTML.toLowerCase()
    if (html.includes('<circle') && !html.includes('polyline')) return 'circle'
    if (html.includes('<circle') && html.includes('<polyline')) return 'clock'
    if (html.includes('<polyline') && !html.includes('<circle')) return 'check'

    return 'unknown'
  }, PLAYGROUND_INDEX)
}

/**
 * Get the child count of the wrapper element
 */
async function getWrapperChildCount(page: Page): Promise<number> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return -1
    const root = shadow.querySelector('.mirror-root')
    const wrapper = root?.children[1] as HTMLElement
    return wrapper?.children.length ?? -1
  }, PLAYGROUND_INDEX)
}

/**
 * Get button selector - the StatusBtn is rendered as a div with button-like behavior
 */
const BUTTON_SELECTOR = '.mirror-root > div:nth-child(2)'

// ============================================================================
// TESTS
// ============================================================================

test.describe('Multi-State Playground (StatusBtn)', () => {

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  // --------------------------------------------------------------------------
  // TEST 1: DOM Structure - Initial State is "default" (empty)
  // --------------------------------------------------------------------------
  test('1. initial state is "default" with empty content', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      if (!root) return null

      // Structure: root > style + wrapper(StatusBtn)
      const wrapper = root.children[1] as HTMLElement
      if (!wrapper) return null

      return {
        hasRoot: true,
        wrapperExists: !!wrapper,
        state: wrapper.getAttribute('data-state'),
        childCount: wrapper.children.length,
        isHorizontal: getComputedStyle(wrapper).flexDirection === 'row',
      }
    }, PLAYGROUND_INDEX)

    expect(structure).not.toBeNull()
    expect(structure!.hasRoot).toBe(true)
    expect(structure!.wrapperExists).toBe(true)
    // Initial state is "default" with no children (empty)
    expect(structure!.state).toBe('default')
    expect(structure!.childCount).toBe(0)
    expect(structure!.isHorizontal).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 2: First Click → "todo" state
  // --------------------------------------------------------------------------
  test('2. first click transitions to todo (gray with circle icon)', async ({ page }) => {
    // Initial state should be "default"
    const initialState = await getElementState(page, BUTTON_SELECTOR)
    expect(initialState).toBe('default')

    // Click to activate
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(100)

    // Should now be in "todo" state
    const buttonState = await getElementState(page, BUTTON_SELECTOR)
    expect(buttonState).toBe('todo')

    // Should have content now
    const childCount = await getWrapperChildCount(page)
    expect(childCount).toBeGreaterThan(0)

    // Background should be gray (#333)
    const buttonBg = await getShadowStyle(page, BUTTON_SELECTOR, 'background-color')
    expect(colorsMatch(buttonBg, STATES.todo.color)).toBe(true)

    // Icon should be circle
    const iconType = await getIconType(page)
    expect(iconType).toBe('circle')
  })

  // --------------------------------------------------------------------------
  // TEST 3: Second Click → "doing" state
  // --------------------------------------------------------------------------
  test('3. second click transitions to doing (orange with clock icon)', async ({ page }) => {
    // Click twice: default → todo → doing
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(100)
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(150)

    // State should be "doing"
    const buttonState = await getElementState(page, BUTTON_SELECTOR)
    expect(buttonState).toBe('doing')

    // Background should be orange (#f59e0b)
    const buttonBg = await getShadowStyle(page, BUTTON_SELECTOR, 'background-color')
    expect(colorsMatch(buttonBg, STATES.doing.color)).toBe(true)

    // Icon should be clock
    const iconType = await getIconType(page)
    expect(iconType).toBe('clock')
  })

  // --------------------------------------------------------------------------
  // TEST 4: Third Click → "done" state
  // --------------------------------------------------------------------------
  test('4. third click transitions to done (green with check icon)', async ({ page }) => {
    // Click three times: default → todo → doing → done
    for (let i = 0; i < 3; i++) {
      await clickShadowElement(page, BUTTON_SELECTOR)
      await page.waitForTimeout(100)
    }

    // State should be "done"
    const buttonState = await getElementState(page, BUTTON_SELECTOR)
    expect(buttonState).toBe('done')

    // Background should be green (#10b981)
    const buttonBg = await getShadowStyle(page, BUTTON_SELECTOR, 'background-color')
    expect(colorsMatch(buttonBg, STATES.done.color)).toBe(true)

    // Icon should be check
    const iconType = await getIconType(page)
    expect(iconType).toBe('check')
  })

  // --------------------------------------------------------------------------
  // TEST 5: Fourth Click → cycles back to "todo" (not "default")
  // --------------------------------------------------------------------------
  test('5. fourth click cycles back to todo (not default)', async ({ page }) => {
    // Click four times: default → todo → doing → done → todo
    for (let i = 0; i < 4; i++) {
      await clickShadowElement(page, BUTTON_SELECTOR)
      await page.waitForTimeout(100)
    }

    // State should be back to "todo" (not "default")
    const buttonState = await getElementState(page, BUTTON_SELECTOR)
    expect(buttonState).toBe('todo')

    // Should still have content
    const childCount = await getWrapperChildCount(page)
    expect(childCount).toBeGreaterThan(0)

    // Background should be gray again
    const buttonBg = await getShadowStyle(page, BUTTON_SELECTOR, 'background-color')
    expect(colorsMatch(buttonBg, STATES.todo.color)).toBe(true)

    // Icon should be circle again
    const iconType = await getIconType(page)
    expect(iconType).toBe('circle')
  })

  // --------------------------------------------------------------------------
  // TEST 6: Full Active Cycle Validation
  // --------------------------------------------------------------------------
  test('6. validates active state cycle (todo → doing → done → todo)', async ({ page }) => {
    // First click to exit "default" state
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(100)

    // Now validate the active cycle
    const expectedCycle = ['todo', 'doing', 'done', 'todo', 'doing', 'done']

    for (let i = 0; i < expectedCycle.length; i++) {
      const expectedState = expectedCycle[i]
      const actualState = await getElementState(page, BUTTON_SELECTOR)

      expect(actualState).toBe(expectedState)

      // Click to advance to next state
      await clickShadowElement(page, BUTTON_SELECTOR)
      await page.waitForTimeout(100)
    }
  })

  // --------------------------------------------------------------------------
  // TEST 7: Styling Validation
  // --------------------------------------------------------------------------
  test('7. styling is correctly applied', async ({ page }) => {
    // First activate to get proper styling
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(100)

    // Check base styling (padding, radius, color)
    const padding = await getShadowStyle(page, BUTTON_SELECTOR, 'padding')
    const radius = await getShadowStyle(page, BUTTON_SELECTOR, 'border-radius')
    const color = await getShadowStyle(page, BUTTON_SELECTOR, 'color')
    const gap = await getShadowStyle(page, BUTTON_SELECTOR, 'gap')
    const cursor = await getShadowStyle(page, BUTTON_SELECTOR, 'cursor')

    expect(padding).toBe('12px 24px')
    expect(radius).toBe('6px')
    expect(color).toBe('rgb(255, 255, 255)') // white
    expect(gap).toBe('8px')
    expect(cursor).toBe('pointer')
  })

  // --------------------------------------------------------------------------
  // TEST 8: State-Color-Icon Consistency
  // --------------------------------------------------------------------------
  test('8. each state has consistent color and icon', async ({ page }) => {
    // First activate
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(100)

    // Test each state's visual consistency
    const stateTests = [
      { state: 'todo', color: STATES.todo.color, icon: 'circle' },
      { state: 'doing', color: STATES.doing.color, icon: 'clock' },
      { state: 'done', color: STATES.done.color, icon: 'check' },
    ]

    for (const t of stateTests) {
      // Get current state
      const currentState = await getElementState(page, BUTTON_SELECTOR)
      expect(currentState).toBe(t.state)

      // Verify color
      const bg = await getShadowStyle(page, BUTTON_SELECTOR, 'background-color')
      expect(colorsMatch(bg, t.color)).toBe(true)

      // Verify icon
      const icon = await getIconType(page)
      expect(icon).toBe(t.icon)

      // Advance to next state
      await clickShadowElement(page, BUTTON_SELECTOR)
      await page.waitForTimeout(100)
    }
  })

  // --------------------------------------------------------------------------
  // TEST 9: Rapid Cycling Stress Test
  // --------------------------------------------------------------------------
  test('9. handles rapid cycling without breaking', async ({ page }) => {
    // First activate
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(50)

    // Click 9 times rapidly (3 full cycles through todo→doing→done)
    for (let i = 0; i < 9; i++) {
      await clickShadowElement(page, BUTTON_SELECTOR)
      await page.waitForTimeout(30)
    }

    await page.waitForTimeout(200) // Let it settle

    // After 9 clicks from todo (3 full cycles), should be back at doing
    // todo(start) → doing → done → todo → doing → done → todo → doing → done → todo
    // Actually: 9 clicks from todo = todo + 9 = position 9 % 3 = 0 = todo
    const state = await getElementState(page, BUTTON_SELECTOR)
    expect(state).toBe('todo')

    // Verify it still works - one more click should go to doing
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(100)

    const nextState = await getElementState(page, BUTTON_SELECTOR)
    expect(nextState).toBe('doing')
  })

  // --------------------------------------------------------------------------
  // TEST 10: Visual Regression (Screenshots)
  // --------------------------------------------------------------------------
  test('10. visual appearance matches snapshots for all states', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    // Screenshot: default state (empty)
    await expect(preview).toHaveScreenshot('multi-state-default.png')

    // Click to todo
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(200)
    await expect(preview).toHaveScreenshot('multi-state-todo.png')

    // Click to doing
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(200)
    await expect(preview).toHaveScreenshot('multi-state-doing.png')

    // Click to done
    await clickShadowElement(page, BUTTON_SELECTOR)
    await page.waitForTimeout(200)
    await expect(preview).toHaveScreenshot('multi-state-done.png')
  })

})
