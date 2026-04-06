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

// Drag-Drop mocks
export {
  createRect,
  createInternalRect,
  createMockDropTarget,
  createMockFlexTarget,
  createMockPaletteSource,
  createMockCanvasSource,
  createMockElement,
  createPositionedContainer,
  createMockSourceMap as createMockDragDropSourceMap,
  createMockCodeModifier as createMockDragDropCodeModifier,
  createMockCodeExecutorDeps,
  createMockCodeExecutor,
  createMockAbsoluteDropResult,
  createMockFlexDropResult,
  createMockVisualState,
  type MockHTMLElement,
  type MockSourceMap as DragDropMockSourceMap,
  type MockCodeModifier as DragDropMockCodeModifier,
  type MockCodeExecutorDeps,
} from './drag-drop-mocks'

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
