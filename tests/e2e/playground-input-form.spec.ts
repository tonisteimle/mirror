/**
 * E2E Tests für 10-eingabe.html - Form Components
 * Playgrounds 18-19: Form
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
// Playground 18: Form Basic
// =============================================================================
test.describe('Playground 18: Form Basic', () => {
  const PLAYGROUND_INDEX = 18

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has form with fields (name, email, role)', async ({ page }) => {
    const fields = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const fieldElements = component?.querySelectorAll('[data-component="Field"]')
      return fieldElements?.length || 0
    }, PLAYGROUND_INDEX)

    expect(fields).toBe(3)
  })

  test('has action buttons (Speichern, Abbrechen)', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Speichern')
    expect(text).toContain('Abbrechen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('form-basic.png')
  })
})

// =============================================================================
// Playground 19: Form with Custom Fields
// =============================================================================
test.describe('Playground 19: Form Custom Fields', () => {
  const PLAYGROUND_INDEX = 19

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has custom fields (title, description, priority, done)', async ({ page }) => {
    const fields = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const fieldElements = component?.querySelectorAll('[data-component="Field"]')
      return fieldElements?.length || 0
    }, PLAYGROUND_INDEX)

    expect(fields).toBe(4)
  })

  test('has "Erstellen" button', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Erstellen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('form-custom.png')
  })
})
