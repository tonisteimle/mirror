/**
 * Editor Test Suite Index
 *
 * Consolidates all editor-related tests:
 * - Bidirectional sync (code ↔ preview)
 * - Undo/Redo
 * - Autocomplete
 * - Indentation (indent guides, smart paste, block indent)
 */

// Re-export from existing test files
export {
  allBidirectionalTests,
  codeToPreviewTests,
  selectionSyncTests,
  sourceMapTests,
  propertyPanelTests as bidirectionalPropertyTests,
  complexSyncTests,
  errorRecoveryTests,
} from '../bidirectional'

export {
  allUndoRedoTests,
  basicUndoTests,
  basicRedoTests,
  undoEditTypesTests,
  undoWithSelectionTests,
  undoEdgeCasesTests,
} from '../undo-redo'

export { allAutocompleteTests } from '../autocomplete'

export { allSyncTests } from '../sync-tests'

// New indentation tests
export {
  allIndentationTests,
  indentGuidesTests,
  smartPasteTests,
  blockIndentTests,
  tabIndentTests,
  indentationEdgeCases,
} from './indentation.test'

// Editor drop tests (drag components into CodeMirror)
export {
  allEditorDropTests,
  editorDropMirTemplateTests,
  editorDropPrimitiveTests,
  editorDropLayoutTests,
  editorDropCombinationTests,
  editorDropRegressionTests,
} from './editor-drop.test'

// Linter tests (code validation)
export {
  allLinterTests,
  unknownPropertyTests,
  undefinedTokenTests,
  lintUITests,
  lintEdgeCases,
} from './linter.test'
