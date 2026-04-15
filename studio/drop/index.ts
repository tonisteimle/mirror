/**
 * Drop Module
 *
 * Handles all drag-drop operations in the studio.
 * Uses Strategy Pattern with Clean Code principles.
 */

// Types
export type {
  DropSource,
  DropResult,
  DropContext,
  DropHandler,
  ModificationResult,
  AbsolutePosition,
  Alignment,
  CodeModifier,
  RobustModifier,
  AddChildOptions,
  ZagDefinitionResult,
} from './types'

// Service
export { DropService, getDropService } from './drop-service'

// Applier
export { DropResultApplier, type ApplierDependencies } from './drop-result-applier'

// Handlers (for testing/extension)
export { ElementDuplicateHandler } from './handlers/element-duplicate'
export { ElementMoveHandler } from './handlers/element-move'
export { AbsolutePositionHandler } from './handlers/absolute-position'
export { PaletteDropHandler } from './handlers/palette-drop'
export { ZagComponentHandler } from './handlers/zag-component'
export { ChartDropHandler } from './handlers/chart-drop'
export { TemplateDropHandler } from './handlers/template-drop'

// App Adapter (for gradual migration from app.js)
export {
  handleStudioDropNew,
  createDropContext,
  createApplierDeps,
  type AppGlobals,
} from './app-adapter'

// Test Harness (for programmatic E2E testing)
export {
  StudioTestHarness,
  createTestHarness,
  assertions,
  MockEditor,
  MockEventBus,
  MockExecutor,
  type TestDropResult,
  type HarnessConfig,
} from './test-harness'
