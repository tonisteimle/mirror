import { API, STORAGE_KEYS } from '../constants'

// API key management - persisted to localStorage for convenience
let OPENROUTER_API_KEY = ''

// Load API key from localStorage on module initialization
try {
  const stored = localStorage.getItem(STORAGE_KEYS.API_KEY)
  if (stored) {
    OPENROUTER_API_KEY = stored
  }
} catch {
  // localStorage not available (SSR, etc.)
}

/**
 * Set the API key and persist it to localStorage.
 */
export function setApiKey(key: string): void {
  OPENROUTER_API_KEY = key
  try {
    if (key) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, key)
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_KEY)
    }
  } catch {
    // localStorage not available
  }
}

/**
 * Get the current API key
 */
export function getApiKey(): string {
  return OPENROUTER_API_KEY
}

/**
 * Check if an API key is set
 */
export function hasApiKey(): boolean {
  return Boolean(OPENROUTER_API_KEY)
}

/**
 * Clear the API key from memory and localStorage
 */
export function clearApiKey(): void {
  OPENROUTER_API_KEY = ''
  try {
    localStorage.removeItem(STORAGE_KEYS.API_KEY)
  } catch {
    // localStorage not available
  }
}

// Store for active request cancellation
let activeAbortController: AbortController | null = null

/**
 * Cancel any active AI request
 */
export function cancelActiveRequest(): void {
  if (activeAbortController) {
    activeAbortController.abort()
    activeAbortController = null
  }
}

/**
 * Fetch with timeout and abort controller support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API.REQUEST_TIMEOUT_MS
): Promise<Response> {
  cancelActiveRequest()
  activeAbortController = new AbortController()
  const timeoutId = setTimeout(() => activeAbortController?.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: activeAbortController.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Anfrage abgebrochen oder Timeout erreicht')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
    activeAbortController = null
  }
}

// =============================================================================
// System Prompt - Mirror DSL Generation (Optimized)
// =============================================================================

const SYSTEM_PROMPT = `Du bist ein UI-Designer für Mirror DSL. Generiere NUR Mirror Code, keine Erklärungen.

## Core Rules
1. Colon = define only (no render): Button: pad 12
2. No colon = render: Button "Click"
3. 2-space indent = child
4. Text content is LAST on line: Button bg #F00 "Click"
5. First numbers = dimensions: Box 300 400 → w 300 h 400
6. col = text color, bg = background (always)
7. Use named instances for event targeting: Button named Btn1 "Click"
8. Tokens ALWAYS start with $ (define AND use): $primary: #3B82F6 → bg $primary
9. Use - (dash) ONLY for multiple items in a list, never for single elements
10. Avoid reserved names: Text, Button, Input, Image, Link → use Title, Label, Btn, Field

## Common Pitfalls - DON'T DO THIS
// ❌ WRONG: Text on separate line
Button bg #F00
  "Click me"
// ✅ CORRECT: Text inline at end
Button bg #F00 "Click me"

// ❌ WRONG: Semicolon chaining actions
Button onclick show A; hide B
// ✅ CORRECT: Use events block
events
  Btn onclick
    show A
    hide B

// ❌ WRONG: Referencing unnamed instances
- Button "Save"
events
  Button[0] onclick  // Can't reference by index
// ✅ CORRECT: Name instances
- Button named SaveBtn "Save"
events
  SaveBtn onclick
    show Success

// ❌ WRONG: Text content in definition (empty instance)
Card: bg #1E1E1E
  Label: col white
Card
  Label "Hello"        // Label has no styling!
// ✅ CORRECT: Style in definition, content in instance
Card: bg #1E1E1E
Card col white "Hello World"
// OR nested with styled Label:
Card: bg #1E1E1E
  Label: col white
Card
  Label "Hello World"  // Label inherits col white

// ❌ WRONG: Token without $ prefix
primary: #3B82F6
Box bg primary        // Error: "primary" is unknown
// ✅ CORRECT: Always use $ for tokens - EVERYWHERE
$primary: #3B82F6
$hover-color: #2563EB
Box bg $primary
  state hover
    bg $hover-color   // $ is required here too!

// ❌ WRONG: Using hover-bg as token name
$hover-bg: #333      // Don't do this!
Box hover-bg $hover-bg
// ✅ CORRECT: hover-bg is a PROPERTY, not a token
Box hover-bg #333
// Or use token for the color value:
$accent: #333
Box hover-bg $accent

// ❌ WRONG: Dash for single element
- Box bg #333 "Hello"
// ✅ CORRECT: Dash only for list items
Container
  - Item "First"
  - Item "Second"

// ❌ WRONG: Input without proper name
Input Field: "placeholder"  // "Field" looks like a keyword
// ✅ CORRECT: Give inputs descriptive names
Input EmailField: "E-Mail eingeben" type email
Input PasswordField: "Passwort" type password

// ❌ WRONG: show/hide in wrong context
Panel
  show fade 200       // Can't use show inside component
// ✅ CORRECT: Use events block for show/hide
Panel named MyPanel: hidden
  "Content"
events
  TriggerBtn onclick
    show MyPanel

## Quick Reference
LAYOUT      hor ver gap between wrap grid stacked
ALIGN       hor-l hor-cen hor-r ver-t ver-cen ver-b cen
SPACING     pad mar (+ l r u d l-r u-d)
SIZE        w h minw maxw minh maxh full grow shrink
COLOR       col #hex (text) bg #hex (background) boc #hex (border)
BORDER      bor 1, bor 1 #333, rad 8
TYPE        size weight line font align italic underline truncate
VISUAL      opacity shadow cursor z hidden disabled
HOVER       hover-bg hover-col hover-scale hover-opacity

DEFINE      Name: props
INHERIT     Name from Parent: props
PRIMITIVE   Input EmailField: "placeholder" type email  (creates named input)
            Input PasswordField: "password" type password
NAMED       - Component named Name props "text"

STATE       state hover/focus/active/disabled or custom states
EVENTS      onclick onchange oninput onfocus onblur
ACTIONS     toggle | show X | hide X | open X | close | page X | assign $var to expr
CONDITION   if $x then prop val else prop val
ITERATOR    each $item in $list

## Example 1: Form with Inputs
$primary: #3B82F6
$bg: #1E1E2E
$input-bg: #2A2A3E

Input EmailField: "E-Mail eingeben" type email pad 12 bg $input-bg col white rad 8 bor 1 #444
Input PasswordField: "Passwort" type password pad 12 bg $input-bg col white rad 8 bor 1 #444
Btn: pad 12 24 rad 8 cursor pointer bg $primary col white hover-bg #2563EB

Form: ver gap 16 pad 24 bg $bg rad 12
  EmailField
  PasswordField
  Btn named SubmitBtn "Anmelden"

## Example 2: Card with Events
Card: ver gap 12 pad 16 bg $bg rad 12 hover-bg #2A2A3E
  Title: weight 600 size 16
  Desc: col #9CA3AF size 14

Panel named Details: hidden pad 16 bg #111 rad 8
  "Additional information"

Card
  Title "Welcome"
  Desc "Click below"
  Btn named ShowBtn "Show"

events
  ShowBtn onclick
    show Details

## Output Rules
1. NUR Mirror Code - keine Erklärungen
2. Dunkles Farbschema: #1E1E2E, #1A1A1A, Akzent #3B82F6
3. Hover-States für interaktive Elemente
4. Named instances für Event-Targeting`

export interface GeneratedCode {
  code: string
  error?: string
}

/**
 * Generate Mirror DSL code from a user prompt
 */
export async function generateMirrorCode(userPrompt: string): Promise<GeneratedCode> {
  if (!hasApiKey()) {
    throw new Error('Kein API Key gesetzt. Bitte OpenRouter API Key in den Einstellungen eingeben.')
  }

  const response = await fetchWithTimeout(API.ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Mirror',
    },
    body: JSON.stringify({
      model: API.MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: API.MAX_TOKENS,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}`)
  }

  const data = await response.json()
  let content = data.choices[0]?.message?.content || ''

  // Remove markdown code blocks if present
  content = content.replace(/```(?:mirror|dsl)?\s*/gi, '').replace(/```\s*/g, '')
  content = content.trim()

  return { code: content }
}

/**
 * @deprecated Use generateWithCodeIntelligence instead for context-aware generation
 */
export async function generateDSLViaJSON(
  userPrompt: string,
  designSystem?: { tokens: string; components: string }
): Promise<{ layout: string }> {
  // Build enhanced prompt with design system context if provided
  let enhancedPrompt = userPrompt
  if (designSystem?.tokens?.trim() || designSystem?.components?.trim()) {
    const parts: string[] = []
    if (designSystem.tokens?.trim()) {
      parts.push(`Verwende diese Token-Definitionen:\n${designSystem.tokens.trim()}`)
    }
    if (designSystem.components?.trim()) {
      parts.push(`Verwende diese Komponenten-Definitionen:\n${designSystem.components.trim()}`)
    }
    enhancedPrompt = `${parts.join('\n\n')}\n\nAufgabe: ${userPrompt}`
  }

  const result = await generateMirrorCode(enhancedPrompt)
  return { layout: result.code }
}

// =============================================================================
// Self-Healing Generation (validates and auto-corrects)
// =============================================================================

import { withSelfHealing, validateMirrorCode, type SelfHealingResult, type PromptLanguage } from './ai-selfhealing'

export interface GenerateWithValidationOptions {
  /** Maximum correction attempts (default: 2) */
  maxAttempts?: number
  /** Include warnings in validation (default: false) */
  includeWarnings?: boolean
  /** Language for correction prompts (default: 'de') */
  language?: PromptLanguage
  /** Callback for progress updates */
  onProgress?: (status: 'generating' | 'validating' | 'correcting', attempt: number) => void
}

/**
 * Generate Mirror code with automatic validation and self-healing.
 *
 * If the generated code contains errors, the LLM is automatically
 * re-prompted with correction instructions.
 *
 * @example
 * ```typescript
 * const result = await generateWithValidation("Create a login form")
 *
 * if (result.valid) {
 *   editor.setValue(result.code)
 * } else {
 *   showError(`Could not generate valid code: ${result.issues.map(i => i.message).join(', ')}`)
 * }
 * ```
 */
export async function generateWithValidation(
  userPrompt: string,
  options: GenerateWithValidationOptions = {}
): Promise<SelfHealingResult> {
  const { maxAttempts = 2, includeWarnings = false, language = 'de', onProgress } = options

  // Wrapper that reports progress
  const generateWithProgress = async (prompt: string) => {
    // Detect if this is a correction prompt (works for both DE and EN)
    const isCorrection = prompt.includes('FEHLER:') || prompt.includes('ERRORS:')
    if (onProgress) {
      onProgress(isCorrection ? 'correcting' : 'generating', 1)
    }
    const result = await generateMirrorCode(prompt)
    if (onProgress) {
      onProgress('validating', 1)
    }
    return result
  }

  return withSelfHealing(generateWithProgress, userPrompt, {
    maxAttempts,
    includeWarnings,
    language
  })
}

/**
 * Quick validation check for generated code.
 * Returns issues without re-prompting.
 */
export function validateGeneratedCode(code: string): {
  valid: boolean
  issues: string[]
} {
  const feedback = validateMirrorCode(code, false)
  return {
    valid: feedback.valid,
    issues: feedback.issues.map(i =>
      i.suggestion ? `${i.message} (${i.suggestion})` : i.message
    )
  }
}

// Re-export for convenience
export { validateMirrorCode, isValidMirrorCode, getIssueSummary } from './ai-selfhealing'
export type { SelfHealingResult, ValidationFeedback, CodeIssue, PromptLanguage } from './ai-selfhealing'

// =============================================================================
// Context-Aware Generation (Code Intelligence)
// =============================================================================

import { MirrorCodeIntelligence, type GenerationContext } from './ai-context'

export interface ContextAwareGenerationOptions {
  /** Full source code (all tabs combined) */
  sourceCode: string
  /** Current cursor position */
  cursor?: { line: number; column: number }
  /** Max correction attempts */
  maxAttempts?: number
  /** Progress callback */
  onProgress?: (status: 'analyzing' | 'generating' | 'validating' | 'correcting', attempt: number) => void
}

export interface ContextAwareResult {
  code: string
  valid: boolean
  /** Where to insert the code */
  insertAt?: { line: number; indent: number }
  /** What approach was used */
  approach: 'reuse' | 'extend' | 'create'
  /** Which existing component was used (if any) */
  usedComponent?: string
  issues: string[]
}

/**
 * Generate Mirror code with full context awareness.
 *
 * This function:
 * 1. Analyzes existing code (components, tokens, patterns)
 * 2. Builds context-aware prompt with relevant components/tokens
 * 3. Generates code with self-healing validation
 * 4. Adjusts indentation for cursor position
 */
export async function generateWithCodeIntelligence(
  userPrompt: string,
  options: ContextAwareGenerationOptions
): Promise<ContextAwareResult> {
  const { sourceCode, cursor, maxAttempts = 2, onProgress } = options

  onProgress?.('analyzing', 0)

  // 1. Analyze code with intelligence
  const intelligence = new MirrorCodeIntelligence(sourceCode)
  const context = intelligence.buildGenerationContext(
    userPrompt,
    cursor?.line,
    cursor?.column
  )

  // 2. Build enhanced prompt with context
  const contextSection = intelligence.formatContextForLLM(context)
  const targetIndent = context.insertion?.indent ?? 0
  const enhancedPrompt = `${contextSection}

## Aufgabe
${userPrompt}

Generiere NUR den Code-Block zum Einfügen${targetIndent > 0 ? ` (Einrückung: ${targetIndent} Spaces)` : ''}.`

  onProgress?.('generating', 1)

  // 3. Generate with self-healing
  const result = await generateWithValidation(enhancedPrompt, {
    maxAttempts,
    onProgress: (status, attempt) => {
      if (status === 'correcting') {
        onProgress?.('correcting', attempt)
      } else if (status === 'validating') {
        onProgress?.('validating', attempt)
      }
    }
  })

  // 4. Adjust indentation if needed
  let finalCode = result.code
  if (targetIndent > 0) {
    finalCode = adjustIndentation(result.code, targetIndent)
  }

  return {
    code: finalCode,
    valid: result.valid,
    insertAt: cursor ? { line: cursor.line, indent: targetIndent } : undefined,
    approach: context.suggestion.action,
    usedComponent: context.suggestion.component || context.suggestion.baseComponent,
    issues: result.issues.map(i => i.message),
  }
}

/**
 * Adjust indentation of generated code
 */
function adjustIndentation(code: string, targetIndent: number): string {
  const lines = code.split('\n')
  const indent = ' '.repeat(targetIndent)

  // Find minimum indentation in the code
  let minIndent = Infinity
  for (const line of lines) {
    if (line.trim()) {
      const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0
      minIndent = Math.min(minIndent, lineIndent)
    }
  }
  if (minIndent === Infinity) minIndent = 0

  // Adjust all lines
  return lines.map(line => {
    if (!line.trim()) return line
    const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0
    const relativeIndent = currentIndent - minIndent
    return indent + ' '.repeat(relativeIndent) + line.trim()
  }).join('\n')
}

// Re-export context types
export { type GenerationContext, type CursorContext } from './ai-context'
