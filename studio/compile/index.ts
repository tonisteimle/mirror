/**
 * Compile Module
 *
 * Handles compilation of Mirror DSL code.
 * Uses Clean Code principles with focused, small functions.
 */

// Types
export type {
  FileType,
  AST,
  Component,
  Instance,
  Token,
  ParseError,
  IRResult,
  SourceMap,
  CompileResult,
  RenderContext,
  CompileDependencies,
  MirrorLangAPI,
  StudioActions,
  Studio,
  StudioState,
  CompileTimings,
} from './types'

// Service
export { CompileService } from './compile-service'

// Sub-modules (for testing/extension)
export { PreludeBuilder, type PreludeResult, type PreludeDeps } from './prelude-builder'
export { collectPrelude, type CollectPreludeDeps, type PreludeFileType } from './collect-prelude'
export { collectAllProjectSource, type CollectAllProjectSourceDeps } from './all-project-source'
export { collectTokensSource, type CollectTokensSourceDeps } from './tokens-source'
export {
  createAutoCreateFiles,
  type AutoCreateFilesDeps,
  type AutoCreateFilesAPI,
} from './auto-create-files'
export { getPreludeLineOffset, type PreludeLineOffsetDeps } from './prelude-line-offset'
export { CodeGenerator, type GeneratorDeps } from './code-generator'
export { PreviewRenderer, type RendererDeps, type RenderResult } from './preview-renderer'
export { StudioUpdater, type UpdaterDeps } from './studio-updater'
export { PerfLogger } from './perf-logger'

// Renderers
export { TokenRenderer, type TokenRenderDeps } from './token-renderer'
export { ComponentRenderer, type ComponentRenderDeps } from './component-renderer'
