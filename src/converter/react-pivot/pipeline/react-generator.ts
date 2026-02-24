/**
 * @module converter/react-pivot/pipeline/react-generator
 * @description LLM-based React code generation for the React-Pivot pipeline
 *
 * Generates constrained React/JSX code from natural language prompts.
 * The generated code follows the "Mirrorable React" specification.
 */

import type { LLMContext, LLMGenerationResult } from '../types'
import { REACT_SYSTEM_PROMPT } from '../prompts/system'
import { getApiKey, hasApiKey } from '../../../lib/ai'
import { API } from '../../../constants'

// Model selection for React-Pivot pipeline
const MODELS = {
  QUALITY: API.MODEL_THINKING,  // Opus for complex prompts
  FAST: API.MODEL_FAST,         // Sonnet for standard prompts
} as const

// =============================================================================
// Types
// =============================================================================

interface GenerationOptions {
  /** Use Opus model for higher quality */
  qualityMode?: boolean

  /** Enable streaming */
  streaming?: boolean

  /** Token callback for streaming */
  onToken?: (token: string) => void
}

// =============================================================================
// React Code Generation
// =============================================================================

export async function generateReactCode(
  prompt: string,
  context: LLMContext,
  options: GenerationOptions = {}
): Promise<LLMGenerationResult> {
  const { qualityMode = false, streaming = false, onToken } = options

  const startTime = performance.now()

  // Build the full prompt with context
  const fullPrompt = buildPrompt(prompt, context)

  // Select model based on quality mode
  const model = qualityMode ? MODELS.QUALITY : MODELS.FAST

  try {
    // Call LLM via OpenRouter API
    const response = await callLLM({
      model,
      systemPrompt: REACT_SYSTEM_PROMPT,
      userPrompt: fullPrompt,
      streaming,
      onToken,
    })

    // Extract React code from response
    const code = extractReactCode(response)

    return {
      code,
      rawResponse: response,
      duration: performance.now() - startTime,
    }
  } catch (error) {
    throw new Error(
      `React generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

// =============================================================================
// Prompt Building
// =============================================================================

function buildPrompt(userPrompt: string, context: LLMContext): string {
  const parts: string[] = []

  // Design System First principle
  const hasTokens = context.tokens && context.tokens.trim().length > 0
  const hasComponents = context.components && context.components.trim().length > 0

  if (hasTokens || hasComponents) {
    parts.push(`## DESIGN SYSTEM FIRST (CRITICAL!)

You are working within an EXISTING design system. Consistency is paramount.
A designer expects you to USE what exists, not invent new values.

**RULES:**
1. Use ONLY the tokens defined below - NO hardcoded values, NO new token names
2. If a spacing token like \`$md.pad: 12\` exists, use \`$md.pad\` - NEVER use \`padding: 14\`
3. Extend existing components instead of creating new ones from scratch
4. Match the naming conventions already established in the project
`)
  }

  // Add token context if available
  if (hasTokens) {
    parts.push(`## PROJECT TOKENS (USE ONLY THESE!)

These are the ONLY tokens you may use. Do NOT invent new token names.
If you need a value not covered, use the CLOSEST existing token.

\`\`\`
${context.tokens}
\`\`\`

**Token Usage Rules:**
- Background: Use tokens ending in \`.bg\` (e.g., \`$surface.bg\`, \`$primary.bg\`)
- Text color: Use tokens ending in \`.col\` (e.g., \`$default.col\`, \`$muted.col\`)
- Spacing: Use tokens ending in \`.pad\` or \`.gap\` (e.g., \`$md.pad\`, \`$lg.gap\`)
- Radius: Use tokens ending in \`.rad\` (e.g., \`$sm.rad\`, \`$md.rad\`)
`)
  }

  // Add component context if available
  if (hasComponents) {
    parts.push(`## EXISTING COMPONENTS (EXTEND, DON'T DUPLICATE!)

These components are already defined. PREFER extending them over creating new ones.
Use \`.extend()\` to create variants, don't redefine base styles.

\`\`\`
${context.components}
\`\`\`

**Component Rules:**
- If a Button exists, extend it for DangerButton, GhostButton etc.
- If a Card exists, use it instead of creating a Box with similar styles
- Match the existing naming pattern (PascalCase, semantic names)
`)
  }

  // Guidance when starting fresh (no existing system)
  if (!hasTokens && !hasComponents) {
    parts.push(`## BUILDING A NEW DESIGN SYSTEM

No existing tokens or components detected. Create a CONSISTENT foundation:

**Token Scales (define these first):**
\`\`\`
// Spacing scale (use consistent multiplier)
$sm.pad: 4, $md.pad: 8, $lg.pad: 16

// Gap scale (matches padding)
$sm.gap: 4, $md.gap: 8, $lg.gap: 16

// Radius scale
$sm.rad: 4, $md.rad: 6, $lg.rad: 8

// Semantic colors (reference palette)
$surface.bg, $elevated.bg, $primary.bg
$default.col, $muted.col, $heading.col
\`\`\`

**Component Hierarchy:**
1. Define base components first (Button, Card, Input)
2. Create variants through inheritance (DangerButton: Button)
3. Use semantic naming (not StyledBox1, StyledBox2)
`)
  }

  // Add the user request
  parts.push(`## Request
${userPrompt}

Generate React/JSX code following the Mirrorable React specification.
Use ONLY existing tokens and components where available.
Output ONLY the code, no explanations.`)

  return parts.join('\n\n')
}

// =============================================================================
// LLM API Call
// =============================================================================

interface LLMCallParams {
  model: string
  systemPrompt: string
  userPrompt: string
  streaming: boolean
  onToken?: (token: string) => void
}

// Store for active request cancellation
let activeAbortController: AbortController | null = null

/**
 * Cancel any active React generation request
 */
export function cancelActiveRequest(): void {
  if (activeAbortController) {
    activeAbortController.abort()
    activeAbortController = null
  }
}

async function callLLM(params: LLMCallParams): Promise<string> {
  // Check for API key
  if (!hasApiKey()) {
    throw new Error('Kein API Key gesetzt. Bitte OpenRouter API Key in den Einstellungen eingeben.')
  }

  // Cancel any previous request
  cancelActiveRequest()
  activeAbortController = new AbortController()

  const timeoutId = setTimeout(() => activeAbortController?.abort(), API.REQUEST_TIMEOUT_MS)

  try {
    if (params.streaming && params.onToken) {
      // Streaming mode with SSE
      return await callLLMStreaming(params)
    } else {
      // Non-streaming mode
      return await callLLMNonStreaming(params)
    }
  } finally {
    clearTimeout(timeoutId)
    activeAbortController = null
  }
}

/**
 * Non-streaming LLM call
 */
async function callLLMNonStreaming(params: LLMCallParams): Promise<string> {
  const response = await fetch(API.ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Mirror React-Pivot',
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt }
      ],
      max_tokens: API.MAX_TOKENS,
    }),
    signal: activeAbortController?.signal,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}`)
  }

  const data = await response.json() as {
    choices: Array<{ message?: { content?: string } }>
  }

  return data.choices[0]?.message?.content || ''
}

/**
 * Streaming LLM call with SSE
 */
async function callLLMStreaming(params: LLMCallParams): Promise<string> {
  const response = await fetch(API.ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Mirror React-Pivot',
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt }
      ],
      max_tokens: API.MAX_TOKENS,
      stream: true,
    }),
    signal: activeAbortController?.signal,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}`)
  }

  // Process SSE stream
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let fullContent = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>
            }
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              fullContent += content
              params.onToken?.(content)
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return fullContent
}

// =============================================================================
// Response Processing
// =============================================================================

function extractReactCode(response: string): string {
  // Try to extract code from markdown code blocks
  const codeBlockRegex = /```(?:jsx|tsx|javascript|react)?\n([\s\S]*?)```/g
  const matches: RegExpExecArray[] = []
  let match: RegExpExecArray | null

  while ((match = codeBlockRegex.exec(response)) !== null) {
    matches.push(match)
  }

  if (matches.length > 0) {
    // Join all code blocks
    return matches.map(m => m[1].trim()).join('\n\n')
  }

  // If no code blocks, assume the entire response is code
  return response.trim()
}

// =============================================================================
// Export
// =============================================================================

export default generateReactCode
