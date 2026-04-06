/**
 * E2E Tests für 05-styling.html - Farben & Gradients
 * Playgrounds 0-2: Hex, rgba, benannte Farben, Gradients
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/05-styling.html'

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
// Playground 0: Farben (Hex, benannte, rgba)
// =============================================================================
test.describe('Playground 0: Farben', () => {
  const PLAYGROUND_INDEX = 0

  test('renders 8 colored boxes', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return {
        childCount: container.children.length,
        display: getComputedStyle(container).display,
        flexWrap: getComputedStyle(container).flexWrap
      }
    }, PLAYGROUND_INDEX)

    expect(structure.childCount).toBe(8)
    expect(structure.display).toBe('flex')
    expect(structure.flexWrap).toBe('wrap')
  })

  test('boxes have different background colors', async ({ page }) => {
    await setupPage(page)

    const colors = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        return getComputedStyle(el as HTMLElement).backgroundColor
      })
    }, PLAYGROUND_INDEX)

    // All 8 colors should be present
    expect(colors.length).toBe(8)
    // Check that we have various colors (not all the same)
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBeGreaterThan(4)
  })

  test('has transparent boxes (rgba or hex with alpha)', async ({ page }) => {
    await setupPage(page)

    const hasTransparent = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      const colors = Array.from(container.children).map(el => {
        return getComputedStyle(el as HTMLElement).backgroundColor
      })

      // Check for rgba colors with alpha < 1
      return colors.some(c => c.includes('rgba') && !c.endsWith(', 1)'))
    }, PLAYGROUND_INDEX)

    expect(hasTransparent).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('colors-basic.png')
  })
})

// =============================================================================
// Playground 1: Gradients
// =============================================================================
test.describe('Playground 1: Gradients', () => {
  const PLAYGROUND_INDEX = 1

  test('renders 4 gradient boxes', async ({ page }) => {
    await setupPage(page)

    const count = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return container.children.length
    }, PLAYGROUND_INDEX)

    expect(count).toBe(4)
  })

  test('boxes have gradient backgrounds', async ({ page }) => {
    await setupPage(page)

    const backgrounds = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        const style = getComputedStyle(el as HTMLElement)
        return style.backgroundImage
      })
    }, PLAYGROUND_INDEX)

    // All should have linear-gradient
    backgrounds.forEach(bg => {
      expect(bg).toContain('linear-gradient')
    })
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('gradients.png')
  })
})

// =============================================================================
// Playground 2: Gradient Text
// =============================================================================
test.describe('Playground 2: Gradient Text', () => {
  const PLAYGROUND_INDEX = 2

  test('renders 2 text elements with gradients', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      const texts = Array.from(container.children).map(el => el.textContent?.trim())
      return {
        count: container.children.length,
        texts
      }
    }, PLAYGROUND_INDEX)

    expect(structure.count).toBe(2)
    expect(structure.texts).toContain('Gradient Text')
    expect(structure.texts).toContain('Vertical Gradient')
  })

  test('text elements have gradient styling', async ({ page }) => {
    await setupPage(page)

    const hasGradientText = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).some(el => {
        const style = getComputedStyle(el as HTMLElement)
        // Gradient text uses background-clip: text
        return style.backgroundImage.includes('linear-gradient')
      })
    }, PLAYGROUND_INDEX)

    expect(hasGradientText).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('gradient-text.png')
  })
})
