/**
 * E2E Tests für 05-styling.html - Effekte
 * Playgrounds 8-10: shadow, opacity, cursor
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
// Playground 8: Shadows
// =============================================================================
test.describe('Playground 8: Shadows', () => {
  const PLAYGROUND_INDEX = 8

  test('renders 3 boxes with different shadow levels', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return {
        count: container.children.length,
        texts: Array.from(container.children).map(el => el.textContent?.trim())
      }
    }, PLAYGROUND_INDEX)

    expect(structure.count).toBe(3)
    expect(structure.texts).toEqual(['sm', 'md', 'lg'])
  })

  test('boxes have box-shadow applied', async ({ page }) => {
    await setupPage(page)

    const shadows = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        return getComputedStyle(el as HTMLElement).boxShadow
      })
    }, PLAYGROUND_INDEX)

    // All should have box-shadow (not "none")
    shadows.forEach(shadow => {
      expect(shadow).not.toBe('none')
      expect(shadow).toContain('rgba')
    })
  })

  test('shadow intensity increases (sm < md < lg)', async ({ page }) => {
    await setupPage(page)

    const shadowLengths = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        const shadow = getComputedStyle(el as HTMLElement).boxShadow
        // Shadow string length is a rough proxy for complexity/intensity
        return shadow.length
      })
    }, PLAYGROUND_INDEX)

    // lg should have longest/most complex shadow
    expect(shadowLengths[2]).toBeGreaterThan(shadowLengths[0])
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('shadows.png')
  })
})

// =============================================================================
// Playground 9: Opacity
// =============================================================================
test.describe('Playground 9: Opacity', () => {
  const PLAYGROUND_INDEX = 9

  test('renders 4 boxes with different opacity', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return {
        count: container.children.length,
        texts: Array.from(container.children).map(el => el.textContent?.trim())
      }
    }, PLAYGROUND_INDEX)

    expect(structure.count).toBe(4)
    expect(structure.texts).toEqual(['1', '0.7', '0.4', '0.2'])
  })

  test('opacity values are correctly applied', async ({ page }) => {
    await setupPage(page)

    const opacities = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        return parseFloat(getComputedStyle(el as HTMLElement).opacity)
      })
    }, PLAYGROUND_INDEX)

    expect(opacities[0]).toBe(1)
    expect(opacities[1]).toBeCloseTo(0.7, 1)
    expect(opacities[2]).toBeCloseTo(0.4, 1)
    expect(opacities[3]).toBeCloseTo(0.2, 1)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('opacity.png')
  })
})

// =============================================================================
// Playground 10: Cursor
// =============================================================================
test.describe('Playground 10: Cursor', () => {
  const PLAYGROUND_INDEX = 10

  test('renders 4 boxes with different cursors', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return {
        count: container.children.length,
        texts: Array.from(container.children).map(el => el.textContent?.trim())
      }
    }, PLAYGROUND_INDEX)

    expect(structure.count).toBe(4)
    expect(structure.texts).toContain('pointer')
    expect(structure.texts).toContain('grab')
    expect(structure.texts).toContain('move')
    expect(structure.texts).toContain('not-allowed')
  })

  test('cursor values are correctly applied', async ({ page }) => {
    await setupPage(page)

    const cursors = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        return {
          cursor: getComputedStyle(el as HTMLElement).cursor,
          text: el.textContent?.trim()
        }
      })
    }, PLAYGROUND_INDEX)

    const pointer = cursors.find(c => c.text === 'pointer')
    const grab = cursors.find(c => c.text === 'grab')
    const move = cursors.find(c => c.text === 'move')
    const notAllowed = cursors.find(c => c.text === 'not-allowed')

    expect(pointer?.cursor).toBe('pointer')
    expect(grab?.cursor).toBe('grab')
    expect(move?.cursor).toBe('move')
    expect(notAllowed?.cursor).toBe('not-allowed')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('cursor.png')
  })
})
