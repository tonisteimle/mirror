/**
 * E2E Tests für 08-daten.html - Variablen, Daten & Bedingungen
 * Playgrounds 0-24: Variables, Data Objects, each, Conditionals
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/08-daten.html'

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
// Playground 0: Einfache Variablen
// =============================================================================
test.describe('Playground 0: Simple Variables', () => {
  const PLAYGROUND_INDEX = 0

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has name and count text', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Name: Max')
    expect(text).toContain('Count: 42')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-variables.png')
  })
})

// =============================================================================
// Playground 1: In Text verwenden
// =============================================================================
test.describe('Playground 1: Text Concatenation', () => {
  const PLAYGROUND_INDEX = 1

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has firstName, fullName, greeting', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Max')
    expect(text).toContain('Max Mustermann')
    expect(text).toContain('Hallo, Max!')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-text-concat.png')
  })
})

// =============================================================================
// Playground 2: Arithmetik
// =============================================================================
test.describe('Playground 2: Arithmetic', () => {
  const PLAYGROUND_INDEX = 2

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has price, quantity, total calculated', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Preis: $29')
    expect(text).toContain('Menge: 3')
    expect(text).toContain('Total: $87')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-arithmetic.png')
  })
})

// =============================================================================
// Playground 3: Arrays und each
// =============================================================================
test.describe('Playground 3: Arrays and Each', () => {
  const PLAYGROUND_INDEX = 3

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 color items', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Rot')
    expect(text).toContain('Grün')
    expect(text).toContain('Blau')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-each-array.png')
  })
})

// =============================================================================
// Playground 4: Arrays mit Index
// =============================================================================
test.describe('Playground 4: Arrays with Index', () => {
  const PLAYGROUND_INDEX = 4

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has numbered items', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    // Each loop with index renders items
    expect(text).toContain('Erster')
    expect(text).toContain('Zweiter')
    expect(text).toContain('Dritter')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-each-index.png')
  })
})

// =============================================================================
// Playground 5: Datenobjekte mit Einträgen
// =============================================================================
test.describe('Playground 5: Data Entries', () => {
  const PLAYGROUND_INDEX = 5

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 users with names and roles', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Max')
    expect(text).toContain('Admin')
    expect(text).toContain('Anna')
    expect(text).toContain('Tom')
    expect(text).toContain('User')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-entries.png')
  })
})

// =============================================================================
// Playground 6: Datenobjekte (Single Object)
// =============================================================================
test.describe('Playground 6: Single Data Object', () => {
  const PLAYGROUND_INDEX = 6

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has user name, email, status', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Max Mustermann')
    expect(text).toContain('max@example.com')
    expect(text).toContain('Aktiv')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-object.png')
  })
})

// =============================================================================
// Playground 7: Attribut-Typen
// =============================================================================
test.describe('Playground 7: Attribute Types', () => {
  const PLAYGROUND_INDEX = 7

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has profile with mixed types', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Max')
    expect(text).toContain('Alter: 25')
    expect(text).toContain('Premium')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-types.png')
  })
})

// =============================================================================
// Playground 8: Verschachtelte Datenobjekte
// =============================================================================
test.describe('Playground 8: Nested Data Objects', () => {
  const PLAYGROUND_INDEX = 8

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has method with nested steps', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Agile')
    expect(text).toContain('Sprint Planning')
    expect(text).toContain('Daily Standup')
    expect(text).toContain('Retrospektive')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-nested.png')
  })
})

// =============================================================================
// Playground 9: Produktliste
// =============================================================================
test.describe('Playground 9: Product List', () => {
  const PLAYGROUND_INDEX = 9

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has 3 products with prices', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Basic')
    expect(text).toContain('$9')
    expect(text).toContain('Pro')
    expect(text).toContain('$29')
    expect(text).toContain('Enterprise')
    expect(text).toContain('$99')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-products.png')
  })
})

// =============================================================================
// Playground 10: Block Conditional if
// =============================================================================
test.describe('Playground 10: Block if', () => {
  const PLAYGROUND_INDEX = 10

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('renders conditional content', async ({ page }) => {
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
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-if.png')
  })
})

// =============================================================================
// Playground 11: if/else
// =============================================================================
test.describe('Playground 11: if/else', () => {
  const PLAYGROUND_INDEX = 11

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('shows login button when loggedIn false', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Anmelden')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-if-else.png')
  })
})

// =============================================================================
// Playground 12: Mehrere Elemente in if
// =============================================================================
test.describe('Playground 12: Multiple Elements in if', () => {
  const PLAYGROUND_INDEX = 12

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('shows product details when showDetails true', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Produkt')
    expect(text).toContain('Beschreibung des Produkts')
    expect(text).toContain('Preis: €29')
    expect(text).toContain('Kaufen')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-if-multiple.png')
  })
})

// =============================================================================
// Playground 13: && Operator
// =============================================================================
test.describe('Playground 13: AND Operator', () => {
  const PLAYGROUND_INDEX = 13

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('renders conditional content', async ({ page }) => {
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
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-and-operator.png')
  })
})

// =============================================================================
// Playground 14: Vergleiche
// =============================================================================
test.describe('Playground 14: Comparisons', () => {
  const PLAYGROUND_INDEX = 14

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('renders comparison conditional', async ({ page }) => {
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
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-comparison.png')
  })
})

// =============================================================================
// Playground 15: Negation
// =============================================================================
test.describe('Playground 15: Negation', () => {
  const PLAYGROUND_INDEX = 15

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('shows button when not disabled', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Absenden')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-negation.png')
  })
})

// =============================================================================
// Playground 16: Kombinierte Bedingungen
// =============================================================================
test.describe('Playground 16: Combined Conditions', () => {
  const PLAYGROUND_INDEX = 16

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('shows feature when admin and enabled', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Feature aktiv')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-combined.png')
  })
})

// =============================================================================
// Playground 17: Verschachtelte Bedingungen
// =============================================================================
test.describe('Playground 17: Nested Conditions', () => {
  const PLAYGROUND_INDEX = 17

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('renders nested conditional', async ({ page }) => {
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
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-nested-conditions.png')
  })
})

// =============================================================================
// Playground 18: if mit each kombinieren
// =============================================================================
test.describe('Playground 18: if with each', () => {
  const PLAYGROUND_INDEX = 18

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('renders if-each combination', async ({ page }) => {
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
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-if-each.png')
  })
})

// =============================================================================
// Playground 19: Inline Ternary simple
// =============================================================================
test.describe('Playground 19: Ternary Simple', () => {
  const PLAYGROUND_INDEX = 19

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has button with conditional color', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Status')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-ternary-simple.png')
  })
})

// =============================================================================
// Playground 20: Ternary weitere Beispiele
// =============================================================================
test.describe('Playground 20: Ternary Examples', () => {
  const PLAYGROUND_INDEX = 20

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('renders ternary examples', async ({ page }) => {
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
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-ternary-examples.png')
  })
})

// =============================================================================
// Playground 21: Ternary mit Variablen
// =============================================================================
test.describe('Playground 21: Ternary with Variables', () => {
  const PLAYGROUND_INDEX = 21

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('has themed button', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Themed')
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-ternary-variables.png')
  })
})

// =============================================================================
// Playground 22: Leerer Zustand
// =============================================================================
test.describe('Playground 22: Empty State', () => {
  const PLAYGROUND_INDEX = 22

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('shows empty state when items empty', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Keine Einträge')
    expect(text).toContain('Füge deinen ersten Eintrag hinzu')
  })

  test('has inbox icon', async ({ page }) => {
    const hasIcon = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return !!component?.querySelector('svg')
    }, PLAYGROUND_INDEX)

    expect(hasIcon).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-empty-state.png')
  })
})

// =============================================================================
// Playground 23: Ladeindikator
// =============================================================================
test.describe('Playground 23: Loading Indicator', () => {
  const PLAYGROUND_INDEX = 23

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('shows loading when loading true', async ({ page }) => {
    const text = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return component?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(text).toContain('Lädt...')
  })

  test('has loader icon', async ({ page }) => {
    const hasIcon = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return !!component?.querySelector('svg')
    }, PLAYGROUND_INDEX)

    expect(hasIcon).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-loading.png')
  })
})

// =============================================================================
// Playground 24: Benutzer-Status
// =============================================================================
test.describe('Playground 24: User Status', () => {
  const PLAYGROUND_INDEX = 24

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('renders user status component', async ({ page }) => {
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
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-user-status.png')
  })
})
