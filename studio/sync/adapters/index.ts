/**
 * Sync Adapters
 *
 * Exports all adapter implementations for SyncCoordinator ports.
 */

// Mock adapters for testing
export {
  // Event Bus
  createMockEventBusPort,
  type MockEventBusPort,
  type MockEventBusPortState,
  // State Store
  createMockStateStorePort,
  type MockStateStorePort,
  type MockStateStorePortState,
  // DOM Query
  createMockDOMQueryPort,
  type MockDOMQueryPort,
  type MockDOMQueryPortState,
  type MockDOMElement,
  // Clock
  createMockClockPort,
  type MockClockPort,
  // SourceMap
  createMockSourceMapPort,
  type MockSourceMapPort,
  type MockSourceMapPortState,
  // Combined
  createMockSyncPorts,
  type MockSyncPorts,
} from './mock-adapters'

// Production adapters
export {
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
} from './production-adapters'
