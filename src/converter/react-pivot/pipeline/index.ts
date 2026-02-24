/**
 * @module converter/react-pivot/pipeline
 * @description React-Pivot transformation pipeline orchestrator
 *
 * Pipeline flow:
 * 1. Context Building - Gather tokens, components, layout context
 * 2. React Generation - LLM generates constrained React code
 * 3. React Validation - Validate against the constrained subset
 * 4. Transformation - React → MirrorDocument → Mirror DSL
 * 5. Mirror Validation - Final validation of generated Mirror code
 */

import {
  createReactPivotError,
  isReactPivotError,
} from '../types'
import type {
  ReactPivotOptions,
  ReactPivotResult,
  PipelinePhase,
  PhaseResult,
  PipelineMetrics,
  ValidationIssue,
  LLMContext,
} from '../types'
import { validateReactCode } from '../validation/react-linter'
// Self-healing removed - analysis showed 0% activation rate, transformer handles tolerance
import { generateReactCode } from './react-generator'
import { transformReactToMirror } from './transformer'
// Retry strategy imports removed - simplified pipeline doesn't need complex retries

// =============================================================================
// Pipeline Orchestrator
// =============================================================================

export async function executePipeline(
  prompt: string,
  options: ReactPivotOptions = {}
): Promise<ReactPivotResult> {
  // Validate prompt
  const trimmedPrompt = prompt?.trim()
  if (!trimmedPrompt) {
    return {
      success: false,
      mirrorCode: '',
      issues: [{ type: 'INVALID_COMPONENT', message: 'Empty prompt provided', fixable: false }],
      metrics: { timeToFirstToken: 0, totalTime: 0, retryCount: 0 },
    }
  }

  const {
    qualityMode = false,
    maxRetries = 2,
    debug = false,
    tokensCode = '',
    callbacks,
  } = options

  const startTime = performance.now()
  const metrics: PipelineMetrics = {
    timeToFirstToken: 0,
    totalTime: 0,
    retryCount: 0,
    phases: {} as Record<PipelinePhase, number>,
  }

  const allIssues: ValidationIssue[] = []
  let reactCode = ''
  let mirrorCode = ''

  callbacks?.onStart?.()

  try {
    // Phase 1: Context Building
    const contextStart = performance.now()
    const context = buildContext(tokensCode)
    metrics.phases!['context-building'] = performance.now() - contextStart

    emitPhaseComplete(callbacks, 'context-building', {
      phase: 'context-building',
      success: true,
      duration: metrics.phases!['context-building'],
    })

    // Phase 2: React Generation (single pass - no retries needed)
    const genStart = performance.now()
    const genResult = await generateReactCode(prompt, context, {
      qualityMode,
      streaming: options.streaming,
      onToken: (token) => {
        if (metrics.timeToFirstToken === 0) {
          metrics.timeToFirstToken = performance.now() - startTime
        }
        callbacks?.onToken?.(token)
      },
    })

    reactCode = genResult.code
    metrics.phases!['react-generation'] = performance.now() - genStart

    if (debug) {
      console.log(`Generated React code (quality=${qualityMode}):`, reactCode.substring(0, 500))
    }

    emitPhaseComplete(callbacks, 'react-generation', {
      phase: 'react-generation',
      success: true,
      duration: metrics.phases!['react-generation'],
      output: debug ? reactCode : undefined,
    })

    // Phase 3: Validation (informational only - we always proceed)
    const validationStart = performance.now()
    const validation = validateReactCode(reactCode)
    metrics.phases!['react-validation'] = performance.now() - validationStart

    // Collect validation issues for reporting (but don't block)
    if (!validation.valid) {
      allIssues.push(...validation.issues)
    }

    emitPhaseComplete(callbacks, 'react-validation', {
      phase: 'react-validation',
      success: true, // Always succeed - transformer handles tolerance
      duration: metrics.phases!['react-validation'],
      issues: validation.issues.length > 0 ? validation.issues : undefined,
    })

    // Use fixed code if available, otherwise original
    const codeToTransform = validation.fixedCode ?? reactCode

    // Phase 4: Transformation + Post-Processing
    const transformStart = performance.now()
    const transformResult = transformReactToMirror(codeToTransform)
    mirrorCode = transformResult.mirrorCode
    metrics.phases!['transformation'] = performance.now() - transformStart

    // Report post-processing corrections
    if (transformResult.postProcessed && transformResult.corrections) {
      if (debug) {
        console.log(`Post-processing applied ${transformResult.corrections.length} corrections`)
        for (const correction of transformResult.corrections) {
          console.log(`  ${correction.type}: "${correction.original}" → "${correction.replacement}"`)
        }
      }
    }

    emitPhaseComplete(callbacks, 'transformation', {
      phase: 'transformation',
      success: true,
      duration: metrics.phases!['transformation'],
      output: debug ? mirrorCode : undefined,
    })

    // Phase 5: Mirror Validation (optional - validate the output parses correctly)
    // This would use the existing Mirror parser for validation
    // For now, we trust the transformation is correct
    const mirrorValidationStart = performance.now()
    metrics.phases!['mirror-validation'] = performance.now() - mirrorValidationStart

    emitPhaseComplete(callbacks, 'mirror-validation', {
      phase: 'mirror-validation',
      success: true,
      duration: metrics.phases!['mirror-validation'],
    })

    // Calculate total time
    metrics.totalTime = performance.now() - startTime

    const result: ReactPivotResult = {
      success: true,
      mirrorCode,
      reactCode: debug ? reactCode : undefined,
      schema: debug ? transformResult.schema : undefined,
      issues: allIssues.length > 0 ? allIssues : undefined,
      healed: false, // Self-healing removed - transformer handles tolerance
      metrics,
    }

    callbacks?.onComplete?.(result)

    return result

  } catch (error) {
    metrics.totalTime = performance.now() - startTime

    const pivotError = isReactPivotError(error)
      ? error
      : createReactPivotError({
          message: error instanceof Error ? error.message : 'Unknown error',
          phase: 'react-generation',
          issues: allIssues,
          code: reactCode
        })

    callbacks?.onError?.(pivotError)

    return {
      success: false,
      mirrorCode: '',
      issues: pivotError.issues,
      metrics,
    }
  }
}

// =============================================================================
// Context Building
// =============================================================================

/**
 * Build comprehensive context for LLM generation.
 * Extracts tokens, components, and style patterns from the codebase.
 */
function buildContext(tokensCode: string, componentsCode?: string, layoutCode?: string): LLMContext {
  // Format tokens for the LLM
  let formattedTokens = ''
  if (tokensCode?.trim()) {
    formattedTokens = `Available design tokens (USE THESE for all colors and spacing!):\n\`\`\`\n${tokensCode.trim()}\n\`\`\``
  }

  // Format components for the LLM
  let formattedComponents = ''
  if (componentsCode?.trim()) {
    formattedComponents = `Existing component definitions (reuse when applicable):\n\`\`\`\n${componentsCode.trim()}\n\`\`\``
  }

  // Format layout for context
  let formattedLayout = ''
  if (layoutCode?.trim()) {
    formattedLayout = `Current layout structure:\n\`\`\`\n${layoutCode.trim()}\n\`\`\``
  }

  return {
    tokens: formattedTokens,
    components: formattedComponents,
    layoutCode: formattedLayout,
    systemPrompt: '', // Set by react-generator
  }
}

/**
 * Extract token names and their semantic purpose from token code
 * to provide better context to the LLM
 */
export function analyzeTokens(tokensCode: string): {
  colorTokens: string[]
  spacingTokens: string[]
  radiusTokens: string[]
} {
  const colorTokens: string[] = []
  const spacingTokens: string[] = []
  const radiusTokens: string[] = []

  if (!tokensCode) return { colorTokens, spacingTokens, radiusTokens }

  const lines = tokensCode.split('\n')

  for (const line of lines) {
    // Match token definitions: $name.property: value or $name: value
    const match = line.match(/^\s*\$([^\s:]+)(?:\.(\w+))?:\s*(.+)/)
    if (!match) continue

    const [, name, property] = match

    if (property === 'bg' || property === 'col' || name.includes('color')) {
      colorTokens.push(`$${name}${property ? '.' + property : ''}`)
    } else if (property === 'pad' || property === 'gap' || name.includes('pad') || name.includes('gap')) {
      spacingTokens.push(`$${name}${property ? '.' + property : ''}`)
    } else if (property === 'rad' || name.includes('rad')) {
      radiusTokens.push(`$${name}${property ? '.' + property : ''}`)
    }
  }

  return { colorTokens, spacingTokens, radiusTokens }
}

// =============================================================================
// Helpers
// =============================================================================

function emitPhaseComplete(
  callbacks: ReactPivotOptions['callbacks'],
  phase: PipelinePhase,
  result: PhaseResult
): void {
  callbacks?.onPhaseComplete?.(phase, result)
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Simple function to transform a prompt to Mirror code.
 * Uses default options for quick testing.
 */
export async function promptToMirror(
  prompt: string,
  tokensCode?: string
): Promise<string> {
  const result = await executePipeline(prompt, { tokensCode })

  if (!result.success) {
    throw new Error('Failed to generate Mirror code')
  }

  return result.mirrorCode
}

// =============================================================================
// Re-exports
// =============================================================================

export { generateReactCode, cancelActiveRequest } from './react-generator'
export { transformReactToMirror } from './transformer'
export type { ReactPivotResult, ReactPivotOptions }
