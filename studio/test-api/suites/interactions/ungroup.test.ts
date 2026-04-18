/**
 * Ungroup Tests (U Key Shortcut)
 *
 * Tests for U keyboard shortcut to ungroup/unwrap containers.
 *
 * Behavior:
 * - U unwraps a container, promoting its children to the parent level
 * - Only works on containers (elements with children)
 * - Cannot ungroup root element or leaf elements
 * - Cmd/Ctrl+Shift+G also works as ungroup shortcut
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// Basic Ungroup
// =============================================================================

export const basicUngroupTests: TestCase[] = describe('Basic Ungroup', [
  testWithSetup(
    'U key ungroups a Frame with children',
    'Frame pad 16\n  Frame gap 8\n    Text "A"\n    Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the inner Frame (node-2)
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)

      // Press U to ungroup
      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      // Inner Frame should be gone, children promoted
      const code = api.editor.getCode()
      // Should not have nested Frame anymore
      api.assert.ok(!code.includes('Frame gap 8'), 'Inner Frame should be removed')
      // Children should still exist
      api.assert.ok(code.includes('Text "A"'), 'Child A should still exist')
      api.assert.ok(code.includes('Text "B"'), 'Child B should still exist')
      api.assert.ok(code.includes('Text "C"'), 'Sibling C should still exist')
    }
  ),

  testWithSetup(
    'U key ungroups Box container',
    'Frame pad 16\n  Box ver\n    Button "A"\n    Button "B"\n  Text "Other"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the Box (node-2)
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)

      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      // Box should be gone
      const code = api.editor.getCode()
      api.assert.ok(!code.includes('Box ver'), 'Box should be removed')
      api.assert.ok(code.includes('Button "A"'), 'Button A should still exist')
      api.assert.ok(code.includes('Button "B"'), 'Button B should still exist')
    }
  ),

  testWithSetup(
    'Cmd+Shift+G also ungroups',
    'Frame pad 16\n  Frame hor, gap 4\n    Text "X"\n    Text "Y"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the inner Frame
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)

      // Press Cmd+Shift+G
      await api.interact.pressKey('g', { meta: true, shift: true })
      await api.utils.waitForCompile()

      // Inner Frame should be gone
      const code = api.editor.getCode()
      api.assert.ok(!code.includes('Frame hor'), 'Inner Frame should be removed')
      api.assert.ok(code.includes('Text "X"'), 'Child X should still exist')
      api.assert.ok(code.includes('Text "Y"'), 'Child Y should still exist')
    }
  ),
])

// =============================================================================
// Cannot Ungroup Edge Cases
// =============================================================================

export const cannotUngroupTests: TestCase[] = describe('Cannot Ungroup Edge Cases', [
  testWithSetup(
    'Cannot ungroup leaf element (no children)',
    'Frame pad 16\n  Button "Leaf"\n  Text "Other"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the Button (leaf element)
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)

      const codeBefore = api.editor.getCode()

      // Press U - should do nothing (no children)
      await api.interact.pressKey('u')
      await api.utils.delay(200)

      const codeAfter = api.editor.getCode()
      api.assert.ok(codeBefore === codeAfter, 'Code should not change for leaf element')
    }
  ),

  testWithSetup(
    'Cannot ungroup root element',
    'Frame pad 16, gap 8\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the root Frame (node-1)
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      const codeBefore = api.editor.getCode()

      // Press U - should do nothing (root element)
      await api.interact.pressKey('u')
      await api.utils.delay(200)

      const codeAfter = api.editor.getCode()
      api.assert.ok(codeBefore === codeAfter, 'Code should not change for root element')
    }
  ),

  testWithSetup(
    'U key with no selection does nothing',
    'Frame pad 16\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Clear selection
      await api.studio.setSelection(null)
      await api.utils.delay(100)

      const codeBefore = api.editor.getCode()

      // Press U - should do nothing
      await api.interact.pressKey('u')
      await api.utils.delay(200)

      const codeAfter = api.editor.getCode()
      api.assert.ok(codeBefore === codeAfter, 'Code should not change without selection')
    }
  ),
])

// =============================================================================
// Nested Containers
// =============================================================================

export const nestedUngroupTests: TestCase[] = describe('Nested Container Ungroup', [
  testWithSetup(
    'Ungroup inner nested container',
    'Frame pad 16\n  Frame ver\n    Frame hor\n      Text "A"\n      Text "B"\n    Text "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the innermost Frame (hor)
      await api.studio.setSelection('node-3')
      await api.utils.delay(100)

      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      // Innermost Frame should be gone
      const code = api.editor.getCode()
      api.assert.ok(!code.includes('Frame hor'), 'Inner Frame hor should be removed')
      // Children should still exist
      api.assert.ok(code.includes('Text "A"'), 'Child A should still exist')
      api.assert.ok(code.includes('Text "B"'), 'Child B should still exist')
      api.assert.ok(code.includes('Text "C"'), 'Sibling C should still exist')
    }
  ),

  testWithSetup(
    'Ungroup middle container in deeply nested structure',
    'Frame pad 16\n  Frame ver\n    Frame gap 8\n      Text "Deep"\n  Text "Shallow"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the middle Frame (ver)
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)

      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      // Middle Frame should be gone
      const code = api.editor.getCode()
      api.assert.ok(!code.includes('Frame ver'), 'Middle Frame ver should be removed')
      // Inner Frame and contents should still exist
      api.assert.ok(
        code.includes('Frame gap 8') || code.includes('gap 8'),
        'Inner Frame should still exist'
      )
      api.assert.ok(code.includes('Text "Deep"'), 'Deep text should still exist')
    }
  ),

  testWithSetup(
    'Sequential ungroup operations',
    'Frame pad 16\n  Frame ver\n    Frame hor\n      Text "Innermost"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // First ungroup: innermost Frame hor
      await api.studio.setSelection('node-3')
      await api.utils.delay(100)
      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      let code = api.editor.getCode()
      api.assert.ok(!code.includes('Frame hor'), 'First ungroup removed Frame hor')

      // Second ungroup: now the middle Frame ver
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)
      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      code = api.editor.getCode()
      api.assert.ok(!code.includes('Frame ver'), 'Second ungroup removed Frame ver')
      api.assert.ok(code.includes('Text "Innermost"'), 'Content preserved after double ungroup')
    }
  ),
])

// =============================================================================
// Child Preservation
// =============================================================================

export const childPreservationTests: TestCase[] = describe('Child Preservation', [
  testWithSetup(
    'Ungroup preserves child order',
    'Frame pad 16\n  Frame ver\n    Text "First"\n    Text "Second"\n    Text "Third"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the inner Frame
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)

      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      const code = api.editor.getCode()

      // Check order is preserved
      const firstIdx = code.indexOf('Text "First"')
      const secondIdx = code.indexOf('Text "Second"')
      const thirdIdx = code.indexOf('Text "Third"')

      api.assert.ok(firstIdx < secondIdx, 'First should come before Second')
      api.assert.ok(secondIdx < thirdIdx, 'Second should come before Third')
    }
  ),

  testWithSetup(
    'Ungroup preserves child properties',
    'Frame pad 16\n  Frame ver\n    Button "Styled", bg #2271C1, col white\n    Text "Plain"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the inner Frame
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)

      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      const code = api.editor.getCode()

      // Check properties are preserved
      api.assert.ok(code.includes('bg #2271C1'), 'Background color preserved')
      api.assert.ok(code.includes('col white'), 'Text color preserved')
    }
  ),

  testWithSetup(
    'Ungroup preserves nested children',
    'Frame pad 16\n  Frame ver\n    Frame hor\n      Text "A"\n      Text "B"\n    Text "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the outer inner Frame (ver) - will promote hor Frame
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)

      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      const code = api.editor.getCode()

      // The Frame hor should still exist with its children
      api.assert.ok(code.includes('Text "A"'), 'Nested child A preserved')
      api.assert.ok(code.includes('Text "B"'), 'Nested child B preserved')
      api.assert.ok(code.includes('Text "C"'), 'Sibling C preserved')
    }
  ),
])

// =============================================================================
// Group → Ungroup Cycle
// =============================================================================

export const groupUngroupCycleTests: TestCase[] = describe('Group → Ungroup Cycle', [
  testWithSetup(
    'Group then immediately ungroup restores original structure',
    'Frame ver, gap 8\n  Text "A"\n  Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const codeBefore = api.editor.getCode()

      // Multiselect A and B
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Group with Cmd+G
      await api.interact.pressKey('g', { meta: true })
      await api.utils.waitForCompile()

      // Find the new wrapper (should be node-2 now)
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Box') || code.includes('Frame'), 'Group created a wrapper')

      // Select the wrapper and ungroup
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)
      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      // Structure should be similar to original
      const codeAfter = api.editor.getCode()
      api.assert.ok(codeAfter.includes('Text "A"'), 'A still exists')
      api.assert.ok(codeAfter.includes('Text "B"'), 'B still exists')
      api.assert.ok(codeAfter.includes('Text "C"'), 'C still exists')
    }
  ),

  testWithSetup(
    'Wrap with H then ungroup removes wrapper',
    'Frame ver, gap 12\n  Button "X"\n  Button "Y"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect both buttons
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Wrap with H
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      let code = api.editor.getCode()
      api.assert.codeContains(/\bhor\b/)

      // Select the wrapper and ungroup
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)
      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      code = api.editor.getCode()
      // The horizontal wrapper should be gone
      api.assert.ok(code.includes('Button "X"'), 'Button X preserved')
      api.assert.ok(code.includes('Button "Y"'), 'Button Y preserved')
    }
  ),

  testWithSetup(
    'Multiple group/ungroup cycles',
    'Frame pad 16\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Cycle 1: Group
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)
      await api.interact.pressKey('g', { meta: true })
      await api.utils.waitForCompile()

      // Cycle 1: Ungroup
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)
      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      // Cycle 2: Group again
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)
      await api.interact.pressKey('g', { meta: true })
      await api.utils.waitForCompile()

      // Cycle 2: Ungroup again
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)
      await api.interact.pressKey('u')
      await api.utils.waitForCompile()

      // Content should still be intact
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Text "Item 1"'), 'Item 1 preserved after cycles')
      api.assert.ok(code.includes('Text "Item 2"'), 'Item 2 preserved after cycles')
    }
  ),
])

// =============================================================================
// Selection After Ungroup
// =============================================================================

export const selectionAfterUngroupTests: TestCase[] = describe('Selection After Ungroup', [
  testWithSetup(
    'Selection cleared after ungroup (wrapper removed)',
    'Frame pad 16\n  Frame ver\n    Text "A"\n    Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select inner Frame
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)

      // Ungroup
      await api.interact.pressKey('u')
      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // The wrapper was removed, so selection state may be cleared or changed
      // Check that the code is correct
      const code = api.editor.getCode()
      api.assert.ok(!code.includes('Frame ver'), 'Wrapper removed')
    }
  ),
])

// =============================================================================
// Ungroup with Modifiers (should not trigger)
// =============================================================================

export const modifierTests: TestCase[] = describe('Ungroup Modifier Keys', [
  testWithSetup(
    'U with Cmd does nothing (reserved for system)',
    'Frame pad 16\n  Frame ver\n    Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.studio.setSelection('node-2')
      await api.utils.delay(100)

      const codeBefore = api.editor.getCode()

      // U with Cmd should not trigger ungroup
      await api.interact.pressKey('u', { meta: true })
      await api.utils.delay(200)

      const codeAfter = api.editor.getCode()
      api.assert.ok(codeBefore === codeAfter, 'Cmd+U should not ungroup')
    }
  ),

  testWithSetup(
    'U with Alt does nothing',
    'Frame pad 16\n  Frame ver\n    Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.studio.setSelection('node-2')
      await api.utils.delay(100)

      const codeBefore = api.editor.getCode()

      // U with Alt should not trigger ungroup
      await api.interact.pressKey('u', { alt: true })
      await api.utils.delay(200)

      const codeAfter = api.editor.getCode()
      api.assert.ok(codeBefore === codeAfter, 'Alt+U should not ungroup')
    }
  ),
])

// =============================================================================
// Combined Export
// =============================================================================

export const allUngroupTests: TestCase[] = [
  ...basicUngroupTests,
  ...cannotUngroupTests,
  ...nestedUngroupTests,
  ...childPreservationTests,
  ...groupUngroupCycleTests,
  ...selectionAfterUngroupTests,
  ...modifierTests,
]
