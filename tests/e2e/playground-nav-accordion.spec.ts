/**
 * Accordion Navigation Playground E2E Tests
 *
 * Tests the Accordion component from 11-navigation.html tutorial.
 *
 * Playground 2: Basic Accordion
 * Playground 3: Accordion with multiple, icon "plus"
 * Playground 4: Styled Accordion
 */

import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/11-navigation.html'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function setupPage(page: Page): Promise<void> {
  await page.goto(TUTORIAL_URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-playground]', { timeout: 10000 })
  await page.waitForFunction(() => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    if (playgrounds.length === 0) return false
    const preview = playgrounds[0].querySelector('.playground-preview')
    return preview?.shadowRoot !== null
  }, { timeout: 10000 })
  await page.waitForTimeout(1000)
}

async function getAccordionInfo(page: Page, playgroundIndex: number): Promise<{
  itemCount: number
  itemLabels: string[]
  openIndices: number[]
  contentTexts: string[]
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return { itemCount: 0, itemLabels: [], openIndices: [], contentTexts: [] }

    const root = shadow.querySelector('.mirror-root')
    if (!root) return { itemCount: 0, itemLabels: [], openIndices: [], contentTexts: [] }

    const accordionRoot = root.children[1] as HTMLElement
    if (!accordionRoot) return { itemCount: 0, itemLabels: [], openIndices: [], contentTexts: [] }

    // Find accordion items using data-slot="Item"
    const items = Array.from(accordionRoot.querySelectorAll('[data-slot="Item"]')) as HTMLElement[]

    const itemLabels: string[] = []
    const openIndices: number[] = []
    const contentTexts: string[] = []

    items.forEach((item, index) => {
      const trigger = item.querySelector('[data-slot="ItemTrigger"]') as HTMLElement
      const content = item.querySelector('[data-slot="ItemContent"]') as HTMLElement

      itemLabels.push(trigger?.textContent?.trim() || '')
      contentTexts.push(content?.textContent?.trim() || '')

      // Check if item is open via data-state
      const isOpen = item.getAttribute('data-state') === 'open'

      if (isOpen) {
        openIndices.push(index)
      }
    })

    return { itemCount: items.length, itemLabels, openIndices, contentTexts }
  }, playgroundIndex)
}

async function clickAccordionItem(page: Page, playgroundIndex: number, itemIndex: number): Promise<void> {
  await page.evaluate(({ idx, itemIdx }) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const accordionRoot = root?.children[1] as HTMLElement
    const items = Array.from(accordionRoot?.querySelectorAll('[data-slot="Item"]') || []) as HTMLElement[]
    const trigger = items[itemIdx]?.querySelector('[data-slot="ItemTrigger"]') as HTMLElement

    if (!trigger) throw new Error(`Accordion item trigger ${itemIdx} not found`)
    trigger.click()
  }, { idx: playgroundIndex, itemIdx: itemIndex })
}

// ============================================================================
// TESTS: BASIC ACCORDION (Playground 2)
// ============================================================================

test.describe('Basic Accordion (Playground 2)', () => {
  const PLAYGROUND_INDEX = 2

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has 3 accordion items', async ({ page }) => {
    const info = await getAccordionInfo(page, PLAYGROUND_INDEX)

    expect(info.itemCount).toBe(3)
    expect(info.itemLabels).toEqual(['Section 1', 'Section 2', 'Section 3'])
  })

  test('2. all items are closed by default', async ({ page }) => {
    const info = await getAccordionInfo(page, PLAYGROUND_INDEX)

    expect(info.openIndices).toHaveLength(0)
  })

  test('3. clicking Section 1 opens it', async ({ page }) => {
    await clickAccordionItem(page, PLAYGROUND_INDEX, 0)
    await page.waitForTimeout(200)

    const info = await getAccordionInfo(page, PLAYGROUND_INDEX)

    expect(info.openIndices).toContain(0)
  })

  test('4. clicking another item closes the first (single mode)', async ({ page }) => {
    // Open Section 1
    await clickAccordionItem(page, PLAYGROUND_INDEX, 0)
    await page.waitForTimeout(200)

    let info = await getAccordionInfo(page, PLAYGROUND_INDEX)
    expect(info.openIndices).toContain(0)

    // Click Section 2
    await clickAccordionItem(page, PLAYGROUND_INDEX, 1)
    await page.waitForTimeout(200)

    info = await getAccordionInfo(page, PLAYGROUND_INDEX)
    expect(info.openIndices).not.toContain(0)
    expect(info.openIndices).toContain(1)
  })

  test('5. clicking open item closes it', async ({ page }) => {
    // Open Section 1
    await clickAccordionItem(page, PLAYGROUND_INDEX, 0)
    await page.waitForTimeout(200)

    let info = await getAccordionInfo(page, PLAYGROUND_INDEX)
    expect(info.openIndices).toContain(0)

    // Click again to close
    await clickAccordionItem(page, PLAYGROUND_INDEX, 0)
    await page.waitForTimeout(200)

    info = await getAccordionInfo(page, PLAYGROUND_INDEX)
    expect(info.openIndices).not.toContain(0)
  })

  test('6. visual regression - initial state', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('accordion-basic-initial.png')
  })

  test('7. visual regression - section 1 open', async ({ page }) => {
    await clickAccordionItem(page, PLAYGROUND_INDEX, 0)
    await page.waitForTimeout(200)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('accordion-basic-section1-open.png')
  })
})

// ============================================================================
// TESTS: ACCORDION MULTIPLE (Playground 3)
// ============================================================================

test.describe('Accordion Multiple (Playground 3)', () => {
  const PLAYGROUND_INDEX = 3

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has 3 FAQ items', async ({ page }) => {
    const info = await getAccordionInfo(page, PLAYGROUND_INDEX)

    expect(info.itemCount).toBe(3)
    expect(info.itemLabels[0]).toContain('Was ist Mirror')
  })

  test('2. multiple items can be open simultaneously', async ({ page }) => {
    // Open first item
    await clickAccordionItem(page, PLAYGROUND_INDEX, 0)
    await page.waitForTimeout(200)

    // Open second item
    await clickAccordionItem(page, PLAYGROUND_INDEX, 1)
    await page.waitForTimeout(200)

    const info = await getAccordionInfo(page, PLAYGROUND_INDEX)

    // Both should be open
    expect(info.openIndices).toContain(0)
    expect(info.openIndices).toContain(1)
  })

  test('3. all three items can be open at once', async ({ page }) => {
    // Open all items
    await clickAccordionItem(page, PLAYGROUND_INDEX, 0)
    await page.waitForTimeout(100)
    await clickAccordionItem(page, PLAYGROUND_INDEX, 1)
    await page.waitForTimeout(100)
    await clickAccordionItem(page, PLAYGROUND_INDEX, 2)
    await page.waitForTimeout(200)

    const info = await getAccordionInfo(page, PLAYGROUND_INDEX)

    expect(info.openIndices).toHaveLength(3)
    expect(info.openIndices).toContain(0)
    expect(info.openIndices).toContain(1)
    expect(info.openIndices).toContain(2)
  })

  test('4. has item indicator icons', async ({ page }) => {
    const iconInfo = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      const accordionRoot = root?.children[1] as HTMLElement
      const indicator = accordionRoot?.querySelector('[data-slot="ItemIndicator"]') as HTMLElement

      return {
        hasIndicator: !!indicator,
        hasSvg: !!indicator?.querySelector('svg')
      }
    }, PLAYGROUND_INDEX)

    expect(iconInfo).not.toBeNull()
    expect(iconInfo!.hasIndicator).toBe(true)
    expect(iconInfo!.hasSvg).toBe(true)
  })

  test('5. visual regression - multiple open', async ({ page }) => {
    await clickAccordionItem(page, PLAYGROUND_INDEX, 0)
    await page.waitForTimeout(100)
    await clickAccordionItem(page, PLAYGROUND_INDEX, 1)
    await page.waitForTimeout(200)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('accordion-multiple-two-open.png')
  })
})

// ============================================================================
// TESTS: STYLED ACCORDION (Playground 4)
// ============================================================================

test.describe('Styled Accordion (Playground 4)', () => {
  const PLAYGROUND_INDEX = 4

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has 2 accordion items', async ({ page }) => {
    const info = await getAccordionInfo(page, PLAYGROUND_INDEX)

    expect(info.itemCount).toBe(2)
    expect(info.itemLabels).toEqual(['Styled Section', 'Another Section'])
  })

  test('2. items have custom styling (bg, rad, margin)', async ({ page }) => {
    const itemStyles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      const accordionRoot = root?.children[1] as HTMLElement
      const item = accordionRoot?.querySelector('[data-slot="Item"]') as HTMLElement
      if (!item) return null

      const styles = getComputedStyle(item)
      return {
        backgroundColor: styles.backgroundColor,
        borderRadius: styles.borderRadius,
        marginBottom: styles.marginBottom
      }
    }, PLAYGROUND_INDEX)

    expect(itemStyles).not.toBeNull()
    // bg #1a1a1a = rgb(26, 26, 26)
    expect(itemStyles!.backgroundColor).toMatch(/rgb\(26,\s*26,\s*26\)/)
    expect(itemStyles!.borderRadius).toBe('8px')
  })

  test('3. ItemTrigger has padding 16', async ({ page }) => {
    const triggerStyles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      const accordionRoot = root?.children[1] as HTMLElement
      const trigger = accordionRoot?.querySelector('[data-slot="ItemTrigger"]') as HTMLElement
      if (!trigger) return null

      return {
        padding: getComputedStyle(trigger).padding
      }
    }, PLAYGROUND_INDEX)

    expect(triggerStyles).not.toBeNull()
    expect(triggerStyles!.padding).toBe('16px')
  })

  test('4. visual regression - styled accordion', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('accordion-styled-initial.png')
  })

  test('5. visual regression - styled accordion item open', async ({ page }) => {
    await clickAccordionItem(page, PLAYGROUND_INDEX, 0)
    await page.waitForTimeout(200)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('accordion-styled-open.png')
  })
})
