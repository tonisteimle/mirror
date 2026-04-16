/**
 * Test Suites Index
 *
 * Exports all test suites for easy import.
 *
 * Usage:
 *   import { allTests, runAllTests } from './suites'
 *   __mirrorTest.run(allTests)
 *
 * Or run specific suites:
 *   import { allPrimitivesTests, allLayoutTests } from './suites'
 *   __mirrorTest.run(allPrimitivesTests, 'Primitives')
 */

// =============================================================================
// Imports from New Directory Structure
// =============================================================================

// Primitives (fully migrated)
import {
  allPrimitivesTests,
  basicPrimitives,
  semanticPrimitives,
  headingPrimitives,
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
} from './interactions'

// Bidirectional
import {
  allBidirectionalTests,
  codeToPreviewTests,
  selectionSyncTests,
  sourceMapTests,
  propertyPanelTests as bidirectionalPanelTests,
  complexSyncTests,
  errorRecoveryTests,
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

// Property Panel
import {
  allPropertyPanelTests,
  tokenDisplayTests,
  tokenValueTests,
  tokenInteractionTests,
  projectTokenTests,
} from './property-panel'

// Drag & Drop
import {
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
} from './drag'

// Workflow
import {
  allWorkflowTests,
  projectWithCodeTests,
  projectWithDragDropTests,
  applicationTests,
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
  toggleMultipleStatesTests,
  toggleContentChangeTests,
  allExclusiveTests,
  exclusiveBasicTests,
  exclusiveInitialStateTests,
  exclusiveMultipleGroupsTests,
  allHoverStateTests,
  hoverBasicTests,
  hoverTransitionTests,
  hoverNestedTests,
  allCrossElementTests,
  crossElementShowHideTests,
  crossElementMultipleTargetsTests,
  crossElementComplexTests,
  quickStateTests,
} from './states'

// Animations (fully migrated)
import {
  allAnimationTests,
  allPresetAnimationTests,
  spinAnimationTests,
  pulseAnimationTests,
  bounceAnimationTests,
  shakeAnimationTests,
  fadeAnimationTests,
  slideAnimationTests,
  scaleAnimationTests,
  allStateAnimationTests,
  toggleAnimationTests,
  hoverAnimationTests,
  entryExitAnimationTests,
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

// Tables
import {
  allTableTests,
  staticTableTests,
  dataBoundTableTests,
  tableLayoutTests,
  tableStylingTests,
  tableActionTests,
  tableFilterTests,
  complexTableTests,
} from './table-tests'

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

import type { TestCase, TestSuiteResult } from '../types'

// =============================================================================
// Re-exports by Category
// =============================================================================

// Primitives
export { allPrimitivesTests, basicPrimitives, semanticPrimitives, headingPrimitives }

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
  selectionTests,
  dragDropTests,
  interactionCombinedTests,
}

// Bidirectional Editing
export {
  allBidirectionalTests,
  codeToPreviewTests,
  selectionSyncTests,
  sourceMapTests,
  bidirectionalPanelTests as propertyPanelTests,
  complexSyncTests,
  errorRecoveryTests,
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

// Property Panel
export {
  allPropertyPanelTests,
  tokenDisplayTests,
  tokenValueTests,
  tokenInteractionTests,
  projectTokenTests,
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
export { allWorkflowTests, projectWithCodeTests, projectWithDragDropTests, applicationTests }

// States
export {
  allStateTests,
  allToggleTests,
  toggleBasicTests,
  toggleMultipleStatesTests,
  toggleContentChangeTests,
  allExclusiveTests,
  exclusiveBasicTests,
  exclusiveInitialStateTests,
  exclusiveMultipleGroupsTests,
  allHoverStateTests,
  hoverBasicTests,
  hoverTransitionTests,
  hoverNestedTests,
  allCrossElementTests,
  crossElementShowHideTests,
  crossElementMultipleTargetsTests,
  crossElementComplexTests,
  quickStateTests,
}

// Animations
export {
  allAnimationTests,
  allPresetAnimationTests,
  spinAnimationTests,
  pulseAnimationTests,
  bounceAnimationTests,
  shakeAnimationTests,
  fadeAnimationTests,
  slideAnimationTests,
  scaleAnimationTests,
  allStateAnimationTests,
  toggleAnimationTests,
  hoverAnimationTests,
  entryExitAnimationTests,
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
export const allStressTests = [...stressTests, ...raceConditionTests, ...codeModifierTests]
export { stressTests, raceConditionTests, codeModifierTests }

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

// Table Tests
export {
  allTableTests,
  staticTableTests,
  dataBoundTableTests,
  tableLayoutTests,
  tableStylingTests,
  tableActionTests,
  tableFilterTests,
  complexTableTests,
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
  ...allInteractionTests,
  ...allBidirectionalTests,
  ...allUndoRedoTests,
  ...allAutocompleteTests,
  ...allStackedDragTests,
  ...allFlexReorderTests,
  ...allPropertyPanelTests,
  ...allChartTests,
  ...allWorkflowTests,
  ...allLayoutVerificationTests,
  ...allTestSystemTests,
  ...allStateTests,
  ...allAnimationTests,
  ...allTransformTests,
  ...allGradientTests,
  ...allDataBindingTests,
  ...allActionTests,
  ...allComponentTests,
  ...allTableTests,
  ...allEventTests,
  ...allResponsiveTests,
  ...allStressTests,
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
]

/**
 * Test counts by category
 */
export const testCounts = {
  primitives: allPrimitivesTests.length,
  layout: allLayoutTests.length,
  styling: allStylingTests.length,
  zag: allZagTests.length,
  interactions: allInteractionTests.length,
  bidirectional: allBidirectionalTests.length,
  undoRedo: allUndoRedoTests.length,
  autocomplete: allAutocompleteTests.length,
  stackedDrag: allStackedDragTests.length,
  flexReorder: allFlexReorderTests.length,
  propertyPanel: allPropertyPanelTests.length,
  charts: allChartTests.length,
  workflow: allWorkflowTests.length,
  layoutVerification: allLayoutVerificationTests.length,
  testSystem: allTestSystemTests.length,
  states: allStateTests.length,
  animations: allAnimationTests.length,
  transforms: allTransformTests.length,
  gradients: allGradientTests.length,
  dataBinding: allDataBindingTests.length,
  actions: allActionTests.length,
  components: allComponentTests.length,
  tables: allTableTests.length,
  events: allEventTests.length,
  responsive: allResponsiveTests.length,
  stress: allStressTests.length,
  total:
    allPrimitivesTests.length +
    allLayoutTests.length +
    allStylingTests.length +
    allZagTests.length +
    allInteractionTests.length +
    allBidirectionalTests.length +
    allUndoRedoTests.length +
    allAutocompleteTests.length +
    allStackedDragTests.length +
    allFlexReorderTests.length +
    allPropertyPanelTests.length +
    allChartTests.length +
    allWorkflowTests.length +
    allLayoutVerificationTests.length +
    allTestSystemTests.length +
    allStateTests.length +
    allAnimationTests.length +
    allTransformTests.length +
    allGradientTests.length +
    allDataBindingTests.length +
    allActionTests.length +
    allComponentTests.length +
    allTableTests.length +
    allEventTests.length +
    allResponsiveTests.length +
    allStressTests.length,
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
 */
export type TestCategory =
  | 'primitives'
  | 'layout'
  | 'styling'
  | 'zag'
  | 'interactions'
  | 'bidirectional'
  | 'undoRedo'
  | 'autocomplete'
  | 'stackedDrag'
  | 'flexReorder'
  | 'propertyPanel'
  | 'charts'
  | 'workflow'
  | 'layoutVerification'
  | 'states'
  | 'animations'
  | 'transforms'
  | 'gradients'
  | 'dataBinding'
  | 'actions'
  | 'components'
  | 'tables'
  | 'events'
  | 'responsive'
  | 'stress'

export async function runCategory(category: TestCategory): Promise<TestSuiteResult> {
  const api = (window as any).__mirrorTest
  if (!api) {
    throw new Error('Mirror Test API not available')
  }

  const tests: Record<TestCategory, TestCase[]> = {
    primitives: allPrimitivesTests,
    layout: allLayoutTests,
    styling: allStylingTests,
    zag: allZagTests,
    interactions: allInteractionTests,
    bidirectional: allBidirectionalTests,
    undoRedo: allUndoRedoTests,
    autocomplete: allAutocompleteTests,
    stackedDrag: allStackedDragTests,
    flexReorder: allFlexReorderTests,
    propertyPanel: allPropertyPanelTests,
    charts: allChartTests,
    workflow: allWorkflowTests,
    layoutVerification: allLayoutVerificationTests,
    states: allStateTests,
    animations: allAnimationTests,
    transforms: allTransformTests,
    gradients: allGradientTests,
    dataBinding: allDataBindingTests,
    actions: allActionTests,
    components: allComponentTests,
    tables: allTableTests,
    events: allEventTests,
    responsive: allResponsiveTests,
    stress: allStressTests,
  }

  const names: Record<TestCategory, string> = {
    primitives: 'Primitives',
    layout: 'Layout',
    styling: 'Styling',
    zag: 'Zag Components',
    interactions: 'Interactions',
    bidirectional: 'Bidirectional Editing',
    undoRedo: 'Undo/Redo',
    autocomplete: 'Autocomplete',
    stackedDrag: 'Stacked Drag & Drop',
    flexReorder: 'Flex Reorder',
    propertyPanel: 'Property Panel',
    charts: 'Charts',
    workflow: 'Workflow',
    layoutVerification: 'Layout Verification',
    states: 'States',
    animations: 'Animations',
    transforms: 'Transforms',
    gradients: 'Gradients',
    dataBinding: 'Data Binding',
    actions: 'Actions',
    components: 'Components',
    tables: 'Tables',
    events: 'Events',
    responsive: 'Responsive',
    stress: 'Stress Tests',
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
  console.log(`   Stress:             ${testCounts.stress} tests`)
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
