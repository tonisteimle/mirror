/**
 * Integration Tests für useComponentPanel
 *
 * Testet den Hook mit gemocktem EditorView.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useComponentPanel } from '../../hooks/useComponentPanel'
import type { PickerType } from '../../hooks/useEditorTriggers'

// Mock EditorView factory
function createMockEditorRef(options: {
  doc?: string
  cursorPos?: number
  coords?: { left: number; bottom: number } | null
} = {}) {
  const { doc = '', cursorPos = 0, coords = { left: 100, bottom: 200 } } = options

  const mockDispatch = vi.fn()

  return {
    current: {
      state: {
        doc: {
          lineAt: (pos: number) => ({
            from: 0,
            to: doc.length,
            text: doc,
          }),
          sliceString: (from: number, to: number) => doc.slice(from, to),
        },
        selection: { main: { head: cursorPos } },
      },
      coordsAtPos: () => coords,
      dispatch: mockDispatch,
    } as any,
    mockDispatch,
  }
}

describe('useComponentPanel', () => {
  describe('initial state', () => {
    it('starts closed', () => {
      const { current: editorRef } = createMockEditorRef()
      const { result } = renderHook(() => useComponentPanel({ current: editorRef }))

      expect(result.current.state.isOpen).toBe(false)
      expect(result.current.state.pickerType).toBe(null)
      expect(result.current.state.componentType).toBe('')
    })
  })

  describe('open()', () => {
    it('opens panel with correct pickerType for Button', () => {
      const { current: editorRef } = createMockEditorRef({ doc: 'Button ', cursorPos: 7 })
      const { result } = renderHook(() => useComponentPanel({ current: editorRef }))

      act(() => {
        result.current.open('Button', 'button')
      })

      expect(result.current.state.isOpen).toBe(true)
      expect(result.current.state.pickerType).toBe('button')
      expect(result.current.state.componentType).toBe('Button')
      expect(result.current.state.lineContent).toBe('Button ')
    })

    it('opens panel with correct pickerType for Text', () => {
      const { current: editorRef } = createMockEditorRef({ doc: 'Text ', cursorPos: 5 })
      const { result } = renderHook(() => useComponentPanel({ current: editorRef }))

      act(() => {
        result.current.open('Text', 'text')
      })

      expect(result.current.state.isOpen).toBe(true)
      expect(result.current.state.pickerType).toBe('text')
      expect(result.current.state.componentType).toBe('Text')
    })

    it('opens panel with correct pickerType for Box (default)', () => {
      const { current: editorRef } = createMockEditorRef({ doc: 'Box ', cursorPos: 4 })
      const { result } = renderHook(() => useComponentPanel({ current: editorRef }))

      act(() => {
        result.current.open('Box', 'default')
      })

      expect(result.current.state.isOpen).toBe(true)
      expect(result.current.state.pickerType).toBe('default')
    })

    it('sets correct position from coords', () => {
      const { current: editorRef } = createMockEditorRef({
        doc: 'Button ',
        cursorPos: 7,
        coords: { left: 150, bottom: 250 },
      })
      const { result } = renderHook(() => useComponentPanel({ current: editorRef }))

      act(() => {
        result.current.open('Button', 'button')
      })

      expect(result.current.state.position).toEqual({ x: 150, y: 258 }) // bottom + 8
    })

    it('does not open if coords are null', () => {
      const { current: editorRef } = createMockEditorRef({
        doc: 'Button ',
        cursorPos: 7,
        coords: null,
      })
      const { result } = renderHook(() => useComponentPanel({ current: editorRef }))

      act(() => {
        result.current.open('Button', 'button')
      })

      expect(result.current.state.isOpen).toBe(false)
    })

    it('does not open if editorRef.current is null', () => {
      const editorRef = { current: null }
      const { result } = renderHook(() => useComponentPanel(editorRef as any))

      act(() => {
        result.current.open('Button', 'button')
      })

      expect(result.current.state.isOpen).toBe(false)
    })
  })

  describe('openForLine() - double-click support', () => {
    it('opens panel for specific line range', () => {
      const doc = 'Button pad 12, bg #333'
      const { current: editorRef } = createMockEditorRef({ doc })
      const { result } = renderHook(() => useComponentPanel({ current: editorRef }))

      act(() => {
        result.current.openForLine('Button', 'button', 0, doc.length)
      })

      expect(result.current.state.isOpen).toBe(true)
      expect(result.current.state.lineFrom).toBe(0)
      expect(result.current.state.lineTo).toBe(doc.length)
      expect(result.current.state.lineContent).toBe(doc)
    })
  })

  describe('close()', () => {
    it('closes panel and resets state', () => {
      const { current: editorRef } = createMockEditorRef({ doc: 'Button ', cursorPos: 7 })
      const { result } = renderHook(() => useComponentPanel({ current: editorRef }))

      act(() => {
        result.current.open('Button', 'button')
      })

      expect(result.current.state.isOpen).toBe(true)

      act(() => {
        result.current.close()
      })

      expect(result.current.state.isOpen).toBe(false)
      expect(result.current.state.pickerType).toBe(null)
      expect(result.current.state.componentType).toBe('')
      expect(result.current.state.lineContent).toBe('')
    })
  })

  describe('updateCode()', () => {
    it('dispatches changes to editor', () => {
      const doc = 'Button '
      const mockRef = createMockEditorRef({ doc, cursorPos: 7 })
      const { result } = renderHook(() => useComponentPanel({ current: mockRef.current }))

      act(() => {
        result.current.open('Button', 'button')
      })

      act(() => {
        result.current.updateCode('Button pad 12')
      })

      expect(mockRef.mockDispatch).toHaveBeenCalledWith({
        changes: {
          from: 0,
          to: 7,
          insert: 'Button pad 12',
        },
      })
    })

    it('updates state with new line content', () => {
      const doc = 'Button '
      const { current: editorRef } = createMockEditorRef({ doc, cursorPos: 7 })
      const { result } = renderHook(() => useComponentPanel({ current: editorRef }))

      act(() => {
        result.current.open('Button', 'button')
      })

      act(() => {
        result.current.updateCode('Button pad 12')
      })

      expect(result.current.state.lineContent).toBe('Button pad 12')
      expect(result.current.state.lineTo).toBe(13) // 0 + 'Button pad 12'.length
    })

    it('does nothing when panel is closed', () => {
      const doc = 'Button '
      const mockRef = createMockEditorRef({ doc, cursorPos: 7 })
      const { result } = renderHook(() => useComponentPanel({ current: mockRef.current }))

      // Don't open the panel
      act(() => {
        result.current.updateCode('Button pad 12')
      })

      expect(mockRef.mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('all picker types', () => {
    const testCases: Array<{ component: string; picker: PickerType }> = [
      { component: 'Button', picker: 'button' },
      { component: 'Text', picker: 'text' },
      { component: 'Link', picker: 'text' },
      { component: 'Icon', picker: 'icon' },
      { component: 'Input', picker: 'input' },
      { component: 'Textarea', picker: 'input' },
      { component: 'Image', picker: 'image' },
      { component: 'Box', picker: 'default' },
      { component: 'Container', picker: 'default' },
      { component: 'Row', picker: 'default' },
    ]

    testCases.forEach(({ component, picker }) => {
      it(`stores pickerType "${picker}" for ${component}`, () => {
        const doc = `${component} `
        const { current: editorRef } = createMockEditorRef({ doc, cursorPos: doc.length })
        const { result } = renderHook(() => useComponentPanel({ current: editorRef }))

        act(() => {
          result.current.open(component, picker)
        })

        expect(result.current.state.pickerType).toBe(picker)
      })
    })
  })
})
