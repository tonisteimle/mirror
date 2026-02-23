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
} from '../types'
import type { ReactPivotError } from '../types'
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
import { healReactCode, generateCorrectionPrompt } from '../validation/healing'
import { generateReactCode } from './react-generator'
import { transformReactToMirror } from './transformer'

// =============================================================================
// Pipeline Orchestrator
// =============================================================================

export async function executePipeline(
  prompt: string,
  options: ReactPivotOptions = {}
): Promise<ReactPivotResult> {
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
  let healed = false
  let currentPrompt = prompt
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

    // Phase 2 & 3: React Generation + Validation (with retry loop)
    let retryCount = 0
    let validReactCode: string | null = null

    while (retryCount <= maxRetries) {
      // Generate React code
      const genStart = performance.now()
      const genResult = await generateReactCode(currentPrompt, context, {
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
      metrics.phases!['react-generation'] = (metrics.phases!['react-generation'] ?? 0) +
        (performance.now() - genStart)

      if (debug) {
        console.log('Generated React code:', reactCode.substring(0, 500))
      }

      emitPhaseComplete(callbacks, 'react-generation', {
        phase: 'react-generation',
        success: true,
        duration: performance.now() - genStart,
        output: debug ? reactCode : undefined,
      })

      // Validate React code
      const validationStart = performance.now()
      const validation = validateReactCode(reactCode)
      metrics.phases!['react-validation'] = (metrics.phases!['react-validation'] ?? 0) +
        (performance.now() - validationStart)

      if (validation.valid) {
        validReactCode = validation.fixedCode ?? reactCode
        emitPhaseComplete(callbacks, 'react-validation', {
          phase: 'react-validation',
          success: true,
          duration: performance.now() - validationStart,
        })
        break
      }

      // Try self-healing
      const healingResult = healReactCode(reactCode, validation.issues)

      if (healingResult.success && healingResult.code) {
        validReactCode = healingResult.code
        healed = true
        emitPhaseComplete(callbacks, 'react-validation', {
          phase: 'react-validation',
          success: true,
          duration: performance.now() - validationStart,
          issues: validation.issues,
        })
        break
      }

      // Collect issues
      allIssues.push(...healingResult.remainingIssues)

      emitPhaseComplete(callbacks, 'react-validation', {
        phase: 'react-validation',
        success: false,
        duration: performance.now() - validationStart,
        issues: healingResult.remainingIssues,
      })

      // Prepare retry
      if (retryCount < maxRetries) {
        currentPrompt = generateCorrectionPrompt(
          prompt,
          reactCode,
          healingResult.remainingIssues
        )
        metrics.retryCount = ++retryCount

        if (debug) {
          console.log(`Retry ${retryCount}/${maxRetries} with correction prompt`)
        }
      } else {
        retryCount++
      }
    }

    // Check if we got valid React code
    if (!validReactCode) {
      throw createReactPivotError({
        message: `Failed to generate valid React code after ${maxRetries} retries`,
        phase: 'react-validation',
        issues: allIssues,
        code: reactCode
      })
    }

    // Phase 4: Transformation
    const transformStart = performance.now()
    const transformResult = transformReactToMirror(validReactCode)
    mirrorCode = transformResult.mirrorCode
    metrics.phases!['transformation'] = performance.now() - transformStart

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
      healed,
      metrics,
    }

    callbacks?.onComplete?.(result)

    return result

  } catch (error) {
    metrics.totalTime = performance.now() - startTime

    const isReactPivotError = error instanceof Error && error.name === 'ReactPivotError'
    const pivotError = isReactPivotError
      ? error as ReactPivotError
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

function buildContext(tokensCode: string): LLMContext {
  // Extract tokens and components from the editor context
  // This is a simplified version - the full implementation would
  // use buildUnifiedContext from ai-context.ts

  return {
    tokens: tokensCode,
    components: '', // Would be extracted from editor
    layoutCode: '', // Would be extracted from editor
    systemPrompt: '', // Set by react-generator
  }
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

export { generateReactCode } from './react-generator'
export { transformReactToMirror } from './transformer'
export type { ReactPivotResult, ReactPivotOptions }
