/**
 * Draft Mode Tests
 *
 * Comprehensive test suite for the AI-assisted draft mode feature (-- marker).
 *
 * Features tested:
 * - Basic -- detection and parsing
 * - Visual feedback (CSS classes, muted colors)
 * - Autocomplete suppression
 * - Real-world use case scenarios
 *
 * Test categories:
 * - basic: Detection, indentation, block structure
 * - visual: CSS classes, decorations, dynamic updates
 * - autocomplete: Suppression in draft blocks, picker exceptions
 * - scenarios: Generation, correction, refactoring workflows
 */

import type { TestCase } from '../../types'

// =============================================================================
// Re-export Test API
// =============================================================================

export {
  createDraftModeTestContext,
  createDraftModeAssertions,
  DRAFT_MODE_SCENARIOS,
  executeDraftWorkflow,
  inspectDraftVisualState,
  formatDraftVisualState,
  type DraftModeTestContext,
  type DraftModeAssertions,
  type DraftModeScenario,
  type DraftWorkflowStep,
  type LineVisualState,
} from './draft-mode-api'

// =============================================================================
// Import Test Suites
// =============================================================================

import {
  allBasicDraftModeTests,
  detectionTests,
  indentationTests,
  blockStructureTests,
  lineDetectionTests,
  scenarioTests as basicScenarioTests,
  dynamicEditingTests,
} from './basic.test'

import {
  allVisualDraftModeTests,
  cssClassTests,
  mutedColorTests,
  inspectorTests,
  dynamicVisualTests,
  edgeCaseVisualTests,
} from './visual.test'

import {
  allAutocompleteDraftModeTests,
  suppressionTests,
  pickerTests,
  edgeCaseAutocompleteTests,
} from './autocomplete.test'

import {
  allScenarioDraftModeTests,
  generationTests,
  correctionTests,
  refactoringTests,
  workflowTests,
  contextTests,
  edgeCaseScenarioTests,
} from './scenarios.test'

// =============================================================================
// Re-export Individual Test Groups
// =============================================================================

// Basic tests
export {
  allBasicDraftModeTests,
  detectionTests,
  indentationTests,
  blockStructureTests,
  lineDetectionTests,
  basicScenarioTests,
  dynamicEditingTests,
}

// Visual tests
export {
  allVisualDraftModeTests,
  cssClassTests,
  mutedColorTests,
  inspectorTests,
  dynamicVisualTests,
  edgeCaseVisualTests,
}

// Autocomplete tests
export { allAutocompleteDraftModeTests, suppressionTests, pickerTests, edgeCaseAutocompleteTests }

// Scenario tests
export {
  allScenarioDraftModeTests,
  generationTests,
  correctionTests,
  refactoringTests,
  workflowTests,
  contextTests,
  edgeCaseScenarioTests,
}

// =============================================================================
// Combined Exports
// =============================================================================

/**
 * All draft mode tests combined
 */
export const allDraftModeTests: TestCase[] = [
  ...allBasicDraftModeTests,
  ...allVisualDraftModeTests,
  ...allAutocompleteDraftModeTests,
  ...allScenarioDraftModeTests,
]

/**
 * Quick subset for fast validation
 */
export const quickDraftModeTests: TestCase[] = [
  // Basic detection
  detectionTests[0], // -- activates
  detectionTests[2], // -- with prompt
  detectionTests[4], // no -- means inactive

  // Visual
  cssClassTests[0], // draft lines have class

  // Autocomplete
  suppressionTests[0], // suppressed after --

  // Scenarios
  generationTests[0], // generate with prompt
  correctionTests[0], // correct syntax
]

// =============================================================================
// Category Map for CLI
// =============================================================================

/**
 * Maps category names to test arrays for CLI filtering
 */
export const draftModeCategories: Record<string, TestCase[]> = {
  // Main categories
  basic: allBasicDraftModeTests,
  visual: allVisualDraftModeTests,
  autocomplete: allAutocompleteDraftModeTests,
  scenarios: allScenarioDraftModeTests,

  // Sub-categories: basic
  'basic.detection': detectionTests,
  'basic.indentation': indentationTests,
  'basic.blockStructure': blockStructureTests,
  'basic.lineDetection': lineDetectionTests,
  'basic.dynamicEditing': dynamicEditingTests,

  // Sub-categories: visual
  'visual.cssClass': cssClassTests,
  'visual.mutedColor': mutedColorTests,
  'visual.inspector': inspectorTests,
  'visual.dynamic': dynamicVisualTests,
  'visual.edgeCases': edgeCaseVisualTests,

  // Sub-categories: autocomplete
  'autocomplete.suppression': suppressionTests,
  'autocomplete.pickers': pickerTests,
  'autocomplete.edgeCases': edgeCaseAutocompleteTests,

  // Sub-categories: scenarios
  'scenarios.generation': generationTests,
  'scenarios.correction': correctionTests,
  'scenarios.refactoring': refactoringTests,
  'scenarios.workflow': workflowTests,
  'scenarios.context': contextTests,
  'scenarios.edgeCases': edgeCaseScenarioTests,
}

// =============================================================================
// Test Counts
// =============================================================================

export const draftModeTestCounts = {
  total: allDraftModeTests.length,
  basic: allBasicDraftModeTests.length,
  visual: allVisualDraftModeTests.length,
  autocomplete: allAutocompleteDraftModeTests.length,
  scenarios: allScenarioDraftModeTests.length,
}
