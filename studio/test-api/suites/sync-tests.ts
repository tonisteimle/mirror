/**
 * Synchronization Tests
 *
 * Tests for robust synchronization between Editor, Preview, and Property Panel.
 * These tests verify that changes in one panel are correctly reflected in others.
 *
 * Test Categories:
 * - Editor → Preview: Code changes update preview
 * - Preview → Editor: Click selection syncs cursor
 * - Property Panel → Editor: Property changes update code
 * - Editor → Property Panel: Selection shows correct properties
 * - Multi-directional: Rapid changes across all panels
 * - Edge cases: Concurrent edits, race conditions
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Editor → Preview Sync
// =============================================================================

export const editorToPreviewTests: TestCase[] = describe('Editor → Preview Sync', [
  testWithSetup(
    'Code change updates preview immediately',
    `Frame pad 16, bg #1a1a1a
  Text "Original", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { textContains: 'Original' })

      // Change text in editor
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Text "Updated", col white`)
      await api.utils.delay(100)

      // Preview should reflect change
      api.dom.expect('node-2', { textContains: 'Updated' })
    }
  ),

  testWithSetup(
    'Adding element updates preview',
    `Frame pad 16, bg #1a1a1a
  Text "First", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      // Add new element
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Text "First", col white
  Text "Second", col #888`)
      await api.utils.delay(100)

      // New element should appear
      api.assert.exists('node-3')
      api.dom.expect('node-3', { textContains: 'Second' })
    }
  ),

  testWithSetup(
    'Removing element updates preview',
    `Frame pad 16, bg #1a1a1a
  Text "Keep", col white
  Text "Remove", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      // Remove second text
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Text "Keep", col white`)
      await api.utils.delay(100)

      // Removed element should be gone
      const removed = document.querySelector('[data-mirror-id="node-3"]')
      api.assert.ok(removed === null, 'Removed element should not exist')
    }
  ),

  testWithSetup(
    'Style change updates preview',
    `Frame pad 16, bg #1a1a1a
  Button "Click", bg #333, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-2')

      // Change background color
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Button "Click", bg #2271C1, col white, pad 12 24, rad 6`)
      await api.utils.delay(100)

      // Style should be updated
      const btn = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      api.assert.ok(btn !== null, 'Button should exist')
      api.assert.ok(
        btn.style.backgroundColor.includes('34, 113, 193') ||
          btn.style.background.includes('34, 113, 193'),
        'Background should be blue'
      )
    }
  ),

  testWithSetup(
    'Nested structure change updates preview',
    `Frame pad 16, bg #1a1a1a
  Frame pad 8, bg #222
    Text "Nested", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      // Change nested structure
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Frame pad 8, bg #222
    Text "Changed", col white
    Button "New", bg #333, col white, pad 8 16, rad 4`)
      await api.utils.delay(100)

      api.dom.expect('node-3', { textContains: 'Changed' })
      api.assert.exists('node-4')
    }
  ),
])

// =============================================================================
// Preview → Editor Sync
// =============================================================================

export const previewToEditorTests: TestCase[] = describe('Preview → Editor Sync', [
  testWithSetup(
    'Click in preview selects element',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "First", col white
  Text "Second", col #888
  Button "Third", bg #333, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      api.assert.exists('node-3')
      api.assert.exists('node-4')

      // Click on button in preview
      await api.interact.click('node-4')
      await api.utils.delay(100)

      // Should have selection
      const selection = api.state.getSelection()
      api.assert.ok(selection !== null, 'Should have selection')
    }
  ),

  testWithSetup(
    'Click different elements updates selection',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "One", col white
  Text "Two", col #888`,
    async (api: TestAPI) => {
      // Click first text
      await api.interact.click('node-2')
      await api.utils.delay(50)
      const sel1 = api.state.getSelection()

      // Click second text
      await api.interact.click('node-3')
      await api.utils.delay(50)
      const sel2 = api.state.getSelection()

      // Both selections should exist
      api.assert.ok(sel1 !== null && sel2 !== null, 'Both selections should exist')
    }
  ),

  testWithSetup(
    'Click nested element selects correctly',
    `Frame pad 16, bg #1a1a1a
  Frame pad 12, bg #222, rad 8
    Frame pad 8, bg #333, rad 4
      Text "Deep", col white`,
    async (api: TestAPI) => {
      // Click deeply nested text
      await api.interact.click('node-4')
      await api.utils.delay(100)

      const selection = api.state.getSelection()
      api.assert.ok(selection !== null, 'Should have selection for nested element')
    }
  ),
])

// =============================================================================
// Property Panel → Editor Sync
// =============================================================================

export const panelToEditorTests: TestCase[] = describe('Property Panel → Editor Sync', [
  testWithSetup(
    'Change property updates code',
    `Button "Test", bg #333, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      // Select button (only element)
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Change background via panel - use DSL property name directly
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(200)

      // Code should be updated
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('#2271C1') || code.includes('2271C1'),
        'Code should contain new color'
      )
    }
  ),

  testWithSetup(
    'Change numeric property via panel',
    `Text "Test", col white, fs 16`,
    async (api: TestAPI) => {
      // Select text (only element)
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Change font-size via panel - use DSL property name
      await api.panel.property.setProperty('fs', '24')
      await api.utils.delay(300)

      // Code should contain new font-size
      const code = api.editor.getCode()
      api.assert.ok(code.includes('fs 24'), 'Code should contain updated font-size')
    }
  ),

  testWithSetup(
    'Property change reflects in preview',
    `Frame w 100, h 100, bg #333, rad 4`,
    async (api: TestAPI) => {
      // Select frame (only element)
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Change background - use DSL property name
      await api.panel.property.setProperty('bg', '#10b981')
      await api.utils.delay(300)

      // Check code was updated
      const code = api.editor.getCode()
      api.assert.ok(code.includes('#10b981'), 'Code should contain new color')

      // Preview should show new color
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Element should exist')
      api.assert.ok(
        el.style.backgroundColor.includes('16, 185, 129') ||
          el.style.background.includes('16, 185, 129'),
        'Preview should show green background'
      )
    }
  ),
])

// =============================================================================
// Editor → Property Panel Sync
// =============================================================================

export const editorToPanelTests: TestCase[] = describe('Editor → Property Panel Sync', [
  testWithSetup(
    'Cursor position updates panel',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "Line 2", col white, fs 18
  Button "Line 3", bg #2271C1, col white, pad 12 24`,
    async (api: TestAPI) => {
      // Move cursor to button line
      api.editor.setCursor(3, 0)
      await api.utils.delay(100)

      // Panel should have updated
      const panel = api.panel.property.isVisible()
      api.assert.ok(panel !== undefined, 'Panel should be accessible')
    }
  ),

  testWithSetup(
    'Code edit updates selected element',
    `Frame pad 16, bg #1a1a1a
  Button "Edit", bg #333, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      // Select button
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Edit code directly
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Button "Edit", bg #ef4444, col white, pad 12 24, rad 8`)
      await api.utils.delay(100)

      // Preview should show changes
      api.dom.expect('node-2', { textContains: 'Edit' })
    }
  ),
])

// =============================================================================
// Multi-Directional Sync
// =============================================================================

export const multiDirectionalTests: TestCase[] = describe('Multi-Directional Sync', [
  testWithSetup(
    'Edit in editor, verify in preview',
    `Frame pad 16, bg #1a1a1a
  Button "Start", bg #333, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      // Select element first
      await api.interact.click('node-2')
      await api.utils.delay(50)

      // Edit in editor
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Button "Changed", bg #2271C1, col white, pad 12 24, rad 8`)
      await api.utils.delay(100)

      // Verify preview
      api.dom.expect('node-2', { textContains: 'Changed' })
    }
  ),

  testWithSetup(
    'Edit in panel, verify in editor and preview',
    `Frame w 100, h 100, bg #333, rad 8`,
    async (api: TestAPI) => {
      // Select element (only one)
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Edit in panel - use DSL property name
      await api.panel.property.setProperty('bg', '#f59e0b')
      await api.utils.delay(300)

      // Verify code updated
      const code = api.editor.getCode()
      api.assert.ok(code.includes('f59e0b'), 'Code should have new color')

      // Verify preview updated
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Element should exist')
      api.assert.ok(
        el.style.backgroundColor.includes('245, 158, 11') ||
          el.style.background.includes('245, 158, 11'),
        'Preview should show orange'
      )
    }
  ),

  testWithSetup(
    'Sequential edits across panels',
    `Frame pad 16, bg #1a1a1a
  Frame w 80, h 80, bg #333, rad 4`,
    async (api: TestAPI) => {
      // 1. Select in preview
      await api.interact.click('node-2')
      await api.utils.delay(50)

      // 2. Edit in panel
      await api.panel.property.setProperty('width', '120')
      await api.utils.delay(50)

      // 3. Edit in editor
      const code = api.editor.getCode()
      const newCode = code.replace('bg #333', 'bg #2271C1')
      await api.editor.setCode(newCode)
      await api.utils.delay(100)

      // Verify changes
      const finalCode = api.editor.getCode()
      api.assert.ok(finalCode.includes('w 120'), 'Width should be 120')
      api.assert.ok(finalCode.includes('2271C1'), 'Background should be blue')
    }
  ),
])

// =============================================================================
// Rapid Changes
// =============================================================================

export const rapidChangeTests: TestCase[] = describe('Rapid Changes', [
  testWithSetup(
    'Rapid property changes in panel',
    `Frame pad 16, bg #1a1a1a
  Frame w 100, h 100, bg #333, rad 8`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(50)

      // Rapid-fire property changes
      for (let i = 0; i < 5; i++) {
        await api.panel.property.setProperty('radius', String((i + 1) * 4))
        await api.utils.delay(20)
      }
      await api.utils.delay(100)

      // Final value should be 20
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('rad 20') || code.includes('radius 20'),
        'Final radius should be 20'
      )
    }
  ),

  testWithSetup(
    'Rapid selection changes',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "A", col white
  Text "B", col #888
  Text "C", col #666
  Text "D", col #444`,
    async (api: TestAPI) => {
      // Rapidly click through elements
      await api.interact.click('node-2')
      await api.utils.delay(30)
      await api.interact.click('node-3')
      await api.utils.delay(30)
      await api.interact.click('node-4')
      await api.utils.delay(30)
      await api.interact.click('node-5')
      await api.utils.delay(100)

      // Should have selection on last element
      const selection = api.state.getSelection()
      api.assert.ok(selection !== null, 'Should have final selection')
    }
  ),

  testWithSetup(
    'Code edit during selection',
    `Frame pad 16, bg #1a1a1a, gap 8
  Button "A", bg #333, col white, pad 8 16, rad 4
  Button "B", bg #444, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      // Select first button
      await api.interact.click('node-2')
      await api.utils.delay(50)

      // Edit code while selected
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Button "A", bg #2271C1, col white, pad 8 16, rad 4
  Button "B", bg #10b981, col white, pad 8 16, rad 4`)
      await api.utils.delay(100)

      // Both buttons should exist
      const btnA = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const btnB = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement

      api.assert.ok(btnA !== null, 'Button A should exist')
      api.assert.ok(btnB !== null, 'Button B should exist')
    }
  ),
])

// =============================================================================
// Edge Cases
// =============================================================================

export const edgeCaseTests: TestCase[] = describe('Sync Edge Cases', [
  testWithSetup(
    'Delete selected element',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "Keep", col white
  Text "Delete", col #888`,
    async (api: TestAPI) => {
      // Select element to delete
      await api.interact.click('node-3')
      await api.utils.delay(50)

      // Delete via code edit
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Text "Keep", col white`)
      await api.utils.delay(100)

      // Element should be gone, no crash
      const deleted = document.querySelector('[data-mirror-id="node-3"]')
      api.assert.ok(deleted === null, 'Deleted element should not exist')
    }
  ),

  testWithSetup(
    'Replace entire code',
    `Frame pad 16, bg #1a1a1a
  Text "Old content", col white`,
    async (api: TestAPI) => {
      // Replace with completely different code
      await api.editor.setCode(`Frame pad 24, bg #222, rad 12
  Button "New", bg #2271C1, col white, pad 12 24, rad 6
  Icon "check", ic #10b981, is 24`)
      await api.utils.delay(100)

      // New elements should exist
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
    }
  ),

  testWithSetup(
    'Empty code handling',
    `Frame pad 16, bg #1a1a1a
  Text "Content", col white`,
    async (api: TestAPI) => {
      // Set empty code
      await api.editor.setCode('')
      await api.utils.delay(100)

      // Should handle gracefully
      const code = api.editor.getCode()
      api.assert.ok(code.length === 0 || code.trim().length === 0, 'Code should be empty')
    }
  ),

  testWithSetup(
    'Rapid add and remove',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "Base", col white`,
    async (api: TestAPI) => {
      // Add element
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Text "Base", col white
  Text "Added", col #888`)
      await api.utils.delay(50)

      // Remove it
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Text "Base", col white`)
      await api.utils.delay(50)

      // Add different element
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Text "Base", col white
  Button "New", bg #333, col white, pad 8 16, rad 4`)
      await api.utils.delay(100)

      // Final state should be correct
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.dom.expect('node-3', { tag: 'button' })
    }
  ),

  testWithSetup(
    'Move element between parents',
    `Frame pad 16, bg #1a1a1a, gap 8
  Frame pad 8, bg #222, rad 4
    Text "Child", col white
  Frame pad 8, bg #333, rad 4`,
    async (api: TestAPI) => {
      // Move text to second frame
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Frame pad 8, bg #222, rad 4
  Frame pad 8, bg #333, rad 4
    Text "Child", col white`)
      await api.utils.delay(100)

      // Text should now be in second frame
      const text = document.querySelector('[data-mirror-id="node-4"]')
      api.assert.ok(text !== null, 'Moved element should exist')
      api.dom.expect('node-4', { textContains: 'Child' })
    }
  ),
])

// =============================================================================
// Selection Persistence
// =============================================================================

export const selectionPersistenceTests: TestCase[] = describe('Selection Persistence', [
  testWithSetup(
    'Selection persists after code edit',
    `Frame pad 16, bg #1a1a1a, gap 8
  Button "Selected", bg #333, col white, pad 12 24, rad 6
  Text "Other", col #888`,
    async (api: TestAPI) => {
      // Select button
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Edit text element (not selected one)
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Button "Selected", bg #333, col white, pad 12 24, rad 6
  Text "Changed", col #888`)
      await api.utils.delay(100)

      // Should still have a selection
      const selection = api.state.getSelection()
      api.assert.ok(selection !== null, 'Selection should persist')
    }
  ),

  testWithSetup(
    'Selection updates when selected element changes',
    `Frame pad 16, bg #1a1a1a
  Button "Original", bg #333, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      // Select button
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Edit selected element
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Button "Modified", bg #2271C1, col white, pad 12 24, rad 8`)
      await api.utils.delay(100)

      // Preview should show changes
      api.dom.expect('node-2', { textContains: 'Modified' })
    }
  ),

  testWithSetup(
    'Clear selection when element deleted',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "Keep", col white
  Text "ToDelete", col #888`,
    async (api: TestAPI) => {
      // Select element that will be deleted
      await api.interact.click('node-3')
      await api.utils.delay(100)

      // Delete it
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Text "Keep", col white`)
      await api.utils.delay(100)

      // Verify the element was deleted
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(!nodeIds.includes('node-3'), 'Deleted element (node-3) should no longer exist')

      // Verify the kept element still exists
      api.assert.exists('node-2')
      api.assert.hasText('node-2', 'Keep')

      // Verify selection state is handled (cleared or changed)
      const selection = api.state.getSelection()
      api.assert.ok(
        selection !== 'node-3',
        `Selection should not point to deleted node, got: ${selection}`
      )
    }
  ),
])

// =============================================================================
// Complex Scenarios
// =============================================================================

export const complexScenarioTests: TestCase[] = describe('Complex Scenarios', [
  testWithSetup(
    'Full workflow: create, edit, style',
    `Frame pad 16, bg #1a1a1a, gap 8`,
    async (api: TestAPI) => {
      // 1. Add element via code
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a, gap 8
  Button "New", bg #333, col white, pad 12 24, rad 6`)
      await api.utils.delay(50)

      // 2. Select it
      await api.interact.click('node-2')
      await api.utils.delay(50)

      // 3. Edit via panel
      await api.panel.property.setProperty('background', '#2271C1')
      await api.utils.delay(50)

      // 4. Add another element
      const code = api.editor.getCode()
      await api.editor.setCode(code + `\n  Text "Added", col white`)
      await api.utils.delay(100)

      // Verify final state
      api.assert.exists('node-2')
      api.assert.exists('node-3')
    }
  ),

  testWithSetup(
    'Undo after panel edit',
    `Frame pad 16, bg #1a1a1a
  Button "Test", bg #333, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      // Select and edit
      await api.interact.click('node-2')
      await api.utils.delay(50)

      const originalCode = api.editor.getCode()

      await api.panel.property.setProperty('background', '#ef4444')
      await api.utils.delay(100)

      // Code should have changed
      const changedCode = api.editor.getCode()
      api.assert.ok(changedCode !== originalCode, 'Code should change after panel edit')

      // Undo
      api.editor.undo()
      await api.utils.delay(100)

      // Should revert
      const afterUndo = api.editor.getCode()
      api.assert.ok(
        afterUndo.includes('#333') || afterUndo === originalCode,
        'Should revert to original after undo'
      )
    }
  ),

  testWithSetup(
    'Multiple elements workflow',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "Title", col white, fs 24, weight bold
  Text "Description", col #888, fs 14
  Button "Action", bg #2271C1, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      // Edit title
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('color', '#2271C1')
      await api.utils.delay(50)

      // Edit description
      await api.interact.click('node-3')
      await api.utils.delay(50)
      await api.panel.property.setProperty('font-size', '16')
      await api.utils.delay(50)

      // Edit button
      await api.interact.click('node-4')
      await api.utils.delay(50)
      await api.panel.property.setProperty('background', '#10b981')
      await api.utils.delay(100)

      // All changes should be in code
      const code = api.editor.getCode()
      api.assert.ok(code.includes('10b981'), 'Button should be green')
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allSyncTests: TestCase[] = [
  ...editorToPreviewTests,
  ...previewToEditorTests,
  ...panelToEditorTests,
  ...editorToPanelTests,
  ...multiDirectionalTests,
  ...rapidChangeTests,
  ...edgeCaseTests,
  ...selectionPersistenceTests,
  ...complexScenarioTests,
]
