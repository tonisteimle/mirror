/**
 * Natural Language to Mirror DSL Translation Service
 *
 * Provides line-by-line translation from natural language descriptions
 * to Mirror DSL code with streaming support and context awareness.
 */

import { getApiKey, hasApiKey } from '../lib/ai'
import { applyAllFixes, validateMirrorCode, type CodeIssue } from '../lib/ai-selfhealing'
import { API } from '../constants'

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

// Deep Thinking system prompt - minimal but precise
const DEEP_THINKING_PROMPT = `Du bist ein Mirror DSL Experte.

Antworte NUR mit ausführbarem Mirror DSL Code.
- UI-Requests → generiere Komponenten
- "extrahiere/definiere tokens" → generiere $token: value Definitionen
- Nutze existierende Tokens. Kommentare mit //.

## MIRROR DSL REFERENZ

### Layout
horizontal/hor, vertical/ver, gap N, between, wrap, center
grid N, stacked (z-layers)

### Alignment
horizontal-left/hor-l, horizontal-center/hor-cen, horizontal-right/hor-r
vertical-top/ver-t, vertical-center/ver-cen, vertical-bottom/ver-b

### Sizing
width/w N, height/h N, min-width/minw, max-width/maxw
full (100% both), grow, fill, shrink 0

### Spacing
padding/pad N, margin/mar N
padding left N, padding left-right N, padding top-bottom N

### Colors
background/bg $token, color/col $token, border-color/boc $token

### Border & Radius
border/bor N [style] [color], radius/rad N
radius 8 8 0 0 (per corner)

### Typography
size N, weight N/bold, line N, font "Name"
align center/left/right, italic, underline, truncate

### Visuals
opacity/opa 0-1, shadow sm/md/lg, cursor pointer/move/grab
z N, hidden, visible, disabled
WICHTIG: cursor nur einwortige Werte (pointer, move, grab) - NICHT not-allowed!

### Hover States (Inline)
hover-background $token, hover-color $token
hover-opacity N, hover-scale N, hover-radius N

### Events
onclick, onclick-outside, onhover, onchange, oninput
onfocus, onblur, onkeydown KEY, onkeyup KEY, onload
Keys: escape, enter, tab, space, arrow-up/down/left/right

WICHTIG: Event-Handler VOR Children platzieren, nicht danach!

### Actions
toggle, show Name, hide Name, open Name [pos] [anim] [ms], close
page Name, assign $var to expr
highlight self/next/prev, select self, deselect self
activate self, deactivate self, deactivate-siblings

### Animations
show fade slide-up 300, hide fade 150
animate spin/pulse/bounce N

### Named Instances
Component named Name: props   // für Referenzierung
- Item named Item1 "Text"     // in Listen

### Events Block (für multiple Actions)
events
  ButtonName onclick
    show Panel
    hide OtherPanel
    assign $active to true

### States
Component:
  state default
    background #333
  state active
    background $primary

### Conditionals
if $condition
  Component
else
  OtherComponent

Button if $active then background $primary else background #333

### Primitives
Input "placeholder" type email/password/text
Image "src.jpg" width height fit cover
Button "Label", Link "url" "Label"

## BEISPIELE

### Dropdown mit Animation
Dropdown: vertical
  Button named Trigger onclick toggle "Auswählen ▼"

  Panel named Options hidden
    show fade slide-down 200
    hide fade 100
    - Item hover-background #333 onclick select self "Option 1"
    - Item hover-background #333 onclick select self "Option 2"
    - Item hover-background #333 onclick select self "Option 3"

events
  Options onclick-outside
    hide Options
  Trigger onclick
    toggle Options

### Toggle/Switch
Toggle: width 52 height 28 radius 14 cursor pointer
  state off
    background #333
  state on
    background $primary
  Knob: width 24 height 24 radius 12 background white
    state off
      margin left 2
    state on
      margin left 26

### Tabs
Tabs: horizontal gap 0
  - Tab named Tab1 onclick activate self, deactivate-siblings, show Content1, hide Content2 "Tab 1"
  - Tab named Tab2 onclick activate self, deactivate-siblings, show Content2, hide Content1 "Tab 2"

Tab:
  state default
    background transparent
    border-bottom 2 transparent
  state active
    border-bottom 2 $primary

Content1: padding 16 "Content for Tab 1"
Content2: hidden padding 16 "Content for Tab 2"`

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

/** Options for Deep Thinking mode */
export interface DeepThinkingOptions {
  enabled: boolean
  /** Full layout code of current page */
  layoutCode?: string
  /** Components code */
  componentsCode?: string
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
 * Build context for Deep Thinking mode.
 * Includes full page, components, and tokens.
 */
function buildDeepThinkingContext(
  lineContent: string,
  lineIndex: number,
  options: DeepThinkingOptions,
  tokensCode?: string
): string {
  const parts: string[] = []

  // Add tokens
  if (tokensCode?.trim()) {
    parts.push('## TOKENS (verwende diese!)')
    parts.push('```')
    parts.push(tokensCode.trim())
    parts.push('```')
    parts.push('')
  }

  // Add components
  if (options.componentsCode?.trim()) {
    parts.push('## KOMPONENTEN-DEFINITIONEN')
    parts.push('```')
    parts.push(options.componentsCode.trim())
    parts.push('```')
    parts.push('')
  }

  // Add current page layout
  if (options.layoutCode?.trim()) {
    parts.push('## AKTUELLE SEITE')
    parts.push('```')
    // Mark the line to translate
    const lines = options.layoutCode.split('\n')
    lines[lineIndex] = `>>> ${lines[lineIndex]} <<<  // DIESE ZEILE ÜBERSETZEN`
    parts.push(lines.join('\n'))
    parts.push('```')
    parts.push('')
  }

  parts.push('## AUFGABE')
  parts.push(`Übersetze folgende Zeile zu Mirror DSL:`)
  parts.push(`"${lineContent.trim()}"`)
  parts.push('')
  parts.push('Generiere vollständigen, funktionierenden Code. Nutze die definierten Tokens.')

  return parts.join('\n')
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
  tokensCode?: string,
  deepThinking?: DeepThinkingOptions
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

  // Choose model and prompt based on mode
  const isDeepThinking = deepThinking?.enabled ?? false
  const model = isDeepThinking ? API.MODEL_THINKING : API.MODEL_FAST
  const systemPrompt = isDeepThinking ? DEEP_THINKING_PROMPT : SYSTEM_PROMPT
  const maxTokens = isDeepThinking ? 2048 : 512

  // Build the prompt with context
  const prompt = isDeepThinking
    ? buildDeepThinkingContext(lineContent, lineIndex, deepThinking!, tokensCode)
    : buildContext(context, lineIndex, tokensCode)

  try {
    const response = await fetch(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': isDeepThinking ? 'Mirror Deep Thinking' : 'Mirror NL Mode',
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

    // Clean up markdown code blocks
    let code = accumulated
      .replace(/```(?:mirror|dsl)?\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    // Apply algorithmic fixes (fast, synchronous)
    // This catches common LLM errors like missing $ on tokens
    code = applyAllFixes(code)

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

  const prompt = buildContext(context, lineIndex)

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
