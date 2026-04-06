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

// Drag & Drop (Pragmatic DnD based)
export * from './drag-drop'
// Backward compatibility alias
export { DragDropSystem as DragDropService } from './drag-drop'

// LLM
export * from './llm'

// Agent (Fixer, Context, etc.)
export * from './agent'

// Storage (abstracted file system)
export * from './storage'

// Desktop Files (file tree UI and operations)
export * from './desktop-files'

// UI Components (Zag.js-based)
export * from './ui'

// Rename (IDE-style F2 rename symbol)
export * from './rename'

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
