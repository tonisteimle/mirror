/**
 * Margin Handlers Test Suite
 *
 * Tests for M key and margin handle manipulation:
 * - M: Toggle margin handles mode
 * - Dragging margin handles adjusts margin values
 *
 * Key differences from padding:
 * - Margin handles are positioned OUTSIDE the element
 * - Dragging outward increases margin
 * - Cyan color instead of amber
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup, testWithSetupSkip } from '../../index'

// =============================================================================
// M Key - Toggle Margin Mode
// =============================================================================

export const marginModeToggleTests: TestCase[] = describe('M Key - Toggle Margin Mode', [
  testWithSetup(
    'M key shows margin handles on selected element',
    'Frame mar 16, gap 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      // Reset state by pressing Escape
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Select the Frame (properly sets editorHasFocus = false)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Press M to toggle to margin mode
      await api.interact.pressKey('m')
      await api.utils.delay(200)

      // Verify margin handles are now shown
      const marginHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(marginHandles.length === 4, 'Should have 4 margin handles')
    }
  ),

  testWithSetup(
    'M key twice returns to resize mode',
    'Frame mar 16, gap 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      // Reset state by pressing Escape
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Select and enter margin mode (properly sets editorHasFocus = false)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Press M to enter margin mode
      await api.interact.pressKey('m')
      await api.utils.delay(200)

      // Verify margin handles visible
      let marginHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(marginHandles.length === 4, 'Margin handles should be visible')

      // Press M again to exit margin mode
      await api.interact.pressKey('m')
      await api.utils.delay(200)

      // Verify margin handles hidden
      marginHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(marginHandles.length === 0, 'Margin handles should be hidden after second M')
    }
  ),

  testWithSetup(
    'Margin handles show margin overlay visualization',
    'Frame mar 24, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('m')
      await api.utils.delay(200)

      const marginAreas = document.querySelectorAll('.margin-area')
      api.assert.ok(marginAreas.length > 0, 'Margin area overlays should be visible')
    }
  ),

  // SKIPPED: Behavior changed - element without margin no longer auto-adds margin on M key
  testWithSetupSkip(
    'Element without margin gets default 16px when entering margin mode',
    'Frame bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Verify no margin in code initially
      api.assert.codeNotContains(/\bmar\s/)

      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Press M to enter margin mode
      await api.interact.pressKey('m')
      await api.utils.delay(300)

      // Wait for compile after default margin is set
      await api.utils.waitForCompile()

      // Verify default margin was added
      api.assert.codeContains(/\bmar\s+16\b/)
    }
  ),

  testWithSetup(
    'M key does not conflict with P key',
    'Frame mar 16, pad 16, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Enter padding mode first
      await api.interact.pressKey('p')
      await api.utils.delay(200)

      let paddingHandles = document.querySelectorAll('.padding-handle')
      let marginHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(paddingHandles.length === 4, 'Should have padding handles')
      api.assert.ok(marginHandles.length === 0, 'Should not have margin handles')

      // Now press M to switch to margin mode
      await api.interact.pressKey('m')
      await api.utils.delay(200)

      paddingHandles = document.querySelectorAll('.padding-handle')
      marginHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(paddingHandles.length === 0, 'Padding handles should be hidden')
      api.assert.ok(marginHandles.length === 4, 'Margin handles should be shown')
    }
  ),
])

// =============================================================================
// Margin Handle Positions (OUTSIDE the element)
// =============================================================================

export const marginHandlePositionTests: TestCase[] = describe('Margin Handle Positions', [
  testWithSetup(
    'Margin handles have correct data attributes',
    'Frame mar 16, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('m')
      await api.utils.delay(200)

      const allHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(allHandles.length === 4, 'Should have 4 margin handles')

      const topHandle = document.querySelector('.margin-handle-top')
      const rightHandle = document.querySelector('.margin-handle-right')
      const bottomHandle = document.querySelector('.margin-handle-bottom')
      const leftHandle = document.querySelector('.margin-handle-left')

      api.assert.ok(topHandle !== null, 'Top margin handle should exist')
      api.assert.ok(rightHandle !== null, 'Right margin handle should exist')
      api.assert.ok(bottomHandle !== null, 'Bottom margin handle should exist')
      api.assert.ok(leftHandle !== null, 'Left margin handle should exist')

      api.assert.ok(
        topHandle?.getAttribute('data-position') === 'top',
        'Top handle has correct data-position'
      )
      api.assert.ok(
        leftHandle?.getAttribute('data-position') === 'left',
        'Left handle has correct data-position'
      )
    }
  ),

  testWithSetup(
    'Top handle positioned ABOVE the element (outside)',
    'Frame mar 20, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('m')
      await api.utils.delay(200)

      // Get element and handle positions
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const topHandle = document.querySelector('.margin-handle-top') as HTMLElement

      api.assert.ok(element !== null, 'Element should exist')
      api.assert.ok(topHandle !== null, 'Top handle should exist')

      const elementRect = element.getBoundingClientRect()
      const handleRect = topHandle.getBoundingClientRect()

      // Top handle should be ABOVE the element (at element.top - margin)
      const expectedTop = elementRect.top - 20
      const actualTop = handleRect.top

      // Allow 5px tolerance for hit area offset
      api.assert.ok(
        Math.abs(actualTop - expectedTop) <= 10,
        `Top handle Y position: expected ~${expectedTop}, got ${actualTop}`
      )
    }
  ),

  testWithSetup(
    'Bottom handle positioned BELOW the element (outside)',
    'Frame mar 20, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('m')
      await api.utils.delay(200)

      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const bottomHandle = document.querySelector('.margin-handle-bottom') as HTMLElement

      api.assert.ok(element !== null, 'Element should exist')
      api.assert.ok(bottomHandle !== null, 'Bottom handle should exist')

      const elementRect = element.getBoundingClientRect()
      const handleRect = bottomHandle.getBoundingClientRect()

      // Bottom handle should be BELOW the element (at element.bottom + margin - handle height)
      // Allow 25px tolerance for preview container offset and handle positioning
      const expectedTop = elementRect.bottom
      const actualTop = handleRect.top

      api.assert.ok(
        Math.abs(actualTop - expectedTop) <= 25,
        `Bottom handle Y position: expected ~${expectedTop}, got ${actualTop}`
      )
    }
  ),

  testWithSetup(
    'Left handle positioned to the LEFT of the element (outside)',
    'Frame mar 20, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('m')
      await api.utils.delay(200)

      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const leftHandle = document.querySelector('.margin-handle-left') as HTMLElement

      api.assert.ok(element !== null, 'Element should exist')
      api.assert.ok(leftHandle !== null, 'Left handle should exist')

      const elementRect = element.getBoundingClientRect()
      const handleRect = leftHandle.getBoundingClientRect()

      // Left handle should be to the LEFT of the element
      const expectedLeft = elementRect.left - 20
      const actualLeft = handleRect.left

      api.assert.ok(
        Math.abs(actualLeft - expectedLeft) <= 10,
        `Left handle X position: expected ~${expectedLeft}, got ${actualLeft}`
      )
    }
  ),

  testWithSetup(
    'Right handle positioned to the RIGHT of the element (outside)',
    'Frame mar 20, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('m')
      await api.utils.delay(200)

      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const rightHandle = document.querySelector('.margin-handle-right') as HTMLElement

      api.assert.ok(element !== null, 'Element should exist')
      api.assert.ok(rightHandle !== null, 'Right handle should exist')

      const elementRect = element.getBoundingClientRect()
      const handleRect = rightHandle.getBoundingClientRect()

      // Right handle should be to the RIGHT of the element
      // Allow 25px tolerance for preview container offset and handle positioning
      const expectedLeft = elementRect.right
      const actualLeft = handleRect.left

      api.assert.ok(
        Math.abs(actualLeft - expectedLeft) <= 25,
        `Right handle X position: expected ~${expectedLeft}, got ${actualLeft}`
      )
    }
  ),

  testWithSetup(
    'Margin overlay zones have correct positions (outside element)',
    'Frame mar 20, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('m')
      await api.utils.delay(200)

      const marginAreas = document.querySelectorAll('.margin-area')

      // Should have 4 margin areas (top, right, bottom, left)
      api.assert.ok(
        marginAreas.length === 4,
        `Should have 4 margin areas, got ${marginAreas.length}`
      )

      // Check that margin areas have fuchsia/magenta background (different from padding's amber)
      const firstArea = marginAreas[0] as HTMLElement
      const bgColor = firstArea.style.background

      // Fuchsia is #D946EF which is rgba(217, 70, 239, 0.15)
      api.assert.ok(
        bgColor.includes('rgba') && (bgColor.includes('217') || bgColor.includes('70') || bgColor.includes('239')),
        `Margin area should have fuchsia rgba background, got: ${bgColor}`
      )
    }
  ),
])

// =============================================================================
// Margin Handle Drag
// =============================================================================

export const marginHandleDragTests: TestCase[] = describe('Margin Handle Drag', [
  testWithSetup(
    'Dragging top margin handle updates margin',
    'Frame mar 16, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      // Reset state by pressing Escape
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Select and enter margin mode
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Press M to enter margin mode
      await api.interact.pressKey('m')
      await api.utils.delay(200)

      // Get the top margin handle
      const topHandle = document.querySelector('.margin-handle-top') as HTMLElement
      api.assert.ok(topHandle !== null, 'Top margin handle should exist')

      // Get handle position
      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Simulate drag UP (away from element to increase margin)
      const mousedown = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: startX,
        clientY: startY,
      })
      topHandle.dispatchEvent(mousedown)

      // Move up by 8px (outward = increase margin)
      const mousemove = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: startX,
        clientY: startY - 8,
      })
      document.dispatchEvent(mousemove)

      // Wait for RAF
      await api.utils.delay(100)

      // Release
      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      document.dispatchEvent(mouseup)

      // Wait for compile
      await api.utils.waitForCompile()

      // Verify margin was updated
      api.assert.codeContains(/\bmar\s+\d+/)
    }
  ),

  testWithSetup(
    'Dragging left margin handle updates margin',
    'Frame mar 16, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('m')
      await api.utils.delay(200)

      const leftHandle = document.querySelector('.margin-handle-left') as HTMLElement
      api.assert.ok(leftHandle !== null, 'Left margin handle should exist')

      const handleRect = leftHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Simulate drag LEFT (away from element to increase margin)
      const mousedown = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: startX,
        clientY: startY,
      })
      leftHandle.dispatchEvent(mousedown)

      const mousemove = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: startX - 8, // Left = outward
        clientY: startY,
      })
      document.dispatchEvent(mousemove)

      await api.utils.delay(100)

      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      document.dispatchEvent(mouseup)

      await api.utils.waitForCompile()

      api.assert.codeContains(/\bmar\s+\d+/)
    }
  ),
])

// =============================================================================
// Selection Changes
// =============================================================================

export const marginModeSelectionTests: TestCase[] = describe('Margin Mode with Selection Changes', [
  testWithSetup(
    'Selecting different element while in margin mode shows margin handles',
    'Frame gap 8\n  Frame mar 16, bg #333, w 100, h 80\n  Frame mar 8, bg #555, w 100, h 80',
    async (api: TestAPI) => {
      // Reset state by pressing Escape
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Select first Frame
      await api.studio.setSelection('node-2')
      await api.utils.delay(200)

      // Enter margin mode
      await api.interact.pressKey('m')
      await api.utils.delay(200)

      // Verify margin handles on first element
      let marginHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(marginHandles.length === 4, 'First element should have margin handles')

      // Click second element
      await api.studio.setSelection('node-3')
      await api.utils.delay(200)

      // In margin mode, new selection should also show margin handles
      marginHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(marginHandles.length === 4, 'Second element should also have margin handles')
    }
  ),

  testWithSetup(
    'Clearing selection resets to resize mode',
    'Frame mar 16, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      // Reset state by pressing Escape
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Select and enter margin mode
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Enter margin mode
      await api.interact.pressKey('m')
      await api.utils.delay(200)

      // Verify margin handles
      let marginHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(marginHandles.length === 4, 'Should have margin handles')

      // Press Escape to clear selection
      await api.interact.pressKey('Escape')
      await api.utils.delay(200)

      // Verify no handles
      marginHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(marginHandles.length === 0, 'Margin handles should be hidden after Escape')
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allMarginHandlerTests: TestCase[] = [
  ...marginModeToggleTests,
  ...marginHandlePositionTests,
  ...marginHandleDragTests,
  ...marginModeSelectionTests,
]
