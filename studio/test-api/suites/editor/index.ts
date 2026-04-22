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
} from '../bidirectional-tests'

export {
  allUndoRedoTests,
  basicUndoTests,
  basicRedoTests,
  undoEditTypesTests,
  undoWithSelectionTests,
  undoEdgeCasesTests,
} from '../undo-redo-tests'

export { allAutocompleteTests } from '../autocomplete-tests'

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
