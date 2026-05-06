/**
 * Synchronization Tests
 *
 * Editor ↔ Preview ↔ Property Panel sync, multi-directional changes,
 * rapid changes, edge cases, selection persistence, complex scenarios.
 */

import type { TestCase } from '../../test-runner'

export { editorToPreviewTests } from './editor-to-preview.test'
export { previewToEditorTests } from './preview-to-editor.test'
export { panelToEditorTests } from './panel-to-editor.test'
export { editorToPanelTests } from './editor-to-panel.test'
export { multiDirectionalTests } from './multi-directional.test'
export { rapidChangeTests } from './rapid-changes.test'
export { edgeCaseTests } from './edge-cases.test'
export { selectionPersistenceTests } from './selection-persistence.test'
export { complexScenarioTests } from './complex-scenarios.test'
export {
  cursorToSelectionTests,
  selectionToCursorTests,
  roundTripSyncTests,
  editPreservesSelectionTests,
  multiFileSyncTests,
} from './cursor-selection-sync.test'

import { editorToPreviewTests } from './editor-to-preview.test'
import { previewToEditorTests } from './preview-to-editor.test'
import { panelToEditorTests } from './panel-to-editor.test'
import { editorToPanelTests } from './editor-to-panel.test'
import { multiDirectionalTests } from './multi-directional.test'
import { rapidChangeTests } from './rapid-changes.test'
import { edgeCaseTests } from './edge-cases.test'
import { selectionPersistenceTests } from './selection-persistence.test'
import { complexScenarioTests } from './complex-scenarios.test'
import {
  cursorToSelectionTests,
  selectionToCursorTests,
  roundTripSyncTests,
  editPreservesSelectionTests,
  multiFileSyncTests,
} from './cursor-selection-sync.test'

export const allSyncTests: TestCase[] = [
  ...editorToPreviewTests,
  ...previewToEditorTests,
  ...panelToEditorTests,
  ...editorToPanelTests,
  ...multiDirectionalTests,
  ...rapidChangeTests,
  ...edgeCaseTests,
  ...selectionPersistenceTests,
  ...complexScenarioTests,
  ...cursorToSelectionTests,
  ...selectionToCursorTests,
  ...roundTripSyncTests,
  ...editPreservesSelectionTests,
  ...multiFileSyncTests,
]
