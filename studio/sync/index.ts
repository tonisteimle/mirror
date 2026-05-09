/**
 * Sync Module — hexagonal architecture (v2).
 *
 * The legacy v1 (`sync-coordinator.ts`) was removed; production has used
 * `createSyncCoordinatorWithPorts` since the architecture migration.
 */

// ============================================
// Hexagonal Architecture (v2)
// ============================================

// Ports (interfaces)
// Note: SelectionOrigin, BreadcrumbItem, CleanupFn are exported from core to avoid duplicate exports
export type {
  EventBusPort,
  StateStorePort,
  DOMQueryPort,
  ClockPort,
  SourceMapPort,
  SyncPorts,
  SelectionChangedEvent,
  PreviewElement,
  SourceMapNode,
  SourceMapDefinition,
} from './ports'

// New SyncCoordinator with ports
export {
  SyncCoordinator as SyncCoordinatorV2,
  createSyncCoordinatorWithPorts,
  type SyncCoordinatorConfig,
  type ExtendedSyncPorts,
  type SyncTargets as SyncTargetsV2,
} from './sync-coordinator-v2'

// Adapters
export {
  // Mock adapters for testing
  createMockEventBusPort,
  createMockStateStorePort,
  createMockDOMQueryPort,
  createMockClockPort,
  createMockSourceMapPort,
  createMockSyncPorts,
  type MockEventBusPort,
  type MockStateStorePort,
  type MockDOMQueryPort,
  type MockClockPort,
  type MockSourceMapPort,
  type MockSyncPorts,
  type MockDOMElement,
  // Production adapters
  createEventBusPort,
  createStateStorePort,
  createDOMQueryPort,
  createClockPort,
  createSourceMapPort,
  createProductionSyncPorts,
  type DOMQueryPortConfig,
  type SourceMapPortWithSetter,
  type ProductionSyncPortsConfig,
  type ProductionSyncPorts,
} from './adapters'

// ============================================
// Utilities
// ============================================

export { LineOffsetService, createLineOffsetService } from './line-offset-service'

export {
  extractComponentFromLine,
  findParentDefinition,
  getNodeIdForLine,
  getDefinitionName,
  isInsideDefinition,
  type ComponentInfo,
  type ParentContext,
} from './component-line-parser'
