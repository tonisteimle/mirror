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

// Drop (drag-drop handling with Strategy Pattern). Drop re-exports a
// handful of *type* aliases (CodeModifier, RobustModifier, AddChildOptions,
// ModificationResult) that overlap with the canonical class/type exports
// from `./code-modifier` below — types are erased at runtime, but
// TypeScript flags the duplicate names. Enumerate Drop's runtime + type
// exports explicitly and skip the four overlapping type aliases.
export {
  DropService,
  getDropService,
  DropResultApplier,
  type ApplierDependencies,
  ElementDuplicateHandler,
  ElementMoveHandler,
  AbsolutePositionHandler,
  PaletteDropHandler,
  ZagComponentHandler,
  ChartDropHandler,
  TemplateDropHandler,
  handleStudioDropNew,
  createDropContext,
  createApplierDeps,
  type AppGlobals,
  StudioTestHarness,
  createTestHarness,
  assertions as dropAssertions,
  MockEditor,
  MockEventBus,
  MockExecutor,
  type TestDropResult,
  type HarnessConfig,
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
// NOTE: `isMirrorFile` is re-exported by both `./storage` (broader: includes
// .yaml/.yml) and `./file-types/extensions` (Mirror DSL source only). With
// two re-exports of the same name, ESM treats the export as ambiguous and
// drops it from the bundle, breaking `import { isMirrorFile }` in app.js.
// Pick the file-types version explicitly here so the studio bundle has a
// single, well-defined `isMirrorFile`.
export * from './file-types'
export { isMirrorFile } from './file-types/extensions'

// Code Modifier — bidirectional editing (PropertyExtractor / CodeModifier /
// RobustModifier). Used by app.js fallback paths that still construct
// these via the studio bundle (see app.js studioCodeModifier creation).
export * from './code-modifier'

// React Converter (React/JSX to Mirror DSL)
export * from './react-converter'

// YAML Parser (data file parsing) — lives under compile/
export * from './compile/yaml-parser'

// Compile module — prelude / generator / renderer helpers consumed by
// studio/app.js. Re-exported here so the studio bundle surfaces them
// (collectPrelude is the load-bearing one — without it app.js fails to
// boot with "does not provide an export named 'collectPrelude'").
export * from './compile'

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
