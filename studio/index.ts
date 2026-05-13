/**
 * Mirror Studio - New Architecture
 *
 * Modular architecture for Mirror Studio.
 * See docs/architecture/ for detailed documentation.
 */

// Core (state, events, commands)
export * from './core'

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
export * from './file-types'

// Code Modifier — bidirectional editing (PropertyExtractor / CodeModifier /
// RobustModifier). Used by app.js fallback paths that still construct
// these via the studio bundle (see app.js studioCodeModifier creation).
export * from './code-modifier'

// YAML Parser (data file parsing) — lives under compile/
export * from './compile/yaml-parser'

// Validator (code linting) — re-exported from compiler/. Used by
// app.ts's compile path for diagnostics. Previously surfaced via
// the deleted studio/modules/ barrel (`9ca1cb6c`); explicit
// re-export here keeps app.ts compiling.
export {
  validate,
  validateAST,
  toCodeMirrorDiagnostics,
  type ValidationResult,
  type ValidationError,
  type CodeMirrorDiagnostic,
} from '../compiler/validator'

// Compile module — prelude / collector helpers consumed by studio/app.ts.
// `collectPrelude` is load-bearing (without it app.js fails to boot with
// "does not provide an export named 'collectPrelude'"). We enumerate
// explicitly to avoid `export *` collisions: `./compile` shares names
// with other barrels (`./code-modifier` SourceMap, `./core` ParseError/
// StudioState). Re-exporting only compile-unique members keeps both
// sides.
export {
  collectPrelude,
  collectAllProjectSource,
  collectTokensSource,
  createAutoCreateFiles,
  getPreludeLineOffset,
  type CollectPreludeDeps,
  type PreludeFileType,
  type CollectAllProjectSourceDeps,
  type CollectTokensSourceDeps,
  type AutoCreateFilesDeps,
  type AutoCreateFilesAPI,
  type PreludeLineOffsetDeps,
} from './compile'
export type {
  AST as CompileAST,
  Component as CompileComponent,
  Instance as CompileInstance,
  Token as CompileToken,
  IRResult,
  CompileResult,
  RenderContext,
  CompileDependencies,
  MirrorLangAPI,
  StudioActions,
  Studio,
  CompileTimings,
} from './compile'

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
