/**
 * Generator Capability
 *
 * LLM-based Mirror DSL code generation with self-healing validation.
 */

import {
  generateWithValidation,
  setApiKey,
  hasApiKey,
  type GenerateWithValidationOptions,
} from '../../lib/ai'
import { parseCode } from './parser'
import type { GeneratedCode, GeneratorOptions } from '../types'

/**
 * Generate Mirror DSL code from a natural language prompt.
 *
 * Uses LLM with automatic validation and self-healing.
 */
export async function generateCode(
  prompt: string,
  options?: GeneratorOptions
): Promise<GeneratedCode> {
  if (!hasApiKey()) {
    return {
      code: '',
      valid: false,
      healingAttempts: 0,
      issues: [],
      error: 'No API key configured. Call setApiKey() first.',
    }
  }

  const genOptions: GenerateWithValidationOptions = {
    maxAttempts: options?.maxAttempts ?? 3,
    language: options?.language ?? 'en',
    onProgress: options?.onProgress,
  }

  try {
    const result = await generateWithValidation(prompt, genOptions)

    // Parse the generated code
    const parsed = parseCode(result.code)

    return {
      code: result.code,
      valid: result.valid,
      parsed: result.valid ? parsed : undefined,
      healingAttempts: result.attempts,
      issues: result.issues,
    }
  } catch (error) {
    return {
      code: '',
      valid: false,
      healingAttempts: 0,
      issues: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Configure the API key for LLM generation.
 */
export function configureApiKey(key: string): void {
  setApiKey(key)
}

/**
 * Check if an API key is configured.
 */
export function isApiKeyConfigured(): boolean {
  return hasApiKey()
}
