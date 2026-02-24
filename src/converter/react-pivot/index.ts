/**
 * @module converter/react-pivot
 * @description React-Pivot Transformation Pipeline for Mirror DSL
 *
 * This module provides a two-step transformation:
 * 1. LLM generates constrained React/JSX code ("Mirrorable React")
 * 2. Deterministic transformation to Mirror DSL
 *
 * The key insight: LLMs know React perfectly, so we leverage that knowledge
 * rather than teaching them Mirror DSL from scratch.
 *
 * ## Usage
 *
 * ```typescript
 * import { executePipeline } from './converter/react-pivot'
 *
 * const result = await executePipeline('Create a login form', {
 *   tokensCode: '$primary.bg: #3B82F6\n$surface.bg: #1F1F1F',
 *   qualityMode: true,
 * })
 *
 * if (result.success) {
 *   console.log(result.mirrorCode)
 * }
 * ```
 *
 * ## Architecture
 *
 * ```
 * User Prompt
 *     │
 *     ▼
 * ┌─────────────────────────────────────┐
 * │  Context Building                   │
 * │  (tokens, components, layout)       │
 * └─────────────────────────────────────┘
 *     │
 *     ▼
 * ┌─────────────────────────────────────┐
 * │  React Generation (LLM)             │
 * │  "Mirrorable React" subset          │
 * └─────────────────────────────────────┘
 *     │
 *     ▼
 * ┌─────────────────────────────────────┐
 * │  React Validation                   │
 * │  + Self-Healing / Retry             │
 * └─────────────────────────────────────┘
 *     │
 *     ▼
 * ┌─────────────────────────────────────┐
 * │  Transformation                     │
 * │  React → Schema → Mirror DSL        │
 * └─────────────────────────────────────┘
 *     │
 *     ▼
 * Mirror DSL Output
 * ```
 *
 * @see {@link ./types} for TypeScript interfaces
 * @see {@link ./spec} for the React-to-Mirror mapping specification
 * @see {@link ./validation} for React validation and self-healing
 * @see {@link ./pipeline} for the transformation pipeline
 * @see {@link ./integration} for nl-translation.ts integration
 */

// =============================================================================
// Main Pipeline
// =============================================================================

export { executePipeline, promptToMirror, cancelActiveRequest } from './pipeline'

// =============================================================================
// Types
// =============================================================================

export type {
  ReactPivotOptions,
  ReactPivotResult,
  ReactPivotCallbacks,
  ReactPivotError,
  ReactPivotErrorData,
  PipelinePhase,
  PhaseResult,
  PipelineMetrics,
  ValidationIssue,
  ValidationIssueType,
  ValidationResult,
  HealingStrategy,
  HealingResult,
  LLMContext,
  LLMGenerationResult,
} from './types'

export { createReactPivotError, isReactPivotError } from './types'

// =============================================================================
// Spec (Generated Mappings)
// =============================================================================

export {
  REACT_TO_MIRROR_PROPERTIES,
  REACT_TO_MIRROR_EVENTS,
  REACT_TO_MIRROR_ACTIONS,
  REACT_TO_MIRROR_STATES,
  REACT_TO_MIRROR_ANIMATIONS,
  REACT_TO_MIRROR_POSITIONS,
  REACT_TO_MIRROR_TARGETS,
  ALLOWED_COMPONENTS,
  isValidReactProperty,
  isValidReactEvent,
  isValidAction,
  isValidState,
  isValidAnimation,
  isValidPosition,
  isValidTarget,
  isAllowedComponent,
  getMirrorProperty,
  getMirrorEvent,
} from './spec'

// =============================================================================
// Validation
// =============================================================================

export { validateReactCode } from './validation/react-linter'
export { healReactCode, generateCorrectionPrompt } from './validation/healing'

// =============================================================================
// Transformation
// =============================================================================

export {
  transformReactToMirror,
  schemaToMirror,
  parseReactToSchema,
} from './pipeline/transformer'

// =============================================================================
// Integration
// =============================================================================

export {
  translateWithReactPivot,
  translateSmart,
  shouldUseReactPivot,
} from './integration'

// =============================================================================
// Prompts
// =============================================================================

export { REACT_SYSTEM_PROMPT } from './prompts'

// =============================================================================
// Default Export
// =============================================================================

export { executePipeline as default } from './pipeline'
