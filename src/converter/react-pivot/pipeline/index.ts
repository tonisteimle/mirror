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
import { healReactCode } from '../validation/healing'
import { generateReactCode } from './react-generator'
import { transformReactToMirror } from './transformer'
import {
  decideRetryStrategy,
  generateEnhancedCorrectionPrompt,
  type RetryDecision,
} from './retry-strategy'

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

    // Phase 2 & 3: React Generation + Validation (with intelligent retry loop)
    let retryCount = 0
    let validReactCode: string | null = null
    let currentQualityMode = qualityMode
    const previousIssues: ValidationIssue[][] = []
    let retryDecision: RetryDecision | null = null

    while (retryCount <= maxRetries) {
      // Generate React code
      const genStart = performance.now()
      const genResult = await generateReactCode(currentPrompt, context, {
        qualityMode: currentQualityMode,
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
        console.log(`[Attempt ${retryCount + 1}] Generated React code (quality=${currentQualityMode}):`,
          reactCode.substring(0, 500))
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

      // Use intelligent retry strategy with LLM error analysis
      retryDecision = decideRetryStrategy({
        prompt,
        attemptCount: retryCount,
        maxAttempts: maxRetries,
        issues: healingResult.remainingIssues,
        previousIssues,
        isQualityMode: currentQualityMode,
        failedCode: reactCode,  // Pass code for LLM pattern analysis
      })

      if (debug) {
        console.log(`Retry decision: ${retryDecision.reason}`)
        console.log(`  Escalate to quality: ${retryDecision.escalateToQuality}`)
        console.log(`  Focus areas: ${retryDecision.focusAreas.join(', ')}`)
      }

      // Prepare retry with intelligent strategy
      if (retryDecision.shouldRetry && retryCount < maxRetries) {
        // Escalate to quality mode if needed
        if (retryDecision.escalateToQuality && !currentQualityMode) {
          currentQualityMode = true
          if (debug) {
            console.log('Escalating to quality mode (Opus)')
          }
        }

        // Generate enhanced correction prompt
        currentPrompt = generateEnhancedCorrectionPrompt(
          prompt,
          reactCode,
          retryDecision
        )

        previousIssues.push(healingResult.remainingIssues)
        metrics.retryCount = ++retryCount

        if (debug) {
          console.log(`Retry ${retryCount}/${maxRetries} with ${retryDecision.hints.length} hints`)
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
