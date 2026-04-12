/**
 * Component Insertion E2E Tests
 *
 * Comprehensive tests for adding components from the component panel
 * into different container types:
 *
 * 1. Flex Containers (ver/hor with gap)
 *    - Vertical stack insertion (before, after, inside)
 *    - Horizontal stack insertion (before, after, inside)
 *    - Insertion at specific positions
 *
 * 2. Positioned Containers (stacked/pos)
 *    - Insertion with automatic x/y coordinates
 *    - Insertion at specific positions
 *    - Verifying x/y properties are set correctly
 *
 * These tests use the DragDropSystem's programmatic Test API for 100% testability.
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// HELPERS
// ============================================================================

async function waitForStudioReady(page: Page) {
  await page.goto('/studio/')
  await page.waitForSelector('.cm-editor', { timeout: 10000 })
  await page.waitForTimeout(2000)
}

async function setEditorContent(page: Page, content: string) {
  await page.evaluate((newContent) => {
    const studio = (window as any).__mirrorStudio__
    if (studio?.editor) {
      studio.editor.setContent(newContent)
    }
  }, content)
  await page.waitForTimeout(1000)
}

async function getEditorContent(page: Page): Promise<string> {
  return page.evaluate(() => {
    const studio = (window as any).__mirrorStudio__
    return studio?.editor?.getContent() || ''
  })
}

async function waitForDragDropReady(page: Page) {
  await page.waitForFunction(
    () => !!(window as any).__mirrorDragDrop__,
    { timeout: 10000 }
  )
}

async function getNodeIdByIndex(page: Page, index: number): Promise<string | null> {
  return page.evaluate((idx) => {
    const elements = document.querySelectorAll('[data-mirror-id]')
    return elements[idx]?.getAttribute('data-mirror-id') ?? null
  }, index)
}

async function findNodeIdByText(page: Page, text: string): Promise<string | null> {
  return page.evaluate((searchText) => {
    const elements = document.querySelectorAll('[data-mirror-id]')
    for (const el of elements) {
      if (el.textContent?.includes(searchText)) {
        return el.getAttribute('data-mirror-id')
      }
    }
    return null
  }, text)
}

async function getNodeChildCount(page: Page, nodeId: string): Promise<number> {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-mirror-id="${id}"]`)
    if (!el) return 0
    return el.querySelectorAll(':scope > [data-mirror-id]').length
  }, nodeId)
}

// ============================================================================
// FLEX CONTAINER TESTS - VERTICAL STACK
// ============================================================================

test.describe('Component Insertion: Vertical Flex Container', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
    await waitForDragDropReady(page)
  })

  test('insert Button into empty vertical container', async ({ page }) => {
    await setEditorContent(page, `Frame ver, gap 8`)

    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Button',
        targetNodeId: targetId,
        placement: 'inside',
        textContent: 'Click Me',
      })
    }, frameId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)
    expect(code).toContain('Button "Click Me"')
    expect(code).toMatch(/Frame ver, gap 8\s+Button "Click Me"/)
  })

  test('insert Text before existing element in vertical stack', async ({ page }) => {
    await setEditorContent(page, `Frame ver, gap 8
  Button "Existing"`)

    const existingId = await findNodeIdByText(page, 'Existing')
    expect(existingId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Text',
        targetNodeId: targetId,
        placement: 'before',
        textContent: 'New Text',
      })
    }, existingId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Text should appear before Button
    const textPos = code.indexOf('New Text')
    const buttonPos = code.indexOf('Existing')
    expect(textPos).toBeLessThan(buttonPos)
  })

  test('insert Icon after existing element in vertical stack', async ({ page }) => {
    await setEditorContent(page, `Frame ver, gap 8
  Text "First"`)

    const firstId = await findNodeIdByText(page, 'First')
    expect(firstId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Icon',
        targetNodeId: targetId,
        placement: 'after',
        textContent: 'star',
      })
    }, firstId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Icon should be after First
    const firstPos = code.indexOf('First')
    const iconPos = code.indexOf('Icon')

    expect(iconPos).toBeGreaterThan(firstPos)
    expect(code).toContain('Icon "star"')
  })

  test('insert multiple components maintaining order', async ({ page }) => {
    await setEditorContent(page, `Frame ver, gap 12`)

    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    // Insert first component
    await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Text',
        targetNodeId: targetId,
        placement: 'inside',
        textContent: 'First',
      })
    }, frameId)

    await page.waitForTimeout(500)

    // Find first text and insert after
    const firstId = await findNodeIdByText(page, 'First')
    expect(firstId).not.toBeNull()

    await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Text',
        targetNodeId: targetId,
        placement: 'after',
        textContent: 'Second',
      })
    }, firstId)

    await page.waitForTimeout(500)

    const code = await getEditorContent(page)
    const firstPos = code.indexOf('First')
    const secondPos = code.indexOf('Second')

    expect(firstPos).toBeLessThan(secondPos)
  })

  test('insert component with properties into vertical stack', async ({ page }) => {
    await setEditorContent(page, `Frame ver, gap 8`)

    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Button',
        targetNodeId: targetId,
        placement: 'inside',
        textContent: 'Styled',
        properties: 'bg #2563eb, col white, pad 12 24, rad 6',
      })
    }, frameId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)
    expect(code).toContain('bg #2563eb')
    expect(code).toContain('col white')
    expect(code).toContain('pad 12 24')
    expect(code).toContain('rad 6')
  })
})

// ============================================================================
// FLEX CONTAINER TESTS - HORIZONTAL STACK
// ============================================================================

test.describe('Component Insertion: Horizontal Flex Container', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
    await waitForDragDropReady(page)
  })

  test('insert Button into empty horizontal container', async ({ page }) => {
    await setEditorContent(page, `Frame hor, gap 8`)

    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Button',
        targetNodeId: targetId,
        placement: 'inside',
        textContent: 'Click',
      })
    }, frameId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)
    expect(code).toContain('Button "Click"')
  })

  test('insert element before existing in horizontal row', async ({ page }) => {
    await setEditorContent(page, `Frame hor, gap 8
  Button "B"`)

    const buttonBId = await findNodeIdByText(page, 'B')
    expect(buttonBId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Button',
        targetNodeId: targetId,
        placement: 'before',
        textContent: 'A',
      })
    }, buttonBId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // A should be before B
    const posA = code.indexOf('"A"')
    const posB = code.indexOf('"B"')

    expect(posA).toBeLessThan(posB)
  })

  test('insert element after existing in horizontal row', async ({ page }) => {
    await setEditorContent(page, `Frame hor, gap 8
  Button "A"`)

    const buttonAId = await findNodeIdByText(page, 'A')
    expect(buttonAId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Button',
        targetNodeId: targetId,
        placement: 'after',
        textContent: 'B',
      })
    }, buttonAId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // B should be after A
    const posA = code.indexOf('"A"')
    const posB = code.indexOf('"B"')

    expect(posB).toBeGreaterThan(posA)
  })
})

// ============================================================================
// POSITIONED CONTAINER TESTS - STACKED/POS
// ============================================================================

test.describe('Component Insertion: Positioned Container (stacked)', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
    await waitForDragDropReady(page)
  })

  test('insert Button into stacked container with position', async ({ page }) => {
    await setEditorContent(page, `Frame stacked, w 400, h 300`)

    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsertAbsolute({
        componentName: 'Button',
        targetNodeId: targetId,
        position: { x: 100, y: 50 },
        textContent: 'Positioned',
      })
    }, frameId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Should have x and y coordinates
    expect(code).toMatch(/x\s+100/)
    expect(code).toMatch(/y\s+50/)
    expect(code).toContain('Button')
    expect(code).toContain('Positioned')
  })

  test('insert element with properties into stacked container', async ({ page }) => {
    await setEditorContent(page, `Frame stacked, w 400, h 300, bg #1a1a1a`)

    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsertAbsolute({
        componentName: 'Frame',
        targetNodeId: targetId,
        position: { x: 50, y: 50 },
        properties: 'w 100, h 100, bg #2563eb, rad 8',
      })
    }, frameId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Should have position AND other properties
    expect(code).toMatch(/x\s+50/)
    expect(code).toMatch(/y\s+50/)
    expect(code).toContain('w 100')
    expect(code).toContain('h 100')
    expect(code).toContain('bg #2563eb')
    expect(code).toContain('rad 8')
  })

  test('insert multiple elements at different positions', async ({ page }) => {
    await setEditorContent(page, `Frame stacked, w 400, h 300`)

    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    // Insert first element
    await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsertAbsolute({
        componentName: 'Frame',
        targetNodeId: targetId,
        position: { x: 10, y: 10 },
        properties: 'w 50, h 50, bg red',
      })
    }, frameId)

    await page.waitForTimeout(300)

    // Insert second element
    await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsertAbsolute({
        componentName: 'Frame',
        targetNodeId: targetId,
        position: { x: 200, y: 150 },
        properties: 'w 50, h 50, bg blue',
      })
    }, frameId)

    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Both positions should be in the code
    expect(code).toMatch(/x\s+10/)
    expect(code).toMatch(/y\s+10/)
    expect(code).toMatch(/x\s+200/)
    expect(code).toMatch(/y\s+150/)
    expect(code).toContain('bg red')
    expect(code).toContain('bg blue')
  })

  test('insert Icon with position in stacked container', async ({ page }) => {
    await setEditorContent(page, `Frame stacked, w 300, h 200`)

    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsertAbsolute({
        componentName: 'Icon',
        targetNodeId: targetId,
        position: { x: 140, y: 90 },
        textContent: 'star',
        properties: 'ic gold, is 24',
      })
    }, frameId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Icon with text and properties - text may come before or after properties
    expect(code).toContain('Icon')
    expect(code).toContain('"star"')
    expect(code).toMatch(/x\s+140/)
    expect(code).toMatch(/y\s+90/)
    expect(code).toContain('ic gold')
    expect(code).toContain('is 24')
  })

  test('insert into nested stacked container', async ({ page }) => {
    await setEditorContent(page, `Frame stacked, w 400, h 300
  Frame stacked, x 50, y 50, w 200, h 150, bg #333`)

    // Find the inner stacked Frame
    const innerFrameId = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-mirror-id]')
      // Find the nested frame (second one)
      return elements[1]?.getAttribute('data-mirror-id') ?? null
    })

    expect(innerFrameId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsertAbsolute({
        componentName: 'Button',
        targetNodeId: targetId,
        position: { x: 20, y: 20 },
        textContent: 'Nested',
      })
    }, innerFrameId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Button should be inside the inner frame with x/y properties
    // Text may come before or after properties
    expect(code).toContain('Button')
    expect(code).toContain('"Nested"')
    // Should have its own x/y relative to inner container
    expect(code).toMatch(/x\s+20/)
    expect(code).toMatch(/y\s+20/)
  })
})

// ============================================================================
// EDGE CASES AND MIXED CONTAINERS
// ============================================================================

test.describe('Component Insertion: Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
    await waitForDragDropReady(page)
  })

  test('insert into deeply nested flex structure', async ({ page }) => {
    await setEditorContent(page, `Frame ver, gap 8
  Frame hor, gap 8
    Text "Deep"`)

    const deepId = await findNodeIdByText(page, 'Deep')
    expect(deepId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Button',
        targetNodeId: targetId,
        placement: 'after',
        textContent: 'Added',
      })
    }, deepId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)
    expect(code).toContain('Button "Added"')

    // Should be at same level as "Deep"
    const deepPos = code.indexOf('Deep')
    const addedPos = code.indexOf('Added')
    expect(addedPos).toBeGreaterThan(deepPos)
  })

  test('insert into flex container inside stacked container', async ({ page }) => {
    await setEditorContent(page, `Frame stacked, w 400, h 300
  Frame ver, gap 8, x 50, y 50
    Text "Flex child"`)

    const textId = await findNodeIdByText(page, 'Flex child')
    expect(textId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Button',
        targetNodeId: targetId,
        placement: 'after',
        textContent: 'Added to flex',
      })
    }, textId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Button should NOT have x/y (it's in a flex container)
    const buttonLine = code.split('\n').find(line => line.includes('Added to flex'))
    expect(buttonLine).toBeDefined()
    expect(buttonLine).not.toMatch(/x\s+\d+/)
    expect(buttonLine).not.toMatch(/y\s+\d+/)
  })

  test('insert Text component preserves content', async ({ page }) => {
    await setEditorContent(page, `Frame ver, gap 8`)

    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Text',
        targetNodeId: targetId,
        placement: 'inside',
        textContent: 'Hello World with special chars: <>&"\'',
      })
    }, frameId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)
    expect(code).toContain('Hello World')
  })

  test('insert component fails gracefully with invalid target', async ({ page }) => {
    await setEditorContent(page, `Frame ver, gap 8`)

    const result = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Button',
        targetNodeId: 'nonexistent-node',
        placement: 'inside',
        textContent: 'Test',
      })
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  test('position values are rounded to integers', async ({ page }) => {
    await setEditorContent(page, `Frame stacked, w 400, h 300`)

    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsertAbsolute({
        componentName: 'Frame',
        targetNodeId: targetId,
        position: { x: 100.7, y: 50.3 },
        properties: 'w 50, h 50, bg red',
      })
    }, frameId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Should be rounded to integers
    expect(code).toMatch(/x\s+101/)
    expect(code).toMatch(/y\s+50/)
  })
})

// ============================================================================
// CODE VERIFICATION TESTS
// ============================================================================

test.describe('Component Insertion: Code Verification', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
    await waitForDragDropReady(page)
  })

  test('inserted element appears in code correctly', async ({ page }) => {
    await setEditorContent(page, `Frame ver, gap 8
  Text "A"`)

    const textAId = await findNodeIdByText(page, 'A')
    expect(textAId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsert({
        componentName: 'Text',
        targetNodeId: targetId,
        placement: 'after',
        textContent: 'X',
      })
    }, textAId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Both A and X should be in the code as children of Frame
    expect(code).toContain('"A"')
    expect(code).toContain('"X"')

    // Count the Text elements - should have 2 now
    const textMatches = code.match(/Text\s+"/g)
    expect(textMatches?.length).toBe(2)
  })

  test('stacked element has correct x/y properties in code', async ({ page }) => {
    await setEditorContent(page, `Frame stacked, w 400, h 300, bg #111`)

    const frameId = await getNodeIdByIndex(page, 0)
    expect(frameId).not.toBeNull()

    const result = await page.evaluate((targetId) => {
      const system = (window as any).__mirrorDragDrop__
      return system.simulateInsertAbsolute({
        componentName: 'Frame',
        targetNodeId: targetId,
        position: { x: 100, y: 100 },
        properties: 'w 50, h 50, bg red',
      })
    }, frameId)

    expect(result.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Verify x and y coordinates are in the code
    expect(code).toMatch(/x\s+100/)
    expect(code).toMatch(/y\s+100/)
    expect(code).toContain('w 50')
    expect(code).toContain('h 50')
    expect(code).toContain('bg red')
  })
})
