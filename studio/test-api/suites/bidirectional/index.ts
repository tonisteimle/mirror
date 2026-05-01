/**
 * Bidirectional Test Suite Index
 */

import type { TestCase } from '../../test-runner'
import { codeToPreviewTests } from './code-to-preview.test'
import { selectionSyncTests } from './selection-sync.test'
import { sourceMapTests } from './source-map.test'
import { propertyPanelTests } from './property-panel.test'
import { complexSyncTests } from './complex-sync.test'
import { errorRecoveryTests } from './error-recovery.test'

export {
  codeToPreviewTests,
  selectionSyncTests,
  sourceMapTests,
  propertyPanelTests,
  complexSyncTests,
  errorRecoveryTests,
}

export const allBidirectionalTests: TestCase[] = [
  ...codeToPreviewTests,
  ...selectionSyncTests,
  ...sourceMapTests,
  ...propertyPanelTests,
  ...complexSyncTests,
  ...errorRecoveryTests,
]
