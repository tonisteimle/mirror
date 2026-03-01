/**
 * Correction Loop for JSON Pipeline
 *
 * Handles error correction when JSON validation fails.
 * Uses LLM to fix validation errors with up to N attempts.
 */

import type { PropertiesJSON, AnalysisContext, ValidationError } from './types'
import { validatePropertiesJSON, autoFixJSON } from './json-validator'
import { CORRECTION_SYSTEM_PROMPT, buildCorrectionUserPrompt } from './prompts'
import { getApiKey } from '../../lib/ai'
import { API } from '../../constants'

// =============================================================================
// Correction Loop
// =============================================================================

export interface CorrectionResult {
  /** Corrected JSON (or original if correction failed) */
  json: PropertiesJSON
  /** Whether correction was successful */
  success: boolean
  /** Number of attempts made */
  attempts: number
  /** Remaining errors (if any) */
  errors: ValidationError[]
  /** Total time for all correction attempts */
  durationMs: number
}

/**
 * Attempt to correct JSON validation errors.
 *
 * @param json - JSON with validation errors
 * @param errors - Validation errors to fix
 * @param context - Analysis context for validation
 * @param maxAttempts - Maximum correction attempts (default: 2)
 * @returns Corrected JSON with status
 */
export async function correctJSON(
  json: PropertiesJSON,
  errors: ValidationError[],
  context: AnalysisContext,
  maxAttempts = 2
): Promise<CorrectionResult> {
  const startTime = performance.now()
  let currentJson = json
  let currentErrors = errors
  let attempts = 0

  while (currentErrors.length > 0 && attempts < maxAttempts) {
    attempts++
    console.debug(`[Correction] Attempt ${attempts}/${maxAttempts}`)

    try {
      // Build correction prompt
      const jsonString = JSON.stringify(currentJson, null, 2)
      const errorMessages = currentErrors.map(e => `${e.path}: ${e.message}`)
      const userPrompt = buildCorrectionUserPrompt(jsonString, errorMessages)

      // Call LLM for correction
      const response = await fetch(API.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
          'X-Title': 'Mirror JSON Pipeline - Correction',
        },
        body: JSON.stringify({
          model: API.MODEL,
          messages: [
            { role: 'system', content: CORRECTION_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4096,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      let content = data.choices?.[0]?.message?.content || ''

      // Clean up and parse
      content = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()

      let correctedJson: unknown
      try {
        correctedJson = JSON.parse(content)
      } catch (parseError) {
        console.debug('[Correction] Parse error, trying auto-fix')
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          correctedJson = JSON.parse(jsonMatch[0])
        } else {
          throw parseError
        }
      }

      // Apply auto-fixes
      const { fixed } = autoFixJSON(correctedJson)

      // Validate
      const validation = validatePropertiesJSON(fixed, context)

      if (validation.valid || validation.errors.length < currentErrors.length) {
        currentJson = fixed as PropertiesJSON
        currentErrors = validation.errors
        console.debug(`[Correction] Reduced errors: ${currentErrors.length}`)
      } else {
        console.debug('[Correction] No improvement')
      }
    } catch (error) {
      console.debug('[Correction] Error:', error)
      // Continue with next attempt
    }
  }

  return {
    json: currentJson,
    success: currentErrors.length === 0,
    attempts,
    errors: currentErrors,
    durationMs: performance.now() - startTime,
  }
}

// =============================================================================
// Auto-Correction (No LLM)
// =============================================================================

/**
 * Apply automatic corrections without LLM.
 * Faster but less capable than LLM correction.
 */
export function autoCorrectJSON(
  json: PropertiesJSON,
  errors: ValidationError[],
  context: AnalysisContext
): { json: PropertiesJSON; fixed: string[] } {
  const fixed: string[] = []
  const result: PropertiesJSON = JSON.parse(JSON.stringify(json))

  // Fix each component recursively
  result.components = result.components.map(comp =>
    autoCorrectComponent(comp, errors, context, fixed)
  )

  return { json: result, fixed }
}

function autoCorrectComponent(
  comp: PropertiesJSON['components'][0],
  errors: ValidationError[],
  context: AnalysisContext,
  fixed: string[]
): PropertiesJSON['components'][0] {
  const result = { ...comp }

  // Fix type to PascalCase
  if (typeof result.type === 'string' && !/^[A-Z]/.test(result.type)) {
    const corrected = result.type.charAt(0).toUpperCase() + result.type.slice(1)
    fixed.push(`type "${result.type}" → "${corrected}"`)
    result.type = corrected
  }

  // Fix properties
  if (result.properties && Array.isArray(result.properties)) {
    result.properties = result.properties.map(prop => {
      const fixed_prop = { ...prop }

      // Normalize property names
      const corrections: Record<string, string> = {
        'font-weight': 'weight',
        'border-radius': 'radius',
        'font-family': 'font',
        'line-height': 'line',
        'bg': 'background',
        'col': 'color',
        'pad': 'padding',
        'mar': 'margin',
        'rad': 'radius',
        'bor': 'border',
      }

      if (corrections[fixed_prop.name]) {
        fixed.push(`property "${fixed_prop.name}" → "${corrections[fixed_prop.name]}"`)
        fixed_prop.name = corrections[fixed_prop.name]
      }

      return fixed_prop
    })
  }

  // Fix states
  if (result.states && Array.isArray(result.states)) {
    const validStates = context.validStates
    result.states = result.states.filter(state => {
      if (!validStates.has(state.name)) {
        fixed.push(`removed invalid state "${state.name}"`)
        return false
      }
      return true
    })
  }

  // Recursively fix children
  if (result.children && Array.isArray(result.children)) {
    result.children = result.children.map(child =>
      autoCorrectComponent(child, errors, context, fixed)
    )
  }

  return result
}

// =============================================================================
// Validation with Auto-Correction
// =============================================================================

/**
 * Validate and auto-correct JSON in one step.
 * Tries auto-correction first, then LLM correction if needed.
 */
export async function validateAndCorrect(
  json: PropertiesJSON,
  context: AnalysisContext,
  options: { maxAttempts?: number; skipLLM?: boolean } = {}
): Promise<{
  json: PropertiesJSON
  valid: boolean
  errors: ValidationError[]
  corrections: string[]
  durationMs: number
}> {
  const startTime = performance.now()
  const corrections: string[] = []

  // Initial validation
  let validation = validatePropertiesJSON(json, context)

  if (validation.valid) {
    return {
      json,
      valid: true,
      errors: [],
      corrections: [],
      durationMs: performance.now() - startTime,
    }
  }

  // Try auto-correction first
  const { json: autoFixed, fixed } = autoCorrectJSON(json, validation.errors, context)
  corrections.push(...fixed)

  // Re-validate
  validation = validatePropertiesJSON(autoFixed, context)

  if (validation.valid) {
    return {
      json: autoFixed,
      valid: true,
      errors: [],
      corrections,
      durationMs: performance.now() - startTime,
    }
  }

  // Try LLM correction if enabled
  if (!options.skipLLM && validation.errors.length > 0) {
    const result = await correctJSON(
      autoFixed,
      validation.errors,
      context,
      options.maxAttempts
    )

    if (result.success) {
      corrections.push(`LLM correction (${result.attempts} attempts)`)
      return {
        json: result.json,
        valid: true,
        errors: [],
        corrections,
        durationMs: performance.now() - startTime,
      }
    }

    return {
      json: result.json,
      valid: false,
      errors: result.errors,
      corrections,
      durationMs: performance.now() - startTime,
    }
  }

  return {
    json: autoFixed,
    valid: false,
    errors: validation.errors,
    corrections,
    durationMs: performance.now() - startTime,
  }
}
