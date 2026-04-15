/**
 * Mirror Studio - New Architecture
 *
 * Modular architecture for Mirror Studio.
 * See docs/architecture/ for detailed documentation.
 */

// Core (state, events, commands)
export * from './core'

// Modules (file-manager, compiler)
export * from './modules'

// Pickers (color, token, icon, animation)
export * from './pickers'

// Panels (property, tree, files)
export * from './panels'

// Sync
export * from './sync'

// Autocomplete
export * from './autocomplete'

// Editor
export * from './editor'

// Preview
export * from './preview'

// Visual (overlay, resize, etc.)
export * from './visual'

// LLM
export * from './llm'

// Agent (Fixer, Context, etc.)
export * from './agent'

// Storage (abstracted file system)
export * from './storage'

// Desktop Files - loaded separately at runtime (has circular dep on dist/index.js)
// See: studio/desktop-files.js

// UI Components (Zag.js-based)
export * from './ui'

// Rename (IDE-style F2 rename symbol)
export * from './rename'

// Drop (drag-drop handling with Strategy Pattern)
export * from './drop'

// Zag (Zag component helpers)
export * from './zag'

// File Types (file type definitions and detection)
export * from './file-types'

// React Converter (React/JSX to Mirror DSL)
export * from './react-converter'

// YAML Parser (data file parsing)
export * from './yaml-parser'

// Bootstrap
export {
  studio,
  initializeStudio,
  updateStudioState,
  handleSelectionChange,
  setProperty,
  removeProperty,
  insertComponent,
  deleteNode,
  getCompletions,
  executeLLMResponse,
  buildLLMPrompt,
  getLLMContext,
  onSelectionChange,
  onSourceChange,
  onCompileComplete,
  generateComponentCodeFromDragData,
  type BootstrapConfig,
  type StudioInstance,
} from './bootstrap'
