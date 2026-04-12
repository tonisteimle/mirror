/**
 * Compiler Types Re-export
 *
 * Re-exports commonly used compiler types and utilities
 * to avoid deep relative imports (../../../../compiler).
 *
 * Usage:
 *   import { SourceMap, createLogger } from '../../shared/compiler-types'
 *   instead of:
 *   import { SourceMap, createLogger } from '../../../../compiler'
 */

// Types
export type {
  SourceMap,
  CodeModifier,
  ModificationResult,
  CodeChange,
  PropertyExtractor,
  ExtractedElement,
  ExtractedProperty,
  PropertyCategory,
  AST,
  IR,
} from '../../compiler'

// Functions
export {
  createLogger,
  isAbsoluteLayoutContainer,
} from '../../compiler'
