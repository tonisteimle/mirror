/**
 * Autocomplete Adapters
 *
 * Exports both mock and production adapters for the Autocomplete hexagonal architecture.
 */

// ============================================
// Mock Adapters (for testing)
// ============================================

export {
  // Individual mock ports
  createMockEditorContextPort,
  createMockSourceMapContextPort,
  createMockCompletionUIPort,
  // Combined mock ports
  createMockAutocompletePorts,
  // Test fixture helpers
  createAutocompleteTestFixture,
  // Types
  type MockEditorContextPort,
  type MockEditorContextConfig,
  type MockSourceMapContextPort,
  type MockSourceMapContextConfig,
  type MockCompletionUIPort,
  type MockCompletionUIConfig,
  type MockAutocompletePorts,
  type CreateMockAutocompletePortsConfig,
  type AutocompleteTestFixture,
} from './mock-adapters'

// ============================================
// Production Adapters
// ============================================

export {
  // Individual production ports
  createEditorContextPort,
  createSourceMapContextPort,
  createCompletionUIPort,
  // Combined production ports
  createAutocompletePorts,
  // Types
  type CreateEditorContextPortConfig,
  type CreateSourceMapContextPortConfig,
  type CreateCompletionUIPortConfig,
  type CreateAutocompletePortsConfig,
} from './production-adapters'
