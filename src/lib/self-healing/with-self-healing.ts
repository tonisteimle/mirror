/**
 * Self-Healing Wrapper
 *
 * Wraps LLM generation with automatic validation and retry loop.
 */

import { validateMirrorCode } from './validator'
import { applyAllFixes } from './fix-pipeline'
import type {
  SelfHealingOptions,
  SelfHealingResult,
  ValidationFeedback,
} from './types'

/**
 * Wrapper for LLM generation with automatic self-healing.
 *
 * @param generateFn - The LLM generation function
 * @param prompt - User prompt
 * @param options - Self-healing options
 * @returns Validated (and potentially corrected) code
 *
 * @example
 * ```typescript
 * import { generateMirrorCode } from './ai'
 * import { withSelfHealing } from './self-healing'
 *
 * const result = await withSelfHealing(
 *   generateMirrorCode,
 *   "Create a login form",
 *   { maxAttempts: 2 }
 * )
 *
 * if (result.valid) {
 *   console.log("Valid code generated:", result.code)
 * } else {
 *   console.log("Could not generate valid code after", result.attempts, "attempts")
 *   console.log("Issues:", result.issues)
 * }
 * ```
 */
export async function withSelfHealing(
  generateFn: (prompt: string) => Promise<{ code: string }>,
  prompt: string,
  options: SelfHealingOptions = {}
): Promise<SelfHealingResult> {
  const {
    maxAttempts = 2,
    includeWarnings = false,
    correctionPrefix = '',
    language = 'de'
  } = options

  let currentCode = ''
  let attempts = 0
  let lastFeedback: ValidationFeedback = { valid: false, issues: [] }

  // Initial generation
  try {
    const result = await generateFn(prompt)
    currentCode = result.code
    attempts = 1

    // Algorithmic fixes (deterministic, before validation)
    currentCode = applyAllFixes(currentCode)

    // Validate
    lastFeedback = validateMirrorCode(currentCode, includeWarnings, language)

    // If valid, return immediately
    if (lastFeedback.valid) {
      return {
        code: currentCode,
        valid: true,
        attempts,
        issues: lastFeedback.issues
      }
    }

    // Self-healing loop
    while (!lastFeedback.valid && attempts < maxAttempts) {
      const correctionPrompt = correctionPrefix
        ? `${correctionPrefix}\n\n${lastFeedback.correctionPrompt}`
        : lastFeedback.correctionPrompt!

      const correctionResult = await generateFn(correctionPrompt)
      currentCode = correctionResult.code
      attempts++

      // Apply all algorithmic fixes to correction as well
      currentCode = applyAllFixes(currentCode)

      lastFeedback = validateMirrorCode(currentCode, includeWarnings, language)

      if (lastFeedback.valid) {
        return {
          code: currentCode,
          valid: true,
          attempts,
          issues: lastFeedback.issues
        }
      }
    }
  } catch (error) {
    // Generation failed
    return {
      code: currentCode,
      valid: false,
      attempts,
      issues: [{
        type: 'parse_error',
        line: 0,
        message: error instanceof Error ? error.message : String(error)
      }]
    }
  }

  // Return last attempt even if not valid
  return {
    code: currentCode,
    valid: false,
    attempts,
    issues: lastFeedback.issues
  }
}
