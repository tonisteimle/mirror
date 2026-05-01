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

// Agent (Fixer-only AI integration via Claude CLI)
export * from './agent'

// Storage (abstracted file system)
export * from './storage'

// Desktop Files - loaded separately at runtime (has circular dep on dist/index.js)
// See: studio/desktop-files.js

// UI Components (Zag.js-based)
export * from './ui'

// Rename (IDE-style F2 rename symbol)
export * from './rename'

// Drop (drag-drop handling with Strategy Pattern). Excluded names are
// the drop-internal interface views that overlap with the canonical
// code-modifier exports below — drop's CodeModifier / RobustModifier /
// AddChildOptions / ModificationResult are subsets of the same names
// shipped from `./code-modifier`, and re-exporting both would shadow.
export {
  DropService,
  getDropService,
  DropResultApplier,
  type ApplierDependencies,
  ElementDuplicateHandler,
} from './drop'
export type {
  DropSource,
  DropResult,
  DropContext,
  DropHandler,
  AbsolutePosition,
  Alignment,
  ZagDefinitionResult,
} from './drop'

// Zag (Zag component helpers)
export * from './zag'

// File Types (file type definitions and detection)
export * from './file-types'

// Code Modifier — bidirectional editing (PropertyExtractor / CodeModifier /
// RobustModifier). Used by app.js fallback paths that still construct
// these via the studio bundle (see app.js studioCodeModifier creation).
export * from './code-modifier'

// React Converter (React/JSX to Mirror DSL)
export * from './react-converter'

// YAML Parser (data file parsing) — lives under compile/
export * from './compile/yaml-parser'

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
  onSelectionChange,
  onSourceChange,
  onCompileComplete,
  generateComponentCodeFromDragData,
  type BootstrapConfig,
  type StudioInstance,
} from './bootstrap'
