/**
 * Sync Module
 */

// ============================================
// Legacy Exports (v1)
// ============================================

export { SyncCoordinator, createSyncCoordinator, type SyncTargets, type SyncCoordinatorOptions } from './sync-coordinator'

// ============================================
// New Hexagonal Architecture (v2)
// ============================================

// Ports (interfaces)
export type {
  EventBusPort,
  StateStorePort,
  DOMQueryPort,
  ClockPort,
  SourceMapPort,
  SyncPorts,
  SelectionOrigin,
  SelectionChangedEvent,
  BreadcrumbItem,
  PreviewElement,
  SourceMapNode,
  SourceMapDefinition,
  CleanupFn,
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
