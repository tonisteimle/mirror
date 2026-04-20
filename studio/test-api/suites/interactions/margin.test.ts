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
// Helper Functions
// =============================================================================

function getComputedMargin(nodeId: string): {
  top: number
  right: number
  bottom: number
  left: number
} {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) return { top: 0, right: 0, bottom: 0, left: 0 }
  const style = window.getComputedStyle(element)
  return {
    top: parseFloat(style.marginTop) || 0,
    right: parseFloat(style.marginRight) || 0,
    bottom: parseFloat(style.marginBottom) || 0,
    left: parseFloat(style.marginLeft) || 0,
  }
}

// =============================================================================
// Single Side Margin Tests
// =============================================================================

export const singleSideMarginTests: TestCase[] = describe('Single Side Margin', [
  testWithSetup(
    'Drag handle on element with no initial margin',
    'Frame w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Verify initial CSS has no margin
      const initialCSS = getComputedMargin('node-1')
      api.assert.ok(
        initialCSS.top === 0,
        `Initial CSS margin-top should be 0, got ${initialCSS.top}`
      )

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

      // Margin should now exist (API result)
      api.assert.ok(
        result.after.top > 0,
        `Top margin should be added: ${result.before.top} -> ${result.after.top}`
      )
      api.assert.ok(
        result.before.top === 0,
        `Initial top margin should have been 0, was ${result.before.top}`
      )

      // Verify CSS computed style actually changed
      const afterCSS = getComputedMargin('node-1')
      api.assert.ok(
        afterCSS.top > 0,
        `CSS margin-top should be > 0 after drag, got ${afterCSS.top}px`
      )

      // Verify code was updated
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('mar') || code.includes('mar-t'),
        `Code should contain margin property after drag, got: ${code}`
      )
    }
  ),

  testWithSetup(
    'Drag top handle adjusts only top margin',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Verify initial CSS margin
      const initialCSS = getComputedMargin('node-1')
      api.assert.ok(
        initialCSS.top === 16,
        `Initial CSS margin-top should be 16px, got ${initialCSS.top}px`
      )

      // Enter margin mode
      await api.interact.enterMarginMode('node-1')

      // Drag top handle up (increase margin)
      const result = await api.interact.dragMarginHandle('top', 20)

      // Only top should change (API result)
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

      // Verify CSS computed style - only top changed
      const afterCSS = getComputedMargin('node-1')
      api.assert.ok(
        afterCSS.top > initialCSS.top,
        `CSS margin-top should increase: ${initialCSS.top}px -> ${afterCSS.top}px`
      )
      api.assert.ok(
        afterCSS.right === initialCSS.right,
        `CSS margin-right should stay same: ${afterCSS.right}px`
      )
      api.assert.ok(
        afterCSS.bottom === initialCSS.bottom,
        `CSS margin-bottom should stay same: ${afterCSS.bottom}px`
      )
      api.assert.ok(
        afterCSS.left === initialCSS.left,
        `CSS margin-left should stay same: ${afterCSS.left}px`
      )

      // Verify code was updated with specific margin value
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('mar-t') || code.includes(`mar ${afterCSS.top}`),
        `Code should contain updated margin, got: ${code}`
      )
    }
  ),

  testWithSetup(
    'Drag left handle adjusts only left margin',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Verify initial CSS margin
      const initialCSS = getComputedMargin('node-1')
      api.assert.ok(
        initialCSS.left === 16,
        `Initial CSS margin-left should be 16px, got ${initialCSS.left}px`
      )

      await api.interact.enterMarginMode('node-1')
      const result = await api.interact.dragMarginHandle('left', 15)

      // API result checks
      api.assert.ok(
        result.after.left > result.before.left,
        `Left margin should increase: ${result.before.left} -> ${result.after.left}`
      )
      api.assert.ok(result.after.top === result.before.top, `Top margin should stay same`)
      api.assert.ok(result.after.right === result.before.right, `Right margin should stay same`)
      api.assert.ok(result.after.bottom === result.before.bottom, `Bottom margin should stay same`)

      // Verify CSS computed style - only left changed
      const afterCSS = getComputedMargin('node-1')
      api.assert.ok(
        afterCSS.left > initialCSS.left,
        `CSS margin-left should increase: ${initialCSS.left}px -> ${afterCSS.left}px`
      )
      api.assert.ok(
        afterCSS.top === initialCSS.top,
        `CSS margin-top should stay same: ${afterCSS.top}px`
      )
      api.assert.ok(
        afterCSS.right === initialCSS.right,
        `CSS margin-right should stay same: ${afterCSS.right}px`
      )

      // Verify code was updated
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('mar-l') || code.includes('mar '),
        `Code should contain margin property, got: ${code}`
      )
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

      // Verify initial CSS has no margin
      const initialCSS = getComputedMargin('node-1')
      api.assert.ok(initialCSS.top === 0, `Initial CSS margin should be 0, got ${initialCSS.top}`)

      await api.interact.enterMarginMode('node-1')

      // Verify we start with 0 margin
      const zones = api.interact.getMarginZones()
      const topZone = zones.find(z => z.position === 'top')
      api.assert.ok(
        topZone !== undefined,
        `Margin top zone should exist, found zones: ${zones.map(z => z.position).join(', ')}`
      )
      api.assert.ok(
        topZone!.rect.height === 0,
        `Initial margin should be 0, got height: ${topZone!.rect.height}`
      )

      const result = await api.interact.dragMarginHandle('top', 24, { shift: true })

      // All sides should have the same new value (API result)
      api.assert.ok(
        result.after.top === result.after.right &&
          result.after.top === result.after.bottom &&
          result.after.top === result.after.left,
        `All margins should be equal: t=${result.after.top}, r=${result.after.right}, b=${result.after.bottom}, l=${result.after.left}`
      )

      // And should be > 0 now
      api.assert.ok(result.after.top > 0, `Margin should have been added: ${result.after.top}`)

      // Verify CSS computed style - all sides should be equal and > 0
      const afterCSS = getComputedMargin('node-1')
      api.assert.ok(
        afterCSS.top > 0 &&
          afterCSS.top === afterCSS.right &&
          afterCSS.top === afterCSS.bottom &&
          afterCSS.top === afterCSS.left,
        `CSS margins should all be equal and > 0: t=${afterCSS.top}, r=${afterCSS.right}, b=${afterCSS.bottom}, l=${afterCSS.left}`
      )

      // Verify code contains margin
      const code = api.editor.getCode()
      api.assert.ok(code.includes('mar '), `Code should contain uniform margin, got: ${code}`)
    }
  ),

  testWithSetup(
    'Shift+drag adjusts all sides uniformly',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Verify initial CSS margin
      const initialCSS = getComputedMargin('node-1')
      api.assert.ok(initialCSS.top === 16, `Initial CSS margin should be 16px`)

      await api.interact.enterMarginMode('node-1')
      const result = await api.interact.dragMarginHandle('top', 20, { shift: true })

      // All sides should have the same new value (API result)
      api.assert.ok(
        result.after.top === result.after.right &&
          result.after.top === result.after.bottom &&
          result.after.top === result.after.left,
        `All margins should be equal: t=${result.after.top}, r=${result.after.right}, b=${result.after.bottom}, l=${result.after.left}`
      )

      // And should be different from before
      api.assert.ok(result.after.top !== result.before.top, `Margin should have changed`)

      // Verify CSS computed style - all sides should be equal
      const afterCSS = getComputedMargin('node-1')
      api.assert.ok(
        afterCSS.top === afterCSS.right &&
          afterCSS.top === afterCSS.bottom &&
          afterCSS.top === afterCSS.left,
        `CSS margins should all be equal: t=${afterCSS.top}, r=${afterCSS.right}, b=${afterCSS.bottom}, l=${afterCSS.left}`
      )
      api.assert.ok(
        afterCSS.top !== initialCSS.top,
        `CSS margin should have changed from ${initialCSS.top}px to ${afterCSS.top}px`
      )

      // Verify code contains uniform margin
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes(`mar ${afterCSS.top}`) || code.includes('mar '),
        `Code should contain uniform margin value, got: ${code}`
      )
    }
  ),

  testWithSetup(
    'Shift+drag right handle also adjusts all sides',
    'Frame mar 12, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Verify initial CSS margin
      const initialCSS = getComputedMargin('node-1')
      api.assert.ok(initialCSS.right === 12, `Initial CSS margin should be 12px`)

      await api.interact.enterMarginMode('node-1')
      const result = await api.interact.dragMarginHandle('right', 10, { shift: true })

      // API result check
      api.assert.ok(
        result.after.top === result.after.right &&
          result.after.top === result.after.bottom &&
          result.after.top === result.after.left,
        `All margins should be equal after shift+drag right`
      )

      // Verify CSS computed style - all sides should be equal
      const afterCSS = getComputedMargin('node-1')
      api.assert.ok(
        afterCSS.top === afterCSS.right &&
          afterCSS.top === afterCSS.bottom &&
          afterCSS.top === afterCSS.left,
        `CSS margins should all be equal: t=${afterCSS.top}, r=${afterCSS.right}, b=${afterCSS.bottom}, l=${afterCSS.left}`
      )
      api.assert.ok(
        afterCSS.right !== initialCSS.right,
        `CSS margin should have changed from ${initialCSS.right}px to ${afterCSS.right}px`
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

      // Verify initial CSS margin
      const initialCSS = getComputedMargin('node-1')
      api.assert.ok(initialCSS.top === 16, `Initial CSS margin should be 16px`)

      await api.interact.enterMarginMode('node-1')
      const result = await api.interact.dragMarginHandle('top', 20, { alt: true })

      // Top and bottom should be equal and changed (API result)
      api.assert.ok(
        result.after.top === result.after.bottom,
        `Top and bottom should be equal: t=${result.after.top}, b=${result.after.bottom}`
      )
      api.assert.ok(result.after.top !== result.before.top, `Vertical margin should have changed`)

      // Left and right should be unchanged
      api.assert.ok(result.after.left === result.before.left, `Left margin should stay same`)
      api.assert.ok(result.after.right === result.before.right, `Right margin should stay same`)

      // Verify CSS computed style - top and bottom equal, left/right unchanged
      const afterCSS = getComputedMargin('node-1')
      api.assert.ok(
        afterCSS.top === afterCSS.bottom,
        `CSS top and bottom should be equal: t=${afterCSS.top}, b=${afterCSS.bottom}`
      )
      api.assert.ok(
        afterCSS.top !== initialCSS.top,
        `CSS vertical margin should have changed from ${initialCSS.top}px`
      )
      api.assert.ok(
        afterCSS.left === initialCSS.left && afterCSS.right === initialCSS.right,
        `CSS horizontal margins should stay same: l=${afterCSS.left}, r=${afterCSS.right}`
      )

      // Verify code was updated
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('mar-y') || code.includes('mar '),
        `Code should contain vertical margin, got: ${code}`
      )
    }
  ),

  testWithSetup(
    'Alt+drag left handle adjusts left AND right (horizontal axis)',
    'Frame mar 16, w 200, h 200, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Verify initial CSS margin
      const initialCSS = getComputedMargin('node-1')
      api.assert.ok(initialCSS.left === 16, `Initial CSS margin should be 16px`)

      await api.interact.enterMarginMode('node-1')
      const result = await api.interact.dragMarginHandle('left', 15, { alt: true })

      // Left and right should be equal and changed (API result)
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

      // Verify CSS computed style - left and right equal, top/bottom unchanged
      const afterCSS = getComputedMargin('node-1')
      api.assert.ok(
        afterCSS.left === afterCSS.right,
        `CSS left and right should be equal: l=${afterCSS.left}, r=${afterCSS.right}`
      )
      api.assert.ok(
        afterCSS.left !== initialCSS.left,
        `CSS horizontal margin should have changed from ${initialCSS.left}px`
      )
      api.assert.ok(
        afterCSS.top === initialCSS.top && afterCSS.bottom === initialCSS.bottom,
        `CSS vertical margins should stay same: t=${afterCSS.top}, b=${afterCSS.bottom}`
      )

      // Verify code was updated
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('mar-x') || code.includes('mar '),
        `Code should contain horizontal margin, got: ${code}`
      )
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

      // Log that we're in margin mode (screenshot removed - api doesn't support it)
      console.log('Margin mode activated')

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

  testWithSetup(
    'Margin handle lines form closed rectangle',
    'Frame mar 24, w 200, h 150, bg #1a1a1a\n  Text "Content", col white',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Enter margin mode
      await api.interact.enterMarginMode('node-1')
      await api.utils.delay(100)

      // Get the element rect
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element, 'Element should exist')
      const elementRect = element.getBoundingClientRect()

      // Get computed margin
      const style = window.getComputedStyle(element)
      const margin = {
        top: parseFloat(style.marginTop) || 0,
        right: parseFloat(style.marginRight) || 0,
        bottom: parseFloat(style.marginBottom) || 0,
        left: parseFloat(style.marginLeft) || 0,
      }

      console.log('Element rect:', elementRect)
      console.log('Computed margin:', margin)

      // Calculate expected outer boundary of margin area
      const expectedOuter = {
        top: elementRect.top - margin.top,
        right: elementRect.right + margin.right,
        bottom: elementRect.bottom + margin.bottom,
        left: elementRect.left - margin.left,
      }

      console.log('Expected outer boundary:', expectedOuter)

      // Get the visual lines from the handles
      const handleLines = document.querySelectorAll('.margin-handle-line')
      console.log('Handle lines found:', handleLines.length)

      api.assert.ok(handleLines.length === 4, `Expected 4 handle lines, got ${handleLines.length}`)

      // Get the bounding rects of all lines
      const lineRects: { position: string; rect: DOMRect }[] = []
      handleLines.forEach((line, i) => {
        const rect = line.getBoundingClientRect()
        const handle = line.parentElement as HTMLElement
        const position = handle?.dataset.position || 'unknown'
        lineRects.push({ position, rect })
        console.log(`  Line ${i} (${position}):`, {
          left: rect.left.toFixed(1),
          top: rect.top.toFixed(1),
          right: rect.right.toFixed(1),
          bottom: rect.bottom.toFixed(1),
          width: rect.width.toFixed(1),
          height: rect.height.toFixed(1),
        })
      })

      // Find each line by position
      const topLine = lineRects.find(l => l.position === 'top')
      const bottomLine = lineRects.find(l => l.position === 'bottom')
      const leftLine = lineRects.find(l => l.position === 'left')
      const rightLine = lineRects.find(l => l.position === 'right')

      api.assert.ok(topLine, 'Top line should exist')
      api.assert.ok(bottomLine, 'Bottom line should exist')
      api.assert.ok(leftLine, 'Left line should exist')
      api.assert.ok(rightLine, 'Right line should exist')

      const TOLERANCE = 5 // Allow 5px tolerance

      // Check: Top line should span from left margin edge to right margin edge
      console.log('\nChecking TOP line horizontal span:')
      console.log(
        `  Expected: left=${expectedOuter.left.toFixed(1)}, right=${expectedOuter.right.toFixed(1)}`
      )
      console.log(
        `  Actual: left=${topLine!.rect.left.toFixed(1)}, right=${topLine!.rect.right.toFixed(1)}`
      )

      api.assert.ok(
        Math.abs(topLine!.rect.left - expectedOuter.left) < TOLERANCE,
        `Top line left edge should be at ${expectedOuter.left.toFixed(1)}, got ${topLine!.rect.left.toFixed(1)}`
      )
      api.assert.ok(
        Math.abs(topLine!.rect.right - expectedOuter.right) < TOLERANCE,
        `Top line right edge should be at ${expectedOuter.right.toFixed(1)}, got ${topLine!.rect.right.toFixed(1)}`
      )

      // Check: Left line should span from top margin edge to bottom margin edge
      console.log('\nChecking LEFT line vertical span:')
      console.log(
        `  Expected: top=${expectedOuter.top.toFixed(1)}, bottom=${expectedOuter.bottom.toFixed(1)}`
      )
      console.log(
        `  Actual: top=${leftLine!.rect.top.toFixed(1)}, bottom=${leftLine!.rect.bottom.toFixed(1)}`
      )

      api.assert.ok(
        Math.abs(leftLine!.rect.top - expectedOuter.top) < TOLERANCE,
        `Left line top edge should be at ${expectedOuter.top.toFixed(1)}, got ${leftLine!.rect.top.toFixed(1)}`
      )
      api.assert.ok(
        Math.abs(leftLine!.rect.bottom - expectedOuter.bottom) < TOLERANCE,
        `Left line bottom edge should be at ${expectedOuter.bottom.toFixed(1)}, got ${leftLine!.rect.bottom.toFixed(1)}`
      )

      // Check: Right line should span from top margin edge to bottom margin edge
      console.log('\nChecking RIGHT line vertical span:')
      console.log(
        `  Expected: top=${expectedOuter.top.toFixed(1)}, bottom=${expectedOuter.bottom.toFixed(1)}`
      )
      console.log(
        `  Actual: top=${rightLine!.rect.top.toFixed(1)}, bottom=${rightLine!.rect.bottom.toFixed(1)}`
      )

      api.assert.ok(
        Math.abs(rightLine!.rect.top - expectedOuter.top) < TOLERANCE,
        `Right line top edge should be at ${expectedOuter.top.toFixed(1)}, got ${rightLine!.rect.top.toFixed(1)}`
      )
      api.assert.ok(
        Math.abs(rightLine!.rect.bottom - expectedOuter.bottom) < TOLERANCE,
        `Right line bottom edge should be at ${expectedOuter.bottom.toFixed(1)}, got ${rightLine!.rect.bottom.toFixed(1)}`
      )

      // Check: Bottom line should span from left margin edge to right margin edge
      console.log('\nChecking BOTTOM line horizontal span:')
      console.log(
        `  Expected: left=${expectedOuter.left.toFixed(1)}, right=${expectedOuter.right.toFixed(1)}`
      )
      console.log(
        `  Actual: left=${bottomLine!.rect.left.toFixed(1)}, right=${bottomLine!.rect.right.toFixed(1)}`
      )

      api.assert.ok(
        Math.abs(bottomLine!.rect.left - expectedOuter.left) < TOLERANCE,
        `Bottom line left edge should be at ${expectedOuter.left.toFixed(1)}, got ${bottomLine!.rect.left.toFixed(1)}`
      )
      api.assert.ok(
        Math.abs(bottomLine!.rect.right - expectedOuter.right) < TOLERANCE,
        `Bottom line right edge should be at ${expectedOuter.right.toFixed(1)}, got ${bottomLine!.rect.right.toFixed(1)}`
      )

      console.log('\n✅ All lines form a closed rectangle!')
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
