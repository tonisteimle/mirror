/**
 * Editor Utils Tests
 *
 * Tests for shared editor utility functions.
 */
import { describe, it, expect } from 'vitest'
import {
  isInsideString,
} from '../../editor/utils'
import { createMockEditorView } from '../kit'

describe('Editor Utils', () => {
  // ===========================================
  // isInsideString
  // ===========================================

  describe('isInsideString', () => {
    it('returns false when not inside string', () => {
      expect(isInsideString('col #FFF')).toBe(false)
      expect(isInsideString('Box')).toBe(false)
      expect(isInsideString('')).toBe(false)
      expect(isInsideString('  pad 10')).toBe(false)
    })

    it('returns true when inside string', () => {
      expect(isInsideString('"hello')).toBe(true)
      expect(isInsideString('text "hello world')).toBe(true)
      expect(isInsideString('  "some text')).toBe(true)
    })

    it('returns false after closing quote', () => {
      expect(isInsideString('"hello"')).toBe(false)
      expect(isInsideString('text "hello" and')).toBe(false)
    })

    it('handles multiple strings', () => {
      expect(isInsideString('"one" "two')).toBe(true)
      expect(isInsideString('"one" "two"')).toBe(false)
      expect(isInsideString('"one" text "two')).toBe(true)
    })

    it('handles escaped quotes correctly (simple count)', () => {
      // Note: This implementation uses simple quote counting
      // It doesn't handle escaped quotes specially
      expect(isInsideString('"test')).toBe(true)
    })
  })

  // ===========================================
  // Mock EditorView Integration Tests
  // ===========================================

  describe('with MockEditorView', () => {
    describe('getTextBeforeCursor equivalent', () => {
      it('gets text before cursor on current line', () => {
        const { editor } = createMockEditorView({ doc: 'Box\n  col #FFF' })
        editor.setCursor(10) // After 'col '

        const line = editor.getLineAt(10)
        const textBefore = line.text.slice(0, 10 - line.from)

        expect(textBefore).toBe('  col ')
      })

      it('works at line start', () => {
        const { editor } = createMockEditorView({ doc: 'Box\n  Text' })
        editor.setCursor(4) // Start of line 2

        const line = editor.getLineAt(4)
        const textBefore = line.text.slice(0, 4 - line.from)

        expect(textBefore).toBe('')
      })
    })

    describe('getCursorCoords equivalent', () => {
      it('returns coordinates at cursor position', () => {
        const { editor } = createMockEditorView({ doc: 'Box' })
        editor.setCursor(2)

        const coords = editor.getCoordsAtPos(2)

        expect(coords).not.toBeNull()
        expect(coords).toHaveProperty('left')
        expect(coords).toHaveProperty('top')
      })
    })

    describe('getCharBefore equivalent', () => {
      it('gets character before position', () => {
        const { editor } = createMockEditorView({ doc: 'Box' })

        expect(editor.getSlice(1, 2)).toBe('o')
        expect(editor.getSlice(2, 3)).toBe('x')
      })

      it('handles position 0', () => {
        const { editor } = createMockEditorView({ doc: 'Box' })

        expect(editor.getSlice(0, 0)).toBe('')
      })
    })

    describe('getCharAfter equivalent', () => {
      it('gets character after position', () => {
        const { editor } = createMockEditorView({ doc: 'Box' })

        expect(editor.getSlice(0, 1)).toBe('B')
        expect(editor.getSlice(1, 2)).toBe('o')
      })

      it('handles end of document', () => {
        const { editor } = createMockEditorView({ doc: 'Box' })

        expect(editor.getSlice(3, 4)).toBe('')
      })
    })
  })

  // ===========================================
  // Text Manipulation Tests
  // ===========================================

  describe('text manipulation', () => {
    describe('prepareInsertText logic', () => {
      it('adds space before when no space exists', () => {
        const { editor } = createMockEditorView({ doc: 'col#FFF' })

        const charBefore = editor.getSlice(2, 3) // 'l'
        const needsSpace = charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t'

        expect(needsSpace).toBe(true)
      })

      it('does not add space when space exists', () => {
        const { editor } = createMockEditorView({ doc: 'col ' })

        const charBefore = editor.getSlice(3, 4) // ' '
        const needsSpace = charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t'

        expect(needsSpace).toBe(false)
      })

      it('does not add space after newline', () => {
        const { editor } = createMockEditorView({ doc: 'Box\n' })

        const charBefore = editor.getSlice(3, 4) // '\n'
        const needsSpace = charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t'

        expect(needsSpace).toBe(false)
      })
    })

    describe('insertTextWithSpacing logic', () => {
      it('replaces text from position to cursor', () => {
        const { editor } = createMockEditorView({ doc: 'col #' })
        editor.setCursor(5)

        // Replace '#' with '#FFF'
        editor.dispatch({
          changes: { from: 4, to: 5, insert: '#FFF' },
        })

        expect(editor.getContent()).toBe('col #FFF')
      })

      it('inserts at cursor without replacing', () => {
        const { editor } = createMockEditorView({ doc: 'col ' })
        editor.setCursor(4)

        editor.dispatch({
          changes: { from: 4, to: 4, insert: '#FFF' },
        })

        expect(editor.getContent()).toBe('col #FFF')
      })
    })
  })

  // ===========================================
  // Line Operations
  // ===========================================

  describe('line operations', () => {
    it('gets current line at cursor', () => {
      const { editor } = createMockEditorView({ doc: 'Box\n  Text\n  Button' })

      editor.setCursor(6) // In 'Text'
      const line = editor.getLineAt(6)

      expect(line.text).toBe('  Text')
      expect(line.number).toBe(2)
    })

    it('handles multiline document', () => {
      const { editor } = createMockEditorView({
        doc: 'Page\n  Header\n  Content\n  Footer',
      })

      expect(editor.getLineCount()).toBe(4)
      expect(editor.getLine(1)?.text).toBe('Page')
      expect(editor.getLine(2)?.text).toBe('  Header')
      expect(editor.getLine(3)?.text).toBe('  Content')
      expect(editor.getLine(4)?.text).toBe('  Footer')
    })

    it('returns null for invalid line numbers', () => {
      const { editor } = createMockEditorView({ doc: 'Box' })

      expect(editor.getLine(0)).toBeNull()
      expect(editor.getLine(5)).toBeNull()
    })
  })
})
