/**
 * E2E Tests für 13-anzeige.html - Tabellen
 * Playgrounds 0-5: Statische und datengebundene Tabellen
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
// Playground 0: Statische Tabelle (einfach)
// =============================================================================
test.describe('Playground 0: Statische Tabelle', () => {
  const PLAYGROUND_INDEX = 0

  test('renders table with 4 rows', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const table = root?.children[1] as HTMLElement

      // Find all rows (direct children or nested)
      const rows = table?.querySelectorAll('[data-row]') || []
      return {
        hasTable: table !== null,
        rowCount: rows.length || table?.children.length
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasTable).toBe(true)
    expect(structure.rowCount).toBeGreaterThanOrEqual(4)
  })

  test('contains expected data', async ({ page }) => {
    await setupPage(page)

    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const table = root?.children[1] as HTMLElement

      return table?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('Name')
    expect(content).toContain('Max')
    expect(content).toContain('Anna')
    expect(content).toContain('Berlin')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('table-static-simple.png')
  })
})

// =============================================================================
// Playground 1: Statische Tabelle mit Header
// =============================================================================
test.describe('Playground 1: Tabelle mit Header', () => {
  const PLAYGROUND_INDEX = 1

  test('renders table with header row', async ({ page }) => {
    await setupPage(page)

    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const table = root?.children[1] as HTMLElement

      return table?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('Produkt')
    expect(content).toContain('Preis')
    expect(content).toContain('Lager')
    expect(content).toContain('T-Shirt')
    expect(content).toContain('29€')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('table-static-header.png')
  })
})

// =============================================================================
// Playground 2: Statische Tabelle mit Styling
// =============================================================================
test.describe('Playground 2: Tabelle mit Styling', () => {
  const PLAYGROUND_INDEX = 2

  test('table has background and border radius', async ({ page }) => {
    await setupPage(page)

    const styles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const table = root?.children[1] as HTMLElement

      const style = getComputedStyle(table)
      return {
        bg: style.backgroundColor,
        padding: style.padding,
        borderRadius: style.borderRadius
      }
    }, PLAYGROUND_INDEX)

    expect(styles.bg).not.toBe('rgba(0, 0, 0, 0)')
    expect(styles.borderRadius).toBe('12px')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('table-static-styled.png')
  })
})

// =============================================================================
// Playground 3: Datengebundene Tabelle
// =============================================================================
test.describe('Playground 3: Datengebundene Tabelle', () => {
  const PLAYGROUND_INDEX = 3

  test('renders 3 rows from data', async ({ page }) => {
    await setupPage(page)

    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const table = root?.children[1] as HTMLElement

      return table?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('Design Review')
    expect(content).toContain('API Integration')
    expect(content).toContain('Testing')
    expect(content).toContain('done')
    expect(content).toContain('progress')
    expect(content).toContain('todo')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('table-data-bound.png')
  })
})

// =============================================================================
// Playground 4: Row-Template stylen
// =============================================================================
test.describe('Playground 4: Row-Template stylen', () => {
  const PLAYGROUND_INDEX = 4

  test('rows have styled content', async ({ page }) => {
    await setupPage(page)

    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const table = root?.children[1] as HTMLElement

      return table?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('Anna')
    expect(content).toContain('Designer')
    expect(content).toContain('Max')
    expect(content).toContain('Developer')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('table-row-styled.png')
  })
})

// =============================================================================
// Playground 5: Mehrere Elemente pro Zeile
// =============================================================================
test.describe('Playground 5: Mehrere Elemente pro Zeile', () => {
  const PLAYGROUND_INDEX = 5

  test('renders projects with icons', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const table = root?.children[1] as HTMLElement

      const hasIcons = table?.querySelectorAll('svg').length > 0
      return {
        text: table?.textContent || '',
        hasIcons
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Website Relaunch')
    expect(structure.text).toContain('Mobile App')
    expect(structure.text).toContain('Backend API')
    expect(structure.text).toContain('Aktiv')
    expect(structure.hasIcons).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('table-multi-elements.png')
  })
})
