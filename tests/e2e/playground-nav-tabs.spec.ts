/**
 * Tabs Navigation Playground E2E Tests
 *
 * Tests the Tabs component from 11-navigation.html tutorial.
 *
 * Playground 0: Basic Tabs
 * ```
 * Tabs defaultValue "home"
 *   Tab "Home", value "home"
 *     Text "Welcome to the home page"
 *   Tab "Profile", value "profile"
 *     Text "Your profile settings"
 *   Tab "Settings", value "settings"
 *     Text "Application settings"
 * ```
 *
 * Playground 1: Styled Tabs
 * ```
 * Tabs defaultValue "a"
 *   List: bg #1a1a1a, pad 4, rad 8, gap 4
 *   Indicator: bg #4f46e5, rad 6
 *   Tab "Dashboard", value "a"
 *     Text "Dashboard content"
 *   Tab "Analytics", value "b"
 *     Text "Analytics content"
 * ```
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

async function getTabsInfo(page: Page, playgroundIndex: number): Promise<{
  tabCount: number
  tabLabels: string[]
  activeTabIndex: number
  contentTexts: string[]
  visibleContentIndex: number
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return { tabCount: 0, tabLabels: [], activeTabIndex: -1, contentTexts: [], visibleContentIndex: -1 }

    const root = shadow.querySelector('.mirror-root')
    if (!root) return { tabCount: 0, tabLabels: [], activeTabIndex: -1, contentTexts: [], visibleContentIndex: -1 }

    // Find tabs container (Zag tabs structure uses data-slot)
    const tabsRoot = root.children[1] as HTMLElement
    if (!tabsRoot) return { tabCount: 0, tabLabels: [], activeTabIndex: -1, contentTexts: [], visibleContentIndex: -1 }

    // Find tab triggers using data-slot="Trigger"
    const triggers = Array.from(tabsRoot.querySelectorAll('[data-slot="Trigger"]')) as HTMLElement[]

    // Find tab panels/content using data-slot="Content"
    const panels = Array.from(tabsRoot.querySelectorAll('[data-slot="Content"]')) as HTMLElement[]

    const tabLabels = triggers.map(t => t.textContent?.trim() || '')
    const activeTabIndex = triggers.findIndex(t =>
      t.getAttribute('data-selected') === 'true' ||
      t.getAttribute('aria-selected') === 'true'
    )
    const contentTexts = panels.map(p => p.textContent?.trim() || '')
    const visibleContentIndex = panels.findIndex(p =>
      p.getAttribute('data-state') === 'active' ||
      p.getAttribute('data-selected') === 'true'
    )

    return {
      tabCount: triggers.length,
      tabLabels,
      activeTabIndex,
      contentTexts,
      visibleContentIndex
    }
  }, playgroundIndex)
}

async function clickTab(page: Page, playgroundIndex: number, tabIndex: number): Promise<void> {
  await page.evaluate(({ idx, tabIdx }) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[idx]
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const tabsRoot = root?.children[1] as HTMLElement
    const triggers = Array.from(tabsRoot?.querySelectorAll('[data-slot="Trigger"]') || []) as HTMLElement[]

    if (!triggers[tabIdx]) throw new Error(`Tab ${tabIdx} not found`)
    triggers[tabIdx].click()
  }, { idx: playgroundIndex, tabIdx: tabIndex })
}

// ============================================================================
// TESTS: BASIC TABS (Playground 0)
// ============================================================================

test.describe('Basic Tabs (Playground 0)', () => {
  const PLAYGROUND_INDEX = 0

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has 3 tabs with correct labels', async ({ page }) => {
    const info = await getTabsInfo(page, PLAYGROUND_INDEX)

    expect(info.tabCount).toBe(3)
    expect(info.tabLabels).toEqual(['Home', 'Profile', 'Settings'])
  })

  test('2. "Home" tab is active by default (defaultValue "home")', async ({ page }) => {
    const info = await getTabsInfo(page, PLAYGROUND_INDEX)

    expect(info.activeTabIndex).toBe(0)
    expect(info.visibleContentIndex).toBe(0)
  })

  test('3. clicking "Profile" tab shows profile content', async ({ page }) => {
    await clickTab(page, PLAYGROUND_INDEX, 1)
    await page.waitForTimeout(200)

    const info = await getTabsInfo(page, PLAYGROUND_INDEX)

    expect(info.activeTabIndex).toBe(1)
    expect(info.visibleContentIndex).toBe(1)
  })

  test('4. clicking "Settings" tab shows settings content', async ({ page }) => {
    await clickTab(page, PLAYGROUND_INDEX, 2)
    await page.waitForTimeout(200)

    const info = await getTabsInfo(page, PLAYGROUND_INDEX)

    expect(info.activeTabIndex).toBe(2)
    expect(info.visibleContentIndex).toBe(2)
  })

  test('5. only one tab content is visible at a time', async ({ page }) => {
    // Check initial
    let info = await getTabsInfo(page, PLAYGROUND_INDEX)
    expect(info.visibleContentIndex).toBe(0)

    // Click Profile
    await clickTab(page, PLAYGROUND_INDEX, 1)
    await page.waitForTimeout(200)
    info = await getTabsInfo(page, PLAYGROUND_INDEX)
    expect(info.visibleContentIndex).toBe(1)

    // Click Settings
    await clickTab(page, PLAYGROUND_INDEX, 2)
    await page.waitForTimeout(200)
    info = await getTabsInfo(page, PLAYGROUND_INDEX)
    expect(info.visibleContentIndex).toBe(2)

    // Click back to Home
    await clickTab(page, PLAYGROUND_INDEX, 0)
    await page.waitForTimeout(200)
    info = await getTabsInfo(page, PLAYGROUND_INDEX)
    expect(info.visibleContentIndex).toBe(0)
  })

  test('6. visual regression - initial state', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('tabs-basic-initial.png')
  })

  test('7. visual regression - after clicking Profile', async ({ page }) => {
    await clickTab(page, PLAYGROUND_INDEX, 1)
    await page.waitForTimeout(200)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('tabs-basic-profile-active.png')
  })
})

// ============================================================================
// TESTS: STYLED TABS (Playground 1)
// ============================================================================

test.describe('Styled Tabs (Playground 1)', () => {
  const PLAYGROUND_INDEX = 1

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has 2 tabs with correct labels', async ({ page }) => {
    const info = await getTabsInfo(page, PLAYGROUND_INDEX)

    expect(info.tabCount).toBe(2)
    expect(info.tabLabels).toEqual(['Dashboard', 'Analytics'])
  })

  test('2. "Dashboard" tab is active by default (defaultValue "a")', async ({ page }) => {
    const info = await getTabsInfo(page, PLAYGROUND_INDEX)

    expect(info.activeTabIndex).toBe(0)
  })

  test('3. List slot has custom styling', async ({ page }) => {
    const listStyles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const playground = playgrounds[idx]
      const preview = playground?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      if (!shadow) return null

      const root = shadow.querySelector('.mirror-root')
      const tabsRoot = root?.children[1] as HTMLElement
      const tabList = tabsRoot?.querySelector('[data-slot="List"]')
      if (!tabList) return null

      const styles = getComputedStyle(tabList)
      return {
        backgroundColor: styles.backgroundColor,
        padding: styles.padding,
        borderRadius: styles.borderRadius,
        gap: styles.gap
      }
    }, PLAYGROUND_INDEX)

    expect(listStyles).not.toBeNull()
    // bg #1a1a1a = rgb(26, 26, 26)
    expect(listStyles!.backgroundColor).toMatch(/rgb\(26,\s*26,\s*26\)/)
    expect(listStyles!.padding).toBe('4px')
    expect(listStyles!.borderRadius).toBe('8px')
  })

  test('4. clicking "Analytics" switches content', async ({ page }) => {
    await clickTab(page, PLAYGROUND_INDEX, 1)
    await page.waitForTimeout(200)

    const info = await getTabsInfo(page, PLAYGROUND_INDEX)

    expect(info.activeTabIndex).toBe(1)
    expect(info.visibleContentIndex).toBe(1)
  })

  test('5. visual regression - styled tabs', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('tabs-styled-initial.png')
  })

  test('6. visual regression - styled tabs after switch', async ({ page }) => {
    await clickTab(page, PLAYGROUND_INDEX, 1)
    await page.waitForTimeout(200)

    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    const preview = playground.locator('.playground-preview')

    await expect(preview).toHaveScreenshot('tabs-styled-analytics-active.png')
  })
})
