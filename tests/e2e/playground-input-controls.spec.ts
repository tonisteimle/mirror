/**
 * E2E Tests für 10-eingabe.html - Form Controls
 * Playgrounds 0-4: Checkbox, Switch, RadioGroup
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
// Playground 0: Checkbox Basic
// =============================================================================
test.describe('Playground 0: Checkbox Basic', () => {
  const PLAYGROUND_INDEX = 0

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has checkbox structure with Root, Control, Label', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return {
        hasRoot: !!component?.querySelector('[data-slot="Root"]'),
        hasControl: !!component?.querySelector('[data-slot="Control"]'),
        hasLabel: !!component?.querySelector('[data-slot="Label"]')
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasRoot).toBe(true)
    expect(structure.hasControl).toBe(true)
  })

  test('label shows "Newsletter abonnieren"', async ({ page }) => {
    const labelText = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent?.trim() || ''
    }, PLAYGROUND_INDEX)

    expect(labelText).toContain('Newsletter abonnieren')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('checkbox-basic.png')
  })
})

// =============================================================================
// Playground 1: Checkbox with Custom Icon
// =============================================================================
test.describe('Playground 1: Checkbox with Icon', () => {
  const PLAYGROUND_INDEX = 1

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('checkbox is checked by default', async ({ page }) => {
    const isChecked = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const control = component?.querySelector('[data-slot="Control"]') as HTMLElement
      return control?.getAttribute('data-state') === 'checked' ||
             control?.getAttribute('aria-checked') === 'true'
    }, PLAYGROUND_INDEX)

    expect(isChecked).toBe(true)
  })

  test('label shows "Ich akzeptiere die AGB"', async ({ page }) => {
    const labelText = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent?.trim() || ''
    }, PLAYGROUND_INDEX)

    expect(labelText).toContain('AGB')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('checkbox-icon.png')
  })
})

// =============================================================================
// Playground 2: Switch
// =============================================================================
test.describe('Playground 2: Switch', () => {
  const PLAYGROUND_INDEX = 2

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has switch structure with Track and Thumb', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return {
        hasTrack: !!component?.querySelector('[data-slot="Track"]'),
        hasThumb: !!component?.querySelector('[data-slot="Thumb"]')
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasTrack).toBe(true)
    expect(structure.hasThumb).toBe(true)
  })

  test('label shows "Dark Mode"', async ({ page }) => {
    const labelText = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent?.trim() || ''
    }, PLAYGROUND_INDEX)

    expect(labelText).toContain('Dark Mode')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('switch.png')
  })
})

// =============================================================================
// Playground 3: RadioGroup Basic
// =============================================================================
test.describe('Playground 3: RadioGroup Basic', () => {
  const PLAYGROUND_INDEX = 3

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 radio items', async ({ page }) => {
    const count = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const items = component?.querySelectorAll('[data-component="RadioItem"]')
      return items?.length || 0
    }, PLAYGROUND_INDEX)

    expect(count).toBe(3)
  })

  test('"monthly" is selected by default', async ({ page }) => {
    const selected = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const items = Array.from(component?.querySelectorAll('[data-component="RadioItem"]') || [])
      const checkedItem = items.find(item => {
        const control = item.querySelector('[data-slot="ItemControl"]')
        return control?.getAttribute('data-state') === 'checked'
      })
      return checkedItem?.textContent?.trim() || ''
    }, PLAYGROUND_INDEX)

    expect(selected).toContain('Monatlich')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('radiogroup-basic.png')
  })
})

// =============================================================================
// Playground 4: RadioGroup with Indicator
// =============================================================================
test.describe('Playground 4: RadioGroup with Indicator', () => {
  const PLAYGROUND_INDEX = 4

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 radio items with card styling', async ({ page }) => {
    const count = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const items = component?.querySelectorAll('[data-component="RadioItem"]')
      return items?.length || 0
    }, PLAYGROUND_INDEX)

    expect(count).toBe(3)
  })

  test('has indicator elements', async ({ page }) => {
    const hasIndicator = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return !!component?.querySelector('[data-slot="Indicator"]')
    }, PLAYGROUND_INDEX)

    expect(hasIndicator).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('radiogroup-indicator.png')
  })
})
