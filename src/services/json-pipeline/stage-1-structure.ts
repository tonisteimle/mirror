/**
 * Stage 1: Structure Generation (LLM)
 *
 * Generates the component hierarchy without properties.
 * This stage focuses on:
 * - Component types and nesting
 * - Text content
 * - Definitions vs instances
 */

import type { StructureJSON, AnalysisContext, StageResult, ValidationError } from './types'
import { validateStructureJSON, autoFixJSON } from './json-validator'
import { STRUCTURE_SYSTEM_PROMPT, buildStructureUserPrompt } from './prompts'
import { getApiKey } from '../../lib/ai'
import { API } from '../../constants'

// =============================================================================
// Main Structure Generation
// =============================================================================

export interface StructureGenerationOptions {
  /** Streaming callback for tokens */
  onToken?: (token: string, accumulated: string) => void
  /** Callback when first token arrives */
  onFirstToken?: (latency: number) => void
}

/**
 * Generate component structure from natural language prompt.
 *
 * @param prompt - Natural language description
 * @param context - Analysis context with available components
 * @param options - Generation options
 * @returns Structure JSON with validation status
 */
export async function generateStructure(
  prompt: string,
  context: AnalysisContext,
  options: StructureGenerationOptions = {}
): Promise<StageResult<StructureJSON>> {
  const startTime = performance.now()
  const errors: ValidationError[] = []

  // Build user prompt
  const userPrompt = buildStructureUserPrompt(prompt, context)

  try {
    // Call LLM
    const response = await callLLM(
      STRUCTURE_SYSTEM_PROMPT,
      userPrompt,
      options.onToken,
      options.onFirstToken
    )

    // Parse JSON
    let json: unknown
    try {
      // Clean up potential markdown wrapping
      const cleaned = response
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()

      json = JSON.parse(cleaned)
    } catch (parseError) {
      errors.push({
        path: '',
        message: `JSON parse error: ${parseError}`,
      })
      return {
        json: { components: [] },
        errors,
        durationMs: performance.now() - startTime,
      }
    }

    // Try to auto-fix common issues
    const { fixed, fixes } = autoFixJSON(json)
    if (fixes.length > 0) {
      // Log fixes for debugging
      console.debug('[Stage 1] Auto-fixes applied:', fixes)
    }

    // Validate structure
    const validation = validateStructureJSON(fixed)

    if (!validation.valid) {
      return {
        json: fixed as StructureJSON,
        errors: validation.errors,
        durationMs: performance.now() - startTime,
      }
    }

    // Add warnings as non-fatal errors
    if (validation.warnings.length > 0) {
      console.debug('[Stage 1] Warnings:', validation.warnings)
    }

    return {
      json: fixed as StructureJSON,
      errors: [],
      durationMs: performance.now() - startTime,
    }
  } catch (error) {
    errors.push({
      path: '',
      message: error instanceof Error ? error.message : String(error),
    })
    return {
      json: { components: [] },
      errors,
      durationMs: performance.now() - startTime,
    }
  }
}

// =============================================================================
// LLM Call
// =============================================================================

async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  onToken?: (token: string, accumulated: string) => void,
  onFirstToken?: (latency: number) => void
): Promise<string> {
  const startTime = performance.now()
  let firstTokenTime: number | null = null
  let accumulated = ''

  const response = await fetch(API.ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
      'X-Title': 'Mirror JSON Pipeline - Stage 1',
    },
    body: JSON.stringify({
      model: API.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2048,
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API Error: ${response.status} - ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response stream')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Process SSE lines
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      if (line === 'data: [DONE]') continue

      try {
        const data = JSON.parse(line.slice(6))
        const content = data.choices?.[0]?.delta?.content

        if (content) {
          // Track first token latency
          if (firstTokenTime === null) {
            firstTokenTime = performance.now() - startTime
            onFirstToken?.(firstTokenTime)
          }

          accumulated += content
          onToken?.(content, accumulated)
        }
      } catch {
        // Ignore parse errors for SSE lines
      }
    }
  }

  return accumulated
}

// =============================================================================
// Quick Structure Generation (Non-Streaming)
// =============================================================================

/**
 * Generate structure without streaming (for testing)
 */
export async function generateStructureQuick(
  prompt: string,
  context: AnalysisContext
): Promise<StageResult<StructureJSON>> {
  const startTime = performance.now()
  const errors: ValidationError[] = []

  const userPrompt = buildStructureUserPrompt(prompt, context)

  try {
    const response = await fetch(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
        'X-Title': 'Mirror JSON Pipeline - Stage 1 (Quick)',
      },
      body: JSON.stringify({
        model: API.MODEL,
        messages: [
          { role: 'system', content: STRUCTURE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    let content = data.choices?.[0]?.message?.content || ''

    // Clean up markdown
    content = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    // Parse and validate
    const json = JSON.parse(content)
    const { fixed } = autoFixJSON(json)
    const validation = validateStructureJSON(fixed)

    return {
      json: fixed as StructureJSON,
      errors: validation.valid ? [] : validation.errors,
      durationMs: performance.now() - startTime,
    }
  } catch (error) {
    errors.push({
      path: '',
      message: error instanceof Error ? error.message : String(error),
    })
    return {
      json: { components: [] },
      errors,
      durationMs: performance.now() - startTime,
    }
  }
}
