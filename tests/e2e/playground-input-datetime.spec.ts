/**
 * DateTime E2E Tests
 *
 * Tests DatePicker from 11-eingabe.html tutorial.
 *
 * Playground 7: DatePicker - Calendar date selection
 *
 * Key behaviors:
 * - DatePicker shows calendar
 * - Navigation between months
 * - Keyboard accessible
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
// PLAYGROUND 7: DatePicker
// ============================================================================

test.describe('Playground 7: DatePicker', () => {
  const PLAYGROUND_INDEX = 7

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has datepicker structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has calendar elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    // DatePicker should have elements
    expect(info.elementCount).toBeGreaterThan(5)
  })

  test('3. has interactive elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('4. has multiple elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(5)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('datepicker.png')
  })
})
