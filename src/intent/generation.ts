/**
 * Intent Generation Module
 *
 * Provides separate generation flows for CREATE and MODIFY requests:
 * - CREATE: Direct LLM generation to Intent to Mirror
 * - MODIFY: Mirror to Intent, LLM patch/modify, Intent to Mirror
 */

import { mirrorToIntent } from './mirror-to-intent'
import { intentToMirror } from './intent-to-mirror'
import { parseIntentResponse } from './llm-prompt'
import { parseDiffResponse, getGlobalIntentHistory } from './diff'
import {
  CREATE_SYSTEM_PROMPT,
  MODIFY_SYSTEM_PROMPT,
  buildCreatePrompt,
  buildModifyPrompt,
} from './prompts'
import type { Intent } from './schema'
import { createEmptyIntent } from './schema'
import { validateIntentDetailed } from './validator'

// =============================================================================
// Types
// =============================================================================

export interface GenerateOptions {
  layoutCode: string
  componentsCode?: string
  tokensCode?: string
}

export interface GenerateResult {
  success: boolean
  code: string
  error?: string
  // Debug info
  inputIntent?: Intent
  outputIntent?: Intent
  method?: 'create' | 'modify'
  // Validation info
  validationWarnings?: string[]
  // Recovery info (if validation failed but was recovered)
  wasRecovered?: boolean
  recoveryFixes?: string[]
}

/**
 * LLM Call Function Type
 * This abstracts the actual LLM API call for testability
 */
export type LLMCallFn = (systemPrompt: string, userPrompt: string) => Promise<string>

// =============================================================================
// CREATE Flow
// =============================================================================

/**
 * Generate new UI using the CREATE flow
 *
 * Flow:
 * 1. User prompt → buildCreatePrompt
 * 2. LLM generates Intent JSON
 * 3. Validate Intent (with recovery if needed)
 * 4. Intent → Mirror code
 * 5. Push to history for rollback support
 */
export async function generateWithCreate(
  userPrompt: string,
  options: GenerateOptions,
  callLLM: LLMCallFn
): Promise<GenerateResult> {
  try {
    // Build prompts
    const systemPrompt = CREATE_SYSTEM_PROMPT
    const userMessage = buildCreatePrompt(userPrompt, options.tokensCode)

    // Call LLM
    const response = await callLLM(systemPrompt, userMessage)

    // Parse response as Intent
    let newIntent = parseIntentResponse(response)
    if (!newIntent) {
      return {
        success: false,
        code: '',
        error: 'Failed to parse LLM response as valid Intent JSON',
        method: 'create',
      }
    }

    // Validate with detailed feedback
    const validation = validateIntentDetailed(newIntent)
    let wasRecovered = false
    let recoveryFixes: string[] = []

    if (!validation.valid) {
      // Try recovery
      if (validation.recovery?.canRecover && validation.recovery.recoveredIntent) {
        newIntent = validation.recovery.recoveredIntent
        wasRecovered = true
        recoveryFixes = validation.recovery.appliedFixes
      } else {
        return {
          success: false,
          code: '',
          error: `Invalid Intent generated: ${validation.errors.map(e => e.message).join(', ')}`,
          method: 'create',
        }
      }
    }

    // Convert Intent to Mirror code
    const mirrorCode = intentToMirror(newIntent)

    // Push to history for rollback support
    const history = getGlobalIntentHistory()
    history.push(newIntent, `CREATE: ${userPrompt.slice(0, 50)}...`)

    return {
      success: true,
      code: mirrorCode,
      outputIntent: newIntent,
      method: 'create',
      validationWarnings: validation.warnings.map(w => w.message),
      wasRecovered,
      recoveryFixes: recoveryFixes.length > 0 ? recoveryFixes : undefined,
    }
  } catch (error) {
    return {
      success: false,
      code: '',
      error: error instanceof Error ? error.message : 'Unknown error during CREATE',
      method: 'create',
    }
  }
}

// =============================================================================
// MODIFY Flow
// =============================================================================

/**
 * Modify existing UI using the MODIFY flow
 *
 * Flow:
 * 1. Existing Mirror code → Intent JSON
 * 2. Push current state to history (for rollback)
 * 3. buildModifyPrompt with current Intent
 * 4. LLM returns patch or full Intent
 * 5. parseDiffResponse applies changes
 * 6. Validate modified Intent (with recovery if needed)
 * 7. Modified Intent → Mirror code
 * 8. Push result to history
 */
export async function generateWithModify(
  userPrompt: string,
  options: GenerateOptions,
  callLLM: LLMCallFn
): Promise<GenerateResult> {
  try {
    // Convert current code to Intent
    const currentIntent = mirrorToIntent(
      options.layoutCode,
      options.componentsCode || '',
      options.tokensCode || ''
    )

    // Push current state to history before modification
    const history = getGlobalIntentHistory()
    if (history.size() === 0 || history.current() !== currentIntent) {
      history.push(currentIntent, 'Before MODIFY')
    }

    // Build prompts
    const systemPrompt = MODIFY_SYSTEM_PROMPT
    const userMessage = buildModifyPrompt(currentIntent, userPrompt)

    // Call LLM
    const response = await callLLM(systemPrompt, userMessage)

    // Parse response (handles both patch and full Intent)
    let newIntent = parseDiffResponse(response, currentIntent)
    if (!newIntent) {
      return {
        success: false,
        code: options.layoutCode,  // Return original on failure
        error: 'Failed to parse LLM modification response',
        inputIntent: currentIntent,
        method: 'modify',
      }
    }

    // Validate with detailed feedback
    const validation = validateIntentDetailed(newIntent)
    let wasRecovered = false
    let recoveryFixes: string[] = []

    if (!validation.valid) {
      // Try recovery
      if (validation.recovery?.canRecover && validation.recovery.recoveredIntent) {
        newIntent = validation.recovery.recoveredIntent
        wasRecovered = true
        recoveryFixes = validation.recovery.appliedFixes
      } else {
        return {
          success: false,
          code: options.layoutCode,  // Return original on failure
          error: `Invalid Intent after modification: ${validation.errors.map(e => e.message).join(', ')}`,
          inputIntent: currentIntent,
          method: 'modify',
        }
      }
    }

    // Convert Intent to Mirror code
    const mirrorCode = intentToMirror(newIntent)

    // Push successful result to history
    history.push(newIntent, `MODIFY: ${userPrompt.slice(0, 50)}...`)

    return {
      success: true,
      code: mirrorCode,
      inputIntent: currentIntent,
      outputIntent: newIntent,
      method: 'modify',
      validationWarnings: validation.warnings.map(w => w.message),
      wasRecovered,
      recoveryFixes: recoveryFixes.length > 0 ? recoveryFixes : undefined,
    }
  } catch (error) {
    return {
      success: false,
      code: options.layoutCode,  // Return original on failure
      error: error instanceof Error ? error.message : 'Unknown error during MODIFY',
      method: 'modify',
    }
  }
}

// =============================================================================
// Unified Generation (Auto-routes based on classification)
// =============================================================================

/**
 * Generate or modify UI based on request classification
 *
 * @param userPrompt - The user's request
 * @param options - Current code context
 * @param callLLM - Function to call the LLM
 * @param requestType - Pre-classified request type ('create' or 'modify')
 */
export async function generateIntent(
  userPrompt: string,
  options: GenerateOptions,
  callLLM: LLMCallFn,
  requestType: 'create' | 'modify'
): Promise<GenerateResult> {
  if (requestType === 'create') {
    return generateWithCreate(userPrompt, options, callLLM)
  } else {
    return generateWithModify(userPrompt, options, callLLM)
  }
}

// =============================================================================
// Split Generated Code
// =============================================================================

/**
 * Split generated Mirror code into separate sections
 */
export function splitGeneratedCode(
  intent: Intent
): { tokensCode: string; componentsCode: string; layoutCode: string } {
  return {
    tokensCode: generateTokensSection(intent),
    componentsCode: generateComponentsSection(intent),
    layoutCode: generateLayoutSection(intent),
  }
}

function generateTokensSection(intent: Intent): string {
  const lines: string[] = []

  const { colors, spacing, radii, sizes } = intent.tokens

  if (colors) {
    for (const [name, value] of Object.entries(colors)) {
      lines.push(`$${name}: ${value}`)
    }
  }
  if (spacing) {
    for (const [name, value] of Object.entries(spacing)) {
      lines.push(`$${name}: ${value}`)
    }
  }
  if (radii) {
    for (const [name, value] of Object.entries(radii)) {
      lines.push(`$${name}: ${value}`)
    }
  }
  if (sizes) {
    for (const [name, value] of Object.entries(sizes)) {
      lines.push(`$${name}: ${value}`)
    }
  }

  return lines.join('\n')
}

function generateComponentsSection(intent: Intent): string {
  const componentsOnlyIntent: Intent = {
    tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
    components: intent.components,
    layout: [],
  }
  return intentToMirror(componentsOnlyIntent).trim()
}

function generateLayoutSection(intent: Intent): string {
  const layoutOnlyIntent: Intent = {
    tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
    components: [],
    layout: intent.layout,
  }
  return intentToMirror(layoutOnlyIntent).trim()
}

// =============================================================================
// Mock LLM for Testing
// =============================================================================

/**
 * Create a mock LLM function for testing
 */
export function createMockLLM(
  mockResponse: Intent | Record<string, unknown> | ((prompt: string) => Intent | Record<string, unknown>)
): LLMCallFn {
  return async (_systemPrompt: string, userPrompt: string): Promise<string> => {
    const response = typeof mockResponse === 'function'
      ? mockResponse(userPrompt)
      : mockResponse

    return JSON.stringify(response, null, 2)
  }
}

/**
 * Create a mock LLM that returns a patch response
 */
export function createMockPatchLLM(
  patches: Array<{ op: string; path: string; value?: unknown }>
): LLMCallFn {
  return async (): Promise<string> => {
    return JSON.stringify({ patch: patches }, null, 2)
  }
}

/**
 * Create a mock LLM that transforms the input intent
 */
export function createTransformMockLLM(
  transform: (input: Intent, userPrompt: string) => Intent
): LLMCallFn {
  return async (_systemPrompt: string, userPrompt: string): Promise<string> => {
    // Try to extract current intent from MODIFY prompt
    const jsonMatch = userPrompt.match(/```json\s*([\s\S]*?)```/)

    if (jsonMatch) {
      const currentIntent = JSON.parse(jsonMatch[1]) as Intent
      const requestMatch = userPrompt.match(/## Änderungswunsch\s+([\s\S]*?)##/)
      const request = requestMatch ? requestMatch[1].trim() : userPrompt

      const result = transform(currentIntent, request)
      return JSON.stringify(result, null, 2)
    }

    // For CREATE flow, start with empty intent
    const emptyIntent = createEmptyIntent()
    const result = transform(emptyIntent, userPrompt)
    return JSON.stringify(result, null, 2)
  }
}
