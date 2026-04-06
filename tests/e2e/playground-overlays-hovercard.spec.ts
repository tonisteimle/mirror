/**
 * HoverCard Overlay E2E Tests
 *
 * Tests the HoverCard component from 12-overlays.html tutorial.
 * HoverCards open on hover (like Popover but with hover trigger).
 *
 * Playground 6: Basic HoverCard
 * ```
 * Frame h 100, center
 *   HoverCard positioning "bottom"
 *     Trigger: Text "Hover over me", underline, cursor pointer
 *     Content: Text "HoverCard content"
 * ```
 *
 * Playground 7: HoverCard User Profile
 * ```
 * Frame h 180, center
 *   HoverCard positioning "bottom"
 *     Trigger: Text "@johndoe", col #3b82f6, underline, cursor pointer
 *     Content: Frame ver, gap 12, pad 16, bg #1a1a1a, rad 12, w 250
 *       Frame hor, gap 12, ver-center
 *         Frame w 48, h 48, bg #3b82f6, rad 99, center
 *           Text "JD", col white, weight 500
 *         Frame ver
 *           Text "John Doe", weight 600
 *           Text "@johndoe", col #666, fs 14
 *       Text "Software engineer building great tools.", col #888, fs 13
 * ```
 *
 * Key behaviors:
 * - Opens on hover over trigger
 * - Closes when mouse leaves
 * - Positioning controls where card appears
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/12-overlays.html'

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

async function getHoverCardInfo(page: Page, playgroundIndex: number): Promise<{
  hasTrigger: boolean
  triggerText: string
  hasContent: boolean
  contentText: string
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return { hasTrigger: false, triggerText: '', hasContent: false, contentText: '' }

    const root = shadow.querySelector('.mirror-root')
    if (!root) return { hasTrigger: false, triggerText: '', hasContent: false, contentText: '' }

    const trigger = root.querySelector('[data-slot="Trigger"]')
    const triggerText = trigger?.textContent?.trim() || ''
    const content = root.querySelector('[data-slot="Content"]')
    const contentText = content?.textContent?.trim() || ''

    return {
      hasTrigger: !!trigger,
      triggerText,
      hasContent: !!content,
      contentText
    }
  }, playgroundIndex)
}

// ============================================================================
// PLAYGROUND 6: Basic HoverCard
// ============================================================================

test.describe('Playground 6: Basic HoverCard', () => {
  const PLAYGROUND_INDEX = 6

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger element', async ({ page }) => {
    const info = await getHoverCardInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. trigger text mentions hover', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent?.toLowerCase() || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('hover')
  })

  test('3. has content element', async ({ page }) => {
    const info = await getHoverCardInfo(page, PLAYGROUND_INDEX)

    expect(info.hasContent).toBe(true)
  })

  test('4. trigger has pointer cursor styling', async ({ page }) => {
    const hasCursor = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const trigger = root?.querySelector('[data-slot="Trigger"]') as HTMLElement
      if (!trigger) return false
      const style = getComputedStyle(trigger)
      return style.cursor === 'pointer'
    }, PLAYGROUND_INDEX)

    expect(hasCursor).toBe(true)
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('hovercard-basic.png')
  })
})

// ============================================================================
// PLAYGROUND 7: HoverCard User Profile
// ============================================================================

test.describe('Playground 7: HoverCard User Profile', () => {
  const PLAYGROUND_INDEX = 7

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger element', async ({ page }) => {
    const info = await getHoverCardInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. trigger contains @ mention', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('@')
  })

  test('3. trigger has blue color for link', async ({ page }) => {
    const hasBlue = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const trigger = root?.querySelector('[data-slot="Trigger"]') as HTMLElement
      if (!trigger) return false
      const style = getComputedStyle(trigger)
      // Check for blue color (#3b82f6 = rgb(59, 130, 246))
      return style.color.includes('59') || style.color.includes('130') || style.color.includes('246')
    }, PLAYGROUND_INDEX)

    expect(hasBlue).toBe(true)
  })

  test('4. content has user profile info', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('John')
    expect(content).toContain('johndoe')
  })

  test('5. content has avatar with initials', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('JD')
  })

  test('6. content has bio text', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content.toLowerCase()).toContain('software')
  })

  test('7. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('hovercard-userprofile.png')
  })
})
