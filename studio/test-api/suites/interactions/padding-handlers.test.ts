/**
 * Padding Handlers Test Suite
 *
 * Tests for P key and padding handle manipulation:
 * - P: Toggle padding handles mode
 * - Dragging padding handles adjusts padding values
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// Helper Functions
// =============================================================================

function getComputedPadding(nodeId: string): string {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) return '0px'
  return window.getComputedStyle(element).padding
}

// =============================================================================
// P Key - Toggle Padding Mode
// =============================================================================

export const paddingModeToggleTests: TestCase[] = describe('P Key - Toggle Padding Mode', [
  testWithSetup(
    'P key shows padding handles on selected element',
    'Frame pad 16, gap 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the Frame using studio API (properly sets editorHasFocus = false)
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Press P to toggle to padding mode
      await api.interact.pressKey('p')
      await api.utils.delay(200)

      // Verify padding handles are now shown
      const paddingHandles = document.querySelectorAll('.padding-handle')
      api.assert.ok(paddingHandles.length === 4, 'Should have 4 padding handles')
    }
  ),

  testWithSetup(
    'P key twice returns to resize mode',
    'Frame pad 16, gap 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Clear selection first to reset handleMode to 'resize'
      // This ensures P key enters padding mode (not toggles back)
      api.studio.clearSelection()
      await api.utils.delay(100)

      // Select element using studio API (properly sets editorHasFocus = false)
      await api.studio.setSelection('node-1')
      await api.utils.delay(300) // Extra delay for headless mode

      // Press P to enter padding mode
      await api.interact.pressKey('p')
      await api.utils.delay(200)

      // Verify padding handles visible
      let paddingHandles = document.querySelectorAll('.padding-handle')
      api.assert.ok(paddingHandles.length === 4, 'Padding handles should be visible')

      // Press P again to exit padding mode
      await api.interact.pressKey('p')
      await api.utils.delay(200)

      // Verify padding handles hidden
      paddingHandles = document.querySelectorAll('.padding-handle')
      api.assert.ok(paddingHandles.length === 0, 'Padding handles should be hidden after second P')
    }
  ),

  testWithSetup(
    'P key switches directly from margin mode to padding mode',
    'Frame pad 16, mar 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Reset state
      api.studio.clearSelection()
      await api.utils.delay(100)

      // Select element
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Press M to enter margin mode
      await api.interact.pressKey('m')
      await api.utils.delay(200)

      // Verify margin handles are visible
      const marginHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(
        marginHandles.length === 4,
        `Should have 4 margin handles, got ${marginHandles.length}`
      )

      // Now press P - should switch DIRECTLY to padding mode (not back to resize)
      await api.interact.pressKey('p')
      await api.utils.delay(200)

      // Verify padding handles are now visible
      const paddingHandles = document.querySelectorAll('.padding-handle')
      api.assert.ok(
        paddingHandles.length === 4,
        `P key from margin mode should switch to padding mode. Expected 4 padding handles, got ${paddingHandles.length}`
      )

      // Verify margin handles are hidden
      const marginHandlesAfter = document.querySelectorAll('.margin-handle')
      api.assert.ok(
        marginHandlesAfter.length === 0,
        `Margin handles should be hidden after switching to padding mode, got ${marginHandlesAfter.length}`
      )
    }
  ),

  testWithSetup(
    'M key switches directly from padding mode to margin mode',
    'Frame pad 16, mar 8, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Reset state
      api.studio.clearSelection()
      await api.utils.delay(100)

      // Select element
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Press P to enter padding mode
      await api.interact.pressKey('p')
      await api.utils.delay(200)

      // Verify padding handles are visible
      const paddingHandles = document.querySelectorAll('.padding-handle')
      api.assert.ok(
        paddingHandles.length === 4,
        `Should have 4 padding handles, got ${paddingHandles.length}`
      )

      // Now press M - should switch DIRECTLY to margin mode (not back to resize)
      await api.interact.pressKey('m')
      await api.utils.delay(200)

      // Verify margin handles are now visible
      const marginHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(
        marginHandles.length === 4,
        `M key from padding mode should switch to margin mode. Expected 4 margin handles, got ${marginHandles.length}`
      )

      // Verify padding handles are hidden
      const paddingHandlesAfter = document.querySelectorAll('.padding-handle')
      api.assert.ok(
        paddingHandlesAfter.length === 0,
        `Padding handles should be hidden after switching to margin mode, got ${paddingHandlesAfter.length}`
      )
    }
  ),

  testWithSetup(
    'Padding handles show padding overlay visualization',
    'Frame pad 24, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      const paddingAreas = document.querySelectorAll('.padding-area')
      api.assert.ok(paddingAreas.length > 0, 'Padding area overlays should be visible')
    }
  ),
])

// =============================================================================
// Padding Handle Positions
// =============================================================================

export const paddingHandlePositionTests: TestCase[] = describe('Padding Handle Positions', [
  testWithSetup(
    'Padding handles have correct data attributes',
    'Frame pad 16, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      const allHandles = document.querySelectorAll('.padding-handle')
      api.assert.ok(allHandles.length === 4, 'Should have 4 padding handles')

      const topHandle = document.querySelector('.padding-handle-top')
      const rightHandle = document.querySelector('.padding-handle-right')
      const bottomHandle = document.querySelector('.padding-handle-bottom')
      const leftHandle = document.querySelector('.padding-handle-left')

      api.assert.ok(topHandle !== null, 'Top padding handle should exist')
      api.assert.ok(rightHandle !== null, 'Right padding handle should exist')
      api.assert.ok(bottomHandle !== null, 'Bottom padding handle should exist')
      api.assert.ok(leftHandle !== null, 'Left padding handle should exist')

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
    'Top handle positioned at content top edge',
    'Frame pad 20, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      // Get element and handle positions
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const topHandle = document.querySelector('.padding-handle-top') as HTMLElement

      api.assert.ok(element !== null, 'Element should exist')
      api.assert.ok(topHandle !== null, 'Top handle should exist')

      const elementRect = element.getBoundingClientRect()
      const handleRect = topHandle.getBoundingClientRect()

      // Top handle should be at element.top + padding (20px)
      const expectedTop = elementRect.top + 20
      const actualTop = handleRect.top

      // Allow 5px tolerance for hit area offset
      api.assert.ok(
        Math.abs(actualTop - expectedTop) <= 5,
        `Top handle Y position: expected ~${expectedTop}, got ${actualTop}`
      )

      // Handle width should match content width (200 - 20 - 20 = 160)
      const expectedWidth = 160
      const actualWidth = handleRect.width

      api.assert.ok(
        Math.abs(actualWidth - expectedWidth) <= 5,
        `Top handle width: expected ~${expectedWidth}, got ${actualWidth}`
      )
    }
  ),

  testWithSetup(
    'Bottom handle positioned at content bottom edge',
    'Frame pad 20, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const bottomHandle = document.querySelector('.padding-handle-bottom') as HTMLElement

      api.assert.ok(element !== null, 'Element should exist')
      api.assert.ok(bottomHandle !== null, 'Bottom handle should exist')

      const elementRect = element.getBoundingClientRect()
      const handleRect = bottomHandle.getBoundingClientRect()

      // Bottom handle should be at element.bottom - padding (150 - 20 = 130 from top)
      const expectedTop = elementRect.top + 150 - 20
      const actualTop = handleRect.top

      api.assert.ok(
        Math.abs(actualTop - expectedTop) <= 5,
        `Bottom handle Y position: expected ~${expectedTop}, got ${actualTop}`
      )
    }
  ),

  testWithSetup(
    'Left handle positioned at content left edge',
    'Frame pad 20, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const leftHandle = document.querySelector('.padding-handle-left') as HTMLElement

      api.assert.ok(element !== null, 'Element should exist')
      api.assert.ok(leftHandle !== null, 'Left handle should exist')

      const elementRect = element.getBoundingClientRect()
      const handleRect = leftHandle.getBoundingClientRect()

      // Left handle should be at element.left + padding (20px)
      const expectedLeft = elementRect.left + 20
      const actualLeft = handleRect.left

      api.assert.ok(
        Math.abs(actualLeft - expectedLeft) <= 5,
        `Left handle X position: expected ~${expectedLeft}, got ${actualLeft}`
      )

      // Handle height should match content height (150 - 20 - 20 = 110)
      const expectedHeight = 110
      const actualHeight = handleRect.height

      api.assert.ok(
        Math.abs(actualHeight - expectedHeight) <= 5,
        `Left handle height: expected ~${expectedHeight}, got ${actualHeight}`
      )
    }
  ),

  testWithSetup(
    'Right handle positioned at content right edge',
    'Frame pad 20, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const rightHandle = document.querySelector('.padding-handle-right') as HTMLElement

      api.assert.ok(element !== null, 'Element should exist')
      api.assert.ok(rightHandle !== null, 'Right handle should exist')

      const elementRect = element.getBoundingClientRect()
      const handleRect = rightHandle.getBoundingClientRect()

      // Right handle should be at element.right - padding (200 - 20 = 180 from left)
      const expectedLeft = elementRect.left + 200 - 20
      const actualLeft = handleRect.left

      api.assert.ok(
        Math.abs(actualLeft - expectedLeft) <= 5,
        `Right handle X position: expected ~${expectedLeft}, got ${actualLeft}`
      )
    }
  ),

  testWithSetup(
    'Padding overlay zones have correct positions',
    'Frame pad 20, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('p')
      await api.utils.delay(200)

      const paddingAreas = document.querySelectorAll('.padding-area')

      // Should have 4 padding areas (top, right, bottom, left)
      api.assert.ok(
        paddingAreas.length === 4,
        `Should have 4 padding areas, got ${paddingAreas.length}`
      )

      // Check that padding areas have amber-ish background with ~40% opacity
      const firstArea = paddingAreas[0] as HTMLElement
      const bgColor = firstArea.style.background

      api.assert.ok(
        bgColor.includes('rgba') && bgColor.includes('245'),
        `Padding area should have amber rgba background, got: ${bgColor}`
      )
    }
  ),
])

// =============================================================================
// Padding Handle Drag
// =============================================================================

export const paddingHandleDragTests: TestCase[] = describe('Padding Handle Drag', [
  testWithSetup(
    'Dragging top padding handle updates padding',
    'Frame pad 16, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      // Reset state by pressing Escape
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Verify initial padding value
      api.assert.codeContains('pad 16')
      const initialCSS = getComputedPadding('node-1')
      api.assert.ok(initialCSS === '16px', `Initial CSS padding should be 16px, got ${initialCSS}`)

      // Enter padding mode
      await api.interact.click('node-1')
      await api.utils.delay(200)
      await api.interact.pressKey('p')
      await api.utils.delay(200)

      // Verify padding handles exist
      const topHandle = document.querySelector('.padding-handle-top') as HTMLElement
      api.assert.ok(topHandle !== null, 'Top padding handle should exist')

      // Get handle position for drag
      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Simulate drag down (increases top padding)
      topHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX, clientY: startY + 10 })
      )
      await api.utils.delay(100)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      // Wait for code update
      await api.utils.waitForCompile()

      // Verify code was updated - pad-t should be added with value > 16
      const code = api.editor.getCode()
      const padTMatch = code.match(/\bpad-t\s+(\d+)/)
      const padMatch = code.match(/\bpad\s+(\d+)/)
      const newPadding = padTMatch
        ? parseInt(padTMatch[1], 10)
        : padMatch
          ? parseInt(padMatch[1], 10)
          : null

      api.assert.ok(
        newPadding !== null && newPadding > 16,
        `Padding should have increased from 16, got ${newPadding}`
      )
    }
  ),

  testWithSetup(
    'Dragging bottom padding handle decreases padding',
    'Frame pad 30, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Verify initial padding value - code and CSS
      api.assert.codeContains('pad 30')
      const initialCSS = getComputedPadding('node-1')
      api.assert.ok(initialCSS === '30px', `Initial CSS padding should be 30px, got ${initialCSS}`)

      // Use the helper to enter padding mode (click + press P)
      await api.interact.enterPaddingMode('node-1')
      await api.utils.delay(100)

      // Verify padding handles exist
      const handles = document.querySelectorAll('.padding-handle')
      api.assert.ok(handles.length === 4, `Should have 4 padding handles, got ${handles.length}`)

      // Use the dragPaddingHandle helper to perform the drag
      // Negative delta on bottom moves handle DOWN (towards element edge, away from content)
      // which expands content area and decreases bottom padding
      const result = await api.interact.dragPaddingHandle('bottom', -10)

      await api.utils.waitForCompile()

      // Verify the drag operation worked
      api.assert.ok(
        result.after.bottom < result.before.bottom,
        `Bottom padding should have decreased. Before: ${result.before.bottom}, After: ${result.after.bottom}`
      )

      // Verify code was updated
      const code = api.editor.getCode()

      // Check for pad-b (specific side property) or updated pad value
      const padBMatch = code.match(/\bpad-b\s+(\d+)/)
      const padMatch = code.match(/\bpad\s+(\d+)/)

      if (padBMatch) {
        const newPadding = parseInt(padBMatch[1], 10)
        api.assert.ok(newPadding < 30, `pad-b should have decreased from 30, got ${newPadding}`)
      } else if (padMatch) {
        const newPadding = parseInt(padMatch[1], 10)
        api.assert.ok(newPadding < 30, `Padding should have decreased from 30, got ${newPadding}`)
      } else {
        api.assert.ok(false, 'Code should contain pad or pad-b value')
      }

      // Verify CSS computed style - paddingBottom should be < 30
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const paddingBottom = parseInt(window.getComputedStyle(element).paddingBottom, 10)
      api.assert.ok(paddingBottom < 30, `CSS paddingBottom should be < 30, got ${paddingBottom}`)
    }
  ),
])

// =============================================================================
// Selection Changes
// =============================================================================

export const paddingModeSelectionTests: TestCase[] = describe(
  'Padding Mode with Selection Changes',
  [
    testWithSetup(
      'Selecting different element while in padding mode shows padding handles',
      'Frame gap 8\n  Frame pad 16, bg #333, w 100, h 80\n  Frame pad 8, bg #555, w 100, h 80',
      async (api: TestAPI) => {
        // Reset state by pressing Escape
        await api.utils.waitForCompile()
        await api.interact.pressKey('Escape')
        await api.utils.delay(100)

        // Select first Frame
        await api.interact.click('node-2')
        await api.utils.delay(200)

        // Enter padding mode
        await api.interact.pressKey('p')
        await api.utils.delay(200)

        // Verify padding handles on first element
        let paddingHandles = document.querySelectorAll('.padding-handle')
        api.assert.ok(paddingHandles.length === 4, 'First element should have padding handles')

        // Click second element
        await api.interact.click('node-3')
        await api.utils.delay(200)

        // In padding mode, new selection should also show padding handles
        paddingHandles = document.querySelectorAll('.padding-handle')
        api.assert.ok(
          paddingHandles.length === 4,
          'Second element should also have padding handles'
        )
      }
    ),

    testWithSetup(
      'Clearing selection resets to resize mode',
      'Frame pad 16, bg #1a1a1a\n  Text "Content"',
      async (api: TestAPI) => {
        // Reset state by pressing Escape
        await api.utils.waitForCompile()
        await api.interact.pressKey('Escape')
        await api.utils.delay(100)

        // Select and enter padding mode
        await api.interact.click('node-1')
        await api.utils.delay(200)

        // Enter padding mode
        await api.interact.pressKey('p')
        await api.utils.delay(200)

        // Verify padding handles
        let paddingHandles = document.querySelectorAll('.padding-handle')
        api.assert.ok(paddingHandles.length === 4, 'Should have padding handles')

        // Press Escape to clear selection
        await api.interact.pressKey('Escape')
        await api.utils.delay(200)

        // Verify no handles
        paddingHandles = document.querySelectorAll('.padding-handle')
        api.assert.ok(paddingHandles.length === 0, 'Padding handles should be hidden after Escape')
      }
    ),
  ]
)

// =============================================================================
// Export All
// =============================================================================

export const allPaddingHandlerTests: TestCase[] = [
  ...paddingModeToggleTests,
  ...paddingHandlePositionTests,
  ...paddingHandleDragTests,
  ...paddingModeSelectionTests,
]
