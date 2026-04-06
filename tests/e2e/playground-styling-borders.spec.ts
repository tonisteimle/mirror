/**
 * E2E Tests für 05-styling.html - Borders & Border Radius
 * Playgrounds 3-4: bor, boc, rad
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/05-styling.html'

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

// =============================================================================
// Playground 3: Borders
// =============================================================================
test.describe('Playground 3: Borders', () => {
  const PLAYGROUND_INDEX = 3

  test('renders 3 boxes with borders', async ({ page }) => {
    await setupPage(page)

    const count = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return container.children.length
    }, PLAYGROUND_INDEX)

    expect(count).toBe(3)
  })

  test('boxes have different border widths', async ({ page }) => {
    await setupPage(page)

    const borders = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        const style = getComputedStyle(el as HTMLElement)
        return {
          borderWidth: style.borderWidth,
          borderColor: style.borderColor,
          text: el.textContent?.trim()
        }
      })
    }, PLAYGROUND_INDEX)

    // First box: 2px border
    expect(borders[0].borderWidth).toBe('2px')
    expect(borders[0].text).toBe('2px')

    // Second box: 4px border
    expect(borders[1].borderWidth).toBe('4px')
    expect(borders[1].text).toBe('4px')

    // Third box: 1px border (subtle)
    expect(borders[2].borderWidth).toBe('1px')
    expect(borders[2].text).toBe('subtle')
  })

  test('boxes have different border colors', async ({ page }) => {
    await setupPage(page)

    const colors = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        return getComputedStyle(el as HTMLElement).borderColor
      })
    }, PLAYGROUND_INDEX)

    // All three should have different colors
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(3)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('borders.png')
  })
})

// =============================================================================
// Playground 4: Border Radius
// =============================================================================
test.describe('Playground 4: Border Radius', () => {
  const PLAYGROUND_INDEX = 4

  test('renders 4 boxes with different radii', async ({ page }) => {
    await setupPage(page)

    const count = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return container.children.length
    }, PLAYGROUND_INDEX)

    expect(count).toBe(4)
  })

  test('boxes have increasing border radius', async ({ page }) => {
    await setupPage(page)

    const radii = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        const style = getComputedStyle(el as HTMLElement)
        return {
          radius: style.borderRadius,
          text: el.textContent?.trim()
        }
      })
    }, PLAYGROUND_INDEX)

    // rad 0
    expect(radii[0].radius).toBe('0px')
    expect(radii[0].text).toBe('0')

    // rad 4
    expect(radii[1].radius).toBe('4px')
    expect(radii[1].text).toBe('4')

    // rad 12
    expect(radii[2].radius).toBe('12px')
    expect(radii[2].text).toBe('12')

    // rad 99 (circle)
    expect(radii[3].radius).toBe('99px')
    expect(radii[3].text).toBe('99')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('border-radius.png')
  })
})
