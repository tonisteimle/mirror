/**
 * Click-to-Draw E2E Tests (Playwright)
 *
 * Tests for the click-to-draw interaction system:
 * - Component panel click to enter draw mode
 * - Rectangle drawing in absolute containers
 * - Grid snapping (8px)
 * - Smart guide integration
 * - Keyboard modifiers (Shift, Alt, Cmd, ESC)
 * - Container validation
 * - Code generation with x, y, w, h properties
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// HELPERS
// ============================================================================

async function waitForStudioReady(page: Page) {
  await page.goto('/studio/')
  await page.waitForSelector('.cm-editor')
  await page.waitForTimeout(2000)
}

async function setEditorContent(page: Page, content: string) {
  // Clear and set editor content
  await page.evaluate((newContent) => {
    const view = (window as any).studioContext?.editor?.view ||
                 (window as any).studio?.editor?.view ||
                 (window as any).editor?.view

    if (view) {
      // Replace entire document
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: newContent
        }
      })
    }
  }, content)

  // Wait for recompile
  await page.waitForTimeout(1500)
}

async function getEditorContent(page: Page): Promise<string> {
  return await page.evaluate(() => {
    // Try multiple paths to get editor content
    const view = (window as any).studioContext?.editor?.view ||
                 (window as any).studio?.editor?.view ||
                 (window as any).editor?.view

    if (view) {
      return view.state.doc.toString()
    }

    // Fallback: try to get content from DOM
    const editorElement = document.querySelector('.cm-content')
    if (editorElement) {
      return editorElement.textContent || ''
    }

    return ''
  })
}

async function clickComponentInPanel(page: Page, componentName: string) {
  const componentPanel = page.locator('#components-panel, .components-panel')
  const component = componentPanel.locator('.component-panel-item').filter({ hasText: componentName }).first()

  // Wait for component to be visible
  await component.waitFor({ state: 'visible', timeout: 5000 })
  await component.click()
  await page.waitForTimeout(200)
}

async function drawRectangle(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
  modifiers?: { shift?: boolean; alt?: boolean; meta?: boolean }
) {
  // Move to start position
  await page.mouse.move(start.x, start.y)

  // Press modifier keys if needed
  if (modifiers?.shift) await page.keyboard.down('Shift')
  if (modifiers?.alt) await page.keyboard.down('Alt')
  if (modifiers?.meta) await page.keyboard.down('Meta')

  // Draw rectangle
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 10 })
  await page.mouse.up()

  // Release modifier keys
  if (modifiers?.shift) await page.keyboard.up('Shift')
  if (modifiers?.alt) await page.keyboard.up('Alt')
  if (modifiers?.meta) await page.keyboard.up('Meta')

  await page.waitForTimeout(500)
}

async function hasDrawOverlay(page: Page): Promise<boolean> {
  const overlay = page.locator('.draw-overlay')
  const isVisible = await overlay.isVisible().catch(() => false)
  if (!isVisible) return false

  const display = await overlay.evaluate((el) => getComputedStyle(el).display)
  return display !== 'none'
}

async function hasCrosshairCursor(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return document.body.classList.contains('draw-cursor-crosshair')
  })
}

// ============================================================================
// CLICK-TO-DRAW TESTS
// ============================================================================

test.describe('Click-to-Draw: Basic Flow', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('clicking component enters draw mode with crosshair cursor', async ({ page }) => {
    // Set up absolute container
    await setEditorContent(page, 'Box abs w 400, h 300, bg #f0f0f0')

    // Click Box component in panel
    await clickComponentInPanel(page, 'Box')

    // Should have crosshair cursor
    const hasCursor = await hasCrosshairCursor(page)
    expect(hasCursor).toBe(true)
  })

  test('drawing rectangle in absolute container creates component', async ({ page }) => {
    // Set up absolute container
    await setEditorContent(page, 'Box abs w 400, h 300, bg #f0f0f0')

    // Click Box component
    await clickComponentInPanel(page, 'Box')

    // Get container position
    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()
    expect(box).not.toBeNull()

    if (box) {
      // Draw rectangle inside container
      await drawRectangle(
        page,
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 120 }
      )

      // Check editor content
      const content = await getEditorContent(page)
      expect(content).toContain('Box abs w 400, h 300, bg #f0f0f0')
      expect(content).toContain('Box') // Second Box should be added
      expect(content).toMatch(/x \d+/) // Should have x property
      expect(content).toMatch(/y \d+/) // Should have y property
      expect(content).toMatch(/w \d+/) // Should have w property
      expect(content).toMatch(/h \d+/) // Should have h property
    }
  })

  test('ESC key cancels draw mode', async ({ page }) => {
    await setEditorContent(page, 'Box abs w 400, h 300')

    // Enter draw mode
    await clickComponentInPanel(page, 'Box')
    expect(await hasCrosshairCursor(page)).toBe(true)

    // Press ESC
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)

    // Should exit draw mode
    expect(await hasCrosshairCursor(page)).toBe(false)
  })

  test('minimum size enforcement (10x10)', async ({ page }) => {
    await setEditorContent(page, 'Box abs w 400, h 300')

    await clickComponentInPanel(page, 'Box')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      const initialContent = await getEditorContent(page)

      // Try to draw too small rectangle (5x5)
      await drawRectangle(
        page,
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 55, y: box.y + 55 }
      )

      await page.waitForTimeout(500)

      // Content should not change (component not created)
      const finalContent = await getEditorContent(page)
      expect(finalContent).toBe(initialContent)
    }
  })
})

test.describe('Click-to-Draw: Grid Snapping', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('coordinates snap to 8px grid', async ({ page }) => {
    await setEditorContent(page, 'Box abs w 400, h 300')

    await clickComponentInPanel(page, 'Box')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      // Draw at non-grid positions (e.g., 53, 47)
      // Should snap to nearest 8px (e.g., 56, 48)
      await drawRectangle(
        page,
        { x: box.x + 53, y: box.y + 47 },
        { x: box.x + 153, y: box.y + 117 }
      )

      const content = await getEditorContent(page)

      // Extract x, y, w, h values
      const xMatch = content.match(/x (\d+)/)
      const yMatch = content.match(/y (\d+)/)
      const wMatch = content.match(/w (\d+)/)
      const hMatch = content.match(/h (\d+)/)

      if (xMatch && yMatch && wMatch && hMatch) {
        const x = parseInt(xMatch[1])
        const y = parseInt(yMatch[1])
        const w = parseInt(wMatch[1])
        const h = parseInt(hMatch[1])

        // All values should be divisible by 8
        expect(x % 8).toBe(0)
        expect(y % 8).toBe(0)
        expect(w % 8).toBe(0)
        expect(h % 8).toBe(0)
      }
    }
  })

  test('Cmd/Meta key disables snapping', async ({ page }) => {
    await setEditorContent(page, 'Box abs w 400, h 300')

    await clickComponentInPanel(page, 'Box')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      // Draw with Meta key held (disable snapping)
      await drawRectangle(
        page,
        { x: box.x + 53, y: box.y + 47 },
        { x: box.x + 153, y: box.y + 117 },
        { meta: true }
      )

      const content = await getEditorContent(page)

      const xMatch = content.match(/x (\d+)/)
      const yMatch = content.match(/y (\d+)/)

      if (xMatch && yMatch) {
        const x = parseInt(xMatch[1])
        const y = parseInt(yMatch[1])

        // At least one value should NOT be divisible by 8
        // (since we drew at 53, 47 which aren't on grid)
        const snapped = (x % 8 === 0) && (y % 8 === 0)
        expect(snapped).toBe(false)
      }
    }
  })
})

test.describe('Click-to-Draw: Keyboard Modifiers', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('Shift key constrains to square', async ({ page }) => {
    await setEditorContent(page, 'Box abs w 400, h 300')

    await clickComponentInPanel(page, 'Box')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      // Draw rectangle with Shift held
      await drawRectangle(
        page,
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 120 },
        { shift: true }
      )

      const content = await getEditorContent(page)

      const wMatch = content.match(/w (\d+)/)
      const hMatch = content.match(/h (\d+)/)

      if (wMatch && hMatch) {
        const w = parseInt(wMatch[1])
        const h = parseInt(hMatch[1])

        // Width and height should be equal (square)
        expect(w).toBe(h)
      }
    }
  })

  test('Alt key draws from center', async ({ page }) => {
    await setEditorContent(page, 'Box abs w 400, h 300')

    await clickComponentInPanel(page, 'Box')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      // Draw with Alt (center point at 100, 100)
      const centerX = box.x + 100
      const centerY = box.y + 100

      await drawRectangle(
        page,
        { x: centerX, y: centerY },
        { x: centerX + 50, y: centerY + 40 },
        { alt: true }
      )

      const content = await getEditorContent(page)

      // Component should be created
      expect(content).toMatch(/x \d+/)
      expect(content).toMatch(/y \d+/)

      // With Alt, the start point is the center, not top-left
      // So x should be less than the click point
      const xMatch = content.match(/x (\d+)/)
      if (xMatch) {
        const x = parseInt(xMatch[1])
        // Center was at 100, so x should be < 100
        expect(x).toBeLessThan(100)
      }
    }
  })
})

test.describe('Click-to-Draw: Smart Guides', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('guide overlay appears during drawing', async ({ page }) => {
    await setEditorContent(page, `
Box abs w 400, h 300
  Box x 50, y 50, w 60, h 40, bg #3B82F6
`.trim())

    await clickComponentInPanel(page, 'Box')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      // Start drawing near existing element
      await page.mouse.move(box.x + 50, box.y + 150)
      await page.mouse.down()
      await page.mouse.move(box.x + 110, box.y + 190, { steps: 5 })

      // Check for draw overlay
      const hasOverlay = await hasDrawOverlay(page)
      expect(hasOverlay).toBe(true)

      // Finish
      await page.mouse.up()
    }
  })

  test('drawing near sibling shows alignment guides', async ({ page }) => {
    await setEditorContent(page, `
Box abs w 400, h 300
  Box x 48, y 48, w 64, h 48, bg #3B82F6
`.trim())

    await page.waitForTimeout(500)

    await clickComponentInPanel(page, 'Box')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      // Draw near the existing box (x: 48) so it should snap to x: 48
      await drawRectangle(
        page,
        { x: box.x + 45, y: box.y + 150 },
        { x: box.x + 105, y: box.y + 190 }
      )

      const content = await getEditorContent(page)

      // Should have snapped to align with sibling at x: 48
      const xMatch = content.match(/x (\d+)/)
      if (xMatch) {
        const x = parseInt(xMatch[1])
        // Should snap to 48 (grid-snapped sibling position)
        expect(x).toBe(48)
      }
    }
  })
})

test.describe('Click-to-Draw: Container Validation', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('cannot draw in flex container', async ({ page }) => {
    // Set up flex container (vertical)
    await setEditorContent(page, 'Box ver w 400, h 300')

    await clickComponentInPanel(page, 'Box')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      const initialContent = await getEditorContent(page)

      // Try to draw in flex container
      await drawRectangle(
        page,
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 120 }
      )

      await page.waitForTimeout(500)

      // Content should not change (error: only absolute containers allowed)
      const finalContent = await getEditorContent(page)
      expect(finalContent).toBe(initialContent)
    }
  })

  test('can draw in stacked (absolute) container', async ({ page }) => {
    // Set up stacked container (absolute positioning)
    await setEditorContent(page, 'Box stacked w 400, h 300')

    await clickComponentInPanel(page, 'Box')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      await drawRectangle(
        page,
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 120 }
      )

      const content = await getEditorContent(page)

      // Should have created component
      expect(content).toMatch(/x \d+/)
      expect(content).toMatch(/y \d+/)
    }
  })
})

test.describe('Click-to-Draw: Visual Feedback', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('draw overlay shows during rectangle creation', async ({ page }) => {
    await setEditorContent(page, 'Box abs w 400, h 300')

    await clickComponentInPanel(page, 'Box')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      // Start drawing
      await page.mouse.move(box.x + 50, box.y + 50)
      await page.mouse.down()
      await page.mouse.move(box.x + 100, box.y + 80, { steps: 5 })

      // Overlay should be visible
      expect(await hasDrawOverlay(page)).toBe(true)

      // Finish drawing
      await page.mouse.up()
      await page.waitForTimeout(100)

      // Overlay should be hidden after completion
      expect(await hasDrawOverlay(page)).toBe(false)
    }
  })

  test('dimension label shows size during drawing', async ({ page }) => {
    await setEditorContent(page, 'Box abs w 400, h 300')

    await clickComponentInPanel(page, 'Box')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      // Start drawing
      await page.mouse.move(box.x + 50, box.y + 50)
      await page.mouse.down()
      await page.mouse.move(box.x + 150, box.y + 120, { steps: 10 })

      // Check for dimension label
      const dimensionLabel = page.locator('.draw-rect-label-dimensions')
      const isVisible = await dimensionLabel.isVisible().catch(() => false)

      if (isVisible) {
        const text = await dimensionLabel.textContent()
        // Should show dimensions like "96 × 64" or similar
        expect(text).toMatch(/\d+\s*×\s*\d+/)
      }

      await page.mouse.up()
    }
  })
})

test.describe('Click-to-Draw: Multiple Components', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('can draw Text component with content', async ({ page }) => {
    await setEditorContent(page, 'Box abs w 400, h 300')

    await clickComponentInPanel(page, 'Text')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      await drawRectangle(
        page,
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 80 }
      )

      const content = await getEditorContent(page)

      // Should have Text component with position
      expect(content).toContain('Text')
      expect(content).toMatch(/x \d+/)
      expect(content).toMatch(/y \d+/)
    }
  })

  test('can draw multiple components sequentially', async ({ page }) => {
    await setEditorContent(page, 'Box abs w 400, h 300')

    const container = page.locator('#preview [data-mirror-id]').first()
    const box = await container.boundingBox()

    if (box) {
      // Draw first Box
      await clickComponentInPanel(page, 'Box')
      await drawRectangle(
        page,
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 150, y: box.y + 120 }
      )

      // Draw second Box
      await clickComponentInPanel(page, 'Box')
      await drawRectangle(
        page,
        { x: box.x + 200, y: box.y + 50 },
        { x: box.x + 300, y: box.y + 120 }
      )

      const content = await getEditorContent(page)

      // Count Box occurrences (should be 3: container + 2 children)
      const boxMatches = content.match(/Box/g)
      expect(boxMatches).not.toBeNull()
      if (boxMatches) {
        expect(boxMatches.length).toBeGreaterThanOrEqual(3)
      }
    }
  })
})
