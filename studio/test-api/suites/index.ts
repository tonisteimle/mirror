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

// Import all test suites
import {
  allPrimitivesTests,
  basicPrimitives,
  semanticPrimitives,
  headingPrimitives,
} from './primitives-tests'
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
} from './layout-tests'
import {
  allStylingTests,
  colorTests,
  sizingTests,
  spacingTests,
  borderTests,
  typographyTests,
  effectTests,
} from './styling-tests'
import { allCompilerTests, primitiveTests, layoutTests, stylingTests } from './compiler-tests'
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
  zagInLayoutTests,
} from './zag-tests'
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
  combinedTests,
} from './interaction-tests'
import {
  allBidirectionalTests,
  codeToPreviewTests,
  selectionSyncTests,
  sourceMapTests,
  propertyPanelTests,
  complexSyncTests,
  errorRecoveryTests,
} from './bidirectional-tests'
import {
  allUndoRedoTests,
  basicUndoTests,
  basicRedoTests,
  undoEditTypesTests,
  undoWithSelectionTests,
  undoEdgeCasesTests,
} from './undo-redo-tests'
import {
  allAutocompleteTests,
  primitiveCompletionTests,
  propertyCompletionTests,
  valueCompletionTests,
  iconCompletionTests,
  tokenCompletionTests,
  stateCompletionTests,
  componentCompletionTests,
} from './autocomplete-tests'
import {
  allStackedDragTests,
  basicStackedTests,
  edgeCaseTests,
  layoutDetectionTests,
} from './stacked-drag-tests'
import {
  allPropertyPanelTests,
  tokenDisplayTests,
  tokenValueTests,
  tokenInteractionTests,
} from './property-panel-tests'
import {
  allChartTests,
  basicChartTests,
  chartStylingTests,
  chartLayoutTests,
  chartDataTests,
} from './chart-tests'

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
} from './primitives-tests'

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
} from './layout-tests'

// Styling
export {
  allStylingTests,
  colorTests,
  sizingTests,
  spacingTests,
  borderTests,
  typographyTests,
  effectTests,
} from './styling-tests'

// Compiler (original)
export { allCompilerTests, primitiveTests, layoutTests, stylingTests } from './compiler-tests'

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
  zagInLayoutTests,
} from './zag-tests'

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
  combinedTests,
} from './interaction-tests'

// Bidirectional Editing
export {
  allBidirectionalTests,
  codeToPreviewTests,
  selectionSyncTests,
  sourceMapTests,
  propertyPanelTests,
  complexSyncTests,
  errorRecoveryTests,
} from './bidirectional-tests'

// Undo/Redo
export {
  allUndoRedoTests,
  basicUndoTests,
  basicRedoTests,
  undoEditTypesTests,
  undoWithSelectionTests,
  undoEdgeCasesTests,
} from './undo-redo-tests'

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
} from './autocomplete-tests'

// Stacked Drag & Drop
export {
  allStackedDragTests,
  basicStackedTests,
  edgeCaseTests,
  layoutDetectionTests,
} from './stacked-drag-tests'

// Property Panel
export {
  allPropertyPanelTests,
  tokenDisplayTests,
  tokenValueTests,
  tokenInteractionTests,
} from './property-panel-tests'

// Charts
export {
  allChartTests,
  basicChartTests,
  chartStylingTests,
  chartLayoutTests,
  chartDataTests,
} from './chart-tests'

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
  ...allPropertyPanelTests,
  ...allChartTests,
]

/**
 * Quick test subset for fast validation
 */
export const quickTests: TestCase[] = [
  ...basicPrimitives.slice(0, 5),
  ...directionTests.slice(0, 3),
  ...colorTests.slice(0, 3),
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
  propertyPanel: allPropertyPanelTests.length,
  charts: allChartTests.length,
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
    allPropertyPanelTests.length +
    allChartTests.length,
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
  | 'propertyPanel'
  | 'charts'

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
    propertyPanel: allPropertyPanelTests,
    charts: allChartTests,
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
    propertyPanel: 'Property Panel',
    charts: 'Charts',
  }

  return api.run(tests[category], `${names[category]} Tests`)
}

/**
 * Print test summary
 */
export function printTestSummary(): void {
  console.log('📊 Mirror Test Suites:')
  console.log(`   Primitives:      ${testCounts.primitives} tests`)
  console.log(`   Layout:          ${testCounts.layout} tests`)
  console.log(`   Styling:         ${testCounts.styling} tests`)
  console.log(`   Zag:             ${testCounts.zag} tests`)
  console.log(`   Interactions:    ${testCounts.interactions} tests`)
  console.log(`   Bidirectional:   ${testCounts.bidirectional} tests`)
  console.log(`   Undo/Redo:       ${testCounts.undoRedo} tests`)
  console.log(`   Autocomplete:    ${testCounts.autocomplete} tests`)
  console.log(`   Stacked Drag:    ${testCounts.stackedDrag} tests`)
  console.log(`   Property Panel:  ${testCounts.propertyPanel} tests`)
  console.log(`   Charts:          ${testCounts.charts} tests`)
  console.log(`   ──────────────────────`)
  console.log(`   Total:           ${testCounts.total} tests`)
  console.log('')
  console.log('Run with:')
  console.log('   import { runAllTests, runCategory } from "./suites"')
  console.log('   await runAllTests()')
  console.log('   await runCategory("charts")')
}
