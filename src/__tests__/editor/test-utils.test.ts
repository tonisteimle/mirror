/**
 * Editor Test Utilities Tests
 *
 * Tests for the test utilities themselves to ensure they work correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestEditor,
  createTestEditorRef,
  createMockEditorView,
  createMockEditorViewRef,
  TestEditor,
} from '../../editor/test-utils'

describe('TestEditor', () => {
  let editor: TestEditor

  beforeEach(() => {
    editor = createTestEditor({ doc: 'Hello World' })
  })

  describe('basic operations', () => {
    it('should initialize with given content', () => {
      expect(editor.getContent()).toBe('Hello World')
    })

    it('should initialize with cursor at position 0', () => {
      expect(editor.getCursorPosition()).toBe(0)
    })

    it('should allow setting initial cursor position', () => {
      const e = createTestEditor({ doc: 'test', cursorPos: 2 })
      expect(e.getCursorPosition()).toBe(2)
    })
  })

  describe('dispatch tracking', () => {
    it('should track dispatch calls', () => {
      editor.dispatch({ changes: { from: 0, to: 5, insert: 'Hi' } })

      const history = editor.getDispatchHistory()
      expect(history).toHaveLength(1)
      expect(history[0].changes).toEqual({ from: 0, to: 5, insert: 'Hi' })
    })

    it('should call onDispatch spy', () => {
      editor.dispatch({ changes: { from: 0, to: 0, insert: 'X' } })

      const spies = editor.getSpies()
      expect(spies.onDispatch.mock.calls).toHaveLength(1)
    })

    it('should call onChange spy after dispatch', () => {
      editor.dispatch({ changes: { from: 0, to: 0, insert: 'X' } })

      const spies = editor.getSpies()
      expect(spies.onChange.mock.calls).toHaveLength(1)
      expect(spies.onChange.mock.calls[0][0]).toBe('XHello World')
    })
  })

  describe('focus tracking', () => {
    it('should track focus calls', () => {
      editor.focus()
      editor.focus()

      const spies = editor.getSpies()
      expect(spies.onFocus.mock.calls).toHaveLength(2)
    })
  })

  describe('mock coordinates', () => {
    it('should return default mock coordinates', () => {
      const coords = editor.getCoordsAtPos(0)

      expect(coords).toEqual({
        left: 100,
        top: 100,
        right: 110,
        bottom: 120,
      })
    })

    it('should allow setting custom mock coordinates', () => {
      editor.setMockCoords({ left: 50, top: 60, right: 70, bottom: 80 })

      const coords = editor.getCoordsAtPos(0)
      expect(coords).toEqual({ left: 50, top: 60, right: 70, bottom: 80 })
    })

    it('should allow setting null coordinates', () => {
      editor.setMockCoords(null)

      const coords = editor.getCoordsAtPos(0)
      expect(coords).toBeNull()
    })

    it('should allow setting position with simple x, y', () => {
      editor.setMockPosition(200, 300)

      const coords = editor.getCoordsAtPos(0)
      expect(coords?.left).toBe(200)
      expect(coords?.top).toBe(300)
    })
  })

  describe('simulation helpers', () => {
    it('should simulate typing character by character', () => {
      editor.setCursor(0)
      editor.simulateTyping('abc')

      expect(editor.getContent()).toBe('abcHello World')
      expect(editor.getDispatchHistory()).toHaveLength(3)
    })

    it('should simulate trigger and return position info', () => {
      editor.setCursor(5)
      const result = editor.simulateTrigger('#')

      expect(result.pos).toBe(6)
      expect(result.charBefore).toBe('#')
      expect(editor.getContent()).toBe('Hello# World')
    })

    it('should get character before cursor', () => {
      editor.setCursor(5)

      expect(editor.getCharBefore()).toBe('o')
    })

    it('should return empty string when cursor at start', () => {
      editor.setCursor(0)

      expect(editor.getCharBefore()).toBe('')
    })

    it('should get text before cursor on current line', () => {
      const e = createTestEditor({ doc: 'Line 1\nLine 2\nLine 3' })
      e.setCursor(10) // Position in "Line 2"

      expect(e.getTextBeforeCursor()).toBe('Lin')
    })
  })

  describe('spy clearing', () => {
    it('should clear all spies and history', () => {
      editor.dispatch({ changes: { from: 0, to: 0, insert: 'X' } })
      editor.focus()

      editor.clearSpies()

      const spies = editor.getSpies()
      expect(spies.onDispatch.mock.calls).toHaveLength(0)
      expect(spies.onFocus.mock.calls).toHaveLength(0)
      expect(spies.onChange.mock.calls).toHaveLength(0)
      expect(editor.getDispatchHistory()).toHaveLength(0)
    })
  })
})

describe('createTestEditorRef', () => {
  it('should create a ref containing the editor', () => {
    const { ref, editor } = createTestEditorRef({ doc: 'test' })

    expect(ref.current).toBe(editor)
    expect(ref.current?.getContent()).toBe('test')
  })
})

describe('createMockEditorView', () => {
  it('should create an EditorView-like object', () => {
    const { view, editor } = createMockEditorView({ doc: 'Box "Hello"' })

    expect(view.state.doc.toString()).toBe('Box "Hello"')
    expect(view.state.doc.length).toBe(11)
    expect(view.state.doc.lines).toBe(1)
  })

  it('should have working sliceString', () => {
    const { view } = createMockEditorView({ doc: 'Hello World' })

    expect(view.state.doc.sliceString(0, 5)).toBe('Hello')
  })

  it('should have working lineAt', () => {
    const { view } = createMockEditorView({ doc: 'Line 1\nLine 2' })

    const line = view.state.doc.lineAt(8) // Position in Line 2
    expect(line.text).toBe('Line 2')
    expect(line.number).toBe(2)
  })

  it('should have working line', () => {
    const { view } = createMockEditorView({ doc: 'Line 1\nLine 2' })

    const line = view.state.doc.line(2)
    expect(line.text).toBe('Line 2')
  })

  it('should have working selection', () => {
    const { view, editor } = createMockEditorView({ doc: 'test' })
    editor.setSelection(1, 3)

    // Note: selection is captured at creation time, so we need to recreate
    const { view: view2 } = createMockEditorView({ doc: 'test', cursorPos: 2 })
    expect(view2.state.selection.main.head).toBe(2)
  })

  it('should dispatch changes to underlying editor', () => {
    const { view, editor } = createMockEditorView({ doc: 'Hello' })

    view.dispatch({ changes: { from: 0, to: 5, insert: 'Hi' } })

    expect(editor.getContent()).toBe('Hi')
  })

  it('should return coordinates from underlying editor', () => {
    const { view, editor } = createMockEditorView()
    editor.setMockPosition(150, 250)

    const coords = view.coordsAtPos(0)
    expect(coords?.left).toBe(150)
    expect(coords?.top).toBe(250)
  })
})

describe('createMockEditorViewRef', () => {
  it('should create a ref to the mock view', () => {
    const { ref, view, editor } = createMockEditorViewRef({ doc: 'test' })

    expect(ref.current).toBe(view)
    expect(ref.current?.state.doc.toString()).toBe('test')
  })
})
