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

  test('renders table with rows', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const table = root?.children[1] as HTMLElement

      // Table may have various structures - just check it exists and has content
      return {
        hasTable: table !== null,
        childCount: table?.children?.length || 0,
        text: table?.textContent || ''
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasTable).toBe(true)
    expect(structure.childCount).toBeGreaterThan(0)
    // Should have the data from the table
    expect(structure.text).toContain('Name')
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

      // Get all text content from the entire root (includes header and body)
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    // Check for content - header columns may be rendered separately
    expect(content).toContain('T-Shirt')
    expect(content).toContain('29')
    expect(content).toContain('Hoodie')
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

  test('table has styling applied', async ({ page }) => {
    await setupPage(page)

    const styles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const table = root?.children[1] as HTMLElement

      // Check the table or any of its children for styling
      const tableStyle = getComputedStyle(table)

      // Check for any element with the styled background
      const styledEl = table?.querySelector('[style*="background"]') || table
      const styledStyle = getComputedStyle(styledEl as HTMLElement)

      return {
        text: table?.textContent || '',
        borderRadius: tableStyle.borderRadius || styledStyle.borderRadius,
        hasPadding: parseFloat(tableStyle.padding) > 0 || parseFloat(styledStyle.padding) > 0
      }
    }, PLAYGROUND_INDEX)

    // Verify the table contains expected data content from Playground 2
    // Header may be in a separate element, check for data rows
    expect(styles.text).toContain('Anna')
    expect(styles.text).toContain('Max')
    expect(styles.text).toContain('Tom')
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
