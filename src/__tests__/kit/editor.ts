/**
 * Editor Test Utilities
 *
 * Re-exports editor testing utilities for use in the test kit.
 * Provides mock editors, spies, and simulation helpers.
 *
 * Usage:
 * ```typescript
 * import { createTestEditor, createMockEditorView } from './kit'
 *
 * const editor = createTestEditor({ doc: 'Box\n  Text' })
 * editor.simulateTyping('#')
 * expect(editor.getSpies().onDispatch).toHaveBeenCalled()
 * ```
 */

// Re-export from editor test utilities
export {
  // Test editor with spies
  TestEditor,
  createTestEditor,
  createTestEditorRef,

  // Mock CodeMirror-like view
  createMockEditorView,
  createMockEditorViewRef,

  // Types
  type TestEditorConfig,
  type EditorSpies,
  type MockEditorViewLike,
} from '../../editor/test-utils'

// Re-export base mock editor
export {
  MockEditor,
  MockEditorFactory,
  createMockEditor,
} from '../../editor/mock-editor'

// Re-export types for convenience
export type {
  IEditor,
  IEditorFactory,
  EditorRange,
  LineInfo,
  ScreenCoords,
  DispatchOptions,
} from '../../editor/types'
