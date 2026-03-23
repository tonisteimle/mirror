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

// Visual (drag-drop system)
export * from './visual'

// LLM
export * from './llm'

// Agent (Fixer, Context, etc.)
export * from './agent'

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
  type BootstrapConfig,
  type StudioInstance,
} from './bootstrap'
