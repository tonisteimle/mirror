/**
 * Tests for usePickerManager hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePickerManager, detectColorAtCursor, findColorRangeAtCursor } from '../hooks/usePickerManager'
import type { EditorView } from '@codemirror/view'

// Mock EditorView
function createMockEditorView(options: {
  cursorPos?: number
  docContent?: string
  coords?: { left: number; bottom: number } | null
} = {}): EditorView {
  const { cursorPos = 0, docContent = '', coords = { left: 100, bottom: 200 } } = options

  return {
    state: {
      selection: {
        main: {
          head: cursorPos,
          from: cursorPos,
          to: cursorPos,
        },
      },
      doc: {
        lineAt: (pos: number) => ({
          from: 0,
          to: docContent.length,
          text: docContent,
        }),
        sliceString: (from: number, to: number) => docContent.slice(from, to),
      },
    },
    coordsAtPos: () => coords,
    dispatch: vi.fn(),
    focus: vi.fn(),
  } as unknown as EditorView
}

describe('usePickerManager', () => {
  describe('Initial State', () => {
    it('should start with no active picker', () => {
      const editorRef = { current: null }
      const { result } = renderHook(() => usePickerManager(editorRef))

      expect(result.current.state.active).toBeNull()
      expect(result.current.state.position).toEqual({ x: 0, y: 0 })
      expect(result.current.state.context).toEqual({})
    })
  })

  describe('isOpen', () => {
    it('should return false when no picker is open', () => {
      const editorRef = { current: null }
      const { result } = renderHook(() => usePickerManager(editorRef))

      expect(result.current.isOpen('color')).toBe(false)
      expect(result.current.isOpen('font')).toBe(false)
    })

    it('should return true for the active picker', () => {
      const mockEditor = createMockEditorView()
      const editorRef = { current: mockEditor }
      const { result } = renderHook(() => usePickerManager(editorRef))

      act(() => {
        result.current.open('color')
      })

      expect(result.current.isOpen('color')).toBe(true)
      expect(result.current.isOpen('font')).toBe(false)
    })
  })

  describe('open', () => {
    it('should open a picker with cursor coordinates', () => {
      const mockEditor = createMockEditorView({ coords: { left: 150, bottom: 250 } })
      const editorRef = { current: mockEditor }
      const { result } = renderHook(() => usePickerManager(editorRef))

      act(() => {
        result.current.open('color')
      })

      expect(result.current.state.active).toBe('color')
      expect(result.current.state.position).toEqual({ x: 150, y: 254 }) // bottom + 4
    })

    it('should not open if editor is null', () => {
      const editorRef = { current: null }
      const { result } = renderHook(() => usePickerManager(editorRef))

      act(() => {
        result.current.open('color')
      })

      expect(result.current.state.active).toBeNull()
    })

    it('should open with context', () => {
      const mockEditor = createMockEditorView()
      const editorRef = { current: mockEditor }
      const { result } = renderHook(() => usePickerManager(editorRef))

      act(() => {
        result.current.open('color', { currentColor: '#FF0000' })
      })

      expect(result.current.state.context.currentColor).toBe('#FF0000')
    })
  })

  describe('close', () => {
    it('should close the active picker', () => {
      const mockEditor = createMockEditorView()
      const editorRef = { current: mockEditor }
      const { result } = renderHook(() => usePickerManager(editorRef))

      act(() => {
        result.current.open('color')
      })
      act(() => {
        result.current.close()
      })

      expect(result.current.state.active).toBeNull()
      expect(result.current.state.context).toEqual({})
    })
  })

  describe('openExclusive', () => {
    it('should close current picker and open new one', () => {
      const mockEditor = createMockEditorView()
      const editorRef = { current: mockEditor }
      const { result } = renderHook(() => usePickerManager(editorRef))

      act(() => {
        result.current.open('color', { currentColor: '#FF0000' })
      })
      act(() => {
        result.current.openExclusive('font')
      })

      expect(result.current.state.active).toBe('font')
      expect(result.current.state.context.currentColor).toBeUndefined()
    })
  })

  describe('updateContext', () => {
    it('should update context while preserving existing values', () => {
      const mockEditor = createMockEditorView()
      const editorRef = { current: mockEditor }
      const { result } = renderHook(() => usePickerManager(editorRef))

      act(() => {
        result.current.open('spacing', { spacingProperty: 'pad' })
      })
      act(() => {
        result.current.updateContext({ propertyQuery: 'test' })
      })

      expect(result.current.state.context.spacingProperty).toBe('pad')
      expect(result.current.state.context.propertyQuery).toBe('test')
    })
  })

  describe('insertAtCursor', () => {
    it('should dispatch insert transaction', () => {
      const mockEditor = createMockEditorView({ cursorPos: 5 })
      const editorRef = { current: mockEditor }
      const { result } = renderHook(() => usePickerManager(editorRef))

      act(() => {
        result.current.insertAtCursor('#FF0000')
      })

      expect(mockEditor.dispatch).toHaveBeenCalledWith({
        changes: { from: 5, to: 5, insert: '#FF0000' },
      })
      expect(mockEditor.focus).toHaveBeenCalled()
    })

    it('should remove preceding character when specified', () => {
      const mockEditor = createMockEditorView({
        cursorPos: 5,
        docContent: 'test$',
      })
      const editorRef = { current: mockEditor }
      const { result } = renderHook(() => usePickerManager(editorRef))

      act(() => {
        result.current.insertAtCursor('primary', { removePrecedingChar: '$' })
      })

      expect(mockEditor.dispatch).toHaveBeenCalledWith({
        changes: { from: 4, to: 5, insert: 'primary' },
      })
    })

    it('should replace range when specified', () => {
      const mockEditor = createMockEditorView({ cursorPos: 10 })
      const editorRef = { current: mockEditor }
      const { result } = renderHook(() => usePickerManager(editorRef))

      act(() => {
        result.current.insertAtCursor('#00FF00', { replaceRange: { from: 5, to: 12 } })
      })

      expect(mockEditor.dispatch).toHaveBeenCalledWith({
        changes: { from: 5, to: 12, insert: '#00FF00' },
      })
    })
  })

  describe('getCursorCoords', () => {
    it('should return null when editor is null', () => {
      const editorRef = { current: null }
      const { result } = renderHook(() => usePickerManager(editorRef))

      expect(result.current.getCursorCoords()).toBeNull()
    })

    it('should return coordinates when editor exists', () => {
      const mockEditor = createMockEditorView({ coords: { left: 100, bottom: 200 } })
      const editorRef = { current: mockEditor }
      const { result } = renderHook(() => usePickerManager(editorRef))

      expect(result.current.getCursorCoords()).toEqual({ x: 100, y: 204 })
    })
  })
})

describe('detectColorAtCursor', () => {
  it('should detect color when cursor is inside color value', () => {
    const mockView = {
      state: {
        selection: { main: { head: 8 } },
        doc: {
          lineAt: () => ({
            from: 0,
            text: 'bg #FF5500',
          }),
        },
      },
    } as unknown as EditorView

    expect(detectColorAtCursor(mockView)).toBe('#FF5500')
  })

  it('should return undefined when cursor is not in color', () => {
    const mockView = {
      state: {
        selection: { main: { head: 2 } },
        doc: {
          lineAt: () => ({
            from: 0,
            text: 'bg #FF5500',
          }),
        },
      },
    } as unknown as EditorView

    expect(detectColorAtCursor(mockView)).toBeUndefined()
  })

  it('should handle 3-digit hex colors', () => {
    const mockView = {
      state: {
        selection: { main: { head: 5 } },
        doc: {
          lineAt: () => ({
            from: 0,
            text: 'bg #F00',
          }),
        },
      },
    } as unknown as EditorView

    expect(detectColorAtCursor(mockView)).toBe('#F00')
  })
})

describe('findColorRangeAtCursor', () => {
  it('should return range when cursor is in color', () => {
    const mockView = {
      state: {
        selection: { main: { head: 8 } },
        doc: {
          lineAt: () => ({
            from: 0,
            text: 'bg #FF5500',
          }),
        },
      },
    } as unknown as EditorView

    expect(findColorRangeAtCursor(mockView)).toEqual({ from: 3, to: 10 })
  })

  it('should return null when cursor is not in color', () => {
    const mockView = {
      state: {
        selection: { main: { head: 1 } },
        doc: {
          lineAt: () => ({
            from: 0,
            text: 'bg #FF5500',
          }),
        },
      },
    } as unknown as EditorView

    expect(findColorRangeAtCursor(mockView)).toBeNull()
  })
})
