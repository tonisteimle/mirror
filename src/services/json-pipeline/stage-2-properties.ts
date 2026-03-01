/**
 * Stage 2: Properties Generation (LLM)
 *
 * Adds properties, states, and events to the structure.
 * This stage focuses on:
 * - Styling properties (padding, background, etc.)
 * - State blocks (hover, selected, etc.)
 * - Event handlers (onclick, onkeydown, etc.)
 * - Token usage for design consistency
 */

import type {
  StructureJSON,
  PropertiesJSON,
  AnalysisContext,
  StageResult,
  ValidationError,
  FullComponent,
} from './types'
import { validatePropertiesJSON } from './json-validator'
import { PROPERTIES_SYSTEM_PROMPT, buildPropertiesUserPrompt } from './prompts'
import { getApiKey } from '../../lib/ai'
import { API } from '../../constants'

// =============================================================================
// Main Properties Generation
// =============================================================================

export interface PropertiesGenerationOptions {
  /** Streaming callback for tokens */
  onToken?: (token: string, accumulated: string) => void
  /** Callback when first token arrives */
  onFirstToken?: (latency: number) => void
}

/**
 * Generate properties for a structure.
 *
 * @param structure - Component structure from Stage 1
 * @param context - Analysis context with tokens
 * @param options - Generation options
 * @returns Properties JSON with validation status
 */
export async function generateProperties(
  structure: StructureJSON,
  context: AnalysisContext,
  options: PropertiesGenerationOptions = {}
): Promise<StageResult<PropertiesJSON>> {
  const startTime = performance.now()
  const errors: ValidationError[] = []

  // Build user prompt
  const userPrompt = buildPropertiesUserPrompt(structure, context)

  try {
    // Call LLM
    const response = await callLLM(
      PROPERTIES_SYSTEM_PROMPT,
      userPrompt,
      options.onToken,
      options.onFirstToken
    )

    // Parse JSON
    let json: unknown
    try {
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
      // Return structure as fallback (without properties)
      return {
        json: structureToProperties(structure),
        errors,
        durationMs: performance.now() - startTime,
      }
    }

    // Validate properties
    const validation = validatePropertiesJSON(json, context)

    if (!validation.valid) {
      // Return with errors but still usable JSON
      return {
        json: json as PropertiesJSON,
        errors: validation.errors,
        durationMs: performance.now() - startTime,
      }
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.debug('[Stage 2] Warnings:', validation.warnings)
    }

    return {
      json: json as PropertiesJSON,
      errors: [],
      durationMs: performance.now() - startTime,
    }
  } catch (error) {
    errors.push({
      path: '',
      message: error instanceof Error ? error.message : String(error),
    })
    // Return structure as fallback
    return {
      json: structureToProperties(structure),
      errors,
      durationMs: performance.now() - startTime,
    }
  }
}

// =============================================================================
// Helper: Convert Structure to Properties (Fallback)
// =============================================================================

function structureToProperties(structure: StructureJSON): PropertiesJSON {
  return {
    components: structure.components.map(convertComponent),
  }
}

function convertComponent(comp: { type: string; name?: string; isDefinition?: boolean; content?: string; children?: unknown[] }): FullComponent {
  const result: FullComponent = {
    type: comp.type,
    name: comp.name,
    isDefinition: comp.isDefinition,
    content: comp.content,
  }

  if (comp.children && Array.isArray(comp.children)) {
    result.children = comp.children.map(child =>
      convertComponent(child as { type: string; name?: string; isDefinition?: boolean; content?: string; children?: unknown[] })
    )
  }

  return result
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
      'X-Title': 'Mirror JSON Pipeline - Stage 2',
    },
    body: JSON.stringify({
      model: API.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096, // Higher limit for properties
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

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      if (line === 'data: [DONE]') continue

      try {
        const data = JSON.parse(line.slice(6))
        const content = data.choices?.[0]?.delta?.content

        if (content) {
          if (firstTokenTime === null) {
            firstTokenTime = performance.now() - startTime
            onFirstToken?.(firstTokenTime)
          }

          accumulated += content
          onToken?.(content, accumulated)
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  return accumulated
}

// =============================================================================
// Quick Properties Generation (Non-Streaming)
// =============================================================================

/**
 * Generate properties without streaming (for testing)
 */
export async function generatePropertiesQuick(
  structure: StructureJSON,
  context: AnalysisContext
): Promise<StageResult<PropertiesJSON>> {
  const startTime = performance.now()
  const errors: ValidationError[] = []

  const userPrompt = buildPropertiesUserPrompt(structure, context)

  try {
    const response = await fetch(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
        'X-Title': 'Mirror JSON Pipeline - Stage 2 (Quick)',
      },
      body: JSON.stringify({
        model: API.MODEL,
        messages: [
          { role: 'system', content: PROPERTIES_SYSTEM_PROMPT },
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

    content = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    const json = JSON.parse(content)
    const validation = validatePropertiesJSON(json, context)

    return {
      json: json as PropertiesJSON,
      errors: validation.valid ? [] : validation.errors,
      durationMs: performance.now() - startTime,
    }
  } catch (error) {
    errors.push({
      path: '',
      message: error instanceof Error ? error.message : String(error),
    })
    return {
      json: structureToProperties(structure),
      errors,
      durationMs: performance.now() - startTime,
    }
  }
}

// =============================================================================
// Combined Generation (Structure + Properties in one call)
// =============================================================================

/**
 * Generate structure and properties in a single LLM call.
 * More efficient for simple prompts.
 */
export async function generateCombined(
  prompt: string,
  context: AnalysisContext,
  options: PropertiesGenerationOptions = {}
): Promise<StageResult<PropertiesJSON>> {
  const startTime = performance.now()
  const errors: ValidationError[] = []

  // Use combined prompt
  const { COMBINED_SYSTEM_PROMPT, buildCombinedUserPrompt } = await import('./prompts')
  const userPrompt = buildCombinedUserPrompt(prompt, context)

  try {
    const response = await callLLM(
      COMBINED_SYSTEM_PROMPT,
      userPrompt,
      options.onToken,
      options.onFirstToken
    )

    let json: unknown
    try {
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

    const validation = validatePropertiesJSON(json, context)

    return {
      json: json as PropertiesJSON,
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
