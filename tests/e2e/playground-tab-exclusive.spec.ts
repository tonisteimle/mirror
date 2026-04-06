/**
 * Tab Exclusive Playground E2E Test
 *
 * Tests the "Nur einer aktiv: exclusive()" playground from the States tutorial chapter.
 * This playground demonstrates the exclusive() function where only one element
 * can be active at a time - clicking one deactivates all siblings.
 *
 * Mirror Code being tested:
 * ```
 * Tab: pad 12 20, rad 6, bg #333, col #888, cursor pointer, exclusive()
 *   active:
 *     bg #2563eb
 *     col white
 *
 * Frame hor, gap 4, bg #1a1a1a, pad 4, rad 8
 *   Tab "Home"
 *   Tab "Projekte", active
 *   Tab "Settings"
 * ```
 *
 * Key feature: exclusive() ensures only one tab can be active at a time.
 * Clicking a tab activates it and deactivates all siblings.
 *
 * State behavior:
 * - Default: gray background (#333), gray text (#888)
 * - Active: blue background (#2563eb), white text
 * - Initial: "Projekte" tab starts with active state
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/06-states.html'
const PLAYGROUND_INDEX = 7 // 8th playground (0-indexed)

// Tab styling
const COLORS = {
  defaultBg: { r: 51, g: 51, b: 51, tolerance: 15 },  // #333
  activeBg: { r: 37, g: 99, b: 235, tolerance: 20 },  // #2563eb
  defaultText: { r: 136, g: 136, b: 136, tolerance: 15 },  // #888
  activeText: { r: 255, g: 255, b: 255, tolerance: 5 },  // white
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

async function getTabStates(page: Page): Promise<{ texts: string[], states: (string | null)[], backgrounds: string[] }> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return { texts: [], states: [], backgrounds: [] }

    const root = shadow.querySelector('.mirror-root')
    const wrapper = root?.children[1] as HTMLElement  // The Frame container
    if (!wrapper) return { texts: [], states: [], backgrounds: [] }

    const tabs = Array.from(wrapper.children) as HTMLElement[]

    return {
      texts: tabs.map(tab => tab.textContent?.trim() || ''),
      states: tabs.map(tab => tab.getAttribute('data-state')),
      backgrounds: tabs.map(tab => getComputedStyle(tab).backgroundColor)
    }
  }, PLAYGROUND_INDEX)
}

async function clickTab(page: Page, tabIndex: number): Promise<void> {
  await page.evaluate(({ idx, tabIdx }) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const wrapper = root?.children[1] as HTMLElement
    const tab = wrapper?.children[tabIdx] as HTMLElement
    if (!tab) throw new Error(`Tab ${tabIdx} not found`)
    tab.click()
  }, { idx: PLAYGROUND_INDEX, tabIdx: tabIndex })
}

async function getActiveTabCount(page: Page): Promise<number> {
  const tabStates = await getTabStates(page)
  return tabStates.states.filter(s => s === 'active').length
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Tab Exclusive Playground', () => {

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  // --------------------------------------------------------------------------
  // TEST 1: DOM Structure
  // --------------------------------------------------------------------------
  test('1. DOM structure has 3 tabs in a horizontal frame', async ({ page }) => {
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
        tabCount: wrapper.children.length,
        isHorizontal: getComputedStyle(wrapper).flexDirection === 'row',
        wrapperHasGap: getComputedStyle(wrapper).gap === '4px',
      }
    }, PLAYGROUND_INDEX)

    expect(structure).not.toBeNull()
    expect(structure!.hasRoot).toBe(true)
    expect(structure!.wrapperExists).toBe(true)
    expect(structure!.tabCount).toBe(3)
    expect(structure!.isHorizontal).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 2: Initial State - "Projekte" is active
  // --------------------------------------------------------------------------
  test('2. initial state has "Projekte" tab active', async ({ page }) => {
    const tabStates = await getTabStates(page)

    // Should have 3 tabs
    expect(tabStates.texts).toHaveLength(3)
    expect(tabStates.texts).toEqual(['Home', 'Projekte', 'Settings'])

    // Only "Projekte" (index 1) should be active
    expect(tabStates.states[0]).not.toBe('active')
    expect(tabStates.states[1]).toBe('active')
    expect(tabStates.states[2]).not.toBe('active')

    // Active tab should have blue background
    expect(colorsMatch(tabStates.backgrounds[1], COLORS.activeBg)).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 3: Only one tab active at a time (exclusive constraint)
  // --------------------------------------------------------------------------
  test('3. only one tab is active at any time', async ({ page }) => {
    // Initially one active
    let activeCount = await getActiveTabCount(page)
    expect(activeCount).toBe(1)

    // Click first tab
    await clickTab(page, 0)
    await page.waitForTimeout(100)
    activeCount = await getActiveTabCount(page)
    expect(activeCount).toBe(1)

    // Click last tab
    await clickTab(page, 2)
    await page.waitForTimeout(100)
    activeCount = await getActiveTabCount(page)
    expect(activeCount).toBe(1)
  })

  // --------------------------------------------------------------------------
  // TEST 4: Clicking "Home" activates it and deactivates "Projekte"
  // --------------------------------------------------------------------------
  test('4. clicking "Home" activates it and deactivates "Projekte"', async ({ page }) => {
    // Click "Home" (index 0)
    await clickTab(page, 0)
    await page.waitForTimeout(100)

    const tabStates = await getTabStates(page)

    // "Home" should now be active
    expect(tabStates.states[0]).toBe('active')
    expect(colorsMatch(tabStates.backgrounds[0], COLORS.activeBg)).toBe(true)

    // "Projekte" should be deactivated
    expect(tabStates.states[1]).not.toBe('active')
    expect(colorsMatch(tabStates.backgrounds[1], COLORS.defaultBg)).toBe(true)

    // "Settings" should remain inactive
    expect(tabStates.states[2]).not.toBe('active')
  })

  // --------------------------------------------------------------------------
  // TEST 5: Clicking "Settings" activates it
  // --------------------------------------------------------------------------
  test('5. clicking "Settings" activates it', async ({ page }) => {
    // Click "Settings" (index 2)
    await clickTab(page, 2)
    await page.waitForTimeout(100)

    const tabStates = await getTabStates(page)

    // "Settings" should now be active
    expect(tabStates.states[2]).toBe('active')
    expect(colorsMatch(tabStates.backgrounds[2], COLORS.activeBg)).toBe(true)

    // Others should be inactive
    expect(tabStates.states[0]).not.toBe('active')
    expect(tabStates.states[1]).not.toBe('active')
  })

  // --------------------------------------------------------------------------
  // TEST 6: Clicking already active tab keeps it active
  // --------------------------------------------------------------------------
  test('6. clicking already active tab keeps it active', async ({ page }) => {
    // "Projekte" is initially active, click it again
    await clickTab(page, 1)
    await page.waitForTimeout(100)

    const tabStates = await getTabStates(page)

    // "Projekte" should still be active
    expect(tabStates.states[1]).toBe('active')
    expect(colorsMatch(tabStates.backgrounds[1], COLORS.activeBg)).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 7: Full cycle through all tabs
  // --------------------------------------------------------------------------
  test('7. full cycle through all tabs maintains exclusivity', async ({ page }) => {
    const expectedCycle = [
      { clickIndex: 0, activeIndex: 0 },  // Click Home
      { clickIndex: 2, activeIndex: 2 },  // Click Settings
      { clickIndex: 1, activeIndex: 1 },  // Click Projekte
      { clickIndex: 0, activeIndex: 0 },  // Click Home again
    ]

    for (const step of expectedCycle) {
      await clickTab(page, step.clickIndex)
      await page.waitForTimeout(100)

      const tabStates = await getTabStates(page)

      // Verify exactly one is active
      const activeCount = tabStates.states.filter(s => s === 'active').length
      expect(activeCount).toBe(1)

      // Verify correct tab is active
      expect(tabStates.states[step.activeIndex]).toBe('active')
    }
  })

  // --------------------------------------------------------------------------
  // TEST 8: Styling validation
  // --------------------------------------------------------------------------
  test('8. styling is correctly applied to active and inactive tabs', async ({ page }) => {
    const styles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      const wrapper = root?.children[1] as HTMLElement
      if (!wrapper) return null

      const tabs = Array.from(wrapper.children) as HTMLElement[]

      return tabs.map(tab => ({
        padding: getComputedStyle(tab).padding,
        borderRadius: getComputedStyle(tab).borderRadius,
        cursor: getComputedStyle(tab).cursor,
        backgroundColor: getComputedStyle(tab).backgroundColor,
        color: getComputedStyle(tab).color,
      }))
    }, PLAYGROUND_INDEX)

    expect(styles).not.toBeNull()
    expect(styles).toHaveLength(3)

    // All tabs should have same padding and radius
    for (const tab of styles!) {
      expect(tab.padding).toBe('12px 20px')
      expect(tab.borderRadius).toBe('6px')
      expect(tab.cursor).toBe('pointer')
    }

    // Active tab (Projekte, index 1) should have blue bg and white text
    expect(colorsMatch(styles![1].backgroundColor, COLORS.activeBg)).toBe(true)
    expect(colorsMatch(styles![1].color, COLORS.activeText)).toBe(true)

    // Inactive tabs should have gray bg and gray text
    expect(colorsMatch(styles![0].backgroundColor, COLORS.defaultBg)).toBe(true)
    expect(colorsMatch(styles![0].color, COLORS.defaultText)).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 9: Rapid clicking stress test
  // --------------------------------------------------------------------------
  test('9. rapid clicking maintains exclusivity', async ({ page }) => {
    // Rapidly click through tabs
    for (let i = 0; i < 15; i++) {
      await clickTab(page, i % 3)
      await page.waitForTimeout(30)
    }

    await page.waitForTimeout(200)

    // After rapid clicks, should still have exactly one active
    const activeCount = await getActiveTabCount(page)
    expect(activeCount).toBe(1)

    // Verify system still works - click tab 2 and verify it's active
    await clickTab(page, 2)
    await page.waitForTimeout(100)

    const tabStates = await getTabStates(page)
    expect(tabStates.states[2]).toBe('active')
    expect(tabStates.states[0]).not.toBe('active')
    expect(tabStates.states[1]).not.toBe('active')
  })

  // --------------------------------------------------------------------------
  // TEST 10: Visual regression
  // --------------------------------------------------------------------------
  test('10. visual appearance matches snapshots', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    // Screenshot: initial state (Projekte active)
    await expect(preview).toHaveScreenshot('tab-exclusive-projekte-active.png')

    // Click Home
    await clickTab(page, 0)
    await page.waitForTimeout(200)
    await expect(preview).toHaveScreenshot('tab-exclusive-home-active.png')

    // Click Settings
    await clickTab(page, 2)
    await page.waitForTimeout(200)
    await expect(preview).toHaveScreenshot('tab-exclusive-settings-active.png')
  })

})
