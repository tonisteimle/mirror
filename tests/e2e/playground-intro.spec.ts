/**
 * E2E Tests für 00-intro.html - Was ist Mirror?
 * Playgrounds 0-6: Button, User Card, Hierarchie, Komponente, Tokens, States
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/00-intro.html'

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
// Playground 0: Simple Button
// =============================================================================
test.describe('Playground 0: Simple Button', () => {
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
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('intro-button.png')
  })
})

// =============================================================================
// Playground 1: User Card with Icon
// =============================================================================
test.describe('Playground 1: User Card', () => {
  const PLAYGROUND_INDEX = 1

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has user name and role', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Max Mustermann')
    expect(text).toContain('Designer')
  })

  test('has icon element', async ({ page }) => {
    const hasIcon = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return !!component?.querySelector('svg')
    }, PLAYGROUND_INDEX)

    expect(hasIcon).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('intro-user-card.png')
  })
})

// =============================================================================
// Playground 2: Hierarchie
// =============================================================================
test.describe('Playground 2: Hierarchie', () => {
  const PLAYGROUND_INDEX = 2

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has title and description', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Titel')
    expect(text).toContain('Beschreibung')
  })

  test('has Abbrechen and OK buttons', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Abbrechen')
    expect(text).toContain('OK')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('intro-hierarchie.png')
  })
})

// =============================================================================
// Playground 3: PrimaryBtn Component
// =============================================================================
test.describe('Playground 3: PrimaryBtn Component', () => {
  const PLAYGROUND_INDEX = 3

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 buttons (Speichern, Senden, Weiter)', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Speichern')
    expect(text).toContain('Senden')
    expect(text).toContain('Weiter')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('intro-primarybtn.png')
  })
})

// =============================================================================
// Playground 4: Tokens
// =============================================================================
test.describe('Playground 4: Tokens', () => {
  const PLAYGROUND_INDEX = 4

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has card with "Mit Tokens" title', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Mit Tokens')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('intro-tokens.png')
  })
})

// =============================================================================
// Playground 5: States with toggle
// =============================================================================
test.describe('Playground 5: States Toggle', () => {
  const PLAYGROUND_INDEX = 5

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has button with "Anklicken" text', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Anklicken')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('intro-states.png')
  })
})

// =============================================================================
// Playground 6: ExpandBtn with content change
// =============================================================================
test.describe('Playground 6: ExpandBtn', () => {
  const PLAYGROUND_INDEX = 6

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has "Mehr zeigen" text', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Mehr zeigen')
  })

  test('has chevron icon', async ({ page }) => {
    const hasIcon = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return !!component?.querySelector('svg')
    }, PLAYGROUND_INDEX)

    expect(hasIcon).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('intro-expandbtn.png')
  })
})
