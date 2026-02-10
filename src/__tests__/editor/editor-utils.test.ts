/**
 * Editor Utilities Tests
 *
 * Tests for shared editor utility functions:
 * - String detection (cursor inside string)
 * - Text before cursor
 * - Cursor coordinates and position
 * - Text insertion with spacing
 * - Character access
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isInsideString,
  getTextBeforeCursor,
  getCursorCoords,
  getCursorPosition,
  getCurrentLine,
  prepareInsertText,
  insertTextWithSpacing,
  getCharBefore,
  getCharAfter,
} from '../../editor/utils'
import type { EditorView } from '@codemirror/view'

// Mock EditorView for testing
function createMockView(options: {
  content?: string
  cursorPos?: number
  cursorLine?: number
  lineText?: string
  coords?: { left: number; top: number; bottom: number }
}): EditorView {
  const content = options.content ?? ''
  const cursorPos = options.cursorPos ?? 0
  const lineText = options.lineText ?? ''
  const cursorLine = options.cursorLine ?? 0

  // Calculate line start from position
  const lines = content.split('\n')
  let lineFrom = 0
  for (let i = 0; i < cursorLine; i++) {
    lineFrom += (lines[i]?.length ?? 0) + 1
  }

  return {
    state: {
      selection: {
        main: {
          head: cursorPos,
        },
      },
      doc: {
        lineAt: vi.fn().mockReturnValue({
          text: lineText,
          from: lineFrom,
          to: lineFrom + lineText.length,
          number: cursorLine + 1,
        }),
        sliceString: vi.fn((from: number, to: number) => content.slice(from, to)),
        length: content.length,
      },
    },
    coordsAtPos: vi.fn().mockReturnValue(options.coords ?? null),
    dispatch: vi.fn(),
  } as unknown as EditorView
}

describe('editor/utils', () => {
  describe('isInsideString', () => {
    it('returns false for text without quotes', () => {
      expect(isInsideString('Button -primary')).toBe(false)
    })

    it('returns false for text with even number of quotes', () => {
      expect(isInsideString('Button "Label"')).toBe(false)
    })

    it('returns true for text with odd number of quotes', () => {
      expect(isInsideString('Button "Label')).toBe(true)
    })

    it('returns true after opening quote', () => {
      expect(isInsideString('Button "')).toBe(true)
    })

    it('returns false at start of line', () => {
      expect(isInsideString('')).toBe(false)
    })

    it('handles multiple strings', () => {
      expect(isInsideString('Button "A" Text "B"')).toBe(false)
      expect(isInsideString('Button "A" Text "')).toBe(true)
      expect(isInsideString('Button "A" Text "B')).toBe(true)
    })

    it('handles adjacent quotes', () => {
      expect(isInsideString('Button ""')).toBe(false)
      expect(isInsideString('Button """')).toBe(true)
    })
  })

  describe('getTextBeforeCursor', () => {
    it('returns text before cursor on line', () => {
      const view = createMockView({
        cursorPos: 10,
        lineText: 'Button -primary',
        cursorLine: 0,
      })

      const result = getTextBeforeCursor(view)

      expect(result).toBe('Button -pr')
    })

    it('returns empty string at start of line', () => {
      const view = createMockView({
        cursorPos: 0,
        lineText: 'Button',
        cursorLine: 0,
      })

      const result = getTextBeforeCursor(view)

      expect(result).toBe('')
    })

    it('returns full line when cursor at end', () => {
      const view = createMockView({
        cursorPos: 15,
        lineText: 'Button -primary',
        cursorLine: 0,
      })

      const result = getTextBeforeCursor(view)

      expect(result).toBe('Button -primary')
    })

    it('handles multiline document', () => {
      // Create mock for multiline - cursor at position 20, line starts at 7
      const mockLineAt = vi.fn().mockReturnValue({
        text: 'Text "Hello"',
        from: 7,
        to: 19,
        number: 2,
      })

      const view = {
        state: {
          selection: {
            main: { head: 20 },
          },
          doc: {
            lineAt: mockLineAt,
          },
        },
      } as unknown as EditorView

      const result = getTextBeforeCursor(view)

      // Position 20 - line from 7 = 13 characters
      expect(result).toBe('Text "Hello"')
    })
  })

  describe('getCursorCoords', () => {
    it('returns coordinates when available', () => {
      const view = createMockView({
        cursorPos: 10,
        coords: { left: 100, top: 50, bottom: 70 },
      })

      const result = getCursorCoords(view)

      expect(result).toEqual({ x: 100, y: 70 })
    })

    it('returns null when coordinates not available', () => {
      const view = createMockView({
        cursorPos: 10,
        coords: undefined,
      })
      ;(view.coordsAtPos as ReturnType<typeof vi.fn>).mockReturnValue(null)

      const result = getCursorCoords(view)

      expect(result).toBeNull()
    })
  })

  describe('getCursorPosition', () => {
    it('returns cursor position', () => {
      const view = createMockView({ cursorPos: 42 })

      const result = getCursorPosition(view)

      expect(result).toBe(42)
    })

    it('returns 0 at document start', () => {
      const view = createMockView({ cursorPos: 0 })

      const result = getCursorPosition(view)

      expect(result).toBe(0)
    })
  })

  describe('getCurrentLine', () => {
    it('returns current line object', () => {
      const view = createMockView({
        cursorPos: 10,
        lineText: 'Button -primary',
      })

      const result = getCurrentLine(view)

      expect(result.text).toBe('Button -primary')
    })

    it('calls lineAt with cursor position', () => {
      const view = createMockView({ cursorPos: 25 })

      getCurrentLine(view)

      expect(view.state.doc.lineAt).toHaveBeenCalledWith(25)
    })
  })

  describe('prepareInsertText', () => {
    it('returns text unchanged at position 0', () => {
      const view = createMockView({ content: '', cursorPos: 0 })

      const result = prepareInsertText(view, 'button', 0)

      expect(result).toBe('button')
    })

    it('adds space when previous char is not whitespace', () => {
      const view = createMockView({ content: 'Button', cursorPos: 6 })

      const result = prepareInsertText(view, '-primary', 6)

      expect(result).toBe(' -primary')
    })

    it('does not add space after space', () => {
      const view = createMockView({ content: 'Button ', cursorPos: 7 })

      const result = prepareInsertText(view, '-primary', 7)

      expect(result).toBe('-primary')
    })

    it('does not add space after newline', () => {
      const view = createMockView({ content: 'Button\n', cursorPos: 7 })

      const result = prepareInsertText(view, 'Text', 7)

      expect(result).toBe('Text')
    })

    it('does not add space after tab', () => {
      const view = createMockView({ content: 'Button\t', cursorPos: 7 })

      const result = prepareInsertText(view, 'Text', 7)

      expect(result).toBe('Text')
    })
  })

  describe('insertTextWithSpacing', () => {
    it('dispatches change with correct parameters', () => {
      const view = createMockView({ content: 'Button ', cursorPos: 7 })

      insertTextWithSpacing(view, '-primary', 7)

      expect(view.dispatch).toHaveBeenCalledWith({
        changes: { from: 7, to: 7, insert: '-primary' },
      })
    })

    it('adds space when needed', () => {
      const view = createMockView({ content: 'Button', cursorPos: 6 })

      insertTextWithSpacing(view, '-primary', 6)

      expect(view.dispatch).toHaveBeenCalledWith({
        changes: { from: 6, to: 6, insert: ' -primary' },
      })
    })

    it('replaces text range when toPos specified', () => {
      const view = createMockView({ content: 'Button -pri', cursorPos: 11 })

      insertTextWithSpacing(view, '-primary', 7, 11)

      expect(view.dispatch).toHaveBeenCalledWith({
        changes: { from: 7, to: 11, insert: '-primary' },
      })
    })
  })

  describe('getCharBefore', () => {
    it('returns character before position', () => {
      const view = createMockView({ content: 'Button', cursorPos: 3 })

      const result = getCharBefore(view, 3)

      expect(result).toBe('t')
    })

    it('returns empty string at position 0', () => {
      const view = createMockView({ content: 'Button', cursorPos: 0 })

      const result = getCharBefore(view, 0)

      expect(result).toBe('')
    })

    it('returns last character at end', () => {
      const view = createMockView({ content: 'Button', cursorPos: 6 })

      const result = getCharBefore(view, 6)

      expect(result).toBe('n')
    })
  })

  describe('getCharAfter', () => {
    it('returns character after position', () => {
      const view = createMockView({ content: 'Button', cursorPos: 3 })

      const result = getCharAfter(view, 3)

      expect(result).toBe('t')
    })

    it('returns empty string at end of document', () => {
      const view = createMockView({ content: 'Button', cursorPos: 6 })

      const result = getCharAfter(view, 6)

      expect(result).toBe('')
    })

    it('returns first character at start', () => {
      const view = createMockView({ content: 'Button', cursorPos: 0 })

      const result = getCharAfter(view, 0)

      expect(result).toBe('B')
    })
  })
})
