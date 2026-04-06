/**
 * E2E Tests für 09-seiten.html - Seiten & Apps
 * Playgrounds 0-8: Tabs, SideNav, File-Content, Components
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/09-seiten.html'

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
// Playground 0: Tabs Inline-Content
// =============================================================================
test.describe('Playground 0: Tabs Inline Content', () => {
  const PLAYGROUND_INDEX = 0

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has tabs with Home and Settings', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Home')
    expect(text).toContain('Settings')
  })

  test('shows home content by default', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Willkommen zuhause')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('seiten-tabs-inline.png')
  })
})

// =============================================================================
// Playground 1: Tabs ohne Content (File-based)
// =============================================================================
test.describe('Playground 1: Tabs File-based', () => {
  const PLAYGROUND_INDEX = 1

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has tabs without inline content', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Home')
    expect(text).toContain('Settings')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('seiten-tabs-file.png')
  })
})

// =============================================================================
// Playground 2: home.mirror
// =============================================================================
test.describe('Playground 2: home.mirror', () => {
  const PLAYGROUND_INDEX = 2

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has home page content', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Willkommen zuhause')
    expect(text).toContain('Das ist die Startseite')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('seiten-home.png')
  })
})

// =============================================================================
// Playground 3: settings.mirror
// =============================================================================
test.describe('Playground 3: settings.mirror', () => {
  const PLAYGROUND_INDEX = 3

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has settings page with switches', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Einstellungen')
    expect(text).toContain('Dark Mode')
    expect(text).toContain('Benachrichtigungen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('seiten-settings.png')
  })
})

// =============================================================================
// Playground 4: SideNav
// =============================================================================
test.describe('Playground 4: SideNav', () => {
  const PLAYGROUND_INDEX = 4

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has sidenav with items', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Dashboard')
    expect(text).toContain('Projekte')
    expect(text).toContain('Einstellungen')
  })

  test('has icons for nav items', async ({ page }) => {
    const iconCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.querySelectorAll('svg')?.length || 0
    }, PLAYGROUND_INDEX)

    expect(iconCount).toBeGreaterThanOrEqual(3)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('seiten-sidenav.png')
  })
})

// =============================================================================
// Playground 5: Mischen Inline/Dateien
// =============================================================================
test.describe('Playground 5: Mixed Inline/File', () => {
  const PLAYGROUND_INDEX = 5

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has tabs with mixed content types', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Übersicht')
    expect(text).toContain('Details')
    expect(text).toContain('Statistik')
  })

  test('shows inline content for first tab', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Kurze Übersicht hier')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('seiten-mixed.png')
  })
})

// =============================================================================
// Playground 6: State bleibt erhalten
// =============================================================================
test.describe('Playground 6: State Preservation', () => {
  const PLAYGROUND_INDEX = 6

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has settings with switch', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Einstellungen')
    expect(text).toContain('Benachrichtigungen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('seiten-state.png')
  })
})

// =============================================================================
// Playground 7: components.mirror
// =============================================================================
test.describe('Playground 7: Component Definitions', () => {
  const PLAYGROUND_INDEX = 7

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('shows component definitions preview', async ({ page }) => {
    // This playground shows component definitions, which may not render visible content
    // Just verify the playground exists and renders
    const exists = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      return shadow !== null
    }, PLAYGROUND_INDEX)

    expect(exists).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('seiten-components.png')
  })
})

// =============================================================================
// Playground 8: dashboard.mirror using components
// =============================================================================
test.describe('Playground 8: Dashboard with Components', () => {
  const PLAYGROUND_INDEX = 8

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has card with title and body', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Willkommen')
    expect(text).toContain('Schön dass du da bist')
  })

  test('has primary button', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain("Los geht's")
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('seiten-dashboard.png')
  })
})
