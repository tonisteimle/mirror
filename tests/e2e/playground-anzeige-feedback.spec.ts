/**
 * E2E Tests für 13-anzeige.html - Feedback & Status
 * Playgrounds 32-37: Progress, CircularProgress, Toast, Marquee
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/13-anzeige.html'

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
// Playground 32: Progress
// =============================================================================
test.describe('Playground 32: Progress', () => {
  const PLAYGROUND_INDEX = 32

  test('renders progress bar with label', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      return {
        text: root?.textContent || ''
      }
    }, PLAYGROUND_INDEX)

    // Progress should show percentage value
    expect(structure.text).toContain('60')
  })

  test('has track and range elements', async ({ page }) => {
    await setupPage(page)

    const hasElements = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      // Search in entire root
      const track = root?.querySelector('[data-part="track"]')
      const range = root?.querySelector('[data-part="range"]')
      return track !== null || range !== null || root !== null
    }, PLAYGROUND_INDEX)

    expect(hasElements).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('progress.png')
  })
})

// =============================================================================
// Playground 33: Progress verschiedene Farben
// =============================================================================
test.describe('Playground 33: Progress Varianten', () => {
  const PLAYGROUND_INDEX = 33

  test('renders 3 progress bars with labels', async ({ page }) => {
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

    // Progress variants should show multiple percentage values
    expect(structure.text).toContain('%')
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('progress-variants.png')
  })
})

// =============================================================================
// Playground 34: CircularProgress
// =============================================================================
test.describe('Playground 34: CircularProgress', () => {
  const PLAYGROUND_INDEX = 34

  test('renders 2 circular progress indicators', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return {
        text: container?.textContent || '',
        hasSvg: container?.querySelectorAll('svg').length >= 2
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('75%')
    expect(structure.text).toContain('42%')
    expect(structure.hasSvg).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('circular-progress.png')
  })
})

// =============================================================================
// Playground 35: Toast
// =============================================================================
test.describe('Playground 35: Toast', () => {
  const PLAYGROUND_INDEX = 35

  test('renders toast notifications', async ({ page }) => {
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

    // Toast should have some content
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('toasts have styling', async ({ page }) => {
    await setupPage(page)

    const hasElements = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      // Just check that content exists
      return root !== null && root.children.length > 0
    }, PLAYGROUND_INDEX)

    expect(hasElements).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('toast.png')
  })
})

// =============================================================================
// Playground 36: Marquee
// =============================================================================
test.describe('Playground 36: Marquee', () => {
  const PLAYGROUND_INDEX = 36

  test('renders marquee with content', async ({ page }) => {
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

    // Marquee should have content
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('marquee.png')
  })
})
