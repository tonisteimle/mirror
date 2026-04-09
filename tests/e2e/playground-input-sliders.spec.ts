/**
 * Slider E2E Tests
 *
 * Tests Slider from 11-eingabe.html tutorial.
 *
 * Playground 5: Slider - Track, Range, Thumb
 *
 * Key behaviors:
 * - Slider adjusts value via thumb drag
 * - step prop controls increment
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
// PLAYGROUND 5: Slider
// ============================================================================

test.describe('Playground 5: Slider', () => {
  const PLAYGROUND_INDEX = 5

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has slider structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has Track slot', async ({ page }) => {
    const hasTrack = await hasSlot(page, PLAYGROUND_INDEX, 'Track')
    expect(hasTrack).toBe(true)
  })

  test('3. has Thumb slot', async ({ page }) => {
    const hasThumb = await hasSlot(page, PLAYGROUND_INDEX, 'Thumb')
    expect(hasThumb).toBe(true)
  })

  test('4. has Range slot', async ({ page }) => {
    const hasRange = await hasSlot(page, PLAYGROUND_INDEX, 'Range')
    expect(hasRange).toBe(true)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('slider-basic.png')
  })
})
