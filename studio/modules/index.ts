/**
 * Studio Modules
 *
 * Re-exports all module functionality.
 */

// File Manager
export {
  createFileManager,
  getFileManager,
  resetFileManager,
  type FileManager,
  type FileStore,
  type FileType,
  type FileMetadata,
  type Project,
  type FileManagerOptions,
  type FileManagerEvents,
} from './file-manager'

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
