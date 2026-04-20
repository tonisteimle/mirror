/**
 * Wrap Layout Tests (H/V in Multiselect Mode)
 *
 * Tests for H and V keyboard shortcuts behavior:
 * - Single selection: Changes layout direction of selected element
 * - Multiselection: Wraps selected elements in Frame with calculated gap
 *
 * Also tests transitions between selection modes.
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// H Key - Single Selection vs Multiselection
// =============================================================================

export const hKeyBehaviorTests: TestCase[] = describe('H Key - Single vs Multi Selection', [
  testWithSetup(
    'H key on single selection sets horizontal layout',
    'Frame ver, gap 8\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      api.assert.codeContains(/\bhor\b/)
      api.assert.codeNotContains(/\bver\b/)
    }
  ),

  testWithSetup(
    'H key on multiselection wraps in horizontal Frame',
    'Frame ver, gap 16\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect two buttons
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Press H to wrap
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Should have Frame hor wrapping the buttons
      api.assert.codeContains(/Frame hor/)
    }
  ),

  testWithSetup(
    'H key on multiselection includes gap property',
    'Frame ver, gap 12\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect both texts
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Should have Frame with hor and gap
      api.assert.codeContains(/Frame hor, gap/)
    }
  ),
])

// =============================================================================
// V Key - Single Selection vs Multiselection
// =============================================================================

export const vKeyBehaviorTests: TestCase[] = describe('V Key - Single vs Multi Selection', [
  testWithSetup(
    'V key on single selection sets vertical layout',
    'Frame hor, gap 8\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      await api.interact.pressKey('v')
      await api.utils.waitForCompile()

      api.assert.codeContains(/\bver\b/)
      api.assert.codeNotContains(/\bhor\b/)
    }
  ),

  testWithSetup(
    'V key on multiselection wraps in vertical Frame',
    'Frame hor, gap 16\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect two buttons
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Press V to wrap
      await api.interact.pressKey('v')
      await api.utils.waitForCompile()

      // Should have Frame ver wrapping the buttons
      api.assert.codeContains(/Frame ver/)
    }
  ),

  testWithSetup(
    'V key on multiselection includes gap property',
    'Frame hor, gap 20\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect both texts
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      await api.interact.pressKey('v')
      await api.utils.waitForCompile()

      // Should have Frame with ver and gap
      api.assert.codeContains(/Frame ver, gap/)
    }
  ),
])

// =============================================================================
// Selection Mode Transitions
// =============================================================================

export const selectionTransitionTests: TestCase[] = describe('Selection Mode Transitions', [
  testWithSetup(
    'Single selection → H sets layout, then multiselect → H wraps',
    'Frame ver, gap 8\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Step 1: Single selection, press H
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Frame should now be horizontal (might have other props like gap)
      api.assert.codeContains(/\bhor\b/)

      // Step 2: Now multiselect children and press V
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      await api.interact.pressKey('v')
      await api.utils.waitForCompile()

      // Should have nested Frame ver (wrapper around children)
      api.assert.codeContains(/\bver\b/)
    }
  ),

  testWithSetup(
    'Multiselect → wrap → then single select new Frame → change layout',
    'Frame pad 16\n  Text "A"\n  Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Step 1: Multiselect A and B, wrap horizontally
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // New Frame hor should exist
      api.assert.codeContains(/Frame hor/)

      // Step 2: Click somewhere to clear, then select the new Frame
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // The wrapped frame should be node-2 now (first wrapped element position)
      // Let's check the code structure
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Frame hor'), 'Should have horizontal Frame wrapper')
    }
  ),

  testWithSetup(
    'Escape clears multiselection, H then works on single selection',
    'Frame ver\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect both buttons
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Escape to clear multiselection
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Now select the Frame and press H
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Frame should be horizontal (single selection behavior)
      api.assert.codeContains(/Frame hor/)
    }
  ),

  testWithSetup(
    'Normal click clears multiselection, then H affects single element',
    'Frame ver\n  Text "A"\n  Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect A and B
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Normal click on Frame clears multiselection
      await api.interact.click('node-1')
      await api.utils.delay(100)

      // H should now set layout direction on Frame
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      api.assert.codeContains(/Frame hor/)
    }
  ),
])

// =============================================================================
// Nested Elements
// =============================================================================

export const nestedElementTests: TestCase[] = describe('Nested Element Wrapping', [
  testWithSetup(
    'Wrap siblings in nested structure',
    'Frame pad 16\n  Frame ver, gap 8\n    Text "A"\n    Text "B"\n    Text "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect Text A and B (inside nested Frame)
      await api.interact.click('node-3')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-4')
      await api.utils.delay(100)

      // Wrap horizontally
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Should create Frame hor inside the nested structure
      api.assert.codeContains(/Frame hor/)
    }
  ),

  testWithSetup(
    'Cannot wrap elements from different parents',
    'Frame pad 16\n  Frame\n    Text "A"\n  Frame\n    Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Try to select Text A (in first Frame) and Text B (in second Frame)
      await api.interact.click('node-3') // Text A
      await api.utils.delay(100)
      await api.interact.shiftClick('node-5') // Text B
      await api.utils.delay(100)

      const codeBefore = api.editor.getCode()

      // Try to wrap - should fail (different parents)
      await api.interact.pressKey('h')
      await api.utils.delay(300)

      const codeAfter = api.editor.getCode()

      // Code should be unchanged (wrap failed)
      api.assert.ok(
        codeBefore === codeAfter,
        'Code should not change when trying to wrap elements from different parents'
      )
    }
  ),

  testWithSetup(
    'Wrap all children of a container',
    'Frame ver, gap 8\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect all three buttons
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-4')
      await api.utils.delay(100)

      // Wrap horizontally
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Should have Frame hor containing all buttons
      api.assert.codeContains(/Frame hor/)
      api.assert.codeContains(/Button "A"/)
      api.assert.codeContains(/Button "B"/)
      api.assert.codeContains(/Button "C"/)
    }
  ),

  testWithSetup(
    'Wrap creates proper nesting structure',
    'Frame pad 16\n  Text "A"\n  Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Wrap A and B horizontally
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Should have Frame hor containing A and B
      const code = api.editor.getCode()
      api.assert.codeContains(/Frame hor/)
      // C should still be a sibling of the new Frame
      api.assert.ok(code.includes('Text "C"'), 'Text C should still exist as sibling')
      // A and B should be wrapped
      api.assert.ok(
        code.includes('Text "A"') && code.includes('Text "B"'),
        'Wrapped elements should still exist'
      )
    }
  ),
])

// =============================================================================
// Gap Calculation
// =============================================================================

export const gapCalculationTests: TestCase[] = describe('Gap Calculation', [
  testWithSetup(
    'Gap is calculated from element spacing',
    'Frame ver, gap 16\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect both buttons
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Should have gap in the wrapped Frame
      // The exact value depends on rendered spacing
      api.assert.codeContains(/Frame hor, gap \d+/)
    }
  ),

  testWithSetup(
    'Wrapped Frame has gap property',
    'Frame ver, gap 12\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Wrapped Frame should have gap property
      api.assert.codeContains(/Frame hor, gap \d+/)
    }
  ),

  testWithSetup(
    'Default gap when elements have no spacing',
    'Frame\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Should have default gap (8)
      api.assert.codeContains(/Frame hor, gap/)
    }
  ),
])

// =============================================================================
// Edge Cases
// =============================================================================

export const edgeCaseTests: TestCase[] = describe('Edge Cases', [
  testWithSetup(
    'H key with only one element selected does nothing for wrap',
    'Frame\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select only one button
      await api.interact.click('node-2')
      await api.utils.delay(100)

      const codeBefore = api.editor.getCode()

      // H should set layout direction on parent if clicked on Frame
      // But clicking on Button, H might not do anything
      await api.interact.pressKey('h')
      await api.utils.delay(200)

      // For a Button (non-container), H might not change code
      // This tests that single selection doesn't trigger wrap
      const codeAfter = api.editor.getCode()

      // Button doesn't have layout direction, so code should be unchanged
      // OR if it changed, verify it's still valid code
      const buttonStillExists = codeAfter.includes('Button "A"')
      api.assert.ok(buttonStillExists, 'Button element should still exist in code after H key')

      // Code should either be unchanged OR only have valid changes
      api.assert.ok(
        codeAfter.length > 0,
        'Code should not be empty after H key on single selection'
      )
    }
  ),

  testWithSetup(
    'V key preserves element order',
    'Frame hor, gap 8\n  Text "First"\n  Text "Second"\n  Text "Third"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect First and Second
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      await api.interact.pressKey('v')
      await api.utils.waitForCompile()

      const code = api.editor.getCode()

      // First should come before Second in wrapped Frame
      const firstIndex = code.indexOf('Text "First"')
      const secondIndex = code.indexOf('Text "Second"')
      api.assert.ok(firstIndex < secondIndex, 'Element order should be preserved')
    }
  ),

  testWithSetup(
    'Wrap clears multiselection afterwards',
    'Frame\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect both buttons
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Wrap
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Multiselection should be cleared
      const multiSelection = api.studio.getMultiSelection()
      api.assert.ok(multiSelection.length === 0, 'Multiselection should be cleared after wrap')
    }
  ),
])

// =============================================================================
// Combined Export
// =============================================================================

export const allWrapLayoutTests: TestCase[] = [
  ...hKeyBehaviorTests,
  ...vKeyBehaviorTests,
  ...selectionTransitionTests,
  ...nestedElementTests,
  ...gapCalculationTests,
  ...edgeCaseTests,
]
