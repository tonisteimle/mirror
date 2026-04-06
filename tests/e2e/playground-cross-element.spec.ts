/**
 * Cross-Element Playground E2E Test
 *
 * Tests the most complex playground from the States tutorial chapter.
 * This playground tests: rendering, styling, states, named elements,
 * cross-element references, and visibility toggling.
 *
 * Mirror Code being tested:
 * ```
 * Frame gap 12, bg #0a0a0a, pad 16, rad 8
 *   Button "Menü", name MenuBtn, pad 10 20, rad 6, bg #333, col white, toggle()
 *     open:
 *       bg #2563eb
 *
 *   Frame bg #1a1a1a, pad 12, rad 8, gap 4, hidden
 *     MenuBtn.open:
 *       visible
 *     Text "Dashboard", col white, fs 14, pad 8
 *     Text "Einstellungen", col white, fs 14, pad 8
 * ```
 */

import { test, expect, Page, Locator } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/06-states.html'
const PLAYGROUND_SECTION_HEADING = 'Auf andere Elemente reagieren'
const PLAYGROUND_INDEX = 8 // 9th playground (0-indexed)

// Expected colors - use ranges to handle browser rendering differences
// Browser color rendering can vary significantly, use generous tolerance
const COLORS = {
  buttonBase: { r: 51, g: 51, b: 51, tolerance: 15 },      // #333
  buttonOpen: { r: 37, g: 99, b: 235, tolerance: 20 },     // #2563eb - needs more tolerance
  rootBg: { r: 10, g: 10, b: 10, tolerance: 15 },          // #0a0a0a
  menuBg: { r: 26, g: 26, b: 26, tolerance: 15 },          // #1a1a1a
}

/**
 * Parse rgb(r, g, b) string to components
 */
function parseRgb(rgb: string): { r: number, g: number, b: number } | null {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) return null
  return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) }
}

/**
 * Check if two colors are close enough
 */
function colorsMatch(actual: string, expected: typeof COLORS.buttonBase): boolean {
  const parsed = parseRgb(actual)
  if (!parsed) return false
  return Math.abs(parsed.r - expected.r) <= expected.tolerance &&
         Math.abs(parsed.g - expected.g) <= expected.tolerance &&
         Math.abs(parsed.b - expected.b) <= expected.tolerance
}

// ============================================================================
// HELPERS
// ============================================================================

interface PlaygroundElements {
  playground: Locator
  preview: Locator
  shadowHost: Locator
  root: Locator
  button: Locator
  menu: Locator
  menuItems: Locator
}

/**
 * Navigate to the tutorial page and wait for playgrounds to initialize
 */
async function setupPage(page: Page): Promise<void> {
  await page.goto(TUTORIAL_URL, { waitUntil: 'networkidle' })

  // Wait for playground elements to exist
  await page.waitForSelector('[data-playground]', { timeout: 10000 })

  // Wait for shadow DOM to be initialized (playgrounds compile on load)
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
 * Get references to all relevant elements in the cross-element playground
 */
async function getPlaygroundElements(page: Page): Promise<PlaygroundElements> {
  const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
  const preview = playground.locator('.playground-preview')

  // The preview has a shadow DOM - we need to pierce it
  const shadowHost = preview

  return {
    playground,
    preview,
    shadowHost,
    // These will be accessed via shadow DOM
    root: preview.locator('div').first(),
    button: preview.locator('button'),
    menu: preview.locator('div > div').nth(1), // Second child of root
    menuItems: preview.locator('span'),
  }
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
 * Check if an element inside shadow DOM is visible
 * Mirror uses display:none for hidden elements
 */
async function isShadowElementVisible(page: Page, selector: string): Promise<boolean> {
  return page.evaluate(({ sel, idx }) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return false
    const el = shadow.querySelector(sel) as HTMLElement
    if (!el) return false
    const style = getComputedStyle(el)
    // Check multiple visibility indicators
    const isDisplayNone = style.display === 'none'
    const isVisibilityHidden = style.visibility === 'hidden'
    const isZeroOpacity = style.opacity === '0'
    const isZeroSize = el.offsetWidth === 0 && el.offsetHeight === 0
    return !isDisplayNone && !isVisibilityHidden && !isZeroOpacity && !isZeroSize
  }, { sel: selector, idx: PLAYGROUND_INDEX })
}

/**
 * Debug helper: Print the DOM structure of the playground
 */
async function debugPlaygroundStructure(page: Page): Promise<void> {
  const structure = await page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return 'No shadow root'

    const root = shadow.querySelector('.mirror-root')
    if (!root) return 'No mirror-root'

    const describe = (el: Element, depth = 0): string => {
      const indent = '  '.repeat(depth)
      const tag = el.tagName.toLowerCase()
      const classes = el.className ? `.${el.className.split(' ').join('.')}` : ''
      const display = getComputedStyle(el).display
      const text = el.childNodes.length === 1 && el.firstChild?.nodeType === 3
        ? ` "${el.textContent?.trim()}"`
        : ''
      let result = `${indent}<${tag}${classes}> [display:${display}]${text}\n`
      for (const child of el.children) {
        result += describe(child, depth + 1)
      }
      return result
    }

    return describe(root)
  }, PLAYGROUND_INDEX)

  console.log('Playground structure:\n', structure)
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
 * Get text content of elements inside shadow DOM
 */
async function getShadowTextContent(page: Page, selector: string): Promise<string[]> {
  return page.evaluate(({ sel, idx }) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return []
    const els = shadow.querySelectorAll(sel)
    return Array.from(els).map(el => el.textContent || '')
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

// ============================================================================
// TESTS
// ============================================================================

test.describe('Cross-Element Playground', () => {

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  // --------------------------------------------------------------------------
  // TEST 1: DOM Structure Validation
  // --------------------------------------------------------------------------
  test('1. DOM structure is correct', async ({ page }) => {
    // Verify playground exists
    const playgroundCount = await page.locator('[data-playground]').count()
    expect(playgroundCount).toBeGreaterThan(PLAYGROUND_INDEX)

    // Verify shadow DOM structure
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      // Find the mirror-root element
      const root = shadow.querySelector('.mirror-root')
      if (!root) return null

      return {
        rootChildCount: root.children.length,
        hasButton: !!root.querySelector('button'),
        buttonText: root.querySelector('button')?.textContent,
        hasMenuFrame: root.children.length >= 2,
        menuItemCount: root.querySelectorAll('span').length,
      }
    }, PLAYGROUND_INDEX)

    expect(structure).not.toBeNull()
    expect(structure!.rootChildCount).toBe(2) // Button + Menu Frame
    expect(structure!.hasButton).toBe(true)
    expect(structure!.buttonText).toBe('Menü')
    expect(structure!.hasMenuFrame).toBe(true)
    expect(structure!.menuItemCount).toBe(2) // Dashboard + Einstellungen
  })

  // --------------------------------------------------------------------------
  // TEST 2: Initial State Validation
  // --------------------------------------------------------------------------
  test('2. initial state is correct', async ({ page }) => {
    // Button should be in base state (gray)
    const buttonBg = await getShadowStyle(page, 'button', 'background-color')
    expect(colorsMatch(buttonBg, COLORS.buttonBase)).toBe(true)

    // Button should NOT have data-state="open"
    const buttonState = await getElementState(page, 'button')
    expect(buttonState).not.toBe('open')

    // Menu should be hidden (display:none)
    const menuDisplay = await getShadowStyle(page, '.mirror-root > div:nth-child(2) > div:nth-child(2)', 'display')
    expect(menuDisplay).toBe('none')
  })

  // --------------------------------------------------------------------------
  // TEST 3: First Click Opens Menu
  // --------------------------------------------------------------------------
  test('3. first click opens menu', async ({ page }) => {
    // Click the button
    await clickShadowElement(page, 'button')
    await page.waitForTimeout(100) // Allow state transition

    // Button should now be blue (open state)
    const buttonBg = await getShadowStyle(page, 'button', 'background-color')
    expect(colorsMatch(buttonBg, COLORS.buttonOpen)).toBe(true)

    // Button should have data-state="open"
    const buttonState = await getElementState(page, 'button')
    expect(buttonState).toBe('open')

    // Menu should now be visible (display != none)
    const menuDisplay = await getShadowStyle(page, '.mirror-root > div:nth-child(2) > div:nth-child(2)', 'display')
    expect(menuDisplay).not.toBe('none')
  })

  // --------------------------------------------------------------------------
  // TEST 4: Second Click Closes Menu (Toggle)
  // --------------------------------------------------------------------------
  test('4. second click closes menu', async ({ page }) => {
    // Click twice
    await clickShadowElement(page, 'button')
    await page.waitForTimeout(100)
    await clickShadowElement(page, 'button')
    await page.waitForTimeout(100)

    // Button should be back to gray (base state)
    const buttonBg = await getShadowStyle(page, 'button', 'background-color')
    expect(colorsMatch(buttonBg, COLORS.buttonBase)).toBe(true)

    // Button should NOT have data-state="open"
    const buttonState = await getElementState(page, 'button')
    expect(buttonState).not.toBe('open')

    // Menu should be hidden again (display:none)
    const menuDisplay = await getShadowStyle(page, '.mirror-root > div:nth-child(2) > div:nth-child(2)', 'display')
    expect(menuDisplay).toBe('none')
  })

  // --------------------------------------------------------------------------
  // TEST 5: Styling Validation (Computed Styles)
  // --------------------------------------------------------------------------
  test('5. styling is correctly applied', async ({ page }) => {
    // The actual styled element is the wrapper div inside .mirror-root
    // Structure: .mirror-root > style + div(wrapper with styling)
    const wrapperSelector = '.mirror-root > div:nth-child(2)'

    // Root Frame styling (the wrapper div has the actual styles)
    const wrapperBg = await getShadowStyle(page, wrapperSelector, 'background-color')
    const wrapperPad = await getShadowStyle(page, wrapperSelector, 'padding')
    const wrapperRad = await getShadowStyle(page, wrapperSelector, 'border-radius')
    const wrapperGap = await getShadowStyle(page, wrapperSelector, 'gap')

    expect(colorsMatch(wrapperBg, COLORS.rootBg)).toBe(true)
    expect(wrapperPad).toBe('16px')
    expect(wrapperRad).toBe('8px')
    expect(wrapperGap).toBe('12px')

    // Button styling
    const btnPad = await getShadowStyle(page, 'button', 'padding')
    const btnRad = await getShadowStyle(page, 'button', 'border-radius')
    const btnCol = await getShadowStyle(page, 'button', 'color')

    expect(btnPad).toBe('10px 20px')
    expect(btnRad).toBe('6px')
    expect(btnCol).toBe('rgb(255, 255, 255)') // white

    // Menu Frame styling (need to open menu first to get styles)
    await clickShadowElement(page, 'button')
    await page.waitForTimeout(100)

    const menuSelector = '.mirror-root > div:nth-child(2) > div:nth-child(2)'
    const menuBg = await getShadowStyle(page, menuSelector, 'background-color')
    const menuPad = await getShadowStyle(page, menuSelector, 'padding')
    const menuRad = await getShadowStyle(page, menuSelector, 'border-radius')
    const menuGap = await getShadowStyle(page, menuSelector, 'gap')

    expect(colorsMatch(menuBg, COLORS.menuBg)).toBe(true)
    expect(menuPad).toBe('12px')
    expect(menuRad).toBe('8px')
    expect(menuGap).toBe('4px')
  })

  // --------------------------------------------------------------------------
  // TEST 6: Cross-Element Causality
  // --------------------------------------------------------------------------
  test('6. menu visibility is controlled by button state (causality)', async ({ page }) => {
    // Helper to get both states at once
    const getStates = async () => {
      const buttonState = await getElementState(page, 'button')
      const menuDisplay = await getShadowStyle(page, '.mirror-root > div:nth-child(2) > div:nth-child(2)', 'display')
      return { buttonState, menuHidden: menuDisplay === 'none' }
    }

    // Initial: button=base → menu=hidden
    let states = await getStates()
    expect(states.buttonState).not.toBe('open')
    expect(states.menuHidden).toBe(true)

    // After click: button=open → menu=visible
    await clickShadowElement(page, 'button')
    await page.waitForTimeout(100)
    states = await getStates()
    expect(states.buttonState).toBe('open')
    expect(states.menuHidden).toBe(false)

    // After 2nd click: button=base → menu=hidden
    await clickShadowElement(page, 'button')
    await page.waitForTimeout(100)
    states = await getStates()
    expect(states.buttonState).not.toBe('open')
    expect(states.menuHidden).toBe(true)

    // After 3rd click: button=open → menu=visible (cycle continues)
    await clickShadowElement(page, 'button')
    await page.waitForTimeout(100)
    states = await getStates()
    expect(states.buttonState).toBe('open')
    expect(states.menuHidden).toBe(false)
  })

  // --------------------------------------------------------------------------
  // TEST 7: Menu Content Validation
  // --------------------------------------------------------------------------
  test('7. menu contains correct items', async ({ page }) => {
    // Open the menu first
    await clickShadowElement(page, 'button')
    await page.waitForTimeout(100)

    // Get menu item texts
    const menuTexts = await getShadowTextContent(page, '.mirror-root > div:nth-child(2) > div:nth-child(2) span')

    expect(menuTexts).toHaveLength(2)
    expect(menuTexts).toContain('Dashboard')
    expect(menuTexts).toContain('Einstellungen')
  })

  // --------------------------------------------------------------------------
  // TEST 8: Rapid Toggle Stress Test
  // --------------------------------------------------------------------------
  test('8. handles rapid toggling without breaking', async ({ page }) => {
    // Click 10 times rapidly with slightly more delay for stability
    for (let i = 0; i < 10; i++) {
      await clickShadowElement(page, 'button')
      await page.waitForTimeout(50) // Slightly longer delay for stability
    }

    // Wait for final state to settle
    await page.waitForTimeout(200)

    // After even number of clicks: should be back to base state
    const buttonState = await getElementState(page, 'button')
    let menuDisplay = await getShadowStyle(page, '.mirror-root > div:nth-child(2) > div:nth-child(2)', 'display')

    // Check state instead of color (more reliable)
    expect(buttonState).not.toBe('open')
    expect(menuDisplay).toBe('none')

    // One more click should open it
    await clickShadowElement(page, 'button')
    await page.waitForTimeout(200)

    const buttonStateAfter = await getElementState(page, 'button')
    menuDisplay = await getShadowStyle(page, '.mirror-root > div:nth-child(2) > div:nth-child(2)', 'display')

    expect(buttonStateAfter).toBe('open')
    expect(menuDisplay).not.toBe('none')
  })

  // --------------------------------------------------------------------------
  // TEST 9: Visual Regression (Screenshot)
  // --------------------------------------------------------------------------
  test('9. visual appearance matches snapshot', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    // Screenshot: Menu closed
    await expect(preview).toHaveScreenshot('cross-element-menu-closed.png')

    // Open menu
    await clickShadowElement(page, 'button')
    await page.waitForTimeout(200)

    // Screenshot: Menu open
    await expect(preview).toHaveScreenshot('cross-element-menu-open.png')
  })

})
