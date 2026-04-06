/**
 * E2E Tests für 01-elemente.html - Elemente & Hierarchie
 * Playgrounds 0-6: Grundsyntax, Primitives, Styling, Hierarchie, Layout, Icons, Card
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/01-elemente.html'

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
// Playground 0: Grundsyntax Button
// =============================================================================
test.describe('Playground 0: Grundsyntax', () => {
  const PLAYGROUND_INDEX = 0

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has button with "Speichern" text', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent?.trim() || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Speichern')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('elemente-grundsyntax.png')
  })
})

// =============================================================================
// Playground 1: Primitives
// =============================================================================
test.describe('Playground 1: Primitives', () => {
  const PLAYGROUND_INDEX = 1

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has Text, Button, Input elements', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Überschrift')
    expect(text).toContain('Klick mich')
  })

  test('has input with placeholder', async ({ page }) => {
    const hasInput = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return !!component?.querySelector('input')
    }, PLAYGROUND_INDEX)

    expect(hasInput).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('elemente-primitives.png')
  })
})

// =============================================================================
// Playground 2: Styling Properties
// =============================================================================
test.describe('Playground 2: Styling', () => {
  const PLAYGROUND_INDEX = 2

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has colored text and sized frames', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Farbiger Text')
    expect(text).toContain('200 x 50')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('elemente-styling.png')
  })
})

// =============================================================================
// Playground 3: Hierarchie
// =============================================================================
test.describe('Playground 3: Hierarchie', () => {
  const PLAYGROUND_INDEX = 3

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has nested structure with title and buttons', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Titel')
    expect(text).toContain('Untertitel')
    expect(text).toContain('Abbrechen')
    expect(text).toContain('OK')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('elemente-hierarchie.png')
  })
})

// =============================================================================
// Playground 4: Layout Preview
// =============================================================================
test.describe('Playground 4: Layout Preview', () => {
  const PLAYGROUND_INDEX = 4

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has horizontal and centered layouts', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Zentriert')
    expect(text).toContain('Links')
    expect(text).toContain('Rechts')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('elemente-layout.png')
  })
})

// =============================================================================
// Playground 5: Icons
// =============================================================================
test.describe('Playground 5: Icons', () => {
  const PLAYGROUND_INDEX = 5

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has multiple SVG icons', async ({ page }) => {
    const iconCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.querySelectorAll('svg')?.length || 0
    }, PLAYGROUND_INDEX)

    expect(iconCount).toBeGreaterThanOrEqual(4)
  })

  test('has button with icon and text', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Speichern')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('elemente-icons.png')
  })
})

// =============================================================================
// Playground 6: Praxisbeispiel Card
// =============================================================================
test.describe('Playground 6: Card Praxisbeispiel', () => {
  const PLAYGROUND_INDEX = 6

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has user card with name and role', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Max Mustermann')
    expect(text).toContain('Software Engineer')
    expect(text).toContain('Nachricht')
    expect(text).toContain('Folgen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('elemente-card.png')
  })
})
