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
      const progress = root?.children[1] as HTMLElement

      return {
        text: progress?.textContent || ''
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Fortschritt')
    expect(structure.text).toContain('60%')
  })

  test('has track and range elements', async ({ page }) => {
    await setupPage(page)

    const hasElements = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const progress = root?.children[1] as HTMLElement

      const track = progress?.querySelector('[data-part="track"]')
      const range = progress?.querySelector('[data-part="range"]')
      return track !== null && range !== null
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
      const container = root?.children[1] as HTMLElement

      return {
        text: container?.textContent || '',
        childCount: container?.children.length
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('CPU')
    expect(structure.text).toContain('Memory')
    expect(structure.text).toContain('Disk')
    expect(structure.childCount).toBe(3)
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

  test('renders 3 toast notifications', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return {
        text: container?.textContent || '',
        childCount: container?.children.length
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Erfolgreich gespeichert')
    expect(structure.text).toContain('Fehler beim Speichern')
    expect(structure.text).toContain('Verbindung instabil')
    expect(structure.childCount).toBe(3)
  })

  test('toasts have colored borders', async ({ page }) => {
    await setupPage(page)

    const hasBorders = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      const toasts = Array.from(container?.children || []) as HTMLElement[]
      return toasts.every(toast => {
        const root = toast.querySelector('[data-part="root"]') as HTMLElement
        if (!root) return false
        const style = getComputedStyle(root)
        return style.borderWidth === '1px'
      })
    }, PLAYGROUND_INDEX)

    expect(hasBorders).toBe(true)
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

  test('renders marquee with news content', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const marquee = root?.children[1] as HTMLElement

      return {
        text: marquee?.textContent || ''
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Breaking News')
    expect(structure.text).toContain('Mirror v2.0')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('marquee.png')
  })
})
