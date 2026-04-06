/**
 * E2E Tests für 02-komponenten.html - Wiederverwendbare Komponenten
 * Playgrounds 0-11: Definition, Überschreibung, Kinder, Variationen, Layouts
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/02-komponenten.html'

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
// Playground 0: Problem - Wiederholung
// =============================================================================
test.describe('Playground 0: Wiederholung Problem', () => {
  const PLAYGROUND_INDEX = 0

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 repeated buttons', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Speichern')
    expect(text).toContain('Abbrechen')
    expect(text).toContain('Löschen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('komponenten-problem.png')
  })
})

// =============================================================================
// Playground 1: Komponenten definieren
// =============================================================================
test.describe('Playground 1: Komponenten Definition', () => {
  const PLAYGROUND_INDEX = 1

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 Btn instances', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Speichern')
    expect(text).toContain('Abbrechen')
    expect(text).toContain('Löschen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('komponenten-definition.png')
  })
})

// =============================================================================
// Playground 2: Properties überschreiben
// =============================================================================
test.describe('Playground 2: Properties Override', () => {
  const PLAYGROUND_INDEX = 2

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has buttons with different variations', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Standard')
    expect(text).toContain('Grau')
    expect(text).toContain('Rot')
    expect(text).toContain('Groß')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('komponenten-override.png')
  })
})

// =============================================================================
// Playground 3: Kinder hinzufügen
// =============================================================================
test.describe('Playground 3: Children', () => {
  const PLAYGROUND_INDEX = 3

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has Card with title, description, button', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Titel')
    expect(text).toContain('Beschreibung')
    expect(text).toContain('Aktion')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('komponenten-children.png')
  })
})

// =============================================================================
// Playground 4: Variationen Problem
// =============================================================================
test.describe('Playground 4: Variationen Problem', () => {
  const PLAYGROUND_INDEX = 4

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 red buttons with repeated override', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Löschen')
    expect(text).toContain('Entfernen')
    expect(text).toContain('Abbrechen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('komponenten-variation-problem.png')
  })
})

// =============================================================================
// Playground 5: Variationen als Komponenten (as)
// =============================================================================
test.describe('Playground 5: as Inheritance', () => {
  const PLAYGROUND_INDEX = 5

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has Primary, Danger, Ghost buttons', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Speichern')
    expect(text).toContain('Löschen')
    expect(text).toContain('Abbrechen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('komponenten-as.png')
  })
})

// =============================================================================
// Playground 6: Komplexe Komponenten - Footer
// =============================================================================
test.describe('Playground 6: Complex Footer', () => {
  const PLAYGROUND_INDEX = 6

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has footer with copyright and links', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('2024')
    expect(text).toContain('Impressum')
    expect(text).toContain('Datenschutz')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('komponenten-footer.png')
  })
})

// =============================================================================
// Playground 7: Fester Inhalt Problem
// =============================================================================
test.describe('Playground 7: Fixed Content Problem', () => {
  const PLAYGROUND_INDEX = 7

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 identical cards', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Projekt Alpha')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('komponenten-fixed.png')
  })
})

// =============================================================================
// Playground 8: Komponenten in Komponenten
// =============================================================================
test.describe('Playground 8: Nested Components', () => {
  const PLAYGROUND_INDEX = 8

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has cards with Title and Desc slots', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Projekt Alpha')
    expect(text).toContain('Projekt Beta')
    expect(text).toContain('Das erste Projekt')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('komponenten-nested.png')
  })
})

// =============================================================================
// Playground 9: Kind-Komponenten mit mehreren Elementen
// =============================================================================
test.describe('Playground 9: Content Slot', () => {
  const PLAYGROUND_INDEX = 9

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has card with user info and button', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Benutzer')
    expect(text).toContain('Max Mustermann')
    expect(text).toContain('Profil')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('komponenten-content.png')
  })
})

// =============================================================================
// Playground 10: Layouts - AppShell
// =============================================================================
test.describe('Playground 10: AppShell Layout', () => {
  const PLAYGROUND_INDEX = 10

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has sidebar and main areas', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Navigation')
    expect(text).toContain('Dashboard')
    expect(text).toContain('Hauptinhalt')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('komponenten-appshell.png')
  })
})

// =============================================================================
// Playground 11: Praxisbeispiel Card
// =============================================================================
test.describe('Playground 11: Complete Card', () => {
  const PLAYGROUND_INDEX = 11

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has card with title, desc, footer', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Neues Projekt')
    expect(text).toContain('Schritt 1/3')
    expect(text).toContain('Weiter')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('komponenten-complete.png')
  })
})
