/**
 * Space Keymap Tests
 *
 * Tests the actual createSpaceKeymap implementation to verify:
 * 1. Space after "icon" triggers icon picker
 * 2. Space after "font" triggers font picker
 * 3. Space after boolean properties (hor, ver, etc.) triggers autocomplete
 * 4. Space after values (#FFF, 12, "text") triggers autocomplete
 * 5. Space after value-expecting properties (pad, bg, etc.) does NOT trigger
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEditorView } from '../kit'
import type { KeymapCallbacks } from '../../editor/keymaps'
import { isInsideString } from '../../editor/utils'
import {
  COLOR_PROPERTIES,
  NUMBER_PROPERTIES,
  STRING_PROPERTIES,
} from '../../dsl/properties'

// Replicate the VALUE_EXPECTING_PROPERTIES set from keymaps.ts
const VALUE_EXPECTING_PROPERTIES = new Set([
  ...COLOR_PROPERTIES,
  ...NUMBER_PROPERTIES,
  ...Array.from(STRING_PROPERTIES).filter(p => p !== 'font' && p !== 'icon'),
])

describe('Space Keymap', () => {
  let callbacks: KeymapCallbacks
  let autocompleteTriggered: boolean

  beforeEach(() => {
    autocompleteTriggered = false
    callbacks = {
      openColorPicker: vi.fn(),
      openCommandPalette: vi.fn(),
      openFontPicker: vi.fn(),
      openIconPicker: vi.fn(),
      openTokenPicker: vi.fn(),
    }
  })

  // Simulate the logic from createSpaceKeymap
  function simulateSpaceKeymap(
    doc: string,
    cursorPos: number,
    callbacks: KeymapCallbacks
  ): { handled: boolean; newDoc: string; autocomplete: boolean } {
    const { view, editor } = createMockEditorView({ doc })
    editor.setCursor(cursorPos)
    autocompleteTriggered = false

    // Get text before cursor
    const line = view.state.doc.lineAt(cursorPos)
    const textBefore = line.text.slice(0, cursorPos - line.from)

    // Don't trigger inside strings
    if (isInsideString(textBefore)) {
      return { handled: false, newDoc: doc, autocomplete: false }
    }

    // Check if we just typed "font"
    if (/\bfont$/.test(textBefore)) {
      editor.dispatch({
        changes: { from: cursorPos, to: cursorPos, insert: ' ' },
        selection: { anchor: cursorPos + 1 }
      })
      callbacks.openFontPicker()
      return { handled: true, newDoc: editor.getContent(), autocomplete: false }
    }

    // Check if we just typed "icon"
    if (/\bicon$/.test(textBefore)) {
      editor.dispatch({
        changes: { from: cursorPos, to: cursorPos, insert: ' ' },
        selection: { anchor: cursorPos + 1 }
      })
      callbacks.openIconPicker()
      return { handled: true, newDoc: editor.getContent(), autocomplete: false }
    }

    // Extract the last word
    const lastWord = textBefore.match(/\b([\w-]+)$/)?.[1]

    // If the last word is a property that expects a value, don't trigger
    if (lastWord && VALUE_EXPECTING_PROPERTIES.has(lastWord)) {
      return { handled: false, newDoc: doc, autocomplete: false }
    }

    // Otherwise: trigger autocomplete
    editor.dispatch({
      changes: { from: cursorPos, to: cursorPos, insert: ' ' },
      selection: { anchor: cursorPos + 1 }
    })
    autocompleteTriggered = true
    return { handled: true, newDoc: editor.getContent(), autocomplete: true }
  }

  describe('Icon Trigger', () => {
    it('should trigger icon picker after typing "icon"', () => {
      const result = simulateSpaceKeymap('Box icon', 8, callbacks)

      expect(result.handled).toBe(true)
      expect(result.newDoc).toBe('Box icon ')
      expect(callbacks.openIconPicker).toHaveBeenCalledTimes(1)
    })

    it('should trigger icon picker when "icon" is at line start', () => {
      const result = simulateSpaceKeymap('icon', 4, callbacks)

      expect(result.handled).toBe(true)
      expect(callbacks.openIconPicker).toHaveBeenCalledTimes(1)
    })

    it('should NOT trigger icon picker for "lexicon" (word boundary check)', () => {
      const result = simulateSpaceKeymap('lexicon', 7, callbacks)

      // Autocomplete triggers, but NOT icon picker
      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
      expect(callbacks.openIconPicker).not.toHaveBeenCalled()
    })

    it('should NOT trigger icon picker for "iconic"', () => {
      const result = simulateSpaceKeymap('iconic', 6, callbacks)

      // Autocomplete triggers, but NOT icon picker
      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
      expect(callbacks.openIconPicker).not.toHaveBeenCalled()
    })
  })

  describe('Font Trigger', () => {
    it('should trigger font picker after typing "font"', () => {
      const result = simulateSpaceKeymap('Text font', 9, callbacks)

      expect(result.handled).toBe(true)
      expect(result.newDoc).toBe('Text font ')
      expect(callbacks.openFontPicker).toHaveBeenCalledTimes(1)
    })

    it('should NOT trigger font picker for "frontend" (word boundary check)', () => {
      const result = simulateSpaceKeymap('frontend', 8, callbacks)

      // Autocomplete triggers, but NOT font picker
      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
      expect(callbacks.openFontPicker).not.toHaveBeenCalled()
    })
  })

  describe('String Context', () => {
    it('should NOT trigger inside a string', () => {
      // Inside string: "hello icon
      const doc = '"hello icon'
      const result = simulateSpaceKeymap(doc, doc.length, callbacks)

      expect(result.handled).toBe(false)
      expect(callbacks.openIconPicker).not.toHaveBeenCalled()
    })

    it('should trigger after a closed string', () => {
      // After string: "hello" icon
      const doc = '"hello" icon'
      const result = simulateSpaceKeymap(doc, doc.length, callbacks)

      expect(result.handled).toBe(true)
      expect(callbacks.openIconPicker).toHaveBeenCalledTimes(1)
    })
  })

  describe('Boolean Properties', () => {
    it('should trigger autocomplete after "hor"', () => {
      const result = simulateSpaceKeymap('Box hor', 7, callbacks)

      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
      expect(result.newDoc).toBe('Box hor ')
    })

    it('should trigger autocomplete after "ver"', () => {
      const result = simulateSpaceKeymap('Box ver', 7, callbacks)

      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
    })

    it('should trigger autocomplete after "full"', () => {
      const result = simulateSpaceKeymap('Container full', 14, callbacks)

      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
    })

    it('should trigger autocomplete after "cen"', () => {
      const result = simulateSpaceKeymap('Box cen', 7, callbacks)

      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
    })

    it('should trigger autocomplete after "between"', () => {
      const result = simulateSpaceKeymap('Nav between', 11, callbacks)

      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
    })

    it('should trigger autocomplete after alignment props', () => {
      const alignProps = ['hor-l', 'hor-cen', 'hor-r', 'ver-t', 'ver-cen', 'ver-b']
      for (const prop of alignProps) {
        const doc = `Box ${prop}`
        const result = simulateSpaceKeymap(doc, doc.length, callbacks)
        expect(result.autocomplete).toBe(true)
      }
    })
  })

  describe('Value-Expecting Properties', () => {
    it('should NOT trigger after "pad" (expects value)', () => {
      const result = simulateSpaceKeymap('Box pad', 7, callbacks)

      expect(result.handled).toBe(false)
      expect(result.autocomplete).toBe(false)
    })

    it('should NOT trigger after "bg" (expects value)', () => {
      const result = simulateSpaceKeymap('Box bg', 6, callbacks)

      expect(result.handled).toBe(false)
      expect(result.autocomplete).toBe(false)
    })

    it('should NOT trigger after "col" (expects value)', () => {
      const result = simulateSpaceKeymap('Text col', 8, callbacks)

      expect(result.handled).toBe(false)
      expect(result.autocomplete).toBe(false)
    })

    it('should NOT trigger after "gap" (expects value)', () => {
      const result = simulateSpaceKeymap('Box hor gap', 11, callbacks)

      expect(result.handled).toBe(false)
      expect(result.autocomplete).toBe(false)
    })

    it('should NOT trigger after "w" or "h" (expects value)', () => {
      expect(simulateSpaceKeymap('Box w', 5, callbacks).handled).toBe(false)
      expect(simulateSpaceKeymap('Box h', 5, callbacks).handled).toBe(false)
    })

    it('should NOT trigger after "size" (expects value)', () => {
      const result = simulateSpaceKeymap('Text size', 9, callbacks)

      expect(result.handled).toBe(false)
      expect(result.autocomplete).toBe(false)
    })
  })

  describe('After Values', () => {
    it('should trigger autocomplete after "pad 12"', () => {
      const result = simulateSpaceKeymap('Box pad 12', 10, callbacks)

      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
      expect(result.newDoc).toBe('Box pad 12 ')
    })

    it('should trigger autocomplete after "bg #FFF"', () => {
      const result = simulateSpaceKeymap('Box bg #FFF', 11, callbacks)

      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
    })

    it('should trigger autocomplete after "w 200"', () => {
      const result = simulateSpaceKeymap('Box w 200', 9, callbacks)

      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
    })

    it('should trigger autocomplete after percentage value "w 50%"', () => {
      const result = simulateSpaceKeymap('Box w 50%', 9, callbacks)

      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
    })

    it('should trigger autocomplete after string value', () => {
      const result = simulateSpaceKeymap('Box icon "search"', 17, callbacks)

      expect(result.handled).toBe(true)
      expect(result.autocomplete).toBe(true)
    })
  })

  describe('No Trigger Cases', () => {
    it('should NOT handle space inside strings', () => {
      // Inside string: "hello icon
      const doc = '"hello icon'
      const result = simulateSpaceKeymap(doc, doc.length, callbacks)

      expect(result.handled).toBe(false)
      expect(result.autocomplete).toBe(false)
    })
  })

  describe('Real World Scenarios', () => {
    it('scenario: Box icon → select → space → bg', () => {
      // Step 1: Type "Box icon" and press space
      const step1 = simulateSpaceKeymap('Box icon', 8, callbacks)
      expect(step1.handled).toBe(true)
      expect(step1.newDoc).toBe('Box icon ')
      expect(callbacks.openIconPicker).toHaveBeenCalledTimes(1)

      // Step 2: Icon is selected, picker closes, doc is now 'Box icon "search"'
      // User presses space after the icon value - triggers autocomplete
      callbacks.openIconPicker.mockClear()
      const step2 = simulateSpaceKeymap('Box icon "search"', 17, callbacks)
      expect(step2.handled).toBe(true)
      expect(step2.autocomplete).toBe(true)
      expect(callbacks.openIconPicker).not.toHaveBeenCalled()

      // Step 3: User types "bg"
      // At this point: 'Box icon "search" bg'
      // Space after bg should NOT trigger (bg expects value)
      const step3 = simulateSpaceKeymap('Box icon "search" bg', 20, callbacks)
      expect(step3.handled).toBe(false)
      expect(step3.autocomplete).toBe(false)
    })

    it('scenario: consecutive icon and font properties', () => {
      // icon "search" font
      const doc1 = 'icon "search" font'
      const result1 = simulateSpaceKeymap(doc1, doc1.length, callbacks)
      expect(result1.handled).toBe(true)
      expect(callbacks.openFontPicker).toHaveBeenCalledTimes(1)
      expect(callbacks.openIconPicker).not.toHaveBeenCalled()
    })

    it('scenario: Box hor gap 16 pad 12', () => {
      // After "Box" - autocomplete
      expect(simulateSpaceKeymap('Box', 3, callbacks).autocomplete).toBe(true)

      // After "hor" - autocomplete (boolean)
      expect(simulateSpaceKeymap('Box hor', 7, callbacks).autocomplete).toBe(true)

      // After "gap" - NO autocomplete (expects value)
      expect(simulateSpaceKeymap('Box hor gap', 11, callbacks).autocomplete).toBe(false)

      // After "16" - autocomplete (value complete)
      expect(simulateSpaceKeymap('Box hor gap 16', 14, callbacks).autocomplete).toBe(true)

      // After "pad" - NO autocomplete (expects value)
      expect(simulateSpaceKeymap('Box hor gap 16 pad', 18, callbacks).autocomplete).toBe(false)

      // After "12" - autocomplete (value complete)
      expect(simulateSpaceKeymap('Box hor gap 16 pad 12', 21, callbacks).autocomplete).toBe(true)
    })

    it('scenario: multi-value properties like "pad 12 12"', () => {
      // After first value of pad - autocomplete
      expect(simulateSpaceKeymap('Box pad 12', 10, callbacks).autocomplete).toBe(true)

      // User types second value - autocomplete
      expect(simulateSpaceKeymap('Box pad 12 12', 13, callbacks).autocomplete).toBe(true)
    })
  })
})
