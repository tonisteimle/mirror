/**
 * Form Controls E2E Tests
 *
 * Tests Input, Textarea, Checkbox, Switch, and RadioGroup from 11-eingabe.html tutorial.
 *
 * Playground 0: Input
 * Playground 1: Textarea
 * Playground 2: Checkbox
 * Playground 3: Switch
 * Playground 4: RadioGroup
 *
 * Key behaviors:
 * - Input accepts text input
 * - Textarea accepts multiline text
 * - Checkbox toggles checked state on click
 * - Switch toggles on/off state
 * - RadioGroup allows single selection
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/11-eingabe.html'

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

async function hasSlot(page: Page, playgroundIndex: number, slotName: string): Promise<boolean> {
  return page.evaluate((args) => {
    const { idx, slot } = args
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    const root = shadow?.querySelector('.mirror-root')
    const component = root?.children[1] as HTMLElement
    return !!component?.querySelector(`[data-slot="${slot}"]`)
  }, { idx: playgroundIndex, slot: slotName })
}

async function countInputs(page: Page, playgroundIndex: number): Promise<number> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    const root = shadow?.querySelector('.mirror-root')
    const component = root?.children[1] as HTMLElement
    return component?.querySelectorAll('input')?.length || 0
  }, playgroundIndex)
}

async function countTextareas(page: Page, playgroundIndex: number): Promise<number> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    const root = shadow?.querySelector('.mirror-root')
    const component = root?.children[1] as HTMLElement
    return component?.querySelectorAll('textarea')?.length || 0
  }, playgroundIndex)
}

// ============================================================================
// PLAYGROUND 0: Input
// ============================================================================

test.describe('Playground 0: Input', () => {
  const PLAYGROUND_INDEX = 0

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has input structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has multiple input fields', async ({ page }) => {
    const count = await countInputs(page, PLAYGROUND_INDEX)
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('3. has placeholder text', async ({ page }) => {
    const hasPlaceholder = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      const input = component?.querySelector('input')
      return !!input?.placeholder
    }, PLAYGROUND_INDEX)
    expect(hasPlaceholder).toBe(true)
  })

  test('4. has disabled input', async ({ page }) => {
    const hasDisabled = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      const inputs = component?.querySelectorAll('input')
      return Array.from(inputs || []).some(input => input.disabled)
    }, PLAYGROUND_INDEX)
    expect(hasDisabled).toBe(true)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('input-basic.png')
  })
})

// ============================================================================
// PLAYGROUND 1: Textarea
// ============================================================================

test.describe('Playground 1: Textarea', () => {
  const PLAYGROUND_INDEX = 1

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has textarea structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has textarea elements', async ({ page }) => {
    const count = await countTextareas(page, PLAYGROUND_INDEX)
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('3. has placeholder text', async ({ page }) => {
    const hasPlaceholder = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      const textarea = component?.querySelector('textarea')
      return !!textarea?.placeholder
    }, PLAYGROUND_INDEX)
    expect(hasPlaceholder).toBe(true)
  })

  test('4. has multiple textareas', async ({ page }) => {
    const count = await countTextareas(page, PLAYGROUND_INDEX)
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('textarea-basic.png')
  })
})

// ============================================================================
// PLAYGROUND 2: Checkbox
// ============================================================================

test.describe('Playground 2: Checkbox', () => {
  const PLAYGROUND_INDEX = 2

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has checkbox structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has Control slot', async ({ page }) => {
    const hasControl = await hasSlot(page, PLAYGROUND_INDEX, 'Control')
    expect(hasControl).toBe(true)
  })

  test('3. has text content', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent.length).toBeGreaterThan(0)
  })

  test('4. has interactive elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(2)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('checkbox-basic.png')
  })
})

// ============================================================================
// PLAYGROUND 3: Switch
// ============================================================================

test.describe('Playground 3: Switch', () => {
  const PLAYGROUND_INDEX = 3

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has switch structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has Track slot', async ({ page }) => {
    const hasTrack = await hasSlot(page, PLAYGROUND_INDEX, 'Track')
    expect(hasTrack).toBe(true)
  })

  test('3. has Thumb slot', async ({ page }) => {
    const hasThumb = await hasSlot(page, PLAYGROUND_INDEX, 'Thumb')
    expect(hasThumb).toBe(true)
  })

  test('4. has interactive structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('switch.png')
  })
})

// ============================================================================
// PLAYGROUND 4: RadioGroup
// ============================================================================

test.describe('Playground 4: RadioGroup', () => {
  const PLAYGROUND_INDEX = 4

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has radiogroup structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has multiple radio items', async ({ page }) => {
    const count = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const component = root?.children[1] as HTMLElement
      // Check for radio items or ItemControl slots
      const items = component?.querySelectorAll('[data-component="RadioItem"]')
      const controls = component?.querySelectorAll('[data-slot="ItemControl"]')
      return Math.max(items?.length || 0, controls?.length || 0)
    }, PLAYGROUND_INDEX)

    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('3. has text content for options', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent.length).toBeGreaterThan(0)
  })

  test('4. has multiple elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(3)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('radiogroup-basic.png')
  })
})
