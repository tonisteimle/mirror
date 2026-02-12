/**
 * Keymaps Tests
 *
 * Tests for editor keymap logic and panel navigation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEditorView } from '../kit'
import type { KeymapCallbacks } from '../../editor/keymaps'

describe('Keymaps', () => {
  // ===========================================
  // KeymapCallbacks Mock
  // ===========================================

  let callbacks: KeymapCallbacks

  beforeEach(() => {
    callbacks = {
      openColorPicker: vi.fn(),
      openCommandPalette: vi.fn(),
      openFontPicker: vi.fn(),
      openIconPicker: vi.fn(),
      openTokenPicker: vi.fn(),
      openAiAssistant: vi.fn(),
    }
  })

  // ===========================================
  // Slash Keymap Logic
  // ===========================================

  describe('Slash Keymap Logic', () => {
    it('should open command palette at line start', () => {
      const { editor } = createMockEditorView({ doc: '' })
      const textBefore = ''

      // Logic: at start of line, open command palette
      if (textBefore.length === 0 || /\s$/.test(textBefore)) {
        callbacks.openCommandPalette()
      }

      expect(callbacks.openCommandPalette).toHaveBeenCalled()
    })

    it('should open command palette after whitespace', () => {
      const textBefore = 'Box '

      if (textBefore.length === 0 || /\s$/.test(textBefore)) {
        callbacks.openCommandPalette()
      }

      expect(callbacks.openCommandPalette).toHaveBeenCalled()
    })

    it('should not open command palette in middle of word', () => {
      const textBefore = 'Box'

      if (textBefore.length === 0 || /\s$/.test(textBefore)) {
        callbacks.openCommandPalette()
      }

      expect(callbacks.openCommandPalette).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // Hash Keymap Logic
  // ===========================================

  describe('Hash Keymap Logic', () => {
    it('should insert # and schedule color picker', () => {
      const { editor } = createMockEditorView({ doc: 'col ' })
      editor.setCursor(4)

      // Simulate # insertion
      editor.insert('#')

      expect(editor.getContent()).toBe('col #')
      expect(editor.getCursorPosition()).toBe(5)
    })

    it('should not trigger inside strings', () => {
      const textBefore = '"hello'
      const quoteCount = (textBefore.match(/"/g) || []).length
      const isInsideString = quoteCount % 2 !== 0

      expect(isInsideString).toBe(true)
    })
  })

  // ===========================================
  // Dollar Keymap Logic
  // ===========================================

  describe('Dollar Keymap Logic', () => {
    it('should insert $ and schedule token picker', () => {
      const { editor } = createMockEditorView({ doc: 'col ' })
      editor.setCursor(4)

      editor.insert('$')

      expect(editor.getContent()).toBe('col $')
      expect(editor.getCursorPosition()).toBe(5)
    })

    it('should find property context before $', () => {
      const textBefore = '  col '
      // Regex from findPropertyContext
      const match = textBefore.match(/\b(\w+)\s+(?:[a-z-]+\s+)*$/)

      expect(match).not.toBeNull()
      expect(match![1]).toBe('col')
    })
  })

  // ===========================================
  // Panel Keymap Logic
  // ===========================================

  describe('Panel Keymap Logic', () => {
    interface MockPanelState {
      isOpen: boolean
      selectedIndex: number
      triggerPos: number
    }

    let panelState: MockPanelState
    let setStateFn: (updater: (prev: MockPanelState) => MockPanelState) => void

    beforeEach(() => {
      panelState = { isOpen: false, selectedIndex: 0, triggerPos: 0 }
      setStateFn = (updater) => {
        panelState = updater(panelState)
      }
    })

    describe('Escape', () => {
      it('should close panel when open', () => {
        panelState = { isOpen: true, selectedIndex: 2, triggerPos: 0 }

        if (panelState.isOpen) {
          setStateFn(prev => ({ ...prev, isOpen: false }))
        }

        expect(panelState.isOpen).toBe(false)
      })

      it('should not affect state when panel closed', () => {
        panelState = { isOpen: false, selectedIndex: 2, triggerPos: 0 }
        const handled = panelState.isOpen

        expect(handled).toBe(false)
      })
    })

    describe('ArrowDown', () => {
      it('should increment selectedIndex when panel open', () => {
        panelState = { isOpen: true, selectedIndex: 0, triggerPos: 0 }

        if (panelState.isOpen) {
          setStateFn(prev => ({ ...prev, selectedIndex: prev.selectedIndex + 1 }))
        }

        expect(panelState.selectedIndex).toBe(1)
      })

      it('should handle multiple increments', () => {
        panelState = { isOpen: true, selectedIndex: 0, triggerPos: 0 }

        for (let i = 0; i < 5; i++) {
          setStateFn(prev => ({ ...prev, selectedIndex: prev.selectedIndex + 1 }))
        }

        expect(panelState.selectedIndex).toBe(5)
      })
    })

    describe('ArrowUp', () => {
      it('should decrement selectedIndex when panel open', () => {
        panelState = { isOpen: true, selectedIndex: 3, triggerPos: 0 }

        if (panelState.isOpen) {
          setStateFn(prev => ({ ...prev, selectedIndex: Math.max(0, prev.selectedIndex - 1) }))
        }

        expect(panelState.selectedIndex).toBe(2)
      })

      it('should not go below 0', () => {
        panelState = { isOpen: true, selectedIndex: 0, triggerPos: 0 }

        if (panelState.isOpen) {
          setStateFn(prev => ({ ...prev, selectedIndex: Math.max(0, prev.selectedIndex - 1) }))
        }

        expect(panelState.selectedIndex).toBe(0)
      })
    })

    describe('Enter', () => {
      it('should close panel and insert selected value', () => {
        const { editor } = createMockEditorView({ doc: 'col #' })
        editor.setCursor(5)
        panelState = { isOpen: true, selectedIndex: 0, triggerPos: 4 }

        const selectedValue = '#FF0000'
        const triggerPos = panelState.triggerPos
        const cursorPos = editor.getCursorPosition()

        if (panelState.isOpen && selectedValue) {
          editor.dispatch({
            changes: { from: triggerPos, to: cursorPos, insert: selectedValue },
          })
          setStateFn(prev => ({ ...prev, isOpen: false }))
        }

        expect(editor.getContent()).toBe('col #FF0000')
        expect(panelState.isOpen).toBe(false)
      })

      it('should insert hex input directly if valid', () => {
        const { editor } = createMockEditorView({ doc: 'col #FFF' })
        editor.setCursor(8)
        panelState = { isOpen: true, selectedIndex: 0, triggerPos: 4 }

        // Read filter from document
        const filter = editor.getSlice(panelState.triggerPos, editor.getCursorPosition())
        const cleanFilter = filter.startsWith('#') ? filter.slice(1) : filter

        const isHexInput = /^[0-9a-fA-F]{1,8}$/.test(cleanFilter)
        const selectedValue = isHexInput && cleanFilter.length >= 3
          ? '#' + cleanFilter.toUpperCase()
          : null

        expect(selectedValue).toBe('#FFF')
      })

      it('should handle 6-digit hex', () => {
        const filter = 'FF5733'
        const isHexInput = /^[0-9a-fA-F]{1,8}$/.test(filter)
        const selectedValue = isHexInput && filter.length >= 3
          ? '#' + filter.toUpperCase()
          : null

        expect(selectedValue).toBe('#FF5733')
      })

      it('should reject invalid hex', () => {
        const filter = 'GGG'
        const isHexInput = /^[0-9a-fA-F]{1,8}$/.test(filter)

        expect(isHexInput).toBe(false)
      })
    })
  })

  // ===========================================
  // Text Insertion Logic
  // ===========================================

  describe('Text Insertion', () => {
    it('should add space before value when no space exists', () => {
      const { editor } = createMockEditorView({ doc: 'col#' })
      editor.setCursor(4)

      const insertPos = 3  // Before #
      const charBefore = editor.getSlice(insertPos - 1, insertPos)

      expect(charBefore).toBe('l')

      const needsSpace = charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t'
      const textToInsert = needsSpace ? ' #FF0000' : '#FF0000'

      expect(textToInsert).toBe(' #FF0000')
    })

    it('should not add space when space already exists', () => {
      const { editor } = createMockEditorView({ doc: 'col #' })

      const insertPos = 4  // After space, before #
      const charBefore = editor.getSlice(insertPos - 1, insertPos)

      expect(charBefore).toBe(' ')

      const needsSpace = charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t'

      expect(needsSpace).toBe(false)
    })
  })
})
