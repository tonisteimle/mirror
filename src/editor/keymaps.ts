/**
 * CodeMirror keymap configurations for the DSL editor.
 * Extracted from PromptPanel.tsx for better organization and testability.
 */
import { keymap, EditorView } from '@codemirror/view'
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
import { getExpansionAtCursor } from './shorthand-expansion'

// Properties that expect a value after them - don't trigger autocomplete
// Note: 'font' is excluded as it has a special picker handler
const VALUE_EXPECTING_PROPERTIES = new Set([
  ...COLOR_PROPERTIES,
  ...NUMBER_PROPERTIES,
  ...Array.from(STRING_PROPERTIES).filter(p => p !== 'font'),
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
  /** Whether to expand shorthand to long form (e.g., p → padding). Default: true */
  getExpandShorthand?: () => boolean
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
 * '/' at line start now begins NL prompt mode (no command palette)
 * Command palette can be opened with Cmd+Shift+P or similar
 */
export function createSlashKeymap(_callbacks: KeymapCallbacks): Extension {
  // Slash at line start is now used for NL prompt mode
  // Let the character be inserted normally
  return keymap.of([])
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
 * Space after shorthand expands it (e.g., "p" → "padding", "bg" → "background").
 * Space after 'font' triggers the font picker automatically.
 * Space after boolean properties (hor, ver, full, etc.) triggers autocomplete.
 * Space after a value (e.g., "search", #FF0000, 12) triggers autocomplete.
 * Space after value-expecting properties (pad, bg, col, etc.) does NOT trigger.
 */
export function createSpaceKeymap(config: KeymapConfig): Extension {
  const { callbacks } = config

  return keymap.of([{
    key: ' ',
    run: (view: EditorView) => {
      const pos = view.state.selection.main.head
      const line = view.state.doc.lineAt(pos)
      const textBefore = line.text.slice(0, pos - line.from)

      // Don't trigger inside strings
      if (isInsideString(textBefore)) return false

      // Check for shorthand expansion (p → pad/padding, bg → background, etc.)
      // Always expand, but to different forms based on mode:
      // - Long mode (default): p → padding
      // - Short mode: p → pad
      const toLongForm = config.getExpandShorthand?.() ?? true
      const expansion = getExpansionAtCursor(textBefore, textBefore.length, toLongForm)
      if (expansion) {
        // Replace the shorthand with the expanded form and add space
        const lineStart = line.from
        view.dispatch({
          changes: {
            from: lineStart + expansion.start,
            to: lineStart + expansion.end,
            insert: expansion.expanded + ' '
          },
          selection: { anchor: lineStart + expansion.start + expansion.expanded.length + 1 }
        })
        return true
      }

      // Check if we just typed "font" (with word boundary)
      if (/\bfont$/.test(textBefore)) {
        insertSpaceAndTrigger(view, callbacks.openFontPicker)
        return true
      }

      // Extract the last word (property or value)
      const lastWord = textBefore.match(/\b([\w-]+)$/)?.[1]

      // If the last word is a property that expects a value, don't trigger autocomplete
      // Let the user type the value with normal space handling
      if (lastWord && VALUE_EXPECTING_PROPERTIES.has(lastWord)) {
        return false
      }

      // Otherwise: just insert space (autocomplete disabled temporarily)
      return false
    }
  }])
}

/**
 * Creates the hash (#) input handler for opening the color picker.
 * Uses EditorView.inputHandler instead of keymap for cross-browser compatibility
 * (Safari handles Option+3 differently than Chrome for '#').
 */
export function createHashKeymap(openColorPicker: () => void): Extension {
  return EditorView.inputHandler.of((view, from, to, text) => {
    // Only handle '#' character
    if (text !== '#') return false

    const line = view.state.doc.lineAt(from)
    const textBefore = line.text.slice(0, from - line.from)

    // Don't trigger inside strings
    if (isInsideString(textBefore)) return false

    // M8 fix: If text is selected (from !== to), don't open picker
    // Just let the character replace the selection normally
    if (from !== to) return false

    // Insert # character
    view.dispatch({
      changes: { from, to, insert: '#' },
      selection: { anchor: from + 1 }
    })

    // Open color picker after short delay
    setTimeout(openColorPicker, PICKER_OPEN_DELAY_MS)
    return true
  })
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

// Re-export smart indent keymaps for convenience
export { createSmartEnterKeymap, createSmartTabKeymap, createMultilineIndentKeymaps } from './multiline-indent'

/**
 * Configuration for NL Mode Enter keymap
 */
export interface NLModeConfig {
  /** Whether NL mode is currently enabled */
  isEnabled: () => boolean
  /** Callback when a prompt block should be translated */
  onTranslate: (lineIndex: number, content: string, allLines: string[]) => void
}

/**
 * Get the indentation string from the current line.
 * Returns leading whitespace (spaces/tabs).
 */
function getLineIndent(view: EditorView, pos: number): string {
  const line = view.state.doc.lineAt(pos)
  const lineText = line.text
  const match = lineText.match(/^(\s*)/)
  return match ? match[1] : ''
}

/**
 * Insert newline while preserving indentation from current line.
 */
function insertNewlineWithIndent(view: EditorView): void {
  const { from, to } = view.state.selection.main
  const indent = getLineIndent(view, from)

  view.dispatch({
    changes: { from, to, insert: '\n' + indent },
    selection: { anchor: from + 1 + indent.length }
  })
}

/**
 * Find the NL prompt block starting with "/" that contains the current position.
 * Returns null if not inside an NL block.
 */
function findNLBlock(view: EditorView, pos: number): {
  startLine: number
  endLine: number
  content: string
  blockStartPos: number
  blockEndPos: number
} | null {
  const doc = view.state.doc
  const currentLine = doc.lineAt(pos)
  let startLineNum = -1

  // Check if current line starts with /
  if (/^\s*\//.test(currentLine.text)) {
    startLineNum = currentLine.number
  } else {
    // Search backwards for a line starting with /
    for (let lineNum = currentLine.number - 1; lineNum >= 1; lineNum--) {
      const line = doc.line(lineNum)
      const text = line.text

      // Empty line breaks the block
      if (text.trim() === '') {
        return null
      }

      // Found the / start
      if (/^\s*\//.test(text)) {
        startLineNum = lineNum
        break
      }
    }
  }

  if (startLineNum === -1) {
    return null
  }

  // Collect all lines in the block (from / to current line)
  const lines: string[] = []
  const startLine = doc.line(startLineNum)
  const blockStartPos = startLine.from
  const blockEndPos = currentLine.to

  for (let lineNum = startLineNum; lineNum <= currentLine.number; lineNum++) {
    const line = doc.line(lineNum)
    let text = line.text

    // Remove the leading / from the first line
    if (lineNum === startLineNum) {
      text = text.replace(/^(\s*)\/\s?/, '$1')
    }

    lines.push(text)
  }

  return {
    startLine: startLineNum - 1, // 0-indexed
    endLine: currentLine.number - 1, // 0-indexed
    content: lines.join('\n').trim(),
    blockStartPos,
    blockEndPos,
  }
}

/**
 * Creates the NL Mode Enter keymap.
 * - "/" at line start begins NL prompt mode (no autocomplete)
 * - Enter sends the entire block (from "/" to cursor) to LLM
 * - Shift+Enter inserts newline (continues the block)
 */
export function createNLModeEnterKeymap(config: NLModeConfig): Extension {
  return keymap.of([
    // Shift+Enter: Just insert newline, stay in NL block
    {
      key: 'Shift-Enter',
      run: (view: EditorView) => {
        const pos = view.state.selection.main.head
        const block = findNLBlock(view, pos)

        // Only handle if we're inside an NL block
        if (!block) {
          return false
        }

        // Insert newline with indent (continues the NL block)
        insertNewlineWithIndent(view)
        return true
      }
    },
    // Enter: Send the NL block to LLM
    {
      key: 'Enter',
      run: (view: EditorView) => {
        // Check if we're inside an NL block (starts with /)
        const pos = view.state.selection.main.head
        const block = findNLBlock(view, pos)

        if (!block) {
          // Not in NL block - check if old NL mode behavior should apply
          if (!config.isEnabled()) {
            return false
          }

          // Legacy behavior: translate current line
          const line = view.state.doc.lineAt(pos)
          const lineContent = line.text
          const lineIndex = line.number - 1

          const allLines: string[] = []
          for (let i = 1; i <= view.state.doc.lines; i++) {
            allLines.push(view.state.doc.line(i).text)
          }

          config.onTranslate(lineIndex, lineContent, allLines)
          insertNewlineWithIndent(view)
          return true
        }

        // We're in an NL block - send the whole block
        console.log('[NL Block] Sending prompt:', block.content)

        // Get all lines for context
        const allLines: string[] = []
        for (let i = 1; i <= view.state.doc.lines; i++) {
          allLines.push(view.state.doc.line(i).text)
        }

        // Trigger translation with the block content
        // lineIndex points to where the block started (for insertion)
        config.onTranslate(block.startLine, block.content, allLines)

        // Delete the NL block (it will be replaced by generated code)
        view.dispatch({
          changes: { from: block.blockStartPos, to: block.blockEndPos, insert: '' },
          selection: { anchor: block.blockStartPos }
        })

        return true
      }
    }
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
    ...createMultilineIndentKeymaps(), // Smart Enter + Tab for multiline strings
    createColorPickerKeymap(callbacks.openColorPicker),
  ]
}
