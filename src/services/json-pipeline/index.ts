/**
 * JSON-based 4-Stage Generation Pipeline with Self-Review
 *
 * Transforms natural language prompts into Mirror DSL code through:
 *
 * Stage 0: Analysis (deterministic) - Extract tokens, components, context
 * Stage 1: Structure (LLM) - Generate component hierarchy
 * Stage 2: Properties (LLM) - Add styling, states, events
 * Stage 3: Constraints (deterministic) - Apply fixes, convert to Mirror
 * Stage 4: Review (LLM) - Self-review, validate, improve or regenerate
 *
 * Benefits:
 * - Structured JSON is validatable at each stage
 * - Deterministic final conversion = no syntax errors
 * - Token/property validation catches LLM mistakes
 * - Self-review loop: LLM validates and improves its own output
 * - Critical errors trigger full regeneration with feedback
 */

import type {
  PipelineResult,
  PipelineOptions,
  AnalysisContext,
  StructureJSON,
  PropertiesJSON,
} from './types'

import { analyzeContext } from './stage-0-analysis'
import { generateStructure } from './stage-1-structure'
import { generateProperties, generateCombined } from './stage-2-properties'
import { applyConstraints } from './stage-3-constraints'
import { jsonToMirror } from './json-to-mirror'
import { validateAndCorrect } from './correction-loop'
import { runReviewLoop, quickValidate } from './review-loop'
import { dispatch, getRouteConfig, type PipelineRoute } from './dispatcher'
import { runComplexPipeline } from './complex-pipeline'
import { validateMirrorCode } from '../../lib/self-healing'
import { normalizeTokenSuffixes } from '../nl-translation'
import { tryExpertPipeline } from '../generation/experts'

// =============================================================================
// Main Pipeline Entry Point
// =============================================================================

/**
 * Translate natural language to Mirror DSL using the JSON pipeline.
 *
 * @param prompt - Natural language description
 * @param tokensCode - Token definitions code
 * @param componentsCode - Component definitions code
 * @param layoutCode - Current layout code
 * @param cursorLine - Cursor position (0-indexed)
 * @param options - Pipeline options
 * @returns Pipeline result with Mirror DSL code
 */
export async function translateWithJsonPipeline(
  prompt: string,
  tokensCode: string,
  componentsCode: string,
  layoutCode: string,
  cursorLine: number,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const startTime = performance.now()
  let firstTokenTime: number | null = null

  const debug: NonNullable<PipelineResult['debug']> = {
    stageDurations: {},
  }

  try {
    // =========================================================================
    // Expert Check: Try schema-based experts first
    // =========================================================================
    if (!options.skipExpertCheck) {
      const expertResult = await tryExpertPipeline(prompt, {
        minConfidence: 'medium',
        debug: options.debug,
      })

      if (expertResult && expertResult.isValid) {
        const totalTime = performance.now() - startTime

        if (options.debug) {
          console.debug(`[Expert] ${expertResult.expert} generated code in ${expertResult.timeMs.toFixed(0)}ms`)
        }

        options.callbacks?.onStageComplete?.('complete', totalTime)

        return {
          code: expertResult.code,
          isValid: true,
          timeToFirstToken: expertResult.timeMs / 2,
          totalTime,
          debug: options.debug ? {
            stageDurations: { expert: expertResult.timeMs },
            expertUsed: expertResult.expert,
            expertSchema: expertResult.schemaUsed,
          } : undefined,
        }
      }
    }

    // =========================================================================
    // Dispatcher: LLM entscheidet welcher Ablauf passt
    // =========================================================================
    options.callbacks?.onStageStart?.(0, 'Analysiere...')
    const dispatchStart = performance.now()
    const hasExistingCode = layoutCode.trim().length > 0
    const dispatchResult = await dispatch(prompt, hasExistingCode)
    const routeConfig = getRouteConfig(dispatchResult.route)
    debug.stageDurations!.dispatch = performance.now() - dispatchStart

    if (options.debug) {
      console.debug(`[Dispatcher] Route: ${dispatchResult.route} (${dispatchResult.confidence})`)
      console.debug(`[Dispatcher] Reasoning: ${dispatchResult.reasoning}`)
      console.debug(`[Dispatcher] Complexity: ${dispatchResult.estimatedComplexity}/10`)
    }

    // =========================================================================
    // Stage 0: Analysis (Deterministic + Prompt-Aware)
    // =========================================================================
    const stage0Start = performance.now()
    const context = analyzeContext(prompt, tokensCode, componentsCode, layoutCode, cursorLine)
    debug.stageDurations!.stage0 = performance.now() - stage0Start

    if (options.debug) {
      console.debug('[Stage 0] Prompt Analysis:', context.promptAnalysis)
      console.debug('[Stage 0] Filtered tokens:', context.tokens.length)
      console.debug('[Stage 0] Filtered components:', context.components.length)
    }

    if (options.debug) {
      debug.analysisContext = context
    }

    // =========================================================================
    // Strategy Selection: Based on Dispatcher Route
    // =========================================================================

    // For 'full' route (complex dashboards), use the Complex Pipeline
    if (dispatchResult.route === 'full') {
      options.callbacks?.onStageStart?.(1, 'Analysiere Aufbau...')
      const complexStart = performance.now()

      const complexResult = await runComplexPipeline(prompt, context, {
        debug: options.debug,
      })

      debug.stageDurations!.complexPipeline = performance.now() - complexStart

      if (options.debug) {
        console.debug('[Complex Pipeline] Decomposition:', complexResult.decomposition.components.join(', '))
        console.debug('[Complex Pipeline] Lines:', complexResult.code.split('\n').length)
      }

      // The complex pipeline already produces Mirror DSL code directly
      let mirrorCode = complexResult.code
      mirrorCode = normalizeTokenSuffixes(mirrorCode)

      // Validate the result
      const finalValidation = validateMirrorCode(mirrorCode, false, 'de')

      const totalTime = performance.now() - startTime

      options.callbacks?.onStageComplete?.('complete', totalTime)

      return {
        code: mirrorCode,
        isValid: finalValidation.valid,
        validationIssues: finalValidation.issues.length > 0 ? finalValidation.issues : undefined,
        timeToFirstToken: complexResult.totalTime / 3, // Approximate first token time
        totalTime,
        debug: options.debug ? {
          ...debug,
          decomposition: complexResult.decomposition,
          generatedComponents: complexResult.components,
        } : undefined,
      }
    }

    const usesCombined = routeConfig.useCombinedGeneration

    let propertiesJSON: PropertiesJSON

    if (usesCombined) {
      // =====================================================================
      // Combined: Structure + Properties in one call
      // =====================================================================
      options.callbacks?.onStageStart?.(1, 'Generiere...')
      const stage1Start = performance.now()
      const result = await generateCombined(prompt, context, {
        onToken: options.callbacks?.onToken,
        onFirstToken: (latency) => {
          firstTokenTime = latency
          options.callbacks?.onFirstToken?.(latency)
        },
      })

      debug.stageDurations!.stage1 = performance.now() - stage1Start

      if (result.errors.length > 0 && !options.skipValidation) {
        // Try correction
        const corrected = await validateAndCorrect(result.json, context, {
          maxAttempts: options.maxCorrectionAttempts ?? 2,
        })
        propertiesJSON = corrected.json
        debug.stageDurations!.correction = corrected.durationMs
      } else {
        propertiesJSON = result.json
      }
    } else {
      // =====================================================================
      // Two-Stage: Separate Structure and Properties
      // =====================================================================

      // Stage 1: Structure
      options.callbacks?.onStageStart?.(1, 'Struktur...')
      const stage1Start = performance.now()
      const structureResult = await generateStructure(prompt, context, {
        onToken: options.callbacks?.onToken,
        onFirstToken: (latency) => {
          firstTokenTime = latency
          options.callbacks?.onFirstToken?.(latency)
        },
      })
      debug.stageDurations!.stage1 = performance.now() - stage1Start

      if (options.debug) {
        debug.structureJSON = structureResult.json
      }

      // Stage 2: Properties
      options.callbacks?.onStageStart?.(2, 'Styling...')
      const stage2Start = performance.now()
      const propertiesResult = await generateProperties(structureResult.json, context, {
        onToken: options.callbacks?.onToken,
      })
      debug.stageDurations!.stage2 = performance.now() - stage2Start

      if (propertiesResult.errors.length > 0 && !options.skipValidation) {
        const corrected = await validateAndCorrect(propertiesResult.json, context, {
          maxAttempts: options.maxCorrectionAttempts ?? 2,
        })
        propertiesJSON = corrected.json
        debug.stageDurations!.correction = corrected.durationMs
      } else {
        propertiesJSON = propertiesResult.json
      }
    }

    if (options.debug) {
      debug.propertiesJSON = propertiesJSON
    }

    // =========================================================================
    // Stage 3: Constraints (Deterministic)
    // =========================================================================
    options.callbacks?.onStageStart?.(3, 'Validiere...')
    const stage3Start = performance.now()
    let constrainedJSON = applyConstraints(propertiesJSON)
    debug.stageDurations!.stage3 = performance.now() - stage3Start

    if (options.debug) {
      debug.constrainedJSON = constrainedJSON
    }

    // Preserve original indentation from cursor context
    const originalIndent = context.cursorContext && context.cursorContext.indent > 0
      ? '  '.repeat(Math.floor(context.cursorContext.indent / 2))
      : ''

    // =========================================================================
    // Stage 4: Self-Review Loop (LLM validates and improves its output)
    // =========================================================================
    // Quick validation first - skip review if already valid
    const quickCheck = quickValidate(constrainedJSON, context)

    let mirrorCode: string
    let isValid: boolean
    let remainingIssues: string[] = []

    // Determine if we should skip review based on route config
    const shouldSkipReview = routeConfig.skipReview || options.skipReview

    if (quickCheck.isValid || options.skipValidation) {
      // Already valid, just convert
      mirrorCode = jsonToMirror(constrainedJSON)
      mirrorCode = normalizeTokenSuffixes(mirrorCode)
      isValid = true
    } else if (shouldSkipReview) {
      // Skip review (quick route or explicit skip)
      options.callbacks?.onStageStart?.(4, 'Fertigstellen...')
      mirrorCode = jsonToMirror(constrainedJSON)
      mirrorCode = normalizeTokenSuffixes(mirrorCode)
      const validation = validateMirrorCode(mirrorCode, false, 'de')
      isValid = validation.valid
      remainingIssues = validation.issues.map(i => i.message)

      if (options.debug) {
        console.debug(`[Stage 4] Skipped (route: ${dispatchResult.route})`)
      }
    } else {
      // Run the self-review loop with route-specific config
      options.callbacks?.onStageStart?.(4, 'Prüfe...')
      const reviewStart = performance.now()

      if (options.debug) {
        console.debug(`[Stage 4] Starting self-review loop (${quickCheck.errorCount} errors, severity: ${quickCheck.severity})`)
        console.debug(`[Stage 4] Config: maxIterations=${routeConfig.maxReviewIterations}, maxRegenerations=${routeConfig.maxRegenerations}`)
      }

      // Create regeneration callback for critical errors
      const regenerateCallback = async (originalPrompt: string, feedback: string): Promise<PropertiesJSON> => {
        if (options.debug) {
          console.debug('[Stage 4] Full regeneration triggered')
        }

        // Build enhanced prompt with feedback
        const enhancedPrompt = `${originalPrompt}\n\n[VORHERIGER VERSUCH HATTE FEHLER]\n${feedback}`

        // Regenerate from Stage 1
        const structureResult = await generateStructure(enhancedPrompt, context, {})
        const propertiesResult = await generateProperties(structureResult.json, context, {})

        // Apply constraints
        return applyConstraints(propertiesResult.json)
      }

      const reviewResult = await runReviewLoop(
        constrainedJSON,
        context,
        prompt,
        regenerateCallback,
        {
          maxIterations: routeConfig.maxReviewIterations,
          maxRegenerations: routeConfig.maxRegenerations,
          debug: options.debug,
        }
      )

      debug.stageDurations!.review = performance.now() - reviewStart

      // Use the reviewed result
      constrainedJSON = reviewResult.json
      mirrorCode = reviewResult.mirrorCode
      mirrorCode = normalizeTokenSuffixes(mirrorCode)
      isValid = reviewResult.isValid
      remainingIssues = reviewResult.remainingIssues

      if (options.debug) {
        console.debug(`[Stage 4] Review complete: ${reviewResult.iterations} iterations, regenerated: ${reviewResult.wasRegenerated}`)
      }
    }

    // Apply indentation
    if (originalIndent) {
      mirrorCode = mirrorCode
        .split('\n')
        .map((line, i) => (i === 0 ? originalIndent + line : line))
        .join('\n')
    }

    // Final validation
    const finalValidation = validateMirrorCode(mirrorCode, false, 'de')

    const totalTime = performance.now() - startTime

    options.callbacks?.onStageComplete?.('complete', totalTime)

    return {
      code: mirrorCode,
      isValid: finalValidation.valid,
      validationIssues: finalValidation.issues.length > 0 ? finalValidation.issues : undefined,
      timeToFirstToken: firstTokenTime ?? totalTime,
      totalTime,
      debug: options.debug ? debug : undefined,
    }
  } catch (error) {
    const totalTime = performance.now() - startTime
    return {
      code: '',
      isValid: false,
      error: error instanceof Error ? error.message : String(error),
      timeToFirstToken: firstTokenTime ?? totalTime,
      totalTime,
      debug: options.debug ? debug : undefined,
    }
  }
}


// =============================================================================
// Exports
// =============================================================================

// Re-export types
export type {
  PipelineResult,
  PipelineOptions,
  AnalysisContext,
  StructureJSON,
  PropertiesJSON,
} from './types'

// Re-export individual stages for testing
export { analyzeContext } from './stage-0-analysis'
export { generateStructure, generateStructureQuick } from './stage-1-structure'
export { generateProperties, generatePropertiesQuick, generateCombined } from './stage-2-properties'
export { applyConstraints } from './stage-3-constraints'
export { jsonToMirror, componentToCompact, canBeCompact } from './json-to-mirror'
export { validateStructureJSON, validatePropertiesJSON, autoFixJSON } from './json-validator'
export { correctJSON, autoCorrectJSON, validateAndCorrect } from './correction-loop'
export { runReviewLoop, quickValidate } from './review-loop'
export { dispatch, getRouteConfig, type PipelineRoute } from './dispatcher'
export { runComplexPipeline, type ComplexPipelineResult, type DecompositionResult } from './complex-pipeline'
