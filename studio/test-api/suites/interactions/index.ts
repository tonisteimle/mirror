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
  focusManagementTests,
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
export { componentExtractTests } from './component-extract.test'
export { batchReplaceTests } from './batch-replace.test'

export {
  resizeHandleDragTests,
  resizeDragEdgeTests,
  resizeDragCornerTests,
  resizeDragSelectionTests,
  resizeDragLivePreviewTests,
  resizeDragContextTests,
  resizeDragEdgeCaseTests,
  resizeDragAccuracyTests,
  resizeDragFullSizeTests,
} from './resize-handle-drag.test'

export {
  allMultiselectTests,
  shiftClickTests,
  metaClickTests,
  clearSelectionTests,
  cssClassTests,
} from './multiselect.test'

export {
  allEditorMultiselectTests,
  basicEditorMultiselectTests,
  parentChildFilterTests,
  singleLineTests,
} from './editor-multiselect.test'

export {
  allPaddingTests,
  singleSidePaddingTests,
  allSidesPaddingTests,
  axisPaddingTests,
  liveVisualFeedbackTests,
  robustnessTests,
} from './padding.test'

export {
  allMarginTests,
  singleSideMarginTests,
  allSidesMarginTests,
  axisMarginTests,
  liveVisualFeedbackTests as marginVisualFeedbackTests,
  robustnessTests as marginRobustnessTests,
  marginScreenshotTests,
} from './margin.test'

export {
  allMarginHandlerTests,
  marginModeToggleTests,
  marginHandlePositionTests,
  marginHandleDragTests,
  marginModeSelectionTests,
} from './margin-handlers.test'

export {
  allGapHandlerTests,
  gapModeToggleTests,
  gapModeSwitchingTests,
  gapHandleDirectionTests,
  gapHandleCountTests,
  gapHandlePositionTests,
  gapHandleDragTests,
  gapModeSelectionTests,
  gapValueTests,
  nestedContainerTests,
} from './gap-handlers.test'

export {
  allWrapLayoutTests,
  hKeyBehaviorTests,
  vKeyBehaviorTests,
  selectionTransitionTests,
  nestedElementTests,
  gapCalculationTests,
  edgeCaseTests,
} from './wrap-layout.test'

export {
  allUngroupTests,
  basicUngroupTests,
  cannotUngroupTests,
  nestedUngroupTests,
  childPreservationTests,
  groupUngroupCycleTests,
  selectionAfterUngroupTests,
  modifierTests as ungroupModifierTests,
  emptyLineTests as ungroupEmptyLineTests,
} from './ungroup.test'

export {
  allSpreadToggleTests,
  basicSpreadTests,
  containerTypeTests as spreadContainerTests,
  edgeCaseTests as spreadEdgeCaseTests,
  modifierTests as spreadModifierTests,
  combinedTests as spreadCombinedTests,
} from './spread-toggle.test'

export {
  allSnappingTests,
  snappingDiagnosticTests,
  paddingTokenSnappingTests,
  marginTokenSnappingTests,
  gapTokenSnappingTests,
  resizeGridSnappingTests,
  snappingBypassTests,
  snapIndicatorTests,
  gridSnappingFallbackTests,
  tokenPriorityTests,
} from './snapping.test'

// Validation Tests (B3.1) - Deep DOM/CSS validation
export {
  allValidationTests,
  spreadCssTests,
  ungroupDomTests,
  selectionUndoRedoTests,
  multiselectVisualTests,
} from './validation.test'

export {
  allKeyboardEditingTests,
  insertElementTests,
  paddingArrowTests,
  marginGapArrowTests,
  spacingModeEscTests,
  spacingUndoCoalescingTests,
} from './keyboard-editing.test'
