/**
 * E2E Tests für 03-tokens.html - Design Tokens
 * Playgrounds 0-4: Magische Werte, Token Definition, Typen, Semantisch, Drei Stufen
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/03-tokens.html'

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
// Playground 0: Magische Werte Problem
// =============================================================================
test.describe('Playground 0: Magic Values Problem', () => {
  const PLAYGROUND_INDEX = 0

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has Btn, Link, Badge with same color', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Speichern')
    expect(text).toContain('Mehr erfahren')
    expect(text).toContain('Neu')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('tokens-magic.png')
  })
})

// =============================================================================
// Playground 1: Tokens definieren
// =============================================================================
test.describe('Playground 1: Token Definition', () => {
  const PLAYGROUND_INDEX = 1

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 buttons using $primary token', async ({ page }) => {
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
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('tokens-definition.png')
  })
})

// =============================================================================
// Playground 2: Mehrere Token-Typen
// =============================================================================
test.describe('Playground 2: Multiple Token Types', () => {
  const PLAYGROUND_INDEX = 2

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has Card with Button using multiple tokens', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('In der Card')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('tokens-types.png')
  })
})

// =============================================================================
// Playground 3: Semantische Tokens
// =============================================================================
test.describe('Playground 3: Semantic Tokens', () => {
  const PLAYGROUND_INDEX = 3

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has Card with Speichern and Löschen buttons', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Semantische Tokens')
    expect(text).toContain('Speichern')
    expect(text).toContain('Löschen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('tokens-semantic.png')
  })
})

// =============================================================================
// Playground 4: Drei Stufen
// =============================================================================
test.describe('Playground 4: Three Levels', () => {
  const PLAYGROUND_INDEX = 4

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has complete Design System card', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Design System')
    expect(text).toContain('Tokens + Komponenten')
    expect(text).toContain('Speichern')
    expect(text).toContain('Abbrechen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('tokens-three-levels.png')
  })
})
