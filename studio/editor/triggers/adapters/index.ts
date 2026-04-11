/**
 * Trigger Adapters
 *
 * Exports mock adapters for the Trigger hexagonal architecture.
 */

// ============================================
// Mock Adapters (for testing)
// ============================================

export {
  // Individual mock ports
  createMockTriggerStatePort,
  createMockEditorTriggerPort,
  createMockPickerPort,
  createMockTriggerDetectionPort,
  createMockTriggerEventPort,
  // Registry
  createMockTriggerRegistry,
  // Combined mock ports
  createMockTriggerPorts,
  // Test fixture helpers
  createTriggerTestFixture,
  // Types
  type MockTriggerStatePort,
  type MockTriggerStateConfig,
  type MockEditorTriggerPort,
  type MockEditorTriggerConfig,
  type MockPickerPort,
  type MockPickerConfig,
  type MockTriggerDetectionPort,
  type MockTriggerEventPort,
  type MockTriggerPorts,
  type CreateMockTriggerPortsConfig,
  type TriggerTestFixture,
} from './mock-adapters'
