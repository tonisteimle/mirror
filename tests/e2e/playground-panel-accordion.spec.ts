/**
 * Panel/Accordion Playground E2E Test
 *
 * Tests the "Praktisch: Accordion" playground from the States tutorial chapter.
 * This playground demonstrates content variants where the open state has
 * completely different content (header + body) than the closed state.
 *
 * Mirror Code being tested:
 * ```
 * Panel: bg #1a1a1a, rad 8, clip, toggle()
 *   Frame hor, spread, ver-center, pad 16, cursor pointer
 *     Text "Mehr anzeigen", col white, fs 14
 *     Icon "chevron-down", ic #888, is 18
 *   open:
 *     Frame hor, spread, ver-center, pad 16, cursor pointer
 *       Text "Weniger anzeigen", col white, fs 14
 *       Icon "chevron-up", ic #888, is 18
 *     Frame pad 0 16 16 16, gap 8
 *       Text "Hier ist der versteckte Inhalt.", col #888, fs 13
 *
 * Panel
 * ```
 *
 * Key feature: Content Variants - in closed state shows header only,
 * in open state shows header with different text/icon PLUS additional content.
 *
 * State behavior:
 * - Default (closed): Header with "Mehr anzeigen" + chevron-down
 * - Open: Header with "Weniger anzeigen" + chevron-up + content frame
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/06-states.html'
const PLAYGROUND_INDEX = 9 // 10th playground (0-indexed)

const STATES = {
  closed: {
    text: 'Mehr anzeigen',
    icon: 'chevron-down',
    hasContent: false,
  },
  open: {
    text: 'Weniger anzeigen',
    icon: 'chevron-up',
    hasContent: true,
    contentText: 'Hier ist der versteckte Inhalt.',
  }
}

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

async function getPanelState(page: Page): Promise<string | null> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null

    const root = shadow.querySelector('.mirror-root')
    const wrapper = root?.children[1] as HTMLElement  // The Panel
    return wrapper?.getAttribute('data-state')
  }, PLAYGROUND_INDEX)
}

async function clickPanel(page: Page): Promise<void> {
  await page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const wrapper = root?.children[1] as HTMLElement
    if (!wrapper) throw new Error('Panel not found')
    wrapper.click()
  }, PLAYGROUND_INDEX)
}

async function getPanelContent(page: Page): Promise<{
  headerText: string,
  iconType: string | null,
  childCount: number,
  contentText: string | null
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return { headerText: '', iconType: null, childCount: 0, contentText: null }

    const root = shadow.querySelector('.mirror-root')
    const panel = root?.children[1] as HTMLElement
    if (!panel) return { headerText: '', iconType: null, childCount: 0, contentText: null }

    // Get child count of panel
    const childCount = panel.children.length

    // Find header text (first span in the header frame)
    const headerFrame = panel.children[0] as HTMLElement
    const headerSpan = headerFrame?.querySelector('span')
    const headerText = headerSpan?.textContent?.trim() || ''

    // Find icon type from SVG class
    const svg = panel.querySelector('svg')
    let iconType: string | null = null
    if (svg) {
      const svgClass = svg.getAttribute('class') || ''
      if (svgClass.includes('lucide-chevron-down')) iconType = 'chevron-down'
      else if (svgClass.includes('lucide-chevron-up')) iconType = 'chevron-up'
    }

    // Find content text if panel is open (second frame with content)
    let contentText: string | null = null
    if (childCount > 1) {
      const contentFrame = panel.children[1] as HTMLElement
      const contentSpan = contentFrame?.querySelector('span')
      contentText = contentSpan?.textContent?.trim() || null
    }

    return { headerText, iconType, childCount, contentText }
  }, PLAYGROUND_INDEX)
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Panel/Accordion Playground (Content Variants)', () => {

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  // --------------------------------------------------------------------------
  // TEST 1: DOM Structure
  // --------------------------------------------------------------------------
  test('1. DOM structure is correct in closed state', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      if (!root) return null

      const panel = root.children[1] as HTMLElement
      if (!panel) return null

      const panelStyles = getComputedStyle(panel)

      return {
        hasRoot: true,
        panelExists: !!panel,
        panelChildCount: panel.children.length,
        hasOverflowHidden: panelStyles.overflow === 'hidden' || panelStyles.overflowY === 'hidden',
        hasBorderRadius: panelStyles.borderRadius === '8px',
      }
    }, PLAYGROUND_INDEX)

    expect(structure).not.toBeNull()
    expect(structure!.hasRoot).toBe(true)
    expect(structure!.panelExists).toBe(true)
    // In closed state, should have only 1 child (the header frame)
    expect(structure!.panelChildCount).toBe(1)
    expect(structure!.hasBorderRadius).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 2: Initial State (Closed)
  // --------------------------------------------------------------------------
  test('2. initial state shows "Mehr anzeigen" with chevron-down', async ({ page }) => {
    const state = await getPanelState(page)
    expect(state).toBe('default')

    const content = await getPanelContent(page)
    expect(content.headerText).toBe(STATES.closed.text)
    expect(content.iconType).toBe(STATES.closed.icon)
    expect(content.childCount).toBe(1)  // Only header, no content
    expect(content.contentText).toBeNull()
  })

  // --------------------------------------------------------------------------
  // TEST 3: First Click → Open State
  // --------------------------------------------------------------------------
  test('3. first click opens panel with "Weniger anzeigen" and content', async ({ page }) => {
    await clickPanel(page)
    await page.waitForTimeout(100)

    const state = await getPanelState(page)
    expect(state).toBe('open')

    const content = await getPanelContent(page)
    expect(content.headerText).toBe(STATES.open.text)
    expect(content.iconType).toBe(STATES.open.icon)
    expect(content.childCount).toBe(2)  // Header + content frame
    expect(content.contentText).toBe(STATES.open.contentText)
  })

  // --------------------------------------------------------------------------
  // TEST 4: Second Click → Back to Closed
  // --------------------------------------------------------------------------
  test('4. second click closes panel back to "Mehr anzeigen"', async ({ page }) => {
    // Open
    await clickPanel(page)
    await page.waitForTimeout(100)

    // Close
    await clickPanel(page)
    await page.waitForTimeout(100)

    const state = await getPanelState(page)
    expect(state).toBe('default')

    const content = await getPanelContent(page)
    expect(content.headerText).toBe(STATES.closed.text)
    expect(content.iconType).toBe(STATES.closed.icon)
    expect(content.childCount).toBe(1)
    expect(content.contentText).toBeNull()
  })

  // --------------------------------------------------------------------------
  // TEST 5: Content is replaced, not just shown/hidden
  // --------------------------------------------------------------------------
  test('5. content is replaced when toggling, not just visibility change', async ({ page }) => {
    // In closed state
    let content = await getPanelContent(page)
    expect(content.childCount).toBe(1)

    // Open - should have 2 children now (header changed + content added)
    await clickPanel(page)
    await page.waitForTimeout(100)

    content = await getPanelContent(page)
    expect(content.childCount).toBe(2)

    // Verify icon SVG actually changed
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
  // TEST 6: Styling validation
  // --------------------------------------------------------------------------
  test('6. styling is correctly applied', async ({ page }) => {
    const styles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      const panel = root?.children[1] as HTMLElement
      if (!panel) return null

      const panelStyles = getComputedStyle(panel)
      const headerFrame = panel.children[0] as HTMLElement
      const headerStyles = getComputedStyle(headerFrame)

      return {
        panelBg: panelStyles.backgroundColor,
        panelRad: panelStyles.borderRadius,
        headerPad: headerStyles.padding,
        headerCursor: headerStyles.cursor,
      }
    }, PLAYGROUND_INDEX)

    expect(styles).not.toBeNull()
    expect(styles!.panelBg).toMatch(/rgb\(26,\s*26,\s*26\)/)  // #1a1a1a
    expect(styles!.panelRad).toBe('8px')
    expect(styles!.headerPad).toBe('16px')
    expect(styles!.headerCursor).toBe('pointer')
  })

  // --------------------------------------------------------------------------
  // TEST 7: Content frame styling when open
  // --------------------------------------------------------------------------
  test('7. content frame has correct styling when open', async ({ page }) => {
    await clickPanel(page)
    await page.waitForTimeout(100)

    const contentStyles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      const panel = root?.children[1] as HTMLElement
      if (!panel || panel.children.length < 2) return null

      const contentFrame = panel.children[1] as HTMLElement
      const styles = getComputedStyle(contentFrame)

      return {
        padding: styles.padding,
        gap: styles.gap,
      }
    }, PLAYGROUND_INDEX)

    expect(contentStyles).not.toBeNull()
    // pad 0 16 16 16 = 0 top, 16 right, 16 bottom, 16 left
    expect(contentStyles!.padding).toBe('0px 16px 16px')
  })

  // --------------------------------------------------------------------------
  // TEST 8: Full toggle cycle
  // --------------------------------------------------------------------------
  test('8. validates full toggle cycle', async ({ page }) => {
    const expectedCycle = [
      { state: 'default', text: 'Mehr anzeigen', icon: 'chevron-down', hasContent: false },
      { state: 'open', text: 'Weniger anzeigen', icon: 'chevron-up', hasContent: true },
      { state: 'default', text: 'Mehr anzeigen', icon: 'chevron-down', hasContent: false },
      { state: 'open', text: 'Weniger anzeigen', icon: 'chevron-up', hasContent: true },
    ]

    for (let i = 0; i < expectedCycle.length; i++) {
      const expected = expectedCycle[i]

      const state = await getPanelState(page)
      const content = await getPanelContent(page)

      expect(state).toBe(expected.state)
      expect(content.headerText).toBe(expected.text)
      expect(content.iconType).toBe(expected.icon)
      expect(content.childCount).toBe(expected.hasContent ? 2 : 1)

      // Click to advance
      await clickPanel(page)
      await page.waitForTimeout(100)
    }
  })

  // --------------------------------------------------------------------------
  // TEST 9: Rapid toggle stress test
  // --------------------------------------------------------------------------
  test('9. handles rapid toggling without breaking', async ({ page }) => {
    // Click 10 times rapidly
    for (let i = 0; i < 10; i++) {
      await clickPanel(page)
      await page.waitForTimeout(30)
    }

    await page.waitForTimeout(200)

    // After even number of clicks, should be back to closed (default)
    const state = await getPanelState(page)
    expect(state).toBe('default')

    const content = await getPanelContent(page)
    expect(content.headerText).toBe(STATES.closed.text)

    // One more click should work
    await clickPanel(page)
    await page.waitForTimeout(100)

    const newState = await getPanelState(page)
    expect(newState).toBe('open')
  })

  // --------------------------------------------------------------------------
  // TEST 10: Visual regression
  // --------------------------------------------------------------------------
  test('10. visual appearance matches snapshots', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    // Screenshot: closed state
    await expect(preview).toHaveScreenshot('panel-accordion-closed.png')

    // Click to open
    await clickPanel(page)
    await page.waitForTimeout(200)

    // Screenshot: open state
    await expect(preview).toHaveScreenshot('panel-accordion-open.png')
  })

})
