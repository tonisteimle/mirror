/**
 * Editor Adapters
 *
 * Export all adapter implementations for the EditorPort interfaces.
 */

// Mock adapters for testing
export {
  createMockEditorPort,
  createMockStatePort,
  createMockTimerPort,
  createMockEditorPorts,
  type MockEditorPort,
  type MockEditorPortState,
  type MockStatePort,
  type MockStatePortState,
  type MockTimerPort,
  type MockEditorPorts,
} from './mock-adapters'

// CodeMirror adapters for production
export {
  createCodeMirrorAdapter,
  createEditorUpdateExtension,
  createStatePort,
  createTimerPort,
  createProductionEditorPorts,
  type CodeMirrorAdapterConfig,
  type ProductionEditorPortsConfig,
} from './codemirror-adapter'
