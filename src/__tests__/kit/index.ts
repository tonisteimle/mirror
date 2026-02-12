/**
 * Test Kit - Centralized UI Testing Utilities
 *
 * Usage:
 * ```typescript
 * import { componentTest, editorPanelProps, setupMocks } from './kit'
 *
 * setupMocks()
 *
 * const test = componentTest(EditorPanel, editorPanelProps, {
 *   providers: { EditorActions: editorActionsContext() }
 * })
 *
 * describe('EditorPanel', () => {
 *   // Declarative rendering tests
 *   test.shouldRender(['Page', 'Components', 'Tokens'])
 *   test.shouldRenderTitles(['Clear', 'Extract'])
 *
 *   // Click behavior tests
 *   test.clicking('Page').calls('onTabChange', 'layout')
 *
 *   // Conditional rendering tests
 *   test.when({ activeTab: 'layout' }).editorHasValue('Box')
 *   test.whenNotRendered({ isOpen: false }).describe('hidden when closed')
 *
 *   // Keyboard interaction tests
 *   test.pressing('Escape').calls('onClose')
 *   test.pressing('s', { ctrl: true }).on('editor').calls('onSave')
 *
 *   // Async behavior tests
 *   test.async.afterClicking('Submit').shows('Success')
 *   test.async.afterClicking('Delete').hides('Item')
 * })
 * ```
 */

// AST Builders for parser/generator tests
export {
  // Token builders
  createToken,
  token,
  // AST node builders
  createASTNode,
  createConditionalNode,
  createIteratorNode,
  createTextNode,
  createComponentTemplate,
  // Condition builders
  varCondition,
  notCondition,
  andCondition,
  orCondition,
  compareCondition,
  // Style mixin builders
  createStyleMixin,
  // Parser context builders
  createContextFromSource,
  createContextFromTokens,
  createContextWithRegistry,
} from './ast-builders'

// Mocks
export { setupMocks, resetMocks, mocks } from './mocks'

// Factories
export {
  createProps,
  editorPanelProps,
  editorActionsContext,
  colorPickerProps,
  errorDialogProps,
  pageSidebarProps,
  headerBarProps,
  promptPanelProps,
  tokenPickerProps,
  basePickerProps,
} from './factories'

// Render utilities
export { renderWithProviders, createRenderer } from './render'

// Test builder
export { componentTest } from './builder'

// Editor test utilities
export {
  // Test editor with spies
  TestEditor,
  createTestEditor,
  createTestEditorRef,
  // Mock CodeMirror-like view
  createMockEditorView,
  createMockEditorViewRef,
  // Base mock editor
  MockEditor,
  MockEditorFactory,
  createMockEditor,
  // Types
  type TestEditorConfig,
  type EditorSpies,
  type MockEditorViewLike,
  type IEditor,
  type IEditorFactory,
} from './editor'

// Re-export testing-library for convenience
export { screen, fireEvent, within, waitFor } from '@testing-library/react'
export { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
