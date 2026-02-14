/**
 * CodeMirror keymap configurations for the DSL editor.
 * Extracted from PromptPanel.tsx for better organization and testability.
 */
import { keymap } from '@codemirror/view'
import { insertNewline } from '@codemirror/commands'
import { startCompletion } from '@codemirror/autocomplete'
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
import {
  COLOR_PROPERTIES,
  NUMBER_PROPERTIES,
  STRING_PROPERTIES,
} from '../dsl/properties'
import { createMultilineIndentKeymaps } from './multiline-indent'

// Properties that expect a value after them - don't trigger autocomplete
// Note: 'font' and 'icon' are excluded as they have special picker handlers
const VALUE_EXPECTING_PROPERTIES = new Set([
  ...COLOR_PROPERTIES,
  ...NUMBER_PROPERTIES,
  ...Array.from(STRING_PROPERTIES).filter(p => p !== 'font' && p !== 'icon'),
])

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
 * Helper to insert space and trigger a callback after a delay.
 */
function insertSpaceAndTrigger(view: EditorView, trigger: () => void): void {
  const pos = view.state.selection.main.head
  view.dispatch({
    changes: { from: pos, to: pos, insert: ' ' },
    selection: { anchor: pos + 1 }
  })
  setTimeout(trigger, PICKER_OPEN_DELAY_MS)
}

/**
 * Creates the space keymap.
 * Space after 'font' or 'icon' triggers the appropriate picker automatically.
 * Space after boolean properties (hor, ver, full, etc.) triggers autocomplete.
 * Space after a value (e.g., "search", #FF0000, 12) triggers autocomplete.
 * Space after value-expecting properties (pad, bg, col, etc.) does NOT trigger.
 */
export function createSpaceKeymap(config: KeymapConfig): Extension {
  const { callbacks } = config

  return keymap.of([{
    key: ' ',
    run: (view: EditorView) => {
      const textBefore = getTextBeforeCursor(view)

      // Don't trigger inside strings
      if (isInsideString(textBefore)) return false

      // Check if we just typed "font" (with word boundary)
      if (/\bfont$/.test(textBefore)) {
        insertSpaceAndTrigger(view, callbacks.openFontPicker)
        return true
      }

      // Check if we just typed "icon" (with word boundary)
      if (/\bicon$/.test(textBefore)) {
        insertSpaceAndTrigger(view, callbacks.openIconPicker)
        return true
      }

      // Extract the last word (property or value)
      const lastWord = textBefore.match(/\b([\w-]+)$/)?.[1]

      // If the last word is a property that expects a value, don't trigger autocomplete
      // Let the user type the value with normal space handling
      if (lastWord && VALUE_EXPECTING_PROPERTIES.has(lastWord)) {
        return false
      }

      // Otherwise: trigger autocomplete
      // This covers:
      // - Boolean properties (hor, ver, full, cen, etc.)
      // - After values ("...", #FFF, 123, 50%)
      // - Component names and unknown words
      insertSpaceAndTrigger(view, () => startCompletion(view))
      return true
    }
  }])
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
 * @deprecated Use createSmartEnterKeymap from multiline-indent.ts instead
 */
export function createNoAutoIndentKeymap(): Extension {
  return keymap.of([
    { key: 'Enter', run: insertNewline },
  ])
}

// Re-export smart indent keymaps for convenience
export { createSmartEnterKeymap, createSmartTabKeymap, createMultilineIndentKeymaps } from './multiline-indent'

/**
 * Configuration for NL Mode Enter keymap
 */
export interface NLModeConfig {
  /** Whether NL mode is currently enabled */
  isEnabled: () => boolean
  /** Callback when a line should be translated */
  onTranslate: (lineIndex: number, content: string, allLines: string[]) => void
}

/**
 * Creates the NL Mode Enter keymap.
 * When NL mode is enabled, Enter triggers translation of the current line
 * before inserting a newline.
 */
export function createNLModeEnterKeymap(config: NLModeConfig): Extension {
  return keymap.of([{
    key: 'Enter',
    run: (view: EditorView) => {
      // If NL mode is not enabled, let other handlers process
      if (!config.isEnabled()) {
        return false
      }

      // Get current line info
      const pos = view.state.selection.main.head
      const line = view.state.doc.lineAt(pos)
      const lineContent = line.text
      const lineIndex = line.number - 1 // 0-indexed

      // Get all lines for context
      const allLines: string[] = []
      for (let i = 1; i <= view.state.doc.lines; i++) {
        allLines.push(view.state.doc.line(i).text)
      }

      // Trigger translation callback (async, handled externally)
      config.onTranslate(lineIndex, lineContent, allLines)

      // Insert newline immediately so user can continue typing
      insertNewline(view)
      return true
    }
  }])
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
    ...createMultilineIndentKeymaps(), // Smart Enter + Tab for multiline strings
    createColorPickerKeymap(callbacks.openColorPicker),
  ]
}
