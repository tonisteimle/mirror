/**
 * Padding Handle Test Suite
 *
 * Tests for padding manipulation via drag handles:
 * - Single side adjustment (default)
 * - All sides uniform (Shift+drag)
 * - Axis adjustment (Alt+drag: horizontal or vertical)
 * - Live visual feedback during drag
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// Single Side Padding Tests
// =============================================================================

export const singleSidePaddingTests: TestCase[] = describe('Single Side Padding', [
  testWithSetup(
    'Drag top handle adjusts only top padding',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Enter padding mode
      await api.interact.enterPaddingMode('node-1')

      // Drag top handle down (increase padding)
      const result = await api.interact.dragPaddingHandle('top', 20)

      // Only top should change
      api.assert.ok(
        result.after.top > result.before.top,
        `Top padding should increase: ${result.before.top} -> ${result.after.top}`
      )
      api.assert.ok(
        result.after.right === result.before.right,
        `Right padding should stay same: ${result.after.right}`
      )
      api.assert.ok(
        result.after.bottom === result.before.bottom,
        `Bottom padding should stay same: ${result.after.bottom}`
      )
      api.assert.ok(
        result.after.left === result.before.left,
        `Left padding should stay same: ${result.after.left}`
      )
    }
  ),

  testWithSetup(
    'Drag left handle adjusts only left padding',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')
      const result = await api.interact.dragPaddingHandle('left', 15)

      api.assert.ok(
        result.after.left > result.before.left,
        `Left padding should increase: ${result.before.left} -> ${result.after.left}`
      )
      api.assert.ok(result.after.top === result.before.top, `Top padding should stay same`)
      api.assert.ok(result.after.right === result.before.right, `Right padding should stay same`)
      api.assert.ok(result.after.bottom === result.before.bottom, `Bottom padding should stay same`)
    }
  ),
])

// =============================================================================
// Shift+Drag (All Sides) Tests
// =============================================================================

export const allSidesPaddingTests: TestCase[] = describe('All Sides Padding (Shift+drag)', [
  testWithSetup(
    'Shift+drag adjusts all sides uniformly',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')
      const result = await api.interact.dragPaddingHandle('top', 20, { shift: true })

      // All sides should have the same new value
      api.assert.ok(
        result.after.top === result.after.right &&
          result.after.top === result.after.bottom &&
          result.after.top === result.after.left,
        `All paddings should be equal: t=${result.after.top}, r=${result.after.right}, b=${result.after.bottom}, l=${result.after.left}`
      )

      // And should be different from before
      api.assert.ok(result.after.top !== result.before.top, `Padding should have changed`)
    }
  ),

  testWithSetup(
    'Shift+drag right handle also adjusts all sides',
    'Frame pad 12, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')
      const result = await api.interact.dragPaddingHandle('right', 10, { shift: true })

      api.assert.ok(
        result.after.top === result.after.right &&
          result.after.top === result.after.bottom &&
          result.after.top === result.after.left,
        `All paddings should be equal after shift+drag right`
      )
    }
  ),
])

// =============================================================================
// Alt+Drag (Axis) Tests
// =============================================================================

export const axisPaddingTests: TestCase[] = describe('Axis Padding (Alt+drag)', [
  testWithSetup(
    'Alt+drag top handle adjusts top AND bottom (vertical axis)',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')
      const result = await api.interact.dragPaddingHandle('top', 20, { alt: true })

      // Top and bottom should be equal and changed
      api.assert.ok(
        result.after.top === result.after.bottom,
        `Top and bottom should be equal: t=${result.after.top}, b=${result.after.bottom}`
      )
      api.assert.ok(result.after.top !== result.before.top, `Vertical padding should have changed`)

      // Left and right should be unchanged
      api.assert.ok(result.after.left === result.before.left, `Left padding should stay same`)
      api.assert.ok(result.after.right === result.before.right, `Right padding should stay same`)
    }
  ),

  testWithSetup(
    'Alt+drag left handle adjusts left AND right (horizontal axis)',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')
      const result = await api.interact.dragPaddingHandle('left', 15, { alt: true })

      // Left and right should be equal and changed
      api.assert.ok(
        result.after.left === result.after.right,
        `Left and right should be equal: l=${result.after.left}, r=${result.after.right}`
      )
      api.assert.ok(
        result.after.left !== result.before.left,
        `Horizontal padding should have changed`
      )

      // Top and bottom should be unchanged
      api.assert.ok(result.after.top === result.before.top, `Top padding should stay same`)
      api.assert.ok(result.after.bottom === result.before.bottom, `Bottom padding should stay same`)
    }
  ),
])

// =============================================================================
// Live Visual Feedback Tests
// =============================================================================

export const liveVisualFeedbackTests: TestCase[] = describe('Live Visual Feedback', [
  testWithSetup(
    'Padding zones update during drag',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')
      const result = await api.interact.dragPaddingHandle('top', 30)

      api.assert.ok(result.zonesUpdated, 'Padding zones should update during drag')
    }
  ),

  testWithSetup(
    'Element padding changes during drag (live preview)',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')
      const result = await api.interact.dragPaddingHandle('top', 25)

      // During drag, the padding should already be changed
      api.assert.ok(
        result.during.top !== result.before.top,
        `Padding should change during drag: before=${result.before.top}, during=${result.during.top}`
      )
    }
  ),

  testWithSetup(
    'Padding handles visible in padding mode',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')

      const handles = api.interact.getPaddingHandles()
      api.assert.ok(handles.length === 4, `Should have 4 padding handles, got ${handles.length}`)

      const positions = handles.map(h => h.position).sort()
      api.assert.ok(
        positions.includes('top') &&
          positions.includes('right') &&
          positions.includes('bottom') &&
          positions.includes('left'),
        `Should have handles for all 4 sides: ${positions.join(', ')}`
      )
    }
  ),

  testWithSetup(
    'Padding zones visible in padding mode',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')

      const zones = api.interact.getPaddingZones()
      api.assert.ok(zones.length === 4, `Should have 4 padding zones, got ${zones.length}`)

      const visibleZones = zones.filter(z => z.visible)
      api.assert.ok(visibleZones.length === 4, `All 4 padding zones should be visible`)
    }
  ),
])

// =============================================================================
// Robustness Tests (Scroll, Resize, Layout Changes)
// =============================================================================

export const robustnessTests: TestCase[] = describe('Padding Mode Robustness', [
  testWithSetup(
    'Handles reposition after window resize',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')

      // Get initial handle positions
      const handlesBefore = api.interact.getPaddingHandles()
      const topHandleBefore = handlesBefore.find(h => h.position === 'top')
      api.assert.ok(topHandleBefore, 'Should have top handle before resize')

      // Simulate window resize by dispatching resize event
      window.dispatchEvent(new Event('resize'))

      // Wait for debounced refresh
      await new Promise(r => setTimeout(r, 100))

      // Get handle positions after resize
      const handlesAfter = api.interact.getPaddingHandles()
      api.assert.ok(
        handlesAfter.length === 4,
        `Should still have 4 handles after resize, got ${handlesAfter.length}`
      )
    }
  ),

  testWithSetup(
    'Handles follow element when sibling changes size',
    'Frame hor, gap 8, w 400, h 200, bg #333\n  Frame w 100, h 100, bg #555\n  Frame pad 16, w 150, h 150, bg #1a1a1a\n    Text "Target"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Enter padding mode on the second frame (node-3)
      await api.interact.enterPaddingMode('node-3')

      // Get initial handle positions
      const handlesBefore = api.interact.getPaddingHandles()
      const leftHandleBefore = handlesBefore.find(h => h.position === 'left')
      api.assert.ok(leftHandleBefore, 'Should have left handle')
      const initialLeft = leftHandleBefore!.rect.left

      // Change the sibling's width (node-2) - this should shift node-3
      const sibling = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      if (sibling) {
        sibling.style.width = '200px' // Increase from 100px to 200px
      }

      // Wait for MutationObserver/ResizeObserver to trigger refresh
      await new Promise(r => setTimeout(r, 150))

      // Get handle positions after sibling change
      const handlesAfter = api.interact.getPaddingHandles()
      const leftHandleAfter = handlesAfter.find(h => h.position === 'left')
      api.assert.ok(leftHandleAfter, 'Should still have left handle after sibling change')

      // Handle should have moved (sibling got bigger, so target shifted right)
      const newLeft = leftHandleAfter!.rect.left
      api.assert.ok(
        Math.abs(newLeft - initialLeft) > 50,
        `Handle should have moved: was ${initialLeft}, now ${newLeft}`
      )
    }
  ),

  testWithSetup(
    'Handles update when element padding changes externally',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')

      // Get initial zones
      const zonesBefore = api.interact.getPaddingZones()
      const topZoneBefore = zonesBefore.find(z => z.position === 'top')
      api.assert.ok(topZoneBefore, 'Should have top zone')
      const initialHeight = topZoneBefore!.rect.height

      // Change padding externally (simulating code edit)
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (element) {
        element.style.paddingTop = '40px'
      }

      // Wait for observers to detect change
      await new Promise(r => setTimeout(r, 150))

      // Zones should have updated
      const zonesAfter = api.interact.getPaddingZones()
      const topZoneAfter = zonesAfter.find(z => z.position === 'top')
      api.assert.ok(topZoneAfter, 'Should still have top zone')

      // Zone height should reflect new padding
      api.assert.ok(
        topZoneAfter!.rect.height > initialHeight,
        `Top zone should be taller: was ${initialHeight}, now ${topZoneAfter!.rect.height}`
      )
    }
  ),

  testWithSetup(
    'Handles stay attached during rapid layout changes',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')

      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element, 'Element should exist')

      // Simulate rapid style changes
      for (let i = 0; i < 5; i++) {
        element.style.width = `${200 + i * 20}px`
        await new Promise(r => setTimeout(r, 30))
      }

      // Wait for final debounced refresh
      await new Promise(r => setTimeout(r, 100))

      // Handles should still exist and be properly positioned
      const handles = api.interact.getPaddingHandles()
      api.assert.ok(
        handles.length === 4,
        `Should still have 4 handles after rapid changes, got ${handles.length}`
      )

      // Verify handles are attached to correct element
      const anyHandle = handles[0]
      api.assert.ok(
        anyHandle.nodeId === 'node-1',
        `Handles should be for node-1, got ${anyHandle.nodeId}`
      )
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allPaddingTests: TestCase[] = [
  ...singleSidePaddingTests,
  ...allSidesPaddingTests,
  ...axisPaddingTests,
  ...liveVisualFeedbackTests,
  ...robustnessTests,
]
