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
    'Drag handle on element with no initial padding',
    'Frame w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Enter padding mode on element with no padding defined
      await api.interact.enterPaddingMode('node-1')

      // Should still have handles (padding defaults to 0)
      const handles = api.interact.getPaddingHandles()
      api.assert.ok(
        handles.length === 4,
        `Should have 4 handles even with no padding, got ${handles.length}`
      )

      // Drag to add padding from zero
      const result = await api.interact.dragPaddingHandle('top', 20)

      // Padding should now exist
      api.assert.ok(
        result.after.top > 0,
        `Top padding should be added: ${result.before.top} -> ${result.after.top}`
      )
      api.assert.ok(
        result.before.top === 0,
        `Initial top padding should have been 0, was ${result.before.top}`
      )
    }
  ),

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
    'Shift+drag from zero padding adds uniform padding',
    'Frame w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')

      // Verify we start with 0 padding
      const zones = api.interact.getPaddingZones()
      const topZone = zones.find(z => z.position === 'top')
      api.assert.ok(
        topZone !== undefined,
        `Padding top zone should exist, found zones: ${zones.map(z => z.position).join(', ')}`
      )
      api.assert.ok(
        topZone!.rect.height === 0,
        `Initial padding should be 0, got height: ${topZone!.rect.height}`
      )

      const result = await api.interact.dragPaddingHandle('top', 24, { shift: true })

      // All sides should have the same new value
      api.assert.ok(
        result.after.top === result.after.right &&
          result.after.top === result.after.bottom &&
          result.after.top === result.after.left,
        `All paddings should be equal: t=${result.after.top}, r=${result.after.right}, b=${result.after.bottom}, l=${result.after.left}`
      )

      // And should be > 0 now
      api.assert.ok(result.after.top > 0, `Padding should have been added: ${result.after.top}`)
    }
  ),

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
    'Handles persist after element DOM mutation',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')

      // Verify handles exist
      const handlesBefore = api.interact.getPaddingHandles()
      api.assert.ok(handlesBefore.length === 4, 'Should have 4 handles initially')

      // Add a class to trigger MutationObserver
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (element) {
        element.classList.add('test-mutation-class')
      }

      // Wait for observer to trigger refresh
      await new Promise(r => setTimeout(r, 100))

      // Handles should still exist and be properly positioned
      const handlesAfter = api.interact.getPaddingHandles()
      api.assert.ok(
        handlesAfter.length === 4,
        `Should still have 4 handles after DOM mutation, got ${handlesAfter.length}`
      )

      // Clean up
      if (element) {
        element.classList.remove('test-mutation-class')
      }
    }
  ),

  testWithSetup(
    'Handles update when code changes padding',
    'Frame pad 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterPaddingMode('node-1')

      // Get initial zones
      const zonesBefore = api.interact.getPaddingZones()
      api.assert.ok(zonesBefore.length === 4, 'Should have 4 padding zones initially')
      const topZoneBefore = zonesBefore.find(z => z.position === 'top')
      api.assert.ok(topZoneBefore, 'Should have top zone')

      // Change padding through code (which triggers proper recompile)
      await api.editor.setCode('Frame pad 32, w 200, h 200, bg #1a1a1a\n  Text "Content"')
      await api.utils.waitForCompile()

      // Re-enter padding mode after recompile
      await api.interact.enterPaddingMode('node-1')

      // Get zones after change
      const zonesAfter = api.interact.getPaddingZones()
      const topZoneAfter = zonesAfter.find(z => z.position === 'top')
      api.assert.ok(topZoneAfter, 'Should have top zone after padding change')

      // Zone height should reflect new padding (32 instead of 16)
      api.assert.ok(
        topZoneAfter!.rect.height > topZoneBefore!.rect.height,
        `Top zone should be taller: was ${topZoneBefore!.rect.height}, now ${topZoneAfter!.rect.height}`
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
