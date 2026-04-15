/**
 * Undo/Redo Test Suite
 *
 * Tests the undo/redo functionality:
 * - Basic undo/redo operations
 * - Multi-step undo
 * - Undo after various edit types
 * - Redo after undo
 */

import { test, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Basic Undo Tests
// =============================================================================

export const basicUndoTests: TestCase[] = describe('Basic Undo', [
  test('Undo reverts single change', async (api: TestAPI) => {
    // Set initial code
    await api.editor.setCode('Text "Original"')
    await api.utils.waitForCompile()
    api.assert.hasText('node-1', 'Original')

    // Make a change
    await api.editor.setCode('Text "Changed"')
    await api.utils.waitForCompile()
    api.assert.hasText('node-1', 'Changed')

    // Undo
    api.editor.undo()
    await api.utils.waitForCompile()

    // Should be back to original
    const code = api.editor.getCode()
    api.assert.contains(code, 'Original')
  }),

  test('Multiple undos work sequentially', async (api: TestAPI) => {
    await api.editor.setCode('Text "Step1"')
    await api.utils.delay(100)

    await api.editor.setCode('Text "Step2"')
    await api.utils.delay(100)

    await api.editor.setCode('Text "Step3"')
    await api.utils.delay(100)

    // Undo twice
    api.editor.undo()
    await api.utils.delay(50)
    api.editor.undo()
    await api.utils.delay(50)

    const code = api.editor.getCode()
    api.assert.contains(code, 'Step1')
  }),

  test('Undo does nothing when at beginning', async (api: TestAPI) => {
    await api.editor.setCode('Text "Only"')
    await api.utils.waitForCompile()

    const codeBefore = api.editor.getCode()

    // Try to undo past the beginning
    api.editor.undo()
    api.editor.undo()
    api.editor.undo()
    await api.utils.delay(50)

    // Code should still exist (can't undo to empty)
    const codeAfter = api.editor.getCode()
    api.assert.ok(codeAfter.length > 0, 'Code should not be empty')
  }),
])

// =============================================================================
// Basic Redo Tests
// =============================================================================

export const basicRedoTests: TestCase[] = describe('Basic Redo', [
  test('Redo restores undone change', async (api: TestAPI) => {
    await api.editor.setCode('Text "Before"')
    await api.utils.delay(100)

    await api.editor.setCode('Text "After"')
    await api.utils.delay(100)

    // Undo
    api.editor.undo()
    await api.utils.delay(50)
    api.assert.contains(api.editor.getCode(), 'Before')

    // Redo
    api.editor.redo()
    await api.utils.delay(50)
    api.assert.contains(api.editor.getCode(), 'After')
  }),

  test('Multiple redos work sequentially', async (api: TestAPI) => {
    await api.editor.setCode('Text "A"')
    await api.utils.delay(100)
    await api.editor.setCode('Text "B"')
    await api.utils.delay(100)
    await api.editor.setCode('Text "C"')
    await api.utils.delay(100)

    // Undo all
    api.editor.undo()
    api.editor.undo()
    await api.utils.delay(50)
    api.assert.contains(api.editor.getCode(), 'A')

    // Redo all
    api.editor.redo()
    api.editor.redo()
    await api.utils.delay(50)
    api.assert.contains(api.editor.getCode(), 'C')
  }),

  test('Redo does nothing when at end', async (api: TestAPI) => {
    await api.editor.setCode('Text "Latest"')
    await api.utils.waitForCompile()

    const codeBefore = api.editor.getCode()

    // Try to redo when nothing to redo
    api.editor.redo()
    api.editor.redo()
    await api.utils.delay(50)

    const codeAfter = api.editor.getCode()
    api.assert.equals(codeBefore, codeAfter)
  }),

  test('New edit clears redo stack', async (api: TestAPI) => {
    await api.editor.setCode('Text "A"')
    await api.utils.delay(100)
    await api.editor.setCode('Text "B"')
    await api.utils.delay(100)

    // Undo
    api.editor.undo()
    await api.utils.delay(50)
    api.assert.contains(api.editor.getCode(), 'A')

    // Make new edit instead of redo
    await api.editor.setCode('Text "C"')
    await api.utils.delay(100)

    // Try to redo - should do nothing, redo stack cleared
    api.editor.redo()
    await api.utils.delay(50)
    api.assert.contains(api.editor.getCode(), 'C')
  }),
])

// =============================================================================
// Undo Different Edit Types
// =============================================================================

export const undoEditTypesTests: TestCase[] = describe('Undo Edit Types', [
  test('Undo adding element', async (api: TestAPI) => {
    await api.editor.setCode('Frame\n  Text "First"')
    await api.utils.waitForCompile()
    api.assert.hasChildren('node-1', 1)

    await api.editor.setCode('Frame\n  Text "First"\n  Text "Second"')
    await api.utils.waitForCompile()
    api.assert.hasChildren('node-1', 2)

    api.editor.undo()
    await api.utils.waitForCompile()
    api.assert.hasChildren('node-1', 1)
  }),

  test('Undo removing element', async (api: TestAPI) => {
    await api.editor.setCode('Frame\n  Text "A"\n  Text "B"')
    await api.utils.waitForCompile()
    api.assert.hasChildren('node-1', 2)

    await api.editor.setCode('Frame\n  Text "A"')
    await api.utils.waitForCompile()
    api.assert.hasChildren('node-1', 1)

    api.editor.undo()
    await api.utils.waitForCompile()
    api.assert.hasChildren('node-1', 2)
  }),

  test('Undo style change', async (api: TestAPI) => {
    await api.editor.setCode('Frame bg #333')
    await api.utils.waitForCompile()

    await api.editor.setCode('Frame bg #ff0000')
    await api.utils.waitForCompile()

    api.editor.undo()
    await api.utils.waitForCompile()

    api.assert.contains(api.editor.getCode(), '#333')
  }),

  test('Undo text content change', async (api: TestAPI) => {
    await api.editor.setCode('Button "Save"')
    await api.utils.waitForCompile()

    await api.editor.setCode('Button "Cancel"')
    await api.utils.waitForCompile()

    api.editor.undo()
    await api.utils.waitForCompile()

    api.assert.contains(api.editor.getCode(), 'Save')
  }),

  test('Undo layout change', async (api: TestAPI) => {
    await api.editor.setCode('Frame\n  Text "A"\n  Text "B"')
    await api.utils.waitForCompile()
    api.assert.hasStyle('node-1', 'flexDirection', 'column')

    await api.editor.setCode('Frame hor\n  Text "A"\n  Text "B"')
    await api.utils.waitForCompile()
    api.assert.hasStyle('node-1', 'flexDirection', 'row')

    api.editor.undo()
    await api.utils.waitForCompile()
    api.assert.hasStyle('node-1', 'flexDirection', 'column')
  }),
])

// =============================================================================
// Undo with Selection
// =============================================================================

export const undoWithSelectionTests: TestCase[] = describe('Undo with Selection', [
  test('Undo preserves element selection if possible', async (api: TestAPI) => {
    await api.editor.setCode('Frame gap 8\n  Button "Test"')
    await api.utils.waitForCompile()

    api.interact.select('node-2')
    await api.utils.delay(50)
    api.assert.isSelected('node-2')

    // Change something else
    await api.editor.setCode('Frame gap 16\n  Button "Test"')
    await api.utils.waitForCompile()

    api.editor.undo()
    await api.utils.waitForCompile()

    // Button should still exist
    api.assert.exists('node-2')
  }),
])

// =============================================================================
// Edge Cases
// =============================================================================

export const undoEdgeCasesTests: TestCase[] = describe('Undo Edge Cases', [
  test('Rapid undo/redo cycles', async (api: TestAPI) => {
    await api.editor.setCode('Text "Start"')
    await api.utils.delay(100)
    await api.editor.setCode('Text "End"')
    await api.utils.delay(100)

    // Rapid cycling
    for (let i = 0; i < 5; i++) {
      api.editor.undo()
      await api.utils.delay(20)
      api.editor.redo()
      await api.utils.delay(20)
    }

    // Should end up at "End"
    api.assert.contains(api.editor.getCode(), 'End')
  }),

  test('Undo after whitespace-only change', async (api: TestAPI) => {
    await api.editor.setCode('Text "Test"')
    await api.utils.delay(100)

    // Add whitespace
    await api.editor.setCode('Text "Test"\n\n')
    await api.utils.delay(100)

    api.editor.undo()
    await api.utils.delay(50)

    // Should undo whitespace
    const code = api.editor.getCode()
    api.assert.ok(!code.endsWith('\n\n'), 'Whitespace should be undone')
  }),
])

// =============================================================================
// Export All
// =============================================================================

export const allUndoRedoTests: TestCase[] = [
  ...basicUndoTests,
  ...basicRedoTests,
  ...undoEditTypesTests,
  ...undoWithSelectionTests,
  ...undoEdgeCasesTests,
]
