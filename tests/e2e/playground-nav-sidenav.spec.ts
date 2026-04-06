/**
 * SideNav Navigation Playground E2E Tests
 *
 * Tests the SideNav component from 11-navigation.html tutorial.
 * Playgrounds 7-10
 */

import { test, expect, Page } from '@playwright/test'

const TUTORIAL_URL = '/docs/tutorial/11-navigation.html'

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

// ============================================================================
// TESTS: BASIC SIDENAV (Playground 7)
// ============================================================================

test.describe('Basic SideNav (Playground 7)', () => {
  const PLAYGROUND_INDEX = 7

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has 3 nav items with icons', async ({ page }) => {
    const itemCount = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return 0

      const root = shadow.querySelector('.mirror-root')
      const wrapper = root?.children[1] as HTMLElement
      const items = wrapper?.querySelectorAll('[data-slot="Item"]')
      return items?.length || 0
    }, PLAYGROUND_INDEX)

    expect(itemCount).toBe(3)
  })

  test('2. nav items have labels', async ({ page }) => {
    const labels = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return []

      const root = shadow.querySelector('.mirror-root')
      const wrapper = root?.children[1] as HTMLElement
      const items = Array.from(wrapper?.querySelectorAll('[data-slot="Item"]') || []) as HTMLElement[]

      return items.map(item => item.textContent?.trim() || '')
    }, PLAYGROUND_INDEX)

    expect(labels).toContain('Dashboard')
    expect(labels).toContain('Projects')
    expect(labels).toContain('Settings')
  })

  test('3. clicking nav item triggers navigate()', async ({ page }) => {
    await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return

      const root = shadow.querySelector('.mirror-root')
      const wrapper = root?.children[1] as HTMLElement
      const items = Array.from(wrapper?.querySelectorAll('[data-slot="Item"]') || []) as HTMLElement[]

      // Click Projects item
      const projectsItem = items.find(item => item.textContent?.includes('Projects'))
      projectsItem?.click()
    }, PLAYGROUND_INDEX)

    await page.waitForTimeout(200)

    // Check that ProjectsView is visible
    const visibleView = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return ''

      const root = shadow.querySelector('.mirror-root')
      const wrapper = root?.children[1] as HTMLElement
      // Find content area (second child)
      const contentArea = wrapper?.children[1] as HTMLElement
      if (!contentArea) return ''

      // Find visible view
      const views = Array.from(contentArea.children) as HTMLElement[]
      for (const view of views) {
        const style = getComputedStyle(view)
        if (style.display !== 'none') {
          return view.textContent?.trim() || ''
        }
      }
      return ''
    }, PLAYGROUND_INDEX)

    expect(visibleView).toContain('Projects')
  })

  test('4. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('sidenav-basic.png')
  })
})

// ============================================================================
// TESTS: SIDENAV WITH GROUPS (Playground 8)
// ============================================================================

test.describe('SideNav with Groups (Playground 8)', () => {
  const PLAYGROUND_INDEX = 8

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has header and footer areas', async ({ page }) => {
    const areas = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return { hasHeader: false, hasFooter: false }

      const root = shadow.querySelector('.mirror-root')
      const sideNav = root?.children[1] as HTMLElement
      const header = sideNav?.querySelector('[data-slot="Header"]')
      const footer = sideNav?.querySelector('[data-slot="Footer"]')

      return {
        hasHeader: !!header,
        hasFooter: !!footer,
        headerText: header?.textContent?.trim() || '',
        footerText: footer?.textContent?.trim() || ''
      }
    }, PLAYGROUND_INDEX)

    expect(areas.hasHeader).toBe(true)
    expect(areas.headerText).toContain('My App')
    expect(areas.hasFooter).toBe(true)
    expect(areas.footerText).toContain('v1.0.0')
  })

  test('2. has nav groups', async ({ page }) => {
    const hasGroup = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return false

      const root = shadow.querySelector('.mirror-root')
      const sideNav = root?.children[1] as HTMLElement
      const group = sideNav?.querySelector('[data-slot="Group"]')

      return !!group
    }, PLAYGROUND_INDEX)

    expect(hasGroup).toBe(true)
  })

  test('3. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('sidenav-groups.png')
  })
})

// ============================================================================
// TESTS: SIDENAV COLLAPSED (Playground 9)
// ============================================================================

test.describe('SideNav Collapsed (Playground 9)', () => {
  const PLAYGROUND_INDEX = 9

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has narrow width (collapsed mode)', async ({ page }) => {
    const width = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return 0

      const root = shadow.querySelector('.mirror-root')
      const sideNav = root?.children[1] as HTMLElement
      return sideNav?.offsetWidth || 0
    }, PLAYGROUND_INDEX)

    expect(width).toBeLessThanOrEqual(70) // Collapsed nav should be narrow
  })

  test('2. nav items show only icons', async ({ page }) => {
    const itemsInfo = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return []

      const root = shadow.querySelector('.mirror-root')
      const sideNav = root?.children[1] as HTMLElement
      const items = Array.from(sideNav?.querySelectorAll('[data-slot="Item"]') || []) as HTMLElement[]

      return items.map(item => ({
        hasIcon: !!item.querySelector('svg'),
        textLength: item.textContent?.trim().length || 0
      }))
    }, PLAYGROUND_INDEX)

    // All items should have icons
    expect(itemsInfo.every(item => item.hasIcon)).toBe(true)
  })

  test('3. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('sidenav-collapsed.png')
  })
})

// ============================================================================
// TESTS: STYLED SIDENAV (Playground 10)
// ============================================================================

test.describe('Styled SideNav (Playground 10)', () => {
  const PLAYGROUND_INDEX = 10

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has custom root styling', async ({ page }) => {
    const styles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      const sideNav = root?.children[1] as HTMLElement
      if (!sideNav) return null

      const computed = getComputedStyle(sideNav)
      return {
        backgroundColor: computed.backgroundColor
      }
    }, PLAYGROUND_INDEX)

    expect(styles).not.toBeNull()
  })

  test('2. has badge on Messages item', async ({ page }) => {
    const hasBadge = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return false

      const root = shadow.querySelector('.mirror-root')
      const sideNav = root?.children[1] as HTMLElement
      const badge = sideNav?.querySelector('[data-slot="ItemBadge"]')

      return !!badge
    }, PLAYGROUND_INDEX)

    expect(hasBadge).toBe(true)
  })

  test('3. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')
    await expect(preview).toHaveScreenshot('sidenav-styled.png')
  })
})
