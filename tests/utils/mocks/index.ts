/**
 * Test Mocks - Central Export
 *
 * All mock factories for studio testing.
 */

// Sync-related mocks
export {
  createMockSourceMap,
  createMockSyncTargets,
  createMockLineOffsetService,
  createMockEditor,
  createMockPreview,
  createStandardTestScenario,
  createNestedTestScenario,
  type MockSourceMap,
  type MockSyncTargets,
  type MockLineOffsetService,
  type MockEditor,
  type MockPreview,
} from './sync-mocks'

// Property Panel mocks
export {
  createMockPropertyExtractor,
  createMockCodeModifier,
  createMockSelectionProvider,
  createSampleProperty,
  createSampleCategory,
  createSampleElement,
  createStandardFrameElement,
  createElementWithTokens,
  createComponentDefinitionElement,
  createInstanceWithInheritance,
  type MockPropertyExtractor,
  type MockCodeModifier,
  type MockSelectionProvider,
} from './property-panel-mocks'
