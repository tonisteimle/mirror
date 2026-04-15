/**
 * Drag & Drop Test API
 *
 * Programmatic testing interface for drag & drop operations.
 *
 * Usage in tests:
 * ```typescript
 * import { DragTestRunner, createDragTest } from 'studio/preview/drag/test-api'
 *
 * const runner = new DragTestRunner(context)
 * const result = await runner.simulatePaletteDrag({
 *   componentType: 'Button',
 *   targetNodeId: 'node-1',
 *   insertionIndex: 0
 * })
 * ```
 *
 * Usage in browser (after setupGlobalDragTestAPI):
 * ```javascript
 * const result = await window.__testDragDrop.simulatePaletteDrag({
 *   componentType: 'Button',
 *   targetNodeId: 'node-1',
 *   insertionIndex: 0
 * })
 * ```
 */

// Types
export type {
  PaletteDragParams,
  CanvasMoveParams,
  CoordinateDragParams,
  DragTestResult,
  CodeExpectation,
  ComponentFixture,
  ContainerFixture,
  DragTestConfig,
  DragTestContext,
  DragTestBuilder,
  PaletteDragBuilder,
  CanvasMoveBuilder,
  GlobalDragTestAPI,
} from './types'

// Runner
export { DragTestRunner, createDragTest } from './drag-test-runner'

// Fixtures
export * from './fixtures'

// Global API setup
export { setupGlobalDragTestAPI } from './global'
