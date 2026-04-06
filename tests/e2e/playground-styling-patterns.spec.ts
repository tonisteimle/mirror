/**
 * E2E Tests für 05-styling.html - Praktische Patterns
 * Playgrounds 11-12: Button Varianten, Card Styles
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
// Playground 11: Button Varianten
// =============================================================================
test.describe('Playground 11: Button Varianten', () => {
  const PLAYGROUND_INDEX = 11

  test('renders 3 rows of buttons', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return {
        rowCount: container.children.length,
        rows: Array.from(container.children).map(row => ({
          buttonCount: row.children.length,
          buttons: Array.from(row.children).map(btn => btn.textContent?.trim())
        }))
      }
    }, PLAYGROUND_INDEX)

    expect(structure.rowCount).toBe(3)
    // Row 1: Filled buttons
    expect(structure.rows[0].buttons).toEqual(['Primary', 'Success', 'Danger'])
    // Row 2: Outlined buttons
    expect(structure.rows[1].buttons).toEqual(['Outline', 'Subtle'])
    // Row 3: Ghost & Link
    expect(structure.rows[2].buttons).toEqual(['Ghost', 'Link →'])
  })

  test('filled buttons have solid backgrounds', async ({ page }) => {
    await setupPage(page)

    const filledButtons = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement
      const firstRow = container.children[0] as HTMLElement

      return Array.from(firstRow.children).map(btn => {
        const style = getComputedStyle(btn as HTMLElement)
        return {
          text: btn.textContent?.trim(),
          bg: style.backgroundColor,
          color: style.color
        }
      })
    }, PLAYGROUND_INDEX)

    // All filled buttons should have backgrounds (not transparent)
    filledButtons.forEach(btn => {
      expect(btn.bg).not.toBe('rgba(0, 0, 0, 0)')
      expect(btn.bg).not.toBe('transparent')
    })
  })

  test('outline button has border', async ({ page }) => {
    await setupPage(page)

    const outlineButton = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement
      const secondRow = container.children[1] as HTMLElement
      const outline = secondRow.children[0] as HTMLElement

      const style = getComputedStyle(outline)
      return {
        text: outline.textContent?.trim(),
        borderWidth: style.borderWidth,
        borderColor: style.borderColor
      }
    }, PLAYGROUND_INDEX)

    expect(outlineButton.text).toBe('Outline')
    expect(outlineButton.borderWidth).toBe('1px')
    // Border color should be blue (#2563eb)
    expect(outlineButton.borderColor).toContain('37') // rgb(37, 99, 235)
  })

  test('link button has underline', async ({ page }) => {
    await setupPage(page)

    const linkButton = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement
      const thirdRow = container.children[2] as HTMLElement
      const link = thirdRow.children[1] as HTMLElement

      const style = getComputedStyle(link)
      return {
        text: link.textContent?.trim(),
        textDecoration: style.textDecorationLine || style.textDecoration
      }
    }, PLAYGROUND_INDEX)

    expect(linkButton.text).toBe('Link →')
    expect(linkButton.textDecoration).toContain('underline')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('button-variants.png')
  })
})

// =============================================================================
// Playground 12: Card Styles
// =============================================================================
test.describe('Playground 12: Card Styles', () => {
  const PLAYGROUND_INDEX = 12

  test('renders 3 card variants', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return {
        cardCount: container.children.length,
        cards: Array.from(container.children).map(card => {
          const firstChild = card.children[0] as HTMLElement
          return firstChild?.textContent?.trim()
        })
      }
    }, PLAYGROUND_INDEX)

    expect(structure.cardCount).toBe(3)
    expect(structure.cards).toContain('Elevated')
    expect(structure.cards).toContain('Bordered')
    expect(structure.cards).toContain('Gradient')
  })

  test('elevated card has shadow', async ({ page }) => {
    await setupPage(page)

    const elevatedCard = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement
      const elevated = container.children[0] as HTMLElement

      const style = getComputedStyle(elevated)
      return {
        boxShadow: style.boxShadow,
        bg: style.backgroundColor
      }
    }, PLAYGROUND_INDEX)

    expect(elevatedCard.boxShadow).not.toBe('none')
    expect(elevatedCard.bg).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('bordered card has border but no shadow', async ({ page }) => {
    await setupPage(page)

    const borderedCard = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement
      const bordered = container.children[1] as HTMLElement

      const style = getComputedStyle(bordered)
      return {
        borderWidth: style.borderWidth,
        borderColor: style.borderColor,
        boxShadow: style.boxShadow
      }
    }, PLAYGROUND_INDEX)

    expect(borderedCard.borderWidth).toBe('1px')
    expect(borderedCard.boxShadow).toBe('none')
  })

  test('gradient card has gradient background', async ({ page }) => {
    await setupPage(page)

    const gradientCard = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement
      const gradient = container.children[2] as HTMLElement

      const style = getComputedStyle(gradient)
      return {
        backgroundImage: style.backgroundImage
      }
    }, PLAYGROUND_INDEX)

    expect(gradientCard.backgroundImage).toContain('linear-gradient')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('card-styles.png')
  })
})
