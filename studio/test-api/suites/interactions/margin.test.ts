/**
 * Margin Handle Test Suite
 *
 * Tests for margin manipulation via drag handles:
 * - Single side adjustment (default)
 * - All sides uniform (Shift+drag)
 * - Axis adjustment (Alt+drag: horizontal or vertical)
 * - Live visual feedback during drag
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// Single Side Margin Tests
// =============================================================================

export const singleSideMarginTests: TestCase[] = describe('Single Side Margin', [
  testWithSetup(
    'Drag handle on element with no initial margin',
    'Frame w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Enter margin mode on element with no margin defined
      await api.interact.enterMarginMode('node-1')

      // Should still have handles (margin defaults to 0)
      const handles = api.interact.getMarginHandles()
      api.assert.ok(
        handles.length === 4,
        `Should have 4 handles even with no margin, got ${handles.length}`
      )

      // Drag to add margin from zero
      const result = await api.interact.dragMarginHandle('top', 20)

      // Margin should now exist
      api.assert.ok(
        result.after.top > 0,
        `Top margin should be added: ${result.before.top} -> ${result.after.top}`
      )
      api.assert.ok(
        result.before.top === 0,
        `Initial top margin should have been 0, was ${result.before.top}`
      )
    }
  ),

  testWithSetup(
    'Drag top handle adjusts only top margin',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Enter margin mode
      await api.interact.enterMarginMode('node-1')

      // Drag top handle up (increase margin)
      const result = await api.interact.dragMarginHandle('top', 20)

      // Only top should change
      api.assert.ok(
        result.after.top > result.before.top,
        `Top margin should increase: ${result.before.top} -> ${result.after.top}`
      )
      api.assert.ok(
        result.after.right === result.before.right,
        `Right margin should stay same: ${result.after.right}`
      )
      api.assert.ok(
        result.after.bottom === result.before.bottom,
        `Bottom margin should stay same: ${result.after.bottom}`
      )
      api.assert.ok(
        result.after.left === result.before.left,
        `Left margin should stay same: ${result.after.left}`
      )
    }
  ),

  testWithSetup(
    'Drag left handle adjusts only left margin',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')
      const result = await api.interact.dragMarginHandle('left', 15)

      api.assert.ok(
        result.after.left > result.before.left,
        `Left margin should increase: ${result.before.left} -> ${result.after.left}`
      )
      api.assert.ok(result.after.top === result.before.top, `Top margin should stay same`)
      api.assert.ok(result.after.right === result.before.right, `Right margin should stay same`)
      api.assert.ok(result.after.bottom === result.before.bottom, `Bottom margin should stay same`)
    }
  ),
])

// =============================================================================
// Shift+Drag (All Sides) Tests
// =============================================================================

export const allSidesMarginTests: TestCase[] = describe('All Sides Margin (Shift+drag)', [
  testWithSetup(
    'Shift+drag from zero margin adds uniform margin',
    'Frame w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')

      // Verify we start with 0 margin
      const zones = api.interact.getMarginZones()
      const topZone = zones.find(z => z.position === 'top')
      api.assert.ok(topZone?.rect.height === 0 || !topZone, 'Initial margin should be 0')

      const result = await api.interact.dragMarginHandle('top', 24, { shift: true })

      // All sides should have the same new value
      api.assert.ok(
        result.after.top === result.after.right &&
          result.after.top === result.after.bottom &&
          result.after.top === result.after.left,
        `All margins should be equal: t=${result.after.top}, r=${result.after.right}, b=${result.after.bottom}, l=${result.after.left}`
      )

      // And should be > 0 now
      api.assert.ok(result.after.top > 0, `Margin should have been added: ${result.after.top}`)
    }
  ),

  testWithSetup(
    'Shift+drag adjusts all sides uniformly',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')
      const result = await api.interact.dragMarginHandle('top', 20, { shift: true })

      // All sides should have the same new value
      api.assert.ok(
        result.after.top === result.after.right &&
          result.after.top === result.after.bottom &&
          result.after.top === result.after.left,
        `All margins should be equal: t=${result.after.top}, r=${result.after.right}, b=${result.after.bottom}, l=${result.after.left}`
      )

      // And should be different from before
      api.assert.ok(result.after.top !== result.before.top, `Margin should have changed`)
    }
  ),

  testWithSetup(
    'Shift+drag right handle also adjusts all sides',
    'Frame mar 12, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')
      const result = await api.interact.dragMarginHandle('right', 10, { shift: true })

      api.assert.ok(
        result.after.top === result.after.right &&
          result.after.top === result.after.bottom &&
          result.after.top === result.after.left,
        `All margins should be equal after shift+drag right`
      )
    }
  ),
])

// =============================================================================
// Alt+Drag (Axis) Tests
// =============================================================================

export const axisMarginTests: TestCase[] = describe('Axis Margin (Alt+drag)', [
  testWithSetup(
    'Alt+drag top handle adjusts top AND bottom (vertical axis)',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')
      const result = await api.interact.dragMarginHandle('top', 20, { alt: true })

      // Top and bottom should be equal and changed
      api.assert.ok(
        result.after.top === result.after.bottom,
        `Top and bottom should be equal: t=${result.after.top}, b=${result.after.bottom}`
      )
      api.assert.ok(result.after.top !== result.before.top, `Vertical margin should have changed`)

      // Left and right should be unchanged
      api.assert.ok(result.after.left === result.before.left, `Left margin should stay same`)
      api.assert.ok(result.after.right === result.before.right, `Right margin should stay same`)
    }
  ),

  testWithSetup(
    'Alt+drag left handle adjusts left AND right (horizontal axis)',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')
      const result = await api.interact.dragMarginHandle('left', 15, { alt: true })

      // Left and right should be equal and changed
      api.assert.ok(
        result.after.left === result.after.right,
        `Left and right should be equal: l=${result.after.left}, r=${result.after.right}`
      )
      api.assert.ok(
        result.after.left !== result.before.left,
        `Horizontal margin should have changed`
      )

      // Top and bottom should be unchanged
      api.assert.ok(result.after.top === result.before.top, `Top margin should stay same`)
      api.assert.ok(result.after.bottom === result.before.bottom, `Bottom margin should stay same`)
    }
  ),
])

// =============================================================================
// Live Visual Feedback Tests
// =============================================================================

export const liveVisualFeedbackTests: TestCase[] = describe('Live Visual Feedback (Margin)', [
  testWithSetup(
    'Margin zones update during drag',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')
      const result = await api.interact.dragMarginHandle('top', 30)

      api.assert.ok(result.zonesUpdated, 'Margin zones should update during drag')
    }
  ),

  testWithSetup(
    'Element margin changes during drag (live preview)',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')
      const result = await api.interact.dragMarginHandle('top', 25)

      // During drag, the margin should already be changed
      api.assert.ok(
        result.during.top !== result.before.top,
        `Margin should change during drag: before=${result.before.top}, during=${result.during.top}`
      )
    }
  ),

  testWithSetup(
    'Margin handles visible in margin mode',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')

      const handles = api.interact.getMarginHandles()
      api.assert.ok(handles.length === 4, `Should have 4 margin handles, got ${handles.length}`)

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
    'Margin zones visible in margin mode',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')

      const zones = api.interact.getMarginZones()
      api.assert.ok(zones.length === 4, `Should have 4 margin zones, got ${zones.length}`)

      const visibleZones = zones.filter(z => z.visible)
      api.assert.ok(visibleZones.length === 4, `All 4 margin zones should be visible`)
    }
  ),
])

// =============================================================================
// Robustness Tests (Scroll, Resize, Layout Changes)
// =============================================================================

export const robustnessTests: TestCase[] = describe('Margin Mode Robustness', [
  testWithSetup(
    'Handles reposition after window resize',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')

      // Get initial handle positions
      const handlesBefore = api.interact.getMarginHandles()
      const topHandleBefore = handlesBefore.find(h => h.position === 'top')
      api.assert.ok(topHandleBefore, 'Should have top handle before resize')

      // Simulate window resize by dispatching resize event
      window.dispatchEvent(new Event('resize'))

      // Wait for debounced refresh
      await new Promise(r => setTimeout(r, 100))

      // Get handle positions after resize
      const handlesAfter = api.interact.getMarginHandles()
      api.assert.ok(
        handlesAfter.length === 4,
        `Should still have 4 handles after resize, got ${handlesAfter.length}`
      )
    }
  ),

  testWithSetup(
    'Handles persist after element DOM mutation',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')

      // Verify handles exist
      const handlesBefore = api.interact.getMarginHandles()
      api.assert.ok(handlesBefore.length === 4, 'Should have 4 handles initially')

      // Add a class to trigger MutationObserver
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      if (element) {
        element.classList.add('test-mutation-class')
      }

      // Wait for observer to trigger refresh
      await new Promise(r => setTimeout(r, 100))

      // Handles should still exist and be properly positioned
      const handlesAfter = api.interact.getMarginHandles()
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
    'Handles update when code changes margin',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')

      // Get initial zones
      const zonesBefore = api.interact.getMarginZones()
      api.assert.ok(zonesBefore.length === 4, 'Should have 4 margin zones initially')
      const topZoneBefore = zonesBefore.find(z => z.position === 'top')
      api.assert.ok(topZoneBefore, 'Should have top zone')

      // Change margin through code (which triggers proper recompile)
      await api.editor.setCode('Frame mar 32, w 200, h 200, bg #1a1a1a\n  Text "Content"')
      await api.utils.waitForCompile()

      // Re-enter margin mode after recompile
      await api.interact.enterMarginMode('node-1')

      // Get zones after change
      const zonesAfter = api.interact.getMarginZones()
      const topZoneAfter = zonesAfter.find(z => z.position === 'top')
      api.assert.ok(topZoneAfter, 'Should have top zone after margin change')

      // Zone height should reflect new margin (32 instead of 16)
      api.assert.ok(
        topZoneAfter!.rect.height > topZoneBefore!.rect.height,
        `Top zone should be taller: was ${topZoneBefore!.rect.height}, now ${topZoneAfter!.rect.height}`
      )
    }
  ),

  testWithSetup(
    'Handles stay attached during rapid layout changes',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.enterMarginMode('node-1')

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
      const handles = api.interact.getMarginHandles()
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
// Screenshot Debug Test
// =============================================================================

export const marginScreenshotTests: TestCase[] = describe('Margin Screenshot Debug', [
  testWithSetup(
    'Screenshot margin mode with existing margin',
    'Frame mar 24, w 200, h 150, bg #1a1a1a\n  Text "Content", col white',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the element
      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Enter margin mode
      await api.interact.pressKey('m')
      await api.utils.delay(200)

      // Take screenshot
      const screenshot = await api.inspect.screenshot()
      console.log('Screenshot taken, length:', screenshot.length)

      // Check handles exist
      const handles = api.interact.getMarginHandles()
      console.log('Margin handles found:', handles.length)
      handles.forEach((h, i) => {
        console.log(`  Handle ${i}: position=${h.position}, rect=`, h.rect)
      })

      // Check zones exist
      const zones = api.interact.getMarginZones()
      console.log('Margin zones found:', zones.length)
      zones.forEach((z, i) => {
        console.log(`  Zone ${i}: position=${z.position}, visible=${z.visible}, rect=`, z.rect)
      })

      api.assert.ok(handles.length === 4, `Expected 4 handles, got ${handles.length}`)
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allMarginTests: TestCase[] = [
  ...singleSideMarginTests,
  ...allSidesMarginTests,
  ...axisMarginTests,
  ...liveVisualFeedbackTests,
  ...robustnessTests,
  ...marginScreenshotTests,
]
