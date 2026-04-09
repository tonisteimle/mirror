/**
 * Animationen E2E Tests
 *
 * Tests Transitions, Easing, Animation Presets, Enter/Exit from 07-animationen.html tutorial.
 *
 * Playground 0: Transitions - ohne vs. mit Dauer (hover: vs hover 0.2s:)
 * Playground 1: Easing - ease-out, ease-in, ease-in-out
 * Playground 2: Animation Presets - pulse, bounce, shake, spin
 * Playground 3: State Animation - LikeBtn mit toggle und bounce
 * Playground 4: Enter/Exit - fade-in/fade-out auf Hinweis
 * Playground 5: Slide-In Menü - slide-in/slide-out Animation
 * Playground 6: Loading Spinner - spin Animation mit Icon
 *
 * Key behaviors:
 * - Transitions smooth state changes with duration
 * - Easing controls acceleration curve
 * - Animation presets provide common effects
 * - Enter/Exit animate visibility changes
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/07-animationen.html'

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

// ============================================================================
// PLAYGROUND 0: Transitions
// ============================================================================

test.describe('Playground 0: Transitions', () => {
  const PLAYGROUND_INDEX = 0

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has button without transition', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Ohne')
  })

  test('3. has button with transition', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Mit 0.2s')
  })

  test('4. has both button variants', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    // Both "Ohne" and "Mit 0.2s" buttons should be present
    expect(info.textContent).toContain('Ohne')
    expect(info.textContent).toContain('Mit')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('anim-transitions.png')
  })
})

// ============================================================================
// PLAYGROUND 1: Easing
// ============================================================================

test.describe('Playground 1: Easing', () => {
  const PLAYGROUND_INDEX = 1

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has ease-out button', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('ease-out')
  })

  test('3. has ease-in button', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('ease-in')
  })

  test('4. has ease-in-out button', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    // All three easing variants should be present
    expect(info.textContent).toContain('ease-in-out')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('anim-easing.png')
  })
})

// ============================================================================
// PLAYGROUND 2: Animation Presets
// ============================================================================

test.describe('Playground 2: Animation Presets', () => {
  const PLAYGROUND_INDEX = 2

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has pulse animation box', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('pulse')
  })

  test('3. has bounce animation box', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('bounce')
  })

  test('4. has four animation boxes', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    // pulse, bounce, shake, spin
    expect(info.textContent).toContain('shake')
    expect(info.textContent).toContain('spin')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('anim-presets.png')
  })
})

// ============================================================================
// PLAYGROUND 3: State Animation (LikeBtn)
// ============================================================================

test.describe('Playground 3: State Animation', () => {
  const PLAYGROUND_INDEX = 3

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has like button text', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Gefällt mir')
  })

  test('3. has heart icon', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    expect(info.hasIcon).toBe(true)
  })

  test('4. has interactive element', async ({ page }) => {
    const info = await getRootInfo(page, PLAYGROUND_INDEX)
    // LikeBtn is a toggleable element with children
    expect(info.elementCount).toBeGreaterThan(1)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('anim-like-btn.png')
  })
})

// ============================================================================
// PLAYGROUND 4: Enter/Exit
// ============================================================================

test.describe('Playground 4: Enter/Exit', () => {
  const PLAYGROUND_INDEX = 4

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has toggle button', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Hinweis')
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

  test('4. has multiple children', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(1)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('anim-enter-exit.png')
  })
})

// ============================================================================
// PLAYGROUND 5: Slide-In Menü
// ============================================================================

test.describe('Playground 5: Slide-In Menü', () => {
  const PLAYGROUND_INDEX = 5

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has menu button', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Menü')
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

  test('4. has menu items content', async ({ page }) => {
    // Menu items are hidden initially, but the container exists
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(1)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('anim-slide-menu.png')
  })
})

// ============================================================================
// PLAYGROUND 6: Loading Spinner
// ============================================================================

test.describe('Playground 6: Loading Spinner', () => {
  const PLAYGROUND_INDEX = 6

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has component structure', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.exists).toBe(true)
    expect(info.childCount).toBeGreaterThan(0)
  })

  test('2. has loading text', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.textContent).toContain('Lädt')
  })

  test('3. has spinner icon', async ({ page }) => {
    const hasSpinner = await hasIcon(page, PLAYGROUND_INDEX)
    expect(hasSpinner).toBe(true)
  })

  test('4. has icon and text elements', async ({ page }) => {
    const info = await getComponentInfo(page, PLAYGROUND_INDEX)
    expect(info.elementCount).toBeGreaterThan(1)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('anim-spinner.png')
  })
})
