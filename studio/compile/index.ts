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

// Sub-modules consumed by studio/app.ts compile() path
export { collectPrelude, type CollectPreludeDeps, type PreludeFileType } from './collect-prelude'
export { collectAllProjectSource, type CollectAllProjectSourceDeps } from './all-project-source'
export { collectTokensSource, type CollectTokensSourceDeps } from './tokens-source'
export {
  createAutoCreateFiles,
  type AutoCreateFilesDeps,
  type AutoCreateFilesAPI,
} from './auto-create-files'
export { getPreludeLineOffset, type PreludeLineOffsetDeps } from './prelude-line-offset'

// Renderers
export { TokenRenderer, type TokenRenderDeps } from './token-renderer'
export { ComponentRenderer, type ComponentRenderDeps } from './component-renderer'
