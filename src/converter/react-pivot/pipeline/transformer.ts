/**
 * @module converter/react-pivot/pipeline/transformer
 * @description Transforms React code to Mirror DSL
 *
 * This module wraps the existing experiment code and provides a clean
 * interface for the React-Pivot pipeline.
 *
 * Transformation flow:
 * React/JSX → MirrorDocument (schema) → Mirror DSL (string)
 */

import type { MirrorDocument } from '../types'
import parseReactCode from '../../../experiment/react-to-mirror/react-parser'
import transformToMirrorDSL from '../../../experiment/react-to-mirror/transformer'
import { postProcessMirrorCode, type PostProcessCorrection } from './post-processor'

// =============================================================================
// Types
// =============================================================================

export interface TransformResult {
  /** Generated Mirror DSL code */
  mirrorCode: string

  /** Intermediate schema representation */
  schema: MirrorDocument

  /** Whether any transformations were applied */
  transformed: boolean

  /** Post-processing corrections applied */
  corrections?: PostProcessCorrection[]

  /** Whether post-processing modified the code */
  postProcessed?: boolean
}

// =============================================================================
// Main Transformer
// =============================================================================

/**
 * Transform React/JSX code to Mirror DSL.
 *
 * This is a two-step process:
 * 1. Parse React code into MirrorDocument schema
 * 2. Transform MirrorDocument to Mirror DSL string
 */
export function transformReactToMirror(reactCode: string): TransformResult {
  // Step 1: Parse React to schema
  const schema = parseReactCode(reactCode)

  // Step 2: Transform schema to Mirror DSL
  const rawMirrorCode = transformToMirrorDSL(schema)

  // Step 3: Post-process for corrections
  const postProcessResult = postProcessMirrorCode(rawMirrorCode)

  return {
    mirrorCode: postProcessResult.code,
    schema,
    transformed: postProcessResult.code.length > 0,
    corrections: postProcessResult.corrections.length > 0 ? postProcessResult.corrections : undefined,
    postProcessed: postProcessResult.modified,
  }
}

// =============================================================================
// Direct Schema to Mirror (for testing)
// =============================================================================

/**
 * Transform a MirrorDocument directly to Mirror DSL.
 * Useful for testing schema transformations.
 */
export function schemaToMirror(schema: MirrorDocument): string {
  return transformToMirrorDSL(schema)
}

/**
 * Parse React code to MirrorDocument without full transformation.
 * Useful for debugging and validation.
 */
export function parseReactToSchema(reactCode: string): MirrorDocument {
  return parseReactCode(reactCode)
}

// =============================================================================
// Export
// =============================================================================

export default transformReactToMirror
