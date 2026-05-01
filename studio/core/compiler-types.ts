/**
 * Compiler Types Re-export
 *
 * Re-exports commonly used compiler types and utilities to avoid deep
 * relative imports. Code-modifier types (the bidirectional source-edit
 * surface) live in `studio/code-modifier`; other compiler types in
 * `compiler/`.
 */

// Compiler-side types
export type { SourceMap, AST, IR } from '../../compiler'
export { createLogger } from '../../compiler'

// Code-modifier types (Studio-side bidirectional editor)
export type {
  CodeModifier,
  ModificationResult,
  CodeChange,
  PropertyExtractor,
  ExtractedElement,
  ExtractedProperty,
  PropertyCategory,
} from '../code-modifier'
export { isAbsoluteLayoutContainer } from '../code-modifier'
