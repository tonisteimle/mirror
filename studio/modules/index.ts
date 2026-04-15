/**
 * Studio Modules
 *
 * Re-exports all module functionality.
 */

// Note: File Manager has been replaced by studio/storage/
// See docs/architecture/STORAGE.md for details

// Compiler
export {
  createCompiler,
  getCompiler,
  resetCompiler,
  buildPrelude,
  countPreludeLines,
  adjustLineNumber,
  type Compiler,
  type CompileOptions,
  type CompilationResult,
  type PreludeResult,
  type CompilerEvents,
  type Warning,
} from './compiler'

// Preview Renderers (for token/component previews)
export {
  TokenRenderer,
  ComponentRenderer,
  type TokenRenderDeps,
  type ComponentRenderDeps,
} from '../compile'
