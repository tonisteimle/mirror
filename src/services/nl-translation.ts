/**
 * Natural Language to Mirror DSL Translation Service
 *
 * Provides line-by-line translation from natural language descriptions
 * to Mirror DSL code with streaming support and context awareness.
 */

import { getApiKey, hasApiKey } from '../lib/ai'

// Use Haiku 4.5 for fastest responses
const HAIKU_MODEL = 'anthropic/claude-haiku-4.5'
const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

// System prompt - understands both UI translations AND meta-requests
const SYSTEM_PROMPT = `Du bist ein Mirror DSL Assistent. Du verstehst Absichten und handelst entsprechend.

## ERKENNE DIE ABSICHT

**UI-Beschreibung** (z.B. "roter button", "card mit schatten"):
→ Übersetze zu einer DSL-Zeile

**Meta-Request** (z.B. "generiere tokens für...", "erstelle ein login formular"):
→ Generiere vollständigen, sinnvollen Code (mehrere Zeilen erlaubt)

**Bereits valider DSL-Code**:
→ Unverändert zurückgeben

## REGELN

1. Behalte die Einrückung der Eingabezeile bei
2. NUTZE IMMER definierte Tokens statt Hex-Werte
3. Bei UI-Beschreibungen: EINE Zeile pro Komponente
4. Bei Meta-Requests: Sei kreativ, generiere sinnvolle Strukturen
5. Antworte NUR mit Code, keine Erklärungen

## TOKENS

Tokens sind Design-Variablen. Wenn vorhanden, IMMER verwenden:
- $primary, $secondary für Akzentfarben
- $bg-dark, $bg-card für Hintergründe
- $spacing, $spacing-sm für Abstände
- $radius für Rundungen
- $text, $text-muted für Textfarben

Bei Meta-Requests wie "generiere tokens": Erstelle sinnvolle Token-Definitionen.

## MIRROR SYNTAX

- Layout: horizontal, vertical, gap N, center, between
- Größe: width N, height N, padding N, margin N, radius N
- Farben: background $token, color $token
- Hover: hover-background $token
- Text am Ende: "Label"
- Components: Box, Text, Button, Card, Input, Form, etc.
- Children: 2-space indent
- Tokens: $name: value

## BEISPIELE

**UI-Beschreibung:**
>>> button mit primary farbe
→ Button background $primary "Button"

**Meta-Request ohne existierende Tokens:**
>>> generiere tokens für eine login app
→ $primary: #3B82F6
$error: #EF4444
$success: #10B981
$bg: #1E1E2E
$bg-card: #2A2A3E
$text: #FFFFFF
$text-muted: #9CA3AF
$spacing: 16
$spacing-sm: 8
$radius: 8
$input-bg: #374151
$input-border: #4B5563

**Meta-Request für UI:**
>>> erstelle ein login formular
→ Form vertical gap $spacing padding $spacing background $bg-card radius $radius
  Input placeholder "Email" type email
  Input placeholder "Passwort" type password
  Button background $primary width full "Anmelden"`

/** Status of a line translation */
export type LineStatus = 'pending' | 'translating' | 'done' | 'error'

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

/**
 * Check if a line should be translated.
 * Skip empty lines, comments, and already-valid DSL code.
 */
export function shouldTranslate(line: string): boolean {
  const trimmed = line.trim()

  // Skip empty lines
  if (!trimmed) return false

  // Skip comments
  if (trimmed.startsWith('//')) return false

  // Skip section headers
  if (trimmed.startsWith('---') && trimmed.endsWith('---')) return false

  // Skip token definitions (start with $)
  if (trimmed.startsWith('$')) return false

  // Skip lines that look like DSL (start with component name or property)
  // Component names are PascalCase
  if (/^[A-Z][a-zA-Z0-9]*[\s:]/.test(trimmed)) return false

  // Skip lines that start with DSL keywords
  const dslKeywords = [
    'horizontal', 'vertical', 'hor', 'ver',
    'padding', 'margin', 'pad', 'mar',
    'background', 'color', 'bg', 'col',
    'width', 'height', 'w', 'h',
    'border', 'radius', 'bor', 'rad',
    'gap', 'center', 'cen',
    'if', 'else', 'each', 'state', 'events',
    'onclick', 'onhover', 'onfocus',
    'show', 'hide', 'toggle', 'open', 'close',
    '-', // List items
  ]

  const firstWord = trimmed.split(/\s/)[0].toLowerCase()
  if (dslKeywords.includes(firstWord)) return false

  // Skip literal strings that are just text content
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return false

  // Everything else should be translated
  return true
}

/**
 * Build context for translation.
 * Returns surrounding lines and tokens formatted for the LLM.
 */
export function buildContext(
  lines: string[],
  lineIndex: number,
  tokensCode?: string,
  contextSize: number = 5
): string {
  const before: string[] = []
  const after: string[] = []

  // Collect lines before
  for (let i = Math.max(0, lineIndex - contextSize); i < lineIndex; i++) {
    before.push(lines[i])
  }

  // Collect lines after
  for (let i = lineIndex + 1; i < Math.min(lines.length, lineIndex + contextSize + 1); i++) {
    after.push(lines[i])
  }

  // Build context string
  const contextParts: string[] = []

  // Add tokens first if available
  if (tokensCode?.trim()) {
    contextParts.push('Tokens:')
    contextParts.push(tokensCode.trim())
    contextParts.push('')
  }

  contextParts.push('Kontext:')
  if (before.length > 0) {
    contextParts.push(...before)
  }

  contextParts.push(`>>> ${lines[lineIndex]}`)

  if (after.length > 0) {
    contextParts.push(...after)
  }

  return contextParts.join('\n')
}

/**
 * Translate a single line from natural language to Mirror DSL.
 * Uses streaming for fast feedback.
 */
export async function translateLine(
  lineContent: string,
  context: string[],
  lineIndex: number,
  callbacks: TranslationCallbacks = {},
  tokensCode?: string
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

  // Build the prompt with context and tokens
  const prompt = buildContext(context, lineIndex, tokensCode)

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Mirror NL Mode',
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        max_tokens: 512,
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

    // Clean up markdown code blocks
    let code = accumulated
      .replace(/```(?:mirror|dsl)?\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

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

    const result: TranslationResult = {
      code,
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

  const prompt = buildContext(context, lineIndex)

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Mirror NL Mode',
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
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
