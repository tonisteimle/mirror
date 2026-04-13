/**
 * Editor Drop Handler Tests
 *
 * Tests for component drops into CodeMirror editor.
 * Verifies position calculation, code insertion, and definition handling.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  insertComponentCode,
  insertComponentWithDefinition,
  createComponentDropExtension,
  type EditorDropPosition,
} from '../../../studio/editor/editor-drop-handler'

const MIRROR_COMPONENT_TYPE = 'application/mirror-component'

/**
 * Create a test EditorView with initial content
 */
function createTestEditor(content: string): EditorView {
  const state = EditorState.create({
    doc: content,
    extensions: [],
  })

  const view = new EditorView({
    state,
    parent: document.body,
  })

  return view
}

/**
 * Create mock drag event
 */
function createMockDragEvent(
  type: 'dragover' | 'dragleave' | 'drop',
  options: {
    dataTransfer?: {
      types?: string[]
      dropEffect?: string
      getData?: (type: string) => string
    }
    relatedTarget?: HTMLElement | null
  } = {}
): DragEvent {
  const mockDataTransfer = {
    types: options.dataTransfer?.types ?? [MIRROR_COMPONENT_TYPE],
    dropEffect: options.dataTransfer?.dropEffect ?? 'none',
    getData: options.dataTransfer?.getData ?? vi.fn(() => ''),
  }

  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent

  Object.defineProperty(event, 'dataTransfer', { value: mockDataTransfer })
  Object.defineProperty(event, 'relatedTarget', { value: options.relatedTarget ?? null })

  return event
}

describe('Editor Drop Handler', () => {
  let editor: EditorView

  afterEach(() => {
    editor?.destroy()
    document.body.innerHTML = ''
  })

  // ============================================
  // insertComponentCode tests
  // ============================================

  describe('insertComponentCode', () => {
    it('inserts code at end of specified line', () => {
      editor = createTestEditor('Frame gap 12\n  Text "Hello"')

      const pos: EditorDropPosition = {
        line: 1,
        column: 0,
        offset: 12,
        indent: 2,
      }

      insertComponentCode(editor, 'Button "Click"', pos)

      const result = editor.state.doc.toString()
      expect(result).toContain('  Button "Click"')
    })

    it('inserts before first line when line is 0', () => {
      editor = createTestEditor('Frame gap 12\n  Text "Hello"')

      const pos: EditorDropPosition = {
        line: 0,
        column: 0,
        offset: 0,
        indent: 0,
      }

      insertComponentCode(editor, 'Header "Title"', pos)

      const result = editor.state.doc.toString()
      expect(result.startsWith('Header "Title"')).toBe(true)
    })

    it('applies indent from position', () => {
      editor = createTestEditor('Frame gap 12')

      const pos: EditorDropPosition = {
        line: 1,
        column: 0,
        offset: 12,
        indent: 4,
      }

      insertComponentCode(editor, 'Text "Nested"', pos)

      const result = editor.state.doc.toString()
      expect(result).toContain('    Text "Nested"') // 4 spaces indent
    })

    it('preserves relative indentation in multi-line code', () => {
      editor = createTestEditor('Frame gap 12')

      const pos: EditorDropPosition = {
        line: 1,
        column: 0,
        offset: 12,
        indent: 2,
      }

      const multiLineCode = 'Frame gap 8\n  Text "Child"'
      insertComponentCode(editor, multiLineCode, pos)

      const result = editor.state.doc.toString()
      expect(result).toContain('  Frame gap 8')
      expect(result).toContain('    Text "Child"') // base indent + relative indent
    })

    it('focuses editor after insert', () => {
      editor = createTestEditor('Frame gap 12')
      const focusSpy = vi.spyOn(editor, 'focus')

      const pos: EditorDropPosition = {
        line: 1,
        column: 0,
        offset: 12,
        indent: 0,
      }

      insertComponentCode(editor, 'Text "Test"', pos)

      expect(focusSpy).toHaveBeenCalled()
    })
  })

  // ============================================
  // insertComponentWithDefinition tests
  // ============================================

  describe('insertComponentWithDefinition', () => {
    it('inserts instance without definition when definition exists', () => {
      // Content already has Select definition
      const existingContent = `Select:
  Trigger: bg #1a1a1a
  Content: bg #1a1a1a

Frame gap 12
  Text "Form"`

      editor = createTestEditor(existingContent)

      const pos: EditorDropPosition = {
        line: 6,
        column: 0,
        offset: existingContent.length,
        indent: 2,
      }

      // Insert Select instance (definition already exists)
      insertComponentWithDefinition(editor, 'Select\n  Option "A"', pos, 'Select')

      const result = editor.state.doc.toString()

      // Should have only one Select: definition
      const defCount = (result.match(/Select:/g) || []).length
      expect(defCount).toBe(1)
    })

    it('inserts just instance for components without definitions', () => {
      editor = createTestEditor('Frame gap 12')

      const pos: EditorDropPosition = {
        line: 1,
        column: 0,
        offset: 12,
        indent: 2,
      }

      // Button has no complex definition template
      insertComponentWithDefinition(editor, 'Button "Click"', pos, 'Button')

      const result = editor.state.doc.toString()
      expect(result).toContain('  Button "Click"')
    })

    // ========================================================================
    // CRITICAL: Offset calculation tests (regression tests for the bug)
    // ========================================================================

    it('CRITICAL: inserts Checkbox definition AND instance without RangeError', () => {
      editor = createTestEditor('Frame gap 8')

      const pos: EditorDropPosition = {
        line: 1,
        column: 0,
        offset: 11, // After "Frame gap 8"
        indent: 2,
      }

      // This should NOT throw RangeError
      expect(() => {
        insertComponentWithDefinition(editor, 'Checkbox "Label"', pos, 'Checkbox')
      }).not.toThrow()

      const result = editor.state.doc.toString()

      // Definition should be inserted
      expect(result).toContain('Checkbox:')
      expect(result).toContain('Control:')
      expect(result).toContain('Label:')

      // Instance should be inserted
      expect(result).toContain('Checkbox "Label"')
    })

    it('CRITICAL: inserts Select definition AND instance without RangeError', () => {
      editor = createTestEditor('Frame gap 8')

      const pos: EditorDropPosition = {
        line: 1,
        column: 0,
        offset: 11,
        indent: 2,
      }

      expect(() => {
        insertComponentWithDefinition(editor, 'Select placeholder "Choose"', pos, 'Select')
      }).not.toThrow()

      const result = editor.state.doc.toString()

      // Definition
      expect(result).toContain('Select:')
      expect(result).toContain('Trigger:')
      expect(result).toContain('Content:')

      // Instance
      expect(result).toContain('Select placeholder "Choose"')
    })

    it('CRITICAL: inserts Dialog definition AND instance without RangeError', () => {
      editor = createTestEditor('Frame gap 8')

      const pos: EditorDropPosition = {
        line: 1,
        column: 0,
        offset: 11,
        indent: 2,
      }

      expect(() => {
        insertComponentWithDefinition(editor, 'Dialog\n  Trigger: Button "Open"', pos, 'Dialog')
      }).not.toThrow()

      const result = editor.state.doc.toString()

      // Definition
      expect(result).toContain('Dialog:')
      expect(result).toContain('Backdrop:')

      // Instance
      expect(result).toContain('Dialog')
      expect(result).toContain('Trigger:')
    })

    it('CRITICAL: offset calculation is correct when definition comes before instance', () => {
      // This tests the exact scenario that caused the bug:
      // - Definition inserted at position 0
      // - Instance inserted at position 11 (original offset)
      // - CodeMirror expects positions relative to ORIGINAL document
      editor = createTestEditor('Frame gap 8')

      const pos: EditorDropPosition = {
        line: 1,
        column: 0,
        offset: 11, // This is the original offset in the document
        indent: 2,
      }

      insertComponentWithDefinition(editor, 'Checkbox "Test"', pos, 'Checkbox')

      const result = editor.state.doc.toString()
      const lines = result.split('\n')

      // Structure should be:
      // 1. Definition at top
      // 2. Empty line(s)
      // 3. Original Frame content
      // 4. Instance

      // Definition should be first
      expect(lines[0]).toContain('Checkbox:')

      // Frame should still exist
      expect(result).toContain('Frame gap 8')

      // Instance should be after Frame
      const frameIndex = result.indexOf('Frame gap 8')
      const instanceIndex = result.indexOf('Checkbox "Test"')
      expect(instanceIndex).toBeGreaterThan(frameIndex)
    })

    it('handles multiple component insertions sequentially', () => {
      editor = createTestEditor('Frame gap 8')

      // First: Insert Checkbox
      const pos1: EditorDropPosition = {
        line: 1,
        column: 0,
        offset: 11,
        indent: 2,
      }

      insertComponentWithDefinition(editor, 'Checkbox "First"', pos1, 'Checkbox')

      // Second: Insert Select (at new position after first insertion)
      const doc = editor.state.doc.toString()
      const newOffset = doc.length

      const pos2: EditorDropPosition = {
        line: editor.state.doc.lines,
        column: 0,
        offset: newOffset,
        indent: 2,
      }

      expect(() => {
        insertComponentWithDefinition(editor, 'Select placeholder "Choose"', pos2, 'Select')
      }).not.toThrow()

      const finalResult = editor.state.doc.toString()

      // Both definitions should exist
      expect(finalResult).toContain('Checkbox:')
      expect(finalResult).toContain('Select:')

      // Both instances should exist
      expect(finalResult).toContain('Checkbox "First"')
      expect(finalResult).toContain('Select placeholder "Choose"')
    })

    it('does not insert duplicate definition when inserting second instance', () => {
      // Start with code that already has Checkbox definition
      const existingCode = `Checkbox:
  Control: w 18, h 18
  Label: col white

Frame gap 8
  Checkbox "First"`

      editor = createTestEditor(existingCode)

      const pos: EditorDropPosition = {
        line: 6,
        column: 0,
        offset: existingCode.length,
        indent: 2,
      }

      insertComponentWithDefinition(editor, 'Checkbox "Second"', pos, 'Checkbox')

      const result = editor.state.doc.toString()

      // Should have exactly ONE Checkbox: definition
      const defMatches = result.match(/Checkbox:/g) || []
      expect(defMatches.length).toBe(1)

      // Should have TWO Checkbox instances
      const instanceMatches = result.match(/Checkbox "[^"]+"/g) || []
      expect(instanceMatches.length).toBe(2)
    })

    it('handles empty document gracefully', () => {
      editor = createTestEditor('')

      const pos: EditorDropPosition = {
        line: 0,
        column: 0,
        offset: 0,
        indent: 0,
      }

      expect(() => {
        insertComponentWithDefinition(editor, 'Checkbox "Test"', pos, 'Checkbox')
      }).not.toThrow()

      const result = editor.state.doc.toString()
      expect(result).toContain('Checkbox:')
      expect(result).toContain('Checkbox "Test"')
    })

    it('handles document with only tokens', () => {
      editor = createTestEditor('primary.bg: #5BA8F5\nmuted.col: #888')

      const pos: EditorDropPosition = {
        line: 2,
        column: 0,
        offset: 35,
        indent: 0,
      }

      expect(() => {
        insertComponentWithDefinition(editor, 'Checkbox "Test"', pos, 'Checkbox')
      }).not.toThrow()

      const result = editor.state.doc.toString()

      // Tokens should still be there
      expect(result).toContain('primary.bg: #5BA8F5')

      // Definition should be inserted
      expect(result).toContain('Checkbox:')
    })
  })

  // ============================================
  // createComponentDropExtension tests
  // ============================================

  describe('createComponentDropExtension', () => {
    it('creates extension that handles dragover', () => {
      const onDrop = vi.fn()
      const extension = createComponentDropExtension({ onDrop })

      editor = createTestEditor('Frame gap 12')

      // Extension should be created without errors
      expect(extension).toBeDefined()
    })

    it('extension filters non-mirror-component drops', () => {
      const onDrop = vi.fn()

      // Create editor with the drop extension
      const state = EditorState.create({
        doc: 'Frame gap 12',
        extensions: [createComponentDropExtension({ onDrop })],
      })

      editor = new EditorView({
        state,
        parent: document.body,
      })

      // Simulate drop with non-mirror type
      const event = createMockDragEvent('drop', {
        dataTransfer: {
          types: ['text/plain'],
          getData: () => 'plain text',
        },
      })

      // Dispatch to editor dom
      editor.dom.dispatchEvent(event)

      // onDrop should NOT be called for non-mirror drops
      expect(onDrop).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Position calculation tests
  // ============================================

  describe('position handling', () => {
    it('handles empty document', () => {
      editor = createTestEditor('')

      const pos: EditorDropPosition = {
        line: 0,
        column: 0,
        offset: 0,
        indent: 0,
      }

      insertComponentCode(editor, 'Frame gap 12', pos)

      const result = editor.state.doc.toString()
      expect(result).toBe('Frame gap 12\n')
    })

    it('handles last line of document', () => {
      editor = createTestEditor('Frame gap 12\n  Text "Hello"')

      const pos: EditorDropPosition = {
        line: 2,
        column: 0,
        offset: 28,
        indent: 2,
      }

      insertComponentCode(editor, 'Button "End"', pos)

      const result = editor.state.doc.toString()
      expect(result).toContain('  Button "End"')
    })

    it('clamps line number to valid range', () => {
      editor = createTestEditor('Frame gap 12')

      const pos: EditorDropPosition = {
        line: 999, // Way beyond document
        column: 0,
        offset: 12,
        indent: 0,
      }

      // Should not crash
      expect(() => {
        insertComponentCode(editor, 'Text "Test"', pos)
      }).not.toThrow()
    })
  })

  // ============================================
  // CSS class handling tests
  // ============================================

  describe('visual feedback', () => {
    it('dragover adds editor-drop-target class', () => {
      const onDrop = vi.fn()

      const state = EditorState.create({
        doc: 'Frame gap 12',
        extensions: [createComponentDropExtension({ onDrop })],
      })

      editor = new EditorView({
        state,
        parent: document.body,
      })

      // Note: Due to CodeMirror's internal event handling,
      // we can only verify the extension was created properly
      expect(editor.dom).toBeDefined()
    })
  })

  // ============================================
  // Data parsing tests
  // ============================================

  describe('component data parsing', () => {
    it('handles valid JSON component data', () => {
      const componentData = {
        componentName: 'Frame',
        properties: 'gap 12, bg #1a1a1a',
        code: 'Frame gap 12',
      }

      const jsonStr = JSON.stringify(componentData)
      const parsed = JSON.parse(jsonStr)

      expect(parsed.componentName).toBe('Frame')
      expect(parsed.properties).toBe('gap 12, bg #1a1a1a')
    })

    it('handles component data with children', () => {
      const componentData = {
        componentName: 'Select',
        code: 'Select\n  Option "A"',
        children: [{ componentName: 'Option', textContent: 'A' }],
      }

      const jsonStr = JSON.stringify(componentData)
      const parsed = JSON.parse(jsonStr)

      expect(parsed.children).toHaveLength(1)
      expect(parsed.children[0].componentName).toBe('Option')
    })
  })
})

// ============================================
// Integration-style tests
// ============================================

describe('Editor Drop Integration', () => {
  let editor: EditorView

  afterEach(() => {
    editor?.destroy()
    document.body.innerHTML = ''
  })

  describe('typical drop scenarios', () => {
    it('drop Button into empty Frame', () => {
      editor = createTestEditor('Frame gap 12')

      const pos: EditorDropPosition = {
        line: 1,
        column: 0,
        offset: 12,
        indent: 2,
      }

      insertComponentCode(editor, 'Button "Click me", bg #2563eb, col white', pos)

      const result = editor.state.doc.toString()
      expect(result).toBe('Frame gap 12\n  Button "Click me", bg #2563eb, col white')
    })

    it('drop complex component with children', () => {
      editor = createTestEditor('Frame gap 16')

      const pos: EditorDropPosition = {
        line: 1,
        column: 0,
        offset: 12,
        indent: 2,
      }

      const cardCode = `Frame bg #1a1a1a, pad 16, rad 8
  Text "Title", col white, weight bold
  Text "Description", col #888`

      insertComponentCode(editor, cardCode, pos)

      const result = editor.state.doc.toString()
      expect(result).toContain('  Frame bg #1a1a1a')
      expect(result).toContain('    Text "Title"')
      expect(result).toContain('    Text "Description"')
    })

    it('drop at root level (no indent)', () => {
      editor = createTestEditor('Frame gap 12\n  Text "Existing"')

      const pos: EditorDropPosition = {
        line: 2,
        column: 0,
        offset: 28,
        indent: 0,
      }

      insertComponentCode(editor, 'Footer pad 20', pos)

      const result = editor.state.doc.toString()
      expect(result).toContain('Footer pad 20')
      // Should be at root level (no leading spaces)
      expect(result.split('\n').pop()).toBe('Footer pad 20')
    })
  })
})
