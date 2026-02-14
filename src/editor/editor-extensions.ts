/**
 * Editor Extensions Factory
 *
 * Creates CodeMirror extensions for the DSL editor.
 * Centralizes extension configuration for consistency and testability.
 */

import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { dslTheme, dslHighlighter } from './dsl-syntax'
import { dslAutocomplete, type DSLAutocompleteOptions } from './dsl-autocomplete'
import { createEditorKeymaps, type KeymapConfig } from './keymaps'
import { createPanelKeymap, type PanelKeymapConfig } from './panel-keymap'
import { createNumberScrubbingKeymap } from './number-scrubbing'
import { createSemanticSelectionExtension } from './semantic-selection'
import { createColorSwatchPlugin, type ColorSwatchConfig } from './color-swatches'
// Ghost suggestions removed - using contextual autocomplete boost instead

/**
 * Configuration for creating editor extensions.
 */
export interface EditorExtensionsConfig {
  /** Keymap configuration for picker shortcuts */
  keymapConfig: KeymapConfig

  /** Panel navigation keymap configuration */
  panelKeymapConfig: PanelKeymapConfig

  /** Autocomplete options */
  autocompleteOptions: DSLAutocompleteOptions

  /** Callback for document changes */
  onDocChange?: (view: EditorView) => void

  /** Whether to include line numbers (default: false) */
  lineNumbers?: boolean

  /** Whether to highlight active line (default: true) */
  highlightActiveLine?: boolean

  /** Color swatch configuration (optional) */
  colorSwatchConfig?: ColorSwatchConfig
}

/**
 * Create the update listener extension for document changes.
 */
function createUpdateListener(onDocChange?: (view: EditorView) => void): Extension {
  return EditorView.updateListener.of((update) => {
    if (update.docChanged && onDocChange) {
      onDocChange(update.view)
    }
  })
}

/**
 * Create all editor extensions based on configuration.
 *
 * @param config - Extension configuration
 * @returns Array of CodeMirror extensions
 *
 * @example
 * ```ts
 * const extensions = createEditorExtensions({
 *   keymapConfig: { callbacks, getAutoCompleteMode, getCurrentTab, autoCompleteTimeoutRef },
 *   panelKeymapConfig: { getColorPanelState, setColorPanelState, getSelectedValue },
 *   autocompleteOptions: { onValuePickerNeeded, getDesignTokens },
 *   onDocChange: (view) => console.log('Changed:', view.state.doc.toString()),
 * })
 * ```
 */
export function createEditorExtensions(config: EditorExtensionsConfig): Extension[] {
  const {
    keymapConfig,
    panelKeymapConfig,
    autocompleteOptions,
    onDocChange,
    lineNumbers: showLineNumbers = false,
    highlightActiveLine: showHighlightActiveLine = true,
    colorSwatchConfig,
  } = config

  const extensions: Extension[] = []

  // Line numbers
  if (showLineNumbers) {
    extensions.push(lineNumbers())
  }

  // Active line highlighting
  if (showHighlightActiveLine) {
    extensions.push(highlightActiveLine())
    extensions.push(highlightActiveLineGutter())
  }

  // Panel navigation keymap (for color panel arrow key navigation)
  extensions.push(createPanelKeymap(panelKeymapConfig))

  // Number scrubbing keymap (Shift+Arrow to increment/decrement numbers)
  extensions.push(createNumberScrubbingKeymap())

  // Semantic selection (Alt+Click for intelligent selection)
  extensions.push(createSemanticSelectionExtension())

  // DSL autocomplete
  extensions.push(dslAutocomplete(autocompleteOptions))

  // Editor keymaps (triggers, shortcuts)
  extensions.push(...createEditorKeymaps(keymapConfig))

  // Default keymaps
  extensions.push(keymap.of([...defaultKeymap, indentWithTab]))

  // DSL syntax highlighting
  extensions.push(dslTheme)
  extensions.push(dslHighlighter)

  // Color swatches (inline color previews)
  if (colorSwatchConfig) {
    extensions.push(createColorSwatchPlugin(colorSwatchConfig))
  }

  // Update listener for document changes
  extensions.push(createUpdateListener(onDocChange))

  return extensions
}

/**
 * Create minimal editor extensions for testing or simple use cases.
 */
export function createMinimalExtensions(): Extension[] {
  return [
    dslTheme,
    dslHighlighter,
    keymap.of([...defaultKeymap, indentWithTab]),
  ]
}
