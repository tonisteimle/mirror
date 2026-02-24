/**
 * Self-Healing Pipeline
 *
 * Orchestrates the self-healing process.
 * Part of Self-Healing System (Increment 21).
 */

import { unifiedValidate } from '../../validation'
import type { Diagnostic } from '../../validation/core'
import { classifyError, classifyErrors, hasCriticalErrors, sortByHealingPriority } from './error-classifier'
import type { ErrorClassification } from './error-classifier'
import { generateFixes, applyFixes, getSafeFixes, isSafeFix } from './fix-generator'
import type { GeneratedFix } from './fix-generator'

// Legacy type alias for backwards compatibility with fix-generator
type ValidationError = {
  type: 'syntax' | 'semantic' | 'token' | 'layout'
  severity: 'error' | 'warning' | 'info'
  message: string
  line: number
  column?: number
  code?: string
}

/**
 * Helper to validate code and get errors in legacy format
 */
function validateAndGetErrors(code: string): { errors: ValidationError[], valid: boolean } {
  const result = unifiedValidate(code, { mode: 'live' })

  const errors: ValidationError[] = result.diagnostics
    .filter(d => d.severity === 'error')
    .map(d => ({
      type: mapCategoryToLegacyType(d.category),
      severity: d.severity as 'error' | 'warning' | 'info',
      message: d.message,
      line: d.location.line,
      column: d.location.column,
      code: d.code
    }))

  return { errors, valid: result.valid }
}

/**
 * Maps unified DiagnosticCategory to legacy type
 */
function mapCategoryToLegacyType(category: string): 'syntax' | 'semantic' | 'token' | 'layout' {
  switch (category) {
    case 'lexer':
    case 'parser':
      return 'syntax'
    case 'semantic':
    case 'type':
    case 'reference':
      return 'semantic'
    case 'property':
    case 'event':
    case 'action':
    case 'animation':
    case 'state':
    case 'library':
      return 'layout'
    default:
      return 'syntax'
  }
}

/**
 * Healing result
 */
export interface HealingResult {
  success: boolean
  originalCode: string
  healedCode: string
  appliedFixes: AppliedHealingFix[]
  remainingErrors: ValidationError[]
  iterations: number
  strategy: HealingStrategy
  metrics: HealingMetrics
}

/**
 * Applied healing fix
 */
export interface AppliedHealingFix {
  fix: GeneratedFix
  wasAutoApplied: boolean
  iteration: number
  /** Whether this fix actually reduced errors */
  wasEffective?: boolean
  /** Error count before this fix */
  errorsBefore?: number
  /** Error count after this fix */
  errorsAfter?: number
}

/**
 * Healing strategy
 */
export type HealingStrategy =
  | 'auto'           // Apply all safe fixes automatically
  | 'conservative'   // Only fix critical errors
  | 'aggressive'     // Try to fix everything
  | 'interactive'    // Require confirmation for each fix

/**
 * Healing metrics
 */
export interface HealingMetrics {
  originalErrorCount: number
  fixedErrorCount: number
  remainingErrorCount: number
  totalFixes: number
  autoFixes: number
  assistedFixes: number
  healingRate: number  // 0-1
  processingTime: number
  /** Number of fixes that were effective */
  effectiveFixes?: number
  /** Number of fixes that were reverted */
  revertedFixes?: number
}

/**
 * Pipeline options
 */
export interface PipelineOptions {
  strategy?: HealingStrategy
  maxIterations?: number
  maxFixes?: number
  stopOnCritical?: boolean
  timeout?: number
  /** Enable validation feedback loop - validates after each fix and reverts ineffective ones */
  validationFeedback?: boolean
}

const DEFAULT_OPTIONS: Required<PipelineOptions> = {
  strategy: 'auto',
  maxIterations: 10,
  maxFixes: 100,
  stopOnCritical: true,
  timeout: 5000,
  validationFeedback: true  // Enable by default for quality
}

/**
 * Result of applying a single fix with validation feedback
 */
interface SingleFixResult {
  code: string
  wasEffective: boolean
  errorsBefore: number
  errorsAfter: number
  fix: GeneratedFix
}

/**
 * Applies a single fix and validates the result.
 * Returns null if the fix made things worse (should be reverted).
 */
function applyFixWithValidation(
  code: string,
  fix: GeneratedFix,
  currentErrorCount: number
): SingleFixResult {
  // Apply the single fix
  const fixedCode = applyFixes(code, [fix])

  // Validate result
  const report = validateAndGetErrors(fixedCode)
  const newErrorCount = report.errors.length

  // Determine effectiveness:
  // - Strictly effective: reduces error count
  // - Neutral: same error count (might still be useful for semantic correctness)
  // - Harmful: increases error count
  const wasEffective = newErrorCount <= currentErrorCount

  return {
    code: wasEffective ? fixedCode : code,  // Revert if harmful
    wasEffective,
    errorsBefore: currentErrorCount,
    errorsAfter: wasEffective ? newErrorCount : currentErrorCount,
    fix
  }
}

/**
 * Applies fixes one by one with validation feedback.
 * Only keeps fixes that don't increase error count.
 */
function applyFixesWithFeedback(
  code: string,
  fixes: GeneratedFix[],
  iteration: number
): {
  code: string
  appliedFixes: AppliedHealingFix[]
  effectiveCount: number
  revertedCount: number
} {
  let currentCode = code
  const appliedFixes: AppliedHealingFix[] = []
  let effectiveCount = 0
  let revertedCount = 0

  // Get initial error count
  let currentErrorCount = validateAndGetErrors(currentCode).errors.length

  for (const fix of fixes) {
    const result = applyFixWithValidation(currentCode, fix, currentErrorCount)

    if (result.wasEffective) {
      // Keep the fix
      currentCode = result.code
      currentErrorCount = result.errorsAfter
      effectiveCount++

      appliedFixes.push({
        fix,
        wasAutoApplied: isSafeFix(fix),
        iteration,
        wasEffective: true,
        errorsBefore: result.errorsBefore,
        errorsAfter: result.errorsAfter
      })
    } else {
      // Fix made things worse - don't apply it
      revertedCount++

      // Still track it for debugging, but mark as ineffective
      appliedFixes.push({
        fix,
        wasAutoApplied: isSafeFix(fix),
        iteration,
        wasEffective: false,
        errorsBefore: result.errorsBefore,
        errorsAfter: result.errorsBefore  // Code unchanged
      })
    }
  }

  return {
    code: currentCode,
    appliedFixes,
    effectiveCount,
    revertedCount
  }
}

/**
 * Runs the self-healing pipeline
 */
export function heal(code: string, options?: PipelineOptions): HealingResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const startTime = Date.now()

  const originalReport = validateAndGetErrors(code)
  const originalErrorCount = originalReport.errors.length

  const appliedFixes: AppliedHealingFix[] = []
  let currentCode = code
  let iterations = 0
  let totalFixes = 0
  let totalEffective = 0
  let totalReverted = 0

  // Main healing loop
  while (iterations < opts.maxIterations && totalFixes < opts.maxFixes) {
    // Check timeout
    if (Date.now() - startTime > opts.timeout) {
      break
    }

    // Validate current state
    const report = validateAndGetErrors(currentCode)

    // Check if done
    if (report.errors.length === 0) {
      break
    }

    // Check for critical errors in conservative mode
    if (opts.strategy === 'conservative' && !hasCriticalErrors(currentCode)) {
      break
    }

    // Generate fixes based on strategy
    const fixes = getFixesForStrategy(currentCode, opts.strategy)

    if (fixes.length === 0) {
      break
    }

    // Apply fixes
    const fixesToApply = selectFixesToApply(fixes, opts.strategy)

    if (fixesToApply.length === 0) {
      break
    }

    const previousCode = currentCode

    if (opts.validationFeedback) {
      // NEW: Apply fixes one by one with validation feedback
      const feedbackResult = applyFixesWithFeedback(
        currentCode,
        fixesToApply,
        iterations + 1
      )

      currentCode = feedbackResult.code
      appliedFixes.push(...feedbackResult.appliedFixes)
      totalFixes += feedbackResult.appliedFixes.length
      totalEffective += feedbackResult.effectiveCount
      totalReverted += feedbackResult.revertedCount

      // If all fixes were reverted, we're stuck - break to avoid infinite loop
      if (feedbackResult.effectiveCount === 0) {
        break
      }
    } else {
      // Legacy behavior: apply all fixes at once without validation
      currentCode = applyFixes(currentCode, fixesToApply)

      // Track applied fixes
      for (const fix of fixesToApply) {
        appliedFixes.push({
          fix,
          wasAutoApplied: isSafeFix(fix),
          iteration: iterations + 1
        })
        totalFixes++
      }
    }

    // Check if code changed
    if (currentCode === previousCode) {
      break
    }

    iterations++
  }

  // Final validation
  const finalReport = validateAndGetErrors(currentCode)

  // Calculate metrics with feedback info
  const metrics = calculateMetrics(
    originalErrorCount,
    appliedFixes,
    finalReport.errors.length,
    Date.now() - startTime
  )

  // Add feedback metrics if enabled
  if (opts.validationFeedback) {
    metrics.effectiveFixes = totalEffective
    metrics.revertedFixes = totalReverted
  }

  return {
    success: finalReport.errors.length === 0,
    originalCode: code,
    healedCode: currentCode,
    appliedFixes,
    remainingErrors: finalReport.errors,
    iterations,
    strategy: opts.strategy,
    metrics
  }
}

/**
 * Gets fixes based on healing strategy
 */
function getFixesForStrategy(code: string, strategy: HealingStrategy): GeneratedFix[] {
  switch (strategy) {
    case 'auto':
      return getSafeFixes(code)

    case 'conservative':
      // Only fixes for critical errors
      return generateFixes(code, { minConfidence: 0.7 }).filter(f =>
        f.classification.severity === 'critical'
      )

    case 'aggressive':
      return generateFixes(code, { includeManual: true, safeOnly: false })

    case 'interactive':
      return generateFixes(code)

    default:
      return getSafeFixes(code)
  }
}

/**
 * Selects which fixes to apply based on strategy
 */
function selectFixesToApply(fixes: GeneratedFix[], strategy: HealingStrategy): GeneratedFix[] {
  switch (strategy) {
    case 'auto':
      // Only safe fixes
      return fixes.filter(f => isSafeFix(f))

    case 'conservative':
      // Only highest confidence fix
      return fixes.slice(0, 1)

    case 'aggressive':
      // All available fixes
      return fixes

    case 'interactive':
      // In real implementation, would wait for user confirmation
      // For now, return safe fixes
      return fixes.filter(f => isSafeFix(f))

    default:
      return fixes.filter(f => isSafeFix(f))
  }
}

/**
 * Calculates healing metrics
 */
function calculateMetrics(
  originalErrorCount: number,
  appliedFixes: AppliedHealingFix[],
  remainingErrorCount: number,
  processingTime: number
): HealingMetrics {
  const fixedErrorCount = originalErrorCount - remainingErrorCount
  const autoFixes = appliedFixes.filter(f => f.wasAutoApplied).length
  const assistedFixes = appliedFixes.length - autoFixes

  return {
    originalErrorCount,
    fixedErrorCount,
    remainingErrorCount,
    totalFixes: appliedFixes.length,
    autoFixes,
    assistedFixes,
    healingRate: originalErrorCount > 0 ? fixedErrorCount / originalErrorCount : 1,
    processingTime
  }
}

/**
 * Quick heal - applies only safe, high-confidence fixes
 */
export function quickHeal(code: string): HealingResult {
  return heal(code, {
    strategy: 'auto',
    maxIterations: 3,
    maxFixes: 10
  })
}

/**
 * Full heal - tries to fix everything
 */
export function fullHeal(code: string): HealingResult {
  return heal(code, {
    strategy: 'aggressive',
    maxIterations: 10,
    maxFixes: 100
  })
}

/**
 * Heal with validation feedback - highest quality healing
 * Validates after each fix and reverts ineffective ones.
 */
export function feedbackHeal(code: string): HealingResult {
  return heal(code, {
    strategy: 'aggressive',
    maxIterations: 10,
    maxFixes: 100,
    validationFeedback: true
  })
}

/**
 * Checks if code can be healed
 */
export function canHeal(code: string): boolean {
  const fixes = generateFixes(code)
  return fixes.length > 0
}

/**
 * Gets healing preview without applying
 */
export function previewHealing(code: string, strategy?: HealingStrategy): {
  fixes: GeneratedFix[]
  previewCode: string
  estimatedHealingRate: number
} {
  const fixes = getFixesForStrategy(code, strategy || 'auto')
  const selectedFixes = selectFixesToApply(fixes, strategy || 'auto')
  const previewCode = applyFixes(code, selectedFixes)

  const originalReport = validateAndGetErrors(code)
  const previewReport = validateAndGetErrors(previewCode)

  const estimatedHealingRate = originalReport.errors.length > 0
    ? 1 - (previewReport.errors.length / originalReport.errors.length)
    : 1

  return {
    fixes: selectedFixes,
    previewCode,
    estimatedHealingRate
  }
}

/**
 * Heals a specific line
 */
export function healLine(code: string, lineNumber: number): HealingResult {
  const report = validateAndGetErrors(code)
  const lineErrors = report.errors.filter(e => e.line === lineNumber)

  if (lineErrors.length === 0) {
    return {
      success: true,
      originalCode: code,
      healedCode: code,
      appliedFixes: [],
      remainingErrors: [],
      iterations: 0,
      strategy: 'auto',
      metrics: {
        originalErrorCount: 0,
        fixedErrorCount: 0,
        remainingErrorCount: 0,
        totalFixes: 0,
        autoFixes: 0,
        assistedFixes: 0,
        healingRate: 1,
        processingTime: 0
      }
    }
  }

  // Generate fixes only for this line
  const startTime = Date.now()
  const fixes: GeneratedFix[] = []

  for (const error of lineErrors) {
    const classification = classifyError(error, code)
    const fix = generateFixes(code).find(f => f.error.line === lineNumber)
    if (fix) {
      fixes.push(fix)
    }
  }

  const safeFixes = fixes.filter(f => isSafeFix(f))
  const healedCode = applyFixes(code, safeFixes)

  const finalReport = validateAndGetErrors(healedCode)
  const finalLineErrors = finalReport.errors.filter(e => e.line === lineNumber)

  return {
    success: finalLineErrors.length === 0,
    originalCode: code,
    healedCode,
    appliedFixes: safeFixes.map(f => ({
      fix: f,
      wasAutoApplied: true,
      iteration: 1
    })),
    remainingErrors: finalLineErrors,
    iterations: 1,
    strategy: 'auto',
    metrics: {
      originalErrorCount: lineErrors.length,
      fixedErrorCount: lineErrors.length - finalLineErrors.length,
      remainingErrorCount: finalLineErrors.length,
      totalFixes: safeFixes.length,
      autoFixes: safeFixes.length,
      assistedFixes: 0,
      healingRate: lineErrors.length > 0
        ? (lineErrors.length - finalLineErrors.length) / lineErrors.length
        : 1,
      processingTime: Date.now() - startTime
    }
  }
}

/**
 * Gets healing suggestions without applying
 */
export function getHealingSuggestions(code: string): Array<{
  error: ValidationError
  suggestion: string
  confidence: number
}> {
  const fixes = generateFixes(code)

  return fixes.map(fix => ({
    error: fix.error,
    suggestion: fix.fix.description,
    confidence: fix.confidence
  }))
}

/**
 * Validates healing result
 */
export function validateHealingResult(result: HealingResult): boolean {
  const report = validateAndGetErrors(result.healedCode)
  return report.errors.length === result.remainingErrors.length
}
