/**
 * CodeMirror keymap configurations for the DSL editor.
 * Extracted from PromptPanel.tsx for better organization and testability.
 */
import { keymap } from '@codemirror/view'
import { insertNewline } from '@codemirror/commands'
import type { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import {
  EDITOR_PATTERNS,
  matchPropertyAtEnd,
  findPickerForTokenSection,
} from './property-picker-map'
import { isInsideString, getTextBeforeCursor } from './utils'
import { findPropertyContext } from './trigger-handlers'
import { PICKER_OPEN_DELAY_MS } from './constants'

// Types for keymap configuration
export interface KeymapCallbacks {
  openColorPicker: () => void
  openCommandPalette: (query?: string) => void
  openFontPicker: () => void
  openIconPicker: () => void
  openTokenPicker: (propertyContext?: string) => void  // Context-aware token picker
}

export interface KeymapConfig {
  callbacks: KeymapCallbacks
  getAutoCompleteMode: () => 'always' | 'delay' | 'off'
  getCurrentTab: () => string | undefined
  autoCompleteTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
}

// Helper: Map a property match to an opener function
function getPickerOpener(
  mapping: ReturnType<typeof matchPropertyAtEnd>,
  callbacks: KeymapCallbacks
): (() => void) | null {
  if (!mapping) return null

  const { picker } = mapping.mapping

  switch (picker) {
    case 'color':
      return callbacks.openColorPicker
    case 'font':
      return callbacks.openFontPicker
    case 'icon':
      return callbacks.openIconPicker
    default:
      return null
  }
}

/**
 * Creates the color picker keymap (Cmd+K / Ctrl+K)
 */
export function createColorPickerKeymap(openColorPicker: () => void): Extension {
  return keymap.of([{
    key: 'Mod-k',
    run: () => {
      openColorPicker()
      return true
    }
  }])
}


/**
 * Creates the question mark keymap for opening pickers
 * '?' after a property opens the appropriate picker
 */
export function createQuestionKeymap(callbacks: KeymapCallbacks): Extension {
  return keymap.of([{
    key: '?',
    run: (view: EditorView) => {
      const pos = view.state.selection.main.head
      const line = view.state.doc.lineAt(pos)
      const textBefore = line.text.slice(0, pos - line.from)

      // Check if after a property that has a picker (data-driven)
      const mapping = matchPropertyAtEnd(textBefore)
      if (mapping) {
        const openPickerFn = getPickerOpener(mapping, callbacks)
        if (openPickerFn) {
          openPickerFn()
          return true
        }
      }

      // Check if in tokens tab (after ":" in a token definition)
      if (EDITOR_PATTERNS.TOKEN_DEFINITION.test(textBefore)) {
        const doc = view.state.doc
        let lineNum = line.number
        let section = ''

        while (lineNum > 0) {
          const checkLine = doc.line(lineNum)
          const sectionMatch = checkLine.text.match(EDITOR_PATTERNS.SECTION_COMMENT)
          if (sectionMatch) {
            section = sectionMatch[1].trim()
            break
          }
          lineNum--
        }

        const sectionPicker = findPickerForTokenSection(section)
        if (sectionPicker) {
          switch (sectionPicker.picker) {
            case 'color':
              callbacks.openColorPicker()
              return true
            case 'font':
              callbacks.openFontPicker()
              return true
          }
        }
      }

      return false
    }
  }])
}

/**
 * Creates the slash keymap for command palette
 * '/' at line start opens command palette
 */
export function createSlashKeymap(callbacks: KeymapCallbacks): Extension {
  return keymap.of([{
    key: '/',
    run: (view: EditorView) => {
      const pos = view.state.selection.main.head
      const line = view.state.doc.lineAt(pos)
      const textBefore = line.text.slice(0, pos - line.from)

      // Only trigger at start of line or after whitespace
      // This prevents triggering when typing '//' for comments
      if (textBefore.length === 0 || /\s$/.test(textBefore)) {
        callbacks.openCommandPalette()
        return true
      }
      return false
    }
  }])
}

/**
 * Creates the space keymap.
 * Space no longer triggers pickers - use # for colors and $ for tokens instead.
 * Inline autocomplete handles property suggestions.
 */
export function createSpaceKeymap(_config: KeymapConfig): Extension {
  // Space now just inserts normally - no picker triggering
  // This lets autocomplete handle property suggestions
  return keymap.of([])
}

/**
 * Creates the hash (#) keymap for opening the color picker.
 * Inserts # and opens the color picker after a short delay.
 */
export function createHashKeymap(openColorPicker: () => void): Extension {
  return keymap.of([{
    key: '#',
    run: (view: EditorView) => {
      const textBefore = getTextBeforeCursor(view)

      // Don't trigger inside strings
      if (isInsideString(textBefore)) return false

      // Insert # character
      const pos = view.state.selection.main.head
      view.dispatch({
        changes: { from: pos, to: pos, insert: '#' },
        selection: { anchor: pos + 1 }
      })

      // Open color picker after short delay to let editor state settle
      setTimeout(openColorPicker, PICKER_OPEN_DELAY_MS)
      return true
    }
  }])
}

/**
 * Creates the dollar ($) keymap for opening the token picker.
 * Inserts $ and opens the token picker with property context.
 */
export function createDollarKeymap(openTokenPicker: (propertyContext?: string) => void): Extension {
  return keymap.of([{
    key: '$',
    run: (view: EditorView) => {
      const textBefore = getTextBeforeCursor(view)

      // Don't trigger inside strings
      if (isInsideString(textBefore)) return false

      // Find property context for filtering
      const propertyContext = findPropertyContext(textBefore)

      // Insert $ character
      const pos = view.state.selection.main.head
      view.dispatch({
        changes: { from: pos, to: pos, insert: '$' },
        selection: { anchor: pos + 1 }
      })

      // Open token picker with context after short delay to let editor state settle
      setTimeout(() => openTokenPicker(propertyContext), PICKER_OPEN_DELAY_MS)
      return true
    }
  }])
}

/**
 * Creates keymap to disable auto-indent on Enter
 */
export function createNoAutoIndentKeymap(): Extension {
  return keymap.of([
    { key: 'Enter', run: insertNewline },
  ])
}


/**
 * Creates all editor keymaps bundled together
 */
export function createEditorKeymaps(config: KeymapConfig): Extension[] {
  const { callbacks } = config

  return [
    createSpaceKeymap(config),
    createHashKeymap(callbacks.openColorPicker),
    createDollarKeymap(callbacks.openTokenPicker),
    createQuestionKeymap(callbacks),
    createSlashKeymap(callbacks),
    createNoAutoIndentKeymap(),
    createColorPickerKeymap(callbacks.openColorPicker),
  ]
}
