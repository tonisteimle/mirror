/**
 * E2E Tests für 10-eingabe.html - Menu Components
 * Playgrounds 23-26: Menu, ContextMenu, NestedMenu, NavigationMenu
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/10-eingabe.html'

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
// Playground 23: Menu
// =============================================================================
test.describe('Playground 23: Menu', () => {
  const PLAYGROUND_INDEX = 23

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has trigger button "Aktionen"', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const trigger = component?.querySelector('[data-slot="Trigger"]')
      return trigger?.textContent?.trim() || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Aktionen')
  })

  test('has menu items (Bearbeiten, Duplizieren, Löschen)', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Bearbeiten')
    expect(text).toContain('Duplizieren')
    expect(text).toContain('Löschen')
  })

  test('has separator element', async ({ page }) => {
    const hasSeparator = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return !!component?.querySelector('[data-slot="Separator"]')
    }, PLAYGROUND_INDEX)

    expect(hasSeparator).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('menu.png')
  })
})

// =============================================================================
// Playground 24: ContextMenu
// =============================================================================
test.describe('Playground 24: ContextMenu', () => {
  const PLAYGROUND_INDEX = 24

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has trigger area with "Rechtsklick hier"', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const trigger = component?.querySelector('[data-slot="Trigger"]')
      return trigger?.textContent?.trim() || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Rechtsklick')
  })

  test('has context menu items (Kopieren, Einfügen, Löschen)', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Kopieren')
    expect(text).toContain('Einfügen')
    expect(text).toContain('Löschen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('context-menu.png')
  })
})

// =============================================================================
// Playground 25: NestedMenu
// =============================================================================
test.describe('Playground 25: NestedMenu', () => {
  const PLAYGROUND_INDEX = 25

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has trigger button "Datei"', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const trigger = component?.querySelector('[data-slot="Trigger"]')
      return trigger?.textContent?.trim() || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Datei')
  })

  test('has submenu trigger "Öffnen"', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Öffnen')
  })

  test('has menu items (Neu, Speichern)', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Neu')
    expect(text).toContain('Speichern')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('nested-menu.png')
  })
})

// =============================================================================
// Playground 26: NavigationMenu
// =============================================================================
test.describe('Playground 26: NavigationMenu', () => {
  const PLAYGROUND_INDEX = 26

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has navigation items (Produkte, Ressourcen, Preise)', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Produkte')
    expect(text).toContain('Ressourcen')
    expect(text).toContain('Preise')
  })

  test('has nav menu items', async ({ page }) => {
    const count = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement

      const items = component?.querySelectorAll('[data-component="NavMenuItem"]')
      return items?.length || 0
    }, PLAYGROUND_INDEX)

    expect(count).toBe(3)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('navigation-menu.png')
  })
})
