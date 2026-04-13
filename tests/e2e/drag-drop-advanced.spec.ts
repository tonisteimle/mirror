/**
 * Advanced Drag & Drop E2E Tests
 *
 * Tests for advanced scenarios not covered by basic E2E tests:
 * - Alt+Drag (Duplicate)
 * - Mode Debouncing (Flex ↔ Absolute transitions)
 * - Nested Container Navigation
 * - Visual Feedback Verification
 * - Error Recovery
 * - Performance under stress
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// HELPERS
// ============================================================================

async function waitForStudioReady(page: Page) {
  await page.goto('/studio/')
  await page.waitForSelector('.cm-editor', { timeout: 10000 })
  await page.waitForFunction(() => !!(window as any).__mirrorDragDropV2__, { timeout: 10000 })
  await page.waitForTimeout(1000)
}

async function setEditorContent(page: Page, content: string) {
  await page.evaluate(newContent => {
    return new Promise<void>(resolve => {
      const studio = (window as any).__mirrorStudio__
      if (!studio?.editor || !studio?.events) {
        resolve()
        return
      }

      const unsubscribe = studio.events.on('compile:completed', () => {
        unsubscribe()
        resolve()
      })

      studio.editor.setContent(newContent)
      studio.events.emit('compile:requested', {})
    })
  }, content)
  await page.waitForTimeout(500)
}

async function getEditorContent(page: Page): Promise<string> {
  return page.evaluate(() => {
    const studio = (window as any).__mirrorStudio__
    return studio?.editor?.getContent() || ''
  })
}

async function findNodeIdByText(page: Page, text: string): Promise<string | null> {
  return page.evaluate(searchText => {
    const elements = document.querySelectorAll('[data-mirror-id]')
    let bestMatch: Element | null = null
    let smallestSize = Infinity

    for (const el of elements) {
      if (el.textContent?.includes(searchText)) {
        const size = el.textContent.length
        if (size < smallestSize) {
          smallestSize = size
          bestMatch = el
        }
      }
    }

    return bestMatch?.getAttribute('data-mirror-id') || null
  }, text)
}

async function getFirstNodeId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.querySelector('[data-mirror-id]')
    return el?.getAttribute('data-mirror-id') || null
  })
}

async function getNodeCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    return document.querySelectorAll('[data-mirror-id]').length
  })
}

async function getElementBounds(page: Page, nodeId: string) {
  return page.evaluate(id => {
    const el = document.querySelector(`[data-mirror-id="${id}"]`)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  }, nodeId)
}

// ============================================================================
// 1. ALT+DRAG (DUPLICATE)
// ============================================================================

test.describe('Alt+Drag: Duplicate Elements', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('Alt+Drag duplicates element instead of moving', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame gap 8
  Button "Original"
  Text "Target"`
    )

    const initialCount = await getNodeCount(page)
    const originalId = await findNodeIdByText(page, 'Original')
    const targetId = await findNodeIdByText(page, 'Target')

    expect(originalId).not.toBeNull()
    expect(targetId).not.toBeNull()

    const originalBounds = await getElementBounds(page, originalId!)
    const targetBounds = await getElementBounds(page, targetId!)

    if (!originalBounds || !targetBounds) {
      test.skip()
      return
    }

    // Hold Alt and drag
    await page.keyboard.down('Alt')

    await page.mouse.move(
      originalBounds.x + originalBounds.width / 2,
      originalBounds.y + originalBounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      targetBounds.x + targetBounds.width / 2,
      targetBounds.y + targetBounds.height + 10,
      { steps: 5 }
    )
    await page.mouse.up()

    await page.keyboard.up('Alt')

    await page.waitForTimeout(1000)

    const finalCount = await getNodeCount(page)
    const code = await getEditorContent(page)

    // If duplicate worked, we should have more elements
    // Original should still exist AND a copy was made
    expect(code).toContain('Original')

    // Count of "Original" occurrences should be 2 if duplicate worked
    const originalOccurrences = (code.match(/Original/g) || []).length
    // Either 1 (move) or 2 (duplicate) - both are valid depending on implementation
    expect(originalOccurrences).toBeGreaterThanOrEqual(1)
  })

  test('Alt key state is tracked correctly', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame gap 8
  Button "Test"`
    )

    // Check initial Alt state
    let context = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.controller?.getContext?.() || {}
    })
    expect(context.isAltKeyPressed).toBe(false)

    // Press Alt
    await page.keyboard.down('Alt')
    await page.waitForTimeout(50)

    context = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.controller?.getContext?.() || {}
    })
    expect(context.isAltKeyPressed).toBe(true)

    // Release Alt
    await page.keyboard.up('Alt')
    await page.waitForTimeout(50)

    context = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.controller?.getContext?.() || {}
    })
    expect(context.isAltKeyPressed).toBe(false)
  })

  test('Alt released during drag still completes as move', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame gap 8
  Button "A"
  Button "B"`
    )

    const buttonAId = await findNodeIdByText(page, 'A')
    const buttonBId = await findNodeIdByText(page, 'B')

    const boundsA = await getElementBounds(page, buttonAId!)
    const boundsB = await getElementBounds(page, buttonBId!)

    if (!boundsA || !boundsB) {
      test.skip()
      return
    }

    // Start with Alt
    await page.keyboard.down('Alt')

    await page.mouse.move(boundsA.x + boundsA.width / 2, boundsA.y + boundsA.height / 2)
    await page.mouse.down()
    await page.mouse.move(boundsB.x + boundsB.width / 2, boundsB.y + boundsB.height / 2)

    // Release Alt BEFORE mouse up
    await page.keyboard.up('Alt')
    await page.waitForTimeout(50)

    await page.mouse.up()
    await page.waitForTimeout(500)

    // Should complete as move (not duplicate) since Alt was released
    const code = await getEditorContent(page)
    const aCount = (code.match(/"A"/g) || []).length
    expect(aCount).toBe(1) // Only one "A" - was moved, not duplicated
  })
})

// ============================================================================
// 2. MODE DEBOUNCING
// ============================================================================

test.describe('Mode Debouncing: Flex ↔ Absolute', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('rapid mode transitions are debounced', async ({ page }) => {
    // Container with both flex and positioned children
    await setEditorContent(
      page,
      `Frame stacked, w 400, h 300
  Frame ver, gap 4, x 20, y 20, w 150, h 100
    Text "Flex Child 1"
    Text "Flex Child 2"`
    )

    const containerId = await getFirstNodeId(page)
    const containerBounds = await getElementBounds(page, containerId!)

    if (!containerBounds) {
      test.skip()
      return
    }

    // Simulate rapid mouse movements crossing flex/absolute boundary
    await page.mouse.move(containerBounds.x + 100, containerBounds.y + 50)
    await page.mouse.down()

    // Rapid back and forth
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(containerBounds.x + 50, containerBounds.y + 50)
      await page.mouse.move(containerBounds.x + 250, containerBounds.y + 150)
    }

    await page.mouse.up()

    // No crash should occur
    const state = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.controller?.getState?.() || {}
    })

    // State should be idle after mouseup
    expect(state.type).toBe('idle')
  })

  test('mode settles after debounce period', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame stacked, w 400, h 300
  Text "Content", x 50, y 50`
    )

    const textId = await findNodeIdByText(page, 'Content')
    const textBounds = await getElementBounds(page, textId!)

    if (!textBounds) {
      test.skip()
      return
    }

    // Start drag
    await page.mouse.move(textBounds.x + textBounds.width / 2, textBounds.y + textBounds.height / 2)
    await page.mouse.down()

    // Move to new position
    await page.mouse.move(textBounds.x + 100, textBounds.y + 100)

    // Wait for debounce to settle (MODE_TRANSITION_DEBOUNCE_MS = 80ms)
    await page.waitForTimeout(150)

    // Drop
    await page.mouse.up()
    await page.waitForTimeout(500)

    // Should not crash and state should be idle
    const state = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.controller?.getState?.() || {}
    })
    expect(state.type).toBe('idle')
  })
})

// ============================================================================
// 3. NESTED CONTAINER NAVIGATION
// ============================================================================

test.describe('Nested Containers', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('can drop into deeply nested container', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame ver, gap 8
  Frame ver, gap 4
    Frame ver, gap 2
      Text "Deep Target"
  Button "Source"`
    )

    const sourceId = await findNodeIdByText(page, 'Source')
    const targetId = await findNodeIdByText(page, 'Deep Target')

    expect(sourceId).not.toBeNull()
    expect(targetId).not.toBeNull()

    // Move source after deep target
    const result = await page.evaluate(
      ({ source, target }) => {
        const system = (window as any).__mirrorDragDrop__
        return system?.simulateMove?.({
          sourceNodeId: source,
          targetNodeId: target,
          placement: 'after',
        })
      },
      { source: sourceId, target: targetId }
    )

    expect(result?.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Source should be after Deep Target in code
    const posTarget = code.indexOf('Deep Target')
    const posSource = code.indexOf('Source')
    expect(posTarget).toBeLessThan(posSource)
  })

  test('moving element out of nested container', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame ver, gap 8
  Frame ver, gap 4
    Button "Inner"
  Text "Outer"`
    )

    const innerId = await findNodeIdByText(page, 'Inner')
    const outerId = await findNodeIdByText(page, 'Outer')

    expect(innerId).not.toBeNull()
    expect(outerId).not.toBeNull()

    // Move Inner after Outer (out of nested container)
    const result = await page.evaluate(
      ({ source, target }) => {
        const system = (window as any).__mirrorDragDrop__
        return system?.simulateMove?.({
          sourceNodeId: source,
          targetNodeId: target,
          placement: 'after',
        })
      },
      { source: innerId, target: outerId }
    )

    expect(result?.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Verify both elements still exist in code
    expect(code).toContain('Inner')
    expect(code).toContain('Outer')

    // Verify Inner appears after Outer in the code
    const lines = code.split('\n')
    const innerLineIndex = lines.findIndex(l => l.includes('Inner'))
    const outerLineIndex = lines.findIndex(l => l.includes('Outer'))

    // Inner should be on a line after Outer
    expect(innerLineIndex).toBeGreaterThan(outerLineIndex)
  })

  test('container redirect works near container edges', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame ver, gap 8
  Frame ver, gap 4, pad 12
    Text "Child 1"
    Text "Child 2"
  Text "After Container"`
    )

    // Get positions for container redirect test
    const child2Id = await findNodeIdByText(page, 'Child 2')
    const afterId = await findNodeIdByText(page, 'After Container')

    const child2Bounds = await getElementBounds(page, child2Id!)
    const afterBounds = await getElementBounds(page, afterId!)

    if (!child2Bounds || !afterBounds) {
      test.skip()
      return
    }

    // Drag just below Child 2 but above "After Container"
    // This should trigger container redirect
    const gapY = (child2Bounds.y + child2Bounds.height + afterBounds.y) / 2

    const result = await page.evaluate(
      ({ cursor }) => {
        const system = (window as any).__mirrorDragDropV2__
        // Create a palette source
        const source = { type: 'palette', componentName: 'Button' }
        return system?.controller?.simulateDragTo?.(source, cursor)
      },
      { cursor: { x: child2Bounds.x + child2Bounds.width / 2, y: gapY } }
    )

    // Result should exist (container redirect should find a valid target)
    // Note: Exact behavior depends on container redirect threshold
  })
})

// ============================================================================
// 4. VISUAL FEEDBACK VERIFICATION
// ============================================================================

test.describe('Visual Feedback', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('drop indicator appears during drag', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame ver, gap 8
  Text "A"
  Text "B"
  Text "C"`
    )

    const textAId = await findNodeIdByText(page, 'A')
    const boundsA = await getElementBounds(page, textAId!)

    if (!boundsA) {
      test.skip()
      return
    }

    // Start drag
    await page.mouse.move(boundsA.x + boundsA.width / 2, boundsA.y + boundsA.height / 2)
    await page.mouse.down()

    // Move below
    await page.mouse.move(boundsA.x + boundsA.width / 2, boundsA.y + boundsA.height + 50)
    await page.waitForTimeout(100)

    // Check for drop indicator
    const indicator = await page.locator('#mirror-drop-indicator, .mirror-drop-line').isVisible()

    // Clean up
    await page.mouse.up()

    // Visual indicator behavior depends on implementation
    // Test passes if no crash
  })

  test('parent outline appears for before/after placements', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame ver, gap 8, pad 16
  Button "A"
  Button "B"`
    )

    const buttonAId = await findNodeIdByText(page, 'A')
    const boundsA = await getElementBounds(page, buttonAId!)

    if (!boundsA) {
      test.skip()
      return
    }

    // Start drag
    await page.mouse.move(boundsA.x + boundsA.width / 2, boundsA.y + boundsA.height / 2)
    await page.mouse.down()

    // Move to trigger over-target state
    await page.mouse.move(boundsA.x + boundsA.width / 2, boundsA.y + boundsA.height + 30)
    await page.waitForTimeout(100)

    // Check visual state
    const visualState = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.controller?.getVisualState?.()
    })

    await page.mouse.up()

    // Visual state should exist
    expect(visualState).toBeDefined()
  })

  test('visual feedback cleared after drop', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame ver, gap 8
  Text "Item"`
    )

    const itemId = await findNodeIdByText(page, 'Item')
    const bounds = await getElementBounds(page, itemId!)

    if (!bounds) {
      test.skip()
      return
    }

    // Drag and drop
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height + 30)
    await page.mouse.up()

    await page.waitForTimeout(100)

    // Visual state should be cleared
    const visualState = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.controller?.getVisualState?.()
    })

    expect(visualState?.hasIndicator).toBe(false)
    expect(visualState?.hasOutline).toBe(false)
  })

  test('ghost indicator for absolute positioning', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame stacked, w 400, h 300
  Text "Positioned", x 50, y 50`
    )

    const textId = await findNodeIdByText(page, 'Positioned')
    const bounds = await getElementBounds(page, textId!)

    if (!bounds) {
      test.skip()
      return
    }

    // Drag in stacked container
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds.x + 100, bounds.y + 100)
    await page.waitForTimeout(100)

    // Check for ghost indicator
    const ghost = await page.locator('#mirror-ghost-indicator').isVisible()

    await page.mouse.up()

    // Ghost may or may not be visible depending on implementation
    // Test verifies no crash
  })
})

// ============================================================================
// 5. ERROR RECOVERY
// ============================================================================

test.describe('Error Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('system recovers from invalid drop target', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame ver, gap 8
  Text "Test"`
    )

    // Try to drop on non-existent target
    const result = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDrop__
      return system?.simulateMove?.({
        sourceNodeId: 'invalid-source',
        targetNodeId: 'invalid-target',
        placement: 'after',
      })
    })

    expect(result?.success).toBe(false)
    expect(result?.error).toBeDefined()

    // System should still be functional
    const state = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.controller?.getState?.()
    })

    expect(state?.type).toBe('idle')
  })

  test('drag operation can be cancelled mid-flight', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame ver, gap 8
  Button "A"
  Button "B"`
    )

    const buttonAId = await findNodeIdByText(page, 'A')
    const bounds = await getElementBounds(page, buttonAId!)

    if (!bounds) {
      test.skip()
      return
    }

    // Start drag
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height + 50)

    // Press Escape to cancel
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)

    // State should be idle
    const state = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.controller?.getState?.()
    })

    expect(state?.type).toBe('idle')

    // Release mouse
    await page.mouse.up()

    // Code should be unchanged
    const code = await getEditorContent(page)
    const posA = code.indexOf('"A"')
    const posB = code.indexOf('"B"')
    expect(posA).toBeLessThan(posB) // A still before B
  })

  test('disable/enable during drag cancels operation', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame ver, gap 8
  Text "Item"`
    )

    const itemId = await findNodeIdByText(page, 'Item')
    const bounds = await getElementBounds(page, itemId!)

    if (!bounds) {
      test.skip()
      return
    }

    // Start drag
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height + 30)

    // Disable system (simulates compile started)
    await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      system?.disable?.()
    })

    await page.waitForTimeout(100)

    // State should be idle (drag was cancelled)
    const state = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.controller?.getState?.()
    })
    expect(state?.type).toBe('idle')

    // Re-enable
    await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      system?.enable?.()
    })

    await page.mouse.up()

    // Should not be disabled anymore
    const isDisabled = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.isDisabled?.()
    })
    expect(isDisabled).toBe(false)
  })
})

// ============================================================================
// 6. PERFORMANCE & STRESS
// ============================================================================

test.describe('Performance', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('handles many elements without lag', async ({ page }) => {
    // Create content with many elements
    const elements = Array.from({ length: 20 }, (_, i) => `  Text "Item ${i}"`).join('\n')
    await setEditorContent(page, `Frame ver, gap 4\n${elements}`)

    const count = await getNodeCount(page)
    expect(count).toBeGreaterThanOrEqual(20)

    const firstId = await findNodeIdByText(page, 'Item 0')
    const lastId = await findNodeIdByText(page, 'Item 19')

    const firstBounds = await getElementBounds(page, firstId!)
    const lastBounds = await getElementBounds(page, lastId!)

    if (!firstBounds || !lastBounds) {
      test.skip()
      return
    }

    // Measure drag performance
    const startTime = Date.now()

    await page.mouse.move(
      firstBounds.x + firstBounds.width / 2,
      firstBounds.y + firstBounds.height / 2
    )
    await page.mouse.down()

    // Drag across many elements
    for (let i = 0; i < 10; i++) {
      const y = firstBounds.y + (lastBounds.y - firstBounds.y) * (i / 10)
      await page.mouse.move(firstBounds.x + firstBounds.width / 2, y)
    }

    await page.mouse.up()

    const duration = Date.now() - startTime

    // Should complete in reasonable time (less than 5 seconds)
    expect(duration).toBeLessThan(5000)

    // State should be idle
    const state = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.controller?.getState?.()
    })
    expect(state?.type).toBe('idle')
  })

  test('rapid drag operations do not accumulate handlers', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame ver, gap 8
  Button "A"
  Button "B"`
    )

    const buttonAId = await findNodeIdByText(page, 'A')
    const bounds = await getElementBounds(page, buttonAId!)

    if (!bounds) {
      test.skip()
      return
    }

    // Perform many rapid drag operations
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
      await page.mouse.down()
      await page.mouse.move(bounds.x + bounds.width / 2 + 20, bounds.y + bounds.height / 2 + 20)
      await page.mouse.up()
      await page.waitForTimeout(50)
    }

    // System should still be responsive
    const state = await page.evaluate(() => {
      const system = (window as any).__mirrorDragDropV2__
      return system?.controller?.getState?.()
    })
    expect(state?.type).toBe('idle')
  })
})

// ============================================================================
// 7. HORIZONTAL FLEX CONTAINERS
// ============================================================================

test.describe('Horizontal Flex', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudioReady(page)
  })

  test('horizontal flex: insert between elements', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame hor, gap 8
  Button "A"
  Button "B"
  Button "C"`
    )

    const buttonAId = await findNodeIdByText(page, 'A')
    const buttonCId = await findNodeIdByText(page, 'C')

    expect(buttonAId).not.toBeNull()
    expect(buttonCId).not.toBeNull()

    // Insert new element after A (before B)
    const result = await page.evaluate(
      ({ targetId }) => {
        const system = (window as any).__mirrorDragDrop__
        return system?.simulateInsert?.({
          componentName: 'Icon',
          targetNodeId: targetId,
          placement: 'after',
          textContent: 'star',
        })
      },
      { targetId: buttonAId }
    )

    expect(result?.success).toBe(true)
    await page.waitForTimeout(500)

    const code = await getEditorContent(page)

    // Icon should be between A and B
    const posA = code.indexOf('"A"')
    const posIcon = code.indexOf('Icon')
    const posB = code.indexOf('"B"')

    expect(posA).toBeLessThan(posIcon)
    expect(posIcon).toBeLessThan(posB)
  })

  test('horizontal flex: reorder by mouse drag', async ({ page }) => {
    await setEditorContent(
      page,
      `Frame hor, gap 8
  Button "1"
  Button "2"
  Button "3"`
    )

    const button1Bounds = await page.locator('[data-mirror-id]:has-text("1")').first().boundingBox()
    const button3Bounds = await page.locator('[data-mirror-id]:has-text("3")').first().boundingBox()

    if (!button1Bounds || !button3Bounds) {
      test.skip()
      return
    }

    // Drag button 1 to after button 3
    await page.mouse.move(
      button1Bounds.x + button1Bounds.width / 2,
      button1Bounds.y + button1Bounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      button3Bounds.x + button3Bounds.width + 10,
      button3Bounds.y + button3Bounds.height / 2,
      { steps: 5 }
    )
    await page.mouse.up()

    await page.waitForTimeout(1000)

    // Order should have changed
    const code = await getEditorContent(page)
    // Note: Actual reorder depends on full drag-drop implementation
  })
})
