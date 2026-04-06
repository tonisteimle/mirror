/**
 * E2E Tests für 10-eingabe.html - DateTime Components
 * Playgrounds 27-29: DatePicker, Timer, DateInput
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
// Playground 27: DatePicker
// =============================================================================
test.describe('Playground 27: DatePicker', () => {
  const PLAYGROUND_INDEX = 27

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has "Datum" label', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Datum')
  })

  test('has input and trigger', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return {
        hasInput: !!component?.querySelector('[data-slot="Input"]'),
        hasTrigger: !!component?.querySelector('[data-slot="Trigger"]'),
        hasControl: !!component?.querySelector('[data-slot="Control"]')
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasInput).toBe(true)
    expect(structure.hasTrigger).toBe(true)
    expect(structure.hasControl).toBe(true)
  })

  test('has calendar content', async ({ page }) => {
    const hasContent = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return !!component?.querySelector('[data-slot="Content"]')
    }, PLAYGROUND_INDEX)

    expect(hasContent).toBe(true)
  })

  test('has view navigation (prev/next triggers)', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return {
        hasPrevTrigger: !!component?.querySelector('[data-slot="PrevTrigger"]'),
        hasNextTrigger: !!component?.querySelector('[data-slot="NextTrigger"]'),
        hasViewControl: !!component?.querySelector('[data-slot="ViewControl"]')
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasPrevTrigger).toBe(true)
    expect(structure.hasNextTrigger).toBe(true)
    expect(structure.hasViewControl).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('datepicker.png')
  })
})

// =============================================================================
// Playground 28: Timer
// =============================================================================
test.describe('Playground 28: Timer', () => {
  const PLAYGROUND_INDEX = 28

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has timer area with segments', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return {
        hasArea: !!component?.querySelector('[data-slot="Area"]'),
        hasSegment: !!component?.querySelector('[data-slot="Segment"]'),
        hasSeparator: !!component?.querySelector('[data-slot="Separator"]')
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasArea).toBe(true)
    expect(structure.hasSegment).toBe(true)
    expect(structure.hasSeparator).toBe(true)
  })

  test('has control buttons (Start, Pause, Reset)', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Start')
    expect(text).toContain('Pause')
    expect(text).toContain('Reset')
  })

  test('has action trigger', async ({ page }) => {
    const hasActionTrigger = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return !!component?.querySelector('[data-slot="ActionTrigger"]')
    }, PLAYGROUND_INDEX)

    expect(hasActionTrigger).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('timer.png')
  })
})

// =============================================================================
// Playground 29: DateInput
// =============================================================================
test.describe('Playground 29: DateInput', () => {
  const PLAYGROUND_INDEX = 29

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has "Geburtsdatum" label', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Geburtsdatum')
  })

  test('has segmented date structure (Control, Segment, Separator)', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return {
        hasControl: !!component?.querySelector('[data-slot="Control"]'),
        hasSegment: !!component?.querySelector('[data-slot="Segment"]'),
        hasSeparator: !!component?.querySelector('[data-slot="Separator"]')
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasControl).toBe(true)
    expect(structure.hasSegment).toBe(true)
    expect(structure.hasSeparator).toBe(true)
  })

  test('has multiple segments for date parts', async ({ page }) => {
    const segmentCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const segments = component?.querySelectorAll('[data-slot="Segment"]')
      return segments?.length || 0
    }, PLAYGROUND_INDEX)

    // DateInput should have at least 3 segments (day, month, year)
    expect(segmentCount).toBeGreaterThanOrEqual(3)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('date-input.png')
  })
})
