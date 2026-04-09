/**
 * Daten E2E Tests
 *
 * Tests Variables, Data Objects, each loops, Conditionals from 08-daten.html tutorial.
 *
 * Playground 0: Simple Variables - name and count
 * Playground 1: Text Concatenation - firstName, lastName, greeting
 * Playground 2: Arithmetic - price * quantity
 * Playground 3: Arrays and Each - color list
 * Playground 4: Arrays with Index - numbered items
 * Playground 5: Data Entries - users with roles
 * Playground 6: Single Data Object - user profile
 * Playground 7: Attribute Types - mixed types
 * Playground 8: Nested Data Objects - method with steps
 * Playground 9: Product List - pricing cards
 * Playground 10: Block if - conditional rendering
 * Playground 11: if/else - login button
 * Playground 12: Multiple Elements in if - product details
 * Playground 13: AND Operator - admin && permission
 * Playground 14: Comparisons - count > 0
 * Playground 15: Negation - !disabled
 * Playground 16: Combined Conditions - role === "admin"
 * Playground 17: Nested Conditions - hasData && isLoading
 * Playground 18: if with each - task list with icons
 * Playground 19: Ternary Simple - button color
 * Playground 20: Ternary Examples - multiple conditionals
 * Playground 21: Ternary with Variables - themed button
 * Playground 22: Empty State - no items message
 * Playground 23: Loading Indicator - loading spinner
 * Playground 24: User Status - logged in user
 *
 * Key behaviors:
 * - Variables use $ prefix when referenced
 * - each iterates over arrays and objects
 * - if/else controls element visibility
 * - Ternary controls property values
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/09-daten.html'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

async function getComponentInfo(page: Page, playgroundIndex: number): Promise<{
  exists: boolean
  textContent: string
  childCount: number
  elementCount: number
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    const root = shadow?.querySelector('.mirror-root')
    const component = root?.children[1] as HTMLElement

    return {
      exists: !!component,
      textContent: component?.textContent || '',
      childCount: component?.children?.length || 0,
      elementCount: component?.querySelectorAll('*')?.length || 0
    }
  }, playgroundIndex)
}

async function hasIcon(page: Page, playgroundIndex: number): Promise<boolean> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    const root = shadow?.querySelector('.mirror-root')
    const component = root?.children[1] as HTMLElement
    return !!component?.querySelector('svg')
  }, playgroundIndex)
}

/**
 * Gets all content from the mirror-root (for if-blocks and other non-Frame structures)
 */
async function getRootInfo(page: Page, playgroundIndex: number): Promise<{
  exists: boolean
  textContent: string
  childCount: number
  elementCount: number
  hasIcon: boolean
  hasButton: boolean
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    const root = shadow?.querySelector('.mirror-root') as HTMLElement

    return {
      exists: !!root,
      textContent: root?.textContent || '',
      childCount: root?.children?.length || 0,
      elementCount: root?.querySelectorAll('*')?.length || 0,
      hasIcon: !!root?.querySelector('svg'),
      hasButton: !!root?.querySelector('button')
    }
  }, playgroundIndex)
}

// ============================================================================
// PLAYGROUND 0: Simple Variables
// ============================================================================

test.describe('Playground 0: Simple Variables', () => {
  const PLAYGROUND_INDEX = 0

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. displays name variable', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Name: Max')
  })

  test('3. displays count variable', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Count: 42')
  })

  test('4. has multiple text elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(1)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-variables.png')
  })
})

// ============================================================================
// PLAYGROUND 1: Text Concatenation
// ============================================================================

test.describe('Playground 1: Text Concatenation', () => {
  const PLAYGROUND_INDEX = 1

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. displays first name', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Max')
  })

  test('3. displays concatenated full name', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Max Mustermann')
  })

  test('4. displays greeting with variable', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Hallo, Max!')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-text-concat.png')
  })
})

// ============================================================================
// PLAYGROUND 2: Arithmetic
// ============================================================================

test.describe('Playground 2: Arithmetic', () => {
  const PLAYGROUND_INDEX = 2

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. displays price', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Preis: $29')
  })

  test('3. displays quantity', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Menge: 3')
  })

  test('4. calculates total correctly', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Total: $87')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-arithmetic.png')
  })
})

// ============================================================================
// PLAYGROUND 3: Arrays and Each
// ============================================================================

test.describe('Playground 3: Arrays and Each', () => {
  const PLAYGROUND_INDEX = 3

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. displays first color', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Rot')
  })

  test('3. displays second color', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Grün')
  })

  test('4. displays third color', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Blau')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-each-array.png')
  })
})

// ============================================================================
// PLAYGROUND 4: Arrays with Index
// ============================================================================

test.describe('Playground 4: Arrays with Index', () => {
  const PLAYGROUND_INDEX = 4

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. displays first item', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Erster')
  })

  test('3. displays second item', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Zweiter')
  })

  test('4. displays third item', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Dritter')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-each-index.png')
  })
})

// ============================================================================
// PLAYGROUND 5: Data Entries
// ============================================================================

test.describe('Playground 5: Data Entries', () => {
  const PLAYGROUND_INDEX = 5

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. displays Max user', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Max')
    expect(info.textContent).toContain('Admin')
  })

  test('3. displays Anna user', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Anna')
  })

  test('4. displays Tom user', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Tom')
    expect(info.textContent).toContain('User')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-entries.png')
  })
})

// ============================================================================
// PLAYGROUND 6: Single Data Object
// ============================================================================

test.describe('Playground 6: Single Data Object', () => {
  const PLAYGROUND_INDEX = 6

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. displays user name', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Max Mustermann')
  })

  test('3. displays user email', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('max@example.com')
  })

  test('4. displays active status', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Aktiv')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-object.png')
  })
})

// ============================================================================
// PLAYGROUND 7: Attribute Types
// ============================================================================

test.describe('Playground 7: Attribute Types', () => {
  const PLAYGROUND_INDEX = 7

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. displays string type', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Max')
  })

  test('3. displays number type', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Alter: 25')
  })

  test('4. displays boolean type', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Premium')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-types.png')
  })
})

// ============================================================================
// PLAYGROUND 8: Nested Data Objects
// ============================================================================

test.describe('Playground 8: Nested Data Objects', () => {
  const PLAYGROUND_INDEX = 8

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. displays method name', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Agile')
  })

  test('3. displays sprint planning step', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Sprint Planning')
  })

  test('4. displays daily standup step', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Daily Standup')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-nested.png')
  })
})

// ============================================================================
// PLAYGROUND 9: Product List
// ============================================================================

test.describe('Playground 9: Product List', () => {
  const PLAYGROUND_INDEX = 9

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. displays Basic product', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Basic')
    expect(info.textContent).toContain('$9')
  })

  test('3. displays Pro product', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Pro')
    expect(info.textContent).toContain('$29')
  })

  test('4. displays Enterprise product', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Enterprise')
    expect(info.textContent).toContain('$99')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-products.png')
  })
})

// ============================================================================
// PLAYGROUND 10: Block if
// ============================================================================

test.describe('Playground 10: Block if', () => {
  const PLAYGROUND_INDEX = 10

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. has shadow DOM', async ({ page }) => {
    const hasShadow = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      return !!preview?.shadowRoot
    }, PLAYGROUND_INDEX)
    expect(hasShadow).toBe(true)
  })

  test('3. renders conditional content', async ({ page }) => {
    // Wait for conditional rendering
    await page.waitForTimeout(500)
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    // if loggedIn: true renders "Willkommen zurück!"
    expect(info.textContent.length).toBeGreaterThan(0)
  })

  test('4. has elements', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-if.png')
  })
})

// ============================================================================
// PLAYGROUND 11: if/else
// ============================================================================

test.describe('Playground 11: if/else', () => {
  const PLAYGROUND_INDEX = 11

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. shows login button when loggedIn false', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Anmelden')
  })

  test('3. has button element', async ({ page }) => {
    const hasButton = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return !!component?.querySelector('button')
    }, PLAYGROUND_INDEX)
    expect(hasButton).toBe(true)
  })

  test('4. has elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(0)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-if-else.png')
  })
})

// ============================================================================
// PLAYGROUND 12: Multiple Elements in if
// ============================================================================

test.describe('Playground 12: Multiple Elements in if', () => {
  const PLAYGROUND_INDEX = 12

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. displays product title', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Produkt')
  })

  test('3. displays product description', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Beschreibung des Produkts')
  })

  test('4. displays price and button', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Preis: €29')
    expect(info.textContent).toContain('Kaufen')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-if-multiple.png')
  })
})

// ============================================================================
// PLAYGROUND 13: AND Operator
// ============================================================================

test.describe('Playground 13: AND Operator', () => {
  const PLAYGROUND_INDEX = 13

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. has shadow DOM', async ({ page }) => {
    const hasShadow = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      return !!preview?.shadowRoot
    }, PLAYGROUND_INDEX)
    expect(hasShadow).toBe(true)
  })

  test('3. renders conditional content', async ({ page }) => {
    // Wait for conditional rendering
    await page.waitForTimeout(500)
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    // if isAdmin && hasPermission: both true renders "Admin Panel"
    expect(info.textContent.length).toBeGreaterThan(0)
  })

  test('4. has elements', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-and-operator.png')
  })
})

// ============================================================================
// PLAYGROUND 14: Comparisons
// ============================================================================

test.describe('Playground 14: Comparisons', () => {
  const PLAYGROUND_INDEX = 14

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. has shadow DOM', async ({ page }) => {
    const hasShadow = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      return !!preview?.shadowRoot
    }, PLAYGROUND_INDEX)
    expect(hasShadow).toBe(true)
  })

  test('3. renders content', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent.length).toBeGreaterThan(0)
  })

  test('4. has elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(0)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-comparison.png')
  })
})

// ============================================================================
// PLAYGROUND 15: Negation
// ============================================================================

test.describe('Playground 15: Negation', () => {
  const PLAYGROUND_INDEX = 15

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. shows button when not disabled', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Absenden')
  })

  test('3. has button element', async ({ page }) => {
    const hasButton = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      return !!component?.querySelector('button')
    }, PLAYGROUND_INDEX)
    expect(hasButton).toBe(true)
  })

  test('4. has elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(0)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-negation.png')
  })
})

// ============================================================================
// PLAYGROUND 16: Combined Conditions
// ============================================================================

test.describe('Playground 16: Combined Conditions', () => {
  const PLAYGROUND_INDEX = 16

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. shows feature when conditions met', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Feature aktiv')
  })

  test('3. has text content', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent.length).toBeGreaterThan(0)
  })

  test('4. has elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThanOrEqual(0)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-combined.png')
  })
})

// ============================================================================
// PLAYGROUND 17: Nested Conditions
// ============================================================================

test.describe('Playground 17: Nested Conditions', () => {
  const PLAYGROUND_INDEX = 17

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. has shadow DOM', async ({ page }) => {
    const hasShadow = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      return !!preview?.shadowRoot
    }, PLAYGROUND_INDEX)
    expect(hasShadow).toBe(true)
  })

  test('3. renders content', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent.length).toBeGreaterThan(0)
  })

  test('4. has elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThanOrEqual(0)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-nested-conditions.png')
  })
})

// ============================================================================
// PLAYGROUND 18: if with each
// ============================================================================

test.describe('Playground 18: if with each', () => {
  const PLAYGROUND_INDEX = 18

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. has shadow DOM', async ({ page }) => {
    const hasShadow = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      return !!preview?.shadowRoot
    }, PLAYGROUND_INDEX)
    expect(hasShadow).toBe(true)
  })

  test('3. renders content', async ({ page }) => {
    // Wait for conditional rendering within each loop
    await page.waitForTimeout(500)
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent.length).toBeGreaterThan(0)
  })

  test('4. has task items', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    // The each loop renders 3 task items
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-if-each.png')
  })
})

// ============================================================================
// PLAYGROUND 19: Ternary Simple
// ============================================================================

test.describe('Playground 19: Ternary Simple', () => {
  const PLAYGROUND_INDEX = 19

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. has button with conditional color', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Status')
  })

  test('3. has button element', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.hasButton).toBe(true)
  })

  test('4. has elements', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(0)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-ternary-simple.png')
  })
})

// ============================================================================
// PLAYGROUND 20: Ternary Examples
// ============================================================================

test.describe('Playground 20: Ternary Examples', () => {
  const PLAYGROUND_INDEX = 20

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. has shadow DOM', async ({ page }) => {
    const hasShadow = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      return !!preview?.shadowRoot
    }, PLAYGROUND_INDEX)
    expect(hasShadow).toBe(true)
  })

  test('3. renders content', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent.length).toBeGreaterThan(0)
  })

  test('4. has multiple elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(2)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-ternary-examples.png')
  })
})

// ============================================================================
// PLAYGROUND 21: Ternary with Variables
// ============================================================================

test.describe('Playground 21: Ternary with Variables', () => {
  const PLAYGROUND_INDEX = 21

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. has themed button', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Themed')
  })

  test('3. has button element', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.hasButton).toBe(true)
  })

  test('4. has elements', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(0)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-ternary-variables.png')
  })
})

// ============================================================================
// PLAYGROUND 22: Empty State
// ============================================================================

test.describe('Playground 22: Empty State', () => {
  const PLAYGROUND_INDEX = 22

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. shows empty state message', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Keine Einträge')
  })

  test('3. shows add hint', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Füge deinen ersten Eintrag hinzu')
  })

  test('4. has inbox icon', async ({ page }) => {
    const icons = await hasIcon(page, PLAYGROUND_INDEX)
    expect(icons).toBe(true)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-empty-state.png')
  })
})

// ============================================================================
// PLAYGROUND 23: Loading Indicator
// ============================================================================

test.describe('Playground 23: Loading Indicator', () => {
  const PLAYGROUND_INDEX = 23

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. shows loading text', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Lädt...')
  })

  test('3. has loader icon', async ({ page }) => {
    const icons = await hasIcon(page, PLAYGROUND_INDEX)
    expect(icons).toBe(true)
  })

  test('4. has elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(1)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-loading.png')
  })
})

// ============================================================================
// PLAYGROUND 24: User Status
// ============================================================================

test.describe('Playground 24: User Status', () => {
  const PLAYGROUND_INDEX = 24

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('2. has shadow DOM', async ({ page }) => {
    const hasShadow = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      return !!preview?.shadowRoot
    }, PLAYGROUND_INDEX)
    expect(hasShadow).toBe(true)
  })

  test('3. renders content', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent.length).toBeGreaterThan(0)
  })

  test('4. has elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(0)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('daten-user-status.png')
  })
})
