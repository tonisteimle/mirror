/**
 * Intent Streaming Module
 *
 * Provides streaming LLM responses with incremental intent parsing
 * for live preview updates.
 */

import type { Intent, LayoutNode } from './schema'
import { intentToMirror } from './intent-to-mirror'

// =============================================================================
// Types
// =============================================================================

export interface StreamingOptions {
  onPartialIntent?: (intent: Partial<Intent>) => void
  onPartialMirror?: (code: string) => void
  onComplete?: (intent: Intent) => void
  onError?: (error: Error) => void
}

export interface StreamingLLMConfig {
  url: string
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
}

// =============================================================================
// Incremental JSON Parser
// =============================================================================

/**
 * Attempts to parse incomplete JSON by closing open brackets/braces
 */
export function parseIncompleteJSON(partial: string): unknown | null {
  // Count open brackets
  let openBraces = 0
  let openBrackets = 0
  let inString = false
  let escape = false

  for (const char of partial) {
    if (escape) {
      escape = false
      continue
    }

    if (char === '\\') {
      escape = true
      continue
    }

    if (char === '"' && !escape) {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') openBraces++
    if (char === '}') openBraces--
    if (char === '[') openBrackets++
    if (char === ']') openBrackets--
  }

  // Close string if open
  let completed = partial
  if (inString) {
    completed += '"'
  }

  // Remove trailing comma
  completed = completed.replace(/,\s*$/, '')

  // Close brackets and braces
  completed += ']'.repeat(Math.max(0, openBrackets))
  completed += '}'.repeat(Math.max(0, openBraces))

  try {
    return JSON.parse(completed)
  } catch {
    return null
  }
}

/**
 * Extracts a partial intent from incomplete JSON
 */
export function extractPartialIntentFromStream(partial: string): Partial<Intent> | null {
  const result: Partial<Intent> = {}

  // Try to extract tokens
  const tokensStart = partial.indexOf('"tokens"')
  if (tokensStart !== -1) {
    const tokensSection = extractSection(partial, tokensStart)
    if (tokensSection) {
      try {
        const parsed = parseIncompleteJSON(`{${tokensSection}}`)
        if (parsed && typeof parsed === 'object' && 'tokens' in parsed) {
          result.tokens = (parsed as { tokens: Intent['tokens'] }).tokens
        }
      } catch { /* ignore */ }
    }
  }

  // Try to extract components
  const componentsStart = partial.indexOf('"components"')
  if (componentsStart !== -1) {
    const componentsSection = extractSection(partial, componentsStart)
    if (componentsSection) {
      try {
        const parsed = parseIncompleteJSON(`{${componentsSection}}`)
        if (parsed && typeof parsed === 'object' && 'components' in parsed) {
          result.components = (parsed as { components: Intent['components'] }).components
        }
      } catch { /* ignore */ }
    }
  }

  // Try to extract layout
  const layoutStart = partial.indexOf('"layout"')
  if (layoutStart !== -1) {
    const layoutSection = extractSection(partial, layoutStart)
    if (layoutSection) {
      try {
        const parsed = parseIncompleteJSON(`{${layoutSection}}`)
        if (parsed && typeof parsed === 'object' && 'layout' in parsed) {
          result.layout = (parsed as { layout: Intent['layout'] }).layout
        }
      } catch { /* ignore */ }
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

function extractSection(json: string, startIndex: number): string | null {
  // Find the end of this section (next top-level key or end)
  let depth = 0
  const start = startIndex
  let foundColon = false

  for (let i = startIndex; i < json.length; i++) {
    const char = json[i]

    if (char === ':' && depth === 0 && !foundColon) {
      foundColon = true
      continue
    }

    if (!foundColon) continue

    if (char === '{' || char === '[') depth++
    if (char === '}' || char === ']') depth--

    // End of section: either comma, closing brace, or we're back at depth 0 after processing
    if (depth === 0 && (char === ',' || char === '}')) {
      return json.slice(startIndex, i)
    }
    // Also check if we completed an array/object and reached depth 0
    if (depth === 0 && (char === ']') && foundColon) {
      return json.slice(startIndex, i + 1) // Include the closing bracket
    }
  }

  return json.slice(startIndex)
}

// =============================================================================
// Streaming Generator
// =============================================================================

/**
 * Creates an async generator that yields partial intents as they stream in
 */
export async function* streamIntent(
  config: StreamingLLMConfig
): AsyncGenerator<{ partial: Partial<Intent>; code: string } | { complete: Intent; code: string }> {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: config.userPrompt },
      ],
      stream: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Streaming request failed: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''

  try {
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
            fullContent += content

            // Try to parse partial intent
            const partial = extractPartialIntentFromStream(fullContent)
            if (partial) {
              // Generate partial Mirror code
              const partialIntent: Intent = {
                tokens: partial.tokens || {},
                components: partial.components || [],
                layout: partial.layout || [],
              }

              try {
                const code = intentToMirror(partialIntent)
                yield { partial, code }
              } catch {
                // Ignore code generation errors for partial intents
              }
            }
          }
        } catch {
          // Ignore parse errors for SSE lines
        }
      }
    }

    // Parse final complete intent
    const jsonMatch = fullContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, fullContent]
    const jsonStr = (jsonMatch[1] || fullContent).trim()

    try {
      const complete = JSON.parse(jsonStr) as Intent
      const code = intentToMirror(complete)
      yield { complete, code }
    } catch (e) {
      throw new Error(`Failed to parse final intent: ${e}`)
    }
  } finally {
    reader.releaseLock()
  }
}

// =============================================================================
// Streaming with Callbacks
// =============================================================================

/**
 * Streams intent with callback-based API
 */
export async function streamIntentWithCallbacks(
  config: StreamingLLMConfig,
  options: StreamingOptions
): Promise<Intent> {
  let lastIntent: Intent | null = null

  try {
    for await (const result of streamIntent(config)) {
      if ('complete' in result) {
        lastIntent = result.complete
        options.onPartialMirror?.(result.code)
        options.onComplete?.(result.complete)
      } else {
        const partialIntent: Intent = {
          tokens: result.partial.tokens || {},
          components: result.partial.components || [],
          layout: result.partial.layout || [],
        }
        options.onPartialIntent?.(result.partial)
        options.onPartialMirror?.(result.code)
      }
    }

    if (!lastIntent) {
      throw new Error('No complete intent received')
    }

    return lastIntent
  } catch (error) {
    options.onError?.(error as Error)
    throw error
  }
}

// =============================================================================
// Debounced Preview Updates
// =============================================================================

/**
 * Creates a debounced preview updater for streaming
 */
export function createDebouncedPreview(
  updateFn: (code: string) => void,
  debounceMs: number = 100
): (code: string) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastCode = ''

  return (code: string) => {
    lastCode = code

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      updateFn(lastCode)
      timeoutId = null
    }, debounceMs)
  }
}
