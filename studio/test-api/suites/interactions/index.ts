/**
 * Interactions Test Suite Index
 *
 * Re-exports from the existing interactions-tests.ts file.
 * TODO: Split into separate files when needed.
 */

export {
  allInteractionTests,
  clickTests,
  hoverTests,
  toggleTests,
  focusTests,
  inputTests,
  keyboardTests,
  selectionTests,
  dragDropTests,
  combinedTests,
} from '../interaction-tests'

export {
  allLayoutShortcutTests,
  horizontalLayoutTests,
  verticalLayoutTests,
  fullDimensionTests,
  combinedShortcutTests,
} from './layout-shortcuts.test'

export {
  allResizeHandleDblClickTests,
  horizontalHandleTests,
  verticalHandleTests,
  cornerHandleTests,
} from './resize-handle-dblclick.test'

export {
  allPaddingHandlerTests,
  paddingModeToggleTests,
  paddingHandlePositionTests,
  paddingHandleDragTests,
  paddingModeSelectionTests,
} from './padding-handlers.test'

export { tokenExtractTests } from './token-extract.test'

export {
  resizeHandleDragTests,
  resizeDragEdgeTests,
  resizeDragCornerTests,
  resizeDragSelectionTests,
  resizeDragLivePreviewTests,
  resizeDragContextTests,
  resizeDragEdgeCaseTests,
  resizeDragAccuracyTests,
} from './resize-handle-drag.test'

export {
  allMultiselectTests,
  shiftClickTests,
  metaClickTests,
  clearSelectionTests,
  cssClassTests,
} from './multiselect.test'

export {
  allPaddingTests,
  singleSidePaddingTests,
  allSidesPaddingTests,
  axisPaddingTests,
  liveVisualFeedbackTests,
  robustnessTests,
} from './padding.test'
