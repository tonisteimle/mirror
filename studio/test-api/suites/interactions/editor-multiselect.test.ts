/**
 * Editor Multiselection Tests
 *
 * Tests for bidirectional multiselection: selecting multiple lines in the editor
 * should trigger multiselection in the preview.
 */

import { describe, test, testWithSetup, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

/**
 * Basic editor multiselection tests
 */
export const basicEditorMultiselectTests: TestCase[] = describe('Basic Editor Multiselection', [
  testWithSetup(
    'Selecting two element lines creates multiselection',
    `Frame ver, gap 16
  Button "A"
  Button "B"
  Button "C"`,
    async (api: TestAPI) => {
      // Initially no multiselection
      let multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 0,
        `Should start with empty multiselection, got ${multiSelection.length}`
      )

      // Select lines 2-3 in editor (Button A and B)
      api.editor.selectLines(2, 3)
      await api.utils.delay(100) // Wait for sync

      // Should have multiselection with 2 elements
      multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 2,
        `Should have 2 elements in multiselection, got ${multiSelection.length}`
      )

      // Check that correct elements are selected
      api.assert.ok(multiSelection.includes('node-2'), 'Should include node-2 (Button A)')
      api.assert.ok(multiSelection.includes('node-3'), 'Should include node-3 (Button B)')
    }
  ),

  testWithSetup(
    'Selecting all child element lines creates multiselection',
    `Frame ver, gap 16
  Button "A"
  Button "B"
  Button "C"`,
    async (api: TestAPI) => {
      // Select lines 2-4 in editor (all three buttons)
      api.editor.selectLines(2, 4)
      await api.utils.delay(100)

      const multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 3,
        `Should have 3 elements in multiselection, got ${multiSelection.length}`
      )
    }
  ),

  testWithSetup(
    'Moving cursor clears multiselection',
    `Frame ver, gap 16
  Button "A"
  Button "B"
  Button "C"`,
    async (api: TestAPI) => {
      // First create multiselection
      api.editor.selectLines(2, 3)
      await api.utils.delay(100)

      let multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 2,
        `Should have multiselection, got ${multiSelection.length}`
      )

      // Now move cursor to single line
      api.editor.setCursor(4, 0)
      await api.utils.delay(100)

      // Multiselection should be cleared
      multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 0,
        `Multiselection should be cleared, got ${multiSelection.length}`
      )
    }
  ),
])

/**
 * Tests for parent-child filtering
 */
export const parentChildFilterTests: TestCase[] = describe('Parent-Child Filtering', [
  testWithSetup(
    'Selecting parent and child lines only selects parent',
    `Frame ver, gap 16
  Frame pad 8, bg #222
    Button "Child"
  Button "Sibling"`,
    async (api: TestAPI) => {
      // Select lines 2-3 (Frame with child and Button inside)
      api.editor.selectLines(2, 3)
      await api.utils.delay(100)

      const multiSelection = api.studio.getMultiSelection()
      // Should only have parent Frame, not the child Button
      api.assert.ok(
        multiSelection.length === 1,
        `Should only select parent when parent lines include children, got ${multiSelection.length}`
      )
      api.assert.ok(multiSelection.includes('node-2'), 'Should include the parent Frame (node-2)')
    }
  ),

  testWithSetup(
    'Selecting siblings creates multiselection',
    `Frame ver, gap 16
  Frame pad 8, bg #222
    Button "Child A"
  Frame pad 8, bg #333
    Button "Child B"`,
    async (api: TestAPI) => {
      // Select lines 2-5 (both sibling Frames with their children)
      api.editor.selectLines(2, 5)
      await api.utils.delay(100)

      const multiSelection = api.studio.getMultiSelection()
      // Should have 2 sibling Frames, not their children
      api.assert.ok(
        multiSelection.length === 2,
        `Should select 2 sibling parents, got ${multiSelection.length}`
      )
    }
  ),
])

/**
 * Tests for single line selection
 */
export const singleLineTests: TestCase[] = describe('Single Line Selection', [
  testWithSetup(
    'Single line selection uses regular selection',
    `Frame ver, gap 16
  Button "A"
  Button "B"`,
    async (api: TestAPI) => {
      // Select single line
      api.editor.setCursor(2, 0)
      await api.utils.delay(100)

      const multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 0,
        `Single line should not create multiselection, got ${multiSelection.length}`
      )

      // Should have regular selection
      const selection = api.studio.getSelection()
      api.assert.ok(selection === 'node-2', 'Should have regular selection on node-2')
    }
  ),
])

/**
 * All editor multiselect tests combined
 */
export const allEditorMultiselectTests: TestCase[] = [
  ...basicEditorMultiselectTests,
  ...parentChildFilterTests,
  ...singleLineTests,
]
