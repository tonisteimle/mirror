/**
 * Drag & Drop v3 - Fast, stable drag with insertion indicator
 *
 * Architecture:
 * - LayoutCache: O(1) rect lookups (built once per drag)
 * - HitDetector: Find flex container under cursor
 * - InsertionCalculator: Pure geometry for insertion position
 * - Indicator: Single DOM element, repositioned
 * - DragController: Orchestrates everything
 * - DragReporter: Optional debugging/recording system
 *
 * Performance:
 * - Drag Move: ~0.5ms (no DOM reads, cached values)
 * - Drop: ~30-80ms (code modification, once)
 */

// Types
export type {
  Point,
  ChildInfo,
  FlexLayout,
  HitResult,
  InsertionResult,
  DragSource,
  DropTarget,
} from './types'

// Core components
export { LayoutCache } from './layout-cache'
export { InsertionCalculator } from './insertion-calculator'
export { HitDetector } from './hit-detector'
export { Indicator } from './indicator'

// Controller
export {
  DragController,
  getDragController,
  resetDragController,
  setupGlobalDragReporting,
} from './drag-controller'
export type { DragControllerCallbacks } from './drag-controller'

// Reporter (re-export for convenience)
export * from './reporter'

// Test API (re-export for convenience)
export * from './test-api'

// Browser Test API (for real browser testing)
export {
  BrowserTestRunner,
  setupBrowserDragTestAPI,
  runAllTests as runBrowserTests,
  type BrowserTestResult,
  type AnimationConfig,
  type TestCase,
} from './browser-test-api'
