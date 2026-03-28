/**
 * Compound Primitives: Shell E2E Tests (Playwright)
 *
 * Tests the Shell compound primitive in the studio:
 * - Layout section exists in component panel
 * - Shell component is draggable
 * - Browser parser recognizes Shell correctly
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// HELPERS
// ============================================================================

async function waitForStudioReady(page: Page) {
  await page.goto('/studio/')
  await page.waitForSelector('.cm-editor')
  await page.waitForTimeout(2000) // Wait for initial compile
}

// ============================================================================
// COMPONENT PANEL: LAYOUT SECTION
// ============================================================================

test.describe('Compound Shell: Component Panel', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('Layout section exists in component panel', async ({ page }) => {
    // Find component panel
    const componentPanel = page.locator('#component-panel, .component-panel')

    if (await componentPanel.count() === 0) {
      test.skip()
      return
    }

    // Look for Layout section - it may be collapsed
    const layoutSection = componentPanel.locator('.component-panel-section[data-section="Layout"]')

    // The section should exist (even if collapsed)
    await expect(layoutSection).toHaveCount(1)
  })

  test('Shell component exists in panel', async ({ page }) => {
    const componentPanel = page.locator('#component-panel, .component-panel')

    if (await componentPanel.count() === 0) {
      test.skip()
      return
    }

    // Find Shell item (may be hidden if section is collapsed)
    const shellItem = componentPanel.locator('[data-id="layout-shell"]')

    // The item should exist in the DOM
    await expect(shellItem).toHaveCount(1)
    await expect(shellItem).toHaveAttribute('draggable', 'true')
  })
})

// ============================================================================
// BROWSER COMPILER TEST
// ============================================================================

test.describe('Compound Shell: Browser Compiler', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('MirrorLang parser recognizes Shell as compound primitive', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof (window as any).MirrorLang === 'undefined') {
        return { error: 'MirrorLang not found' }
      }

      const code = `Shell
  Header
    Text "My App"
  Main
    Text "Content"`

      try {
        const ast = (window as any).MirrorLang.parse(code)

        if (ast.errors && ast.errors.length > 0) {
          return { parseErrors: ast.errors.map((e: any) => e.message) }
        }

        return {
          instances: ast.instances?.length || 0,
          component: ast.instances?.[0]?.component,
          isCompound: ast.instances?.[0]?.isCompound,
          children: ast.instances?.[0]?.children?.length || 0,
        }
      } catch (e: any) {
        return { error: e.message }
      }
    })

    // Verify no errors
    expect(result).not.toHaveProperty('error')
    expect(result).not.toHaveProperty('parseErrors')

    // Verify Shell is recognized correctly
    expect(result.instances).toBe(1)
    expect(result.component).toBe('Shell')
    expect(result.isCompound).toBe(true)
    expect(result.children).toBe(2) // Header and Main
  })

  test('MirrorLang generates DOM code for Shell', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof (window as any).MirrorLang === 'undefined') {
        return { error: 'MirrorLang not found' }
      }

      const code = `Shell
  Header
    Text "My App"
  Main
    Text "Content"`

      try {
        const ast = (window as any).MirrorLang.parse(code)
        const jsCode = (window as any).MirrorLang.generateDOM(ast)

        return {
          hasHeader: jsCode.includes("document.createElement('header')"),
          hasMain: jsCode.includes("document.createElement('main')"),
          hasGrid: jsCode.includes('grid'),
          codeLength: jsCode.length,
        }
      } catch (e: any) {
        return { error: e.message }
      }
    })

    // Verify no errors
    expect(result).not.toHaveProperty('error')

    // Verify semantic HTML elements are generated
    expect(result.hasHeader).toBe(true)
    expect(result.hasMain).toBe(true)

    // Verify grid layout is included
    expect(result.hasGrid).toBe(true)

    // Verify code was generated
    expect(result.codeLength).toBeGreaterThan(100)
  })

  test('Shell slots use correct semantic HTML elements', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof (window as any).MirrorLang === 'undefined') {
        return { error: 'MirrorLang not found' }
      }

      const code = `Shell
  Header
    Text "H"
  Sidebar
    Text "S"
  Main
    Text "M"
  Footer
    Text "F"`

      try {
        const ast = (window as any).MirrorLang.parse(code)
        const jsCode = (window as any).MirrorLang.generateDOM(ast)

        return {
          hasHeader: jsCode.includes("document.createElement('header')"),
          hasAside: jsCode.includes("document.createElement('aside')"),
          hasMain: jsCode.includes("document.createElement('main')"),
          hasFooter: jsCode.includes("document.createElement('footer')"),
        }
      } catch (e: any) {
        return { error: e.message }
      }
    })

    // Verify no errors
    expect(result).not.toHaveProperty('error')

    // Verify all semantic elements
    expect(result.hasHeader).toBe(true)
    expect(result.hasAside).toBe(true)
    expect(result.hasMain).toBe(true)
    expect(result.hasFooter).toBe(true)
  })

  test('Shell with nested Nav generates nav element', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof (window as any).MirrorLang === 'undefined') {
        return { error: 'MirrorLang not found' }
      }

      const code = `Shell
  Header
    Nav
      NavItem "Home"
      NavItem "About"
  Main
    Text "Content"`

      try {
        const ast = (window as any).MirrorLang.parse(code)
        const jsCode = (window as any).MirrorLang.generateDOM(ast)

        return {
          hasNav: jsCode.includes("document.createElement('nav')"),
          hasAnchor: jsCode.includes("document.createElement('a')"),
        }
      } catch (e: any) {
        return { error: e.message }
      }
    })

    // Verify no errors
    expect(result).not.toHaveProperty('error')

    // Verify nav and anchor elements
    expect(result.hasNav).toBe(true)
    expect(result.hasAnchor).toBe(true)
  })
})
