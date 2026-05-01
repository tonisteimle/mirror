/**
 * Undo/Redo Test Suite Index
 */

import type { TestCase } from '../../test-runner'
import { basicUndoTests } from './basic-undo.test'
import { basicRedoTests } from './basic-redo.test'
import { undoEditTypesTests } from './edit-types.test'
import { undoWithSelectionTests } from './with-selection.test'
import { undoEdgeCasesTests } from './edge-cases.test'

export {
  basicUndoTests,
  basicRedoTests,
  undoEditTypesTests,
  undoWithSelectionTests,
  undoEdgeCasesTests,
}

export const allUndoRedoTests: TestCase[] = [
  ...basicUndoTests,
  ...basicRedoTests,
  ...undoEditTypesTests,
  ...undoWithSelectionTests,
  ...undoEdgeCasesTests,
]
