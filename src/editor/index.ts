/**
 * Editor Module
 *
 * Provides a unified interface for code editors with a CodeMirror implementation.
 * The IEditor interface enables potential future editor switches and easier testing.
 *
 * Usage:
 * ```typescript
 * import { IEditor, CodeMirrorFactory, wrapCodeMirror } from './editor'
 *
 * // Create a new editor
 * const factory = new CodeMirrorFactory(baseExtensions)
 * const editor = factory.create({ parent: element, doc: initialCode })
 *
 * // Or wrap an existing CodeMirror view
 * const editor = wrapCodeMirror(existingView)
 *
 * // Use the editor through the interface
 * const content = editor.getContent()
 * editor.insert('Hello')
 * editor.focus()
 * ```
 */

// Types
export type {
  IEditor,
  IEditorFactory,
  EditorOptions,
  EditorPosition,
  EditorRange,
  LineInfo,
  ScreenCoords,
  DispatchOptions,
  EditorRef,
  EditorAdapter,
} from './types'

// Adapter utilities
export { createEditorAdapter } from './types'

// CodeMirror implementation
export {
  CodeMirrorEditor,
  CodeMirrorFactory,
  wrapCodeMirror,
  isCodeMirrorEditor,
  getCodeMirrorView,
  createCodeMirrorAdapter,
} from './codemirror-adapter'

// Mock implementation for testing
export {
  MockEditor,
  MockEditorFactory,
  createMockEditor,
} from './mock-editor'

// DSL-specific extensions
export { dslTheme, dslHighlighter } from './dsl-syntax'
export { dslAutocomplete } from './dsl-autocomplete'
export { createEditorKeymaps } from './keymaps'
export type { KeymapCallbacks, KeymapConfig } from './keymaps'
export { createPanelKeymap } from './panel-keymap'
export type { PanelKeymapConfig } from './panel-keymap'

// Editor extensions factory
export { createEditorExtensions, createMinimalExtensions } from './editor-extensions'
export type { EditorExtensionsConfig } from './editor-extensions'

// Color swatches
export { createColorSwatchPlugin } from './color-swatches'
export type { ColorSwatchConfig } from './color-swatches'

// Constants
export {
  TRIGGER_DELAY_MS,
  PICKER_OPEN_DELAY_MS,
  FOCUS_RETURN_DELAY_MS,
  SEARCH_DEBOUNCE_MS,
  FUZZY_SCORE_CACHE_SIZE,
  MAX_AUTOCOMPLETE_OPTIONS,
} from './constants'
