/**
 * E2E Tests für 10-eingabe.html - Dropdown Components
 * Playgrounds 20-22: Select, Combobox, Listbox
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
// Playground 20: Select
// =============================================================================
test.describe('Playground 20: Select', () => {
  const PLAYGROUND_INDEX = 20

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has trigger with placeholder "Wähle..."', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const trigger = component?.querySelector('[data-slot="Trigger"]')
      return trigger?.textContent?.trim() || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Wähle')
  })

  test('has 3 options (Berlin, Hamburg, München)', async ({ page }) => {
    const optionCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const options = component?.querySelectorAll('[data-component="Option"]')
      return options?.length || 0
    }, PLAYGROUND_INDEX)

    expect(optionCount).toBe(3)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('select.png')
  })
})

// =============================================================================
// Playground 21: Combobox
// =============================================================================
test.describe('Playground 21: Combobox', () => {
  const PLAYGROUND_INDEX = 21

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has input field for search', async ({ page }) => {
    const hasInput = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return !!component?.querySelector('[data-slot="Input"]')
    }, PLAYGROUND_INDEX)

    expect(hasInput).toBe(true)
  })

  test('shows "Sprache wählen" label', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Sprache')
  })

  test('has 4 options (JavaScript, TypeScript, Python, Rust)', async ({ page }) => {
    const optionCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const options = component?.querySelectorAll('[data-component="Option"]')
      return options?.length || 0
    }, PLAYGROUND_INDEX)

    expect(optionCount).toBe(4)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('combobox.png')
  })
})

// =============================================================================
// Playground 22: Listbox
// =============================================================================
test.describe('Playground 22: Listbox', () => {
  const PLAYGROUND_INDEX = 22

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 listbox items (Klein, Mittel, Groß)', async ({ page }) => {
    const items = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const listItems = component?.querySelectorAll('[data-component="ListboxItem"]')
      return Array.from(listItems || []).map(item => item.textContent?.trim())
    }, PLAYGROUND_INDEX)

    expect(items).toContain('Klein')
    expect(items).toContain('Mittel')
    expect(items).toContain('Groß')
  })

  test('"Mittel" is selected by default', async ({ page }) => {
    const selected = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const items = Array.from(component?.querySelectorAll('[data-component="ListboxItem"]') || [])
      const selectedItem = items.find(item => {
        return item.getAttribute('data-selected') === 'true' ||
               item.getAttribute('aria-selected') === 'true' ||
               item.getAttribute('data-state') === 'selected'
      })
      return selectedItem?.textContent?.trim() || ''
    }, PLAYGROUND_INDEX)

    expect(selected).toContain('Mittel')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('listbox.png')
  })
})
