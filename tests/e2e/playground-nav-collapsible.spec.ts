/**
 * Collapsible Navigation Playground E2E Tests
 *
 * Tests the Collapsible component from 11-navigation.html tutorial.
 *
 * Playground 5: Basic Collapsible
 * ```
 * Collapsible
 *   Trigger: Button "Toggle content"
 *   Content: Text "Hidden content revealed."
 * ```
 *
 * Playground 6: Collapsible defaultOpen
 * ```
 * Collapsible defaultOpen
 *   Trigger: Frame hor, spread, ver-center, pad 12, bg #1a1a1a, rad 8, cursor pointer
 *     Text "Filter", weight 500
 *     Icon "chevron-down"
 *   Content: Frame ver, gap 8, pad 12, bg #1a1a1a, rad 0 0 8 8
 *     Text "Status: Aktiv", col #888
 *     Text "Kategorie: Alle", col #888
 * ```
 */

import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/11-navigation.html'

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

async function getCollapsibleInfo(page: Page, playgroundIndex: number): Promise<{
  triggerText: string
  isOpen: boolean
  contentVisible: boolean
  contentText: string
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return { triggerText: '', isOpen: false, contentVisible: false, contentText: '' }

    const root = shadow.querySelector('.mirror-root')
    if (!root) return { triggerText: '', isOpen: false, contentVisible: false, contentText: '' }

    const collapsibleRoot = root.children[1] as HTMLElement
    if (!collapsibleRoot) return { triggerText: '', isOpen: false, contentVisible: false, contentText: '' }

    const trigger = collapsibleRoot.querySelector('[data-slot="Trigger"]') as HTMLElement
    const content = collapsibleRoot.querySelector('[data-slot="Content"]') as HTMLElement

    const triggerText = trigger?.textContent?.trim() || ''
    const contentText = content?.textContent?.trim() || ''

    // Check if open via data-state on root element
    const isOpen = collapsibleRoot.getAttribute('data-state') === 'open'

    const contentVisible = content ?
      (getComputedStyle(content).display !== 'none' &&
       getComputedStyle(content).visibility !== 'hidden' &&
       !content.hasAttribute('hidden')) : false

    return { triggerText, isOpen, contentVisible, contentText }
  }, playgroundIndex)
}

async function clickCollapsibleTrigger(page: Page, playgroundIndex: number): Promise<void> {
  await page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const collapsibleRoot = root?.children[1] as HTMLElement
    const triggerSlot = collapsibleRoot?.querySelector('[data-slot="Trigger"]') as HTMLElement

    if (!triggerSlot) throw new Error('Collapsible trigger not found')

    // Click the trigger slot itself (it has role="button")
    triggerSlot.click()
  }, playgroundIndex)
}

// ============================================================================
// TESTS: BASIC COLLAPSIBLE (Playground 5)
// ============================================================================

test.describe('Basic Collapsible (Playground 5)', () => {
  const PLAYGROUND_INDEX = 5

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. trigger is a Button with "Toggle content" text', async ({ page }) => {
    const info = await getCollapsibleInfo(page, PLAYGROUND_INDEX)

    expect(info.triggerText).toContain('Toggle content')
  })

  test('2. content is hidden by default', async ({ page }) => {
    const info = await getCollapsibleInfo(page, PLAYGROUND_INDEX)

    expect(info.isOpen).toBe(false)
    expect(info.contentVisible).toBe(false)
  })

  test('3. clicking trigger opens content', async ({ page }) => {
    await clickCollapsibleTrigger(page, PLAYGROUND_INDEX)
    await page.waitForTimeout(200)

    const info = await getCollapsibleInfo(page, PLAYGROUND_INDEX)

    expect(info.isOpen).toBe(true)
    expect(info.contentVisible).toBe(true)
    expect(info.contentText).toContain('Hidden content revealed')
  })

  test('4. clicking trigger again closes content', async ({ page }) => {
    // Open
    await clickCollapsibleTrigger(page, PLAYGROUND_INDEX)
    await page.waitForTimeout(200)

    let info = await getCollapsibleInfo(page, PLAYGROUND_INDEX)
    expect(info.isOpen).toBe(true)

    // Close
    await clickCollapsibleTrigger(page, PLAYGROUND_INDEX)
    await page.waitForTimeout(200)

    info = await getCollapsibleInfo(page, PLAYGROUND_INDEX)
    expect(info.isOpen).toBe(false)
    expect(info.contentVisible).toBe(false)
  })

  test('5. toggle cycle works repeatedly', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      // Open
      await clickCollapsibleTrigger(page, PLAYGROUND_INDEX)
      await page.waitForTimeout(150)
      let info = await getCollapsibleInfo(page, PLAYGROUND_INDEX)
      expect(info.isOpen).toBe(true)

      // Close
      await clickCollapsibleTrigger(page, PLAYGROUND_INDEX)
      await page.waitForTimeout(150)
      info = await getCollapsibleInfo(page, PLAYGROUND_INDEX)
      expect(info.isOpen).toBe(false)
    }
  })

  test('6. visual regression - closed state', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('collapsible-basic-closed.png')
  })

  test('7. visual regression - open state', async ({ page }) => {
    await clickCollapsibleTrigger(page, PLAYGROUND_INDEX)
    await page.waitForTimeout(200)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('collapsible-basic-open.png')
  })
})

// ============================================================================
// TESTS: COLLAPSIBLE WITH DEFAULTOPEN (Playground 6)
// ============================================================================

test.describe('Collapsible defaultOpen (Playground 6)', () => {
  const PLAYGROUND_INDEX = 6

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. trigger contains "Filter" text', async ({ page }) => {
    const info = await getCollapsibleInfo(page, PLAYGROUND_INDEX)

    expect(info.triggerText).toContain('Filter')
  })

  test('2. has trigger and content elements', async ({ page }) => {
    const info = await getCollapsibleInfo(page, PLAYGROUND_INDEX)

    // Check that the structure is correct
    expect(info.triggerText).toContain('Filter')
    expect(info.contentText).toContain('Status')
  })

  test('3. content shows filter options', async ({ page }) => {
    const info = await getCollapsibleInfo(page, PLAYGROUND_INDEX)

    expect(info.contentText).toContain('Status')
    expect(info.contentText).toContain('Aktiv')
    expect(info.contentText).toContain('Kategorie')
    expect(info.contentText).toContain('Alle')
  })

  test('4. clicking trigger toggles the state', async ({ page }) => {
    const initialInfo = await getCollapsibleInfo(page, PLAYGROUND_INDEX)
    const initialState = initialInfo.isOpen

    await clickCollapsibleTrigger(page, PLAYGROUND_INDEX)
    await page.waitForTimeout(200)

    const afterClick = await getCollapsibleInfo(page, PLAYGROUND_INDEX)
    // State should have toggled
    expect(afterClick.isOpen).toBe(!initialState)
  })

  test('5. double click returns to original state', async ({ page }) => {
    const initialInfo = await getCollapsibleInfo(page, PLAYGROUND_INDEX)
    const initialState = initialInfo.isOpen

    // Click once
    await clickCollapsibleTrigger(page, PLAYGROUND_INDEX)
    await page.waitForTimeout(200)

    // Click again
    await clickCollapsibleTrigger(page, PLAYGROUND_INDEX)
    await page.waitForTimeout(200)

    const afterDoubleClick = await getCollapsibleInfo(page, PLAYGROUND_INDEX)
    // Should be back to original state
    expect(afterDoubleClick.isOpen).toBe(initialState)
  })

  test('6. trigger slot exists with clickable behavior', async ({ page }) => {
    const triggerExists = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return false

      const root = shadow.querySelector('.mirror-root')
      const collapsibleRoot = root?.children[1] as HTMLElement
      const trigger = collapsibleRoot?.querySelector('[data-slot="Trigger"]') as HTMLElement

      return trigger && trigger.getAttribute('role') === 'button'
    }, PLAYGROUND_INDEX)

    expect(triggerExists).toBe(true)
  })

  test('7. trigger has chevron-down icon', async ({ page }) => {
    const hasIcon = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return false

      const root = shadow.querySelector('.mirror-root')
      const collapsibleRoot = root?.children[1] as HTMLElement
      const trigger = collapsibleRoot?.querySelector('[data-slot="Trigger"]') as HTMLElement

      // Look for SVG icon inside trigger
      const svg = trigger?.querySelector('svg')
      return !!svg
    }, PLAYGROUND_INDEX)

    expect(hasIcon).toBe(true)
  })

  test('8. visual regression - open by default', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('collapsible-filter-open.png')
  })

  test('9. visual regression - after closing', async ({ page }) => {
    await clickCollapsibleTrigger(page, PLAYGROUND_INDEX)
    await page.waitForTimeout(200)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('collapsible-filter-closed.png')
  })
})
