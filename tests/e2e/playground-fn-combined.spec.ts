/**
 * Functions - Combined Functions Playground E2E Test
 *
 * Tests the fourth playground from the Functions tutorial.
 * Multiple functions combined: toggle() + show() / hide() + toggle(Element).
 *
 * Mirror Code being tested:
 * ```
 * Frame gap 8, bg #0a0a0a, pad 16, rad 8
 *   Button "Filter", name FilterBtn, pad 10 20, bg #333, col white, rad 6, toggle(), show(FilterPanel)
 *     open:
 *       bg #2563eb
 *
 *   Frame name FilterPanel, hidden, bg #1a1a1a, pad 16, rad 8, gap 12
 *     Text "Filter-Optionen", col white, fs 14, weight 500
 *     Frame gap 8
 *       Button "Aktiv", pad 8 12, bg #252525, col white, rad 4
 *       Button "Archiviert", pad 8 12, bg #252525, col white, rad 4
 *     Button "Schließen", pad 8 16, bg #333, col white, rad 4, hide(FilterPanel), toggle(FilterBtn)
 * ```
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/07-functions.html'
const PLAYGROUND_INDEX = 3 // Fourth playground (0-indexed)

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

async function getFilterButtonInfo(page: Page): Promise<{
  text: string,
  state: string | null,
  backgroundColor: string
} | null> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null

    const root = shadow.querySelector('.mirror-root')
    if (!root) return null

    const container = root.children[1] as HTMLElement
    const filterBtn = container?.children[0] as HTMLButtonElement
    if (!filterBtn) return null

    const styles = getComputedStyle(filterBtn)

    return {
      text: filterBtn.textContent?.trim() || '',
      state: filterBtn.getAttribute('data-state'),
      backgroundColor: styles.backgroundColor
    }
  }, PLAYGROUND_INDEX)
}

async function isPanelVisible(page: Page): Promise<boolean> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return false

    const root = shadow.querySelector('.mirror-root')
    const container = root?.children[1] as HTMLElement
    const panel = container?.children[1] as HTMLElement
    if (!panel) return false

    const styles = getComputedStyle(panel)
    return styles.display !== 'none' && styles.visibility !== 'hidden'
  }, PLAYGROUND_INDEX)
}

async function getPanelContent(page: Page): Promise<{
  title: string,
  filterButtons: string[],
  closeButtonText: string
} | null> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return null

    const root = shadow.querySelector('.mirror-root')
    const container = root?.children[1] as HTMLElement
    const panel = container?.children[1] as HTMLElement
    if (!panel) return null

    // Panel structure: Text (title), Frame (filter buttons), Button (close)
    const title = panel.children[0] as HTMLElement
    const filterFrame = panel.children[1] as HTMLElement
    const closeBtn = panel.children[2] as HTMLButtonElement

    const filterButtons: string[] = []
    if (filterFrame) {
      for (let i = 0; i < filterFrame.children.length; i++) {
        const btn = filterFrame.children[i] as HTMLElement
        filterButtons.push(btn.textContent?.trim() || '')
      }
    }

    return {
      title: title?.textContent?.trim() || '',
      filterButtons,
      closeButtonText: closeBtn?.textContent?.trim() || ''
    }
  }, PLAYGROUND_INDEX)
}

async function clickFilterButton(page: Page): Promise<void> {
  await page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const container = root?.children[1] as HTMLElement
    const filterBtn = container?.children[0] as HTMLButtonElement
    if (!filterBtn) throw new Error('Filter button not found')
    filterBtn.click()
  }, PLAYGROUND_INDEX)
}

async function clickCloseButton(page: Page): Promise<void> {
  await page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const container = root?.children[1] as HTMLElement
    const panel = container?.children[1] as HTMLElement
    const closeBtn = panel?.children[2] as HTMLButtonElement
    if (!closeBtn) throw new Error('Close button not found')
    closeBtn.click()
  }, PLAYGROUND_INDEX)
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Functions - Combined Functions Playground', () => {

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  // --------------------------------------------------------------------------
  // TEST 1: DOM Structure
  // --------------------------------------------------------------------------
  test('1. DOM structure has filter button and panel', async ({ page }) => {
    const filterBtn = await getFilterButtonInfo(page)

    expect(filterBtn).not.toBeNull()
    expect(filterBtn!.text).toBe('Filter')
  })

  // --------------------------------------------------------------------------
  // TEST 2: Initial State - Button Default, Panel Hidden
  // --------------------------------------------------------------------------
  test('2. initial state: button default, panel hidden', async ({ page }) => {
    const filterBtn = await getFilterButtonInfo(page)
    const panelVisible = await isPanelVisible(page)

    expect(filterBtn).not.toBeNull()
    expect(filterBtn!.state).toBe('default')
    // Background should be #333 (rgb(51, 51, 51))
    expect(filterBtn!.backgroundColor).toBe('rgb(51, 51, 51)')
    expect(panelVisible).toBe(false)
  })

  // --------------------------------------------------------------------------
  // TEST 3: Click Filter Button - Both Toggle and Show
  // --------------------------------------------------------------------------
  test('3. clicking filter button toggles state AND shows panel', async ({ page }) => {
    // Get initial background
    const initialBtn = await getFilterButtonInfo(page)
    const initialBg = initialBtn!.backgroundColor

    // Click filter button
    await clickFilterButton(page)
    await page.waitForTimeout(200)

    // Button should be in 'open' state with changed background
    const filterBtn = await getFilterButtonInfo(page)
    expect(filterBtn).not.toBeNull()
    expect(filterBtn!.state).toBe('open')
    // Background should have changed (not checking exact color due to transitions)
    expect(filterBtn!.backgroundColor).not.toBe(initialBg)

    // Panel should be visible
    const panelVisible = await isPanelVisible(page)
    expect(panelVisible).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 4: Panel Content
  // --------------------------------------------------------------------------
  test('4. panel has correct content', async ({ page }) => {
    // Open panel first
    await clickFilterButton(page)
    await page.waitForTimeout(100)

    const content = await getPanelContent(page)

    expect(content).not.toBeNull()
    expect(content!.title).toBe('Filter-Optionen')
    expect(content!.filterButtons).toContain('Aktiv')
    expect(content!.filterButtons).toContain('Archiviert')
    expect(content!.closeButtonText).toBe('Schließen')
  })

  // --------------------------------------------------------------------------
  // TEST 5: Close Button Hides Panel
  // --------------------------------------------------------------------------
  test('5. close button hides panel', async ({ page }) => {
    // First open
    await clickFilterButton(page)
    await page.waitForTimeout(100)

    // Verify open state
    let panelVisible = await isPanelVisible(page)
    expect(panelVisible).toBe(true)

    // Click close button
    await clickCloseButton(page)
    await page.waitForTimeout(100)

    // Panel should be hidden
    panelVisible = await isPanelVisible(page)
    expect(panelVisible).toBe(false)
  })

  // --------------------------------------------------------------------------
  // TEST 6: Panel Can Be Opened Multiple Times
  // --------------------------------------------------------------------------
  test('6. panel can be opened and closed multiple times', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      // Open via filter button
      await clickFilterButton(page)
      await page.waitForTimeout(100)

      let panelVisible = await isPanelVisible(page)
      expect(panelVisible).toBe(true)

      // Close via close button
      await clickCloseButton(page)
      await page.waitForTimeout(100)

      panelVisible = await isPanelVisible(page)
      expect(panelVisible).toBe(false)

      // Button state may vary, but panel visibility is key
    }
  })

  // --------------------------------------------------------------------------
  // TEST 7: Clicking Filter Button Again While Open
  // --------------------------------------------------------------------------
  test('7. clicking filter button again toggles it (but panel stays visible)', async ({ page }) => {
    // Open
    await clickFilterButton(page)
    await page.waitForTimeout(100)

    let filterBtn = await getFilterButtonInfo(page)
    expect(filterBtn!.state).toBe('open')

    // Click filter button again - this will toggle AND show (show on already visible = no change)
    await clickFilterButton(page)
    await page.waitForTimeout(100)

    // Button toggles back to default
    filterBtn = await getFilterButtonInfo(page)
    expect(filterBtn!.state).toBe('default')

    // But show() was also called, so panel might still be visible
    // This is the "combined functions" behavior - both execute
    const panelVisible = await isPanelVisible(page)
    // Note: show() on already visible element keeps it visible
    expect(panelVisible).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 8: Visual Regression
  // --------------------------------------------------------------------------
  test('8. visual appearance matches snapshots', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    // Screenshot: closed state
    await expect(preview).toHaveScreenshot('fn-combined-closed.png')

    // Open
    await clickFilterButton(page)
    await page.waitForTimeout(200)

    // Screenshot: open state
    await expect(preview).toHaveScreenshot('fn-combined-open.png')
  })

})
