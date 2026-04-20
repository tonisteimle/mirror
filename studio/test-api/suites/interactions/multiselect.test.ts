/**
 * Multiselect Test Suite
 *
 * Tests for multi-element selection:
 * - Shift+Click adds element to multiselection
 * - Cmd/Ctrl+Click adds element to multiselection
 * - Click without modifier clears multiselection
 * - Auto-add current selection when first using modifier
 * - Escape clears multiselection
 * - Visual indicator shows when 2+ elements selected
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// Shift+Click Tests
// =============================================================================

export const shiftClickTests: TestCase[] = describe('Shift+Click Multiselect', [
  testWithSetup(
    'Shift+Click adds element to multiselection',
    'Frame gap 8, pad 16\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select first button
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Shift+Click second button
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Check multiselection
      const multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 2,
        `Expected 2 elements selected, got ${multiSelection.length}`
      )
      api.assert.ok(multiSelection.includes('node-2'), 'Should include first button')
      api.assert.ok(multiSelection.includes('node-3'), 'Should include second button')
    }
  ),

  testWithSetup(
    'Shift+Click adds third element',
    'Frame gap 8, pad 16\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select first button
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Shift+Click second button
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Shift+Click third button
      await api.interact.shiftClick('node-4')
      await api.utils.delay(100)

      // Check multiselection
      const multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 3,
        `Expected 3 elements selected, got ${multiSelection.length}`
      )
      api.assert.ok(multiSelection.includes('node-2'), 'Should include A')
      api.assert.ok(multiSelection.includes('node-3'), 'Should include B')
      api.assert.ok(multiSelection.includes('node-4'), 'Should include C')
    }
  ),

  testWithSetup(
    'Shift+Click toggles already selected element',
    'Frame gap 8, pad 16\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select first button
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Shift+Click second button
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Verify we have 2 elements before toggle
      let multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 2,
        `Should have 2 elements before toggle, got ${multiSelection.length}`
      )
      api.assert.ok(
        multiSelection.includes('node-2'),
        'node-2 should be in multiselection before toggle'
      )
      api.assert.ok(
        multiSelection.includes('node-3'),
        'node-3 should be in multiselection before toggle'
      )

      // Shift+Click second button again to deselect
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Check multiselection - node-3 should be removed, node-2 should remain
      multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        !multiSelection.includes('node-3'),
        'node-3 should be removed from multiselection after toggle'
      )

      // Important: node-2 should still be selected (either in multiSelection or single selection)
      // When only 1 element remains, it may switch to single selection
      const singleSelection = api.studio.getSelection()
      const node2StillSelected = multiSelection.includes('node-2') || singleSelection === 'node-2'
      api.assert.ok(
        node2StillSelected,
        `node-2 should still be selected after toggling node-3. Multi: [${multiSelection.join(', ')}], Single: ${singleSelection}`
      )
    }
  ),
])

// =============================================================================
// Meta/Ctrl+Click Tests
// =============================================================================

export const metaClickTests: TestCase[] = describe('Cmd/Ctrl+Click Multiselect', [
  testWithSetup(
    'Cmd+Click adds element to multiselection',
    'Frame gap 8, pad 16\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select first button
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Cmd/Ctrl+Click second button
      await api.interact.metaClick('node-3')
      await api.utils.delay(100)

      // Check multiselection
      const multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 2,
        `Expected 2 elements selected, got ${multiSelection.length}`
      )
      api.assert.ok(multiSelection.includes('node-2'), 'Should include first button')
      api.assert.ok(multiSelection.includes('node-3'), 'Should include second button')
    }
  ),
])

// =============================================================================
// Clear Selection Tests
// =============================================================================

export const clearSelectionTests: TestCase[] = describe('Clear Multiselection', [
  testWithSetup(
    'Normal click clears multiselection',
    'Frame gap 8, pad 16\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Build multiselection
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Normal click on another element
      await api.interact.click('node-4')
      await api.utils.delay(100)

      // Multiselection should be cleared
      const multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 0,
        `Expected 0 elements in multiselection, got ${multiSelection.length}`
      )

      // Single selection should be set
      const selection = api.studio.getSelection()
      api.assert.ok(selection === 'node-4', `Expected node-4 selected, got ${selection}`)
    }
  ),

  testWithSetup(
    'Escape clears multiselection',
    'Frame gap 8, pad 16\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Build multiselection
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Verify multiselection exists
      let multiSelection = api.studio.getMultiSelection()
      api.assert.ok(multiSelection.length === 2, 'Should have 2 elements before Escape')

      // Press Escape
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Multiselection should be cleared
      multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 0,
        `Expected 0 elements after Escape, got ${multiSelection.length}`
      )
    }
  ),
])

// =============================================================================
// CSS Class Tests
// =============================================================================

export const cssClassTests: TestCase[] = describe('Multiselect CSS Classes', [
  testWithSetup(
    'Selected elements have studio-multi-selected class',
    'Frame gap 8, pad 16\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Build multiselection
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(150)

      // Check CSS classes
      const button1 = document.querySelector('[data-mirror-id="node-2"]')
      const button2 = document.querySelector('[data-mirror-id="node-3"]')

      api.assert.ok(
        button1?.classList.contains('studio-multi-selected'),
        'First selected button should have studio-multi-selected class'
      )
      api.assert.ok(
        button2?.classList.contains('studio-multi-selected'),
        'Second selected button should have studio-multi-selected class'
      )
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allMultiselectTests: TestCase[] = [
  ...shiftClickTests,
  ...metaClickTests,
  ...clearSelectionTests,
  ...cssClassTests,
]
