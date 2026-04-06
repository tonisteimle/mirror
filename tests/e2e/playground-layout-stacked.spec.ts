/**
 * E2E Tests für 04-layout.html - Stacked Layout
 * Playgrounds 8-9: Stacked Positionierung, Badge auf Icon
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

// =============================================================================
// Playground 8: Stacked Layout
// =============================================================================
test.describe('Playground 8: Stacked Layout', () => {
  const PLAYGROUND_INDEX = 8

  test('stacked container uses position: relative', async ({ page }) => {
    await setupPage(page)

    const containerStyle = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const stackedFrame = root?.children[1] as HTMLElement

      const style = getComputedStyle(stackedFrame)
      return {
        position: style.position,
        width: parseFloat(style.width),
        height: parseFloat(style.height)
      }
    }, PLAYGROUND_INDEX)

    expect(containerStyle.position).toBe('relative')
    expect(containerStyle.width).toBe(200)
    expect(containerStyle.height).toBe(150)
  })

  test('renders 5 positioned children', async ({ page }) => {
    await setupPage(page)

    const children = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const stackedFrame = root?.children[1] as HTMLElement

      return Array.from(stackedFrame.children).map(el => {
        const style = getComputedStyle(el as HTMLElement)
        return {
          position: style.position,
          left: style.left,
          top: style.top,
          width: parseFloat(style.width),
          height: parseFloat(style.height)
        }
      })
    }, PLAYGROUND_INDEX)

    expect(children.length).toBe(5)

    // All children should be absolutely positioned
    children.forEach(child => {
      expect(child.position).toBe('absolute')
    })

    // Corner boxes (30x30)
    expect(children[0].width).toBe(30)
    expect(children[0].height).toBe(30)
    expect(children[0].left).toBe('0px')
    expect(children[0].top).toBe('0px')

    // Top-right corner
    expect(children[1].left).toBe('170px')
    expect(children[1].top).toBe('0px')

    // Bottom-left corner
    expect(children[2].left).toBe('0px')
    expect(children[2].top).toBe('120px')

    // Bottom-right corner
    expect(children[3].left).toBe('170px')
    expect(children[3].top).toBe('120px')

    // Center circle (40x40)
    expect(children[4].width).toBe(40)
    expect(children[4].height).toBe(40)
    expect(children[4].left).toBe('80px')
    expect(children[4].top).toBe('55px')
  })

  test('corner boxes have different colors', async ({ page }) => {
    await setupPage(page)

    const colors = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const stackedFrame = root?.children[1] as HTMLElement

      return Array.from(stackedFrame.children).slice(0, 4).map(el => {
        const style = getComputedStyle(el as HTMLElement)
        return style.backgroundColor
      })
    }, PLAYGROUND_INDEX)

    // All 4 corner colors should be different
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(4)
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('stacked-basic.png')
  })
})

// =============================================================================
// Playground 9: Badge auf Icon
// =============================================================================
test.describe('Playground 9: Badge auf Icon', () => {
  const PLAYGROUND_INDEX = 9

  test('renders two stacked containers (bell with badge, avatar with status)', async ({ page }) => {
    await setupPage(page)

    const structure = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement

      const stackedContainers = Array.from(outerFrame.children) as HTMLElement[]
      return stackedContainers.map(container => {
        const style = getComputedStyle(container)
        return {
          position: style.position,
          childCount: container.children.length,
          width: parseFloat(style.width),
          height: parseFloat(style.height)
        }
      })
    }, PLAYGROUND_INDEX)

    expect(structure.length).toBe(2)
    // Both should be 44x44 stacked containers
    structure.forEach(container => {
      expect(container.position).toBe('relative')
      expect(container.width).toBe(44)
      expect(container.height).toBe(44)
      expect(container.childCount).toBe(2) // Icon/avatar + badge/status
    })
  })

  test('bell icon container has badge with "3"', async ({ page }) => {
    await setupPage(page)

    const bellContainer = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement
      const bellStacked = outerFrame.children[0] as HTMLElement

      // First child is the bell icon container, second is the badge
      const bellIconContainer = bellStacked.children[0] as HTMLElement
      const badge = bellStacked.children[1] as HTMLElement

      return {
        hasIcon: bellIconContainer.querySelector('svg') !== null,
        badgeText: badge.textContent?.trim(),
        badgePosition: getComputedStyle(badge).position,
        badgeLeft: getComputedStyle(badge).left,
        badgeTop: getComputedStyle(badge).top
      }
    }, PLAYGROUND_INDEX)

    expect(bellContainer.hasIcon).toBe(true)
    expect(bellContainer.badgeText).toBe('3')
    expect(bellContainer.badgePosition).toBe('absolute')
    expect(bellContainer.badgeLeft).toBe('30px')
    expect(bellContainer.badgeTop).toBe('-4px')
  })

  test('avatar container has initials "TS" and status indicator', async ({ page }) => {
    await setupPage(page)

    const avatarContainer = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement
      const avatarStacked = outerFrame.children[1] as HTMLElement

      const avatar = avatarStacked.children[0] as HTMLElement
      const status = avatarStacked.children[1] as HTMLElement

      return {
        avatarText: avatar.textContent?.trim(),
        avatarRadius: getComputedStyle(avatar).borderRadius,
        statusPosition: getComputedStyle(status).position,
        statusWidth: parseFloat(getComputedStyle(status).width),
        statusHeight: parseFloat(getComputedStyle(status).height),
        statusRadius: getComputedStyle(status).borderRadius
      }
    }, PLAYGROUND_INDEX)

    expect(avatarContainer.avatarText).toBe('TS')
    expect(avatarContainer.avatarRadius).toBe('99px') // Circular avatar
    expect(avatarContainer.statusPosition).toBe('absolute')
    expect(avatarContainer.statusWidth).toBe(14)
    expect(avatarContainer.statusHeight).toBe(14)
    expect(avatarContainer.statusRadius).toBe('99px') // Circular status
  })

  test('badge has red background, status has green background', async ({ page }) => {
    await setupPage(page)

    const colors = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const outerFrame = root?.children[1] as HTMLElement

      const bellStacked = outerFrame.children[0] as HTMLElement
      const avatarStacked = outerFrame.children[1] as HTMLElement

      const badge = bellStacked.children[1] as HTMLElement
      const status = avatarStacked.children[1] as HTMLElement

      return {
        badgeBg: getComputedStyle(badge).backgroundColor,
        statusBg: getComputedStyle(status).backgroundColor
      }
    }, PLAYGROUND_INDEX)

    // Badge should be red (#ef4444 = rgb(239, 68, 68))
    expect(colors.badgeBg).toContain('239')
    expect(colors.badgeBg).toContain('68')

    // Status should be green (#10b981 = rgb(16, 185, 129))
    expect(colors.statusBg).toContain('16')
    expect(colors.statusBg).toContain('185')
  })

  test('visual regression', async ({ page }) => {
    await setupPage(page)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('stacked-badge.png')
  })
})
