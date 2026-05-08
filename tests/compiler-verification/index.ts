/**
 * Compiler Verification Tests — Schwierigste Fälle
 *
 * Verifies that the compiler emits exactly correct output for:
 * - Complex syntax combinations
 * - Edge cases on properties
 * - Nested structures
 * - Layout calculations
 * - State management
 * - Data binding
 * - Component inheritance
 *
 * Each themed *.test.ts file owns one slice of the surface area.
 */

import type { TestCase } from '../../test-runner'

// Existing extracted suites
import {
  allPreludeTests,
  noAutoWrapperTests,
  explicitAppTests,
  codeIntegrityTests,
  nestedStructureTests as preludeNestedTests,
} from './prelude.test'

import {
  allCompilerErrorTests,
  invalidPropertyTests,
  undefinedComponentTests,
  invalidTokenTests,
  syntaxErrorTests,
  compilerErrorRecoveryTests,
  edgeCaseErrorTests,
} from './errors.test'

// Themed test files (Phase C split)
import { complexPropertyTests } from './complex-properties.test'
import { layoutVerificationTests, advancedLayoutTests } from './layout.test'
import { nestedStructureTests } from './nested-structures.test'
import { tokenResolutionTests } from './tokens.test'
import { conditionalTests } from './conditionals.test'
import { collectionTests } from './collections.test'
import { componentInheritanceTests } from './component-inheritance.test'
import { inlineSyntaxTests } from './inline-syntax.test'
import { primitivesTests } from './primitives.test'
import { edgeCaseTests } from './edge-cases.test'
import { stateManagementTests } from './states.test'
import { animationTests } from './animations.test'
import { transformTests } from './transforms.test'
import { effectsTests } from './effects.test'
import { formControlsTests } from './form-controls.test'
import { advancedTypographyTests } from './advanced-typography.test'
import { iconTests, iconVariantTests } from './icons.test'
import { complexCombinationsTests } from './complex-combinations.test'
import {
  zagDialogTests,
  zagTabsTests,
  zagSelectTests,
  zagCheckboxTests,
  zagSliderTests,
  zagRadioTests,
  zagTooltipTests,
  zagDatePickerTests,
} from './zag.test'
import {
  functionToggleTests,
  functionCounterTests,
  functionNavigationTests,
  functionFeedbackTests,
  functionFormControlTests,
  functionCombinedTests,
} from './functions.test'
import { crossElementStateTests } from './cross-element.test'
import { dataBindingTests } from './data-binding.test'
import { chartTests } from './charts.test'
import { tableTests } from './tables.test'
import { eventHandlerTests } from './event-handlers.test'
import { responsiveTests } from './responsive.test'
import { realWorldComponentTests } from './real-world-components.test'
import {
  interactionToggleTests,
  interactionMultiStateTests,
  interactionVisibilityTests,
} from './interactions-toggle.test'
import { interactionExclusiveTests, interactionHoverTests } from './interactions-state.test'
import {
  interactionCounterTests,
  interactionFormTests,
  interactionCheckboxTests,
} from './interactions-input.test'
import { interactionWorkflowTests, interactionRapidTests } from './interactions-workflow.test'

// Re-exports
export {
  // Prelude
  allPreludeTests,
  noAutoWrapperTests,
  explicitAppTests,
  codeIntegrityTests,
  preludeNestedTests,
  // Errors (B2.1)
  allCompilerErrorTests,
  invalidPropertyTests,
  undefinedComponentTests,
  invalidTokenTests,
  syntaxErrorTests,
  compilerErrorRecoveryTests,
  edgeCaseErrorTests,
  // Themed groups
  complexPropertyTests,
  layoutVerificationTests,
  advancedLayoutTests,
  nestedStructureTests,
  tokenResolutionTests,
  conditionalTests,
  collectionTests,
  componentInheritanceTests,
  inlineSyntaxTests,
  primitivesTests,
  edgeCaseTests,
  stateManagementTests,
  animationTests,
  transformTests,
  effectsTests,
  formControlsTests,
  advancedTypographyTests,
  iconTests,
  iconVariantTests,
  complexCombinationsTests,
  zagDialogTests,
  zagTabsTests,
  zagSelectTests,
  zagCheckboxTests,
  zagSliderTests,
  zagRadioTests,
  zagTooltipTests,
  zagDatePickerTests,
  functionToggleTests,
  functionCounterTests,
  functionNavigationTests,
  functionFeedbackTests,
  functionFormControlTests,
  functionCombinedTests,
  crossElementStateTests,
  dataBindingTests,
  chartTests,
  tableTests,
  eventHandlerTests,
  responsiveTests,
  realWorldComponentTests,
  interactionToggleTests,
  interactionMultiStateTests,
  interactionVisibilityTests,
  interactionExclusiveTests,
  interactionHoverTests,
  interactionCounterTests,
  interactionFormTests,
  interactionCheckboxTests,
  interactionWorkflowTests,
  interactionRapidTests,
}

export const allCompilerVerificationTests: TestCase[] = [
  ...allPreludeTests,
  ...complexPropertyTests,
  ...layoutVerificationTests,
  ...nestedStructureTests,
  ...tokenResolutionTests,
  ...conditionalTests,
  ...collectionTests,
  ...componentInheritanceTests,
  ...inlineSyntaxTests,
  ...primitivesTests,
  ...edgeCaseTests,
  ...stateManagementTests,
  ...animationTests,
  ...transformTests,
  ...advancedLayoutTests,
  ...effectsTests,
  ...formControlsTests,
  ...advancedTypographyTests,
  ...iconTests,
  ...complexCombinationsTests,
  ...zagDialogTests,
  ...zagTabsTests,
  ...zagSelectTests,
  ...zagCheckboxTests,
  ...zagSliderTests,
  ...zagRadioTests,
  ...zagTooltipTests,
  ...zagDatePickerTests,
  ...functionToggleTests,
  ...functionCounterTests,
  ...functionNavigationTests,
  ...functionFeedbackTests,
  ...functionFormControlTests,
  ...functionCombinedTests,
  ...crossElementStateTests,
  ...dataBindingTests,
  ...chartTests,
  ...tableTests,
  ...eventHandlerTests,
  ...responsiveTests,
  ...realWorldComponentTests,
  ...interactionToggleTests,
  ...interactionExclusiveTests,
  ...interactionCounterTests,
  ...interactionHoverTests,
  ...interactionFormTests,
  ...interactionCheckboxTests,
  ...interactionMultiStateTests,
  ...interactionVisibilityTests,
  ...interactionWorkflowTests,
  ...interactionRapidTests,
  ...iconVariantTests,
]

export default allCompilerVerificationTests
