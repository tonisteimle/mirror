/**
 * E2E Tests for 12-overlays.html - Dialog
 * Playgrounds 8-12: Basic Dialog, Close, Backdrop, Confirm, Form
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/12-overlays.html'

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
// Playground 8: Basic Dialog
// =============================================================================
test.describe('Playground 8: Basic Dialog', () => {
  const PLAYGROUND_INDEX = 8

  test('renders dialog trigger button', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        text: root?.textContent || '',
        hasButton: root?.querySelector('button') !== null,
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Open Dialog')
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('dialog-basic.png')
  })
})

// =============================================================================
// Playground 9: Dialog with CloseTrigger
// =============================================================================
test.describe('Playground 9: Dialog with CloseTrigger', () => {
  const PLAYGROUND_INDEX = 9

  test('renders dialog trigger', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        text: root?.textContent || '',
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Open')
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('dialog-closetrigger.png')
  })
})

// =============================================================================
// Playground 10: Dialog Custom Backdrop
// =============================================================================
test.describe('Playground 10: Dialog Custom Backdrop', () => {
  const PLAYGROUND_INDEX = 10

  test('renders dialog with custom backdrop trigger', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        text: root?.textContent || '',
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Custom backdrop')
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('dialog-backdrop.png')
  })
})

// =============================================================================
// Playground 11: Confirm Dialog
// =============================================================================
test.describe('Playground 11: Confirm Dialog', () => {
  const PLAYGROUND_INDEX = 11

  test('renders delete confirmation trigger', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        text: root?.textContent || '',
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Delete')
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('dialog-confirm.png')
  })
})

// =============================================================================
// Playground 12: Form Dialog
// =============================================================================
test.describe('Playground 12: Form Dialog', () => {
  const PLAYGROUND_INDEX = 12

  test('renders form dialog trigger', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        text: root?.textContent || '',
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Create')
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('dialog-form.png')
  })
})
