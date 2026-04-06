/**
 * E2E Tests für 13-anzeige.html - Utility
 * Playgrounds 38-42: Clipboard, QRCode, ScrollArea, Splitter
 */
import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/13-anzeige.html'

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
// Playground 38: Clipboard
// =============================================================================
test.describe('Playground 38: Clipboard', () => {
  const PLAYGROUND_INDEX = 38

  test('renders clipboard with input and copy button', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const clipboard = root?.children[1] as HTMLElement

      const input = clipboard?.querySelector('input')
      const hasIcon = clipboard?.querySelectorAll('svg').length > 0

      return {
        hasInput: input !== null,
        inputValue: input?.value || '',
        hasIcon
      }
    }, PLAYGROUND_INDEX)

    expect(structure.hasInput).toBe(true)
    expect(structure.inputValue).toContain('npm install mirror-lang')
    expect(structure.hasIcon).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('clipboard.png')
  })
})

// =============================================================================
// Playground 39: QRCode
// =============================================================================
test.describe('Playground 39: QRCode', () => {
  const PLAYGROUND_INDEX = 39

  test('renders 3 QR codes of different sizes', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      const qrCodes = container?.children.length
      const hasSvg = container?.querySelectorAll('svg').length >= 3

      return {
        qrCodeCount: qrCodes,
        hasSvg
      }
    }, PLAYGROUND_INDEX)

    expect(structure.qrCodeCount).toBe(3)
    expect(structure.hasSvg).toBe(true)
  })

  test('QR codes have different sizes', async ({ page }) => {
    await setupPage(page)

    const sizes = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return Array.from(container?.children || []).map(qr => {
        const frame = (qr as HTMLElement).querySelector('[data-part="frame"]') as HTMLElement
        if (frame) {
          const style = getComputedStyle(frame)
          return parseFloat(style.width)
        }
        return 0
      })
    }, PLAYGROUND_INDEX)

    // Should have increasing sizes
    expect(sizes[0]).toBeLessThan(sizes[1])
    expect(sizes[1]).toBeLessThan(sizes[2])
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('qrcode.png')
  })
})

// =============================================================================
// Playground 40: ScrollArea
// =============================================================================
test.describe('Playground 40: ScrollArea', () => {
  const PLAYGROUND_INDEX = 40

  test('renders scrollable content', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const scrollArea = root?.children[1] as HTMLElement

      return {
        text: scrollArea?.textContent || '',
        hasScrollbar: scrollArea?.querySelector('[data-part="scrollbar"]') !== null
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Scrollbarer Bereich')
    expect(structure.text).toContain('Lorem ipsum')
    expect(structure.hasScrollbar).toBe(true)
  })

  test('has fixed height', async ({ page }) => {
    await setupPage(page)

    const height = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const scrollArea = root?.children[1] as HTMLElement

      const rootEl = scrollArea?.querySelector('[data-part="root"]') as HTMLElement
      if (rootEl) {
        return parseFloat(getComputedStyle(rootEl).height)
      }
      return 0
    }, PLAYGROUND_INDEX)

    expect(height).toBe(200)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('scroll-area.png')
  })
})

// =============================================================================
// Playground 42: Splitter
// =============================================================================
test.describe('Playground 42: Splitter', () => {
  const PLAYGROUND_INDEX = 42

  test('renders splitter with 2 panels', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const splitter = root?.children[1] as HTMLElement

      return {
        text: splitter?.textContent || '',
        hasResizeTrigger: splitter?.querySelector('[data-part="resize-trigger"]') !== null
      }
    }, PLAYGROUND_INDEX)

    expect(structure.text).toContain('Linker Bereich')
    expect(structure.text).toContain('Rechter Bereich')
    expect(structure.hasResizeTrigger).toBe(true)
  })

  test('resize trigger has col-resize cursor', async ({ page }) => {
    await setupPage(page)

    const cursor = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const splitter = root?.children[1] as HTMLElement

      const trigger = splitter?.querySelector('[data-part="resize-trigger"]') as HTMLElement
      if (trigger) {
        return getComputedStyle(trigger).cursor
      }
      return ''
    }, PLAYGROUND_INDEX)

    expect(cursor).toBe('col-resize')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('splitter.png')
  })
})
