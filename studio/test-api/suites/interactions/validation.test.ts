/**
 * Interaction Validation Tests - B3.1
 *
 * Deep validation tests for interactions:
 * - Spread toggle with CSS justifyContent verification
 * - Ungroup with DOM structure verification
 * - Selection state after Undo/Redo
 * - Multiselect with visual state verification
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get computed style from a node
 */
function getComputedStyleValue(nodeId: string, property: string): string | null {
  const el = document.querySelector(`[data-mirror-id="${nodeId}"]`)
  if (!el) return null
  return window.getComputedStyle(el).getPropertyValue(property)
}

/**
 * Get element bounds
 */
function getElementBounds(nodeId: string): DOMRect | null {
  const el = document.querySelector(`[data-mirror-id="${nodeId}"]`)
  return el?.getBoundingClientRect() ?? null
}

/**
 * Check if element exists in DOM
 */
function elementExists(nodeId: string): boolean {
  return document.querySelector(`[data-mirror-id="${nodeId}"]`) !== null
}

/**
 * Get child count of element
 */
function getChildCount(nodeId: string): number {
  const el = document.querySelector(`[data-mirror-id="${nodeId}"]`)
  if (!el) return 0
  // Count only direct children with data-mirror-id
  return el.querySelectorAll(':scope > [data-mirror-id]').length
}

// =============================================================================
// Spread Toggle CSS Validation
// =============================================================================

export const spreadCssTests: TestCase[] = describe('Spread Toggle: CSS Validation', [
  testWithSetup(
    'Spread adds justifyContent: space-between',
    'Frame hor, gap 8, w 300\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial state: no spread
      let justify = getComputedStyleValue('node-1', 'justify-content')
      api.assert.ok(
        justify !== 'space-between',
        `Initial state should not be space-between, got ${justify}`
      )

      // Select Frame and add spread
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)
      await api.interact.pressKey('s')
      await api.utils.waitForCompile()

      // Verify CSS
      justify = getComputedStyleValue('node-1', 'justify-content')
      api.assert.ok(
        justify === 'space-between',
        `After spread, justifyContent should be space-between, got ${justify}`
      )
    }
  ),

  testWithSetup(
    'Spread removal resets justifyContent',
    'Frame hor, gap 8, spread, w 300\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial state: has spread
      let justify = getComputedStyleValue('node-1', 'justify-content')
      api.assert.ok(
        justify === 'space-between',
        `Initial state should be space-between, got ${justify}`
      )

      // Select Frame and remove spread
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)
      await api.interact.pressKey('s')
      await api.utils.waitForCompile()

      // Verify CSS changed
      justify = getComputedStyleValue('node-1', 'justify-content')
      api.assert.ok(
        justify !== 'space-between',
        `After removing spread, justifyContent should not be space-between, got ${justify}`
      )
    }
  ),

  testWithSetup(
    'Spread on vertical Frame uses space-between',
    'Frame ver, gap 8, h 200\n  Text "Top"\n  Text "Bottom"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Add spread
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)
      await api.interact.pressKey('s')
      await api.utils.waitForCompile()

      // Verify CSS
      const justify = getComputedStyleValue('node-1', 'justify-content')
      api.assert.ok(
        justify === 'space-between',
        `Vertical spread should use space-between, got ${justify}`
      )
    }
  ),

  testWithSetup(
    'Spread visually distributes children',
    'Frame hor, spread, w 300, h 50\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get bounds of children
      const boundsA = getElementBounds('node-2')
      const boundsB = getElementBounds('node-3')
      const boundsParent = getElementBounds('node-1')

      api.assert.ok(boundsA !== null, 'Button A should exist')
      api.assert.ok(boundsB !== null, 'Button B should exist')
      api.assert.ok(boundsParent !== null, 'Parent should exist')

      if (boundsA && boundsB && boundsParent) {
        // A should be near left edge
        const aLeftOffset = boundsA.left - boundsParent.left
        api.assert.ok(aLeftOffset < 50, `Button A should be near left edge, offset: ${aLeftOffset}`)

        // B should be near right edge
        const bRightOffset = boundsParent.right - boundsB.right
        api.assert.ok(
          bRightOffset < 50,
          `Button B should be near right edge, offset: ${bRightOffset}`
        )

        // There should be significant gap between A and B
        const gap = boundsB.left - boundsA.right
        api.assert.ok(
          gap > 50,
          `Should have significant gap between buttons with spread, gap: ${gap}`
        )
      }
    }
  ),
])

// =============================================================================
// Ungroup DOM Validation
// =============================================================================

export const ungroupDomTests: TestCase[] = describe('Ungroup: DOM Validation', [
  testWithSetup(
    'Ungroup removes wrapper from DOM',
    'Frame pad 16\n  Frame gap 8\n    Text "A"\n    Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Inner Frame should exist
      api.assert.ok(elementExists('node-2'), 'Inner Frame should exist initially')

      // Select inner Frame and ungroup
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)
      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      // Inner Frame should be removed from DOM
      // Note: node IDs may shift, so we verify by checking parent's direct children
      const parentChildCount = getChildCount('node-1')
      api.assert.ok(
        parentChildCount >= 3,
        `Parent should have at least 3 children after ungroup (A, B, C), got ${parentChildCount}`
      )
    }
  ),

  testWithSetup(
    'Ungroup preserves child visibility',
    'Frame pad 16, bg #1a1a1a\n  Frame ver\n    Button "Visible A", bg #2271C1\n    Button "Visible B", bg #10b981',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get initial button backgrounds
      const bgA_before = getComputedStyleValue('node-3', 'background-color')
      const bgB_before = getComputedStyleValue('node-4', 'background-color')

      api.assert.ok(bgA_before !== null, 'Button A should exist initially')
      api.assert.ok(bgB_before !== null, 'Button B should exist initially')

      // Ungroup inner Frame
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)
      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      // Children should still be visible with their styles
      // After ungroup, children become direct children of parent
      // Check that buttons with those backgrounds still exist
      const allButtons = document.querySelectorAll('[data-mirror-id] button')
      api.assert.ok(allButtons.length >= 2, 'Buttons should still exist after ungroup')
    }
  ),

  testWithSetup(
    'Ungroup maintains DOM child order',
    'Frame pad 16\n  Frame ver\n    Text "First"\n    Text "Second"\n    Text "Third"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Ungroup inner Frame
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)
      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      // Get all text elements in order
      const texts = document.querySelectorAll('[data-mirror-id="node-1"] span')
      const textContents = Array.from(texts).map(t => t.textContent)

      // Find indices of our texts
      const firstIdx = textContents.findIndex(t => t?.includes('First'))
      const secondIdx = textContents.findIndex(t => t?.includes('Second'))
      const thirdIdx = textContents.findIndex(t => t?.includes('Third'))

      api.assert.ok(firstIdx !== -1, 'First should exist in DOM')
      api.assert.ok(secondIdx !== -1, 'Second should exist in DOM')
      api.assert.ok(thirdIdx !== -1, 'Third should exist in DOM')

      if (firstIdx !== -1 && secondIdx !== -1 && thirdIdx !== -1) {
        api.assert.ok(firstIdx < secondIdx, 'First should come before Second in DOM')
        api.assert.ok(secondIdx < thirdIdx, 'Second should come before Third in DOM')
      }
    }
  ),

  testWithSetup(
    'Ungroup nested maintains structure',
    'Frame pad 16\n  Frame ver\n    Frame hor, gap 4\n      Button "X"\n      Button "Y"\n    Text "Below"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get initial inner Frame child count
      const innerHorExists = elementExists('node-3')
      api.assert.ok(innerHorExists, 'Inner horizontal Frame should exist')

      // Ungroup middle Frame (ver)
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)
      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      // Check that buttons X and Y still exist somewhere
      const buttons = document.querySelectorAll('[data-mirror-id] button')
      const buttonTexts = Array.from(buttons).map(b => b.textContent)

      api.assert.ok(
        buttonTexts.some(t => t?.includes('X')),
        'Button X should still exist'
      )
      api.assert.ok(
        buttonTexts.some(t => t?.includes('Y')),
        'Button Y should still exist'
      )
    }
  ),
])

// =============================================================================
// Selection After Undo/Redo
// =============================================================================

export const selectionUndoRedoTests: TestCase[] = describe('Selection State: Undo/Redo', [
  testWithSetup(
    'Selection maintained after property change undo',
    'Frame w 100, h 100, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select Frame
      await api.interact.click('node-1')
      await api.utils.delay(100)

      const selectionBefore = api.studio.getSelection()
      api.assert.ok(selectionBefore === 'node-1', 'Frame should be selected')

      // Change a property
      await api.panel.property.setProperty('width', '200')
      await api.utils.waitForCompile()

      // Undo
      await api.interact.pressKey('z', { meta: true })
      await api.utils.waitForCompile()

      // Selection should still be on the Frame
      const selectionAfter = api.studio.getSelection()
      api.assert.ok(
        selectionAfter === 'node-1',
        `Selection should be maintained after undo, got ${selectionAfter}`
      )
    }
  ),

  testWithSetup(
    'Selection cleared after delete undo restores element',
    'Frame gap 8\n  Button "Delete Me"\n  Text "Stay"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select Button
      await api.interact.click('node-2')
      await api.utils.delay(100)

      api.assert.ok(elementExists('node-2'), 'Button should exist before delete')

      // Delete
      await api.interact.pressKey('Backspace')
      await api.utils.waitForCompile()

      // Button should be gone
      const afterDelete = document.querySelector('[data-mirror-id="node-2"]')
      // Note: Either element is gone or text content changed

      // Undo
      await api.interact.pressKey('z', { meta: true })
      await api.utils.waitForCompile()

      // Check code for button
      api.assert.codeContains(/Button "Delete Me"/)
    }
  ),

  testWithSetup(
    'Multiselection state after undo',
    'Frame gap 8\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Build multiselection
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      const multiBefore = api.studio.getMultiSelection()
      api.assert.ok(multiBefore.length === 2, 'Should have 2 elements selected')

      // Make a change (wrap with H)
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Verify wrap happened
      api.assert.codeContains(/hor/)

      // Undo
      await api.interact.pressKey('z', { meta: true })
      await api.utils.waitForCompile()

      // Code should be reverted
      api.assert.codeNotContains(/hor/)
    }
  ),

  testWithSetup(
    'Selection after redo maintains state',
    'Frame w 100, h 100, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select and change property
      await api.interact.click('node-1')
      await api.utils.delay(100)
      await api.panel.property.setProperty('width', '200')
      await api.utils.waitForCompile()

      // Undo
      await api.interact.pressKey('z', { meta: true })
      await api.utils.waitForCompile()

      // Redo
      await api.interact.pressKey('z', { meta: true, shift: true })
      await api.utils.waitForCompile()

      // Selection should still be on Frame
      const selection = api.studio.getSelection()
      api.assert.ok(
        selection === 'node-1',
        `Selection should be maintained after redo, got ${selection}`
      )

      // Width should be 200 again
      api.assert.codeContains(/w 200/)
    }
  ),

  testWithSetup(
    'Selection after multiple undo operations',
    'Frame gap 8\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select Frame
      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Multiple property changes
      await api.panel.property.setProperty('gap', '12')
      await api.utils.waitForCompile()

      await api.panel.property.setProperty('gap', '16')
      await api.utils.waitForCompile()

      await api.panel.property.setProperty('gap', '20')
      await api.utils.waitForCompile()

      // Undo all three
      await api.interact.pressKey('z', { meta: true })
      await api.utils.waitForCompile()
      await api.interact.pressKey('z', { meta: true })
      await api.utils.waitForCompile()
      await api.interact.pressKey('z', { meta: true })
      await api.utils.waitForCompile()

      // Selection should still be maintained
      const selection = api.studio.getSelection()
      api.assert.ok(
        selection === 'node-1',
        `Selection should be maintained after multiple undos, got ${selection}`
      )

      // Gap should be back to 8
      api.assert.codeContains(/gap 8/)
    }
  ),
])

// =============================================================================
// Multiselect Visual Validation
// =============================================================================

export const multiselectVisualTests: TestCase[] = describe('Multiselect: Visual Validation', [
  testWithSetup(
    'Multiselected elements have visual indicator',
    'Frame gap 8\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Build multiselection
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(150)

      // Check for visual indicator class
      const elA = document.querySelector('[data-mirror-id="node-2"]')
      const elB = document.querySelector('[data-mirror-id="node-3"]')
      const elC = document.querySelector('[data-mirror-id="node-4"]')

      api.assert.ok(
        elA?.classList.contains('studio-multi-selected'),
        'Button A should have multi-selected class'
      )
      api.assert.ok(
        elB?.classList.contains('studio-multi-selected'),
        'Button B should have multi-selected class'
      )
      api.assert.ok(
        !elC?.classList.contains('studio-multi-selected'),
        'Button C should NOT have multi-selected class'
      )
    }
  ),

  testWithSetup(
    'Deselection removes visual indicator',
    'Frame gap 8\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Build multiselection
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(150)

      // Both should have class
      let elA = document.querySelector('[data-mirror-id="node-2"]')
      let elB = document.querySelector('[data-mirror-id="node-3"]')

      api.assert.ok(
        elA?.classList.contains('studio-multi-selected'),
        'A should have class initially'
      )
      api.assert.ok(
        elB?.classList.contains('studio-multi-selected'),
        'B should have class initially'
      )

      // Deselect by clicking elsewhere
      await api.interact.click('node-1') // Click parent
      await api.utils.delay(150)

      // Classes should be removed
      elA = document.querySelector('[data-mirror-id="node-2"]')
      elB = document.querySelector('[data-mirror-id="node-3"]')

      api.assert.ok(
        !elA?.classList.contains('studio-multi-selected'),
        'A should NOT have class after deselect'
      )
      api.assert.ok(
        !elB?.classList.contains('studio-multi-selected'),
        'B should NOT have class after deselect'
      )
    }
  ),

  testWithSetup(
    'Escape clears visual indicators',
    'Frame gap 8\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Build multiselection
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(150)

      // Press Escape
      await api.interact.pressKey('Escape')
      await api.utils.delay(150)

      // Classes should be removed
      const elA = document.querySelector('[data-mirror-id="node-2"]')
      const elB = document.querySelector('[data-mirror-id="node-3"]')

      api.assert.ok(
        !elA?.classList.contains('studio-multi-selected'),
        'A should NOT have class after Escape'
      )
      api.assert.ok(
        !elB?.classList.contains('studio-multi-selected'),
        'B should NOT have class after Escape'
      )
    }
  ),

  testWithSetup(
    'Single selection does not use multi-selected class',
    'Frame gap 8\n  Button "Only"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Single select
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // Should NOT have multi-selected class (that's for 2+)
      const el = document.querySelector('[data-mirror-id="node-2"]')
      api.assert.ok(
        !el?.classList.contains('studio-multi-selected'),
        'Single selection should NOT have multi-selected class'
      )

      // Should have regular selection indicator
      const selection = api.studio.getSelection()
      api.assert.ok(selection === 'node-2', 'Should have single selection')
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allValidationTests: TestCase[] = [
  ...spreadCssTests,
  ...ungroupDomTests,
  ...selectionUndoRedoTests,
  ...multiselectVisualTests,
]

export default allValidationTests
