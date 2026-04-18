/**
 * Gap Handlers Test Suite
 *
 * Tests for G key and gap handle manipulation:
 * - G: Toggle gap handles mode
 * - Dragging gap handles adjusts gap values between children
 *
 * Key differences from padding/margin:
 * - Gap handles appear BETWEEN child elements (not at element boundaries)
 * - Only shows when container has 2+ children
 * - Direction-aware: horizontal layout = vertical handles, vertical layout = horizontal handles
 * - Teal color (#06B6D4)
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// G Key - Toggle Gap Mode
// =============================================================================

export const gapModeToggleTests: TestCase[] = describe('G Key - Toggle Gap Mode', [
  testWithSetup(
    'G key shows gap handles on container with 2+ children',
    'Frame gap 16, hor, bg #1a1a1a\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the Frame using studio API
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Press G to toggle to gap mode
      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Verify gap handles are now shown (should have n-1 handles for n children)
      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length === 2,
        `Should have 2 gap handles for 3 children, got ${gapHandles.length}`
      )
    }
  ),

  testWithSetup(
    'G key twice returns to resize mode',
    'Frame gap 16, hor, bg #1a1a1a\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Clear selection first to reset handleMode to 'resize'
      api.studio.clearSelection()
      await api.utils.delay(100)

      // Select element using studio API
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Press G to enter gap mode
      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Verify gap handles visible
      let gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length === 1,
        `Gap handles should be visible, got ${gapHandles.length}`
      )

      // Press G again to exit gap mode
      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Verify gap handles hidden
      gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(gapHandles.length === 0, 'Gap handles should be hidden after second G')
    }
  ),

  testWithSetup(
    'G key does not show handles on container with only 1 child',
    'Frame gap 16, bg #1a1a1a\n  Button "A"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Press G to try to enter gap mode
      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Verify NO gap handles (only 1 child = no gaps)
      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(gapHandles.length === 0, 'Should have no gap handles with only 1 child')
    }
  ),

  testWithSetup(
    'G key does not show handles on non-container element',
    'Frame gap 16, bg #1a1a1a\n  Text "Hello"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the Text element (not a container)
      await api.studio.setSelection('node-2')
      await api.utils.delay(200)

      // Press G to try to enter gap mode
      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Verify NO gap handles (Text is not a flex container)
      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(gapHandles.length === 0, 'Should have no gap handles on non-container element')
    }
  ),

  testWithSetup(
    'Gap handles show gap overlay visualization',
    'Frame gap 24, hor, bg #1a1a1a\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapAreas = document.querySelectorAll('.gap-area')
      api.assert.ok(gapAreas.length > 0, 'Gap area overlays should be visible')
    }
  ),
])

// =============================================================================
// Mode Switching Tests
// =============================================================================

export const gapModeSwitchingTests: TestCase[] = describe('Gap Mode Switching', [
  testWithSetup(
    'G key switches directly from padding mode to gap mode',
    'Frame gap 16, pad 16, hor, bg #1a1a1a\n  Button "A"\n  Button "B"',
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

      // Now press G - should switch DIRECTLY to gap mode
      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Verify gap handles are now visible
      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length >= 1,
        `G key from padding mode should switch to gap mode. Expected 1+ gap handles, got ${gapHandles.length}`
      )

      // Verify padding handles are hidden
      const paddingHandlesAfter = document.querySelectorAll('.padding-handle')
      api.assert.ok(
        paddingHandlesAfter.length === 0,
        `Padding handles should be hidden after switching to gap mode, got ${paddingHandlesAfter.length}`
      )
    }
  ),

  testWithSetup(
    'G key switches directly from margin mode to gap mode',
    'Frame gap 16, mar 16, hor, bg #1a1a1a\n  Button "A"\n  Button "B"',
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

      // Now press G - should switch DIRECTLY to gap mode
      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Verify gap handles are now visible
      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length >= 1,
        `G key from margin mode should switch to gap mode. Expected 1+ gap handles, got ${gapHandles.length}`
      )

      // Verify margin handles are hidden
      const marginHandlesAfter = document.querySelectorAll('.margin-handle')
      api.assert.ok(
        marginHandlesAfter.length === 0,
        `Margin handles should be hidden after switching to gap mode, got ${marginHandlesAfter.length}`
      )
    }
  ),

  testWithSetup(
    'P key switches directly from gap mode to padding mode',
    'Frame gap 16, pad 16, hor, bg #1a1a1a\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Reset state
      api.studio.clearSelection()
      await api.utils.delay(100)

      // Select element
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Press G to enter gap mode
      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Verify gap handles are visible
      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(gapHandles.length >= 1, `Should have 1+ gap handles, got ${gapHandles.length}`)

      // Now press P - should switch to padding mode
      await api.interact.pressKey('p')
      await api.utils.delay(200)

      // Verify padding handles are now visible
      const paddingHandles = document.querySelectorAll('.padding-handle')
      api.assert.ok(
        paddingHandles.length === 4,
        `P key from gap mode should switch to padding mode. Expected 4 padding handles, got ${paddingHandles.length}`
      )

      // Verify gap handles are hidden
      const gapHandlesAfter = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandlesAfter.length === 0,
        `Gap handles should be hidden after switching to padding mode, got ${gapHandlesAfter.length}`
      )
    }
  ),

  testWithSetup(
    'M key switches directly from gap mode to margin mode',
    'Frame gap 16, mar 16, hor, bg #1a1a1a\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Reset state
      api.studio.clearSelection()
      await api.utils.delay(100)

      // Select element
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Press G to enter gap mode
      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Verify gap handles are visible
      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(gapHandles.length >= 1, `Should have 1+ gap handles, got ${gapHandles.length}`)

      // Now press M - should switch to margin mode
      await api.interact.pressKey('m')
      await api.utils.delay(200)

      // Verify margin handles are now visible
      const marginHandles = document.querySelectorAll('.margin-handle')
      api.assert.ok(
        marginHandles.length === 4,
        `M key from gap mode should switch to margin mode. Expected 4 margin handles, got ${marginHandles.length}`
      )

      // Verify gap handles are hidden
      const gapHandlesAfter = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandlesAfter.length === 0,
        `Gap handles should be hidden after switching to margin mode, got ${gapHandlesAfter.length}`
      )
    }
  ),
])

// =============================================================================
// Gap Handle Direction Tests
// =============================================================================

export const gapHandleDirectionTests: TestCase[] = describe('Gap Handle Direction', [
  testWithSetup(
    'Horizontal layout shows vertical gap handles',
    'Frame gap 16, hor, bg #1a1a1a, w 400\n  Frame w 80, h 60, bg #333\n  Frame w 80, h 60, bg #333\n  Frame w 80, h 60, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(gapHandles.length === 2, `Should have 2 gap handles, got ${gapHandles.length}`)

      // Check direction attribute
      const firstHandle = gapHandles[0] as HTMLElement
      api.assert.ok(
        firstHandle.dataset.direction === 'horizontal',
        `Handle should have direction="horizontal" for hor layout, got: ${firstHandle.dataset.direction}`
      )

      // Verify handle has ew-resize cursor (for horizontal direction)
      const cursor = firstHandle.style.cursor
      api.assert.ok(cursor === 'ew-resize', `Handle should have ew-resize cursor, got: ${cursor}`)
    }
  ),

  testWithSetup(
    'Vertical layout shows horizontal gap handles',
    'Frame gap 16, bg #1a1a1a, w 200\n  Frame w 150, h 40, bg #333\n  Frame w 150, h 40, bg #333\n  Frame w 150, h 40, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(gapHandles.length === 2, `Should have 2 gap handles, got ${gapHandles.length}`)

      // Check direction attribute
      const firstHandle = gapHandles[0] as HTMLElement
      api.assert.ok(
        firstHandle.dataset.direction === 'vertical',
        `Handle should have direction="vertical" for ver layout, got: ${firstHandle.dataset.direction}`
      )

      // Verify handle has ns-resize cursor (for vertical direction)
      const cursor = firstHandle.style.cursor
      api.assert.ok(cursor === 'ns-resize', `Handle should have ns-resize cursor, got: ${cursor}`)
    }
  ),
])

// =============================================================================
// Gap Handle Count Tests
// =============================================================================

export const gapHandleCountTests: TestCase[] = describe('Gap Handle Count', [
  testWithSetup(
    '2 children = 1 gap handle',
    'Frame gap 16, hor, bg #1a1a1a\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      // Reset state first
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length === 1,
        `2 children should have 1 gap handle, got ${gapHandles.length}`
      )
    }
  ),

  testWithSetup(
    '3 children = 2 gap handles',
    'Frame gap 16, hor, bg #1a1a1a\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      // Reset state first
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length === 2,
        `3 children should have 2 gap handles, got ${gapHandles.length}`
      )
    }
  ),

  testWithSetup(
    '5 children = 4 gap handles',
    'Frame gap 8, hor, bg #1a1a1a\n  Text "1"\n  Text "2"\n  Text "3"\n  Text "4"\n  Text "5"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      // Reset state first
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length === 4,
        `5 children should have 4 gap handles, got ${gapHandles.length}`
      )
    }
  ),

  testWithSetup(
    'Empty container = no gap handles',
    'Frame gap 16, hor, bg #1a1a1a, w 200, h 100',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      // Reset state first
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length === 0,
        `Empty container should have no gap handles, got ${gapHandles.length}`
      )
    }
  ),
])

// =============================================================================
// Gap Handle Position Tests
// =============================================================================

export const gapHandlePositionTests: TestCase[] = describe('Gap Handle Positions', [
  testWithSetup(
    'Gap handles have correct data attributes',
    'Frame gap 16, hor, bg #1a1a1a, w 300\n  Frame w 80, h 60, bg #333\n  Frame w 80, h 60, bg #555\n  Frame w 80, h 60, bg #777',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const allHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(allHandles.length === 2, `Should have 2 gap handles, got ${allHandles.length}`)

      // Check first handle (index 0)
      const firstHandle = allHandles[0] as HTMLElement
      api.assert.ok(
        firstHandle.dataset.gapIndex === '0',
        `First handle should have gapIndex 0, got ${firstHandle.dataset.gapIndex}`
      )
      api.assert.ok(firstHandle.dataset.nodeId === 'node-1', `Handle should have correct nodeId`)

      // Check second handle (index 1)
      const secondHandle = allHandles[1] as HTMLElement
      api.assert.ok(
        secondHandle.dataset.gapIndex === '1',
        `Second handle should have gapIndex 1, got ${secondHandle.dataset.gapIndex}`
      )
    }
  ),

  testWithSetup(
    'Horizontal layout: gap handle positioned between children',
    'Frame gap 20, hor, bg #1a1a1a, w 300\n  Frame w 80, h 60, bg #333\n  Frame w 80, h 60, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const child1 = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const child2 = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement
      const gapHandle = document.querySelector('.gap-handle') as HTMLElement

      api.assert.ok(child1 !== null, 'First child should exist')
      api.assert.ok(child2 !== null, 'Second child should exist')
      api.assert.ok(gapHandle !== null, 'Gap handle should exist')

      const child1Rect = child1.getBoundingClientRect()
      const child2Rect = child2.getBoundingClientRect()
      const handleRect = gapHandle.getBoundingClientRect()

      // Gap handle should be between child1.right and child2.left
      const gapMidpoint = (child1Rect.right + child2Rect.left) / 2
      const handleMidpoint = handleRect.left + handleRect.width / 2

      api.assert.ok(
        Math.abs(handleMidpoint - gapMidpoint) <= 10,
        `Handle should be centered in gap. Expected ~${gapMidpoint}, got ${handleMidpoint}`
      )
    }
  ),

  testWithSetup(
    'Vertical layout: gap handle positioned between children',
    'Frame gap 20, bg #1a1a1a, w 200\n  Frame w 150, h 40, bg #333\n  Frame w 150, h 40, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const child1 = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const child2 = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement
      const gapHandle = document.querySelector('.gap-handle') as HTMLElement

      api.assert.ok(child1 !== null, 'First child should exist')
      api.assert.ok(child2 !== null, 'Second child should exist')
      api.assert.ok(gapHandle !== null, 'Gap handle should exist')

      const child1Rect = child1.getBoundingClientRect()
      const child2Rect = child2.getBoundingClientRect()
      const handleRect = gapHandle.getBoundingClientRect()

      // Gap handle should be between child1.bottom and child2.top
      const gapMidpoint = (child1Rect.bottom + child2Rect.top) / 2
      const handleMidpoint = handleRect.top + handleRect.height / 2

      api.assert.ok(
        Math.abs(handleMidpoint - gapMidpoint) <= 10,
        `Handle should be centered in gap. Expected ~${gapMidpoint}, got ${handleMidpoint}`
      )
    }
  ),

  testWithSetup(
    'Gap overlay zones have correct positions',
    'Frame gap 20, hor, bg #1a1a1a, w 300\n  Frame w 80, h 60, bg #333\n  Frame w 80, h 60, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapAreas = document.querySelectorAll('.gap-area')

      // Should have 1 gap area for 2 children
      api.assert.ok(gapAreas.length === 1, `Should have 1 gap area, got ${gapAreas.length}`)

      // Check that gap area has teal-ish background
      const firstArea = gapAreas[0] as HTMLElement
      const bgColor = firstArea.style.background

      // Teal is #06B6D4 which is rgb(6, 182, 212)
      api.assert.ok(
        bgColor.includes('rgba') && (bgColor.includes('6') || bgColor.includes('182')),
        `Gap area should have teal rgba background, got: ${bgColor}`
      )
    }
  ),
])

// =============================================================================
// Gap Handle Drag Tests
// =============================================================================

export const gapHandleDragTests: TestCase[] = describe('Gap Handle Drag', [
  testWithSetup(
    'Dragging gap handle increases gap value (horizontal)',
    'Frame gap 16, hor, bg #1a1a1a, w 300\n  Frame w 80, h 60, bg #333\n  Frame w 80, h 60, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Verify initial code has gap 16
      api.assert.codeContains('gap 16')

      // Select and enter gap mode
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Get the gap handle
      const gapHandle = document.querySelector('.gap-handle') as HTMLElement
      api.assert.ok(gapHandle !== null, 'Gap handle should exist')

      // Get handle position
      const handleRect = gapHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Simulate drag right (increase gap for horizontal layout)
      const mousedown = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: startX,
        clientY: startY,
      })
      gapHandle.dispatchEvent(mousedown)

      // Move right by 10px (gap should increase from 16 to ~26)
      const mousemove = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: startX + 10,
        clientY: startY,
      })
      document.dispatchEvent(mousemove)

      // Wait for RAF
      await api.utils.delay(100)

      // Release
      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      document.dispatchEvent(mouseup)

      // Wait for compile
      await api.utils.waitForCompile()

      // Verify gap was increased - should be 26 (16 + 10)
      const code = api.editor.getCode()
      const gapMatch = code.match(/\bgap\s+(\d+)/)
      api.assert.ok(gapMatch !== null, 'Code should contain gap value')
      const newGap = parseInt(gapMatch![1], 10)
      api.assert.ok(newGap > 16, `Gap should have increased from 16, got ${newGap}`)
      api.assert.ok(
        newGap >= 24 && newGap <= 28,
        `Gap should be around 26 (16 + 10), got ${newGap}`
      )
    }
  ),

  testWithSetup(
    'Dragging gap handle increases gap value (vertical)',
    'Frame gap 16, bg #1a1a1a, w 200\n  Frame w 150, h 40, bg #333\n  Frame w 150, h 40, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Verify initial code has gap 16
      api.assert.codeContains('gap 16')

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapHandle = document.querySelector('.gap-handle') as HTMLElement
      api.assert.ok(gapHandle !== null, 'Gap handle should exist')

      const handleRect = gapHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Simulate drag down (increase gap for vertical layout)
      const mousedown = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: startX,
        clientY: startY,
      })
      gapHandle.dispatchEvent(mousedown)

      // Move down by 10px (gap should increase from 16 to ~26)
      const mousemove = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: startX,
        clientY: startY + 10,
      })
      document.dispatchEvent(mousemove)

      await api.utils.delay(100)

      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      document.dispatchEvent(mouseup)

      await api.utils.waitForCompile()

      // Verify gap was increased
      const code = api.editor.getCode()
      const gapMatch = code.match(/\bgap\s+(\d+)/)
      api.assert.ok(gapMatch !== null, 'Code should contain gap value')
      const newGap = parseInt(gapMatch![1], 10)
      api.assert.ok(newGap > 16, `Gap should have increased from 16, got ${newGap}`)
      api.assert.ok(
        newGap >= 24 && newGap <= 28,
        `Gap should be around 26 (16 + 10), got ${newGap}`
      )
    }
  ),

  testWithSetup(
    'Dragging gap handle decreases gap value',
    'Frame gap 30, hor, bg #1a1a1a, w 400\n  Frame w 80, h 60, bg #333\n  Frame w 80, h 60, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Verify initial code has gap 30
      api.assert.codeContains('gap 30')

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapHandle = document.querySelector('.gap-handle') as HTMLElement
      api.assert.ok(gapHandle !== null, 'Gap handle should exist')

      const handleRect = gapHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag left by 15px (decrease gap from 30 to ~15)
      const mousedown = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: startX,
        clientY: startY,
      })
      gapHandle.dispatchEvent(mousedown)

      const mousemove = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: startX - 15,
        clientY: startY,
      })
      document.dispatchEvent(mousemove)

      await api.utils.delay(100)

      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      document.dispatchEvent(mouseup)

      await api.utils.waitForCompile()

      // Verify gap was decreased
      const code = api.editor.getCode()
      const gapMatch = code.match(/\bgap\s+(\d+)/)
      api.assert.ok(gapMatch !== null, 'Code should contain gap value')
      const newGap = parseInt(gapMatch![1], 10)
      api.assert.ok(newGap < 30, `Gap should have decreased from 30, got ${newGap}`)
      api.assert.ok(
        newGap >= 13 && newGap <= 17,
        `Gap should be around 15 (30 - 15), got ${newGap}`
      )
    }
  ),

  testWithSetup(
    'Gap cannot be dragged below 0',
    'Frame gap 8, hor, bg #1a1a1a, w 300\n  Frame w 80, h 60, bg #333\n  Frame w 80, h 60, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Verify initial code has gap 8
      api.assert.codeContains('gap 8')

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapHandle = document.querySelector('.gap-handle') as HTMLElement
      api.assert.ok(gapHandle !== null, 'Gap handle should exist')

      const handleRect = gapHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Try to drag left far (decrease gap to below 0)
      const mousedown = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: startX,
        clientY: startY,
      })
      gapHandle.dispatchEvent(mousedown)

      // Move left by -50px (should result in gap 0, not negative)
      const mousemove = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: startX - 50,
        clientY: startY,
      })
      document.dispatchEvent(mousemove)

      await api.utils.delay(100)

      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      document.dispatchEvent(mouseup)

      await api.utils.waitForCompile()

      // Gap should be exactly 0
      const code = api.editor.getCode()
      const gapMatch = code.match(/\bgap\s+(\d+)/)
      api.assert.ok(gapMatch !== null, 'Code should contain gap value')
      const newGap = parseInt(gapMatch![1], 10)
      api.assert.ok(newGap === 0, `Gap should be 0 after dragging far left, got ${newGap}`)
    }
  ),

  testWithSetup(
    'Gap value persists in code after multiple drags',
    'Frame gap 20, hor, bg #1a1a1a, w 400\n  Frame w 80, h 60, bg #333\n  Frame w 80, h 60, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Verify initial
      api.assert.codeContains('gap 20')

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapHandle = document.querySelector('.gap-handle') as HTMLElement
      api.assert.ok(gapHandle !== null, 'Gap handle should exist')

      // First drag: increase by 10
      let handleRect = gapHandle.getBoundingClientRect()
      let startX = handleRect.left + handleRect.width / 2
      let startY = handleRect.top + handleRect.height / 2

      gapHandle.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          clientX: startX,
          clientY: startY,
        })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: startX + 10,
          clientY: startY,
        })
      )
      await api.utils.delay(100)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      await api.utils.waitForCompile()

      // Check first result (should be ~30)
      let code = api.editor.getCode()
      let gapMatch = code.match(/\bgap\s+(\d+)/)
      const gap1 = parseInt(gapMatch![1], 10)
      api.assert.ok(gap1 >= 28 && gap1 <= 32, `After first drag, gap should be ~30, got ${gap1}`)

      // Second drag: decrease by 5
      // Need to get fresh handle position after first drag
      await api.utils.delay(100)
      const gapHandle2 = document.querySelector('.gap-handle') as HTMLElement
      handleRect = gapHandle2.getBoundingClientRect()
      startX = handleRect.left + handleRect.width / 2
      startY = handleRect.top + handleRect.height / 2

      gapHandle2.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          clientX: startX,
          clientY: startY,
        })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: startX - 5,
          clientY: startY,
        })
      )
      await api.utils.delay(100)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      await api.utils.waitForCompile()

      // Check second result (should be ~25)
      code = api.editor.getCode()
      gapMatch = code.match(/\bgap\s+(\d+)/)
      const gap2 = parseInt(gapMatch![1], 10)
      api.assert.ok(gap2 < gap1, `Gap should have decreased from ${gap1}, got ${gap2}`)
      api.assert.ok(gap2 >= 23 && gap2 <= 27, `After second drag, gap should be ~25, got ${gap2}`)
    }
  ),
])

// =============================================================================
// Selection Changes Tests
// =============================================================================

export const gapModeSelectionTests: TestCase[] = describe('Gap Mode with Selection Changes', [
  testWithSetup(
    'Selecting different container while in gap mode shows gap handles',
    'Frame gap 8\n  Frame gap 16, hor, bg #333, w 200\n    Button "A"\n    Button "B"\n  Frame gap 8, bg #555, w 200\n    Text "X"\n    Text "Y"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Select first inner Frame
      await api.interact.click('node-2')
      await api.utils.delay(200)

      // Enter gap mode
      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Verify gap handles on first element
      let gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length === 1,
        `First element should have 1 gap handle, got ${gapHandles.length}`
      )

      // Click second inner Frame
      await api.interact.click('node-5')
      await api.utils.delay(200)

      // In gap mode, new selection should also show gap handles
      gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length === 1,
        `Second element should also have 1 gap handle, got ${gapHandles.length}`
      )
    }
  ),

  testWithSetup(
    'Clearing selection hides gap handles',
    'Frame gap 16, hor, bg #1a1a1a\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Select and enter gap mode
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Verify gap handles
      let gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(gapHandles.length === 1, 'Should have gap handles')

      // Press Escape to clear selection
      await api.interact.pressKey('Escape')
      await api.utils.delay(200)

      // Verify no handles
      gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(gapHandles.length === 0, 'Gap handles should be hidden after Escape')
    }
  ),

  testWithSetup(
    'Selecting non-container element while in gap mode shows no handles',
    'Frame gap 16, hor, bg #1a1a1a\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Select container and enter gap mode
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Verify gap handles on container
      let gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(gapHandles.length === 1, 'Container should have gap handle')

      // Select a Button (not a flex container)
      await api.interact.click('node-2')
      await api.utils.delay(200)

      // Button doesn't have children, so no gap handles
      gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(gapHandles.length === 0, 'Button should have no gap handles')
    }
  ),
])

// =============================================================================
// Gap with Different Gap Values Tests
// =============================================================================

export const gapValueTests: TestCase[] = describe('Gap with Different Values', [
  testWithSetup(
    'Gap 0 still shows handles but with no visual gap',
    'Frame gap 0, hor, bg #1a1a1a\n  Frame w 80, h 60, bg #333\n  Frame w 80, h 60, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      // Fully reset state
      api.studio.clearSelection()
      await api.utils.delay(100)
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Verify code has gap 0
      api.assert.codeContains('gap 0')

      // Select and enter gap mode
      await api.interact.click('node-1')
      await api.utils.delay(300)

      await api.interact.pressKey('g')
      await api.utils.delay(300)

      // Check gap handles - should have 1 handle between the 2 children
      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length === 1,
        `Gap 0 should still show handle, got ${gapHandles.length}`
      )
    }
  ),

  testWithSetup(
    'Large gap value shows handles correctly',
    'Frame gap 100, hor, bg #1a1a1a, w 500\n  Frame w 80, h 60, bg #333\n  Frame w 80, h 60, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      // Reset state first
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length === 1,
        `Large gap should show handle, got ${gapHandles.length}`
      )

      // Gap overlay should exist
      const gapAreas = document.querySelectorAll('.gap-area')
      api.assert.ok(gapAreas.length === 1, 'Gap area overlay should be visible')
    }
  ),
])

// =============================================================================
// Nested Containers Tests
// =============================================================================

export const nestedContainerTests: TestCase[] = describe('Gap Handles with Nested Containers', [
  testWithSetup(
    'Parent container shows gap handles for direct children only',
    'Frame gap 16, bg #1a1a1a\n  Frame gap 8, hor, bg #333\n    Button "A"\n    Button "B"\n  Frame gap 8, bg #555\n    Text "X"\n    Text "Y"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      // Reset state first
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Select outer Frame
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Should have 1 gap handle (between the two inner Frames)
      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length === 1,
        `Outer Frame should show 1 gap handle for its 2 direct children, got ${gapHandles.length}`
      )
    }
  ),

  testWithSetup(
    'Inner container shows gap handles for its children',
    'Frame gap 16, bg #1a1a1a\n  Frame gap 8, hor, bg #333\n    Button "A"\n    Button "B"\n    Button "C"\n  Text "Footer"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      // Reset state first
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Select inner Frame (node-2)
      await api.interact.click('node-2')
      await api.utils.delay(200)

      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Should have 2 gap handles (3 children = 2 gaps)
      const gapHandles = document.querySelectorAll('.gap-handle')
      api.assert.ok(
        gapHandles.length === 2,
        `Inner Frame should show 2 gap handles for its 3 children, got ${gapHandles.length}`
      )
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allGapHandlerTests: TestCase[] = [
  ...gapModeToggleTests,
  ...gapModeSwitchingTests,
  ...gapHandleDirectionTests,
  ...gapHandleCountTests,
  ...gapHandlePositionTests,
  ...gapHandleDragTests,
  ...gapModeSelectionTests,
  ...gapValueTests,
  ...nestedContainerTests,
]
