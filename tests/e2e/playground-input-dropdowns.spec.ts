/**
 * Dropdown E2E Tests
 *
 * Tests Select from 11-eingabe.html tutorial.
 *
 * Playground 6: Select - Dropdown with options
 *
 * Key behaviors:
 * - Select opens dropdown with options
 * - Options have values
 * - Placeholder shown when nothing selected
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/11-eingabe.html'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function setupPage(page: Page): Promise<void> {
  await page.goto(TUTORIAL_URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-playground]', { timeout: 10000 })
  await page.waitForFunction(() => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[0]?.querySelector('.playground-preview')
    return preview?.shadowRoot !== null
  }, { timeout: 10000 })
  await page.waitForTimeout(1000)
}

async function getComponentInfo(page: Page, playgroundIndex: number): Promise<{
  exists: boolean
  textContent: string
  childCount: number
  elementCount: number
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    const root = shadow?.querySelector('.mirror-root')
    const component = root?.children[1] as HTMLElement

    return {
      exists: !!component,
      textContent: component?.textContent || '',
      childCount: component?.children?.length || 0,
      elementCount: component?.querySelectorAll('*')?.length || 0
    }
  }, playgroundIndex)
}

async function hasSlot(page: Page, playgroundIndex: number, slotName: string): Promise<boolean> {
  return page.evaluate((args) => {
    const { idx, slot } = args
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    const root = shadow?.querySelector('.mirror-root')
    const component = root?.children[1] as HTMLElement
    return !!component?.querySelector(`[data-slot="${slot}"]`)
  }, { idx: playgroundIndex, slot: slotName })
}

// ============================================================================
// PLAYGROUND 6: Select
// ============================================================================

test.describe('Playground 6: Select', () => {
  const PLAYGROUND_INDEX = 6

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has select structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has Trigger slot', async ({ page }) => {
    const hasTrigger = await hasSlot(page, PLAYGROUND_INDEX, 'Trigger')
    expect(hasTrigger).toBe(true)
  })

  test('3. has Content slot', async ({ page }) => {
    const hasContent = await hasSlot(page, PLAYGROUND_INDEX, 'Content')
    expect(hasContent).toBe(true)
  })

  test('4. has options', async ({ page }) => {
    const optionCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      const options = component?.querySelectorAll('[data-component="Option"]')
      const items = component?.querySelectorAll('[data-slot="Item"]')
      return Math.max(options?.length || 0, items?.length || 0)
    }, PLAYGROUND_INDEX)

    expect(optionCount).toBeGreaterThanOrEqual(2)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('select.png')
  })
})
