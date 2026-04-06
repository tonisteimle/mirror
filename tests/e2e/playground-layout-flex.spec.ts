/**
 * E2E Tests für 04-layout.html - Flex Layout
 * Playgrounds 0-4: Richtung, Sizing, Centering, 9 Positionen, Wrap
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

function getPlaygroundRoot(page: Page, index: number) {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    const root = shadow?.querySelector('.mirror-root')
    return root !== null
  }, index)
}

// =============================================================================
// Playground 0: Flex Direction (hor/ver)
// =============================================================================
test.describe('Playground 0: Flex Direction', () => {
  test('renders vertical and horizontal frames', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate(() => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[0]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement

      if (!outerFrame) return null

      // Outer frame has 2 children: vertical frame and horizontal frame
      const verticalFrame = outerFrame.children[0] as HTMLElement
      const horizontalFrame = outerFrame.children[1] as HTMLElement

      return {
        outerChildCount: outerFrame.children.length,
        verticalDisplay: verticalFrame?.style.display || getComputedStyle(verticalFrame).display,
        verticalDirection: verticalFrame?.style.flexDirection || getComputedStyle(verticalFrame).flexDirection,
        verticalChildCount: verticalFrame?.children.length,
        horizontalDisplay: horizontalFrame?.style.display || getComputedStyle(horizontalFrame).display,
        horizontalDirection: horizontalFrame?.style.flexDirection || getComputedStyle(horizontalFrame).flexDirection,
        horizontalChildCount: horizontalFrame?.children.length
      }
    })

    expect(structure).not.toBeNull()
    expect(structure?.outerChildCount).toBe(2)
    // Vertical frame
    expect(structure?.verticalDisplay).toBe('flex')
    expect(structure?.verticalDirection).toBe('column')
    expect(structure?.verticalChildCount).toBe(3) // 3 Text elements
    // Horizontal frame
    expect(structure?.horizontalDisplay).toBe('flex')
    expect(structure?.horizontalDirection).toBe('row')
    expect(structure?.horizontalChildCount).toBe(3) // 3 Box elements
  })

  test('vertical frame has correct text content', async ({ page }) => {
    await setupPage(page)

    const texts = await page.evaluate(() => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[0]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement
      const verticalFrame = outerFrame?.children[0] as HTMLElement

      return Array.from(verticalFrame?.children || []).map(el => el.textContent)
    })

    expect(texts).toEqual(['Zeile 1', 'Zeile 2', 'Zeile 3'])
  })

  test('horizontal frame boxes have correct labels', async ({ page }) => {
    await setupPage(page)

    const texts = await page.evaluate(() => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[0]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement
      const horizontalFrame = outerFrame?.children[1] as HTMLElement

      return Array.from(horizontalFrame?.children || []).map(el => el.textContent)
    })

    expect(texts).toEqual(['1', '2', '3'])
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(0)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('flex-direction.png')
  })
})

// =============================================================================
// Playground 1: Flex Sizing (w 120, w hug, w full)
// =============================================================================
test.describe('Playground 1: Flex Sizing', () => {
  const PLAYGROUND_INDEX = 1

  test('renders three frames with different widths', async ({ page }) => {
    await setupPage(page)

    const widths = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement

      const frames = Array.from(outerFrame?.children || []) as HTMLElement[]
      return frames.map(frame => ({
        computedWidth: Math.round(parseFloat(getComputedStyle(frame).width)),
        text: frame.textContent
      }))
    }, PLAYGROUND_INDEX)

    expect(widths.length).toBe(3)
    // w 120 - fixed width
    expect(widths[0].text).toBe('w 120')
    expect(widths[0].computedWidth).toBe(120)
    // w hug - shrinks to content (should be smaller than 120)
    expect(widths[1].text).toBe('w hug')
    expect(widths[1].computedWidth).toBeLessThan(120)
    // w full - fills available space (should be ~300 minus padding)
    expect(widths[2].text).toBe('w full')
    expect(widths[2].computedWidth).toBeGreaterThan(200)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('flex-sizing.png')
  })
})

// =============================================================================
// Playground 2: Centering und spread
// =============================================================================
test.describe('Playground 2: Centering und spread', () => {
  const PLAYGROUND_INDEX = 2

  test('renders three frames with different alignments', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement

      const frames = Array.from(outerFrame?.children || []) as HTMLElement[]
      return frames.map(frame => {
        const style = getComputedStyle(frame)
        return {
          justifyContent: style.justifyContent,
          alignItems: style.alignItems,
          flexDirection: style.flexDirection,
          text: frame.textContent
        }
      })
    }, PLAYGROUND_INDEX)

    expect(structure.length).toBe(3)

    // center - both axes
    expect(structure[0].justifyContent).toBe('center')
    expect(structure[0].alignItems).toBe('center')
    expect(structure[0].text).toBe('center')

    // hor, spread, ver-center
    expect(structure[1].flexDirection).toBe('row')
    expect(structure[1].justifyContent).toBe('space-between')
    expect(structure[1].alignItems).toBe('center')
    expect(structure[1].text).toContain('Links')
    expect(structure[1].text).toContain('Rechts')

    // hor-center (in a vertical flex container, this centers on the cross-axis = horizontal)
    expect(structure[2].alignItems).toBe('center')
    expect(structure[2].text).toBe('nur horizontal')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('flex-centering.png')
  })
})

// =============================================================================
// Playground 3: 9 Positionen
// =============================================================================
test.describe('Playground 3: 9 Positionen', () => {
  const PLAYGROUND_INDEX = 3

  test('renders 9 boxes with position labels', async ({ page }) => {
    await setupPage(page)

    const labels = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement

      // 3 rows of 3 boxes each
      const texts: string[] = []
      const rows = Array.from(outerFrame?.children || []) as HTMLElement[]
      rows.forEach(row => {
        const boxes = Array.from(row.children) as HTMLElement[]
        boxes.forEach(box => {
          texts.push(box.textContent || '')
        })
      })
      return texts
    }, PLAYGROUND_INDEX)

    expect(labels).toEqual(['tl', 'tc', 'tr', 'cl', 'cen', 'cr', 'bl', 'bc', 'br'])
  })

  test('boxes have correct alignment styles', async ({ page }) => {
    await setupPage(page)

    const alignments = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement

      const results: { label: string, justify: string, align: string }[] = []
      const rows = Array.from(outerFrame?.children || []) as HTMLElement[]
      rows.forEach(row => {
        const boxes = Array.from(row.children) as HTMLElement[]
        boxes.forEach(box => {
          const style = getComputedStyle(box)
          results.push({
            label: box.textContent || '',
            justify: style.justifyContent,
            align: style.alignItems
          })
        })
      })
      return results
    }, PLAYGROUND_INDEX)

    // Check a few key positions
    const tl = alignments.find(a => a.label === 'tl')
    const center = alignments.find(a => a.label === 'cen')
    const br = alignments.find(a => a.label === 'br')

    expect(tl?.justify).toBe('flex-start')
    expect(tl?.align).toBe('flex-start')
    expect(center?.justify).toBe('center')
    expect(center?.align).toBe('center')
    expect(br?.justify).toBe('flex-end')
    expect(br?.align).toBe('flex-end')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('flex-9-positions.png')
  })
})

// =============================================================================
// Playground 4: Wrap
// =============================================================================
test.describe('Playground 4: Wrap', () => {
  const PLAYGROUND_INDEX = 4

  test('renders 5 boxes with flex-wrap', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement

      const style = getComputedStyle(outerFrame)
      return {
        childCount: outerFrame.children.length,
        flexWrap: style.flexWrap,
        flexDirection: style.flexDirection,
        texts: Array.from(outerFrame.children).map(el => el.textContent)
      }
    }, PLAYGROUND_INDEX)

    expect(structure.childCount).toBe(5)
    expect(structure.flexWrap).toBe('wrap')
    expect(structure.flexDirection).toBe('row')
    expect(structure.texts).toEqual(['1', '2', '3', '4', '5'])
  })

  test('boxes wrap to multiple rows', async ({ page }) => {
    await setupPage(page)

    const positions = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement

      return Array.from(outerFrame.children).map(el => {
        const rect = el.getBoundingClientRect()
        return { top: Math.round(rect.top), left: Math.round(rect.left) }
      })
    }, PLAYGROUND_INDEX)

    // First 3 boxes should be on the same row (same top)
    // Boxes 4 and 5 should be on a lower row (higher top value)
    expect(positions[0].top).toBe(positions[1].top)
    expect(positions[0].top).toBe(positions[2].top)
    expect(positions[3].top).toBeGreaterThan(positions[0].top)
    expect(positions[3].top).toBe(positions[4].top)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('flex-wrap.png')
  })
})
