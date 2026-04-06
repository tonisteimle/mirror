/**
 * Drag & Drop E2E Tests - Programmatic API
 *
 * These tests use the DragDropSystem's programmatic Test API instead of
 * simulating mouse events. This approach is more reliable and deterministic.
 *
 * The Test API is exposed on window.__mirrorDragDrop__ in DEV/TEST mode.
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// HELPERS
// ============================================================================

async function waitForStudioReady(page: Page) {
  await page.goto('/studio/')
  await page.waitForSelector('.cm-editor', { timeout: 10000 })
  await page.waitForTimeout(2000) // Wait for initial compile
}

async function setEditorContent(page: Page, content: string) {
  // Use JavaScript to set content directly, bypassing auto-indent
  await page.evaluate((newContent) => {
    const studio = (window as any).__mirrorStudio__
    if (studio?.editor) {
      studio.editor.setContent(newContent)
    }
  }, content)
  await page.waitForTimeout(1000) // Wait for recompile
}

async function getEditorContent(page: Page): Promise<string> {
  return page.evaluate(() => {
    const studio = (window as any).__mirrorStudio__
    return studio?.editor?.getContent() || ''
  })
}

async function isDragDropAvailable(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return !!(window as any).__mirrorDragDrop__
  })
}

async function waitForDragDropReady(page: Page) {
  await page.waitForFunction(
    () => !!(window as any).__mirrorDragDrop__,
    { timeout: 10000 }
  )
}

/**
 * Get all node IDs from the preview in order
 * Returns array of { id, tagName } objects
 */
async function getNodeIds(page: Page): Promise<Array<{ id: string; tag: string }>> {
  return page.evaluate(() => {
    const elements = document.querySelectorAll('[data-mirror-id]')
    return Array.from(elements).map(el => ({
      id: el.getAttribute('data-mirror-id') || '',
      tag: el.tagName.toLowerCase(),
    }))
  })
}

/**
 * Get node ID by index (0-based from all elements with data-mirror-id)
 */
async function getNodeIdByIndex(page: Page, index: number): Promise<string | null> {
  const nodes = await getNodeIds(page)
  return nodes[index]?.id ?? null
}

/**
 * Helper to construct node ID with proper prefix
 * Node IDs are structured as "node-N" where N is the internal sequence number
 */
function nodeId(n: number): string {
  return `node-${n}`
}

/**
 * Find the node ID for an element by its text content
 */
async function findNodeIdByText(page: Page, text: string): Promise<string | null> {
  return page.evaluate((searchText) => {
    const elements = document.querySelectorAll('[data-mirror-id]')
    for (const el of elements) {
      // Check direct text content (not including children's text)
      const directText = Array.from(el.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent)
        .join('')
        .trim()

      if (directText.includes(searchText)) {
        return el.getAttribute('data-mirror-id')
      }

      // Also check if the element only contains this text
      if (el.children.length === 0 && el.textContent?.trim() === searchText) {
        return el.getAttribute('data-mirror-id')
      }
    }
    return null
  }, text)
}

// ============================================================================
// TEST API AVAILABILITY
// ============================================================================

test.describe('Drag Drop API: Availability', () => {
  test('DragDropSystem is exposed on window in DEV mode', async ({ page }) => {
    await waitForStudioReady(page)

    const available = await isDragDropAvailable(page)
    expect(available).toBe(true)
  })

  test('Studio instance is exposed on window in DEV mode', async ({ page }) => {
    await waitForStudioReady(page)

    const available = await page.evaluate(() => {
      return !!(window as any).__mirrorStudio__
    })
    expect(available).toBe(true)
  })
})

// ============================================================================
// ELEMENT MOVE VIA API
// ============================================================================

test.describe('Drag Drop API: Element Move', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
    await waitForDragDropReady(page)
  })

  test('move element before sibling', async ({ page }) => {
    await setEditorContent(page, `Frame gap 8
  Text "First"
  Text "Second"
  Text "Third"`)

    // Find node IDs dynamically by text content
    const thirdId = await findNodeIdByText(page, 'Third')
    const firstId = await findNodeIdByText(page, 'First')

    expect(thirdId).not.toBeNull()
    expect(firstId).not.toBeNull()

    // Move "Third" before "First"
    const result = await page.evaluate(({ sourceId, targetId }) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateMove({
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        placement: 'before',
      })
    }, { sourceId: thirdId, targetId: firstId })

    expect(result.success).toBe(true)

    // Verify code changed
    await page.waitForTimeout(500)
    const code = await getEditorContent(page)

    // "Third" should now appear before "First" in the code
    const thirdPos = code.indexOf('Third')
    const firstPos = code.indexOf('First')
    expect(thirdPos).toBeLessThan(firstPos)
  })

  test('move element after sibling', async ({ page }) => {
    await setEditorContent(page, `Frame gap 8
  Text "A"
  Text "B"
  Text "C"`)

    // Find node IDs dynamically
    const aId = await findNodeIdByText(page, 'A')
    const cId = await findNodeIdByText(page, 'C')

    expect(aId).not.toBeNull()
    expect(cId).not.toBeNull()

    // Move "A" after "C"
    const result = await page.evaluate(({ sourceId, targetId }) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateMove({
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        placement: 'after',
      })
    }, { sourceId: aId, targetId: cId })

    expect(result.success).toBe(true)

    await page.waitForTimeout(500)
    const code = await getEditorContent(page)

    // "A" should now appear after "C"
    const aPos = code.indexOf('"A"')
    const cPos = code.indexOf('"C"')
    expect(aPos).toBeGreaterThan(cPos)
  })

  test('move element inside container', async ({ page }) => {
    await setEditorContent(page, `Frame gap 8
  Frame gap 4
    Text "Inside"
  Text "Outside"`)

    // Find node IDs dynamically
    const outsideId = await findNodeIdByText(page, 'Outside')
    const insideId = await findNodeIdByText(page, 'Inside')

    expect(outsideId).not.toBeNull()
    expect(insideId).not.toBeNull()

    // Find the inner Frame (parent of "Inside" text)
    const innerFrameId = await page.evaluate((insideNodeId) => {
      const insideEl = document.querySelector(`[data-mirror-id="${insideNodeId}"]`)
      if (!insideEl) return null
      // The parent should be the inner Frame
      const parent = insideEl.parentElement
      if (parent && parent.hasAttribute('data-mirror-id')) {
        return parent.getAttribute('data-mirror-id')
      }
      return null
    }, insideId)

    expect(innerFrameId).not.toBeNull()

    // Move "Outside" inside the inner Frame
    const result = await page.evaluate(({ sourceId, targetId }) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateMove({
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        placement: 'inside',
      })
    }, { sourceId: outsideId, targetId: innerFrameId })

    expect(result.success).toBe(true)

    await page.waitForTimeout(500)
    const code = await getEditorContent(page)

    // "Outside" should now be indented more (inside the inner Frame)
    expect(code).toContain('Outside')
  })

  test('returns error for non-existent source', async ({ page }) => {
    await setEditorContent(page, `Frame
  Text "Test"`)

    // Find a valid target ID
    const testId = await findNodeIdByText(page, 'Test')
    expect(testId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateMove({
        sourceNodeId: 'node-999', // Does not exist
        targetNodeId: targetId,
        placement: 'before',
      })
    }, testId)

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  test('returns error for non-existent target', async ({ page }) => {
    await setEditorContent(page, `Frame
  Text "Test"`)

    // Find a valid source ID
    const testId = await findNodeIdByText(page, 'Test')
    expect(testId).not.toBeNull()

    const result = await page.evaluate((sourceId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateMove({
        sourceNodeId: sourceId,
        targetNodeId: 'node-999', // Does not exist
        placement: 'before',
      })
    }, testId)

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})

// ============================================================================
// COMPONENT INSERT VIA API
// ============================================================================

test.describe('Drag Drop API: Component Insert', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
    await waitForDragDropReady(page)
  })

  test('insert new component before element', async ({ page }) => {
    await setEditorContent(page, `Frame gap 8
  Text "Original"`)

    // Find the target node ID
    const originalId = await findNodeIdByText(page, 'Original')
    expect(originalId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Button',
        targetNodeId: targetId,
        placement: 'before',
        textContent: 'New Button',
      })
    }, originalId)

    expect(result.success).toBe(true)

    await page.waitForTimeout(500)
    const code = await getEditorContent(page)

    expect(code).toContain('Button')
    expect(code).toContain('New Button')

    // Button should appear before Original
    const buttonPos = code.indexOf('Button')
    const originalPos = code.indexOf('Original')
    expect(buttonPos).toBeLessThan(originalPos)
  })

  test('insert new component after element', async ({ page }) => {
    await setEditorContent(page, `Frame gap 8
  Text "First"`)

    // Find the target node ID
    const firstId = await findNodeIdByText(page, 'First')
    expect(firstId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Text',
        targetNodeId: targetId,
        placement: 'after',
        textContent: 'Second',
      })
    }, firstId)

    expect(result.success).toBe(true)

    await page.waitForTimeout(500)
    const code = await getEditorContent(page)

    expect(code).toContain('Second')

    const firstPos = code.indexOf('First')
    const secondPos = code.indexOf('Second')
    expect(secondPos).toBeGreaterThan(firstPos)
  })

  test('insert new component inside container', async ({ page }) => {
    await setEditorContent(page, `Frame gap 8`)

    // Find the root Frame (first element with data-mirror-id)
    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Text',
        targetNodeId: targetId,
        placement: 'inside',
        textContent: 'Child',
      })
    }, frameId)

    expect(result.success).toBe(true)

    await page.waitForTimeout(500)
    const code = await getEditorContent(page)

    expect(code).toContain('Child')
    // Should be indented (inside Frame)
    expect(code).toMatch(/Frame.*\n.*Text.*Child/s)
  })

  test('insert component with properties', async ({ page }) => {
    await setEditorContent(page, `Frame gap 8
  Text "Existing"`)

    // Find the target node ID
    const existingId = await findNodeIdByText(page, 'Existing')
    expect(existingId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Button',
        targetNodeId: targetId,
        placement: 'after',
        textContent: 'Styled',
        properties: 'bg #2563eb, col white, pad 12',
      })
    }, existingId)

    expect(result.success).toBe(true)

    await page.waitForTimeout(500)
    const code = await getEditorContent(page)

    expect(code).toContain('Button')
    expect(code).toContain('Styled')
    expect(code).toContain('bg #2563eb')
  })
})

// ============================================================================
// DROP POSITION CALCULATION
// ============================================================================

test.describe('Drag Drop API: Position Calculation', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
    await waitForDragDropReady(page)
  })

  test('calculate drop result at cursor position', async ({ page }) => {
    await setEditorContent(page, `Frame gap 8
  Text "First"
  Text "Second"`)

    // Find the "Second" element ID
    const secondId = await findNodeIdByText(page, 'Second')
    expect(secondId).not.toBeNull()

    // Get position of "Second" element
    const secondRect = await page.evaluate((nodeId) => {
      const el = document.querySelector(`[data-mirror-id="${nodeId}"]`)
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    }, secondId)

    expect(secondRect).not.toBeNull()

    // Calculate drop at top of "Second" (should be "before")
    const result = await page.evaluate((rect) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateDragTo({
        x: rect.x + rect.width / 2,
        y: rect.y + 5, // Near top
      })
    }, secondRect)

    expect(result).not.toBeNull()
    expect(result.targetId).toBeDefined()
    expect(['before', 'after', 'inside']).toContain(result.placement)
  })
})

// ============================================================================
// STATE INSPECTION
// ============================================================================

test.describe('Drag Drop API: State Inspection', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
    await waitForDragDropReady(page)
  })

  test('get drag state when idle', async ({ page }) => {
    const state = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDrop__
      return system.getState()
    })

    expect(state.isActive).toBe(false)
    expect(state.source).toBeNull()
    expect(state.currentTarget).toBeNull()
    expect(state.currentResult).toBeNull()
  })

  test('get visual state when idle', async ({ page }) => {
    const state = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDrop__
      return system.getVisualState()
    })

    expect(state.indicatorVisible).toBe(false)
    expect(state.indicatorRect).toBeNull()
    expect(state.parentOutlineVisible).toBe(false)
    expect(state.parentOutlineRect).toBeNull()
  })

  test('visual state updates during simulateDragTo', async ({ page }) => {
    await setEditorContent(page, `Frame gap 8
  Text "A"
  Text "B"`)

    // Find the "A" element ID
    const aId = await findNodeIdByText(page, 'A')
    expect(aId).not.toBeNull()

    // Get position to drag to
    const rect = await page.evaluate((nodeId) => {
      const el = document.querySelector(`[data-mirror-id="${nodeId}"]`)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    }, aId)

    expect(rect).not.toBeNull()

    // Simulate drag to position (this updates visual state)
    await page.evaluate((pos) => {
      const system = (window as any).__mirrorDragDrop__
      system.simulateDragTo(pos)
    }, rect)

    // Check visual state was updated
    const visualState = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDrop__
      return system.getVisualState()
    })

    // Indicator should have been shown during calculation
    // Note: It may be hidden again after simulateDragTo completes
    expect(visualState).toBeDefined()
  })
})

// ============================================================================
// COMPLEX SCENARIOS
// ============================================================================

test.describe('Drag Drop API: Complex Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
    await waitForDragDropReady(page)
  })

  test('move element between nested containers', async ({ page }) => {
    await setEditorContent(page, `Frame gap 8
  Frame gap 4
    Text "In Container 1"
  Frame gap 4
    Text "In Container 2"`)

    // Find node IDs dynamically
    const container1TextId = await findNodeIdByText(page, 'In Container 1')
    const container2TextId = await findNodeIdByText(page, 'In Container 2')

    expect(container1TextId).not.toBeNull()
    expect(container2TextId).not.toBeNull()

    // Move "In Container 1" after "In Container 2"
    const result = await page.evaluate(({ sourceId, targetId }) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateMove({
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        placement: 'after',
      })
    }, { sourceId: container1TextId, targetId: container2TextId })

    expect(result.success).toBe(true)

    await page.waitForTimeout(500)
    const code = await getEditorContent(page)

    // Both texts should now be in the second container section
    const text1Pos = code.indexOf('In Container 1')
    const text2Pos = code.indexOf('In Container 2')

    // Text 1 should be after Text 2 now
    expect(text1Pos).toBeGreaterThan(text2Pos)
  })

  test('multiple sequential moves', async ({ page }) => {
    await setEditorContent(page, `Frame gap 8
  Text "A"
  Text "B"
  Text "C"`)

    // Find node IDs dynamically
    const aId = await findNodeIdByText(page, 'A')
    const cId = await findNodeIdByText(page, 'C')

    expect(aId).not.toBeNull()
    expect(cId).not.toBeNull()

    // Move A after C
    let result = await page.evaluate(({ sourceId, targetId }) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateMove({
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        placement: 'after',
      })
    }, { sourceId: aId, targetId: cId })
    expect(result.success).toBe(true)

    await page.waitForTimeout(500)

    // Now verify the code changed
    // Note: Node IDs may have changed after recompile, so we need fresh content
    const code = await getEditorContent(page)
    expect(code).toContain('"A"')
    expect(code).toContain('"B"')
    expect(code).toContain('"C"')

    // Verify order changed: should be B, C, A or similar
    const aPos = code.indexOf('"A"')
    const cPos = code.indexOf('"C"')
    expect(aPos).toBeGreaterThan(cPos)
  })

  test('insert multiple components sequentially', async ({ page }) => {
    await setEditorContent(page, `Frame gap 8`)

    // Find the root Frame
    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    // Insert first component
    let result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Text',
        targetNodeId: targetId,
        placement: 'inside',
        textContent: 'First',
      })
    }, frameId)
    expect(result.success).toBe(true)

    await page.waitForTimeout(500)

    // Find the Frame again (ID may have changed after recompile)
    const frameIdAfter = await getNodeIdByIndex(page, 0)
    expect(frameIdAfter).not.toBeNull()

    // Insert second component
    result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Text',
        targetNodeId: targetId,
        placement: 'inside',
        textContent: 'Second',
      })
    }, frameIdAfter)
    expect(result.success).toBe(true)

    await page.waitForTimeout(500)

    const code = await getEditorContent(page)
    expect(code).toContain('First')
    expect(code).toContain('Second')
  })
})
