/**
 * CodeModifier Adapters
 *
 * Exports both mock and production adapters for the CodeModifier hexagonal architecture.
 */

// ============================================
// Mock Adapters (for testing)
// ============================================

export {
  // Individual mock ports
  createMockSourceMapPort,
  createMockLineParserPort,
  createMockTemplatePort,
  createMockDocumentPort,
  // Combined mock ports
  createMockCodeModifierPorts,
  // Test fixture helpers
  createNodeMapping,
  createTestFixture,
  // Types
  type MockSourceMapPort,
  type MockSourceMapPortConfig,
  type MockLineParserPort,
  type MockLineParserPortConfig,
  type MockTemplatePort,
  type MockDocumentPort,
  type MockDocumentPortConfig,
  type MockCodeModifierPorts,
  type CreateMockCodeModifierPortsConfig,
} from './mock-code-modifier-adapters'

// ============================================
// Production Adapters
// ============================================

export {
  // Individual production ports
  createSourceMapPort,
  createLineParserPort,
  createTemplatePort,
  createDocumentPort,
  // Combined production ports
  createCodeModifierPorts,
  // Types
  type CreateCodeModifierPortsConfig,
} from './code-modifier-adapters'
