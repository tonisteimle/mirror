/**
 * E2E Tests für 10-eingabe.html - Sliders
 * Playgrounds 5-8, 17: Slider, RangeSlider, NumberInput, AngleSlider
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/10-eingabe.html'

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
// Playground 5: Slider Basic
// =============================================================================
test.describe('Playground 5: Slider Basic', () => {
  const PLAYGROUND_INDEX = 5

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has slider structure with Track, Range, Thumb', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return {
        hasTrack: !!component?.querySelector('[data-slot="Track"]'),
        hasRange: !!component?.querySelector('[data-slot="Range"]'),
        hasThumb: !!component?.querySelector('[data-slot="Thumb"]')
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasTrack).toBe(true)
    expect(structure.hasRange).toBe(true)
    expect(structure.hasThumb).toBe(true)
  })

  test('shows "Lautstärke" label', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Lautstärke')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('slider-basic.png')
  })
})

// =============================================================================
// Playground 6: Slider with Markers
// =============================================================================
test.describe('Playground 6: Slider with Markers', () => {
  const PLAYGROUND_INDEX = 6

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has marker group', async ({ page }) => {
    const hasMarkers = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return !!component?.querySelector('[data-slot="MarkerGroup"]')
    }, PLAYGROUND_INDEX)

    expect(hasMarkers).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('slider-markers.png')
  })
})

// =============================================================================
// Playground 7: RangeSlider
// =============================================================================
test.describe('Playground 7: RangeSlider', () => {
  const PLAYGROUND_INDEX = 7

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has two thumbs for range selection', async ({ page }) => {
    const thumbCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const thumbs = component?.querySelectorAll('[data-slot="Thumb"]')
      return thumbs?.length || 0
    }, PLAYGROUND_INDEX)

    expect(thumbCount).toBe(2)
  })

  test('shows "Preisbereich" label', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Preisbereich')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('range-slider.png')
  })
})

// =============================================================================
// Playground 8: NumberInput
// =============================================================================
test.describe('Playground 8: NumberInput', () => {
  const PLAYGROUND_INDEX = 8

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has increment and decrement triggers', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return {
        hasIncrement: !!component?.querySelector('[data-slot="IncrementTrigger"]'),
        hasDecrement: !!component?.querySelector('[data-slot="DecrementTrigger"]'),
        hasInput: !!component?.querySelector('[data-slot="Input"]')
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasIncrement).toBe(true)
    expect(structure.hasDecrement).toBe(true)
    expect(structure.hasInput).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('number-input.png')
  })
})

// =============================================================================
// Playground 17: AngleSlider
// =============================================================================
test.describe('Playground 17: AngleSlider', () => {
  const PLAYGROUND_INDEX = 17

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has circular control with thumb', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return {
        hasControl: !!component?.querySelector('[data-slot="Control"]'),
        hasThumb: !!component?.querySelector('[data-slot="Thumb"]')
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasControl).toBe(true)
    expect(structure.hasThumb).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('angle-slider.png')
  })
})
