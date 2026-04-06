/**
 * E2E Tests für 05-styling.html - Typografie
 * Playgrounds 5-7: fs, weight, font, text styles
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
// Playground 5: Typografie - Größe & Gewicht
// =============================================================================
test.describe('Playground 5: Typografie Größe & Gewicht', () => {
  const PLAYGROUND_INDEX = 5

  test('renders 5 text elements with hierarchy', async ({ page }) => {
    await setupPage(page)

    const texts = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => el.textContent?.trim())
    }, PLAYGROUND_INDEX)

    expect(texts.length).toBe(5)
    expect(texts).toContain('Headline')
    expect(texts).toContain('Subheadline')
    expect(texts).toContain('Body Text')
    expect(texts).toContain('Small Text')
    expect(texts).toContain('Caption')
  })

  test('font sizes decrease from top to bottom', async ({ page }) => {
    await setupPage(page)

    const fontSizes = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        return parseFloat(getComputedStyle(el as HTMLElement).fontSize)
      })
    }, PLAYGROUND_INDEX)

    // Font sizes should generally decrease
    expect(fontSizes[0]).toBe(24) // Headline
    expect(fontSizes[1]).toBe(18) // Subheadline
    expect(fontSizes[2]).toBe(14) // Body Text
    expect(fontSizes[3]).toBe(12) // Small Text
    expect(fontSizes[4]).toBe(10) // Caption
  })

  test('headline has bold weight', async ({ page }) => {
    await setupPage(page)

    const weights = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        return getComputedStyle(el as HTMLElement).fontWeight
      })
    }, PLAYGROUND_INDEX)

    // Headline should be bold (700)
    expect(parseInt(weights[0])).toBeGreaterThanOrEqual(700)
    // Subheadline should be medium (500)
    expect(weights[1]).toBe('500')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('typography-size-weight.png')
  })
})

// =============================================================================
// Playground 6: Typografie - Stil
// =============================================================================
test.describe('Playground 6: Typografie Stil', () => {
  const PLAYGROUND_INDEX = 6

  test('renders 5 text elements with different styles', async ({ page }) => {
    await setupPage(page)

    const count = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return container.children.length
    }, PLAYGROUND_INDEX)

    expect(count).toBe(5)
  })

  test('text transforms are applied correctly', async ({ page }) => {
    await setupPage(page)

    const styles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        const style = getComputedStyle(el as HTMLElement)
        return {
          text: el.textContent?.trim(),
          textTransform: style.textTransform,
          fontStyle: style.fontStyle,
          textDecoration: style.textDecorationLine || style.textDecoration,
          overflow: style.overflow,
          textOverflow: style.textOverflow
        }
      })
    }, PLAYGROUND_INDEX)

    // uppercase
    expect(styles[0].textTransform).toBe('uppercase')

    // lowercase
    expect(styles[1].textTransform).toBe('lowercase')

    // italic
    expect(styles[2].fontStyle).toBe('italic')

    // underline
    expect(styles[3].textDecoration).toContain('underline')

    // truncate
    expect(styles[4].textOverflow).toBe('ellipsis')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('typography-style.png')
  })
})

// =============================================================================
// Playground 7: Typografie - Fonts
// =============================================================================
test.describe('Playground 7: Typografie Fonts', () => {
  const PLAYGROUND_INDEX = 7

  test('renders 3 text elements with different fonts', async ({ page }) => {
    await setupPage(page)

    const texts = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => el.textContent?.trim())
    }, PLAYGROUND_INDEX)

    expect(texts.length).toBe(3)
    expect(texts).toContain('Sans Serif (default)')
    expect(texts).toContain('Serif Font')
    expect(texts).toContain('Monospace Font')
  })

  test('fonts are applied correctly', async ({ page }) => {
    await setupPage(page)

    const fonts = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container.children).map(el => {
        return getComputedStyle(el as HTMLElement).fontFamily
      })
    }, PLAYGROUND_INDEX)

    // Sans-serif
    expect(fonts[0].toLowerCase()).toMatch(/sans|inter|system-ui|arial/i)

    // Serif
    expect(fonts[1].toLowerCase()).toMatch(/serif|georgia|times/i)

    // Monospace
    expect(fonts[2].toLowerCase()).toMatch(/mono|courier|consolas|jetbrains/i)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('typography-fonts.png')
  })
})
