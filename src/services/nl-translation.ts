/**
 * Natural Language to Mirror DSL Translation Service
 *
 * Provides line-by-line translation from natural language descriptions
 * to Mirror DSL code with streaming support and context awareness.
 */

import { getApiKey, hasApiKey } from '../lib/ai'
import { validateMirrorCode, type CodeIssue } from '../lib/self-healing'
import { API } from '../constants'
import { buildUnifiedContext } from '../lib/ai-context'

// React-Pivot integration - use for complex prompts
import {
  shouldUseReactPivot,
  translateWithReactPivot,
} from '../converter/react-pivot/integration/adapter'

// Re-export React-Pivot utilities for external use
export { shouldUseReactPivot, translateWithReactPivot }

// Import prompts from centralized file (generated from reference.json)
import { SYSTEM_PROMPT, DEEP_THINKING_PROMPT } from './nl-prompts'

// Re-export for backwards compatibility
export { SYSTEM_PROMPT, DEEP_THINKING_PROMPT }

/**
 * Normalize redundant token suffixes in generated code.
 * Converts patterns like `gap $md.gap` to `gap $md` when the suffix matches the property.
 *
 * This makes the code cleaner since the property context already tells us what type of token is expected.
 *
 * @example
 * Input:  "Table gap $s.gap, pad $m.pad, bg $surface.bg, rad $m.rad"
 * Output: "Table gap $s, pad $m, bg $surface, rad $m"
 */
export function normalizeTokenSuffixes(code: string): string {
  // Property-suffix pairs where the suffix is redundant with the property name
  // In JavaScript regex replacement: $$ = literal $, $1 = first capture group
  const redundantPatterns: Array<[RegExp, string]> = [
    // Spacing: gap $md.gap → gap $md
    [/\bgap\s+\$(\w+)\.gap\b/g, 'gap $$$1'],
    [/\bpad\s+\$(\w+)\.pad\b/g, 'pad $$$1'],
    [/\bpadding\s+\$(\w+)\.pad\b/g, 'padding $$$1'],
    [/\bmar\s+\$(\w+)\.mar\b/g, 'mar $$$1'],
    [/\bmargin\s+\$(\w+)\.mar\b/g, 'margin $$$1'],
    // Colors: bg $primary.bg → bg $primary
    [/\bbg\s+\$(\w+)\.bg\b/g, 'bg $$$1'],
    [/\bbackground\s+\$(\w+)\.bg\b/g, 'background $$$1'],
    [/\bcol\s+\$(\w+)\.col\b/g, 'col $$$1'],
    [/\bcolor\s+\$(\w+)\.col\b/g, 'color $$$1'],
    [/\bboc\s+\$(\w+)\.boc\b/g, 'boc $$$1'],
    // Border & Radius: rad $md.rad → rad $md
    [/\brad\s+\$(\w+)\.rad\b/g, 'rad $$$1'],
    [/\bradius\s+\$(\w+)\.rad\b/g, 'radius $$$1'],
    [/\bbor\s+\$(\w+)\.bor\b/g, 'bor $$$1'],
    [/\bborder\s+\$(\w+)\.bor\b/g, 'border $$$1'],
    // Typography: size $lg.font.size → size $lg
    [/\bsize\s+\$(\w+)\.font\.size\b/g, 'size $$$1'],
    [/\bfont-size\s+\$(\w+)\.font\.size\b/g, 'font-size $$$1'],
    [/\bfs\s+\$(\w+)\.font\.size\b/g, 'fs $$$1'],
    [/\btext-size\s+\$(\w+)\.font\.size\b/g, 'text-size $$$1'],
    // Hover variants: hover-bg $primary.hover.bg → hover-bg $primary.hover
    [/\bhover-bg\s+\$(\w+)\.hover\.bg\b/g, 'hover-bg $$$1.hover'],
    [/\bhover-col\s+\$(\w+)\.hover\.col\b/g, 'hover-col $$$1.hover'],
  ]

  let result = code
  for (const [pattern, replacement] of redundantPatterns) {
    result = result.replace(pattern, replacement)
  }

  return result
}

/** Status of a line translation */
export type LineStatus = 'pending' | 'translating' | 'done' | 'warning' | 'error'

/** Information about a line being translated */
export interface LineTranslation {
  lineIndex: number
  status: LineStatus
  original: string
  translated?: string
  error?: string
}

/** Result of a translation */
export interface TranslationResult {
  code: string
  error?: string
  /** Validation issues found in the generated code */
  validationIssues?: CodeIssue[]
  /** Whether the code passed validation */
  isValid?: boolean
  timeToFirstToken: number
  totalTime: number
}

/** Callbacks for streaming translation */
export interface TranslationCallbacks {
  onToken?: (token: string, accumulated: string) => void
  onFirstToken?: (latency: number) => void
  onComplete?: (result: TranslationResult) => void
  onError?: (error: Error) => void
}

/** Options for Quality mode (full context + Opus model) */
export interface QualityModeOptions {
  enabled: boolean
  /** Full layout code of current page */
  layoutCode?: string
  /** Components code */
  componentsCode?: string
  /** Use React-Pivot pipeline for complex prompts (auto-detected if not set) */
  useReactPivot?: boolean | 'auto'
}

// Re-export hybrid detection for use in components
export {
  detectNaturalLanguage,
  isNaturalLanguageLine,
  shouldTranslateHybrid,
  type DetectionResult
} from './nl-detection'

/**
 * Check if a line should be translated.
 * When LLM mode is enabled, we translate everything except:
 * - Empty lines
 * - Comments
 * - Section headers
 *
 * The user explicitly enabled LLM mode, so they want translation.
 *
 * @deprecated Use shouldTranslateHybrid for smarter detection
 */
export function shouldTranslate(line: string): boolean {
  const trimmed = line.trim()

  // Skip empty lines
  if (!trimmed) return false

  // Skip comments
  if (trimmed.startsWith('//')) return false

  // Skip section headers
  if (trimmed.startsWith('---') && trimmed.endsWith('---')) return false

  // Everything else gets translated - the user is in LLM mode
  return true
}


/**
 * Translate a single line from natural language to Mirror DSL.
 * Uses streaming for fast feedback.
 *
 * For complex prompts (forms, dashboards, multi-component UIs), automatically
 * uses the React-Pivot pipeline which has higher accuracy (93% vs 43%).
 */
export async function translateLine(
  lineContent: string,
  context: string[],
  lineIndex: number,
  callbacks: TranslationCallbacks = {},
  tokensCode?: string,
  qualityMode?: QualityModeOptions
): Promise<TranslationResult> {
  const startTime = performance.now()
  let firstTokenTime: number | null = null
  let accumulated = ''

  if (!hasApiKey()) {
    const error = new Error('Kein API Key. Bitte in Einstellungen eingeben.')
    callbacks.onError?.(error)
    return {
      code: lineContent,
      error: error.message,
      timeToFirstToken: 0,
      totalTime: 0,
    }
  }

  // Check if React-Pivot should be used
  // Default: ALWAYS use React-Pivot (93% vs 43% success rate)
  // Set useReactPivot: false to disable
  const useReactPivot = qualityMode?.useReactPivot ?? true
  if (useReactPivot === true || (useReactPivot === 'auto' && shouldUseReactPivot(lineContent))) {
    // React-Pivot pipeline: LLM → React → Mirror DSL
    // 93% success rate vs 43% for direct translation
    return translateWithReactPivot(
      lineContent,
      context,
      lineIndex,
      callbacks,
      tokensCode,
      qualityMode
    )
  }

  // Choose model and prompt based on mode
  const isQualityMode = qualityMode?.enabled ?? false

  // Use v1 syntax prompts - LLM generates Mirror DSL directly
  const model = isQualityMode ? API.MODEL_THINKING : API.MODEL_FAST
  const systemPrompt = isQualityMode ? DEEP_THINKING_PROMPT : SYSTEM_PROMPT
  const maxTokens = isQualityMode ? 2048 : 1024

  // Build the prompt - use unified context for full context awareness
  const prompt = buildUnifiedContext({
    prompt: lineContent,
    tokensCode,
    componentsCode: qualityMode?.componentsCode,
    layoutCode: qualityMode?.layoutCode,
    cursorLine: lineIndex,
  })

  try {
    const response = await fetch(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': isQualityMode ? 'Mirror Quality Mode' : 'Mirror NL Mode',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
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
              callbacks.onFirstToken?.(firstTokenTime)
            }

            accumulated += content
            callbacks.onToken?.(content, accumulated)
          }
        } catch {
          // Ignore parse errors for SSE lines
        }
      }
    }

    const totalTime = performance.now() - startTime

    // Clean up markdown code blocks - LLM outputs Mirror DSL v1 directly
    let code = accumulated
      .replace(/```(?:mirror|dsl|javascript|js)?\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    // Normalize redundant token suffixes (gap $md.gap → gap $md)
    code = normalizeTokenSuffixes(code)

    // Preserve original indentation
    const originalIndent = lineContent.match(/^(\s*)/)?.[1] || ''
    if (code && !code.startsWith(originalIndent)) {
      // If the returned code doesn't have proper indentation, add it
      code = code.split('\n').map((line, i) => {
        if (i === 0 && !line.startsWith(' ')) {
          return originalIndent + line
        }
        return line
      }).join('\n')
    }

    // Validate the generated code
    const validation = validateMirrorCode(code, false, 'de')

    const result: TranslationResult = {
      code,
      isValid: validation.valid,
      validationIssues: validation.issues.length > 0 ? validation.issues : undefined,
      timeToFirstToken: firstTokenTime ?? totalTime,
      totalTime,
    }

    callbacks.onComplete?.(result)
    return result

  } catch (error) {
    const totalTime = performance.now() - startTime
    const err = error instanceof Error ? error : new Error(String(error))
    callbacks.onError?.(err)

    return {
      code: lineContent, // Return original on error
      error: err.message,
      timeToFirstToken: firstTokenTime ?? totalTime,
      totalTime,
    }
  }
}

/**
 * Translate without streaming (simpler, for testing)
 */
export async function translateLineSimple(
  lineContent: string,
  context: string[],
  lineIndex: number
): Promise<TranslationResult> {
  const startTime = performance.now()

  if (!hasApiKey()) {
    return {
      code: lineContent,
      error: 'Kein API Key',
      timeToFirstToken: 0,
      totalTime: 0,
    }
  }

  const prompt = buildUnifiedContext({
    prompt: lineContent,
    cursorLine: lineIndex,
  })

  try {
    const response = await fetch(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Mirror NL Mode',
      },
      body: JSON.stringify({
        model: API.MODEL_FAST,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        max_tokens: 512,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const totalTime = performance.now() - startTime

    let content = data.choices?.[0]?.message?.content || ''
    content = content
      .replace(/```(?:mirror|dsl)?\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    // Normalize redundant token suffixes (gap $md.gap → gap $md)
    content = normalizeTokenSuffixes(content)

    // Preserve original indentation
    const originalIndent = lineContent.match(/^(\s*)/)?.[1] || ''
    if (content && !content.startsWith(originalIndent)) {
      content = originalIndent + content
    }

    return {
      code: content || lineContent,
      timeToFirstToken: totalTime,
      totalTime,
    }
  } catch (error) {
    const totalTime = performance.now() - startTime
    return {
      code: lineContent,
      error: error instanceof Error ? error.message : String(error),
      timeToFirstToken: totalTime,
      totalTime,
    }
  }
}
