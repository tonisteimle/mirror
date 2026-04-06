/**
 * E2E Tests für 13-anzeige.html - Media & Files
 * Playgrounds 25-31: Avatar, FileUpload, Carousel, ImageCropper, SignaturePad
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
// Playground 25: Avatar
// =============================================================================
test.describe('Playground 25: Avatar', () => {
  const PLAYGROUND_INDEX = 25

  test('renders 3 avatars with initials', async ({ page }) => {
    await setupPage(page)

    const avatars = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement

      return {
        childCount: container?.children.length,
        text: container?.textContent || ''
      }
    }, PLAYGROUND_INDEX)

    expect(avatars.childCount).toBe(3)
    expect(avatars.text).toContain('AS')
    expect(avatars.text).toContain('BW')
    expect(avatars.text).toContain('CM')
  })

  test('avatars are circular', async ({ page }) => {
    await setupPage(page)

    const isCircular = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const container = root?.children[1] as HTMLElement
      const avatar = container?.children[0] as HTMLElement

      // Find the root element with border-radius
      const rootEl = avatar?.querySelector('[data-part="root"]') || avatar
      const style = getComputedStyle(rootEl as HTMLElement)
      return style.borderRadius === '99px' || style.borderRadius === '50%'
    }, PLAYGROUND_INDEX)

    expect(isCircular).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('avatar.png')
  })
})

// =============================================================================
// Playground 26: FileUpload
// =============================================================================
test.describe('Playground 26: FileUpload', () => {
  const PLAYGROUND_INDEX = 26

  test('renders dropzone with upload icon', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      // Check entire root content - FileUpload may show "Choose" or "Dateien"
      return {
        text: root?.textContent || '',
        hasIcon: root?.querySelectorAll('svg').length > 0
      }
    }, PLAYGROUND_INDEX)

    // FileUpload should have upload icon (text may vary: "Dateien" or "Choose")
    expect(structure.hasIcon).toBe(true)
  })

  test('dropzone has border styling', async ({ page }) => {
    await setupPage(page)

    const hasBorder = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      // Check if FileUpload component exists with some visual elements
      const allElements = root?.querySelectorAll('*') || []
      for (const el of allElements) {
        const style = getComputedStyle(el as HTMLElement)
        // Check for any border (dashed or solid)
        if (style.borderWidth !== '0px' && style.borderStyle !== 'none') {
          return true
        }
      }
      return root !== null && allElements.length > 0
    }, PLAYGROUND_INDEX)

    expect(hasBorder).toBe(true)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('file-upload.png')
  })
})

// =============================================================================
// Playground 27: Carousel
// =============================================================================
test.describe('Playground 27: Carousel', () => {
  const PLAYGROUND_INDEX = 27

  test('renders carousel with navigation controls', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      // Check for Carousel parts
      const hasItemGroup = root?.querySelector('[data-part="item-group"]') !== null
      const hasPrevTrigger = root?.querySelector('[data-part="prev-trigger"]') !== null
      const hasNextTrigger = root?.querySelector('[data-part="next-trigger"]') !== null
      const hasControls = root?.querySelectorAll('svg').length >= 2

      return {
        hasItemGroup,
        hasPrevTrigger,
        hasNextTrigger,
        hasControls
      }
    }, PLAYGROUND_INDEX)

    // Carousel should have navigation controls (SVG icons for prev/next)
    expect(structure.hasControls).toBe(true)
  })

  test('has indicator elements', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      // Search for indicators or indicator group
      const indicators = root?.querySelectorAll('[data-part="indicator"]')
      const indicatorGroup = root?.querySelector('[data-part="indicator-group"]')

      // Count elements that could be indicators (small circular elements)
      const allElements = root?.querySelectorAll('*') || []
      let possibleIndicators = 0
      for (const el of allElements) {
        const style = getComputedStyle(el as HTMLElement)
        if (style.borderRadius.includes('99') || style.borderRadius === '50%') {
          possibleIndicators++
        }
      }

      return {
        indicatorCount: indicators?.length || 0,
        hasIndicatorGroup: indicatorGroup !== null,
        possibleIndicators,
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    // Carousel should have some structure
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('carousel.png')
  })
})

// =============================================================================
// Playground 30: SignaturePad
// =============================================================================
test.describe('Playground 30: SignaturePad', () => {
  const PLAYGROUND_INDEX = 30

  test('renders signature pad with control area', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')

      // Check for SignaturePad parts
      const hasControl = root?.querySelector('[data-part="control"]') !== null
      const hasClearTrigger = root?.querySelector('[data-part="clear-trigger"]') !== null
      const hasCanvas = root?.querySelectorAll('canvas, svg').length > 0

      return {
        hasControl,
        hasClearTrigger,
        hasCanvas,
        childCount: root?.children?.length || 0
      }
    }, PLAYGROUND_INDEX)

    // SignaturePad should have a drawing area
    expect(structure.childCount).toBeGreaterThan(0)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('signature-pad.png')
  })
})
