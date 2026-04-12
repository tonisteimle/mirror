/**
 * CodeModifier Module
 *
 * Exports both the legacy CodeModifier and the new hexagonal architecture version.
 */

// ============================================
// Legacy CodeModifier (for backward compatibility)
// ============================================

/**
 * @deprecated Use CodeModifierV2 instead. Will be removed in v3.0.
 */
export {
  CodeModifier,
  type CodeChange,
  type ModificationResult,
  type ModifyPropertyOptions,
  type AddChildOptions,
  type FilesAccess,
  type ExtractToComponentResult,
} from './code-modifier'

// ============================================
// Hexagonal Architecture (New)
// ============================================

// Ports (interfaces for external dependencies)
export type {
  SourceMapPort,
  LineParserPort,
  TemplatePort,
  DocumentPort,
  CodeModifierPorts,
  NodeMapping,
  ParsedLine,
  ParsedProperty,
  SourcePosition,
  PositionRange,
} from './code-modifier-ports'

// CodeModifierV2 (port-based, testable)
export {
  CodeModifierV2,
  createCodeModifierV2,
} from './code-modifier-v2'

// Adapters (implementations)
export {
  // Mock adapters for testing
  createMockSourceMapPort,
  createMockLineParserPort,
  createMockTemplatePort,
  createMockDocumentPort,
  createMockCodeModifierPorts,
  createNodeMapping,
  createTestFixture,
  // Production adapters
  createSourceMapPort,
  createLineParserPort,
  createTemplatePort,
  createDocumentPort,
  createCodeModifierPorts,
  // Types
  type MockSourceMapPort,
  type MockLineParserPort,
  type MockTemplatePort,
  type MockDocumentPort,
  type MockCodeModifierPorts,
  type CreateCodeModifierPortsConfig,
} from './adapters'
