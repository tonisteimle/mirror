/**
 * Functions - Show/Hide Playground E2E Test
 *
 * Tests the second playground from the Functions tutorial.
 * show() and hide() functions with named elements.
 *
 * Mirror Code being tested:
 * ```
 * Frame gap 12, bg #0a0a0a, pad 16, rad 8
 *   Button "Info anzeigen", pad 10 20, bg #2563eb, col white, rad 6, show(InfoBox)
 *
 *   Frame name InfoBox, hidden, bg #1a1a1a, pad 16, rad 8, gap 8
 *     Text "Hier sind weitere Informationen.", col #ccc, fs 14
 *     Button "Schließen", pad 8 16, bg #333, col white, rad 4, hide(InfoBox)
 * ```
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/07-functions.html'
const PLAYGROUND_INDEX = 1 // Second playground (0-indexed)

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

async function getStructure(page: Page): Promise<{
  hasShowButton: boolean,
  showButtonText: string,
  hasInfoBox: boolean,
  infoBoxVisible: boolean,
  infoBoxText: string,
  hasCloseButton: boolean,
  closeButtonText: string
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
    if (!container) return null

    const showButton = container.children[0] as HTMLButtonElement
    const infoBox = container.children[1] as HTMLElement

    // InfoBox has Text and Close button as children
    const infoText = infoBox?.children[0] as HTMLElement
    const closeButton = infoBox?.children[1] as HTMLButtonElement

    const infoBoxStyles = infoBox ? getComputedStyle(infoBox) : null

    return {
      hasShowButton: !!showButton,
      showButtonText: showButton?.textContent?.trim() || '',
      hasInfoBox: !!infoBox,
      infoBoxVisible: infoBoxStyles?.display !== 'none' && infoBoxStyles?.visibility !== 'hidden',
      infoBoxText: infoText?.textContent?.trim() || '',
      hasCloseButton: !!closeButton,
      closeButtonText: closeButton?.textContent?.trim() || ''
    }
  }, PLAYGROUND_INDEX)
}

async function isInfoBoxVisible(page: Page): Promise<boolean> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return false

    const root = shadow.querySelector('.mirror-root')
    const container = root?.children[1] as HTMLElement
    const infoBox = container?.children[1] as HTMLElement
    if (!infoBox) return false

    const styles = getComputedStyle(infoBox)
    return styles.display !== 'none' && styles.visibility !== 'hidden'
  }, PLAYGROUND_INDEX)
}

async function clickShowButton(page: Page): Promise<void> {
  await page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const container = root?.children[1] as HTMLElement
    const showButton = container?.children[0] as HTMLButtonElement
    if (!showButton) throw new Error('Show button not found')
    showButton.click()
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
    const infoBox = container?.children[1] as HTMLElement
    const closeButton = infoBox?.children[1] as HTMLButtonElement
    if (!closeButton) throw new Error('Close button not found')
    closeButton.click()
  }, PLAYGROUND_INDEX)
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Functions - Show/Hide Playground', () => {

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  // --------------------------------------------------------------------------
  // TEST 1: DOM Structure
  // --------------------------------------------------------------------------
  test('1. DOM structure has show button and info box', async ({ page }) => {
    const structure = await getStructure(page)

    expect(structure).not.toBeNull()
    expect(structure!.hasShowButton).toBe(true)
    expect(structure!.showButtonText).toBe('Info anzeigen')
    expect(structure!.hasInfoBox).toBe(true)
    expect(structure!.hasCloseButton).toBe(true)
    expect(structure!.closeButtonText).toBe('Schließen')
  })

  // --------------------------------------------------------------------------
  // TEST 2: Initial State - InfoBox Hidden
  // --------------------------------------------------------------------------
  test('2. info box starts hidden', async ({ page }) => {
    const visible = await isInfoBoxVisible(page)
    expect(visible).toBe(false)
  })

  // --------------------------------------------------------------------------
  // TEST 3: Show Button Makes InfoBox Visible
  // --------------------------------------------------------------------------
  test('3. clicking show button makes info box visible', async ({ page }) => {
    // Verify initially hidden
    let visible = await isInfoBoxVisible(page)
    expect(visible).toBe(false)

    // Click show button
    await clickShowButton(page)
    await page.waitForTimeout(100)

    // Verify now visible
    visible = await isInfoBoxVisible(page)
    expect(visible).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 4: Close Button Hides InfoBox
  // --------------------------------------------------------------------------
  test('4. clicking close button hides info box', async ({ page }) => {
    // First show the info box
    await clickShowButton(page)
    await page.waitForTimeout(100)

    // Verify visible
    let visible = await isInfoBoxVisible(page)
    expect(visible).toBe(true)

    // Click close button
    await clickCloseButton(page)
    await page.waitForTimeout(100)

    // Verify hidden again
    visible = await isInfoBoxVisible(page)
    expect(visible).toBe(false)
  })

  // --------------------------------------------------------------------------
  // TEST 5: InfoBox Content
  // --------------------------------------------------------------------------
  test('5. info box contains correct text', async ({ page }) => {
    // Show the info box first
    await clickShowButton(page)
    await page.waitForTimeout(100)

    const structure = await getStructure(page)
    expect(structure).not.toBeNull()
    expect(structure!.infoBoxText).toBe('Hier sind weitere Informationen.')
  })

  // --------------------------------------------------------------------------
  // TEST 6: Multiple Show/Hide Cycles
  // --------------------------------------------------------------------------
  test('6. multiple show/hide cycles work correctly', async ({ page }) => {
    // Cycle 1: Show then hide
    await clickShowButton(page)
    await page.waitForTimeout(50)
    let visible = await isInfoBoxVisible(page)
    expect(visible).toBe(true)

    await clickCloseButton(page)
    await page.waitForTimeout(50)
    visible = await isInfoBoxVisible(page)
    expect(visible).toBe(false)

    // Cycle 2: Show then hide
    await clickShowButton(page)
    await page.waitForTimeout(50)
    visible = await isInfoBoxVisible(page)
    expect(visible).toBe(true)

    await clickCloseButton(page)
    await page.waitForTimeout(50)
    visible = await isInfoBoxVisible(page)
    expect(visible).toBe(false)

    // Cycle 3: Show and leave visible
    await clickShowButton(page)
    await page.waitForTimeout(50)
    visible = await isInfoBoxVisible(page)
    expect(visible).toBe(true)
  })

  // --------------------------------------------------------------------------
  // TEST 7: Visual Regression
  // --------------------------------------------------------------------------
  test('7. visual appearance matches snapshots', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    // Screenshot: initial state (info box hidden)
    await expect(preview).toHaveScreenshot('fn-show-hide-initial.png')

    // Click to show info box
    await clickShowButton(page)
    await page.waitForTimeout(200)

    // Screenshot: info box visible
    await expect(preview).toHaveScreenshot('fn-show-hide-visible.png')
  })

})
