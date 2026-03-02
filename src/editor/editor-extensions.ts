/**
 * Editor Extensions Factory
 *
 * Creates CodeMirror extensions for the DSL editor.
 * Centralizes extension configuration for consistency and testability.
 */

import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState, type Extension } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { indentUnit } from '@codemirror/language'
import { dslTheme, dslHighlighter } from './dsl-syntax'
import { dslAutocomplete, type DSLAutocompleteOptions } from './dsl-autocomplete'
import type { ValuePickerType } from '../data/dsl-properties'
import { createEditorKeymaps, type KeymapConfig } from './keymaps'
import { createPanelKeymap, type PanelKeymapConfig } from './panel-keymap'
import { createNumberScrubbingKeymap } from './number-scrubbing'
import { createSemanticSelectionExtension } from './semantic-selection'
import { createColorSwatchPlugin, type ColorSwatchConfig } from './color-swatches'
import { createDoubleClickPickerExtension, type DoubleClickPickerConfig } from './double-click-picker'
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

  /** Double-click picker configuration (optional) */
  doubleClickPickerConfig?: DoubleClickPickerConfig
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
 *   keymapConfig: { callbacks },
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
    doubleClickPickerConfig,
  } = config

  const extensions: Extension[] = []

  // Indentation: 2 spaces (not tabs)
  extensions.push(indentUnit.of('  '))
  extensions.push(EditorState.tabSize.of(2))

  // History for undo/redo
  extensions.push(history())
  extensions.push(keymap.of(historyKeymap))

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

  // Editor keymaps (triggers, shortcuts) - MUST come before autocomplete
  extensions.push(...createEditorKeymaps(keymapConfig))

  // DSL autocomplete
  extensions.push(dslAutocomplete(autocompleteOptions))

  // Default keymaps (Tab is handled by createSmartTabKeymap in multiline-indent.ts)
  extensions.push(keymap.of(defaultKeymap))

  // DSL syntax highlighting
  extensions.push(dslTheme)
  extensions.push(dslHighlighter)

  // Color swatches (inline color previews)
  if (colorSwatchConfig) {
    extensions.push(createColorSwatchPlugin(colorSwatchConfig))
  }

  // Double-click picker (open picker when double-clicking on color/icon/font)
  if (doubleClickPickerConfig) {
    extensions.push(createDoubleClickPickerExtension(doubleClickPickerConfig))
  }

  // Update listener for document changes
  extensions.push(createUpdateListener(onDocChange))

  return extensions
}

/**
 * Options for minimal editor extensions.
 */
export interface MinimalExtensionsOptions {
  /** Function to get design tokens for token autocomplete (e.g., $primary.bg) */
  getDesignTokens?: () => Map<string, unknown>
  /** Function to get user-defined component names for < trigger autocomplete */
  getUserDefinedComponents?: () => string[]
  /** Callback when a value picker is needed (e.g., after typing #) */
  onValuePickerNeeded?: (picker: ValuePickerType, property?: string) => void
  /** Return true to suppress autocomplete (e.g., when a picker is open) */
  isAutocompleteSuppressed?: () => boolean
  /** Double-click picker configuration (optional) */
  doubleClickPickerConfig?: DoubleClickPickerConfig
}

/**
 * Create minimal editor extensions for testing or simple use cases.
 * Includes autocomplete for basic property suggestions.
 */
export function createMinimalExtensions(options: MinimalExtensionsOptions = {}): Extension[] {
  const extensions: Extension[] = [
    indentUnit.of('  '),
    EditorState.tabSize.of(2),
    history(),
    keymap.of(historyKeymap),
    dslTheme,
    dslHighlighter,
    dslAutocomplete({
      // Pass through design tokens getter for $ autocomplete
      getDesignTokens: options.getDesignTokens,
      // Pass through user-defined components for < trigger autocomplete
      getUserDefinedComponents: options.getUserDefinedComponents,
      // Pass through value picker callback
      onValuePickerNeeded: options.onValuePickerNeeded,
      // Pass through suppression check
      isAutocompleteSuppressed: options.isAutocompleteSuppressed,
    }),
    keymap.of(defaultKeymap),
  ]

  // Double-click picker (open picker when double-clicking on color/icon/font)
  if (options.doubleClickPickerConfig) {
    extensions.push(createDoubleClickPickerExtension(options.doubleClickPickerConfig))
  }

  return extensions
}
