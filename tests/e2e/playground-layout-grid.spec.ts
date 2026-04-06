/**
 * E2E Tests für 04-layout.html - Grid Layout
 * Playgrounds 5-7: Grid aktivieren, explizite Platzierung, Grid als Komponente
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/04-layout.html'

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
// Playground 5: Grid aktivieren (grid 12)
// =============================================================================
test.describe('Playground 5: Grid aktivieren', () => {
  const PLAYGROUND_INDEX = 5

  test('renders grid container with display: grid', async ({ page }) => {
    await setupPage(page)

    const gridStyles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const gridFrame = root?.children[1] as HTMLElement

      const style = getComputedStyle(gridFrame)
      // gridTemplateColumns returns computed values (explicit widths) not the original repeat() syntax
      const columnCount = style.gridTemplateColumns.split(' ').filter(s => s.trim()).length
      return {
        display: style.display,
        columnCount
      }
    }, PLAYGROUND_INDEX)

    expect(gridStyles.display).toBe('grid')
    // 12 columns should be defined
    expect(gridStyles.columnCount).toBe(12)
  })

  test('renders 6 grid items with correct labels', async ({ page }) => {
    await setupPage(page)

    const items = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const gridFrame = root?.children[1] as HTMLElement

      return Array.from(gridFrame.children).map(el => el.textContent?.trim())
    }, PLAYGROUND_INDEX)

    expect(items.length).toBe(6)
    expect(items[0]).toBe('w 12 (volle Breite)')
    expect(items[1]).toBe('w 6')
    expect(items[2]).toBe('w 6')
    expect(items[3]).toBe('w 4')
    expect(items[4]).toBe('w 4')
    expect(items[5]).toBe('w 4')
  })

  test('grid items span correct columns', async ({ page }) => {
    await setupPage(page)

    const spans = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const gridFrame = root?.children[1] as HTMLElement

      return Array.from(gridFrame.children).map(el => {
        const style = getComputedStyle(el as HTMLElement)
        return {
          gridColumn: style.gridColumn,
          text: el.textContent?.trim()
        }
      })
    }, PLAYGROUND_INDEX)

    // w 12 spans all 12 columns
    expect(spans[0].gridColumn).toContain('span 12')
    // w 6 spans 6 columns
    expect(spans[1].gridColumn).toContain('span 6')
    expect(spans[2].gridColumn).toContain('span 6')
    // w 4 spans 4 columns
    expect(spans[3].gridColumn).toContain('span 4')
    expect(spans[4].gridColumn).toContain('span 4')
    expect(spans[5].gridColumn).toContain('span 4')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('grid-basic.png')
  })
})

// =============================================================================
// Playground 6: Grid explizite Platzierung (x, y)
// =============================================================================
test.describe('Playground 6: Grid explizite Platzierung', () => {
  const PLAYGROUND_INDEX = 6

  test('renders 4 grid items (Hero, Sidebar, Content, Footer)', async ({ page }) => {
    await setupPage(page)

    const items = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const gridFrame = root?.children[1] as HTMLElement

      return Array.from(gridFrame.children).map(el => el.textContent?.trim())
    }, PLAYGROUND_INDEX)

    expect(items.length).toBe(4)
    expect(items).toContain('Hero')
    expect(items).toContain('Sidebar')
    expect(items).toContain('Content')
    expect(items).toContain('Footer')
  })

  test('grid items have explicit positioning (visual layout)', async ({ page }) => {
    await setupPage(page)

    // Instead of checking CSS grid properties (which have complex shorthand behavior),
    // verify the visual layout by checking element positions relative to each other
    const layout = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const gridFrame = root?.children[1] as HTMLElement
      const containerRect = gridFrame.getBoundingClientRect()

      return Array.from(gridFrame.children).map(el => {
        const rect = el.getBoundingClientRect()
        return {
          text: el.textContent?.trim(),
          // Relative positions within the grid container
          relativeTop: Math.round(rect.top - containerRect.top),
          relativeLeft: Math.round(rect.left - containerRect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      })
    }, PLAYGROUND_INDEX)

    // Hero: should be at top, full width
    const hero = layout.find(p => p.text === 'Hero')
    expect(hero).toBeDefined()
    expect(hero!.relativeTop).toBeLessThan(50) // Near top

    // Sidebar: should be below hero, on the left
    const sidebar = layout.find(p => p.text === 'Sidebar')
    expect(sidebar).toBeDefined()
    expect(sidebar!.relativeTop).toBeGreaterThan(hero!.relativeTop + hero!.height - 20) // Below hero

    // Content: should be to the right of sidebar, same vertical position
    const content = layout.find(p => p.text === 'Content')
    expect(content).toBeDefined()
    expect(content!.relativeLeft).toBeGreaterThan(sidebar!.relativeLeft + sidebar!.width - 20)
    expect(Math.abs(content!.relativeTop - sidebar!.relativeTop)).toBeLessThan(20) // Same row

    // Footer: should be at the bottom
    const footer = layout.find(p => p.text === 'Footer')
    expect(footer).toBeDefined()
    expect(footer!.relativeTop).toBeGreaterThan(sidebar!.relativeTop + sidebar!.height - 20)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('grid-explicit.png')
  })
})

// =============================================================================
// Playground 7: Grid als Komponente (Dashboard)
// =============================================================================
test.describe('Playground 7: Grid als Komponente', () => {
  const PLAYGROUND_INDEX = 7

  test('renders Dashboard with Header, Nav, Main sections', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const dashboard = root?.children[1] as HTMLElement

      const style = getComputedStyle(dashboard)
      return {
        display: style.display,
        childCount: dashboard.children.length,
        childTexts: Array.from(dashboard.children).map(el => {
          // Get first text content from each section
          return el.textContent?.trim().split('\n')[0] || ''
        })
      }
    }, PLAYGROUND_INDEX)

    expect(structure.display).toBe('grid')
    expect(structure.childCount).toBe(3) // Header, Nav, Main
  })

  test('Header section has correct content', async ({ page }) => {
    await setupPage(page)

    const headerContent = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const dashboard = root?.children[1] as HTMLElement
      const header = dashboard.children[0] as HTMLElement

      return {
        text: header.textContent?.trim(),
        flexDirection: getComputedStyle(header).flexDirection,
        justifyContent: getComputedStyle(header).justifyContent
      }
    }, PLAYGROUND_INDEX)

    expect(headerContent.text).toContain('Dashboard')
    expect(headerContent.text).toContain('Admin')
    expect(headerContent.flexDirection).toBe('row')
    expect(headerContent.justifyContent).toBe('space-between')
  })

  test('Nav section has menu items', async ({ page }) => {
    await setupPage(page)

    const navContent = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const dashboard = root?.children[1] as HTMLElement
      const nav = dashboard.children[1] as HTMLElement

      return {
        text: nav.textContent?.trim(),
        childCount: nav.children.length
      }
    }, PLAYGROUND_INDEX)

    expect(navContent.text).toContain('Menu')
    expect(navContent.text).toContain('Overview')
    expect(navContent.text).toContain('Users')
    expect(navContent.childCount).toBe(3)
  })

  test('Main section has widgets', async ({ page }) => {
    await setupPage(page)

    const mainContent = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const dashboard = root?.children[1] as HTMLElement
      const main = dashboard.children[2] as HTMLElement

      const style = getComputedStyle(main)
      return {
        display: style.display,
        childCount: main.children.length,
        widgetTexts: Array.from(main.children).map(widget => widget.textContent?.trim())
      }
    }, PLAYGROUND_INDEX)

    expect(mainContent.display).toBe('grid') // Main is also a grid
    expect(mainContent.childCount).toBe(2) // 2 widgets
    expect(mainContent.widgetTexts[0]).toContain('Users')
    expect(mainContent.widgetTexts[0]).toContain('1,234')
    expect(mainContent.widgetTexts[1]).toContain('Revenue')
    expect(mainContent.widgetTexts[1]).toContain('$12.4k')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('grid-component.png')
  })
})
