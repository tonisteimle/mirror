/**
 * Intent-basierte AI Generierung
 *
 * Flow:
 * 1. Mirror Code → Intent JSON
 * 2. LLM modifiziert Intent basierend auf User-Request
 * 3. Intent JSON → Mirror Code
 *
 * Das LLM sieht NIE Mirror-Syntax, nur strukturiertes JSON.
 */

import { mirrorToIntent } from './mirror-to-intent'
import { intentToMirror } from './intent-to-mirror'
import { INTENT_SYSTEM_PROMPT, buildUserPrompt, parseIntentResponse } from './llm-prompt'
import type { Intent } from './schema'

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
  layoutCode?: string
  componentsCode?: string
  tokensCode?: string
  error?: string
  // Debug info
  inputIntent?: Intent
  outputIntent?: Intent
}

// =============================================================================
// Main Generate Function
// =============================================================================

export async function generateWithIntent(
  userRequest: string,
  options: GenerateOptions,
  callLLM: (systemPrompt: string, userPrompt: string) => Promise<string>
): Promise<GenerateResult> {
  try {
    // 1. Convert current code to Intent
    const currentIntent = mirrorToIntent(
      options.layoutCode,
      options.componentsCode || '',
      options.tokensCode || ''
    )

    // 2. Build prompts
    const systemPrompt = INTENT_SYSTEM_PROMPT
    const userPrompt = buildUserPrompt(currentIntent, userRequest)

    // 3. Call LLM
    const response = await callLLM(systemPrompt, userPrompt)

    // 4. Parse response
    const newIntent = parseIntentResponse(response)
    if (!newIntent) {
      return {
        success: false,
        error: 'Failed to parse LLM response as valid Intent JSON',
        inputIntent: currentIntent,
      }
    }

    // 5. Convert back to Mirror code
    const generatedCode = intentToMirror(newIntent)

    // 6. Split into sections (tokens, components, layout)
    const sections = splitGeneratedCode(generatedCode, newIntent)

    return {
      success: true,
      ...sections,
      inputIntent: currentIntent,
      outputIntent: newIntent,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================================================
// Helper: Split generated code into sections
// =============================================================================

function splitGeneratedCode(
  fullCode: string,
  intent: Intent
): { layoutCode: string; componentsCode: string; tokensCode: string } {
  // Generate each section separately for clean separation
  const tokensCode = generateTokensSection(intent)
  const componentsCode = generateComponentsSection(intent)
  const layoutCode = generateLayoutSection(intent)

  return { layoutCode, componentsCode, tokensCode }
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
  // Re-use intentToMirror but only for components
  const componentsOnlyIntent: Intent = {
    tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
    components: intent.components,
    layout: [],
  }
  return intentToMirror(componentsOnlyIntent).trim()
}

function generateLayoutSection(intent: Intent): string {
  // Re-use intentToMirror but only for layout
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

export function createMockLLM(
  mockResponse: Intent | ((input: Intent, request: string) => Intent)
): (systemPrompt: string, userPrompt: string) => Promise<string> {
  return async (_systemPrompt: string, userPrompt: string): Promise<string> => {
    // Extract current intent from user prompt
    const jsonMatch = userPrompt.match(/```json\s*([\s\S]*?)```/)
    if (!jsonMatch) {
      throw new Error('Could not extract intent from user prompt')
    }

    const currentIntent = JSON.parse(jsonMatch[1]) as Intent

    // Extract user request
    const requestMatch = userPrompt.match(/## Änderungswunsch\s+([\s\S]*?)##/)
    const userRequest = requestMatch ? requestMatch[1].trim() : ''

    // Generate response
    const response = typeof mockResponse === 'function'
      ? mockResponse(currentIntent, userRequest)
      : mockResponse

    return JSON.stringify(response, null, 2)
  }
}
