/**
 * E2E Tests für 10-eingabe.html - Text Input Components
 * Playgrounds 9-12: PinInput, PasswordInput, TagsInput, Editable
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
// Playground 9: PinInput
// =============================================================================
test.describe('Playground 9: PinInput', () => {
  const PLAYGROUND_INDEX = 9

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 6 input fields for PIN', async ({ page }) => {
    const inputCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const inputs = component?.querySelectorAll('input')
      return inputs?.length || 0
    }, PLAYGROUND_INDEX)

    expect(inputCount).toBe(6)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('pin-input.png')
  })
})

// =============================================================================
// Playground 10: PasswordInput
// =============================================================================
test.describe('Playground 10: PasswordInput', () => {
  const PLAYGROUND_INDEX = 10

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has visibility toggle', async ({ page }) => {
    const hasToggle = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return !!component?.querySelector('[data-slot="VisibilityTrigger"]')
    }, PLAYGROUND_INDEX)

    expect(hasToggle).toBe(true)
  })

  test('shows "Passwort" label', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Passwort')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('password-input.png')
  })
})

// =============================================================================
// Playground 11: TagsInput
// =============================================================================
test.describe('Playground 11: TagsInput', () => {
  const PLAYGROUND_INDEX = 11

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has default tags "React" and "Vue"', async ({ page }) => {
    const tags = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const tagElements = component?.querySelectorAll('[data-slot="Tag"]')
      return Array.from(tagElements || []).map(t => t.textContent?.trim())
    }, PLAYGROUND_INDEX)

    expect(tags).toContain('React')
    expect(tags).toContain('Vue')
  })

  test('tags have delete trigger', async ({ page }) => {
    const hasDelete = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return !!component?.querySelector('[data-slot="TagDeleteTrigger"]')
    }, PLAYGROUND_INDEX)

    expect(hasDelete).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('tags-input.png')
  })
})

// =============================================================================
// Playground 12: Editable
// =============================================================================
test.describe('Playground 12: Editable', () => {
  const PLAYGROUND_INDEX = 12

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has preview text "Klick zum Bearbeiten"', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const previewEl = component?.querySelector('[data-slot="Preview"]')
      return previewEl?.textContent?.trim() || component?.textContent?.trim() || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Klick zum Bearbeiten')
  })

  test('has submit and cancel triggers', async ({ page }) => {
    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return {
        hasSubmit: !!component?.querySelector('[data-slot="SubmitTrigger"]'),
        hasCancel: !!component?.querySelector('[data-slot="CancelTrigger"]')
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasSubmit).toBe(true)
    expect(structure.hasCancel).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('editable.png')
  })
})
