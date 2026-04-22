/**
 * Test Suites Index
 *
 * Exports all test suites for easy import.
 *
 * NEW: Use consolidated categories for simpler test execution:
 *   npm run test:browser -- --category=layout
 *   npm run test:browser -- --category=components
 *
 * Legacy usage still supported:
 *   import { allTests, runAllTests } from './suites'
 *   __mirrorTest.run(allTests)
 *
 * Or run specific suites:
 *   import { allPrimitivesTests, allLayoutTests } from './suites'
 *   __mirrorTest.run(allPrimitivesTests, 'Primitives')
 */

// =============================================================================
// CONSOLIDATED CATEGORIES (17 main categories)
// =============================================================================
export {
  // Categories
  coreTests,
  layoutTests as layoutCategoryTests,
  stylingTests as stylingCategoryTests,
  visualsTests,
  statesTests,
  componentsTests,
  dragTests,
  handlesTests,
  selectionTests,
  propertyPanelTests as propertyPanelCategoryTests,
  editorTests,
  dataTests,
  projectTests as projectCategoryTests,
  compilerTests as compilerCategoryTests,
  aiTests,
  tutorialTests as tutorialCategoryTests,
  stressAndIntegrationTests,
  // Registry
  categories,
  type CategoryName,
  type CategoryInfo,
  getCategory,
  getCategoryCounts,
  listCategories,
  allCategoryTests,
} from './categories'

// =============================================================================
// Imports from New Directory Structure
// =============================================================================

// Primitives (fully migrated)
import {
  allPrimitivesTests,
  basicPrimitives,
  semanticPrimitives,
  headingPrimitives,
  primitiveDefaultsTests,
} from './primitives'

// Layout (fully migrated)
import {
  allLayoutTests,
  directionTests,
  alignmentTests,
  distributionTests,
  gapTests,
  wrapTests,
  flexTests,
  stackedTests,
  gridTests,
  nestingTests,
  complexLayoutTests,
  // Extended Layout Tests (B3.3)
  allExtendedLayoutTests,
  minMaxWidthTests,
  minMaxHeightTests,
  gridPositionTests,
  rowHeightTests,
  gapXYTests,
} from './layout'

// Styling (fully migrated)
import {
  allStylingTests,
  colorTests,
  sizingTests,
  spacingTests,
  borderTests,
  typographyTests,
  effectTests,
  visibilityTests,
  combinedTests as stylingCombinedTests,
  // Extended Styling Tests (B3.2)
  allExtendedStylingTests,
  rgbaColorTests,
  hexAlphaTests,
  perSidePaddingTests,
  perSideMarginTests,
  perSideBorderTests,
  shadowValidationTests,
} from './styling'

// Zag (fully migrated)
import {
  allZagTests,
  checkboxTests,
  switchTests,
  sliderTests,
  selectTests,
  radioGroupTests,
  dialogTests,
  tooltipTests,
  tabsTests,
  datePickerTests,
  sidenavTests,
  zagInLayoutTests,
} from './zag'

// Pure Mirror Select (new)
import { pureSelectTests } from './pure-select.test'

// =============================================================================
// Imports from Legacy Files (via proxy index files)
// =============================================================================

// Interactions
import {
  allInteractionTests,
  clickTests,
  hoverTests,
  toggleTests,
  focusTests,
  inputTests,
  keyboardTests,
  selectionTests,
  dragDropTests,
  combinedTests as interactionCombinedTests,
  allLayoutShortcutTests,
  allResizeHandleDblClickTests,
  horizontalHandleTests,
  verticalHandleTests,
  cornerHandleTests,
  allPaddingHandlerTests,
  paddingModeToggleTests,
  paddingHandlePositionTests,
  paddingHandleDragTests,
  paddingModeSelectionTests,
  tokenExtractTests,
  resizeHandleDragTests,
  allMultiselectTests,
  shiftClickTests,
  metaClickTests,
  clearSelectionTests,
  cssClassTests as multiselectCssClassTests,
  allEditorMultiselectTests,
  basicEditorMultiselectTests,
  parentChildFilterTests,
  singleLineTests as editorSingleLineTests,
  allPaddingTests,
  singleSidePaddingTests,
  allSidesPaddingTests,
  axisPaddingTests,
  liveVisualFeedbackTests,
  robustnessTests,
  allMarginTests,
  singleSideMarginTests,
  allSidesMarginTests,
  axisMarginTests,
  marginVisualFeedbackTests,
  marginRobustnessTests,
  marginScreenshotTests,
  allMarginHandlerTests,
  marginModeToggleTests,
  marginHandlePositionTests,
  marginHandleDragTests,
  marginModeSelectionTests,
  allGapHandlerTests,
  gapModeToggleTests,
  gapModeSwitchingTests,
  gapHandleDirectionTests,
  gapHandleCountTests,
  gapHandlePositionTests,
  gapHandleDragTests,
  gapModeSelectionTests,
  gapValueTests,
  nestedContainerTests as gapNestedContainerTests,
  allWrapLayoutTests,
  hKeyBehaviorTests,
  vKeyBehaviorTests,
  selectionTransitionTests,
  nestedElementTests,
  gapCalculationTests,
  edgeCaseTests as wrapEdgeCaseTests,
  allUngroupTests,
  basicUngroupTests,
  cannotUngroupTests,
  nestedUngroupTests,
  childPreservationTests,
  groupUngroupCycleTests,
  selectionAfterUngroupTests,
  ungroupModifierTests,
  ungroupEmptyLineTests,
  allSpreadToggleTests,
  basicSpreadTests,
  spreadContainerTests,
  spreadEdgeCaseTests,
  spreadModifierTests,
  spreadCombinedTests,
  allSnappingTests,
  paddingTokenSnappingTests,
  marginTokenSnappingTests,
  gapTokenSnappingTests,
  resizeGridSnappingTests,
  snappingBypassTests,
  snapIndicatorTests,
  gridSnappingFallbackTests,
  tokenPriorityTests,
  // Validation Tests (B3.1)
  allValidationTests,
  spreadCssTests,
  ungroupDomTests,
  selectionUndoRedoTests,
  multiselectVisualTests,
} from './interactions'

// Bidirectional
import {
  allBidirectionalTests,
  codeToPreviewTests,
  selectionSyncTests,
  sourceMapTests,
  propertyPanelTests as bidirectionalPanelTests,
  complexSyncTests,
  errorRecoveryTests as bidirectionalErrorRecoveryTests,
} from './bidirectional'

// Undo/Redo
import {
  allUndoRedoTests,
  basicUndoTests,
  basicRedoTests,
  undoEditTypesTests,
  undoWithSelectionTests,
  undoEdgeCasesTests,
} from './undo-redo'

// Autocomplete
import {
  allAutocompleteTests,
  primitiveCompletionTests,
  propertyCompletionTests,
  valueCompletionTests,
  iconCompletionTests,
  tokenCompletionTests,
  stateCompletionTests,
  componentCompletionTests,
} from './autocomplete'

// Indentation (indent guides, smart paste, block indent)
import {
  allIndentationTests,
  indentGuidesTests,
  smartPasteTests,
  blockIndentTests,
  tabIndentTests,
  indentationEdgeCases,
} from './editor/indentation.test'

// Property Panel
import {
  allPropertyPanelTests,
  tokenDisplayTests,
  tokenValueTests,
  tokenInteractionTests,
  projectTokenTests,
  radiusChangeTests,
  allComprehensivePropertyTests,
  sizingPropertyTests,
  spacingPropertyTests,
  colorPropertyTests,
  borderPropertyTests,
  typographyPropertyTests,
  visualPropertyTests,
  layoutPropertyTests,
  iconPropertyTests,
  complexPropertyTests as comprehensiveComplexPropertyTests,
  colorPickerTests,
  iconPickerTests,
  // Events tests
  allEventsTests,
  addEventTests,
  existingEventTests,
  editEventTests,
  deleteEventTests,
  eventIntegrationTests,
  // Error Handling Tests (B2.2)
  allPanelErrorTests,
  invalidColorTests as panelInvalidColorTests,
  invalidSizeTests as panelInvalidSizeTests,
  invalidTokenReferenceTests as panelInvalidTokenTests,
  spacingErrorTests as panelSpacingErrorTests,
  borderErrorTests as panelBorderErrorTests,
  typographyErrorTests as panelTypographyErrorTests,
  panelEdgeCaseTests,
} from './property-panel'

// Drag & Drop
import {
  // Comprehensive drag tests (migrated from browser-test-api.ts)
  allComprehensiveDragTests,
  allPaletteDropTests,
  allCanvasMoveTests,
  paletteDropBasicTests,
  paletteDropPositionTests,
  paletteDropNestedTests,
  paletteDropHorizontalTests,
  paletteDropLayoutTests,
  paletteDropZagTests,
  paletteDropComplexTests,
  canvasMoveReorderTests,
  canvasMoveCrossContainerTests,
  canvasMoveHorizontalTests,
  canvasMoveComplexTests,
  stackedDropTests,
  // Legacy stacked drag tests
  allStackedDragTests,
  basicStackedTests,
  edgeCaseTests,
  layoutDetectionTests,
  allFlexReorderTests,
  buttonReorderVerticalTests,
  buttonReorderHorizontalTests,
  textReorderTests,
  iconReorderTests,
  inputReorderTests,
  imageReorderTests,
  dividerSpacerReorderTests,
  linkTextareaReorderTests,
  mixedComponentReorderTests,
  zagComponentReorderTests,
  nestedContainerReorderTests,
  reorderEdgeCaseTests,
  sequentialReorderTests,
  allAlignmentZoneTests,
  basicAlignmentZoneTests,
  allZonesTests,
  alignmentEdgeCaseTests,
  componentVarietyTests as alignmentComponentTests,
  allAlignmentFromEmptyTests,
  alignmentFromEmptyTests,
  all9ZonesFromEmptyTests,
  alignmentVisualFeedbackTests,
  alignmentParentChildTests,
  // Alignment from move (single child)
  allAlignmentFromMoveTests,
  moveSingleChildTests,
  all9ZonesFromMoveTests,
  multipleChildrenNoAlignmentTests,
  alignmentMoveEdgeCases,
} from './drag'

// Workflow
import {
  allWorkflowTests,
  projectWithCodeTests,
  projectWithDragDropTests,
  applicationTests,
  dashboardE2ETests,
} from './workflow'

// Charts
import {
  allChartTests,
  dataFileTests,
  basicChartTests,
  chartStylingTests,
  chartLayoutTests,
  chartDataTests,
} from './charts'

// States (fully migrated)
import {
  allStateTests,
  allToggleTests,
  toggleBasicTests,
  toggleMultipleTests,
  toggleWithContentTests,
  allExclusiveTests,
  exclusiveBasicTests,
  exclusiveGroupTests,
  exclusiveNavigationTests,
  allHoverTests,
  hoverBasicTests,
  hoverWithTransitionTests,
  hoverNestedTests,
  hoverScaleTests,
  allCrossElementTests,
  crossElementBasicTests,
  crossElementDropdownTests,
  crossElementModalTests,
  crossElementFormTests,
  quickStateTests,
} from './states'

// Animations (fully migrated)
import {
  allAnimationTests,
  allAnimationPresetTests,
  spinAnimationTests,
  pulseAnimationTests,
  bounceAnimationTests,
  shakeAnimationTests,
  fadeAnimationTests,
  slideAnimationTests,
  scaleAnimationTests,
  allStateAnimationTests,
  stateToggleAnimationTests,
  hoverAnimationTests,
  entryExitAnimationTests,
  combinedAnimationTests,
  quickAnimationTests,
} from './animations'

// Transforms (fully migrated)
import {
  allTransformTests,
  allRotateTests,
  rotateBasicTests,
  rotateWithOtherTransformsTests,
  rotateInteractiveTests,
  rotateAnglesTests,
  allScaleTests,
  scaleBasicTests,
  scaleInteractiveTests,
  scaleEdgeCasesTests,
  scaleWithOtherPropertiesTests,
  allTranslateTests,
  positionBasicTests,
  stackedPositionTests,
  zIndexTests,
  translateOffsetTests,
  quickTransformTests,
} from './transforms'

// Gradients (fully migrated)
import {
  allGradientTests,
  horizontalGradientTests,
  verticalGradientTests,
  angledGradientTests,
  gradientTextTests,
  gradientWithEffectsTests,
  quickGradientTests,
} from './gradients'

// Stress Tests (aggressive edge case testing)
import { stressTests } from './stress'
import { raceConditionTests } from './stress/race-conditions.test'
import { codeModifierTests } from './stress/code-modifier.test'

// Project Tests (multi-file projects)
import {
  allProjectTests,
  projectSetupTests,
  tokenComponentTests,
  screenNavigationTests,
  complexLayoutTests as projectComplexLayoutTests,
  fileSwitchingTests,
} from './project'

// Compiler Verification (schwierigste Fälle)
import {
  allCompilerVerificationTests,
  complexPropertyTests,
  layoutVerificationTests,
  nestedStructureTests,
  tokenResolutionTests,
  conditionalTests as compilerConditionalTests,
  collectionTests as compilerCollectionTests,
  componentInheritanceTests,
  inlineSyntaxTests,
  primitivesTests as compilerPrimitivesTests,
  edgeCaseTests as compilerEdgeCaseTests,
  // Prelude Tests (No automatic App wrapper)
  allPreludeTests,
  noAutoWrapperTests,
  explicitAppTests,
  codeIntegrityTests,
  preludeNestedTests,
  // Error Handling Tests (B2.1)
  allCompilerErrorTests,
  invalidPropertyTests,
  undefinedComponentTests,
  invalidTokenTests,
  syntaxErrorTests,
  compilerErrorRecoveryTests,
  edgeCaseErrorTests,
} from './compiler-verification'

// Data Binding
import {
  allDataBindingTests,
  variableTests,
  collectionTests,
  conditionalTests,
  tokenTests,
  inputBindingTests,
} from './data-binding-tests'

// Actions
import {
  allActionTests,
  visibilityActionTests,
  counterActionTests,
  scrollActionTests,
  toastActionTests,
  formActionTests,
  navigationActionTests,
  clipboardActionTests,
  overlayActionTests,
  crudActionTests,
  combinedActionTests,
} from './action-tests'

// Components
import {
  allComponentTests,
  basicComponentTests,
  propertyOverrideTests,
  inheritanceTests,
  variantTests,
  nestedSlotTests,
  layoutComponentTests,
  multiLevelInheritanceTests,
  componentStateTests,
  complexComponentTests,
} from './component-tests'

// Events
import {
  allEventTests,
  clickEventTests,
  hoverEventTests,
  focusEventTests,
  inputEventTests,
  keyboardEventTests,
  viewEventTests,
  combinedEventTests,
  eventEdgeCaseTests,
} from './event-tests'

// Responsive
import {
  allResponsiveTests,
  basicResponsiveTests,
  responsiveLayoutTests,
  responsiveStylingTests,
  responsiveVisibilityTests,
  customThresholdTests,
  responsiveComponentTests,
  complexResponsiveTests,
} from './responsive-tests'

// Sync (Editor ↔ Preview ↔ Panel)
import {
  allSyncTests,
  editorToPreviewTests,
  previewToEditorTests,
  panelToEditorTests,
  editorToPanelTests,
  multiDirectionalTests,
  rapidChangeTests,
  edgeCaseTests as syncEdgeCaseTests,
  selectionPersistenceTests,
  complexScenarioTests,
} from './sync-tests'

// Play Mode
import {
  allPlayModeTests,
  playModeActivationTests,
  playModeVisualTests,
  playModeResetTests,
  playModeDeviceTests,
  playModeIntegrationTests,
  playModeInputTests,
  quickPlayModeTests,
} from './playmode'

// Draft Lines (AI-assist visual feedback)
import {
  allDraftLineTests,
  draftLineDetectionTests,
  draftLineDecorationTests,
  draftLineIntegrationTests,
  // Comprehensive tests
  allComprehensiveDraftLineTests,
  comprehensiveDetectionTests,
  comprehensiveDecorationTests,
  comprehensiveStateTests,
  comprehensiveWorkflowTests,
  comprehensiveEdgeCaseTests,
  comprehensiveInspectionTests,
  // AI Workflow tests
  allAIWorkflowTests,
  aiWorkflowTests,
  visualVerificationTests,
} from './draft-lines'

// Draft Mode (-- marker for AI code generation)
import {
  allDraftModeTests,
  allBasicDraftModeTests,
  allVisualDraftModeTests,
  allAutocompleteDraftModeTests,
  allScenarioDraftModeTests,
  detectionTests as draftModeDetectionTests,
  indentationTests as draftModeIndentationTests,
  blockStructureTests as draftModeBlockTests,
  lineDetectionTests as draftModeLineTests,
  dynamicEditingTests as draftModeDynamicTests,
  cssClassTests as draftModeCssTests,
  mutedColorTests as draftModeMutedTests,
  dynamicVisualTests as draftModeVisualDynamicTests,
  suppressionTests as draftModeSuppressionTests,
  pickerTests as draftModePickerTests,
  generationTests as draftModeGenerationTests,
  correctionTests as draftModeCorrectionTests,
  refactoringTests as draftModeRefactoringTests,
  workflowTests as draftModeWorkflowTests,
  contextTests as draftModeContextTests,
  quickDraftModeTests,
} from './draft-mode'

// Tutorial Tests (auto-generated from docs/tutorial/*.html)
import {
  allTutorialTests,
  tutorialChapters,
  chapter_01_elementeTests,
  chapter_02_komponentenTests,
  chapter_03_tokensTests,
  chapter_04_layoutTests,
  chapter_05_stylingTests,
  chapter_06_statesTests,
  chapter_07_animationenTests,
  chapter_08_functionsTests,
  chapter_09_datenTests,
  chapter_10_seitenTests,
  chapter_11_eingabeTests,
  chapter_12_navigationTests,
  chapter_13_overlaysTests,
  chapter_14_tabellenTests,
  chapter_15_chartsTests,
} from './tutorial'

// Property Robustness (various property formats)
import {
  allPropertyRobustnessTests,
  commaFormatTests,
  autoSeparationTests,
  multiValueTests,
  aliasTests,
  orderTests,
  mixedFormatTests,
  edgeCaseTests as propertyEdgeCaseTests,
  sequentialModTests,
  previewSyncTests,
} from './property-robustness-tests'

// UI Builder Tests (build UIs with only drag & drop + property panel)
import {
  allUIBuilderTests,
  level1Tests as uiBuilderLevel1Tests,
  level2Tests as uiBuilderLevel2Tests,
} from './ui-builder-tests'

// =============================================================================
// Direct Imports (not yet migrated to directories)
// =============================================================================

import { allCompilerTests, primitiveTests, layoutTests, stylingTests } from './compiler-tests'
import {
  allLayoutVerificationTests,
  directionVerificationTests,
  sizeVerificationTests,
  gapVerificationTests,
  alignmentVerificationTests,
  complexLayoutVerificationTests,
} from './layout-verification-tests'
import {
  allTestSystemTests,
  fixturesTests,
  isolationTests,
  keyboardTests as testSystemKeyboardTests,
  waitHelperTests,
} from './test-system-tests'

// Integration Tests (real-world workflows)
import {
  allIntegrationTests,
  componentTokenTests as integrationTokenTests,
  componentStateTests as integrationStateTests,
  componentTokenStateTests as integrationTrifectaTests,
  nestedComponentTests as integrationNestedTests,
  realWorldPatternTests as integrationPatternTests,
  layoutIntegrationTests as integrationLayoutTests,
  dataIterationTests as integrationDataTests,
  conditionalTests as integrationConditionalTests,
  iconButtonTests as integrationIconButtonTests,
  animationTests as integrationAnimationTests,
  formIntegrationTests as integrationFormTests,
  gradientTests as integrationGradientTests,
  quickIntegrationTests,
} from './integration'

import type { TestCase, TestSuiteResult } from '../types'

// =============================================================================
// Re-exports by Category
// =============================================================================

// Primitives
export {
  allPrimitivesTests,
  basicPrimitives,
  semanticPrimitives,
  headingPrimitives,
  primitiveDefaultsTests,
}

// Layout
export {
  allLayoutTests,
  directionTests,
  alignmentTests,
  distributionTests,
  gapTests,
  wrapTests,
  flexTests,
  stackedTests,
  gridTests,
  nestingTests,
  complexLayoutTests,
}

// Styling
export {
  allStylingTests,
  colorTests,
  sizingTests,
  spacingTests,
  borderTests,
  typographyTests,
  effectTests,
  visibilityTests,
  stylingCombinedTests as combinedTests,
}

// Compiler (original)
export { allCompilerTests, primitiveTests, layoutTests, stylingTests }

// Zag Components
export {
  allZagTests,
  checkboxTests,
  switchTests,
  sliderTests,
  selectTests,
  pureSelectTests,
  radioGroupTests,
  dialogTests,
  tooltipTests,
  tabsTests,
  datePickerTests,
  sidenavTests,
  zagInLayoutTests,
}

// Interactions
export {
  allInteractionTests,
  clickTests,
  hoverTests,
  toggleTests,
  focusTests,
  inputTests,
  keyboardTests,
  // selectionTests is already exported from categories
  dragDropTests,
  interactionCombinedTests,
  allLayoutShortcutTests,
  allResizeHandleDblClickTests,
  horizontalHandleTests,
  verticalHandleTests,
  cornerHandleTests,
  allPaddingHandlerTests,
  paddingModeToggleTests,
  paddingHandlePositionTests,
  paddingHandleDragTests,
  paddingModeSelectionTests,
  tokenExtractTests,
  resizeHandleDragTests,
  allMultiselectTests,
  shiftClickTests,
  metaClickTests,
  clearSelectionTests,
  multiselectCssClassTests,
  allEditorMultiselectTests,
  basicEditorMultiselectTests,
  parentChildFilterTests,
  editorSingleLineTests,
  allGapHandlerTests,
  gapModeToggleTests,
  gapModeSwitchingTests,
  gapHandleDirectionTests,
  gapHandleCountTests,
  gapHandlePositionTests,
  gapHandleDragTests,
  gapModeSelectionTests,
  gapValueTests,
  gapNestedContainerTests,
}

// Bidirectional Editing
export {
  allBidirectionalTests,
  codeToPreviewTests,
  selectionSyncTests,
  sourceMapTests,
  bidirectionalPanelTests as propertyPanelTests,
  complexSyncTests,
  bidirectionalErrorRecoveryTests,
}

// Undo/Redo
export {
  allUndoRedoTests,
  basicUndoTests,
  basicRedoTests,
  undoEditTypesTests,
  undoWithSelectionTests,
  undoEdgeCasesTests,
}

// Autocomplete
export {
  allAutocompleteTests,
  primitiveCompletionTests,
  propertyCompletionTests,
  valueCompletionTests,
  iconCompletionTests,
  tokenCompletionTests,
  stateCompletionTests,
  componentCompletionTests,
}

// Indentation
export {
  allIndentationTests,
  indentGuidesTests,
  smartPasteTests,
  blockIndentTests,
  tabIndentTests,
  indentationEdgeCases,
}

// Comprehensive Drag Tests (unified from browser-test-api.ts)
export {
  allComprehensiveDragTests,
  allPaletteDropTests,
  allCanvasMoveTests,
  paletteDropBasicTests,
  paletteDropPositionTests,
  paletteDropNestedTests,
  paletteDropHorizontalTests,
  paletteDropLayoutTests,
  paletteDropZagTests,
  paletteDropComplexTests,
  canvasMoveReorderTests,
  canvasMoveCrossContainerTests,
  canvasMoveHorizontalTests,
  canvasMoveComplexTests,
  stackedDropTests,
}

// Stacked Drag & Drop
export { allStackedDragTests, basicStackedTests, edgeCaseTests, layoutDetectionTests }

// Flex Reorder Tests
export {
  allFlexReorderTests,
  buttonReorderVerticalTests,
  buttonReorderHorizontalTests,
  textReorderTests,
  iconReorderTests,
  inputReorderTests,
  imageReorderTests,
  dividerSpacerReorderTests,
  linkTextareaReorderTests,
  mixedComponentReorderTests,
  zagComponentReorderTests,
  nestedContainerReorderTests,
  reorderEdgeCaseTests,
  sequentialReorderTests,
}

// Alignment Zone Tests
export {
  allAlignmentZoneTests,
  basicAlignmentZoneTests,
  allZonesTests,
  alignmentEdgeCaseTests,
  alignmentComponentTests,
  allAlignmentFromEmptyTests,
  alignmentFromEmptyTests,
  all9ZonesFromEmptyTests,
  alignmentVisualFeedbackTests,
  alignmentParentChildTests,
}

// Property Panel
export {
  allPropertyPanelTests,
  tokenDisplayTests,
  tokenValueTests,
  tokenInteractionTests,
  projectTokenTests,
  radiusChangeTests,
  allComprehensivePropertyTests,
  sizingPropertyTests,
  spacingPropertyTests,
  colorPropertyTests,
  borderPropertyTests,
  typographyPropertyTests,
  visualPropertyTests,
  layoutPropertyTests,
  iconPropertyTests,
  comprehensiveComplexPropertyTests,
}

// Charts
export {
  allChartTests,
  dataFileTests,
  basicChartTests,
  chartStylingTests,
  chartLayoutTests,
  chartDataTests,
}

// Workflow Tests
export {
  allWorkflowTests,
  projectWithCodeTests,
  projectWithDragDropTests,
  applicationTests,
  dashboardE2ETests,
}

// States
export {
  allStateTests,
  allToggleTests,
  toggleBasicTests,
  toggleMultipleTests,
  toggleWithContentTests,
  allExclusiveTests,
  exclusiveBasicTests,
  exclusiveGroupTests,
  exclusiveNavigationTests,
  allHoverTests,
  hoverBasicTests,
  hoverWithTransitionTests,
  hoverNestedTests,
  hoverScaleTests,
  allCrossElementTests,
  crossElementBasicTests,
  crossElementDropdownTests,
  crossElementModalTests,
  crossElementFormTests,
  quickStateTests,
}

// Animations
export {
  allAnimationTests,
  allAnimationPresetTests,
  spinAnimationTests,
  pulseAnimationTests,
  bounceAnimationTests,
  shakeAnimationTests,
  fadeAnimationTests,
  slideAnimationTests,
  scaleAnimationTests,
  allStateAnimationTests,
  stateToggleAnimationTests,
  hoverAnimationTests,
  entryExitAnimationTests,
  combinedAnimationTests,
  quickAnimationTests,
}

// Transforms
export {
  allTransformTests,
  allRotateTests,
  rotateBasicTests,
  rotateWithOtherTransformsTests,
  rotateInteractiveTests,
  rotateAnglesTests,
  allScaleTests,
  scaleBasicTests,
  scaleInteractiveTests,
  scaleEdgeCasesTests,
  scaleWithOtherPropertiesTests,
  allTranslateTests,
  positionBasicTests,
  stackedPositionTests,
  zIndexTests,
  translateOffsetTests,
  quickTransformTests,
}

// Gradients
export {
  allGradientTests,
  horizontalGradientTests,
  verticalGradientTests,
  angledGradientTests,
  gradientTextTests,
  gradientWithEffectsTests,
  quickGradientTests,
}

// Stress Tests (aggressive edge case testing)
// Note: stressTests already includes raceConditionTests and codeModifierTests
export const allStressTests = [...stressTests]
export { stressTests, raceConditionTests, codeModifierTests }

// Project Tests (multi-file projects)
export {
  allProjectTests,
  projectSetupTests,
  tokenComponentTests,
  screenNavigationTests,
  projectComplexLayoutTests,
  fileSwitchingTests,
}

// Compiler Verification Tests (schwierigste Fälle)
export {
  allCompilerVerificationTests,
  complexPropertyTests,
  layoutVerificationTests,
  nestedStructureTests,
  tokenResolutionTests,
  compilerConditionalTests,
  compilerCollectionTests,
  componentInheritanceTests,
  inlineSyntaxTests,
  compilerPrimitivesTests,
  compilerEdgeCaseTests,
  // Prelude Tests (No automatic App wrapper)
  allPreludeTests,
  noAutoWrapperTests,
  explicitAppTests,
  codeIntegrityTests,
  preludeNestedTests,
  // Error Handling Tests (B2.1)
  allCompilerErrorTests,
  invalidPropertyTests,
  undefinedComponentTests,
  invalidTokenTests,
  syntaxErrorTests,
  compilerErrorRecoveryTests,
  edgeCaseErrorTests,
}

// Data Binding Tests
export {
  allDataBindingTests,
  variableTests,
  collectionTests,
  conditionalTests,
  tokenTests,
  inputBindingTests,
}

// Action Tests
export {
  allActionTests,
  visibilityActionTests,
  counterActionTests,
  scrollActionTests,
  toastActionTests,
  formActionTests,
  navigationActionTests,
  clipboardActionTests,
  overlayActionTests,
  crudActionTests,
  combinedActionTests,
}

// Component Tests
export {
  allComponentTests,
  basicComponentTests,
  propertyOverrideTests,
  inheritanceTests,
  variantTests,
  nestedSlotTests,
  layoutComponentTests,
  multiLevelInheritanceTests,
  componentStateTests,
  complexComponentTests,
}

// Event Tests
export {
  allEventTests,
  clickEventTests,
  hoverEventTests,
  focusEventTests,
  inputEventTests,
  keyboardEventTests,
  viewEventTests,
  combinedEventTests,
  eventEdgeCaseTests,
}

// Responsive Tests
export {
  allResponsiveTests,
  basicResponsiveTests,
  responsiveLayoutTests,
  responsiveStylingTests,
  responsiveVisibilityTests,
  customThresholdTests,
  responsiveComponentTests,
  complexResponsiveTests,
}

// Sync Tests (Editor ↔ Preview ↔ Panel)
export {
  allSyncTests,
  editorToPreviewTests,
  previewToEditorTests,
  panelToEditorTests,
  editorToPanelTests,
  multiDirectionalTests,
  rapidChangeTests,
  syncEdgeCaseTests,
  selectionPersistenceTests,
  complexScenarioTests,
}

// Play Mode Tests
export {
  allPlayModeTests,
  playModeActivationTests,
  playModeVisualTests,
  playModeResetTests,
  playModeDeviceTests,
  playModeIntegrationTests,
  playModeInputTests,
  quickPlayModeTests,
}

// Draft Lines Tests (AI-assist visual feedback)
export {
  allDraftLineTests,
  draftLineDetectionTests,
  draftLineDecorationTests,
  draftLineIntegrationTests,
  // Comprehensive tests
  allComprehensiveDraftLineTests,
  comprehensiveDetectionTests,
  comprehensiveDecorationTests,
  comprehensiveStateTests,
  comprehensiveWorkflowTests,
  comprehensiveEdgeCaseTests,
  comprehensiveInspectionTests,
}

// Draft Mode Tests (-- marker for AI code generation)
export {
  allDraftModeTests,
  allBasicDraftModeTests,
  allVisualDraftModeTests,
  allAutocompleteDraftModeTests,
  allScenarioDraftModeTests,
  draftModeDetectionTests,
  draftModeIndentationTests,
  draftModeBlockTests,
  draftModeLineTests,
  draftModeDynamicTests,
  draftModeCssTests,
  draftModeMutedTests,
  draftModeVisualDynamicTests,
  draftModeSuppressionTests,
  draftModePickerTests,
  draftModeGenerationTests,
  draftModeCorrectionTests,
  draftModeRefactoringTests,
  draftModeWorkflowTests,
  draftModeContextTests,
  quickDraftModeTests,
}

// Property Robustness Tests
export {
  allPropertyRobustnessTests,
  commaFormatTests,
  autoSeparationTests,
  multiValueTests,
  aliasTests,
  orderTests,
  mixedFormatTests,
  propertyEdgeCaseTests,
  sequentialModTests,
  previewSyncTests,
}

// UI Builder Tests
export { allUIBuilderTests, uiBuilderLevel1Tests, uiBuilderLevel2Tests }

// Tutorial Tests (auto-generated from docs/tutorial/*.html)
export {
  allTutorialTests,
  tutorialChapters,
  chapter_01_elementeTests,
  chapter_02_komponentenTests,
  chapter_03_tokensTests,
  chapter_04_layoutTests,
  chapter_05_stylingTests,
  chapter_06_statesTests,
  chapter_07_animationenTests,
  chapter_08_functionsTests,
  chapter_09_datenTests,
  chapter_10_seitenTests,
  chapter_11_eingabeTests,
  chapter_12_navigationTests,
  chapter_13_overlaysTests,
  chapter_14_tabellenTests,
  chapter_15_chartsTests,
}

// Layout Verification Tests (visual/position-based)
export {
  allLayoutVerificationTests,
  directionVerificationTests,
  sizeVerificationTests,
  gapVerificationTests,
  alignmentVerificationTests,
  complexLayoutVerificationTests,
}

// Test System Tests (meta tests for the test framework itself)
export {
  allTestSystemTests,
  fixturesTests,
  isolationTests,
  testSystemKeyboardTests,
  waitHelperTests,
}

// Integration Tests (real-world designer workflows)
export {
  allIntegrationTests,
  integrationTokenTests,
  integrationStateTests,
  integrationTrifectaTests,
  integrationNestedTests,
  integrationPatternTests,
  integrationLayoutTests,
  quickIntegrationTests,
}

// E2E Tests (comprehensive app building simulations)
export {
  allE2ETests,
  uxAgencyAppTests,
  uxAgencyDesignSystemTests,
  uxAgencyLayoutTests,
  uxAgencyFeatureTests,
  uxAgencyProjectsTests,
  uxAgencyIntegrationTests,
  uxAgencyInteractionTests,
}

// =============================================================================
// Combined Exports
// =============================================================================

/**
 * All tests combined
 */
export const allTests: TestCase[] = [
  ...allPrimitivesTests,
  ...allLayoutTests,
  ...allStylingTests,
  ...allZagTests,
  ...pureSelectTests,
  ...allInteractionTests,
  ...allLayoutShortcutTests,
  ...allResizeHandleDblClickTests,
  ...allPaddingHandlerTests,
  ...tokenExtractTests,
  ...resizeHandleDragTests,
  ...allMultiselectTests,
  ...allEditorMultiselectTests,
  ...allWrapLayoutTests,
  ...allUngroupTests,
  ...allSpreadToggleTests,
  ...allSnappingTests,
  ...allBidirectionalTests,
  ...allUndoRedoTests,
  ...allAutocompleteTests,
  ...allIndentationTests,
  ...allComprehensiveDragTests,
  ...allStackedDragTests,
  ...allFlexReorderTests,
  ...allAlignmentZoneTests,
  ...allAlignmentFromEmptyTests,
  ...allAlignmentFromMoveTests,
  ...allPropertyPanelTests,
  ...allComprehensivePropertyTests,
  ...colorPickerTests,
  ...iconPickerTests,
  ...allChartTests,
  ...allWorkflowTests,
  ...dashboardE2ETests,
  ...allLayoutVerificationTests,
  ...allTestSystemTests,
  ...allStateTests,
  ...allAnimationTests,
  ...allTransformTests,
  ...allGradientTests,
  ...allDataBindingTests,
  ...allActionTests,
  ...allComponentTests,
  ...allEventTests,
  ...allResponsiveTests,
  ...allSyncTests,
  ...allPropertyRobustnessTests,
  ...allStressTests,
  ...allProjectTests,
  ...allCompilerVerificationTests,
  ...allPlayModeTests,
  ...allDraftLineTests,
  ...allDraftModeTests,
  ...allIntegrationTests,
  ...allTutorialTests,
]

/**
 * Quick test subset for fast validation
 */
export const quickTests: TestCase[] = [
  ...basicPrimitives.slice(0, 5),
  ...directionTests.slice(0, 3),
  ...colorTests.slice(0, 3),
  ...quickStateTests,
  ...quickAnimationTests,
  ...quickTransformTests,
  ...quickGradientTests,
  ...quickPlayModeTests,
  ...quickIntegrationTests,
]

/**
 * Test counts by category (including sub-categories)
 *
 * Use this to see test counts for each category when running --list
 */
export const testCounts: Record<string, number> = {
  // === Primitives ===
  primitives: allPrimitivesTests.length,
  'primitives.basic': basicPrimitives.length,
  'primitives.semantic': semanticPrimitives.length,
  'primitives.headings': headingPrimitives.length,
  'primitives.defaults': primitiveDefaultsTests.length,

  // === Layout ===
  layout: allLayoutTests.length,
  'layout.direction': directionTests.length,
  'layout.alignment': alignmentTests.length,
  'layout.distribution': distributionTests.length,
  'layout.gap': gapTests.length,
  'layout.wrap': wrapTests.length,
  'layout.flex': flexTests.length,
  'layout.stacked': stackedTests.length,
  'layout.grid': gridTests.length,
  'layout.nesting': nestingTests.length,
  'layout.complex': complexLayoutTests.length,
  // Extended Layout (B3.3)
  'layout.extended': allExtendedLayoutTests.length,
  'layout.extended.minMaxWidth': minMaxWidthTests.length,
  'layout.extended.minMaxHeight': minMaxHeightTests.length,
  'layout.extended.gridPosition': gridPositionTests.length,
  'layout.extended.rowHeight': rowHeightTests.length,
  'layout.extended.gapXY': gapXYTests.length,
  layoutShortcuts: allLayoutShortcutTests.length,
  layoutVerification: allLayoutVerificationTests.length,
  'layoutVerification.direction': directionVerificationTests.length,
  'layoutVerification.size': sizeVerificationTests.length,
  'layoutVerification.gap': gapVerificationTests.length,
  'layoutVerification.alignment': alignmentVerificationTests.length,
  'layoutVerification.complex': complexLayoutVerificationTests.length,

  // === Styling ===
  styling: allStylingTests.length,
  'styling.colors': colorTests.length,
  'styling.sizing': sizingTests.length,
  'styling.spacing': spacingTests.length,
  'styling.border': borderTests.length,
  'styling.typography': typographyTests.length,
  'styling.effects': effectTests.length,
  'styling.visibility': visibilityTests.length,
  'styling.combined': stylingCombinedTests.length,
  // Extended Styling (B3.2)
  'styling.extended': allExtendedStylingTests.length,
  'styling.extended.rgba': rgbaColorTests.length,
  'styling.extended.hexAlpha': hexAlphaTests.length,
  'styling.extended.perSidePadding': perSidePaddingTests.length,
  'styling.extended.perSideMargin': perSideMarginTests.length,
  'styling.extended.perSideBorder': perSideBorderTests.length,
  'styling.extended.shadowValidation': shadowValidationTests.length,

  // === Zag Components ===
  zag: allZagTests.length,
  'zag.checkbox': checkboxTests.length,
  'zag.switch': switchTests.length,
  'zag.slider': sliderTests.length,
  'zag.select': selectTests.length,
  'zag.radioGroup': radioGroupTests.length,
  'zag.dialog': dialogTests.length,
  'zag.tooltip': tooltipTests.length,
  'zag.tabs': tabsTests.length,
  'zag.datePicker': datePickerTests.length,
  'zag.sidenav': sidenavTests.length,
  'zag.inLayout': zagInLayoutTests.length,
  'zag.pureSelect': pureSelectTests.length,

  // === Interactions ===
  interactions: allInteractionTests.length,
  'interactions.click': clickTests.length,
  'interactions.hover': hoverTests.length,
  'interactions.toggle': toggleTests.length,
  'interactions.focus': focusTests.length,
  'interactions.input': inputTests.length,
  'interactions.keyboard': keyboardTests.length,
  'interactions.selection': selectionTests.length,
  'interactions.dragDrop': dragDropTests.length,
  'interactions.combined': interactionCombinedTests.length,
  multiselect: allMultiselectTests.length,
  'multiselect.shiftClick': shiftClickTests.length,
  'multiselect.metaClick': metaClickTests.length,
  'multiselect.clearSelection': clearSelectionTests.length,
  'multiselect.cssClass': multiselectCssClassTests.length,
  editorMultiselect: allEditorMultiselectTests.length,
  'editorMultiselect.basic': basicEditorMultiselectTests.length,
  'editorMultiselect.parentChild': parentChildFilterTests.length,
  'editorMultiselect.singleLine': editorSingleLineTests.length,
  paddingDrag: allPaddingTests.length,
  'paddingDrag.singleSide': singleSidePaddingTests.length,
  'paddingDrag.allSides': allSidesPaddingTests.length,
  'paddingDrag.axis': axisPaddingTests.length,
  'paddingDrag.liveVisual': liveVisualFeedbackTests.length,
  'paddingDrag.robustness': robustnessTests.length,
  marginDrag: allMarginTests.length,
  'marginDrag.singleSide': singleSideMarginTests.length,
  'marginDrag.allSides': allSidesMarginTests.length,
  'marginDrag.axis': axisMarginTests.length,
  'marginDrag.liveVisual': marginVisualFeedbackTests.length,
  'marginDrag.robustness': marginRobustnessTests.length,
  marginHandlers: allMarginHandlerTests.length,
  'marginHandlers.modeToggle': marginModeToggleTests.length,
  'marginHandlers.position': marginHandlePositionTests.length,
  'marginHandlers.drag': marginHandleDragTests.length,
  'marginHandlers.modeSelection': marginModeSelectionTests.length,
  gapHandlers: allGapHandlerTests.length,
  'gapHandlers.modeToggle': gapModeToggleTests.length,
  'gapHandlers.modeSwitching': gapModeSwitchingTests.length,
  'gapHandlers.direction': gapHandleDirectionTests.length,
  'gapHandlers.count': gapHandleCountTests.length,
  'gapHandlers.position': gapHandlePositionTests.length,
  'gapHandlers.drag': gapHandleDragTests.length,
  'gapHandlers.modeSelection': gapModeSelectionTests.length,
  'gapHandlers.values': gapValueTests.length,
  'gapHandlers.nested': gapNestedContainerTests.length,
  resizeHandleDblClick: allResizeHandleDblClickTests.length,
  'resizeHandleDblClick.horizontal': horizontalHandleTests.length,
  'resizeHandleDblClick.vertical': verticalHandleTests.length,
  'resizeHandleDblClick.corner': cornerHandleTests.length,
  resizeHandleDrag: resizeHandleDragTests.length,
  paddingHandlers: allPaddingHandlerTests.length,
  'paddingHandlers.modeToggle': paddingModeToggleTests.length,
  'paddingHandlers.position': paddingHandlePositionTests.length,
  'paddingHandlers.drag': paddingHandleDragTests.length,
  'paddingHandlers.modeSelection': paddingModeSelectionTests.length,
  tokenExtract: tokenExtractTests.length,
  wrapLayout: allWrapLayoutTests.length,
  'wrapLayout.hKey': hKeyBehaviorTests.length,
  'wrapLayout.vKey': vKeyBehaviorTests.length,
  'wrapLayout.transitions': selectionTransitionTests.length,
  'wrapLayout.nested': nestedElementTests.length,
  'wrapLayout.gap': gapCalculationTests.length,
  'wrapLayout.edge': wrapEdgeCaseTests.length,
  ungroup: allUngroupTests.length,
  'ungroup.basic': basicUngroupTests.length,
  'ungroup.cannotUngroup': cannotUngroupTests.length,
  'ungroup.nested': nestedUngroupTests.length,
  'ungroup.childPreservation': childPreservationTests.length,
  'ungroup.groupCycle': groupUngroupCycleTests.length,
  'ungroup.selectionAfter': selectionAfterUngroupTests.length,
  'ungroup.modifiers': ungroupModifierTests.length,
  'ungroup.emptyLines': ungroupEmptyLineTests.length,
  spreadToggle: allSpreadToggleTests.length,
  'spreadToggle.basic': basicSpreadTests.length,
  'spreadToggle.containers': spreadContainerTests.length,
  'spreadToggle.edgeCases': spreadEdgeCaseTests.length,
  'spreadToggle.modifiers': spreadModifierTests.length,
  'spreadToggle.combined': spreadCombinedTests.length,
  snapping: allSnappingTests.length,
  'snapping.paddingToken': paddingTokenSnappingTests.length,
  'snapping.marginToken': marginTokenSnappingTests.length,
  'snapping.gapToken': gapTokenSnappingTests.length,
  'snapping.resizeGrid': resizeGridSnappingTests.length,
  'snapping.bypass': snappingBypassTests.length,
  'snapping.indicator': snapIndicatorTests.length,
  'snapping.gridFallback': gridSnappingFallbackTests.length,
  'snapping.tokenPriority': tokenPriorityTests.length,

  // === Validation Tests (B3.1) ===
  validation: allValidationTests.length,
  'validation.spreadCss': spreadCssTests.length,
  'validation.ungroupDom': ungroupDomTests.length,
  'validation.selectionUndoRedo': selectionUndoRedoTests.length,
  'validation.multiselectVisual': multiselectVisualTests.length,

  // === Bidirectional ===
  bidirectional: allBidirectionalTests.length,
  'bidirectional.codeToPreview': codeToPreviewTests.length,
  'bidirectional.selectionSync': selectionSyncTests.length,
  'bidirectional.sourceMap': sourceMapTests.length,
  'bidirectional.propertyPanel': bidirectionalPanelTests.length,
  'bidirectional.complexSync': complexSyncTests.length,
  'bidirectional.errorRecovery': bidirectionalErrorRecoveryTests.length,

  // === Undo/Redo ===
  undoRedo: allUndoRedoTests.length,
  'undoRedo.basicUndo': basicUndoTests.length,
  'undoRedo.basicRedo': basicRedoTests.length,
  'undoRedo.editTypes': undoEditTypesTests.length,
  'undoRedo.withSelection': undoWithSelectionTests.length,
  'undoRedo.edgeCases': undoEdgeCasesTests.length,

  // === Autocomplete ===
  autocomplete: allAutocompleteTests.length,
  'autocomplete.primitives': primitiveCompletionTests.length,
  'autocomplete.properties': propertyCompletionTests.length,
  'autocomplete.values': valueCompletionTests.length,
  'autocomplete.icons': iconCompletionTests.length,
  'autocomplete.tokens': tokenCompletionTests.length,
  'autocomplete.states': stateCompletionTests.length,
  'autocomplete.components': componentCompletionTests.length,

  // === Indentation ===
  indentation: allIndentationTests.length,
  'indentation.guides': indentGuidesTests.length,
  'indentation.smartPaste': smartPasteTests.length,
  'indentation.blockIndent': blockIndentTests.length,
  'indentation.tabIndent': tabIndentTests.length,
  'indentation.edgeCases': indentationEdgeCases.length,

  // === Drag & Drop ===
  comprehensiveDrag: allComprehensiveDragTests.length,
  'comprehensiveDrag.paletteDropBasic': paletteDropBasicTests.length,
  'comprehensiveDrag.paletteDropPosition': paletteDropPositionTests.length,
  'comprehensiveDrag.paletteDropNested': paletteDropNestedTests.length,
  'comprehensiveDrag.paletteDropHorizontal': paletteDropHorizontalTests.length,
  'comprehensiveDrag.paletteDropLayout': paletteDropLayoutTests.length,
  'comprehensiveDrag.paletteDropZag': paletteDropZagTests.length,
  'comprehensiveDrag.paletteDropComplex': paletteDropComplexTests.length,
  'comprehensiveDrag.canvasMoveReorder': canvasMoveReorderTests.length,
  'comprehensiveDrag.canvasMoveCross': canvasMoveCrossContainerTests.length,
  'comprehensiveDrag.canvasMoveHorizontal': canvasMoveHorizontalTests.length,
  'comprehensiveDrag.canvasMoveComplex': canvasMoveComplexTests.length,
  'comprehensiveDrag.stackedDrop': stackedDropTests.length,
  stackedDrag: allStackedDragTests.length,
  'stackedDrag.basic': basicStackedTests.length,
  'stackedDrag.edgeCases': edgeCaseTests.length,
  'stackedDrag.layoutDetection': layoutDetectionTests.length,
  flexReorder: allFlexReorderTests.length,
  'flexReorder.buttonVertical': buttonReorderVerticalTests.length,
  'flexReorder.buttonHorizontal': buttonReorderHorizontalTests.length,
  'flexReorder.text': textReorderTests.length,
  'flexReorder.icon': iconReorderTests.length,
  'flexReorder.input': inputReorderTests.length,
  'flexReorder.image': imageReorderTests.length,
  'flexReorder.dividerSpacer': dividerSpacerReorderTests.length,
  'flexReorder.linkTextarea': linkTextareaReorderTests.length,
  'flexReorder.mixedComponent': mixedComponentReorderTests.length,
  'flexReorder.zagComponent': zagComponentReorderTests.length,
  'flexReorder.nestedContainer': nestedContainerReorderTests.length,
  'flexReorder.edgeCases': reorderEdgeCaseTests.length,
  'flexReorder.sequential': sequentialReorderTests.length,
  alignmentZone: allAlignmentZoneTests.length,
  'alignmentZone.basic': basicAlignmentZoneTests.length,
  'alignmentZone.allZones': allZonesTests.length,
  'alignmentZone.edgeCases': alignmentEdgeCaseTests.length,
  'alignmentZone.componentVariety': alignmentComponentTests.length,
  alignmentFromEmpty: allAlignmentFromEmptyTests.length,
  'alignmentFromEmpty.basic': alignmentFromEmptyTests.length,
  'alignmentFromEmpty.all9Zones': all9ZonesFromEmptyTests.length,
  'alignmentFromEmpty.visualFeedback': alignmentVisualFeedbackTests.length,
  'alignmentFromEmpty.parentChild': alignmentParentChildTests.length,
  alignmentFromMove: allAlignmentFromMoveTests.length,
  'alignmentFromMove.basic': moveSingleChildTests.length,
  'alignmentFromMove.all9Zones': all9ZonesFromMoveTests.length,
  'alignmentFromMove.multipleChildren': multipleChildrenNoAlignmentTests.length,
  'alignmentFromMove.edgeCases': alignmentMoveEdgeCases.length,

  // === Property Panel ===
  propertyPanel: allPropertyPanelTests.length,
  'propertyPanel.tokenDisplay': tokenDisplayTests.length,
  'propertyPanel.tokenValue': tokenValueTests.length,
  'propertyPanel.tokenInteraction': tokenInteractionTests.length,
  'propertyPanel.projectToken': projectTokenTests.length,
  'propertyPanel.radiusChange': radiusChangeTests.length,
  'propertyPanel.events': allEventsTests.length,
  'propertyPanel.events.add': addEventTests.length,
  'propertyPanel.events.existing': existingEventTests.length,
  'propertyPanel.events.edit': editEventTests.length,
  'propertyPanel.events.delete': deleteEventTests.length,
  'propertyPanel.events.integration': eventIntegrationTests.length,
  // Error Handling Tests (B2.2)
  'propertyPanel.errors': allPanelErrorTests.length,
  'propertyPanel.errors.colors': panelInvalidColorTests.length,
  'propertyPanel.errors.sizes': panelInvalidSizeTests.length,
  'propertyPanel.errors.tokens': panelInvalidTokenTests.length,
  'propertyPanel.errors.spacing': panelSpacingErrorTests.length,
  'propertyPanel.errors.border': panelBorderErrorTests.length,
  'propertyPanel.errors.typography': panelTypographyErrorTests.length,
  'propertyPanel.errors.edgeCases': panelEdgeCaseTests.length,
  comprehensiveProperty: allComprehensivePropertyTests.length,
  'comprehensiveProperty.sizing': sizingPropertyTests.length,
  'comprehensiveProperty.spacing': spacingPropertyTests.length,
  'comprehensiveProperty.color': colorPropertyTests.length,
  'comprehensiveProperty.border': borderPropertyTests.length,
  'comprehensiveProperty.typography': typographyPropertyTests.length,
  'comprehensiveProperty.visual': visualPropertyTests.length,
  'comprehensiveProperty.layout': layoutPropertyTests.length,
  'comprehensiveProperty.icon': iconPropertyTests.length,
  'comprehensiveProperty.complex': comprehensiveComplexPropertyTests.length,
  colorPicker: colorPickerTests.length,
  iconPicker: iconPickerTests.length,

  // === Charts ===
  charts: allChartTests.length,
  'charts.dataFile': dataFileTests.length,
  'charts.basic': basicChartTests.length,
  'charts.styling': chartStylingTests.length,
  'charts.layout': chartLayoutTests.length,
  'charts.data': chartDataTests.length,

  // === Workflow ===
  workflow: allWorkflowTests.length,
  'workflow.projectWithCode': projectWithCodeTests.length,
  'workflow.projectWithDragDrop': projectWithDragDropTests.length,
  'workflow.application': applicationTests.length,
  'workflow.dashboardE2E': dashboardE2ETests.length,

  // === States ===
  states: allStateTests.length,
  'states.toggle': allToggleTests.length,
  'states.toggle.basic': toggleBasicTests.length,
  'states.toggle.multiple': toggleMultipleTests.length,
  'states.toggle.content': toggleWithContentTests.length,
  'states.exclusive': allExclusiveTests.length,
  'states.exclusive.basic': exclusiveBasicTests.length,
  'states.exclusive.group': exclusiveGroupTests.length,
  'states.exclusive.navigation': exclusiveNavigationTests.length,
  'states.hover': allHoverTests.length,
  'states.hover.basic': hoverBasicTests.length,
  'states.hover.transition': hoverWithTransitionTests.length,
  'states.hover.nested': hoverNestedTests.length,
  'states.hover.scale': hoverScaleTests.length,
  'states.crossElement': allCrossElementTests.length,
  'states.crossElement.basic': crossElementBasicTests.length,
  'states.crossElement.dropdown': crossElementDropdownTests.length,
  'states.crossElement.modal': crossElementModalTests.length,
  'states.crossElement.form': crossElementFormTests.length,
  'states.quick': quickStateTests.length,

  // === Animations ===
  animations: allAnimationTests.length,
  'animations.presets': allAnimationPresetTests.length,
  'animations.spin': spinAnimationTests.length,
  'animations.pulse': pulseAnimationTests.length,
  'animations.bounce': bounceAnimationTests.length,
  'animations.shake': shakeAnimationTests.length,
  'animations.fade': fadeAnimationTests.length,
  'animations.slide': slideAnimationTests.length,
  'animations.scale': scaleAnimationTests.length,
  'animations.stateAnimations': allStateAnimationTests.length,
  'animations.stateToggle': stateToggleAnimationTests.length,
  'animations.hover': hoverAnimationTests.length,
  'animations.entryExit': entryExitAnimationTests.length,
  'animations.combined': combinedAnimationTests.length,
  'animations.quick': quickAnimationTests.length,

  // === Transforms ===
  transforms: allTransformTests.length,
  'transforms.rotate': allRotateTests.length,
  'transforms.rotate.basic': rotateBasicTests.length,
  'transforms.rotate.withOther': rotateWithOtherTransformsTests.length,
  'transforms.rotate.interactive': rotateInteractiveTests.length,
  'transforms.rotate.angles': rotateAnglesTests.length,
  'transforms.scale': allScaleTests.length,
  'transforms.scale.basic': scaleBasicTests.length,
  'transforms.scale.interactive': scaleInteractiveTests.length,
  'transforms.scale.edgeCases': scaleEdgeCasesTests.length,
  'transforms.scale.withOther': scaleWithOtherPropertiesTests.length,
  'transforms.translate': allTranslateTests.length,
  'transforms.position.basic': positionBasicTests.length,
  'transforms.stacked': stackedPositionTests.length,
  'transforms.zIndex': zIndexTests.length,
  'transforms.offset': translateOffsetTests.length,
  'transforms.quick': quickTransformTests.length,

  // === Gradients ===
  gradients: allGradientTests.length,
  'gradients.horizontal': horizontalGradientTests.length,
  'gradients.vertical': verticalGradientTests.length,
  'gradients.angled': angledGradientTests.length,
  'gradients.text': gradientTextTests.length,
  'gradients.withEffects': gradientWithEffectsTests.length,
  'gradients.quick': quickGradientTests.length,

  // === Data Binding ===
  dataBinding: allDataBindingTests.length,
  'dataBinding.variables': variableTests.length,
  'dataBinding.collections': collectionTests.length,
  'dataBinding.conditionals': conditionalTests.length,
  'dataBinding.tokens': tokenTests.length,
  'dataBinding.inputBinding': inputBindingTests.length,

  // === Actions ===
  actions: allActionTests.length,
  'actions.visibility': visibilityActionTests.length,
  'actions.counter': counterActionTests.length,
  'actions.scroll': scrollActionTests.length,
  'actions.toast': toastActionTests.length,
  'actions.form': formActionTests.length,
  'actions.navigation': navigationActionTests.length,
  'actions.clipboard': clipboardActionTests.length,
  'actions.overlay': overlayActionTests.length,
  'actions.crud': crudActionTests.length,
  'actions.combined': combinedActionTests.length,

  // === Components ===
  components: allComponentTests.length,
  'components.basic': basicComponentTests.length,
  'components.propertyOverride': propertyOverrideTests.length,
  'components.inheritance': inheritanceTests.length,
  'components.variants': variantTests.length,
  'components.nestedSlots': nestedSlotTests.length,
  'components.layout': layoutComponentTests.length,
  'components.multiLevelInheritance': multiLevelInheritanceTests.length,
  'components.state': componentStateTests.length,
  'components.complex': complexComponentTests.length,

  // === Events ===
  events: allEventTests.length,
  'events.click': clickEventTests.length,
  'events.hover': hoverEventTests.length,
  'events.focus': focusEventTests.length,
  'events.input': inputEventTests.length,
  'events.keyboard': keyboardEventTests.length,
  'events.view': viewEventTests.length,
  'events.combined': combinedEventTests.length,
  'events.edgeCases': eventEdgeCaseTests.length,

  // === Responsive ===
  responsive: allResponsiveTests.length,
  'responsive.basic': basicResponsiveTests.length,
  'responsive.layout': responsiveLayoutTests.length,
  'responsive.styling': responsiveStylingTests.length,
  'responsive.visibility': responsiveVisibilityTests.length,
  'responsive.customThreshold': customThresholdTests.length,
  'responsive.components': responsiveComponentTests.length,
  'responsive.complex': complexResponsiveTests.length,

  // === Sync ===
  sync: allSyncTests.length,
  'sync.editorToPreview': editorToPreviewTests.length,
  'sync.previewToEditor': previewToEditorTests.length,
  'sync.panelToEditor': panelToEditorTests.length,
  'sync.editorToPanel': editorToPanelTests.length,
  'sync.multiDirectional': multiDirectionalTests.length,
  'sync.rapidChange': rapidChangeTests.length,
  'sync.edgeCases': syncEdgeCaseTests.length,
  'sync.selectionPersistence': selectionPersistenceTests.length,
  'sync.complexScenario': complexScenarioTests.length,

  // === Property Robustness ===
  propertyRobustness: allPropertyRobustnessTests.length,
  'propertyRobustness.commaFormat': commaFormatTests.length,
  'propertyRobustness.autoSeparation': autoSeparationTests.length,
  'propertyRobustness.multiValue': multiValueTests.length,
  'propertyRobustness.alias': aliasTests.length,
  'propertyRobustness.order': orderTests.length,
  'propertyRobustness.mixedFormat': mixedFormatTests.length,
  'propertyRobustness.edgeCases': propertyEdgeCaseTests.length,
  'propertyRobustness.sequentialMod': sequentialModTests.length,
  'propertyRobustness.previewSync': previewSyncTests.length,

  // === Stress Tests ===
  stress: allStressTests.length,
  'stress.raceConditions': raceConditionTests.length,
  'stress.codeModifier': codeModifierTests.length,

  // === Project (Multi-File) ===
  project: allProjectTests.length,
  'project.setup': projectSetupTests.length,
  'project.tokenComponent': tokenComponentTests.length,
  'project.screenNavigation': screenNavigationTests.length,
  'project.complexLayout': projectComplexLayoutTests.length,
  'project.fileSwitching': fileSwitchingTests.length,

  // === Compiler Verification ===
  compilerVerification: allCompilerVerificationTests.length,
  'compilerVerification.properties': complexPropertyTests.length,
  'compilerVerification.layout': layoutVerificationTests.length,
  'compilerVerification.nestedStructure': nestedStructureTests.length,
  'compilerVerification.tokenResolution': tokenResolutionTests.length,
  'compilerVerification.conditionals': compilerConditionalTests.length,
  'compilerVerification.collections': compilerCollectionTests.length,
  'compilerVerification.componentInheritance': componentInheritanceTests.length,
  'compilerVerification.inlineSyntax': inlineSyntaxTests.length,
  'compilerVerification.primitives': compilerPrimitivesTests.length,
  'compilerVerification.edgeCases': compilerEdgeCaseTests.length,
  // Error Handling Tests (B2.1)
  'compilerVerification.errors': allCompilerErrorTests.length,
  'compilerVerification.errors.invalidProperty': invalidPropertyTests.length,
  'compilerVerification.errors.undefinedComponent': undefinedComponentTests.length,
  'compilerVerification.errors.invalidToken': invalidTokenTests.length,
  'compilerVerification.errors.syntax': syntaxErrorTests.length,
  'compilerVerification.errors.recovery': compilerErrorRecoveryTests.length,
  'compilerVerification.errors.edgeCases': edgeCaseErrorTests.length,

  // === UI Builder ===
  uiBuilder: allUIBuilderTests.length,
  'uiBuilder.level1': uiBuilderLevel1Tests.length,
  'uiBuilder.level2': uiBuilderLevel2Tests.length,

  // === Play Mode ===
  playMode: allPlayModeTests.length,
  'playMode.activation': playModeActivationTests.length,
  'playMode.visual': playModeVisualTests.length,
  'playMode.reset': playModeResetTests.length,
  'playMode.device': playModeDeviceTests.length,
  'playMode.integration': playModeIntegrationTests.length,
  'playMode.input': playModeInputTests.length,
  'playMode.quick': quickPlayModeTests.length,

  // === Test System (meta) ===
  testSystem: allTestSystemTests.length,
  'testSystem.fixtures': fixturesTests.length,
  'testSystem.isolation': isolationTests.length,
  'testSystem.keyboard': testSystemKeyboardTests.length,
  'testSystem.waitHelper': waitHelperTests.length,

  // === Draft Lines (AI-assist) ===
  draftLines: allDraftLineTests.length,
  'draftLines.detection': draftLineDetectionTests.length,
  'draftLines.decoration': draftLineDecorationTests.length,
  'draftLines.integration': draftLineIntegrationTests.length,
  // Comprehensive Draft Lines Tests
  'draftLines.comprehensive': allComprehensiveDraftLineTests.length,

  // === Draft Mode (-- marker for AI code generation) ===
  draftMode: allDraftModeTests.length,
  'draftMode.basic': allBasicDraftModeTests.length,
  'draftMode.visual': allVisualDraftModeTests.length,
  'draftMode.autocomplete': allAutocompleteDraftModeTests.length,
  'draftMode.scenarios': allScenarioDraftModeTests.length,
  'draftMode.basic.detection': draftModeDetectionTests.length,
  'draftMode.basic.indentation': draftModeIndentationTests.length,
  'draftMode.basic.blockStructure': draftModeBlockTests.length,
  'draftMode.basic.lineDetection': draftModeLineTests.length,
  'draftMode.basic.dynamic': draftModeDynamicTests.length,
  'draftMode.visual.css': draftModeCssTests.length,
  'draftMode.visual.muted': draftModeMutedTests.length,
  'draftMode.visual.dynamic': draftModeVisualDynamicTests.length,
  'draftMode.autocomplete.suppression': draftModeSuppressionTests.length,
  'draftMode.autocomplete.pickers': draftModePickerTests.length,
  'draftMode.scenarios.generation': draftModeGenerationTests.length,
  'draftMode.scenarios.correction': draftModeCorrectionTests.length,
  'draftMode.scenarios.refactoring': draftModeRefactoringTests.length,
  'draftMode.scenarios.workflow': draftModeWorkflowTests.length,
  'draftMode.scenarios.context': draftModeContextTests.length,
  'draftLines.comprehensive.detection': comprehensiveDetectionTests.length,
  'draftLines.comprehensive.decoration': comprehensiveDecorationTests.length,
  'draftLines.comprehensive.state': comprehensiveStateTests.length,
  'draftLines.comprehensive.workflow': comprehensiveWorkflowTests.length,
  'draftLines.comprehensive.edge': comprehensiveEdgeCaseTests.length,
  'draftLines.comprehensive.inspection': comprehensiveInspectionTests.length,
  // AI Workflow
  'draftLines.aiWorkflow': allAIWorkflowTests.length,
  'draftLines.aiWorkflow.workflow': aiWorkflowTests.length,
  'draftLines.aiWorkflow.visual': visualVerificationTests.length,

  // === Integration (real-world workflows) ===
  integration: allIntegrationTests.length,
  'integration.componentToken': integrationTokenTests.length,
  'integration.componentState': integrationStateTests.length,
  'integration.componentTokenState': integrationTrifectaTests.length,
  'integration.nestedComponents': integrationNestedTests.length,
  'integration.realWorldPatterns': integrationPatternTests.length,
  'integration.layoutIntegration': integrationLayoutTests.length,
  'integration.dataIteration': integrationDataTests.length,
  'integration.conditional': integrationConditionalTests.length,
  'integration.iconButton': integrationIconButtonTests.length,
  'integration.animation': integrationAnimationTests.length,
  'integration.form': integrationFormTests.length,
  'integration.gradient': integrationGradientTests.length,

  // === Tutorial ===
  tutorial: allTutorialTests.length,
  'tutorial.01-elemente': chapter_01_elementeTests.length,
  'tutorial.02-komponenten': chapter_02_komponentenTests.length,
  'tutorial.03-tokens': chapter_03_tokensTests.length,
  'tutorial.04-layout': chapter_04_layoutTests.length,
  'tutorial.05-styling': chapter_05_stylingTests.length,
  'tutorial.06-states': chapter_06_statesTests.length,
  'tutorial.07-animationen': chapter_07_animationenTests.length,
  'tutorial.08-functions': chapter_08_functionsTests.length,
  'tutorial.09-daten': chapter_09_datenTests.length,
  'tutorial.10-seiten': chapter_10_seitenTests.length,
  'tutorial.11-eingabe': chapter_11_eingabeTests.length,
  'tutorial.12-navigation': chapter_12_navigationTests.length,
  'tutorial.13-overlays': chapter_13_overlaysTests.length,
  'tutorial.14-tabellen': chapter_14_tabellenTests.length,
  'tutorial.15-charts': chapter_15_chartsTests.length,

  // === Total ===
  total: allTests.length,
}

// =============================================================================
// Runner Functions
// =============================================================================

/**
 * Run all tests
 */
export async function runAllTests(): Promise<TestSuiteResult> {
  const api = (window as any).__mirrorTest
  if (!api) {
    throw new Error('Mirror Test API not available')
  }
  return api.run(allTests, 'All Mirror Tests')
}

/**
 * Run quick tests (fast validation)
 */
export async function runQuickTests(): Promise<TestSuiteResult> {
  const api = (window as any).__mirrorTest
  if (!api) {
    throw new Error('Mirror Test API not available')
  }
  return api.run(quickTests, 'Quick Tests')
}

/**
 * Run tests by category
 *
 * Categories are organized hierarchically with dot notation:
 * - Top-level: 'primitives', 'layout', 'styling', etc.
 * - Sub-categories: 'layout.direction', 'layout.grid', 'styling.colors', etc.
 */
export type TestCategory =
  // === Primitives ===
  | 'primitives'
  | 'primitives.basic'
  | 'primitives.semantic'
  | 'primitives.headings'
  | 'primitives.defaults'

  // === Layout ===
  | 'layout'
  | 'layout.direction'
  | 'layout.alignment'
  | 'layout.distribution'
  | 'layout.gap'
  | 'layout.wrap'
  | 'layout.flex'
  | 'layout.stacked'
  | 'layout.grid'
  | 'layout.nesting'
  | 'layout.complex'
  // Extended Layout (B3.3)
  | 'layout.extended'
  | 'layout.extended.minMaxWidth'
  | 'layout.extended.minMaxHeight'
  | 'layout.extended.gridPosition'
  | 'layout.extended.rowHeight'
  | 'layout.extended.gapXY'
  | 'layoutShortcuts'
  | 'layoutVerification'
  | 'layoutVerification.direction'
  | 'layoutVerification.size'
  | 'layoutVerification.gap'
  | 'layoutVerification.alignment'
  | 'layoutVerification.complex'

  // === Styling ===
  | 'styling'
  | 'styling.colors'
  | 'styling.sizing'
  | 'styling.spacing'
  | 'styling.border'
  | 'styling.typography'
  | 'styling.effects'
  | 'styling.visibility'
  | 'styling.combined'
  // Extended Styling (B3.2)
  | 'styling.extended'
  | 'styling.extended.rgba'
  | 'styling.extended.hexAlpha'
  | 'styling.extended.perSidePadding'
  | 'styling.extended.perSideMargin'
  | 'styling.extended.perSideBorder'
  | 'styling.extended.shadowValidation'

  // === Zag Components ===
  | 'zag'
  | 'zag.checkbox'
  | 'zag.switch'
  | 'zag.slider'
  | 'zag.select'
  | 'zag.radioGroup'
  | 'zag.dialog'
  | 'zag.tooltip'
  | 'zag.tabs'
  | 'zag.datePicker'
  | 'zag.sidenav'
  | 'zag.inLayout'

  // === Interactions ===
  | 'interactions'
  | 'interactions.click'
  | 'interactions.hover'
  | 'interactions.toggle'
  | 'interactions.focus'
  | 'interactions.input'
  | 'interactions.keyboard'
  | 'interactions.selection'
  | 'interactions.dragDrop'
  | 'interactions.combined'
  | 'multiselect'
  | 'multiselect.shiftClick'
  | 'multiselect.metaClick'
  | 'multiselect.clearSelection'
  | 'multiselect.cssClass'
  | 'editorMultiselect'
  | 'editorMultiselect.basic'
  | 'editorMultiselect.parentChild'
  | 'editorMultiselect.singleLine'
  | 'paddingDrag'
  | 'paddingDrag.singleSide'
  | 'paddingDrag.allSides'
  | 'paddingDrag.axis'
  | 'paddingDrag.liveVisual'
  | 'paddingDrag.robustness'
  | 'resizeHandleDblClick'
  | 'resizeHandleDblClick.horizontal'
  | 'resizeHandleDblClick.vertical'
  | 'resizeHandleDblClick.corner'
  | 'resizeHandleDrag'
  | 'paddingHandlers'
  | 'paddingHandlers.modeToggle'
  | 'paddingHandlers.position'
  | 'paddingHandlers.drag'
  | 'paddingHandlers.modeSelection'
  | 'tokenExtract'

  // === Validation Tests (B3.1) ===
  | 'validation'
  | 'validation.spreadCss'
  | 'validation.ungroupDom'
  | 'validation.selectionUndoRedo'
  | 'validation.multiselectVisual'

  // === Bidirectional ===
  | 'bidirectional'
  | 'bidirectional.codeToPreview'
  | 'bidirectional.selectionSync'
  | 'bidirectional.sourceMap'
  | 'bidirectional.propertyPanel'
  | 'bidirectional.complexSync'
  | 'bidirectional.errorRecovery'

  // === Undo/Redo ===
  | 'undoRedo'
  | 'undoRedo.basicUndo'
  | 'undoRedo.basicRedo'
  | 'undoRedo.editTypes'
  | 'undoRedo.withSelection'
  | 'undoRedo.edgeCases'

  // === Autocomplete ===
  | 'autocomplete'
  | 'autocomplete.primitives'
  | 'autocomplete.properties'
  | 'autocomplete.values'
  | 'autocomplete.icons'
  | 'autocomplete.tokens'
  | 'autocomplete.states'
  | 'autocomplete.components'

  // === Drag & Drop ===
  | 'comprehensiveDrag'
  | 'comprehensiveDrag.paletteDropBasic'
  | 'comprehensiveDrag.paletteDropPosition'
  | 'comprehensiveDrag.paletteDropNested'
  | 'comprehensiveDrag.paletteDropHorizontal'
  | 'comprehensiveDrag.paletteDropLayout'
  | 'comprehensiveDrag.paletteDropZag'
  | 'comprehensiveDrag.paletteDropComplex'
  | 'comprehensiveDrag.canvasMoveReorder'
  | 'comprehensiveDrag.canvasMoveCross'
  | 'comprehensiveDrag.canvasMoveHorizontal'
  | 'comprehensiveDrag.canvasMoveComplex'
  | 'comprehensiveDrag.stackedDrop'
  | 'stackedDrag'
  | 'stackedDrag.basic'
  | 'stackedDrag.edgeCases'
  | 'stackedDrag.layoutDetection'
  | 'flexReorder'
  | 'flexReorder.buttonVertical'
  | 'flexReorder.buttonHorizontal'
  | 'flexReorder.text'
  | 'flexReorder.icon'
  | 'flexReorder.input'
  | 'flexReorder.image'
  | 'flexReorder.dividerSpacer'
  | 'flexReorder.linkTextarea'
  | 'flexReorder.mixedComponent'
  | 'flexReorder.zagComponent'
  | 'flexReorder.nestedContainer'
  | 'flexReorder.edgeCases'
  | 'flexReorder.sequential'
  | 'alignmentZone'
  | 'alignmentZone.basic'
  | 'alignmentZone.allZones'
  | 'alignmentZone.edgeCases'
  | 'alignmentZone.componentVariety'
  | 'alignmentFromEmpty'
  | 'alignmentFromEmpty.basic'
  | 'alignmentFromEmpty.all9Zones'
  | 'alignmentFromEmpty.visualFeedback'
  | 'alignmentFromEmpty.parentChild'

  // === Property Panel ===
  | 'propertyPanel'
  | 'propertyPanel.tokenDisplay'
  | 'propertyPanel.tokenValue'
  | 'propertyPanel.tokenInteraction'
  | 'propertyPanel.projectToken'
  | 'propertyPanel.radiusChange'
  | 'propertyPanel.events'
  | 'propertyPanel.events.add'
  | 'propertyPanel.events.existing'
  | 'propertyPanel.events.edit'
  | 'propertyPanel.events.delete'
  | 'propertyPanel.events.integration'
  // Error Handling Tests (B2.2)
  | 'propertyPanel.errors'
  | 'propertyPanel.errors.colors'
  | 'propertyPanel.errors.sizes'
  | 'propertyPanel.errors.tokens'
  | 'propertyPanel.errors.spacing'
  | 'propertyPanel.errors.border'
  | 'propertyPanel.errors.typography'
  | 'propertyPanel.errors.edgeCases'
  | 'colorPicker'
  | 'iconPicker'

  // === Charts ===
  | 'charts'
  | 'charts.dataFile'
  | 'charts.basic'
  | 'charts.styling'
  | 'charts.layout'
  | 'charts.data'

  // === Workflow ===
  | 'workflow'
  | 'workflow.projectWithCode'
  | 'workflow.projectWithDragDrop'
  | 'workflow.application'

  // === States ===
  | 'states'
  | 'states.toggle'
  | 'states.toggle.basic'
  | 'states.toggle.multiple'
  | 'states.toggle.content'
  | 'states.exclusive'
  | 'states.exclusive.basic'
  | 'states.exclusive.group'
  | 'states.exclusive.navigation'
  | 'states.hover'
  | 'states.hover.basic'
  | 'states.hover.transition'
  | 'states.hover.nested'
  | 'states.hover.scale'
  | 'states.crossElement'
  | 'states.crossElement.basic'
  | 'states.crossElement.dropdown'
  | 'states.crossElement.modal'
  | 'states.crossElement.form'
  | 'states.quick'

  // === Animations ===
  | 'animations'
  | 'animations.presets'
  | 'animations.spin'
  | 'animations.pulse'
  | 'animations.bounce'
  | 'animations.shake'
  | 'animations.fade'
  | 'animations.slide'
  | 'animations.scale'
  | 'animations.stateAnimations'
  | 'animations.stateToggle'
  | 'animations.hover'
  | 'animations.entryExit'
  | 'animations.combined'
  | 'animations.quick'

  // === Transforms ===
  | 'transforms'
  | 'transforms.rotate'
  | 'transforms.rotate.basic'
  | 'transforms.rotate.withOther'
  | 'transforms.rotate.interactive'
  | 'transforms.rotate.angles'
  | 'transforms.scale'
  | 'transforms.scale.basic'
  | 'transforms.scale.interactive'
  | 'transforms.scale.edgeCases'
  | 'transforms.scale.withOther'
  | 'transforms.translate'
  | 'transforms.position.basic'
  | 'transforms.stacked'
  | 'transforms.zIndex'
  | 'transforms.offset'
  | 'transforms.quick'

  // === Gradients ===
  | 'gradients'
  | 'gradients.horizontal'
  | 'gradients.vertical'
  | 'gradients.angled'
  | 'gradients.text'
  | 'gradients.withEffects'
  | 'gradients.quick'

  // === Data Binding ===
  | 'dataBinding'
  | 'dataBinding.variables'
  | 'dataBinding.collections'
  | 'dataBinding.conditionals'
  | 'dataBinding.tokens'
  | 'dataBinding.inputBinding'

  // === Actions ===
  | 'actions'
  | 'actions.visibility'
  | 'actions.counter'
  | 'actions.scroll'
  | 'actions.toast'
  | 'actions.form'
  | 'actions.navigation'
  | 'actions.clipboard'
  | 'actions.overlay'
  | 'actions.crud'
  | 'actions.combined'

  // === Components ===
  | 'components'
  | 'components.basic'
  | 'components.propertyOverride'
  | 'components.inheritance'
  | 'components.variants'
  | 'components.nestedSlots'
  | 'components.layout'
  | 'components.multiLevelInheritance'
  | 'components.state'
  | 'components.complex'

  // === Tables ===
  | 'tables'
  | 'tables.static'
  | 'tables.dataBound'
  | 'tables.layout'
  | 'tables.styling'
  | 'tables.actions'
  | 'tables.filter'
  | 'tables.complex'

  // === Events ===
  | 'events'
  | 'events.click'
  | 'events.hover'
  | 'events.focus'
  | 'events.input'
  | 'events.keyboard'
  | 'events.view'
  | 'events.combined'
  | 'events.edgeCases'

  // === Responsive ===
  | 'responsive'
  | 'responsive.basic'
  | 'responsive.layout'
  | 'responsive.styling'
  | 'responsive.visibility'
  | 'responsive.customThreshold'
  | 'responsive.components'
  | 'responsive.complex'

  // === Sync ===
  | 'sync'
  | 'sync.editorToPreview'
  | 'sync.previewToEditor'
  | 'sync.panelToEditor'
  | 'sync.editorToPanel'
  | 'sync.multiDirectional'
  | 'sync.rapidChange'
  | 'sync.edgeCases'
  | 'sync.selectionPersistence'
  | 'sync.complexScenario'

  // === Property Robustness ===
  | 'propertyRobustness'
  | 'propertyRobustness.commaFormat'
  | 'propertyRobustness.autoSeparation'
  | 'propertyRobustness.multiValue'
  | 'propertyRobustness.alias'
  | 'propertyRobustness.order'
  | 'propertyRobustness.mixedFormat'
  | 'propertyRobustness.edgeCases'
  | 'propertyRobustness.sequentialMod'
  | 'propertyRobustness.previewSync'

  // === Stress Tests ===
  | 'stress'
  | 'stress.raceConditions'
  | 'stress.codeModifier'

  // === Project (Multi-File) ===
  | 'project'
  | 'project.setup'
  | 'project.tokenComponent'
  | 'project.screenNavigation'
  | 'project.complexLayout'
  | 'project.fileSwitching'

  // === Compiler Verification ===
  | 'compilerVerification'
  | 'compilerVerification.properties'
  | 'compilerVerification.layout'
  | 'compilerVerification.nestedStructure'
  | 'compilerVerification.tokenResolution'
  | 'compilerVerification.conditionals'
  | 'compilerVerification.collections'
  | 'compilerVerification.componentInheritance'
  | 'compilerVerification.inlineSyntax'
  | 'compilerVerification.primitives'
  | 'compilerVerification.edgeCases'
  // Error Handling Tests (B2.1)
  | 'compilerVerification.errors'
  | 'compilerVerification.errors.invalidProperty'
  | 'compilerVerification.errors.undefinedComponent'
  | 'compilerVerification.errors.invalidToken'
  | 'compilerVerification.errors.syntax'
  | 'compilerVerification.errors.recovery'
  | 'compilerVerification.errors.edgeCases'

  // === UI Builder ===
  | 'uiBuilder'
  | 'uiBuilder.level1'
  | 'uiBuilder.level2'

  // === Play Mode ===
  | 'playMode'
  | 'playMode.activation'
  | 'playMode.visual'
  | 'playMode.reset'
  | 'playMode.device'
  | 'playMode.integration'
  | 'playMode.input'
  | 'playMode.quick'

  // === Test System (meta) ===
  | 'testSystem'
  | 'testSystem.fixtures'
  | 'testSystem.isolation'
  | 'testSystem.keyboard'
  | 'testSystem.waitHelper'

  // === Draft Lines (AI-assist) ===
  | 'draftLines'
  | 'draftLines.detection'
  | 'draftLines.decoration'
  | 'draftLines.integration'
  // Comprehensive Draft Lines Tests
  | 'draftLines.comprehensive'
  | 'draftLines.comprehensive.detection'
  | 'draftLines.comprehensive.decoration'
  | 'draftLines.comprehensive.state'
  | 'draftLines.comprehensive.workflow'
  | 'draftLines.comprehensive.edge'
  | 'draftLines.comprehensive.inspection'
  | 'draftLines.aiWorkflow'
  | 'draftLines.aiWorkflow.workflow'
  | 'draftLines.aiWorkflow.visual'

  // === Draft Mode (-- marker for AI code generation) ===
  | 'draftMode'
  | 'draftMode.basic'
  | 'draftMode.visual'
  | 'draftMode.autocomplete'
  | 'draftMode.scenarios'
  // Basic sub-categories
  | 'draftMode.basic.detection'
  | 'draftMode.basic.indentation'
  | 'draftMode.basic.blockStructure'
  | 'draftMode.basic.lineDetection'
  | 'draftMode.basic.dynamic'
  // Visual sub-categories
  | 'draftMode.visual.css'
  | 'draftMode.visual.muted'
  | 'draftMode.visual.dynamic'
  // Autocomplete sub-categories
  | 'draftMode.autocomplete.suppression'
  | 'draftMode.autocomplete.pickers'
  // Scenario sub-categories
  | 'draftMode.scenarios.generation'
  | 'draftMode.scenarios.correction'
  | 'draftMode.scenarios.refactoring'
  | 'draftMode.scenarios.workflow'
  | 'draftMode.scenarios.context'

  // === Integration (real-world workflows) ===
  | 'integration'
  | 'integration.componentToken'
  | 'integration.componentState'
  | 'integration.componentTokenState'
  | 'integration.nestedComponents'
  | 'integration.realWorldPatterns'
  | 'integration.layoutIntegration'
  | 'integration.dataIteration'
  | 'integration.conditional'
  | 'integration.iconButton'
  | 'integration.animation'
  | 'integration.form'
  | 'integration.gradient'

  // === Tutorial ===
  | 'tutorial'
  | 'tutorial.01-elemente'
  | 'tutorial.02-komponenten'
  | 'tutorial.03-tokens'
  | 'tutorial.04-layout'
  | 'tutorial.05-styling'
  | 'tutorial.06-states'
  | 'tutorial.07-animationen'
  | 'tutorial.08-functions'
  | 'tutorial.09-daten'
  | 'tutorial.10-seiten'
  | 'tutorial.11-eingabe'
  | 'tutorial.12-navigation'
  | 'tutorial.13-overlays'
  | 'tutorial.14-tabellen'
  | 'tutorial.15-charts'

export async function runCategory(category: TestCategory): Promise<TestSuiteResult> {
  const api = (window as any).__mirrorTest
  if (!api) {
    throw new Error('Mirror Test API not available')
  }

  const tests: Record<TestCategory, TestCase[]> = {
    // === Primitives ===
    primitives: allPrimitivesTests,
    'primitives.basic': basicPrimitives,
    'primitives.semantic': semanticPrimitives,
    'primitives.headings': headingPrimitives,
    'primitives.defaults': primitiveDefaultsTests,

    // === Layout ===
    layout: allLayoutTests,
    'layout.direction': directionTests,
    'layout.alignment': alignmentTests,
    'layout.distribution': distributionTests,
    'layout.gap': gapTests,
    'layout.wrap': wrapTests,
    'layout.flex': flexTests,
    'layout.stacked': stackedTests,
    'layout.grid': gridTests,
    'layout.nesting': nestingTests,
    'layout.complex': complexLayoutTests,
    // Extended Layout (B3.3)
    'layout.extended': allExtendedLayoutTests,
    'layout.extended.minMaxWidth': minMaxWidthTests,
    'layout.extended.minMaxHeight': minMaxHeightTests,
    'layout.extended.gridPosition': gridPositionTests,
    'layout.extended.rowHeight': rowHeightTests,
    'layout.extended.gapXY': gapXYTests,
    layoutShortcuts: allLayoutShortcutTests,
    layoutVerification: allLayoutVerificationTests,
    'layoutVerification.direction': directionVerificationTests,
    'layoutVerification.size': sizeVerificationTests,
    'layoutVerification.gap': gapVerificationTests,
    'layoutVerification.alignment': alignmentVerificationTests,
    'layoutVerification.complex': complexLayoutVerificationTests,

    // === Styling ===
    styling: allStylingTests,
    'styling.colors': colorTests,
    'styling.sizing': sizingTests,
    'styling.spacing': spacingTests,
    'styling.border': borderTests,
    'styling.typography': typographyTests,
    'styling.effects': effectTests,
    'styling.visibility': visibilityTests,
    'styling.combined': stylingCombinedTests,
    // Extended Styling (B3.2)
    'styling.extended': allExtendedStylingTests,
    'styling.extended.rgba': rgbaColorTests,
    'styling.extended.hexAlpha': hexAlphaTests,
    'styling.extended.perSidePadding': perSidePaddingTests,
    'styling.extended.perSideMargin': perSideMarginTests,
    'styling.extended.perSideBorder': perSideBorderTests,
    'styling.extended.shadowValidation': shadowValidationTests,

    // === Zag Components ===
    zag: allZagTests,
    'zag.checkbox': checkboxTests,
    'zag.switch': switchTests,
    'zag.slider': sliderTests,
    'zag.select': selectTests,
    'zag.radioGroup': radioGroupTests,
    'zag.dialog': dialogTests,
    'zag.tooltip': tooltipTests,
    'zag.tabs': tabsTests,
    'zag.datePicker': datePickerTests,
    'zag.sidenav': sidenavTests,
    'zag.inLayout': zagInLayoutTests,
    'zag.pureSelect': pureSelectTests,

    // === Interactions ===
    interactions: allInteractionTests,
    'interactions.click': clickTests,
    'interactions.hover': hoverTests,
    'interactions.toggle': toggleTests,
    'interactions.focus': focusTests,
    'interactions.input': inputTests,
    'interactions.keyboard': keyboardTests,
    'interactions.selection': selectionTests,
    'interactions.dragDrop': dragDropTests,
    'interactions.combined': interactionCombinedTests,
    multiselect: allMultiselectTests,
    'multiselect.shiftClick': shiftClickTests,
    'multiselect.metaClick': metaClickTests,
    'multiselect.clearSelection': clearSelectionTests,
    'multiselect.cssClass': multiselectCssClassTests,
    editorMultiselect: allEditorMultiselectTests,
    'editorMultiselect.basic': basicEditorMultiselectTests,
    'editorMultiselect.parentChild': parentChildFilterTests,
    'editorMultiselect.singleLine': editorSingleLineTests,
    paddingDrag: allPaddingTests,
    'paddingDrag.singleSide': singleSidePaddingTests,
    'paddingDrag.allSides': allSidesPaddingTests,
    'paddingDrag.axis': axisPaddingTests,
    'paddingDrag.liveVisual': liveVisualFeedbackTests,
    'paddingDrag.robustness': robustnessTests,
    marginDrag: allMarginTests,
    'marginDrag.singleSide': singleSideMarginTests,
    'marginDrag.allSides': allSidesMarginTests,
    'marginDrag.axis': axisMarginTests,
    'marginDrag.liveVisual': marginVisualFeedbackTests,
    'marginDrag.robustness': marginRobustnessTests,
    'marginDrag.screenshot': marginScreenshotTests,
    marginHandlers: allMarginHandlerTests,
    'marginHandlers.modeToggle': marginModeToggleTests,
    'marginHandlers.position': marginHandlePositionTests,
    'marginHandlers.drag': marginHandleDragTests,
    'marginHandlers.modeSelection': marginModeSelectionTests,
    gapHandlers: allGapHandlerTests,
    'gapHandlers.modeToggle': gapModeToggleTests,
    'gapHandlers.modeSwitching': gapModeSwitchingTests,
    'gapHandlers.direction': gapHandleDirectionTests,
    'gapHandlers.count': gapHandleCountTests,
    'gapHandlers.position': gapHandlePositionTests,
    'gapHandlers.drag': gapHandleDragTests,
    'gapHandlers.modeSelection': gapModeSelectionTests,
    'gapHandlers.values': gapValueTests,
    'gapHandlers.nested': gapNestedContainerTests,
    resizeHandleDblClick: allResizeHandleDblClickTests,
    'resizeHandleDblClick.horizontal': horizontalHandleTests,
    'resizeHandleDblClick.vertical': verticalHandleTests,
    'resizeHandleDblClick.corner': cornerHandleTests,
    resizeHandleDrag: resizeHandleDragTests,
    paddingHandlers: allPaddingHandlerTests,
    'paddingHandlers.modeToggle': paddingModeToggleTests,
    'paddingHandlers.position': paddingHandlePositionTests,
    'paddingHandlers.drag': paddingHandleDragTests,
    'paddingHandlers.modeSelection': paddingModeSelectionTests,
    tokenExtract: tokenExtractTests,
    wrapLayout: allWrapLayoutTests,
    'wrapLayout.hKey': hKeyBehaviorTests,
    'wrapLayout.vKey': vKeyBehaviorTests,
    'wrapLayout.transitions': selectionTransitionTests,
    'wrapLayout.nested': nestedElementTests,
    'wrapLayout.gap': gapCalculationTests,
    'wrapLayout.edge': wrapEdgeCaseTests,
    ungroup: allUngroupTests,
    'ungroup.basic': basicUngroupTests,
    'ungroup.cannotUngroup': cannotUngroupTests,
    'ungroup.nested': nestedUngroupTests,
    'ungroup.childPreservation': childPreservationTests,
    'ungroup.groupCycle': groupUngroupCycleTests,
    'ungroup.selectionAfter': selectionAfterUngroupTests,
    'ungroup.modifiers': ungroupModifierTests,
    'ungroup.emptyLines': ungroupEmptyLineTests,
    spreadToggle: allSpreadToggleTests,
    'spreadToggle.basic': basicSpreadTests,
    'spreadToggle.containers': spreadContainerTests,
    'spreadToggle.edgeCases': spreadEdgeCaseTests,
    'spreadToggle.modifiers': spreadModifierTests,
    'spreadToggle.combined': spreadCombinedTests,
    snapping: allSnappingTests,
    'snapping.paddingToken': paddingTokenSnappingTests,
    'snapping.marginToken': marginTokenSnappingTests,
    'snapping.gapToken': gapTokenSnappingTests,
    'snapping.resizeGrid': resizeGridSnappingTests,
    'snapping.bypass': snappingBypassTests,
    'snapping.indicator': snapIndicatorTests,
    'snapping.gridFallback': gridSnappingFallbackTests,
    'snapping.tokenPriority': tokenPriorityTests,

    // === Validation Tests (B3.1) ===
    validation: allValidationTests,
    'validation.spreadCss': spreadCssTests,
    'validation.ungroupDom': ungroupDomTests,
    'validation.selectionUndoRedo': selectionUndoRedoTests,
    'validation.multiselectVisual': multiselectVisualTests,

    // === Bidirectional ===
    bidirectional: allBidirectionalTests,
    'bidirectional.codeToPreview': codeToPreviewTests,
    'bidirectional.selectionSync': selectionSyncTests,
    'bidirectional.sourceMap': sourceMapTests,
    'bidirectional.propertyPanel': bidirectionalPanelTests,
    'bidirectional.complexSync': complexSyncTests,
    'bidirectional.errorRecovery': bidirectionalErrorRecoveryTests,

    // === Undo/Redo ===
    undoRedo: allUndoRedoTests,
    'undoRedo.basicUndo': basicUndoTests,
    'undoRedo.basicRedo': basicRedoTests,
    'undoRedo.editTypes': undoEditTypesTests,
    'undoRedo.withSelection': undoWithSelectionTests,
    'undoRedo.edgeCases': undoEdgeCasesTests,

    // === Autocomplete ===
    autocomplete: allAutocompleteTests,
    'autocomplete.primitives': primitiveCompletionTests,
    'autocomplete.properties': propertyCompletionTests,
    'autocomplete.values': valueCompletionTests,
    'autocomplete.icons': iconCompletionTests,
    'autocomplete.tokens': tokenCompletionTests,
    'autocomplete.states': stateCompletionTests,
    'autocomplete.components': componentCompletionTests,

    // === Indentation ===
    indentation: allIndentationTests,
    'indentation.guides': indentGuidesTests,
    'indentation.smartPaste': smartPasteTests,
    'indentation.blockIndent': blockIndentTests,
    'indentation.tabIndent': tabIndentTests,
    'indentation.edgeCases': indentationEdgeCases,

    // === Drag & Drop ===
    comprehensiveDrag: allComprehensiveDragTests,
    'comprehensiveDrag.paletteDropBasic': paletteDropBasicTests,
    'comprehensiveDrag.paletteDropPosition': paletteDropPositionTests,
    'comprehensiveDrag.paletteDropNested': paletteDropNestedTests,
    'comprehensiveDrag.paletteDropHorizontal': paletteDropHorizontalTests,
    'comprehensiveDrag.paletteDropLayout': paletteDropLayoutTests,
    'comprehensiveDrag.paletteDropZag': paletteDropZagTests,
    'comprehensiveDrag.paletteDropComplex': paletteDropComplexTests,
    'comprehensiveDrag.canvasMoveReorder': canvasMoveReorderTests,
    'comprehensiveDrag.canvasMoveCross': canvasMoveCrossContainerTests,
    'comprehensiveDrag.canvasMoveHorizontal': canvasMoveHorizontalTests,
    'comprehensiveDrag.canvasMoveComplex': canvasMoveComplexTests,
    'comprehensiveDrag.stackedDrop': stackedDropTests,
    stackedDrag: allStackedDragTests,
    'stackedDrag.basic': basicStackedTests,
    'stackedDrag.edgeCases': edgeCaseTests,
    'stackedDrag.layoutDetection': layoutDetectionTests,
    flexReorder: allFlexReorderTests,
    'flexReorder.buttonVertical': buttonReorderVerticalTests,
    'flexReorder.buttonHorizontal': buttonReorderHorizontalTests,
    'flexReorder.text': textReorderTests,
    'flexReorder.icon': iconReorderTests,
    'flexReorder.input': inputReorderTests,
    'flexReorder.image': imageReorderTests,
    'flexReorder.dividerSpacer': dividerSpacerReorderTests,
    'flexReorder.linkTextarea': linkTextareaReorderTests,
    'flexReorder.mixedComponent': mixedComponentReorderTests,
    'flexReorder.zagComponent': zagComponentReorderTests,
    'flexReorder.nestedContainer': nestedContainerReorderTests,
    'flexReorder.edgeCases': reorderEdgeCaseTests,
    'flexReorder.sequential': sequentialReorderTests,
    alignmentZone: allAlignmentZoneTests,
    'alignmentZone.basic': basicAlignmentZoneTests,
    'alignmentZone.allZones': allZonesTests,
    'alignmentZone.edgeCases': alignmentEdgeCaseTests,
    'alignmentZone.componentVariety': alignmentComponentTests,
    alignmentFromEmpty: allAlignmentFromEmptyTests,
    'alignmentFromEmpty.basic': alignmentFromEmptyTests,
    'alignmentFromEmpty.all9Zones': all9ZonesFromEmptyTests,
    'alignmentFromEmpty.visualFeedback': alignmentVisualFeedbackTests,
    'alignmentFromEmpty.parentChild': alignmentParentChildTests,
    alignmentFromMove: allAlignmentFromMoveTests,
    'alignmentFromMove.basic': moveSingleChildTests,
    'alignmentFromMove.all9Zones': all9ZonesFromMoveTests,
    'alignmentFromMove.multipleChildren': multipleChildrenNoAlignmentTests,
    'alignmentFromMove.edgeCases': alignmentMoveEdgeCases,

    // === Property Panel ===
    propertyPanel: allPropertyPanelTests,
    'propertyPanel.tokenDisplay': tokenDisplayTests,
    'propertyPanel.tokenValue': tokenValueTests,
    'propertyPanel.tokenInteraction': tokenInteractionTests,
    'propertyPanel.projectToken': projectTokenTests,
    'propertyPanel.radiusChange': radiusChangeTests,
    'propertyPanel.events': allEventsTests,
    'propertyPanel.events.add': addEventTests,
    'propertyPanel.events.existing': existingEventTests,
    'propertyPanel.events.edit': editEventTests,
    'propertyPanel.events.delete': deleteEventTests,
    'propertyPanel.events.integration': eventIntegrationTests,
    // Error Handling Tests (B2.2)
    'propertyPanel.errors': allPanelErrorTests,
    'propertyPanel.errors.colors': panelInvalidColorTests,
    'propertyPanel.errors.sizes': panelInvalidSizeTests,
    'propertyPanel.errors.tokens': panelInvalidTokenTests,
    'propertyPanel.errors.spacing': panelSpacingErrorTests,
    'propertyPanel.errors.border': panelBorderErrorTests,
    'propertyPanel.errors.typography': panelTypographyErrorTests,
    'propertyPanel.errors.edgeCases': panelEdgeCaseTests,
    colorPicker: colorPickerTests,
    iconPicker: iconPickerTests,
    comprehensiveProperty: allComprehensivePropertyTests,
    'comprehensiveProperty.sizing': sizingPropertyTests,
    'comprehensiveProperty.spacing': spacingPropertyTests,
    'comprehensiveProperty.color': colorPropertyTests,
    'comprehensiveProperty.border': borderPropertyTests,
    'comprehensiveProperty.typography': typographyPropertyTests,
    'comprehensiveProperty.visual': visualPropertyTests,
    'comprehensiveProperty.layout': layoutPropertyTests,
    'comprehensiveProperty.icon': iconPropertyTests,
    'comprehensiveProperty.complex': comprehensiveComplexPropertyTests,

    // === Charts ===
    charts: allChartTests,
    'charts.dataFile': dataFileTests,
    'charts.basic': basicChartTests,
    'charts.styling': chartStylingTests,
    'charts.layout': chartLayoutTests,
    'charts.data': chartDataTests,

    // === Workflow ===
    workflow: allWorkflowTests,
    'workflow.projectWithCode': projectWithCodeTests,
    'workflow.projectWithDragDrop': projectWithDragDropTests,
    'workflow.application': applicationTests,
    'workflow.dashboardE2E': dashboardE2ETests,

    // === States ===
    states: allStateTests,
    'states.toggle': allToggleTests,
    'states.toggle.basic': toggleBasicTests,
    'states.toggle.multiple': toggleMultipleTests,
    'states.toggle.content': toggleWithContentTests,
    'states.exclusive': allExclusiveTests,
    'states.exclusive.basic': exclusiveBasicTests,
    'states.exclusive.group': exclusiveGroupTests,
    'states.exclusive.navigation': exclusiveNavigationTests,
    'states.hover': allHoverTests,
    'states.hover.basic': hoverBasicTests,
    'states.hover.transition': hoverWithTransitionTests,
    'states.hover.nested': hoverNestedTests,
    'states.hover.scale': hoverScaleTests,
    'states.crossElement': allCrossElementTests,
    'states.crossElement.basic': crossElementBasicTests,
    'states.crossElement.dropdown': crossElementDropdownTests,
    'states.crossElement.modal': crossElementModalTests,
    'states.crossElement.form': crossElementFormTests,
    'states.quick': quickStateTests,

    // === Animations ===
    animations: allAnimationTests,
    'animations.presets': allAnimationPresetTests,
    'animations.spin': spinAnimationTests,
    'animations.pulse': pulseAnimationTests,
    'animations.bounce': bounceAnimationTests,
    'animations.shake': shakeAnimationTests,
    'animations.fade': fadeAnimationTests,
    'animations.slide': slideAnimationTests,
    'animations.scale': scaleAnimationTests,
    'animations.stateAnimations': allStateAnimationTests,
    'animations.stateToggle': stateToggleAnimationTests,
    'animations.hover': hoverAnimationTests,
    'animations.entryExit': entryExitAnimationTests,
    'animations.combined': combinedAnimationTests,
    'animations.quick': quickAnimationTests,

    // === Transforms ===
    transforms: allTransformTests,
    'transforms.rotate': allRotateTests,
    'transforms.rotate.basic': rotateBasicTests,
    'transforms.rotate.withOther': rotateWithOtherTransformsTests,
    'transforms.rotate.interactive': rotateInteractiveTests,
    'transforms.rotate.angles': rotateAnglesTests,
    'transforms.scale': allScaleTests,
    'transforms.scale.basic': scaleBasicTests,
    'transforms.scale.interactive': scaleInteractiveTests,
    'transforms.scale.edgeCases': scaleEdgeCasesTests,
    'transforms.scale.withOther': scaleWithOtherPropertiesTests,
    'transforms.translate': allTranslateTests,
    'transforms.position.basic': positionBasicTests,
    'transforms.stacked': stackedPositionTests,
    'transforms.zIndex': zIndexTests,
    'transforms.offset': translateOffsetTests,
    'transforms.quick': quickTransformTests,

    // === Gradients ===
    gradients: allGradientTests,
    'gradients.horizontal': horizontalGradientTests,
    'gradients.vertical': verticalGradientTests,
    'gradients.angled': angledGradientTests,
    'gradients.text': gradientTextTests,
    'gradients.withEffects': gradientWithEffectsTests,
    'gradients.quick': quickGradientTests,

    // === Data Binding ===
    dataBinding: allDataBindingTests,
    'dataBinding.variables': variableTests,
    'dataBinding.collections': collectionTests,
    'dataBinding.conditionals': conditionalTests,
    'dataBinding.tokens': tokenTests,
    'dataBinding.inputBinding': inputBindingTests,

    // === Actions ===
    actions: allActionTests,
    'actions.visibility': visibilityActionTests,
    'actions.counter': counterActionTests,
    'actions.scroll': scrollActionTests,
    'actions.toast': toastActionTests,
    'actions.form': formActionTests,
    'actions.navigation': navigationActionTests,
    'actions.clipboard': clipboardActionTests,
    'actions.overlay': overlayActionTests,
    'actions.crud': crudActionTests,
    'actions.combined': combinedActionTests,

    // === Components ===
    components: allComponentTests,
    'components.basic': basicComponentTests,
    'components.propertyOverride': propertyOverrideTests,
    'components.inheritance': inheritanceTests,
    'components.variants': variantTests,
    'components.nestedSlots': nestedSlotTests,
    'components.layout': layoutComponentTests,
    'components.multiLevelInheritance': multiLevelInheritanceTests,
    'components.state': componentStateTests,
    'components.complex': complexComponentTests,

    // === Events ===
    events: allEventTests,
    'events.click': clickEventTests,
    'events.hover': hoverEventTests,
    'events.focus': focusEventTests,
    'events.input': inputEventTests,
    'events.keyboard': keyboardEventTests,
    'events.view': viewEventTests,
    'events.combined': combinedEventTests,
    'events.edgeCases': eventEdgeCaseTests,

    // === Responsive ===
    responsive: allResponsiveTests,
    'responsive.basic': basicResponsiveTests,
    'responsive.layout': responsiveLayoutTests,
    'responsive.styling': responsiveStylingTests,
    'responsive.visibility': responsiveVisibilityTests,
    'responsive.customThreshold': customThresholdTests,
    'responsive.components': responsiveComponentTests,
    'responsive.complex': complexResponsiveTests,

    // === Sync ===
    sync: allSyncTests,
    'sync.editorToPreview': editorToPreviewTests,
    'sync.previewToEditor': previewToEditorTests,
    'sync.panelToEditor': panelToEditorTests,
    'sync.editorToPanel': editorToPanelTests,
    'sync.multiDirectional': multiDirectionalTests,
    'sync.rapidChange': rapidChangeTests,
    'sync.edgeCases': syncEdgeCaseTests,
    'sync.selectionPersistence': selectionPersistenceTests,
    'sync.complexScenario': complexScenarioTests,

    // === Property Robustness ===
    propertyRobustness: allPropertyRobustnessTests,
    'propertyRobustness.commaFormat': commaFormatTests,
    'propertyRobustness.autoSeparation': autoSeparationTests,
    'propertyRobustness.multiValue': multiValueTests,
    'propertyRobustness.alias': aliasTests,
    'propertyRobustness.order': orderTests,
    'propertyRobustness.mixedFormat': mixedFormatTests,
    'propertyRobustness.edgeCases': propertyEdgeCaseTests,
    'propertyRobustness.sequentialMod': sequentialModTests,
    'propertyRobustness.previewSync': previewSyncTests,

    // === Stress Tests ===
    stress: allStressTests,
    'stress.raceConditions': raceConditionTests,
    'stress.codeModifier': codeModifierTests,

    // === Project (Multi-File) ===
    project: allProjectTests,
    'project.setup': projectSetupTests,
    'project.tokenComponent': tokenComponentTests,
    'project.screenNavigation': screenNavigationTests,
    'project.complexLayout': projectComplexLayoutTests,
    'project.fileSwitching': fileSwitchingTests,

    // === Compiler Verification ===
    compilerVerification: allCompilerVerificationTests,
    'compilerVerification.properties': complexPropertyTests,
    'compilerVerification.layout': layoutVerificationTests,
    'compilerVerification.nestedStructure': nestedStructureTests,
    'compilerVerification.tokenResolution': tokenResolutionTests,
    'compilerVerification.conditionals': compilerConditionalTests,
    'compilerVerification.collections': compilerCollectionTests,
    'compilerVerification.componentInheritance': componentInheritanceTests,
    'compilerVerification.inlineSyntax': inlineSyntaxTests,
    'compilerVerification.primitives': compilerPrimitivesTests,
    'compilerVerification.edgeCases': compilerEdgeCaseTests,
    // Error Handling Tests (B2.1)
    'compilerVerification.errors': allCompilerErrorTests,
    'compilerVerification.errors.invalidProperty': invalidPropertyTests,
    'compilerVerification.errors.undefinedComponent': undefinedComponentTests,
    'compilerVerification.errors.invalidToken': invalidTokenTests,
    'compilerVerification.errors.syntax': syntaxErrorTests,
    'compilerVerification.errors.recovery': compilerErrorRecoveryTests,
    'compilerVerification.errors.edgeCases': edgeCaseErrorTests,

    // === UI Builder ===
    uiBuilder: allUIBuilderTests,
    'uiBuilder.level1': uiBuilderLevel1Tests,
    'uiBuilder.level2': uiBuilderLevel2Tests,

    // === Play Mode ===
    playMode: allPlayModeTests,
    'playMode.activation': playModeActivationTests,
    'playMode.visual': playModeVisualTests,
    'playMode.reset': playModeResetTests,
    'playMode.device': playModeDeviceTests,
    'playMode.integration': playModeIntegrationTests,
    'playMode.input': playModeInputTests,
    'playMode.quick': quickPlayModeTests,

    // === Test System (meta) ===
    testSystem: allTestSystemTests,
    'testSystem.fixtures': fixturesTests,
    'testSystem.isolation': isolationTests,
    'testSystem.keyboard': testSystemKeyboardTests,
    'testSystem.waitHelper': waitHelperTests,

    // === Draft Lines (AI-assist) ===
    draftLines: allDraftLineTests,
    'draftLines.detection': draftLineDetectionTests,
    'draftLines.decoration': draftLineDecorationTests,
    'draftLines.integration': draftLineIntegrationTests,
    // Comprehensive Draft Lines Tests
    'draftLines.comprehensive': allComprehensiveDraftLineTests,

    // Draft Mode (-- marker for AI code generation)
    draftMode: allDraftModeTests,
    'draftMode.basic': allBasicDraftModeTests,
    'draftMode.visual': allVisualDraftModeTests,
    'draftMode.autocomplete': allAutocompleteDraftModeTests,
    'draftMode.scenarios': allScenarioDraftModeTests,
    // Basic sub-categories
    'draftMode.basic.detection': draftModeDetectionTests,
    'draftMode.basic.indentation': draftModeIndentationTests,
    'draftMode.basic.blockStructure': draftModeBlockTests,
    'draftMode.basic.lineDetection': draftModeLineTests,
    'draftMode.basic.dynamic': draftModeDynamicTests,
    // Visual sub-categories
    'draftMode.visual.css': draftModeCssTests,
    'draftMode.visual.muted': draftModeMutedTests,
    'draftMode.visual.dynamic': draftModeVisualDynamicTests,
    // Autocomplete sub-categories
    'draftMode.autocomplete.suppression': draftModeSuppressionTests,
    'draftMode.autocomplete.pickers': draftModePickerTests,
    // Scenario sub-categories
    'draftMode.scenarios.generation': draftModeGenerationTests,
    'draftMode.scenarios.correction': draftModeCorrectionTests,
    'draftMode.scenarios.refactoring': draftModeRefactoringTests,
    'draftMode.scenarios.workflow': draftModeWorkflowTests,
    'draftMode.scenarios.context': draftModeContextTests,
    'draftLines.comprehensive.detection': comprehensiveDetectionTests,
    'draftLines.comprehensive.decoration': comprehensiveDecorationTests,
    'draftLines.comprehensive.state': comprehensiveStateTests,
    'draftLines.comprehensive.workflow': comprehensiveWorkflowTests,
    'draftLines.comprehensive.edge': comprehensiveEdgeCaseTests,
    'draftLines.comprehensive.inspection': comprehensiveInspectionTests,
    // AI Workflow Tests
    'draftLines.aiWorkflow': allAIWorkflowTests,
    'draftLines.aiWorkflow.workflow': aiWorkflowTests,
    'draftLines.aiWorkflow.visual': visualVerificationTests,

    // === Integration (real-world workflows) ===
    integration: allIntegrationTests,
    'integration.componentToken': integrationTokenTests,
    'integration.componentState': integrationStateTests,
    'integration.componentTokenState': integrationTrifectaTests,
    'integration.nestedComponents': integrationNestedTests,
    'integration.realWorldPatterns': integrationPatternTests,
    'integration.layoutIntegration': integrationLayoutTests,
    'integration.dataIteration': integrationDataTests,
    'integration.conditional': integrationConditionalTests,
    'integration.iconButton': integrationIconButtonTests,
    'integration.animation': integrationAnimationTests,
    'integration.form': integrationFormTests,
    'integration.gradient': integrationGradientTests,

    // === Tutorial ===
    tutorial: allTutorialTests,
    'tutorial.01-elemente': chapter_01_elementeTests,
    'tutorial.02-komponenten': chapter_02_komponentenTests,
    'tutorial.03-tokens': chapter_03_tokensTests,
    'tutorial.04-layout': chapter_04_layoutTests,
    'tutorial.05-styling': chapter_05_stylingTests,
    'tutorial.06-states': chapter_06_statesTests,
    'tutorial.07-animationen': chapter_07_animationenTests,
    'tutorial.08-functions': chapter_08_functionsTests,
    'tutorial.09-daten': chapter_09_datenTests,
    'tutorial.10-seiten': chapter_10_seitenTests,
    'tutorial.11-eingabe': chapter_11_eingabeTests,
    'tutorial.12-navigation': chapter_12_navigationTests,
    'tutorial.13-overlays': chapter_13_overlaysTests,
    'tutorial.14-tabellen': chapter_14_tabellenTests,
    'tutorial.15-charts': chapter_15_chartsTests,
  }

  const names: Record<TestCategory, string> = {
    // === Primitives ===
    primitives: 'Primitives',
    'primitives.basic': 'Basic Primitives',
    'primitives.semantic': 'Semantic Primitives',
    'primitives.headings': 'Heading Primitives',
    'primitives.defaults': 'Primitive Defaults',

    // === Layout ===
    layout: 'Layout',
    'layout.direction': 'Layout Direction (hor/ver)',
    'layout.alignment': 'Layout Alignment',
    'layout.distribution': 'Layout Distribution',
    'layout.gap': 'Layout Gap',
    'layout.wrap': 'Layout Wrap',
    'layout.flex': 'Layout Flex (grow/shrink)',
    'layout.stacked': 'Layout Stacked',
    'layout.grid': 'Layout Grid',
    'layout.nesting': 'Layout Nesting',
    'layout.complex': 'Complex Layout',
    // Extended Layout (B3.3)
    'layout.extended': 'Extended Layout',
    'layout.extended.minMaxWidth': 'Min/Max Width',
    'layout.extended.minMaxHeight': 'Min/Max Height',
    'layout.extended.gridPosition': 'Grid x/y Position',
    'layout.extended.rowHeight': 'Row Height',
    'layout.extended.gapXY': 'Gap-X / Gap-Y',
    layoutShortcuts: 'Layout Shortcuts (H, V, F)',
    layoutVerification: 'Layout Verification',
    'layoutVerification.direction': 'Layout Verify: Direction',
    'layoutVerification.size': 'Layout Verify: Size',
    'layoutVerification.gap': 'Layout Verify: Gap',
    'layoutVerification.alignment': 'Layout Verify: Alignment',
    'layoutVerification.complex': 'Layout Verify: Complex',

    // === Styling ===
    styling: 'Styling',
    'styling.colors': 'Colors (bg, col)',
    'styling.sizing': 'Sizing (w, h)',
    'styling.spacing': 'Spacing (pad, mar, gap)',
    'styling.border': 'Border & Radius',
    'styling.typography': 'Typography',
    'styling.effects': 'Effects (shadow, blur)',
    'styling.visibility': 'Visibility',
    'styling.combined': 'Combined Styling',
    // Extended Styling (B3.2)
    'styling.extended': 'Extended Styling',
    'styling.extended.rgba': 'RGBA Colors',
    'styling.extended.hexAlpha': 'Hex with Alpha',
    'styling.extended.perSidePadding': 'Per-Side Padding',
    'styling.extended.perSideMargin': 'Per-Side Margin',
    'styling.extended.perSideBorder': 'Per-Side Border',
    'styling.extended.shadowValidation': 'Shadow Validation',

    // === Zag Components ===
    zag: 'Zag Components',
    'zag.checkbox': 'Zag: Checkbox',
    'zag.switch': 'Zag: Switch',
    'zag.slider': 'Zag: Slider',
    'zag.select': 'Zag: Select',
    'zag.radioGroup': 'Zag: RadioGroup',
    'zag.dialog': 'Zag: Dialog',
    'zag.tooltip': 'Zag: Tooltip',
    'zag.tabs': 'Zag: Tabs',
    'zag.datePicker': 'Zag: DatePicker',
    'zag.sidenav': 'Zag: Sidenav',
    'zag.inLayout': 'Zag: In Layout',
    'zag.pureSelect': 'Pure Mirror Select',

    // === Interactions ===
    interactions: 'Interactions',
    'interactions.click': 'Click Interactions',
    'interactions.hover': 'Hover Interactions',
    'interactions.toggle': 'Toggle Interactions',
    'interactions.focus': 'Focus Interactions',
    'interactions.input': 'Input Interactions',
    'interactions.keyboard': 'Keyboard Interactions',
    'interactions.selection': 'Selection Interactions',
    'interactions.dragDrop': 'Drag & Drop Interactions',
    'interactions.combined': 'Combined Interactions',
    multiselect: 'Multiselect',
    'multiselect.shiftClick': 'Multiselect: Shift+Click',
    'multiselect.metaClick': 'Multiselect: Cmd/Ctrl+Click',
    'multiselect.clearSelection': 'Multiselect: Clear Selection',
    'multiselect.cssClass': 'Multiselect: CSS Classes',
    editorMultiselect: 'Editor Multiselect',
    'editorMultiselect.basic': 'Editor Multiselect: Basic',
    'editorMultiselect.parentChild': 'Editor Multiselect: Parent-Child',
    'editorMultiselect.singleLine': 'Editor Multiselect: Single Line',
    paddingDrag: 'Padding Drag',
    'paddingDrag.singleSide': 'Padding: Single Side',
    'paddingDrag.allSides': 'Padding: All Sides (Shift)',
    'paddingDrag.axis': 'Padding: Axis (Alt)',
    'paddingDrag.liveVisual': 'Padding: Live Visual Feedback',
    'paddingDrag.robustness': 'Padding: Robustness (Scroll, Resize)',
    resizeHandleDblClick: 'Resize Handle Double-Click',
    'resizeHandleDblClick.horizontal': 'Resize DblClick: Horizontal',
    'resizeHandleDblClick.vertical': 'Resize DblClick: Vertical',
    'resizeHandleDblClick.corner': 'Resize DblClick: Corner',
    resizeHandleDrag: 'Resize Handle Drag',
    paddingHandlers: 'Padding Handlers (P key)',
    'paddingHandlers.modeToggle': 'Padding: Mode Toggle',
    'paddingHandlers.position': 'Padding: Handle Position',
    'paddingHandlers.drag': 'Padding: Drag',
    'paddingHandlers.modeSelection': 'Padding: Mode Selection',
    tokenExtract: 'Token Extract',

    // === Validation Tests (B3.1) ===
    validation: 'Validation Tests',
    'validation.spreadCss': 'Spread: CSS Validation',
    'validation.ungroupDom': 'Ungroup: DOM Validation',
    'validation.selectionUndoRedo': 'Selection: Undo/Redo',
    'validation.multiselectVisual': 'Multiselect: Visual',

    // === Bidirectional ===
    bidirectional: 'Bidirectional Editing',
    'bidirectional.codeToPreview': 'Code → Preview',
    'bidirectional.selectionSync': 'Selection Sync',
    'bidirectional.sourceMap': 'Source Map',
    'bidirectional.propertyPanel': 'Property Panel Sync',
    'bidirectional.complexSync': 'Complex Sync',
    'bidirectional.errorRecovery': 'Error Recovery',

    // === Undo/Redo ===
    undoRedo: 'Undo/Redo',
    'undoRedo.basicUndo': 'Basic Undo',
    'undoRedo.basicRedo': 'Basic Redo',
    'undoRedo.editTypes': 'Edit Types',
    'undoRedo.withSelection': 'With Selection',
    'undoRedo.edgeCases': 'Edge Cases',

    // === Autocomplete ===
    autocomplete: 'Autocomplete',
    'autocomplete.primitives': 'Primitive Completions',
    'autocomplete.properties': 'Property Completions',
    'autocomplete.values': 'Value Completions',
    'autocomplete.icons': 'Icon Completions',
    'autocomplete.tokens': 'Token Completions',
    'autocomplete.states': 'State Completions',
    'autocomplete.components': 'Component Completions',

    // === Drag & Drop ===
    stackedDrag: 'Stacked Drag & Drop',
    'stackedDrag.basic': 'Stacked: Basic',
    'stackedDrag.edgeCases': 'Stacked: Edge Cases',
    'stackedDrag.layoutDetection': 'Stacked: Layout Detection',
    flexReorder: 'Flex Reorder',
    'flexReorder.buttonVertical': 'Flex: Button Vertical',
    'flexReorder.buttonHorizontal': 'Flex: Button Horizontal',
    'flexReorder.text': 'Flex: Text Reorder',
    'flexReorder.icon': 'Flex: Icon Reorder',
    'flexReorder.input': 'Flex: Input Reorder',
    'flexReorder.image': 'Flex: Image Reorder',
    'flexReorder.dividerSpacer': 'Flex: Divider/Spacer',
    'flexReorder.linkTextarea': 'Flex: Link/Textarea',
    'flexReorder.mixedComponent': 'Flex: Mixed Components',
    'flexReorder.zagComponent': 'Flex: Zag Components',
    'flexReorder.nestedContainer': 'Flex: Nested Containers',
    'flexReorder.edgeCases': 'Flex: Edge Cases',
    'flexReorder.sequential': 'Flex: Sequential',
    alignmentZone: 'Alignment Zone',
    'alignmentZone.basic': 'Alignment: Basic',
    'alignmentZone.allZones': 'Alignment: All Zones',
    'alignmentZone.edgeCases': 'Alignment: Edge Cases',
    'alignmentZone.componentVariety': 'Alignment: Component Variety',
    alignmentFromEmpty: 'Alignment from Empty',
    'alignmentFromEmpty.basic': 'Alignment Empty: Basic',
    'alignmentFromEmpty.all9Zones': 'Alignment Empty: All 9 Zones',
    'alignmentFromEmpty.visualFeedback': 'Alignment Empty: Visual Feedback',
    'alignmentFromEmpty.parentChild': 'Alignment Empty: Parent/Child',

    // === Property Panel ===
    propertyPanel: 'Property Panel',
    'propertyPanel.tokenDisplay': 'Token Display',
    'propertyPanel.tokenValue': 'Token Values',
    'propertyPanel.tokenInteraction': 'Token Interaction',
    'propertyPanel.projectToken': 'Project Tokens',
    'propertyPanel.radiusChange': 'Radius Changes',
    'propertyPanel.events': 'Property Panel Events',
    'propertyPanel.events.add': 'PP Events: Add Event',
    'propertyPanel.events.existing': 'PP Events: Existing Events',
    'propertyPanel.events.edit': 'PP Events: Edit Event',
    'propertyPanel.events.delete': 'PP Events: Delete Event',
    'propertyPanel.events.integration': 'PP Events: Integration',
    'propertyPanel.errors': 'Property Panel: Errors',
    'propertyPanel.errors.colors': 'PP Errors: Invalid Colors',
    'propertyPanel.errors.sizes': 'PP Errors: Invalid Sizes',
    'propertyPanel.errors.tokens': 'PP Errors: Invalid Tokens',
    'propertyPanel.errors.spacing': 'PP Errors: Spacing',
    'propertyPanel.errors.border': 'PP Errors: Border',
    'propertyPanel.errors.typography': 'PP Errors: Typography',
    'propertyPanel.errors.edgeCases': 'PP Errors: Edge Cases',
    colorPicker: 'Color Picker',
    iconPicker: 'Icon Picker',

    // === Charts ===
    charts: 'Charts',
    'charts.dataFile': 'Chart: Data Files',
    'charts.basic': 'Chart: Basic',
    'charts.styling': 'Chart: Styling',
    'charts.layout': 'Chart: Layout',
    'charts.data': 'Chart: Data',

    // === Workflow ===
    workflow: 'Workflow',
    'workflow.projectWithCode': 'Workflow: Code',
    'workflow.projectWithDragDrop': 'Workflow: Drag & Drop',
    'workflow.application': 'Workflow: Application',

    // === States ===
    states: 'States',
    'states.toggle': 'Toggle States',
    'states.toggle.basic': 'Toggle: Basic',
    'states.toggle.multiple': 'Toggle: Multiple',
    'states.toggle.content': 'Toggle: Content',
    'states.exclusive': 'Exclusive States',
    'states.exclusive.basic': 'Exclusive: Basic',
    'states.exclusive.group': 'Exclusive: Group',
    'states.exclusive.navigation': 'Exclusive: Navigation',
    'states.hover': 'Hover States',
    'states.hover.basic': 'Hover: Basic',
    'states.hover.transition': 'Hover: Transitions',
    'states.hover.nested': 'Hover: Nested',
    'states.hover.scale': 'Hover: Scale',
    'states.crossElement': 'Cross-Element States',
    'states.crossElement.basic': 'Cross: Basic',
    'states.crossElement.dropdown': 'Cross: Dropdown',
    'states.crossElement.modal': 'Cross: Modal',
    'states.crossElement.form': 'Cross: Form',
    'states.quick': 'Quick State Tests',

    // === Animations ===
    animations: 'Animations',
    'animations.presets': 'Animation Presets',
    'animations.spin': 'Anim: Spin',
    'animations.pulse': 'Anim: Pulse',
    'animations.bounce': 'Anim: Bounce',
    'animations.shake': 'Anim: Shake',
    'animations.fade': 'Anim: Fade',
    'animations.slide': 'Anim: Slide',
    'animations.scale': 'Anim: Scale',
    'animations.stateAnimations': 'State Animations',
    'animations.stateToggle': 'Anim: State Toggle',
    'animations.hover': 'Anim: Hover',
    'animations.entryExit': 'Anim: Entry/Exit',
    'animations.combined': 'Anim: Combined',
    'animations.quick': 'Quick Animation Tests',

    // === Transforms ===
    transforms: 'Transforms',
    'transforms.rotate': 'Rotate',
    'transforms.rotate.basic': 'Rotate: Basic',
    'transforms.rotate.withOther': 'Rotate: With Other',
    'transforms.rotate.interactive': 'Rotate: Interactive',
    'transforms.rotate.angles': 'Rotate: Angles',
    'transforms.scale': 'Scale',
    'transforms.scale.basic': 'Scale: Basic',
    'transforms.scale.interactive': 'Scale: Interactive',
    'transforms.scale.edgeCases': 'Scale: Edge Cases',
    'transforms.scale.withOther': 'Scale: With Other',
    'transforms.translate': 'Translate',
    'transforms.position.basic': 'Position: Basic',
    'transforms.stacked': 'Stacked Position',
    'transforms.zIndex': 'Z-Index',
    'transforms.offset': 'Offset',
    'transforms.quick': 'Quick Transform Tests',

    // === Gradients ===
    gradients: 'Gradients',
    'gradients.horizontal': 'Gradient: Horizontal',
    'gradients.vertical': 'Gradient: Vertical',
    'gradients.angled': 'Gradient: Angled',
    'gradients.text': 'Gradient: Text',
    'gradients.withEffects': 'Gradient: With Effects',
    'gradients.quick': 'Quick Gradient Tests',

    // === Data Binding ===
    dataBinding: 'Data Binding',
    'dataBinding.variables': 'Variables',
    'dataBinding.collections': 'Collections',
    'dataBinding.conditionals': 'Conditionals',
    'dataBinding.tokens': 'Data Tokens',
    'dataBinding.inputBinding': 'Input Binding',

    // === Actions ===
    actions: 'Actions',
    'actions.visibility': 'Action: Visibility',
    'actions.counter': 'Action: Counter',
    'actions.scroll': 'Action: Scroll',
    'actions.toast': 'Action: Toast',
    'actions.form': 'Action: Form',
    'actions.navigation': 'Action: Navigation',
    'actions.clipboard': 'Action: Clipboard',
    'actions.overlay': 'Action: Overlay',
    'actions.crud': 'Action: CRUD',
    'actions.combined': 'Action: Combined',

    // === Components ===
    components: 'Components',
    'components.basic': 'Component: Basic',
    'components.propertyOverride': 'Component: Property Override',
    'components.inheritance': 'Component: Inheritance',
    'components.variants': 'Component: Variants',
    'components.nestedSlots': 'Component: Nested Slots',
    'components.layout': 'Component: Layout',
    'components.multiLevelInheritance': 'Component: Multi-Level',
    'components.state': 'Component: State',
    'components.complex': 'Component: Complex',

    // === Tables ===
    tables: 'Tables',
    'tables.static': 'Table: Static',
    'tables.dataBound': 'Table: Data Bound',
    'tables.layout': 'Table: Layout',
    'tables.styling': 'Table: Styling',
    'tables.actions': 'Table: Actions',
    'tables.filter': 'Table: Filter',
    'tables.complex': 'Table: Complex',

    // === Events ===
    events: 'Events',
    'events.click': 'Event: Click',
    'events.hover': 'Event: Hover',
    'events.focus': 'Event: Focus',
    'events.input': 'Event: Input',
    'events.keyboard': 'Event: Keyboard',
    'events.view': 'Event: View',
    'events.combined': 'Event: Combined',
    'events.edgeCases': 'Event: Edge Cases',

    // === Responsive ===
    responsive: 'Responsive',
    'responsive.basic': 'Responsive: Basic',
    'responsive.layout': 'Responsive: Layout',
    'responsive.styling': 'Responsive: Styling',
    'responsive.visibility': 'Responsive: Visibility',
    'responsive.customThreshold': 'Responsive: Custom Threshold',
    'responsive.components': 'Responsive: Components',
    'responsive.complex': 'Responsive: Complex',

    // === Sync ===
    sync: 'Sync',
    'sync.editorToPreview': 'Sync: Editor → Preview',
    'sync.previewToEditor': 'Sync: Preview → Editor',
    'sync.panelToEditor': 'Sync: Panel → Editor',
    'sync.editorToPanel': 'Sync: Editor → Panel',
    'sync.multiDirectional': 'Sync: Multi-Directional',
    'sync.rapidChange': 'Sync: Rapid Change',
    'sync.edgeCases': 'Sync: Edge Cases',
    'sync.selectionPersistence': 'Sync: Selection Persistence',
    'sync.complexScenario': 'Sync: Complex Scenario',

    // === Property Robustness ===
    propertyRobustness: 'Property Robustness',
    'propertyRobustness.commaFormat': 'Property: Comma Format',
    'propertyRobustness.autoSeparation': 'Property: Auto Separation',
    'propertyRobustness.multiValue': 'Property: Multi Value',
    'propertyRobustness.alias': 'Property: Alias',
    'propertyRobustness.order': 'Property: Order',
    'propertyRobustness.mixedFormat': 'Property: Mixed Format',
    'propertyRobustness.edgeCases': 'Property: Edge Cases',
    'propertyRobustness.sequentialMod': 'Property: Sequential Mod',
    'propertyRobustness.previewSync': 'Property: Preview Sync',

    // === Stress Tests ===
    stress: 'Stress Tests',
    'stress.raceConditions': 'Stress: Race Conditions',
    'stress.codeModifier': 'Stress: Code Modifier',

    // === Project (Multi-File) ===
    project: 'Multi-File Project',
    'project.setup': 'Project: Setup',
    'project.tokenComponent': 'Project: Token/Component',
    'project.screenNavigation': 'Project: Screen Navigation',
    'project.complexLayout': 'Project: Complex Layout',
    'project.fileSwitching': 'Project: File Switching',

    // === Compiler Verification ===
    compilerVerification: 'Compiler Verification',
    'compilerVerification.properties': 'Compiler: Properties',
    'compilerVerification.layout': 'Compiler: Layout',
    'compilerVerification.nestedStructure': 'Compiler: Nested Structure',
    'compilerVerification.tokenResolution': 'Compiler: Token Resolution',
    'compilerVerification.conditionals': 'Compiler: Conditionals',
    'compilerVerification.collections': 'Compiler: Collections',
    'compilerVerification.componentInheritance': 'Compiler: Component Inheritance',
    'compilerVerification.inlineSyntax': 'Compiler: Inline Syntax',
    'compilerVerification.primitives': 'Compiler: Primitives',
    'compilerVerification.edgeCases': 'Compiler: Edge Cases',
    // Error Handling Tests (B2.1)
    'compilerVerification.errors': 'Compiler: Error Handling',
    'compilerVerification.errors.invalidProperty': 'Compiler Errors: Invalid Properties',
    'compilerVerification.errors.undefinedComponent': 'Compiler Errors: Undefined Components',
    'compilerVerification.errors.invalidToken': 'Compiler Errors: Invalid Tokens',
    'compilerVerification.errors.syntax': 'Compiler Errors: Syntax Errors',
    'compilerVerification.errors.recovery': 'Compiler Errors: Recovery',
    'compilerVerification.errors.edgeCases': 'Compiler Errors: Edge Cases',

    // === UI Builder ===
    uiBuilder: 'UI Builder',
    'uiBuilder.level1': 'UI Builder: Level 1',
    'uiBuilder.level2': 'UI Builder: Level 2',

    // === Play Mode ===
    playMode: 'Play Mode',
    'playMode.activation': 'Play: Activation',
    'playMode.visual': 'Play: Visual',
    'playMode.reset': 'Play: Reset',
    'playMode.device': 'Play: Device',
    'playMode.integration': 'Play: Integration',
    'playMode.input': 'Play: Input',
    'playMode.quick': 'Quick Play Mode Tests',

    // === Test System (meta) ===
    testSystem: 'Test System',
    'testSystem.fixtures': 'Test: Fixtures',
    'testSystem.isolation': 'Test: Isolation',
    'testSystem.keyboard': 'Test: Keyboard',
    'testSystem.waitHelper': 'Test: Wait Helper',

    // === Draft Lines (AI-assist) ===
    draftLines: 'Draft Lines',
    'draftLines.detection': 'Draft: Detection Logic',
    'draftLines.decoration': 'Draft: CodeMirror Decoration',
    'draftLines.integration': 'Draft: Manager Integration',
    // Comprehensive Draft Lines Tests
    'draftLines.comprehensive': 'Draft: Comprehensive Suite',

    // Draft Mode (-- marker for AI code generation)
    draftMode: 'Draft Mode (-- marker)',
    'draftMode.basic': 'Draft Mode: Basic',
    'draftMode.visual': 'Draft Mode: Visual Feedback',
    'draftMode.autocomplete': 'Draft Mode: Autocomplete',
    'draftMode.scenarios': 'Draft Mode: Scenarios',
    // Basic sub-categories
    'draftMode.basic.detection': 'Draft Mode: -- Detection',
    'draftMode.basic.indentation': 'Draft Mode: Indentation',
    'draftMode.basic.blockStructure': 'Draft Mode: Block Structure',
    'draftMode.basic.lineDetection': 'Draft Mode: Line Detection',
    'draftMode.basic.dynamic': 'Draft Mode: Dynamic Editing',
    // Visual sub-categories
    'draftMode.visual.css': 'Draft Mode: CSS Classes',
    'draftMode.visual.muted': 'Draft Mode: Muted Colors',
    'draftMode.visual.dynamic': 'Draft Mode: Dynamic Visual',
    // Autocomplete sub-categories
    'draftMode.autocomplete.suppression': 'Draft Mode: AC Suppression',
    'draftMode.autocomplete.pickers': 'Draft Mode: Pickers',
    // Scenario sub-categories
    'draftMode.scenarios.generation': 'Draft Mode: Generation',
    'draftMode.scenarios.correction': 'Draft Mode: Correction',
    'draftMode.scenarios.refactoring': 'Draft Mode: Refactoring',
    'draftMode.scenarios.workflow': 'Draft Mode: Workflow',
    'draftMode.scenarios.context': 'Draft Mode: Context',
    'draftLines.comprehensive.detection': 'Draft Comprehensive: Detection',
    'draftLines.comprehensive.decoration': 'Draft Comprehensive: Decoration',
    'draftLines.comprehensive.state': 'Draft Comprehensive: State',
    'draftLines.comprehensive.workflow': 'Draft Comprehensive: Workflow',
    'draftLines.comprehensive.edge': 'Draft Comprehensive: Edge Cases',
    'draftLines.comprehensive.inspection': 'Draft Comprehensive: Inspection',
    // AI Workflow Tests
    'draftLines.aiWorkflow': 'Draft: AI Workflow (Complete Cycle)',
    'draftLines.aiWorkflow.workflow': 'AI Workflow: Correction Cycles',
    'draftLines.aiWorkflow.visual': 'AI Workflow: Visual Verification',

    // === Integration ===
    integration: 'Integration (Real-World Workflows)',
    'integration.componentToken': 'Integration: Component + Token',
    'integration.componentState': 'Integration: Component + State',
    'integration.componentTokenState': 'Integration: Component + Token + State',
    'integration.nestedComponents': 'Integration: Nested Components',
    'integration.realWorldPatterns': 'Integration: Real-World UI Patterns',
    'integration.layoutIntegration': 'Integration: Layout + Component + State',
    'integration.dataIteration': 'Integration: Data & Iteration',
    'integration.conditional': 'Integration: Conditional Rendering',
    'integration.iconButton': 'Integration: Icon & Button Patterns',
    'integration.animation': 'Integration: Animation & Transition',
    'integration.form': 'Integration: Form',
    'integration.gradient': 'Integration: Gradients',

    // === Tutorial ===
    tutorial: 'Tutorial',
    'tutorial.01-elemente': 'Tutorial: Elemente & Hierarchie',
    'tutorial.02-komponenten': 'Tutorial: Komponenten',
    'tutorial.03-tokens': 'Tutorial: Design Tokens',
    'tutorial.04-layout': 'Tutorial: Layout',
    'tutorial.05-styling': 'Tutorial: Styling',
    'tutorial.06-states': 'Tutorial: States',
    'tutorial.07-animationen': 'Tutorial: Animationen',
    'tutorial.08-functions': 'Tutorial: Functions',
    'tutorial.09-daten': 'Tutorial: Daten',
    'tutorial.10-seiten': 'Tutorial: Seiten & Navigation',
    'tutorial.11-eingabe': 'Tutorial: Eingabe',
    'tutorial.12-navigation': 'Tutorial: Navigation',
    'tutorial.13-overlays': 'Tutorial: Overlays',
    'tutorial.14-tabellen': 'Tutorial: Tabellen',
    'tutorial.15-charts': 'Tutorial: Charts',
  }

  return api.run(tests[category], `${names[category]} Tests`)
}

/**
 * Print test summary
 */
export function printTestSummary(): void {
  console.log('📊 Mirror Test Suites:')
  console.log(`   Primitives:         ${testCounts.primitives} tests`)
  console.log(`   Layout:             ${testCounts.layout} tests`)
  console.log(`   Layout Verify:      ${testCounts.layoutVerification} tests`)
  console.log(`   Styling:            ${testCounts.styling} tests`)
  console.log(`   Zag:                ${testCounts.zag} tests`)
  console.log(`   Interactions:       ${testCounts.interactions} tests`)
  console.log(`   Bidirectional:      ${testCounts.bidirectional} tests`)
  console.log(`   Undo/Redo:          ${testCounts.undoRedo} tests`)
  console.log(`   Autocomplete:       ${testCounts.autocomplete} tests`)
  console.log(`   Stacked Drag:       ${testCounts.stackedDrag} tests`)
  console.log(`   Flex Reorder:       ${testCounts.flexReorder} tests`)
  console.log(`   Property Panel:     ${testCounts.propertyPanel} tests`)
  console.log(`   Charts:             ${testCounts.charts} tests`)
  console.log(`   Workflow:           ${testCounts.workflow} tests`)
  console.log(`   States:             ${testCounts.states} tests`)
  console.log(`   Animations:         ${testCounts.animations} tests`)
  console.log(`   Transforms:         ${testCounts.transforms} tests`)
  console.log(`   Gradients:          ${testCounts.gradients} tests`)
  console.log(`   Data Binding:       ${testCounts.dataBinding} tests`)
  console.log(`   Actions:            ${testCounts.actions} tests`)
  console.log(`   Components:         ${testCounts.components} tests`)
  console.log(`   Tables:             ${testCounts.tables} tests`)
  console.log(`   Events:             ${testCounts.events} tests`)
  console.log(`   Responsive:         ${testCounts.responsive} tests`)
  console.log(`   Sync:               ${testCounts.sync} tests`)
  console.log(`   Property Robust:    ${testCounts.propertyRobustness} tests`)
  console.log(`   Stress:             ${testCounts.stress} tests`)
  console.log(`   Project:            ${testCounts.project} tests`)
  console.log(`   Compiler Verify:    ${testCounts.compilerVerification} tests`)
  console.log(`   Play Mode:          ${testCounts.playMode} tests`)
  console.log(`   Draft Lines:        ${testCounts.draftLines} tests`)
  console.log(`   Draft Mode:         ${testCounts.draftMode} tests`)
  console.log(`   ──────────────────────────`)
  console.log(`   Total:              ${testCounts.total} tests`)
  console.log('')
  console.log('Run with:')
  console.log('   import { runAllTests, runCategory } from "./suites"')
  console.log('   await runAllTests()')
  console.log('   await runCategory("states")')
}

/**
 * Run a single test by name
 */
export async function runSingleTest(testName: string): Promise<TestSuiteResult> {
  const api = (window as any).__mirrorTest
  if (!api) {
    throw new Error('Mirror Test API not available')
  }

  // Find the test by name (case-insensitive partial match)
  const test = allTests.find(
    t => t.name.toLowerCase().includes(testName.toLowerCase()) || t.name === testName
  )

  if (!test) {
    console.error(`❌ Test not found: "${testName}"`)
    console.log('Available tests containing that pattern:')
    const matches = allTests.filter(t => t.name.toLowerCase().includes(testName.toLowerCase()))
    if (matches.length > 0) {
      matches.slice(0, 10).forEach(t => console.log(`   - ${t.name}`))
      if (matches.length > 10) {
        console.log(`   ... and ${matches.length - 10} more`)
      }
    } else {
      console.log('   (no matches)')
    }
    return { passed: 0, failed: 1, results: [{ name: testName, passed: false, duration: 0 }] }
  }

  console.log(`🎯 Running: ${test.name}`)
  return api.run([test], `Single Test: ${test.name}`)
}
